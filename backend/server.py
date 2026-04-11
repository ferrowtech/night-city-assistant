from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import json
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Knowledge base cache
KNOWLEDGE_BASE_URL = "https://raw.githubusercontent.com/ferrowtech/cyberpunk/main/cyberpunk_2077_knowledge_base.json"
knowledge_base_cache = None


async def fetch_knowledge_base():
    global knowledge_base_cache
    if knowledge_base_cache is not None:
        return knowledge_base_cache
    result = "{}"
    try:
        async with httpx.AsyncClient(timeout=30) as http_client:
            resp = await http_client.get(KNOWLEDGE_BASE_URL)
            resp.raise_for_status()
            result = resp.text
            logger.info("Knowledge base fetched successfully (%d chars)", len(result))
    except Exception as e:
        logger.error("Failed to fetch knowledge base: %s", e)
    knowledge_base_cache = result
    return knowledge_base_cache


def build_system_prompt(kb_json: str, language: str = "ru") -> str:
    lang_instruction = "in Russian" if language == "ru" else "in English"
    return (
        "You are a Cyberpunk 2077 expert assistant with a detailed knowledge base. "
        "Use the provided knowledge base to give accurate tips. "
        f"Analyze the screenshot and give 3-4 sentence tip {lang_instruction}. Be specific and concise.\n\n"
        f"<knowledge_base>\n{kb_json}\n</knowledge_base>"
    )


class AnalyzeRequest(BaseModel):
    image_base64: str
    mime_type: Optional[str] = "image/jpeg"
    language: Optional[str] = "ru"


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hint: str
    timestamp: str


@api_router.get("/")
async def root():
    return {"message": "Night City Assistant API"}


@api_router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_screenshot(request: AnalyzeRequest):
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    kb_json = await fetch_knowledge_base()
    system_prompt = build_system_prompt(kb_json, request.language or "ru")

    session_id = str(uuid.uuid4())

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_prompt,
    )
    chat.with_model("anthropic", "claude-sonnet-4-20250514")

    image_content = ImageContent(image_base64=request.image_base64)

    user_message = UserMessage(
        text="Analyze this Cyberpunk 2077 screenshot and give me a gameplay tip.",
        file_contents=[image_content],
    )

    response = None
    try:
        response = await chat.send_message(user_message)
    except Exception as e:
        error_msg = str(e).lower()
        if "budget" in error_msg or "exceeded" in error_msg:
            raise HTTPException(
                status_code=402,
                detail="API budget exceeded. Please top up your Universal Key balance at Profile → Universal Key → Add Balance."
            )
        logger.error("Claude API error: %s", e)
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    if response is None:
        raise HTTPException(status_code=502, detail="AI service returned empty response")

    analysis_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": analysis_id,
        "hint": response,
        "language": request.language or "ru",
        "timestamp": now,
    }
    await db.analyses.insert_one(doc)

    return AnalyzeResponse(id=analysis_id, hint=response, timestamp=now)


@api_router.get("/history")
async def get_history():
    analyses = await db.analyses.find({}, {"_id": 0}).sort("timestamp", -1).to_list(20)
    return analyses


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

KNOWLEDGE_BASE_URL = "https://raw.githubusercontent.com/ferrowtech/cyberpunk-knowledge-base/refs/heads/main/cyberpunk_2077_knowledge_base.json"
HTTP_PAYMENT_REQUIRED = 402
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
            logger.info("Knowledge base fetched (%d chars)", len(result))
    except Exception as e:
        logger.error("Knowledge base fetch failed: %s", e)
    knowledge_base_cache = result
    return knowledge_base_cache


def build_system_prompt(kb_json: str, language: str = "ru") -> str:
    lang_instruction = "in Russian" if language == "ru" else "in English"
    return (
        "You are Night City Assistant — an AI companion for Cyberpunk 2077. You analyze screenshots from the game and give short, specific, useful tips.\n\n"
        "You have access to a knowledge base with: main quests, side quests, gigs, weapons (including all Phantom Liberty iconic weapons with locations), quickhacks, cyberware, perks, Night City districts, beginner tips, and secrets.\n\n"
        "---\n\n"
        "STEP 1 — IDENTIFY WHAT IS ON SCREEN\n\n"
        "Before giving advice, look carefully at the full screenshot. Identify:\n"
        "- What type of screen is this? (gameplay / inventory / menu / dialogue / map)\n"
        "- What enemies or NPCs are visible, and what type are they?\n"
        "- What UI elements are visible? (quest marker text, minimap, health bars, RAM bar, weapon equipped)\n"
        "- What location does this appear to be? (district, building type, indoor/outdoor)\n"
        "- Is there active combat, a cutscene, a dialogue, or exploration?\n\n"
        "DO NOT rely only on the quest name shown in the HUD. The quest marker text often shows the MAIN quest objective even when the player is doing something completely different (a side quest, NCPD activity, cyberpsycho encounter, etc.).\n\n"
        "---\n\n"
        "STEP 2 — DETERMINE THE REAL SITUATION\n\n"
        "Use the visual context to identify the actual situation:\n\n"
        "IF you see a WEAPON, CYBERWARE, or VEHICLE on screen (in inventory, stats screen, or pickup prompt):\n"
        "→ Give: 1) what makes this item unique/special, 2) who/what it works best against, 3) exactly where/how to get it (quest name, location, NPC to kill). Always check the knowledge base for this item first.\n\n"
        "IF you see an OPEN WORLD scene (street, district, landmark):\n"
        "→ Give: 1) what district/area this is, 2) what is important or notable here for the player (hidden secrets, farming spots, fixers, ripperdocs, iconic loot nearby).\n\n"
        "IF you see COMBAT or an active MISSION:\n"
        "→ Look at enemy types first. Check for:\n"
        "  - NCPD/MaxTac + psycho visual effects = cyberpsycho encounter (SIDE activity, NOT main quest, even if main quest marker is visible)\n"
        "  - Regular gang enemies = standard combat\n"
        "  - Boss/skull icon enemy = named boss fight\n"
        "→ Give: 1) what situation this actually is, 2) specific tactics for the enemies visible, 3) what loot or reward to expect.\n\n"
        "IF you see a DIALOGUE or CHOICE screen:\n"
        "→ Give: 1) brief context of this moment, 2) what each key choice leads to (without heavy spoilers unless asked), 3) any missable items or consequences.\n\n"
        "IF you see the MAP or JOURNAL:\n"
        "→ Give: 1) what the current objective means, 2) recommended order or preparation, 3) nearby points of interest worth visiting first.\n\n"
        "---\n\n"
        "STEP 3 — GIVE THE TIP\n\n"
        "Rules for the response:\n"
        "- Maximum 3-4 sentences. Be specific, not generic.\n"
        "- If the answer is in the knowledge base, use it. If not, say so honestly — do not guess or invent quest names, locations, or item stats.\n"
        "- Never list bullet points. Write in natural, direct language.\n"
        f"- Respond {lang_instruction}.\n"
        "- No spoilers for story endings unless the user explicitly asks.\n"
        "- If the screenshot shows a cyberpsycho encounter: always mention that MaxTac will arrive and that the psycho may drop unique loot (Mantis Blades or other iconic cyberware/weapons).\n\n"
        f"<knowledge_base>\n{kb_json}\n</knowledge_base>"
    )


def validate_api_key():
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    return api_key


async def call_claude(api_key: str, system_prompt: str, image_base64: str, user_text: str) -> str:
    session_id = str(uuid.uuid4())
    chat = LlmChat(api_key=api_key, session_id=session_id, system_message=system_prompt)
    chat.with_model("anthropic", "claude-sonnet-4-20250514")

    image_content = ImageContent(image_base64=image_base64)
    user_message = UserMessage(text=user_text, file_contents=[image_content])

    try:
        response = await chat.send_message(user_message)
    except Exception as e:
        error_msg = str(e).lower()
        if "budget" in error_msg or "exceeded" in error_msg:
            raise HTTPException(
                status_code=HTTP_PAYMENT_REQUIRED,
                detail="API budget exceeded. Top up at Profile -> Universal Key -> Add Balance."
            )
        logger.error("Claude API error: %s", e)
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    if response is None:
        raise HTTPException(status_code=502, detail="AI service returned empty response")
    return response


class AnalyzeRequest(BaseModel):
    image_base64: str
    mime_type: Optional[str] = "image/jpeg"
    language: Optional[str] = "ru"
    user_question: Optional[str] = ""


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
    api_key = validate_api_key()
    kb_json = await fetch_knowledge_base()
    system_prompt = build_system_prompt(kb_json, request.language or "ru")

    user_text = "Analyze this Cyberpunk 2077 screenshot and give me a gameplay tip."
    if request.user_question:
        user_text += f" User's question: {request.user_question}"

    hint = await call_claude(api_key, system_prompt, request.image_base64, user_text)

    analysis_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": analysis_id, "hint": hint, "language": request.language or "ru", "timestamp": now}
    await db.analyses.insert_one(doc)

    return AnalyzeResponse(id=analysis_id, hint=hint, timestamp=now)


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

const OpenAI = require("openai");

const EMERGENT_PROXY_URL = "https://integrations.emergentagent.com/llm";
const KNOWLEDGE_BASE_URL =
  "https://raw.githubusercontent.com/ferrowtech/cyberpunk/main/cyberpunk_2077_knowledge_base.json";
const HTTP_PAYMENT_REQUIRED = 402;

let knowledgeBaseCache = null;

async function fetchKnowledgeBase() {
  if (knowledgeBaseCache) return knowledgeBaseCache;
  try {
    const res = await fetch(KNOWLEDGE_BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    knowledgeBaseCache = await res.text();
  } catch (_) {
    knowledgeBaseCache = "{}";
  }
  return knowledgeBaseCache;
}

function buildSystemPrompt(kb, language) {
  const lang = language === "ru" ? "in Russian" : "in English";
  return (
    "You are a Cyberpunk 2077 expert assistant with a detailed knowledge base. " +
    "Use the provided knowledge base to give accurate tips. " +
    `Analyze the screenshot and give 3-4 sentence tip ${lang}. Be specific and concise.\n\n` +
    `<knowledge_base>\n${kb}\n</knowledge_base>`
  );
}

function getMimeType(base64) {
  if (base64.startsWith("iVBORw0KGgo")) return "image/png";
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function validateRequest(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { detail: "Method not allowed" });
  }
  const apiKey = process.env.EMERGENT_LLM_KEY;
  if (!apiKey) {
    return jsonResponse(500, { detail: "EMERGENT_LLM_KEY not configured in Netlify environment variables" });
  }
  return null;
}

function parseBody(event) {
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

async function callClaudeAPI(apiKey, systemPrompt, mimeType, imageBase64, userQuestion) {
  const client = new OpenAI({ apiKey, baseURL: EMERGENT_PROXY_URL });

  let userText = "Analyze this Cyberpunk 2077 screenshot and give me a gameplay tip.";
  if (userQuestion) {
    userText += ` User's question: ${userQuestion}`;
  }

  const response = await client.chat.completions.create({
    model: "claude-sonnet-4-20250514",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
  });

  return response.choices?.[0]?.message?.content || "";
}

async function storeInMongo(id, hint, language, timestamp) {
  if (!process.env.MONGO_URL) return;
  try {
    const { MongoClient } = require("mongodb");
    const mongo = new MongoClient(process.env.MONGO_URL);
    await mongo.connect();
    const db = mongo.db(process.env.DB_NAME || "night_city_assistant");
    await db.collection("analyses").insertOne({ id, hint, language, timestamp });
    await mongo.close();
  } catch (_) {
    // MongoDB storage is non-blocking; failures don't affect the response
  }
}

exports.handler = async (event) => {
  const validationError = validateRequest(event);
  if (validationError) return validationError;

  const body = parseBody(event);
  if (!body) return jsonResponse(400, { detail: "Invalid JSON body" });

  const { image_base64, language = "en", user_question = "" } = body;
  if (!image_base64) return jsonResponse(400, { detail: "image_base64 is required" });

  try {
    const kb = await fetchKnowledgeBase();
    const systemPrompt = buildSystemPrompt(kb, language);
    const mimeType = getMimeType(image_base64);

    const hint = await callClaudeAPI(process.env.EMERGENT_LLM_KEY, systemPrompt, mimeType, image_base64, user_question);
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await storeInMongo(id, hint, language, timestamp);

    return jsonResponse(200, { id, hint, timestamp });
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("budget") || msg.includes("exceeded")) {
      return jsonResponse(HTTP_PAYMENT_REQUIRED, {
        detail: "API budget exceeded. Please top up your Universal Key balance at Profile → Universal Key → Add Balance.",
      });
    }
    return jsonResponse(502, { detail: `AI service error: ${err.message}` });
  }
};

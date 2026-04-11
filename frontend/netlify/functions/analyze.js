const Anthropic = require("@anthropic-ai/sdk");

const KNOWLEDGE_BASE_URL =
  "https://raw.githubusercontent.com/ferrowtech/cyberpunk-knowledge-base/refs/heads/main/cyberpunk_2077_knowledge_base.json";
const HTTP_PAYMENT_REQUIRED = 402;

let knowledgeBaseCache = null;

async function fetchKnowledgeBase() {
  if (knowledgeBaseCache) return knowledgeBaseCache;
  try {
    const res = await fetch(KNOWLEDGE_BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    knowledgeBaseCache = await res.text();
    console.log("[analyze] Knowledge base loaded:", knowledgeBaseCache.length, "chars");
  } catch (e) {
    console.log("[analyze] Knowledge base fetch failed:", e.message);
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
  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(500, { detail: "ANTHROPIC_API_KEY not configured in Netlify environment variables" });
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

async function callClaudeAPI(apiKey, systemPrompt, mediaType, imageBase64, userQuestion) {
  const client = new Anthropic({ apiKey });

  let userText = "Analyze this Cyberpunk 2077 screenshot and give me a gameplay tip.";
  if (userQuestion) {
    userText += ` User's question: ${userQuestion}`;
  }

  console.log("[analyze] Calling Anthropic API | model: claude-sonnet-4-20250514");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: userText,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
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
    // MongoDB storage is non-blocking
  }
}

exports.handler = async (event) => {
  const validationError = validateRequest(event);
  if (validationError) return validationError;

  const body = parseBody(event);
  if (!body) return jsonResponse(400, { detail: "Invalid JSON body" });

  const { image_base64, language = "en", user_question = "" } = body;
  if (!image_base64) return jsonResponse(400, { detail: "image_base64 is required" });

  console.log("[analyze] ANTHROPIC_API_KEY present:", !!process.env.ANTHROPIC_API_KEY);
  console.log("[analyze] language:", language, "| image size:", image_base64.length, "chars");

  try {
    const kb = await fetchKnowledgeBase();
    const systemPrompt = buildSystemPrompt(kb, language);
    const mediaType = getMimeType(image_base64);

    const hint = await callClaudeAPI(process.env.ANTHROPIC_API_KEY, systemPrompt, mediaType, image_base64, user_question);
    console.log("[analyze] Response received:", hint.length, "chars");

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    await storeInMongo(id, hint, language, timestamp);

    return jsonResponse(200, { id, hint, timestamp });
  } catch (err) {
    console.log("[analyze] ERROR:", err.message);
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("budget") || msg.includes("exceeded") || msg.includes("credit") || msg.includes("billing")) {
      return jsonResponse(HTTP_PAYMENT_REQUIRED, {
        detail: "API budget exceeded. Check your Anthropic billing.",
      });
    }
    return jsonResponse(502, { detail: `AI service error: ${err.message}` });
  }
};

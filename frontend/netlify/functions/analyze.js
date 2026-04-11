const OpenAI = require("openai");

const EMERGENT_PROXY_URL = "https://integrations.emergentagent.com/llm";
const KNOWLEDGE_BASE_URL =
  "https://raw.githubusercontent.com/ferrowtech/cyberpunk/main/cyberpunk_2077_knowledge_base.json";

// Module-level cache (persists across warm invocations)
let knowledgeBaseCache = null;

async function fetchKnowledgeBase() {
  if (knowledgeBaseCache) return knowledgeBaseCache;
  try {
    const res = await fetch(KNOWLEDGE_BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    knowledgeBaseCache = await res.text();
  } catch (e) {
    console.error("Failed to fetch knowledge base:", e);
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

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ detail: "Method not allowed" }),
    };
  }

  const apiKey = process.env.EMERGENT_LLM_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: "EMERGENT_LLM_KEY not configured in Netlify environment variables" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ detail: "Invalid JSON body" }),
    };
  }

  const { image_base64, language = "en", user_question = "" } = body;
  if (!image_base64) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ detail: "image_base64 is required" }),
    };
  }

  try {
    const kb = await fetchKnowledgeBase();
    const systemPrompt = buildSystemPrompt(kb, language);
    const mimeType = getMimeType(image_base64);

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: EMERGENT_PROXY_URL,
    });

    let userText = "Analyze this Cyberpunk 2077 screenshot and give me a gameplay tip.";
    if (user_question) {
      userText += ` User's question: ${user_question}`;
    }

    const response = await client.chat.completions.create({
      model: "claude-sonnet-4-20250514",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userText,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${image_base64}`,
              },
            },
          ],
        },
      ],
    });

    const hint = response.choices?.[0]?.message?.content || "";
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Store in MongoDB if configured
    if (process.env.MONGO_URL) {
      try {
        const { MongoClient } = require("mongodb");
        const mongo = new MongoClient(process.env.MONGO_URL);
        await mongo.connect();
        const db = mongo.db(process.env.DB_NAME || "night_city_assistant");
        await db.collection("analyses").insertOne({ id, hint, language, timestamp });
        await mongo.close();
      } catch (dbErr) {
        console.error("MongoDB store failed (non-blocking):", dbErr.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id, hint, timestamp }),
    };
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("budget") || msg.includes("exceeded")) {
      return {
        statusCode: 402,
        headers,
        body: JSON.stringify({
          detail: "API budget exceeded. Please top up your Universal Key balance at Profile → Universal Key → Add Balance.",
        }),
      };
    }
    console.error("Analyze error:", err.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ detail: `AI service error: ${err.message}` }),
    };
  }
};

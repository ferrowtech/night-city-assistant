const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const KNOWLEDGE_BASE_URL =
  "https://raw.githubusercontent.com/ferrowtech/night-city-assistant/refs/heads/main/cyberpunk_2077_knowledge_base.json";
const HTTP_PAYMENT_REQUIRED = 402;
const DAILY_LIMIT = 5;
const HTTP_TOO_MANY_REQUESTS = 429;

let knowledgeBaseCache = null;

// In-memory rate limiter (persists across warm invocations)
const rateLimitMap = {};

function checkRateLimit(ip) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;

  // Clean old entries
  for (const k of Object.keys(rateLimitMap)) {
    if (!k.endsWith(today)) delete rateLimitMap[k];
  }

  const count = rateLimitMap[key] || 0;
  if (count >= DAILY_LIMIT) return false;
  rateLimitMap[key] = count + 1;
  return true;
}

async function fetchKnowledgeBase() {
  if (knowledgeBaseCache) return knowledgeBaseCache;
  try {
    const res = await fetch(KNOWLEDGE_BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    knowledgeBaseCache = await res.text();
    console.log("[analyze] Knowledge base loaded:", knowledgeBaseCache.length, "chars");
  } catch (e) {
    console.log("[analyze] KB fetch failed:", e.message);
    knowledgeBaseCache = "{}";
  }
  return knowledgeBaseCache;
}

function buildSystemPrompt(kb, language) {
  const lang = language === "ru" ? "in Russian" : "in English";
  return (
    "You are Night City Assistant — an AI companion for Cyberpunk 2077. You analyze screenshots from the game and give short, specific, useful tips.\n\n" +
    "You have access to a knowledge base with: main quests, side quests, gigs, weapons (including all Phantom Liberty iconic weapons with locations), quickhacks, cyberware, perks, Night City districts, beginner tips, and secrets.\n\n" +
    "---\n\n" +
    "STEP 1 — IDENTIFY WHAT IS ON SCREEN\n\n" +
    "Before giving advice, look carefully at the full screenshot. Identify:\n" +
    "- What type of screen is this? (gameplay / inventory / menu / dialogue / map)\n" +
    "- What enemies or NPCs are visible, and what type are they?\n" +
    "- What UI elements are visible? (quest marker text, minimap, health bars, RAM bar, weapon equipped)\n" +
    "- What location does this appear to be? (district, building type, indoor/outdoor)\n" +
    "- Is there active combat, a cutscene, a dialogue, or exploration?\n\n" +
    "DO NOT rely only on the quest name shown in the HUD. The quest marker text often shows the MAIN quest objective even when the player is doing something completely different (a side quest, NCPD activity, cyberpsycho encounter, etc.).\n\n" +
    "---\n\n" +
    "STEP 2 — DETERMINE THE REAL SITUATION\n\n" +
    "Use the visual context to identify the actual situation:\n\n" +
    "IF you see a WEAPON, CYBERWARE, or VEHICLE on screen (in inventory, stats screen, or pickup prompt):\n" +
    "→ Give: 1) what makes this item unique/special, 2) who/what it works best against, 3) exactly where/how to get it (quest name, location, NPC to kill). Always check the knowledge base for this item first.\n\n" +
    "IF you see an OPEN WORLD scene (street, district, landmark):\n" +
    "→ Give: 1) what district/area this is, 2) what is important or notable here for the player (hidden secrets, farming spots, fixers, ripperdocs, iconic loot nearby).\n\n" +
    "IF you see COMBAT or an active MISSION:\n" +
    "→ Look at enemy types first. Check for:\n" +
    "  - NCPD/MaxTac + psycho visual effects = cyberpsycho encounter (SIDE activity, NOT main quest, even if main quest marker is visible)\n" +
    "  - Regular gang enemies = standard combat\n" +
    "  - Boss/skull icon enemy = named boss fight\n" +
    "→ Give: 1) what situation this actually is, 2) specific tactics for the enemies visible, 3) what loot or reward to expect.\n\n" +
    "IF you see a DIALOGUE or CHOICE screen:\n" +
    "→ Give: 1) brief context of this moment, 2) what each key choice leads to (without heavy spoilers unless asked), 3) any missable items or consequences.\n\n" +
    "IF you see the MAP or JOURNAL:\n" +
    "→ Give: 1) what the current objective means, 2) recommended order or preparation, 3) nearby points of interest worth visiting first.\n\n" +
    "---\n\n" +
    "STEP 3 — GIVE THE TIP\n\n" +
    "Rules for the response:\n" +
    "- Maximum 3-4 sentences. Be specific, not generic.\n" +
    "- If the answer is in the knowledge base, use it. If not, say so honestly — do not guess or invent quest names, locations, or item stats.\n" +
    "- Never list bullet points. Write in natural, direct language.\n" +
    `- Respond ${lang}.\n` +
    "- No spoilers for story endings unless the user explicitly asks.\n" +
    "- If the screenshot shows a cyberpsycho encounter: always mention that MaxTac will arrive and that the psycho may drop unique loot (Mantis Blades or other iconic cyberware/weapons).\n\n" +
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
    console.log("[analyze] ERROR: ANTHROPIC_API_KEY not set");
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
  let userText = "Analyze this Cyberpunk 2077 screenshot and give me a gameplay tip.";
  if (userQuestion) {
    userText += ` User's question: ${userQuestion}`;
  }

  console.log("[analyze] Calling Anthropic API via fetch");

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
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
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.log("[analyze] Anthropic API error:", res.status, JSON.stringify(data));
    throw new Error(data.error?.message || `Anthropic API returned ${res.status}`);
  }

  console.log("[analyze] Response received, stop_reason:", data.stop_reason);
  const textBlock = data.content?.find((b) => b.type === "text");
  return textBlock?.text || "";
}

const NOTION_DB_ID = "27adb0059c7e44cbb54eebffada993d1";

async function saveToNotion(hint, userQuestion, language, clientIp) {
  if (!process.env.NOTION_TOKEN) return;
  console.log("[analyze] Saving to Notion");
  const title = userQuestion ? userQuestion.slice(0, 50) : "Screenshot analysis";
  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties: {
          Name: { title: [{ text: { content: title } }] },
          Question: { rich_text: [{ text: { content: userQuestion || "" } }] },
          Response: { rich_text: [{ text: { content: hint.slice(0, 2000) } }] },
          Language: { select: { name: language } },
          IP: { rich_text: [{ text: { content: clientIp } }] },
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.log(`[analyze] Notion error: ${res.status} ${JSON.stringify(err)}`);
    } else {
      console.log("[analyze] Notion saved");
    }
  } catch (e) {
    console.log(`[analyze] Notion error: ${e.message}`);
  }
}

const VALID_PROMO_CODES = ["NIGHTCITY2077"];

exports.handler = async (event) => {
  const validationError = validateRequest(event);
  if (validationError) return validationError;

  const body = parseBody(event);
  if (!body) return jsonResponse(400, { detail: "Invalid JSON body" });

  const { image_base64, language = "en", user_question = "", promo_code = "" } = body;
  if (!image_base64) return jsonResponse(400, { detail: "image_base64 is required" });

  const imageSizeBytes = Math.ceil(image_base64.length * 0.75);
  if (imageSizeBytes > 3 * 1024 * 1024) {
    return jsonResponse(400, { detail: "Screenshot too large - please use a smaller image or screenshot" });
  }

  const clientIp = event.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || event.headers["client-ip"]
    || "unknown";

  const envPromo = process.env.PROMO_CODE;
  const hasPremium = (envPromo && promo_code === envPromo) || VALID_PROMO_CODES.includes(promo_code);

  if (!hasPremium) {
    if (!checkRateLimit(clientIp)) {
      return jsonResponse(HTTP_TOO_MANY_REQUESTS, {
        detail: "Daily limit reached. Upgrade to premium for unlimited access.",
      });
    }
  }

  console.log("[analyze] language:", language, "| premium:", hasPremium, "| image:", image_base64.length, "chars");

  try {
    const kb = await fetchKnowledgeBase();
    const systemPrompt = buildSystemPrompt(kb, language);
    const mediaType = getMimeType(image_base64);

    const hint = await callClaudeAPI(process.env.ANTHROPIC_API_KEY, systemPrompt, mediaType, image_base64, user_question);
    console.log("[analyze] Response received:", hint.length, "chars");
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    await saveToNotion(hint, user_question, language, clientIp);

    return jsonResponse(200, { id, hint, timestamp, premium: hasPremium });
  } catch (err) {
    console.log("[analyze] ERROR:", err.message);
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("budget") || msg.includes("exceeded") || msg.includes("credit") || msg.includes("billing")) {
      return jsonResponse(HTTP_PAYMENT_REQUIRED, { detail: "API budget exceeded." });
    }
    return jsonResponse(502, { detail: `AI service error: ${err.message}` });
  }
};

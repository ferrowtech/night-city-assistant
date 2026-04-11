const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (!process.env.MONGO_URL) {
    return jsonResponse(200, []);
  }

  try {
    const { MongoClient } = require("mongodb");
    const mongo = new MongoClient(process.env.MONGO_URL);
    await mongo.connect();
    const db = mongo.db(process.env.DB_NAME || "night_city_assistant");
    const analyses = await db
      .collection("analyses")
      .find({}, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();
    await mongo.close();

    return jsonResponse(200, analyses);
  } catch (err) {
    return jsonResponse(500, { detail: `Database error: ${err.message}` });
  }
};

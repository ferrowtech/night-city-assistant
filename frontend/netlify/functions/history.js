exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (!process.env.MONGO_URL) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([]),
    };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analyses),
    };
  } catch (err) {
    console.error("History error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: `Database error: ${err.message}` }),
    };
  }
};

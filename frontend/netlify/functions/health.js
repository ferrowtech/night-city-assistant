exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "https://cyberpunk-assistant.netlify.app",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Night City Assistant API" }),
  };
};

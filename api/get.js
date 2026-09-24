// api/get.js
const crypto = require("crypto");

const APP_KEY = process.env.ALI_APP_KEY || "548672";
const APP_SECRET = process.env.ALI_APP_SECRET || "QGr3IyAhmF6LdDJGjDJsUrbFO63L6ATl";
const GATEWAY_URL = "https://api-sg.aliexpress.com/sync";

function signRequest(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  let signStr = "";
  for (const key of sortedKeys) {
    signStr += key + params[key];
  }
  return crypto
    .createHmac("sha256", secret)
    .update(signStr, "utf8")
    .digest("hex")
    .toUpperCase();
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Fallback safe parameter parsing
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = req.query || searchParams;

    const productId = query.productId || "4000903675543";
    const shipTo = query.shipTo || "US";
    const currency = query.currency || "USD";
    const apiMethod = query.apiMethod || "aliexpress.ds.product.get";

    // Build AliExpress payload
    const params = {
      method: apiMethod,
      app_key: APP_KEY,
      timestamp: Date.now().toString(),
      format: "json",
      v: "2.0",
      sign_method: "sha256",
      product_id: String(productId),
      ship_to_country: String(shipTo),
      target_currency: String(currency),
      target_language: "en"
    };

    // Calculate signature
    params.sign = signRequest(params, APP_SECRET);

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `${GATEWAY_URL}?${queryString}`;

    const aliResponse = await fetch(endpoint);
    const data = await aliResponse.json();

    return res.status(200).json(data);
  } catch (error) {
    // Returns clean JSON instead of crashing Vercel with plain-text 500
    return res.status(500).json({
      error: "Serverless Execution Error",
      message: error.message
    });
  }
};

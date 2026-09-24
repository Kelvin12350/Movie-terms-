// api/get.js
const crypto = require("crypto");

const APP_KEY = process.env.ALI_APP_KEY || "548672";
const APP_SECRET = process.env.ALI_APP_SECRET || "QGr3IyAhmF6LdDJGjDJsUrbFO63L6ATl";
const GATEWAY_URL = "https://api-sg.aliexpress.com/sync";

function signRequest(params, secret) {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();
  let signStr = "";
  for (const key of sortedKeys) {
    signStr += key + params[key];
  }
  // Generate uppercase HMAC-SHA256 hex string
  return crypto
    .createHmac("sha256", secret)
    .update(signStr, "utf8")
    .digest("hex")
    .toUpperCase();
}

module.exports = async function handler(req, res) {
  // Handle CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const {
    productId = "4000903675543",
    shipTo = "US",
    currency = "USD",
    apiMethod = "aliexpress.ds.product.get"
  } = req.query;

  // Build the request payload
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

  // Sign the request
  params.sign = signRequest(params, APP_SECRET);

  try {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `${GATEWAY_URL}?${queryString}`;

    const aliResponse = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await aliResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to communicate with AliExpress Gateway",
      message: error.message
    });
  }
};

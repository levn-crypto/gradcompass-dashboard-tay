const { randomBytes } = require("crypto");

const MAX_BODY = 1024 * 1024;
const KEY_PREFIX = "gradcompass:share:";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function json(res, value, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(value));
}

function randomId() {
  let id = "";
  const bytes = randomBytes(8);
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}

async function redis(command) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Missing Redis REST environment variables");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error(`Redis request failed: ${response.status}`);
  return response.json();
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("Payload too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, { error: "Method not allowed" }, 405);

  const length = Number(req.headers["content-length"] || 0);
  if (length > MAX_BODY) return json(res, { error: "Payload too large" }, 413);

  let payload;
  try {
    payload = await readBody(req);
  } catch {
    return json(res, { error: "Invalid JSON" }, 400);
  }

  try {
    const value = JSON.stringify(payload);
    for (let tries = 0; tries < 10; tries++) {
      const id = randomId();
      const result = await redis(["SET", KEY_PREFIX + id, value, "NX"]);
      if (result.result === "OK") return json(res, { id, url: `/s/${id}` });
    }
    return json(res, { error: "Could not allocate share id" }, 500);
  } catch (error) {
    console.error(error);
    return json(res, { error: "Share storage unavailable" }, 500);
  }
};

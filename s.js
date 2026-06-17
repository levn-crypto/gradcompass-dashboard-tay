const fs = require("fs");
const path = require("path");

const KEY_PREFIX = "gradcompass:share:";

async function redis(command) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_READ_ONLY_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;
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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }

  const id = String(req.query.id || "").trim();
  if (!/^[A-Za-z0-9]{4,32}$/.test(id)) {
    res.statusCode = 400;
    return res.end("Invalid share id");
  }

  try {
    const result = await redis(["GET", KEY_PREFIX + id]);
    if (!result.result) {
      res.statusCode = 404;
      return res.end("Share not found");
    }

    const indexPath = path.join(process.cwd(), "index.html");
    let html = fs.readFileSync(indexPath, "utf8");
    const payload = String(result.result).replace(/</g, "\\u003c");
    const injected = `<script>window.__GRADCOMPASS_SHARE__=${payload};</script>`;
    html = html.replace("<script>\n    window.onerror", `${injected}\n  <script>\n    window.onerror`);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.end(html);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    return res.end("Share storage unavailable");
  }
};

const MAX_BODY = 1024 * 1024;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function randomId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((x) => alphabet[x % alphabet.length]).join("");
}

async function createShare(request, env) {
  if (!env.SHARES) return json({ error: "Missing SHARES KV binding" }, 500);
  const length = Number(request.headers.get("content-length") || 0);
  if (!length || length > MAX_BODY) return json({ error: "Payload too large" }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  let id = randomId();
  while (await env.SHARES.get(id)) id = randomId();
  await env.SHARES.put(id, JSON.stringify(payload), {
    metadata: { createdAt: new Date().toISOString() }
  });
  return json({ id, url: `/s/${id}` });
}

async function serveShare(request, env, id) {
  if (!env.SHARES) return new Response("Missing SHARES KV binding", { status: 500 });
  const payload = await env.SHARES.get(id);
  if (!payload) return new Response("Share not found", { status: 404 });

  const indexUrl = new URL("/index.html", request.url);
  const asset = await env.ASSETS.fetch(new Request(indexUrl, request));
  let html = await asset.text();
  const injected = `<script>window.__GRADCOMPASS_SHARE__=${payload};</script>`;
  html = html.replace("<script>\n    window.onerror", `${injected}\n  <script>\n    window.onerror`);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/share") {
      return createShare(request, env);
    }
    if (request.method === "GET" && url.pathname.startsWith("/s/")) {
      return serveShare(request, env, url.pathname.split("/")[2]);
    }
    return env.ASSETS.fetch(request);
  }
};

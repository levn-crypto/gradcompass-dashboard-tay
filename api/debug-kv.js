function mask(value) {
  if (!value) return null;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

module.exports = async function handler(req, res) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const writeToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const readToken = process.env.KV_REST_API_READ_ONLY_TOKEN;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({
    hasKvRestApiUrl: !!process.env.KV_REST_API_URL,
    hasKvRestApiToken: !!process.env.KV_REST_API_TOKEN,
    hasKvRestApiReadOnlyToken: !!process.env.KV_REST_API_READ_ONLY_TOKEN,
    hasUpstashRestUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashRestToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    selectedUrl: mask(url),
    hasSelectedWriteToken: !!writeToken,
    hasSelectedReadToken: !!(readToken || writeToken)
  }));
};

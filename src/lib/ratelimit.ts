// Best-effort limiter. Serverless instances don't share memory, so this slows
// abuse on one instance but is not a hard cap. A production build would use a
// shared store or the Vercel firewall.
const hits = new Map<string, number[]>();
export function limited(req: Request, max = 40) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 5 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}

// Plays scripted learner lines through /api/converse and prints what happened.
// Usage: node scripts/convo-sim.mjs <url> <scenarioId> "line 1" "line 2" ...
const [url, scenarioId, ...lines] = process.argv.slice(2);
const turns = [];
for (const text of lines) {
  const t0 = Date.now();
  const r = await fetch(`${url}/api/converse`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId, text, turns }) });
  const d = await r.json();
  const ms = Date.now() - t0;
  if (d.kind !== "turn") { console.log(`> ${text}\n  [${d.kind}] ${d.boundary ?? ""} ${d.message}  (${ms}ms)`); continue; }
  console.log(`> ${text}\n  tags=${d.tags.join(",")} guard=${d.guard} released=${d.released.join(",") || "-"} ${d.authoredReply ? "(authored)" : ""} ${d.ending ? "ENDING=" + d.ending : ""} (${ms}ms)\n  < ${d.reply}`);
  turns.push({ learner: text, reply: d.reply, tags: d.tags, released: d.released, hintBefore: false, guardAfter: d.guard });
  if (d.ending) break;
}

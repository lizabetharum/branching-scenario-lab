// Graph and state test: every node reachable, every edge valid, no dead ends,
// every ending reachable. Also plays the ideal path and checks all criteria pass.
import { scenarios } from "../src/lib/scenarios";
import type { Turn } from "../src/lib/types";
let failures = 0;
for (const s of Object.values(scenarios)) {
  const ids = new Set([...Object.keys(s.nodes), ...Object.keys(s.endings)]);
  const seen = new Set([s.start]); const q = [s.start];
  while (q.length) { const n = s.nodes[q.shift()!]; if (!n) continue;
    if (!n.moves.length) { console.log(`✗ ${s.id} ${n.id}: dead end`); failures++; }
    for (const m of n.moves) { if (!ids.has(m.next)) { console.log(`✗ ${s.id} ${m.id} -> missing ${m.next}`); failures++; }
      if (!seen.has(m.next)) { seen.add(m.next); q.push(m.next); } } }
  for (const id of ids) if (!seen.has(id)) { console.log(`✗ ${s.id} ${id} unreachable`); failures++; }
  // ideal path: always pick the first "good" move
  const h: Turn[] = []; let cur = s.start;
  while (s.nodes[cur]) { const m = s.nodes[cur].moves.find(x => x.quality === "good")!;
    h.push({ nodeId: cur, moveId: m.id, mode: "free", learnerText: m.label, counterpartText: m.reply, hintBefore: false, afterRecovery: false }); cur = m.next; }
  const r = s.evaluate(h); const ok = r.every(c => c.status === "demonstrated") && cur === "E1";
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${s.id}: ${ids.size} states, all reachable; ideal path ${h.map(t=>t.nodeId).join(">")}>${cur}; criteria ${r.map(c=>c.status).join(",")}`);
}
if (failures) process.exitCode = 1;

// Regression checks for review findings RV-05 and RV-06.
import { applyInterruption } from "../src/lib/eval-helpers";
for (const s of Object.values(scenarios)) {
  const h: Turn[] = []; let cur = s.start;
  while (s.nodes[cur]) { const m = s.nodes[cur].moves.find(x => x.quality === "good")!;
    h.push({ nodeId: cur, moveId: m.id, mode: "choice", learnerText: m.label, counterpartText: m.reply, hintBefore: false, afterRecovery: false }); cur = m.next; }
  const sel = s.evaluate(h);
  const ok1 = sel.every(c => c.status === "recognized");
  console.log(`${ok1 ? "✓" : "✗"} ${s.id}: scripted-only ideal path scores "recognized", not "demonstrated" (${sel.map(c=>c.status).join(",")})`);
  const cut = applyInterruption(s.evaluate(h.slice(0, 1).map(t => ({ ...t, mode: "free" as const }))), true);
  const ok2 = cut.every(c => ["demonstrated", "recognized", "not_evaluable"].includes(c.status)) && cut.some(c => c.status === "not_evaluable");
  console.log(`${ok2 ? "✓" : "✗"} ${s.id}: interrupted attempt never scores 0 or partial, marks unfinished criteria NE (${cut.map(c=>c.status).join(",")})`);
  if (!ok1 || !ok2) process.exitCode = 1;
}

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

// Engine checks for the fact-packet scenarios: release rules, guard and endings.
import { convoScenarios } from "../src/lib/convo";
import { replay, step, endingFor } from "../src/lib/convo/engine";
import type { Behavior, ConvoTurn } from "../src/lib/convo/types";
function run(id: string, seq: Behavior[][]) {
  const s = convoScenarios[id]; const turns: ConvoTurn[] = []; let ending: string | null = null;
  for (const tags of seq) {
    const st = replay(s, turns); const { guard, fact } = step(s, st, tags);
    const released = fact ? [...st.released, fact.id] : st.released;
    turns.push({ learner: tags.join("+"), reply: "", tags, released: fact ? [fact.id] : [], hintBefore: false, guardAfter: guard });
    ending = endingFor(s, released, new Set([...st.seen, ...tags]), tags, turns.length, false);
    if (ending) break;
  }
  const st = replay(s, turns);
  return { released: st.released, guard: st.guard, ending, scores: s.evaluate(turns, st.released).map((c) => c.status) };
}
const cases: [string, string, Behavior[][], (r: ReturnType<typeof run>) => boolean][] = [
  ["labels ideal: two opens, ask options, way forward", "labels", [["open"], ["open"], ["askOptions"], ["wayForward", "checkin"]], (r) => r.ending === "plan_key" && r.scores.every((x) => x === "demonstrated")],
  ["labels telling shuts Sam down: nothing released", "labels", [["interpretation", "instruction"], ["leading"]], (r) => r.guard === 3 && r.released.length === 0],
  ["labels repair reopens: acknowledge + open releases pattern", "labels", [["interpretation"], ["acknowledge", "open"]], (r) => r.released.includes("pattern")],
  ["labels early options give the surface idea, not the real one", "labels", [["open"], ["askOptions"], ["wayForward"]], (r) => r.released.includes("surfaceIdea") && !r.released.includes("idea") && r.ending === "plan_surface"],
  ["labels: the tray stays hidden while Sam is still guarded", "labels", [["open"], ["leading"], ["leading"], ["acknowledge", "open"]], (r) => r.released.includes("pattern") && !r.released.includes("tray")],
  ["pickup: the drive-through stays hidden while Dev is still guarded", "pickup", [["namesConcern", "open"], ["interpretation"], ["interpretation"], ["interpretation"], ["acknowledge", "open"]], (r) => r.released.includes("busier") && !r.released.includes("drive")],
  ["labels guessing the tray (leading) doesn't release it", "labels", [["open"], ["leading"]], (r) => !r.released.includes("tray")],
  ["pickup: no concern named, open question releases nothing", "pickup", [["overSoften"], ["open"]], (r) => r.released.length === 0],
  ["pickup: self-answered questions earn nothing", "pickup", [["namesConcern"], ["open", "selfAnswer"], ["open", "selfAnswer"]], (r) => r.released.length === 0],
  ["pickup ideal reaches the drive-through and a plan", "pickup", [["namesConcern", "open"], ["open"], ["askOptions"], ["wayForward", "checkin"]], (r) => r.released.includes("drive") && r.ending === "plan_key" && r.scores.every((x) => x === "demonstrated")],
  ["labels-b ideal reaches the form and a plan", "labels-b", [["open"], ["open"], ["askOptions"], ["wayForward", "checkin"]], (r) => r.released.includes("form") && r.ending === "plan_key" && r.scores.every((x) => x === "demonstrated")],
  ["pickup-b ideal reaches the training load and a plan", "pickup-b", [["namesConcern", "open"], ["open"], ["askOptions"], ["wayForward", "checkin"]], (r) => r.released.includes("training") && r.ending === "plan_key" && r.scores.every((x) => x === "demonstrated")],
  ["pickup-b self-answered questions earn nothing", "pickup-b", [["namesConcern"], ["open", "selfAnswer"]], (r) => r.released.length === 0],
  ["turn limit ends the conversation; no open questions means P2 not evaluable", "labels", Array(12).fill(["closed"]), (r) => r.ending === "time" && r.scores[1] === "not_evaluable"],
];
for (const [name, id, seq, ok] of cases) {
  const r = run(id, seq); const pass = ok(r);
  if (!pass) process.exitCode = 1;
  console.log(`${pass ? "✓" : "✗"} engine: ${name} (released=${r.released.join(",") || "-"} guard=${r.guard} ending=${r.ending} scores=${r.scores.join(",")})`);
}

// Review link: encoding and decoding must return the same attempt.
import { decodeAttempt, encodeAttempt, type SharedAttempt } from "../src/lib/convo/share";
{
  const a: SharedAttempt = { v: 1, scenarioId: "pickup", ending: "plan_key", flagged: [1], interrupted: false, hints: { requested: 1, auto: 0 }, reflection: "Asking found the drive-through. — ünïcode ok",
    turns: [{ learner: "What's been going on?", reply: "It's been busier.", tags: ["namesConcern", "open"], released: ["busier"], hintBefore: false, guardAfter: 0 }] };
  encodeAttempt(a).then(async (code) => {
    const b = await decodeAttempt(code);
    const ok = JSON.stringify(a) === JSON.stringify(b) && !/[^A-Za-z0-9_-]/.test(code);
    if (!ok) process.exitCode = 1;
    console.log(`${ok ? "✓" : "✗"} review link round-trips (${code.length} characters, URL-safe)`);
  });
}

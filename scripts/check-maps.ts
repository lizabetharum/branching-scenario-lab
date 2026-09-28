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
// Each step is a list of labels. By default a step is treated as relevant to
// every topic. Use { tags, addr } to say which topics a message addresses.
import { convoScenarios } from "../src/lib/convo";
import { replay, step, endingFor, endingText } from "../src/lib/convo/engine";
import type { Behavior, ConvoTurn } from "../src/lib/convo/types";
type Step = Behavior[] | { tags: Behavior[]; addr: string[] };
function run(id: string, seq: Step[], opts: { forceEnd?: boolean } = {}) {
  const s = convoScenarios[id]; const turns: ConvoTurn[] = []; let ending: string | null = null;
  const all = s.facts.map((f) => f.id);
  for (const x of seq) {
    const tags = Array.isArray(x) ? x : x.tags; const addr = Array.isArray(x) ? all : x.addr;
    const st = replay(s, turns); const { guard, fact } = step(s, st, tags, addr);
    const released = fact ? [...st.released, fact.id] : st.released;
    turns.push({ learner: `[${tags.join("+")}]`, reply: fact ? fact.says : "(no new fact)", tags, addresses: addr, released: fact ? [fact.id] : [], hintBefore: false, guardAfter: guard });
    ending = endingFor(s, st.released, released, tags, turns.length, false);
    if (ending) break;
  }
  const st = replay(s, turns);
  if (!ending && opts.forceEnd) ending = endingFor(s, st.released, st.released, [], st.turns, true);
  const results = s.evaluate(turns, st.released);
  return { released: st.released, guard: st.guard, ending, scores: results.map((c) => c.status), results, text: ending ? endingText(s, ending as never, st.released) : "" };
}
const P = (r: ReturnType<typeof run>, id: string) => r.results.find((c) => c.id === id)?.status;
const cases: [string, string, Step[], (r: ReturnType<typeof run>) => boolean, { forceEnd?: boolean }?][] = [
  ["labels ideal: explore, ask ideas, ask for a plan, confirm it", "labels", [["open"], ["open"], ["askOptions"], ["wayForward", "checkin"], ["confirms"]], (r) => r.ending === "plan_key" && r.scores.every((x) => x === "demonstrated")],
  ["labels: asking for a plan is not agreement (proposal pending, no ending)", "labels", [["open"], ["open"], ["askOptions"], ["wayForward", "checkin"]], (r) => r.ending === null && r.released.includes("commit") && P(r, "P4") === "partial"],
  ["labels: walking away after the proposal ends unconfirmed", "labels", [["open"], ["open"], ["askOptions"], ["wayForward", "checkin"]], (r) => r.ending === "unconfirmed" && P(r, "P4") === "partial", { forceEnd: true }],
  ["REVIEW FINDING 1: directive, repair, then asking for a plan does not end as agreed", "labels", [["instruction", "interpretation"], ["acknowledge", "open"], { tags: ["open", "wayForward", "checkin"], addr: [] }], (r) => r.ending !== "plan_key" && r.ending !== "plan_surface" && P(r, "P4") !== "demonstrated"],
  ["REVIEW FINDING 2: an off-topic open question does not release the tray", "labels", [["open"], { tags: ["open"], addr: [] }], (r) => r.released.includes("pattern") && !r.released.includes("tray")],
  ["a relevant second question does release the tray", "labels", [["open"], { tags: ["open"], addr: ["tray"] }], (r) => r.released.includes("tray")],
  ["manager-imposed plan, accepted, ends plan agreed cause missed", "labels", [["open"], ["open"], ["instruction"], ["checkin"], ["confirms"]], (r) => r.ending === "plan_surface" && P(r, "P3") === "not_observed" && P(r, "P4") === "demonstrated"],
  ["REVIEW 2, FINDING 1: a planning question marked relevant to the tray still doesn't reveal it", "labels", [{ tags: ["open"], addr: ["pattern"] }, { tags: ["open", "wayForward", "checkin"], addr: ["tray"] }], (r) => r.released.includes("pattern") && !r.released.includes("tray")],
  ["REVIEW 2, FINDING 3: generic and planning questions don't count toward P1", "labels", [{ tags: ["open"], addr: ["pattern"] }, { tags: ["open"], addr: [] }, { tags: ["open", "wayForward", "checkin"], addr: [] }], (r) => P(r, "P1") === "partial"],
  ["P1 full credit: two questions about the problem, the second building on what Sam revealed", "labels", [{ tags: ["open"], addr: ["pattern"] }, { tags: ["open"], addr: ["tray"] }], (r) => P(r, "P1") === "demonstrated"],
  ["P1 partial: two questions about the problem that never build on an answer", "labels", [{ tags: ["open"], addr: ["history"] }, { tags: ["open"], addr: ["history"] }], (r) => r.released.length === 0 && P(r, "P1") === "partial"],
  ["REVIEW 2, FINDING 2: Ana's case, cause found without a plan, ending acknowledges the diagnosis", "labels-b", [{ tags: ["open"], addr: ["pattern"] }, { tags: ["open"], addr: ["form"] }], (r) => r.released.includes("form") && r.ending === "closed" && r.text.startsWith("You found the cause"), { forceEnd: true }],
  ["an ending without the cause keeps the no-cause text", "labels", [{ tags: ["open"], addr: ["pattern"] }], (r) => r.ending === "closed" && !r.text.startsWith("You found the cause"), { forceEnd: true }],
  ["REVIEW 3: a surface idea offered on request is named in the P4 feedback, as off-cause and unconfirmed", "labels", [{ tags: ["open"], addr: ["pattern"] }, { tags: ["wayForward", "checkin"], addr: [] }], (r) => P(r, "P4") === "partial" && /targets rushing, not the shared tray/.test(r.results.find((c) => c.id === "P4")!.evidence) && !/never offered/.test(r.results.find((c) => c.id === "P4")!.evidence)],
  ["REVIEW 4: after Sam offers his own idea, P4 advice doesn't say to ask for ideas first", "labels", [{ tags: ["open"], addr: ["pattern"] }, { tags: ["open"], addr: ["tray"] }, { tags: ["wayForward"], addr: [] }], (r) => r.released.includes("idea") && !/Ask for ideas first/.test(r.results.find((c) => c.id === "P4")!.nextStep)],
  ["labels telling shuts Sam down: nothing released", "labels", [["interpretation", "instruction"], ["leading"]], (r) => r.guard === 3 && r.released.length === 0],
  ["labels repair reopens: acknowledge + open releases pattern", "labels", [["interpretation"], ["acknowledge", "open"]], (r) => r.released.includes("pattern")],
  ["labels early options give the surface idea, not the real one", "labels", [["open"], ["askOptions"], ["wayForward"], ["confirms"]], (r) => r.released.includes("surfaceIdea") && !r.released.includes("idea") && r.ending === "plan_surface"],
  ["asking what Sam will do first draws out Sam's own idea once the cause is known", "labels", [["open"], ["open"], ["wayForward"]], (r) => r.released.includes("idea") && !r.released.some((x) => x.startsWith("commit"))],
  ["labels guessing the tray (leading) doesn't release it", "labels", [["open"], ["leading"]], (r) => !r.released.includes("tray")],
  ["labels: the tray stays hidden while Sam is still guarded", "labels", [["open"], ["leading"], ["leading"], ["acknowledge", "open"]], (r) => r.released.includes("pattern") && !r.released.includes("tray")],
  ["pickup: the drive-through stays hidden while Dev is still guarded", "pickup", [["namesConcern", "open"], ["interpretation"], ["interpretation"], ["interpretation"], ["acknowledge", "open"]], (r) => r.released.includes("busier") && !r.released.includes("drive")],
  ["pickup: no concern named, open question releases nothing", "pickup", [["overSoften"], ["open"]], (r) => r.released.length === 0],
  ["pickup: self-answered questions earn nothing", "pickup", [["namesConcern"], ["open", "selfAnswer"], ["open", "selfAnswer"]], (r) => r.released.length === 0],
  ["pickup ideal reaches the drive-through and a confirmed plan", "pickup", [["namesConcern", "open"], ["open"], ["askOptions"], ["wayForward", "checkin"], ["confirms"]], (r) => r.released.includes("drive") && r.ending === "plan_key" && r.scores.every((x) => x === "demonstrated")],
  ["pickup: a plan Priya supplies scores Q4 not demonstrated", "pickup", [["namesConcern", "open"], ["open"], ["instruction"], ["checkin"], ["confirms"]], (r) => r.ending === "plan_surface" && P(r, "Q4") === "not_observed"],
  ["labels-b ideal reaches the form and a confirmed plan", "labels-b", [["open"], ["open"], ["askOptions"], ["wayForward", "checkin"], ["confirms"]], (r) => r.released.includes("form") && r.ending === "plan_key" && r.scores.every((x) => x === "demonstrated")],
  ["pickup-b ideal reaches the training load and a confirmed plan", "pickup-b", [["namesConcern", "open"], ["open"], ["askOptions"], ["wayForward", "checkin"], ["confirms"]], (r) => r.released.includes("training") && r.ending === "plan_key" && r.scores.every((x) => x === "demonstrated")],
  ["pickup-b self-answered questions earn nothing", "pickup-b", [["namesConcern"], ["open", "selfAnswer"]], (r) => r.released.length === 0],
  ["turn limit ends the conversation; no open questions means P2 not evaluable", "labels", Array(12).fill(["closed"]), (r) => r.ending === "time" && r.scores[1] === "not_evaluable"],
];
const evidenceRuns: ReturnType<typeof run>[] = [];
for (const [name, id, seq, ok, opts] of cases) {
  const r = run(id, seq, opts ?? {}); const pass = ok(r);
  evidenceRuns.push(r);
  if (!pass) process.exitCode = 1;
  console.log(`${pass ? "✓" : "✗"} engine: ${name} (released=${r.released.join(",") || "-"} guard=${r.guard} ending=${r.ending} scores=${r.scores.join(",")})`);
}

// Evidence rule: every "demonstrated" rating must quote a completed behavior in
// the transcript. Plan agreement must quote the proposal and the confirmation.
{
  let bad = 0;
  for (const r of evidenceRuns) for (const c of r.results) {
    if (c.status !== "demonstrated") continue;
    const quotesLearner = /You said: "|You confirmed: "/.test(c.evidence);
    const plan = c.id === "P4" || c.id === "Q4";
    const planOk = !plan || (/proposed: "/.test(c.evidence) && /You confirmed: "/.test(c.evidence));
    if (!quotesLearner || !planOk) { bad++; console.log(`  ✗ ${c.id} evidence lacks a transcript quote: ${c.evidence.slice(0, 90)}`); }
  }
  if (bad) process.exitCode = 1;
  console.log(`${bad ? "✗" : "✓"} evidence: every "demonstrated" conversation rating quotes a completed behavior (${bad} violations)`);
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

// Tree trade-off paths: scoring must reflect each cost.
{
  const s = scenarios.jordan;
  const walk = (ids: string[]) => {
    const h: Turn[] = []; let cur = s.start;
    for (const id of ids) {
      const m = s.nodes[cur].moves.find((x) => x.id === id);
      if (!m) throw new Error(`${id} not available at ${cur}`);
      const prior = h.some((t) => s.nodes[t.nodeId].moves.find((x) => x.id === t.moveId)?.quality === "poor");
      h.push({ nodeId: cur, moveId: id, mode: "free", learnerText: m.label, counterpartText: m.reply, hintBefore: false, afterRecovery: prior });
      cur = m.next;
    }
    return { end: cur, r: Object.fromEntries(s.evaluate(h).map((c) => [c.id, c.status])) };
  };
  const cases: [string, string[], (x: ReturnType<typeof walk>) => boolean][] = [
    ["leaving Jordan with no next step costs T3 (partial)", ["D1.diagnose", "D2.scaffold", "P1.leave", "R2.simplify", "D3.verify"], (x) => x.end === "E1" && x.r.T3 === "partial"],
    ["making Maya wait still lets Jordan do the work (T3 demonstrated)", ["D1.diagnose", "D2.scaffold", "P1.wait", "D3.verify"], (x) => x.end === "E1" && x.r.T3 === "demonstrated"],
    ["reverting everything then testing one change recovers T2", ["D1.diagnose", "D2.revertAll", "R2b.oneAtATime", "D3.verify"], (x) => x.end === "E1" && x.r.T2 === "demonstrated"],
    ["reverting everything and sending Jordan off ends partial with no bounded step", ["D1.diagnose", "D2.revertAll", "R2b.go"], (x) => x.end === "E3" && x.r.T2 === "not_observed"],
    ["the sensor lead costs time but can recover", ["D1.sensors", "D1b.diagnose", "D2.scaffold", "P1.triage", "D3.verify"], (x) => x.end === "E1" && x.r.T1 === "demonstrated"],
    ["takeover without repair fails T3", ["D1.takeover", "R1.continue"], (x) => x.end === "E2" && x.r.T3 === "not_observed"],
  ];
  let bad = 0;
  for (const [name, ids, ok] of cases) {
    const x = walk(ids); const pass = ok(x);
    const h: Turn[] = []; let cur = s.start;
    for (const id of ids) { const m = s.nodes[cur].moves.find((y) => y.id === id)!; h.push({ nodeId: cur, moveId: id, mode: "free", learnerText: m.label, counterpartText: m.reply, hintBefore: false, afterRecovery: false }); cur = m.next; }
    for (const c of s.evaluate(h)) if (c.status === "demonstrated" && !/You said: "/.test(c.evidence)) { bad++; console.log(`  ✗ tree ${c.id} evidence lacks a quote: ${c.evidence.slice(0, 80)}`); }
    if (!pass) process.exitCode = 1;
    console.log(`${pass ? "✓" : "✗"} tree: ${name} (end=${x.end} ${JSON.stringify(x.r)})`);
  }
  if (bad) process.exitCode = 1;
  console.log(`${bad ? "✗" : "✓"} evidence: every "demonstrated" tree rating quotes the learner (${bad} violations)`);
}

// Authoring kit: the example draft must validate and pass every authoring check.
import { EXAMPLE_PACKET, buildScenario, runAuthoringChecks, validatePacket } from "../src/lib/convo/authoring";
{
  const v = validatePacket(EXAMPLE_PACKET);
  const results = v.packet && !v.errors.length ? runAuthoringChecks(buildScenario(v.packet)) : [];
  const ok = v.errors.length === 0 && results.length > 0 && results.every((r) => r.pass);
  if (!ok) process.exitCode = 1;
  console.log(`${ok ? "✓" : "✗"} authoring kit: example validates and passes ${results.filter((r) => r.pass).length}/${results.length} checks${v.errors.length ? ` (${v.errors.join("; ")})` : ""}`);
}

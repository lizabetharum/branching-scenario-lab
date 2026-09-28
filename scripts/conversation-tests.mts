// Full-conversation tests. Plays scripted manager lines through the live
// /api/converse endpoint, scores the result with the app's own evaluate(),
// and compares the ending and every criterion with ratings written in advance.
// These expected ratings are designer-authored, not independent human ratings.
//   npx tsx scripts/conversation-tests.mts <url> [--write]
import { writeFileSync } from "node:fs";
import { convoScenarios } from "../src/lib/convo";
import { replay, endingFor } from "../src/lib/convo/engine";
import type { ConvoTurn } from "../src/lib/convo/types";
import type { CriterionStatus } from "../src/lib/types";

const target = process.argv[2] ?? "http://localhost:3000";
const write = process.argv.includes("--write");

interface Conv { id: string; name: string; scenario: string; lines: string[]; endAfter?: boolean; ending: string[]; expect: Record<string, CriterionStatus[]>; note: string }
const conversations: Conv[] = [
  {
    id: "C1", name: "Marcus, strong conversation", scenario: "labels",
    lines: [
      "Thanks for coming in. Walk me through what's been happening at your station when these mix-ups happen.",
      "What happens to the label you were working on when you get called to the register?",
      "That makes sense. What do you think would help?",
      "Let's try it. What will you do first, and when should we check how it's going?",
      "Friday works. Let's do it.",
    ],
    ending: ["plan_key"], expect: { P1: ["demonstrated"], P2: ["demonstrated"], P3: ["demonstrated"], P4: ["demonstrated"] },
    note: "Every criterion quotes a completed behavior, including Sam's proposal and the confirmation.",
  },
  {
    id: "C2", name: "The reviewer's conversation: directive, repair, ask for a plan", scenario: "labels", endAfter: true,
    lines: [
      "You need to slow down and double-check every label.",
      "Sorry, I jumped ahead. What's actually happening at your station when these come up?",
      "What will you do first, and when should we check how it is working?",
    ],
    ending: ["unconfirmed", "closed"], expect: { P1: ["partial", "not_observed"], P3: ["not_observed", "partial"], P4: ["partial", "not_observed"] },
    note: "Pins the reviewer's finding: no plan ending, and no P4 credit for asking. P3 varies between runs (not observed, or partial when the question draws out Sam's surface idea), so either is accepted.",
  },
  {
    id: "C3", name: "Asks for an action that never occurs", scenario: "labels", endAfter: true,
    lines: [
      "Walk me through what's been happening at your station when these mix-ups happen.",
      "Okay. What will you do first, and when do we check in?",
    ],
    ending: ["closed"], expect: { P3: ["partial", "not_observed"], P4: ["partial"] },
    note: "Asked before the cause surfaced. No step and time is proposed or confirmed, so nothing is agreed (P4 partial). P3 is partial when the question draws out Sam's surface idea, otherwise not observed. P3 was first written as not_observed only, then widened when a next-step question began drawing out the character's idea.",
  },
  {
    id: "C4", name: "Off-topic second question (review finding 2)", scenario: "labels", endAfter: true,
    lines: [
      "Walk me through what's been happening at your station when these mix-ups happen.",
      "What would make this conversation useful for you?",
    ],
    ending: ["closed"], expect: { P3: ["not_observed"], P4: ["not_observed"] },
    note: "The shared tray must stay hidden after a question that isn't about it.",
  },
  {
    id: "C5", name: "Priya, strong conversation", scenario: "pickup",
    lines: [
      "Thanks for coming in. A customer said yesterday they felt rushed at pickup, and I've noticed a couple of quick handoffs this week. What's been going on?",
      "What's different about how the afternoons run now?",
      "I didn't know that. What do you think would help?",
      "Let's try that. What's the first step, and when should we check in?",
      "Friday it is. Thanks, Dev.",
    ],
    ending: ["plan_key"], expect: { Q1: ["demonstrated"], Q2: ["demonstrated"], Q3: ["demonstrated"], Q4: ["demonstrated"] },
    note: "Q4 needs Dev's own idea, Dev's proposal and Priya's confirmation.",
  },
];

const results = [];
for (const c of conversations) {
  const s = convoScenarios[c.scenario];
  const turns: ConvoTurn[] = [];
  let ending: string | null = null;
  const log: string[] = [];
  // Any boundary or failure means the conversation didn't run as scripted. That is a test failure, never a pass.
  let blocked = false;
  for (const text of c.lines) {
    const r = await fetch(`${target}/api/converse`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId: c.scenario, text, turns }) });
    const d = await r.json();
    if (d.kind !== "turn") { log.push(`[${d.kind}${d.boundary ? ": " + d.boundary : ""}] ${text}`); blocked = true; break; }
    turns.push({ learner: text, reply: d.reply, tags: d.tags, released: d.released, hintBefore: false, guardAfter: d.guard });
    log.push(`${text} → [${d.tags.join(", ")}]${d.released.length ? ` released ${d.released.join(",")}` : ""}`);
    if (d.ending) { ending = d.ending; break; }
  }
  const st = replay(s, turns);
  if (!ending && c.endAfter) ending = endingFor(s, st.released, st.released, [], st.turns, true);
  const scores = Object.fromEntries(s.evaluate(turns, st.released).map((x) => [x.id, x.status]));
  const endOk = ending !== null && c.ending.includes(ending);
  const scoreOk = Object.entries(c.expect).every(([k, allowed]) => allowed.includes(scores[k]));
  const pass = endOk && scoreOk && !blocked;
  results.push({ id: c.id, name: c.name, scenario: c.scenario, ending, expectedEnding: c.ending.join(" or "), scores, expected: c.expect, note: c.note, transcript: log, pass });
  console.log(`${pass ? "✓" : "✗"} ${c.id} ${c.name}: ending ${ending} (expected ${c.ending.join("/")}), ${Object.entries(scores).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  if (!pass) for (const l of log) console.log(`    ${l}`);
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`);
if (results.some((r) => !r.pass)) process.exitCode = 1;
if (write) {
  const out = { date: new Date().toISOString().slice(0, 10), target: process.env.TARGET_LABEL ?? target, conversations: results };
  writeFileSync(new URL("../src/lib/conversation-results.ts", import.meta.url), `// Written by scripts/conversation-tests.mts. Observed results against designer-authored expectations.\nexport const conversationRun = ${JSON.stringify(out, null, 2)} as const;\n`);
}

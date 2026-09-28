import type { ConvoScenario, ConvoTurn } from "./types";
import { cr, idx, q, supportAt, validOpenIdx } from "./eval";

// Marcus Delgado: execution gap. He tells instead of asks.
// Fact packet, release rules and dialogue are original and untested.

const GROW = {
  name: "GROW",
  summary: "A four-stage structure for a coaching conversation. The manager asks. The employee does most of the thinking.",
  steps: [
    { letter: "G", name: "Goal", purpose: "Agree on what a good outcome looks like, for this conversation and for the work." },
    { letter: "R", name: "Reality", purpose: "Find out what is actually happening before you decide what it means." },
    { letter: "O", name: "Options", purpose: "Ask the employee what could work. Their ideas come before yours." },
    { letter: "W", name: "Way forward", purpose: "Agree on a first step, who owns it and when you will check in. Some versions call this Will." },
  ],
  note: "Naming the stages earns no credit here. The criteria score the questions you ask and when you ask them.",
};
export { GROW };

function evaluate(turns: ConvoTurn[], released: string[]) {
  const firstInterp = turns.findIndex((t) => t.tags.some((x) => x === "interpretation" || x === "instruction" || x === "leading"));
  const opens = validOpenIdx(turns);
  const before = opens.filter((i) => firstInterp === -1 || i < firstInterp);
  const leading = idx(turns, "leading");
  const instr = idx(turns, "instruction");
  const way = idx(turns, "wayForward");
  const check = idx(turns, "checkin");

  const P1 = "Asked two or more open questions before any interpretation";
  const p1 =
    before.length >= 2
      ? cr("P1", P1, "demonstrated", supportAt(turns, before[1]), `${before.length} open questions before any interpretation. ${q(turns[before[1]])}`, "Keep exploring before you name a cause.")
      : opens.length >= 2 || before.length === 1
        ? cr("P1", P1, "partial", opens.length >= 2 ? "after_recovery" : supportAt(turns, before[0]), `${before.length} open question(s) came before your first interpretation. ${q(turns[firstInterp])}`, "Hold your interpretation until Sam has answered two open questions.")
        : cr("P1", P1, "not_observed", "n/a", "No open question was left for Sam to answer.", "Start with a question Sam has to describe, such as what happens at the station.");

  const p2 =
    leading === -1 && opens.length === 0
      ? cr("P2", "Asked no leading questions", "not_evaluable", "n/a", "No open questions were asked, so there was nothing to judge.", "Ask open questions. This criterion checks how you phrase them.")
      : leading === -1
        ? cr("P2", "Asked no leading questions", "demonstrated", "independent", "No leading questions tagged.", "Keep phrasing questions so Sam supplies the answer.")
        : cr("P2", "Asked no leading questions", "not_observed", "n/a", `Leading question tagged. ${q(turns[leading])}`, "Turn \"Is it because...?\" into \"What's happening when...?\"");

  const P3 = "Sam generated the option, after the cause surfaced";
  const ideaAt = turns.findIndex((t) => t.released.includes("idea"));
  const surfaceAt = turns.findIndex((t) => t.released.includes("surfaceIdea"));
  const p3 = released.includes("idea")
    ? cr("P3", P3, "demonstrated", supportAt(turns, ideaAt), q(turns[ideaAt]), "Keep asking for Sam's ideas once the cause is clear.")
    : released.includes("surfaceIdea")
      ? cr("P3", P3, "partial", supportAt(turns, surfaceAt), `You asked for ideas before the shared tray came up, so Sam's idea targets rushing. ${q(turns[surfaceAt])}`, "Explore Reality further before asking for Options.")
      : cr("P3", P3, "not_observed", "n/a", instr >= 0 ? `You supplied the plan. ${q(turns[instr])}` : "Options never came up.", "Ask \"What could you try?\" and wait for Sam's answer.");

  const P4 = "Agreed on a specific next step and check-in";
  const p4 =
    way >= 0 && check >= 0
      ? cr("P4", P4, "demonstrated", supportAt(turns, Math.max(way, check)), q(turns[Math.max(way, check)]), "Keep closing with who does what, and when you'll check.")
      : way >= 0 || check >= 0
        ? cr("P4", P4, "partial", supportAt(turns, Math.max(way, check)), `${way >= 0 ? "A next step, but no check-in." : "A check-in, but no specific next step."} ${q(turns[Math.max(way, check)])}`, "Close with both: the first step and when you'll look at it together.")
        : cr("P4", P4, "not_observed", "n/a", "The conversation ended without a next step or check-in.", "Ask what Sam will do first and when you'll follow up.");

  return [p1, p2, p3, p4];
}

export const labels: ConvoScenario = {
  id: "labels",
  format: "conversation",
  title: "The Label Conversation",
  domain: "Healthcare · pharmacy leadership coaching",
  tagline: "You're Marcus. Coach a technician after a pattern of labeling errors. Open conversation, no scripted choices.",
  who: "sam",
  persona: {
    id: "marcus",
    name: "Marcus Delgado",
    summary: "Confident pharmacy manager. Already runs coaching conversations but cuts corners on exploration.",
    gap: "Execution. He tells instead of asks.",
    objective:
      "Given a pharmacy performance scenario involving a technician error pattern, investigate by posing at least two open, exploratory questions before stating any interpretation, with zero leading questions, scored on a GROW investigation rubric.",
    support: "on_request",
  },
  counterpart: {
    name: "Sam",
    role: "Pharmacy technician at Gilbert's, two years on the team",
    goal: "Get through the conversation and back to the counter before the rush.",
    voice: "Friendly with customers, a little defensive with managers. Speaks plainly in short sentences.",
    boundaries: ["Never mentions drugs, doses or patients.", "Doesn't volunteer facts that weren't asked for.", "Doesn't open up because the manager sounds friendly."],
  },
  intake: {
    duration: "10 to 15 minutes, up to 12 turns. Enough for one skill: exploring before interpreting.",
    situation: "Pharmacy techs juggle prescription-filling accuracy with customer service. The skill breaks down when a manager sees an error pattern and tells instead of asks.",
    experience: "Leaders with some experience but inconsistent coaching approaches. Marcus doesn't need the idea of coaching. He needs to hold back his interpretation.",
  },
  objective:
    "Given a technician error pattern, investigate with at least two open, exploratory questions before stating any interpretation, with zero leading questions, and close with a way forward the technician helped build.",
  transferEvidence:
    "In the next real coaching conversation about a performance pattern, an observer or a consented recording is scored with the same four criteria.",
  insufficientEvidence: "Reaching a plan, reciting the GROW steps, or reporting more confidence without the questioning behavior.",
  prebrief: [
    "This is a fictional coaching conversation at a fictional pharmacy. Sam is not a real person.",
    "There are no scripted choices. Type or say what you would actually say. Sam only knows what's in the case, and only tells you what your questions earn.",
    "It is not clinical decision support. It won't answer medication, dosing or patient-care questions.",
    "Do not enter real employee, patient or customer information.",
    "You have about 12 turns before the evening rush. Nothing is timed. You can pause or end the conversation at any point.",
  ],
  setting:
    "2:15 p.m., before the evening rush. Final check caught three labeling errors from Sam's station in two weeks. All three were caught before anything left the pharmacy. You asked Sam to step into the consult room.",
  opener: "You wanted to see me? If this is about the labels, I know. I'll be more careful.",
  guardStart: 2,
  guardTone: [
    "Open and relaxed. Shares detail readily.",
    "Cooperative but brief. Answers what was asked.",
    "Guarded. Short answers, a little defensive.",
    "Shut down. One-line compliance, nothing new.",
  ],
  guardLines: [
    "Yeah. What else do you want to know?",
    "I mean, it just happens sometimes.",
    "I don't know. I'll be more careful.",
    "Okay. I'll be more careful.",
  ],
  facts: [
    {
      id: "pattern",
      label: "Errors cluster at the 5 p.m. rush, when Sam is pulled to the register mid-label",
      text: "The errors happen around 5 p.m. The line backs up, Sam gets called to the register in the middle of a label, and when Sam comes back, Sam picks up where Sam thinks they left off.",
      says: "Mostly it's around five. The line backs up, I get called to the register, and when I come back I pick up where I think I left off.",
      keywords: ["five", "register", "5 p", "5pm"],
      release: { anyOf: ["open"], minValidOpens: 1, maxGuard: 2 },
      cue: "rush",
      hint: "You don't know why the errors happen yet. Ask something Sam has to describe, without suggesting a cause.",
    },
    {
      id: "tray",
      label: "Unfinished labels go into a tray shared with Jess",
      text: "When called away, Sam leaves the unfinished label in a tray that Jess, another tech, also uses. Sometimes Sam grabs the wrong label when coming back.",
      says: "Honestly? I leave it in the shared tray. Jess uses that tray too. Sometimes when I come back I grab the wrong one.",
      keywords: ["tray", "jess"],
      release: { anyOf: ["open"], requires: ["pattern"], minValidOpens: 2, maxGuard: 1 },
      key: true,
      cue: "tray",
      hint: "You know when it happens. Ask what happens to the label Sam was working on when Sam gets called away.",
    },
    {
      id: "idea",
      label: "Sam's idea: a separate bin for each tech",
      text: "Sam's idea: each tech gets their own bin, so an unfinished label stays in your own bin.",
      says: "What if Jess and I each had our own bin? If I get called away, the label stays in my bin.",
      keywords: ["own bin", "each had", "separate bin", "my bin"],
      release: { anyOf: ["askOptions"], requires: ["tray"], maxGuard: 2 },
      idea: true,
      cue: "bins",
      hint: "Sam knows the station better than you. Ask for Sam's ideas before offering yours.",
    },
    {
      id: "surfaceIdea",
      optional: true,
      label: "Sam's surface idea: slow down",
      text: "Without knowing the real cause, Sam's only idea is to slow down and double-check.",
      says: "I guess I could slow down and double-check everything?",
      keywords: ["slow down", "double-check"],
      release: { anyOf: ["askOptions"], maxGuard: 2 },
      idea: true,
      hint: "Ask for Sam's ideas.",
    },
    {
      id: "history",
      optional: true,
      label: "Nobody ever assigned the tray",
      text: "The shared tray was there before Sam started. Nobody ever set it up or assigned it.",
      says: "That tray was there before I started. Nobody ever set it up. It's just where stuff goes.",
      keywords: ["before i started", "nobody ever"],
      release: { anyOf: ["open", "acknowledge"], requires: ["tray"], maxGuard: 1 },
      hint: "Optional: ask how the tray came to be shared.",
    },
  ],
  maxTurns: 12,
  endings: {
    plan_key: { id: "plan_key", title: "Plan agreed, cause found", text: "Sam heads back with a plan aimed at the shared tray. Check the criteria below. Reaching a plan doesn't mean every criterion was met." },
    plan_surface: { id: "plan_surface", title: "Plan agreed, cause missed", text: "You have a plan, but it's built on what you could see. The shared tray never came up, so the next rush will likely look the same." },
    closed: { id: "closed", title: "Ended without a plan", text: "Sam goes back to the counter. Nothing in the conversation targets why the errors happen." },
    time: { id: "time", title: "Out of time", text: "The five o'clock line starts to build and Sam has to go. The conversation stopped before a plan." },
  },
  criteria: [
    { id: "P1", label: "Asked two or more open questions before any interpretation", anchors: ["No open question before the first interpretation, leading question or instruction", "One open question first, or two only after an interpretation", "Two or more open questions before any interpretation"] },
    { id: "P2", label: "Asked no leading questions", anchors: ["One or more leading questions", "Not used. The objective requires zero leading questions.", "No leading questions"] },
    { id: "P3", label: "Sam generated the option, after the cause surfaced", anchors: ["Marcus supplied the plan, or options never came up", "Asked for options before the cause surfaced, so Sam's idea targets the wrong thing", "Asked for options after the cause surfaced, and Sam proposed the fix"] },
    { id: "P4", label: "Agreed on a specific next step and check-in", anchors: ["No next step or check-in", "A next step or a check-in, not both", "A specific next step and a check-in"] },
  ],
  evaluate,
  framework: GROW,
};

import type { ConvoScenario, ConvoTurn } from "./types";
import { confirmedQ, cr, idx, investigative, isFollowUp, planTrace, proposedQ, q, supportAt, validOpenIdx } from "./eval";

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

export function makeLabelsEvaluate(o: { name: string; cause: string; surface: string }) {
  return function evaluate(turns: ConvoTurn[], released: string[]) {
  const firstInterp = turns.findIndex((t) => t.tags.some((x) => x === "interpretation" || x === "instruction" || x === "leading"));
  const opens = validOpenIdx(turns);
  const inv = turns.map((t, i) => (investigative(t) ? i : -1)).filter((i) => i >= 0);
  const invBefore = inv.filter((i) => firstInterp === -1 || i < firstInterp);
  const follow = invBefore.find((i) => isFollowUp(turns, i));
  const leading = idx(turns, "leading");
  const instr = idx(turns, "instruction");
  const counts = `${invBefore.length} open question(s) about the problem before any interpretation, out of ${opens.length} open question(s) in total.`;

  const P1 = `Asked two or more open questions about the problem before any interpretation, building on what ${o.name} revealed`;
  const p1 =
    invBefore.length >= 2 && follow !== undefined
      ? cr("P1", P1, "demonstrated", supportAt(turns, follow), `${counts} Your follow-up: ${q(turns[follow]).replace("You said: ", "")} ${q(turns[invBefore[0]])}`, "Keep exploring before you name a cause, and keep building on each answer.")
      : invBefore.length >= 2
        ? cr("P1", P1, "partial", supportAt(turns, invBefore[1]), `${counts} None built on what ${o.name} had just revealed. ${q(turns[invBefore[1]])}`, `When ${o.name} tells you something, ask about that next.`)
        : inv.length >= 2 || invBefore.length === 1
          ? cr("P1", P1, "partial", inv.length >= 2 && invBefore.length < 2 ? "after_recovery" : supportAt(turns, invBefore[0]), `${counts} ${firstInterp >= 0 ? q(turns[firstInterp]) : q(turns[inv[0]])}`, `Hold your interpretation until ${o.name} has answered two questions about the problem.`)
          : cr("P1", P1, "not_observed", "n/a", `${counts} No question about the problem was left for ${o.name} to answer.`, `Start with a question ${o.name} has to describe, such as what happens at the station.`);

  const p2 =
    leading === -1 && opens.length === 0
      ? cr("P2", "Asked no leading questions", "not_evaluable", "n/a", "No open questions were asked, so there was nothing to judge.", "Ask open questions. This criterion checks how you phrase them.")
      : leading === -1
        ? cr("P2", "Asked no leading questions", "demonstrated", "independent", `No leading questions. Your first open question: ${q(turns[opens[0]])}`, `Keep phrasing questions so ${o.name} supplies the answer.`)
        : cr("P2", "Asked no leading questions", "not_observed", "n/a", `Leading question tagged. ${q(turns[leading])}`, "Turn \"Is it because...?\" into \"What's happening when...?\"");

  const P3 = `${o.name} generated the option, after the cause surfaced`;
  const ideaAt = turns.findIndex((t) => t.released.includes("idea"));
  const surfaceAt = turns.findIndex((t) => t.released.includes("surfaceIdea"));
  const p3 = released.includes("idea")
    ? cr("P3", P3, "demonstrated", supportAt(turns, ideaAt), `${q(turns[ideaAt])} ${o.name} answered: "${turns[ideaAt].reply}"`, `Keep asking for ${o.name}'s ideas once the cause is clear.`)
    : released.includes("surfaceIdea")
      ? cr("P3", P3, "partial", supportAt(turns, surfaceAt), `You asked for ideas before ${o.cause} came up, so ${o.name}'s idea targets ${o.surface}. ${q(turns[surfaceAt])}`, "Explore Reality further before asking for Options.")
      : cr("P3", P3, "not_observed", "n/a", instr >= 0 ? `You supplied the plan. ${q(turns[instr])}` : "Options never came up.", `Ask "What could you try?" and wait for ${o.name}'s answer.`);

  const P4 = "Agreed on a specific next step and check-in";
  const plan = planTrace(turns);
  // What the character actually offered when asked, even if it wasn't a formal proposal.
  const offeredAt = plan.askAt >= 0 ? turns.findIndex((t, i) => i >= plan.askAt && (t.released.includes("surfaceIdea") || t.released.includes("idea"))) : -1;
  const p4 =
    plan.confirmAt >= 0
      ? cr("P4", P4, "demonstrated", supportAt(turns, plan.confirmAt), `${proposedQ(o.name, turns[plan.proposeAt])} ${confirmedQ(turns[plan.confirmAt])}`, "Keep closing with who does what, and when you'll check.")
      : plan.proposeAt >= 0
        ? cr("P4", P4, "partial", supportAt(turns, plan.proposeAt), `${proposedQ(o.name, turns[plan.proposeAt])} You never confirmed it, so nothing was agreed.`, "When a step and a time are proposed, confirm them or adjust them out loud.")
        : plan.askAt >= 0
          ? cr("P4", P4, "partial", supportAt(turns, plan.askAt), offeredAt >= 0 ? `${o.name} offered: "${turns[offeredAt].reply}" ${turns[offeredAt].released.includes("surfaceIdea") ? `That targets ${o.surface}, not ${o.cause},` : "That was an idea,"} and you never confirmed a specific step and time. ${q(turns[plan.askAt])}` : `You asked for a next step, but ${o.name} never offered one. ${q(turns[plan.askAt])}`, `${o.name} can only commit once there's an idea on the table. Ask for ideas first, then for the first step.`)
          : cr("P4", P4, "not_observed", "n/a", "The conversation ended without anyone proposing a next step.", `Ask what ${o.name} will do first and when you'll follow up.`);

  return [p1, p2, p3, p4];
}
}

export const labels: ConvoScenario = {
  id: "labels",
  format: "conversation",
  caseGroup: "marcus",
  caseLabel: "Case A",
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
      probe: "asks what is happening at the station, when or how the errors happen, or what Sam's shift is like when they occur",
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
      probe: "asks what happens to the unfinished label or work in progress when Sam is interrupted, how labels are set down, stored or picked back up, or how the station is set up",
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
      keywords: ["own bin", "each had", "separate bin", "my bin", "somewhere else", "separate tray", "own tray"],
      release: { anyOf: ["askOptions", "wayForward"], requires: ["tray"], maxGuard: 2 },
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
      release: { anyOf: ["askOptions", "wayForward"], unless: ["idea"], maxGuard: 2 },
      idea: true,
      hint: "Ask for Sam's ideas.",
    },
    {
      id: "history",
      probe: "asks how the station setup came about or who decided it",
      optional: true,
      label: "Nobody ever assigned the tray",
      text: "The shared tray was there before Sam started. Nobody ever set it up or assigned it.",
      says: "That tray was there before I started. Nobody ever set it up. It's just where stuff goes.",
      keywords: ["before i started", "nobody ever"],
      release: { anyOf: ["open", "acknowledge"], requires: ["tray"], maxGuard: 1 },
      hint: "Optional: ask how the tray came to be shared.",
    },
    {
      id: "commit",
      label: "Sam proposes a first step and a check-in built on Sam's own idea",
      text: "Sam will set up separate bins before tonight's rush and suggests reviewing the error log together on Friday.",
      says: "I'll set up the bins before the rush tonight. Can we look at the error log together Friday?",
      keywords: [],
      release: { anyOf: ["wayForward", "checkin"], requires: ["idea"], maxGuard: 2 },
      commitment: "own",
      hint: "Ask what Sam will do first and when you'll check in.",
    },
    {
      id: "commitSurface",
      optional: true,
      label: "Sam proposes a step built on the surface idea",
      text: "Sam commits to the surface idea with a specific time.",
      says: "Okay. I'll slow down and double-check every label, starting tonight. We can look at the log Friday.",
      keywords: [],
      release: { anyOf: ["wayForward", "checkin"], requires: ["surfaceIdea"], maxGuard: 2 },
      commitment: "surface",
      hint: "Ask for a first step and a check-in.",
    },
    {
      id: "commitManager",
      optional: true,
      label: "Sam accepts the plan you supplied",
      text: "Sam agrees to do what the manager said, with a check-in.",
      says: "Okay. I'll do it the way you said, starting tonight. We can look at the log Friday.",
      keywords: [],
      release: { anyOf: ["wayForward", "checkin"], needsInstruction: true, maxGuard: 2 },
      commitment: "manager",
      hint: "Ask for a first step and a check-in.",
    },
  ],
  maxTurns: 12,
  endings: {
    plan_key: { id: "plan_key", title: "Plan agreed, cause found", text: "Sam heads back with a plan aimed at the shared tray. Check the criteria below. Reaching a plan doesn't mean every criterion was met." },
    plan_surface: { id: "plan_surface", title: "Plan agreed, cause missed", text: "You and Sam agreed on a plan, but it isn't built on the cause. Either the shared tray never came up, or the plan came from you instead of Sam. The next rush will likely look the same." },
    unconfirmed: { id: "unconfirmed", title: "Plan proposed, not confirmed", text: "Sam proposed a step and a time, but the conversation ended before you confirmed it. Sam heads back unsure whether the plan is on.", textWithCause: "You found the cause: Sam's unfinished labels go into a tray Jess shares, and Sam proposed a step and a time. You never confirmed it, so Sam doesn't know whether the plan is on." },
    closed: { id: "closed", title: "Ended without a plan", text: "Sam goes back to the counter. Nothing in the conversation targets why the errors happen.", textWithCause: "You found the cause: Sam's unfinished labels go into a tray Jess shares. The conversation ended before Sam proposed a fix and you agreed on it, so nothing changes yet." },
    time: { id: "time", title: "Out of time", text: "The five o'clock line starts to build and Sam has to go. The conversation stopped before a plan.", textWithCause: "You found the cause: Sam's unfinished labels go into a tray Jess shares. The rush pulled Sam away before you agreed on a next step." },
  },
  criteria: [
    { id: "P1", label: "Asked two or more open questions about the problem before any interpretation, building on what Sam revealed", anchors: ["No open question about the problem before the first interpretation, leading question or instruction", "One question about the problem first, two only after an interpretation, or two that didn't build on what Sam revealed", "Two or more open questions about the problem before any interpretation, at least one building on what Sam revealed"] },
    { id: "P2", label: "Asked no leading questions", anchors: ["One or more leading questions", "Not used. The objective requires zero leading questions.", "No leading questions"] },
    { id: "P3", label: "Sam generated the option, after the cause surfaced", anchors: ["Marcus supplied the plan, or options never came up", "Asked for options before the cause surfaced, so Sam's idea targets the wrong thing", "Asked for options after the cause surfaced, and Sam proposed the fix"] },
    { id: "P4", label: "Agreed on a specific next step and check-in", anchors: ["Never asked for a next step, and none was proposed", "Asked, but Sam never proposed a specific step and time, or Sam proposed one and it was never confirmed", "Sam proposed a specific step and time, and Marcus confirmed it on a later turn"] },
  ],
  evaluate: makeLabelsEvaluate({ name: "Sam", cause: "the shared tray", surface: "rushing" }),
  framework: GROW,
};

import type { ConvoScenario, ConvoTurn } from "./types";
import { confirmedQ, cr, idx, investigative, planTrace, proposedQ, q, supportAt, validOpenIdx } from "./eval";
import { GROW } from "./labels";

// Priya Nair: conceptual gap. She doesn't believe she can ask without already
// knowing the answer. Her failure modes are built into the release rules:
// never naming the concern, softening until nothing is said, and answering
// her own questions. Fact packet and dialogue are original and untested.

const at = (turns: ConvoTurn[], fact: string) => turns.findIndex((t) => t.released.includes(fact));

export function makePickupEvaluate(o: { name: string; keyId: string; stepId: string; keyText: string; stepText: string; stepNext: string; vantage: string }) {
  return function evaluate(turns: ConvoTurn[], released: string[]) {
  const named = idx(turns, "namesConcern");
  const soft = named >= 0 && turns[named].tags.includes("overSoften");
  const allOpens = validOpenIdx(turns).length;
  // Only questions about the problem count. General or planning questions don't.
  const opens = turns.map((t, i) => (investigative(t) ? i : -1)).filter((i) => i >= 0);
  const selfAnswers = turns.filter((t) => t.tags.includes("selfAnswer")).length;
  const ask = idx(turns, "askOptions");
  const way = Math.max(idx(turns, "wayForward"), idx(turns, "checkin"));

  const Q1 = "Raised the concern plainly";
  const q1 =
    named === -1
      ? cr("Q1", Q1, "not_observed", "n/a", `You never said why you asked ${o.name} to talk.`, "Open with what you saw, in one or two sentences, then ask.")
      : named <= 1 && !soft
        ? cr("Q1", Q1, "demonstrated", supportAt(turns, named), q(turns[named]), "Keep naming what you saw, plainly and once.")
        : cr("Q1", Q1, "partial", supportAt(turns, named), `${soft ? "You named it, wrapped in apology." : "You named it, but not until turn " + (named + 1) + "."} ${q(turns[named])}`, "Say what you saw early, without apologizing for asking.");

  const Q2 = `Asked open questions about the problem and left them for ${o.name} to answer`;
  const q2 =
    opens.length >= 2
      ? cr("Q2", Q2, "demonstrated", supportAt(turns, opens[1]), `${opens.length} open questions about the problem left for ${o.name} to answer (${allOpens} open questions in total).${selfAnswers ? ` ${selfAnswers} other question(s) you answered yourself.` : ""} ${q(turns[opens[1]])}`, "Keep asking, then waiting.")
      : opens.length === 1
        ? cr("Q2", Q2, "partial", supportAt(turns, opens[0]), `One open question about the problem left for ${o.name} (${allOpens} open questions in total).${selfAnswers ? ` ${selfAnswers} question(s) you answered yourself.` : ""} ${q(turns[opens[0]])}`, "Ask a second open question. You don't need to know the answer first.")
        : cr("Q2", Q2, "not_observed", "n/a", selfAnswers ? `${selfAnswers} question(s), but you supplied the answer each time.` : "No open questions.", "Ask \"What's been happening at pickup?\" and stop talking.");

  const Q3 = "Surfaced what observation couldn't show";
  const key = at(turns, o.keyId);
  const q3 =
    key >= 0
      ? cr("Q3", Q3, "demonstrated", supportAt(turns, key), `${o.name} told you about ${o.keyText}. ${q(turns[key])}`, `Use this in your reflection. You couldn't have seen it ${o.vantage}.`)
      : released.includes(o.stepId)
        ? cr("Q3", Q3, "partial", supportAt(turns, at(turns, o.stepId)), `You learned ${o.stepText}, but not why.`, `${o.stepNext}`)
        : cr("Q3", Q3, "not_observed", "n/a", "Nothing came up beyond what you could see at the counter.", "Name what you saw, then ask what's been going on.");

  const Q4 = `Built the way forward with ${o.name}`;
  const plan = planTrace(turns);
  const ideaAt = turns.findIndex((t) => t.released.includes("idea"));
  const q4 =
    plan.kind === "commit" && plan.confirmAt >= 0
      ? cr("Q4", Q4, "demonstrated", supportAt(turns, plan.confirmAt), `${q(turns[ideaAt])} ${proposedQ(o.name, turns[plan.proposeAt])} ${confirmedQ(turns[plan.confirmAt])}`, `Keep asking for ${o.name}'s ideas and closing with a date.`)
      : plan.kind === "commitManager" && plan.confirmAt >= 0
        ? cr("Q4", Q4, "not_observed", "n/a", `You supplied the plan, and ${o.name} went along with it. ${confirmedQ(turns[plan.confirmAt])}`, `Ask what ${o.name} thinks would help before offering your own plan.`)
        : plan.proposeAt >= 0 || ask >= 0 || way >= 0
          ? cr("Q4", Q4, "partial", supportAt(turns, Math.max(plan.proposeAt, ask, way)), plan.proposeAt >= 0 && plan.confirmAt < 0 ? `${proposedQ(o.name, turns[plan.proposeAt])} You never confirmed it, so nothing was agreed.` : ask >= 0 && ideaAt < 0 ? `You asked for ideas before the cause came up. ${q(turns[ask])}` : ask >= 0 ? `You asked for ${o.name}'s ideas but didn't agree on a step and a time. ${q(turns[ask])}` : `You asked for a next step, but no plan was proposed. ${q(turns[way])}`, `Ask what ${o.name} thinks would help, then confirm a first step and a check-in.`)
          : cr("Q4", Q4, "not_observed", "n/a", "No plan came out of the conversation.", `Ask what ${o.name} thinks would help.`);

  return [q1, q2, q3, q4];
}
}

export const pickup: ConvoScenario = {
  id: "pickup",
  format: "conversation",
  caseGroup: "priya",
  caseLabel: "Case A",
  title: "The Pickup Counter",
  domain: "Healthcare · pharmacy leadership coaching",
  tagline: "You're Priya, a new manager. A technician has been rushing customers. Find out why before you decide what it means.",
  who: "dev",
  persona: {
    id: "priya",
    name: "Priya Nair",
    summary: "Reluctant first-time manager. Doesn't believe she has permission to ask without knowing the answer first.",
    gap: "Conceptual. She hasn't built the mental model that asking is the work.",
    objective:
      "After completing the module, explain in a written reflection why asking an open GROW question, rather than telling the employee what to do, surfaces information that observation alone cannot provide, using at least one specific example from her own team.",
    support: "proactive",
  },
  counterpart: {
    name: "Dev",
    role: "Pharmacy technician at Gilbert's, three years on the team, usually one of the most careful",
    goal: "Understand why the manager wants to talk, and get back before the afternoon gets busy.",
    voice: "Polite and a little tired. Answers exactly what's asked. Doesn't complain unless invited.",
    boundaries: ["Never mentions drugs, doses or patients.", "Agrees with any answer the manager supplies instead of correcting it.", "Doesn't explain until the manager says why they're talking."],
  },
  intake: {
    duration: "10 to 15 minutes, up to 12 turns. One idea: asking finds what watching can't.",
    situation: "A customer complained that a technician was curt and rushed them at pickup. What a manager sees points one way. The reason only comes out if she asks.",
    experience: "A first-time manager who knows the work but feels she has to have the answer before she speaks. She needs to experience a question doing the work.",
  },
  objective:
    "Given an observed change in a technician's behavior, raise the concern plainly, ask at least two open questions she leaves for the technician to answer, and surface a cause she couldn't have seen. Then explain in writing why asking found it.",
  transferEvidence:
    "The written reflection, reviewed by a human, and in her next real conversation about an observed behavior, an observer notes whether she names the concern and asks before explaining.",
  insufficientEvidence: "A pleasant conversation, an apology from the technician, or a reflection that restates the GROW steps without an example.",
  prebrief: [
    "This is a fictional coaching conversation at a fictional pharmacy. Dev is not a real person.",
    "There are no scripted choices. Type or say what you would actually say. You don't need to know the answer before you ask.",
    "It is not clinical decision support. It won't answer medication, dosing or patient-care questions.",
    "Do not enter real employee, patient or customer information.",
    "You have about 12 turns. Nothing is timed. Support appears after moves that don't help, and it's recorded. You can pause or end at any point.",
  ],
  setting:
    "Tuesday, 1:30 p.m. Yesterday a customer complained that Dev was curt and rushed them at pickup. You've also seen Dev cut two customers off this week. Dev has been on the team three years and is usually one of your most careful techs. You asked Dev to step into the consult room.",
  opener: "Hey. Is everything okay? You said you wanted to talk.",
  guardStart: 1,
  guardTone: [
    "Open. Explains readily once asked.",
    "Polite and unsure why they're here. Answers only what's asked.",
    "Defensive. Feels judged.",
    "Shut down. Agrees to whatever ends the conversation.",
  ],
  guardLines: [
    "Sure. What else?",
    "Okay... I'm not sure what you're asking.",
    "I've been doing my job the same way I always have.",
    "Fine. I'll be nicer to people.",
  ],
  facts: [
    {
      id: "busier",
      probe: "asks what has been happening at pickup, with customers, or with Dev's workload lately",
      label: "Pickup has been busier in the late afternoon",
      text: "Pickup has felt much busier for the last few weeks, especially in the late afternoon.",
      says: "It's been a lot busier at pickup lately. Especially late afternoon.",
      keywords: ["busier", "late afternoon"],
      release: { anyOf: ["open"], needsConcern: true, maxGuard: 2 },
      hint: "You know it's busier. Ask what's different about how the afternoon runs now.",
    },
    {
      id: "drive",
      probe: "asks what has changed about how the afternoon or shift runs, Dev's duties, coverage or schedule",
      label: "Since a schedule change, Dev covers drive-through and pickup at once from 4 to 6",
      text: "Since the schedule changed three weeks ago, Dev covers the drive-through window and the pickup counter at the same time from 4 to 6 p.m. When the drive-through bell rings, Dev has to wrap up whoever is at the counter.",
      says: "Since the schedule changed three weeks ago, I cover the drive-through and pickup at the same time, four to six. When the bell goes, I have to wrap up whoever's in front of me.",
      keywords: ["drive", "bell", "schedule changed", "four to six"],
      release: { anyOf: ["open"], requires: ["busier"], minValidOpens: 2, maxGuard: 1 },
      key: true,
      cue: "drive",
      hint: "You know pickup is busier. Ask what's changed about how the afternoon works for Dev.",
    },
    {
      id: "idea",
      label: "Dev's idea: the cashier takes the drive-through from 4 to 6 when the register is slow",
      text: "Dev's idea: when the register is slow, the cashier takes the drive-through from 4 to 6, so Dev can give pickup customers full attention.",
      says: "If the cashier could take the drive-through from four to six when the register's slow, I could give people at pickup my full attention.",
      keywords: ["cashier"],
      release: { anyOf: ["askOptions", "wayForward"], requires: ["drive"], maxGuard: 2 },
      idea: true,
      cue: "drive",
      hint: "Ask Dev what would help. You don't need a solution ready.",
    },
    {
      id: "surfaceIdea",
      optional: true,
      label: "Dev's surface idea: be friendlier",
      text: "Without the real cause on the table, Dev's only idea is to try to be friendlier.",
      says: "I guess I could try to be friendlier?",
      keywords: ["friendlier"],
      release: { anyOf: ["askOptions", "wayForward"], unless: ["idea"], maxGuard: 2 },
      idea: true,
      hint: "Ask for Dev's ideas.",
    },
    {
      id: "district",
      probe: "asks why Dev hadn't raised it, or who set the schedule",
      optional: true,
      label: "Dev assumed the schedule couldn't change",
      text: "The schedule came from the district office, so Dev assumed it wasn't up for discussion and never raised it.",
      says: "The schedule came from district, so I figured it wasn't up for discussion.",
      keywords: ["district"],
      release: { anyOf: ["open", "acknowledge"], requires: ["drive"], maxGuard: 1 },
      cue: "schedule",
      hint: "Optional: ask why Dev hadn't mentioned it.",
    },
    {
      id: "commit",
      label: "Dev proposes a first step and a check-in built on Dev's own idea",
      text: "Dev will ask the cashier about covering the drive-through from four to six today and suggests checking in Friday.",
      says: "I'll ask the cashier about covering four to six today. Can we check how it's going Friday?",
      keywords: [],
      release: { anyOf: ["wayForward", "checkin"], requires: ["idea"], maxGuard: 2 },
      commitment: "own",
      hint: "Ask what Dev will do first and when you'll check in.",
    },
    {
      id: "commitSurface",
      optional: true,
      label: "Dev proposes a step built on the surface idea",
      text: "Dev commits to the surface idea with a specific time.",
      says: "Okay. I'll try to be friendlier, starting today. Check in Friday?",
      keywords: [],
      release: { anyOf: ["wayForward", "checkin"], requires: ["surfaceIdea"], maxGuard: 2 },
      commitment: "surface",
      hint: "Ask for a first step and a check-in.",
    },
    {
      id: "commitManager",
      optional: true,
      label: "Dev accepts the plan you supplied",
      text: "Dev agrees to do what the manager said, with a check-in.",
      says: "Okay. I'll do it the way you said. Check in Friday?",
      keywords: [],
      release: { anyOf: ["wayForward", "checkin"], needsInstruction: true, maxGuard: 2 },
      commitment: "manager",
      hint: "Ask for a first step and a check-in.",
    },
  ],
  maxTurns: 12,
  endings: {
    plan_key: { id: "plan_key", title: "Plan agreed, cause found", text: "Dev heads back with a plan for the four-to-six block. What you saw at the counter had a cause you couldn't see from there." },
    plan_surface: { id: "plan_surface", title: "Plan agreed, cause missed", text: "You and Dev agreed on a plan, but it isn't built on the cause. Either the drive-through coverage never came up, or the plan came from you instead of Dev. The rushing will likely continue." },
    unconfirmed: { id: "unconfirmed", title: "Plan proposed, not confirmed", text: "Dev proposed a step and a time, but the conversation ended before you confirmed it. Dev heads back unsure whether anything will change.", textWithCause: "You found the cause: Dev covers the drive-through and pickup at once from four to six, and Dev proposed a step and a time. You never confirmed it, so Dev doesn't know whether the plan is on." },
    closed: { id: "closed", title: "Ended without a plan", text: "Dev goes back to the counter, unsure what the conversation was about.", textWithCause: "You found the cause: Dev covers the drive-through and pickup at once from four to six. The conversation ended before Dev proposed a fix and you agreed on it, so nothing changes yet." },
    time: { id: "time", title: "Out of time", text: "The afternoon picks up and Dev has to go. The conversation stopped before a plan.", textWithCause: "You found the cause: Dev covers the drive-through and pickup at once from four to six. The afternoon pulled Dev away before you agreed on a next step." },
  },
  criteria: [
    { id: "Q1", label: "Raised the concern plainly", anchors: ["Never said why the conversation was happening", "Named the concern late, or buried it in apology", "Named what was observed plainly within the first two turns"] },
    { id: "Q2", label: "Asked open questions about the problem and left them for Dev to answer", anchors: ["No open question about the problem, or every question was leading or self-answered", "One open question about the problem left for Dev to answer", "Two or more open questions about the problem left for Dev to answer"] },
    { id: "Q3", label: "Surfaced what observation couldn't show", anchors: ["Nothing beyond what was visible at the counter", "Learned pickup was busier, but not why", "Learned about the drive-through coverage"] },
    { id: "Q4", label: "Built the way forward with Dev", anchors: ["No plan, or Priya supplied the plan and Dev went along", "Asked for ideas or a next step, but no plan built on Dev's own idea was proposed and confirmed", "Dev proposed a step built on Dev's own idea, and Priya confirmed it on a later turn"] },
  ],
  evaluate: makePickupEvaluate({ name: "Dev", keyId: "drive", stepId: "busier", keyText: "covering the drive-through", stepText: "pickup is busier", stepNext: "Ask what's different about how the afternoon runs now.", vantage: "from the counter" }),
  framework: GROW,
  reflection:
    "What did Dev tell you that you couldn't have seen from the counter? Explain why asking surfaced it when watching didn't. Then give one example from your own team. Describe the situation, not the person. Leave out names.",
};

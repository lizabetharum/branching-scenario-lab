import { z } from "zod";
import type { Behavior, ConvoScenario, ConvoTurn, Fact } from "./types";
import { labels, makeLabelsEvaluate, GROW } from "./labels";
import { endingFor, endingText, replay, step } from "./engine";
import { TIME_WORDS, detectClinical, detectPersonalInfo } from "../guardrails";

// Authoring kit. A subject-matter expert fills in one template: the people, the
// setting and five things the character knows. The kit builds the full fact
// packet (topics, proposals, endings, scoring) using the "investigate before
// interpreting" pattern from The Label Conversation, validates it, and runs the
// same rule checks the build runs.

const line = (max: number) => z.string().trim().min(1, "Required").max(max, `Keep it under ${max} characters`);
const topic = z.string().trim().min(8, "Describe what a relevant question asks about").max(240);

export const PacketSchema = z.object({
  version: z.literal(1),
  title: line(60),
  learner: z.object({ name: line(40), role: line(80), gap: line(160) }),
  counterpart: z.object({ name: line(30), role: line(120), voice: line(160), goal: line(160) }),
  setting: line(420),
  opener: line(200),
  visible: z.object({ label: line(120), says: line(300), topic }),
  cause: z.object({ label: line(120), says: line(300), topic, short: line(80) }),
  ownIdea: z.object({ label: line(120), says: line(300) }),
  surfaceIdea: z.object({ says: line(200), short: line(40) }),
  proposal: z.object({ says: line(240) }),
  context: z.object({ label: line(120), says: line(300), topic }).optional(),
});
export type AuthoredPacket = z.infer<typeof PacketSchema>;

export const EXAMPLE_PACKET: AuthoredPacket = {
  version: 1,
  title: "The Missed Callbacks",
  learner: { name: "Jamie Ortiz", role: "Front-desk supervisor at a community clinic", gap: "Jumps to a verdict when a pattern shows up in the numbers." },
  counterpart: { name: "Rosa", role: "Scheduling coordinator at the clinic's front desk, five years on the team", voice: "Calm and precise. A little defensive about her work. Short answers until she trusts the question.", goal: "Explain herself and get back to the phones." },
  setting: "Tuesday, 11:30 a.m. Eight callers this month said nobody returned their message within a day. Most of the messages came in on Mondays. You asked Rosa to step into the break room for ten minutes.",
  opener: "Is this about the callbacks? I know some slipped. I'll try to be faster.",
  visible: { label: "Missed callbacks come from Monday voicemails", says: "Most of them are Monday. The weekend voicemails pile up, and I work through them as fast as I can between calls.", topic: "asks what happens with the messages, when callbacks get missed, or what Rosa's Mondays are like" },
  cause: { label: "Voicemail transcripts go to a shared inbox that archives after 24 hours", says: "Honestly? The voicemails get transcribed into the shared inbox, and it archives anything older than a day. By the time I get to some of them, they're gone from the list.", topic: "asks how Rosa finds or tracks the messages, where they go, or what the inbox or system does with them", short: "an inbox that archives messages after a day" },
  ownIdea: { label: "Rosa's idea: route voicemails into the scheduling queue", says: "What if the voicemails went into the scheduling queue instead of the inbox? The queue doesn't archive anything." },
  surfaceIdea: { says: "I guess I could just check the inbox more often?", short: "checking more often" },
  proposal: { says: "I'll ask IT tomorrow to route the voicemails into the queue. Can we look at callback times together on Friday?" },
  context: { label: "Nobody told the front desk the inbox archives", says: "Nobody ever told us it archives. I only figured it out last month.", topic: "asks when Rosa noticed, or whether anyone knew about the inbox setting" },
};

const says = (f: string) => f;

/** Build a full conversation scenario from an authored packet. */
export function buildScenario(p: AuthoredPacket): ConvoScenario {
  const n = p.counterpart.name;
  const facts: Fact[] = [
    { id: "pattern", label: p.visible.label, text: p.visible.says, says: says(p.visible.says), keywords: [], probe: p.visible.topic, release: { anyOf: ["open"], minValidOpens: 1, maxGuard: 2 }, hint: `You don't know why it happens yet. Ask something ${n} has to describe, without suggesting a cause.` },
    { id: "cause", label: p.cause.label, text: p.cause.says, says: p.cause.says, keywords: [], probe: p.cause.topic, release: { anyOf: ["open"], requires: ["pattern"], minValidOpens: 2, maxGuard: 1 }, key: true, hint: `You know when it happens. Build on what ${n} just told you.` },
    { id: "idea", label: p.ownIdea.label, text: p.ownIdea.says, says: p.ownIdea.says, keywords: [], release: { anyOf: ["askOptions", "wayForward"], requires: ["cause"], maxGuard: 2 }, idea: true, hint: `${n} knows the work better than you. Ask for ${n}'s ideas before offering yours.` },
    { id: "surfaceIdea", optional: true, label: `${n}'s surface idea: ${p.surfaceIdea.short}`, text: p.surfaceIdea.says, says: p.surfaceIdea.says, keywords: [], release: { anyOf: ["askOptions", "wayForward"], unless: ["idea"], maxGuard: 2 }, idea: true, hint: `Ask for ${n}'s ideas.` },
    ...(p.context ? [{ id: "context", optional: true, label: p.context.label, text: p.context.says, says: p.context.says, keywords: [], probe: p.context.topic, release: { anyOf: ["open", "acknowledge"] as Behavior[], requires: ["cause"], maxGuard: 1 }, hint: "Optional: ask how this came about." } satisfies Fact] : []),
    { id: "commit", label: `${n} proposes a first step and a check-in built on ${n}'s own idea`, text: p.proposal.says, says: p.proposal.says, keywords: [], release: { anyOf: ["wayForward", "checkin"], requires: ["idea"], maxGuard: 2 }, commitment: "own", hint: `Ask what ${n} will do first and when you'll check in.` },
    { id: "commitSurface", optional: true, label: `${n} proposes a step built on the surface idea`, text: `${n} commits to ${p.surfaceIdea.short}, with a check-in.`, says: `Okay. I'll start ${p.surfaceIdea.short}. We can check in next week.`, keywords: [], release: { anyOf: ["wayForward", "checkin"], requires: ["surfaceIdea"], maxGuard: 2 }, commitment: "surface", hint: "Ask for a first step and a check-in." },
    { id: "commitManager", optional: true, label: `${n} accepts the plan you supplied`, text: `${n} agrees to do what the manager said, with a check-in.`, says: "Okay. I'll do it the way you said. We can check in next week.", keywords: [], release: { anyOf: ["wayForward", "checkin"], needsInstruction: true, maxGuard: 2 }, commitment: "manager", hint: "Ask for a first step and a check-in." },
  ];
  const rename = (s: string) => s.replaceAll("Sam", n).replaceAll("Marcus", p.learner.name.split(" ")[0]);
  const cause = p.cause.short;
  return {
    ...labels,
    id: "custom",
    caseGroup: "custom",
    caseLabel: "Draft",
    title: p.title,
    domain: "Your scenario · draft",
    tagline: `You're ${p.learner.name}. Find out what's behind the pattern before you decide what it means.`,
    who: "sam",
    persona: {
      id: "author",
      name: p.learner.name,
      summary: p.learner.role,
      gap: p.learner.gap,
      objective: "Given a performance pattern, ask at least two open questions about the problem before interpreting, build on what the person reveals, and close with a plan they proposed and you confirmed.",
      support: "on_request",
    },
    counterpart: { name: n, role: p.counterpart.role, goal: p.counterpart.goal, voice: p.counterpart.voice, boundaries: ["Doesn't volunteer facts that weren't asked for.", "Doesn't open up because the manager sounds friendly.", "Never gives medical, legal or financial information."] },
    intake: { duration: "10 to 15 minutes, up to 12 turns.", situation: p.setting, experience: p.learner.gap },
    objective: "Ask at least two open questions about the problem before interpreting, build on what the person reveals, and close with a plan they proposed and you confirmed.",
    transferEvidence: "In the next real conversation about a pattern, a colleague uses the observation checklist for the same four behaviors.",
    insufficientEvidence: "Reaching a plan, or reporting more confidence, without the questioning behavior.",
    prebrief: [
      `This is a draft scenario you wrote. ${n} is fictional.`,
      "Type or say what you would actually say. The character only reveals what your questions earn.",
      "Do not enter real people's information.",
    ],
    setting: p.setting,
    opener: p.opener,
    guardStart: 2,
    guardLines: ["Sure. What else?", "I don't know. It just happens.", "I said I'd try harder.", "Okay. I'll be more careful."],
    facts,
    endings: {
      plan_key: { id: "plan_key", title: "Plan agreed, cause found", text: `${n} heads back with a plan aimed at the cause. Check the criteria below. Reaching a plan doesn't mean every criterion was met.` },
      plan_surface: { id: "plan_surface", title: "Plan agreed, cause missed", text: `You and ${n} agreed on a plan, but it isn't built on the cause. Either the cause never came up, or the plan came from you instead of ${n}.` },
      unconfirmed: { id: "unconfirmed", title: "Plan proposed, not confirmed", text: `${n} proposed a step and a time, but the conversation ended before you confirmed it.`, textWithCause: `You found the cause: ${cause}, and ${n} proposed a step and a time. You never confirmed it.` },
      closed: { id: "closed", title: "Ended without a plan", text: `${n} goes back to work. Nothing in the conversation targets why it happens.`, textWithCause: `You found the cause: ${cause}. The conversation ended before ${n} proposed a fix and you agreed on it.` },
      time: { id: "time", title: "Out of time", text: `${n} has to go. The conversation stopped before a plan.`, textWithCause: `You found the cause: ${cause}. Time ran out before you agreed on a next step.` },
    },
    criteria: labels.criteria.map((c) => ({ ...c, label: rename(c.label), anchors: c.anchors.map(rename) as [string, string, string] })),
    evaluate: makeLabelsEvaluate({ name: n, cause, surface: p.surfaceIdea.short }),
    framework: GROW,
    reflection: undefined,
  };
}

/** Content problems a subject-matter expert should fix before playtesting. */
export function validatePacket(raw: unknown): { packet?: AuthoredPacket; errors: string[]; warnings: string[] } {
  const r = PacketSchema.safeParse(raw);
  if (!r.success) return { errors: r.error.issues.map((i) => `${i.path.join(" › ")}: ${i.message}`), warnings: [] };
  const p = r.data;
  const errors: string[] = [];
  const warnings: string[] = [];
  const all = [p.setting, p.opener, p.visible.says, p.cause.says, p.ownIdea.says, p.surfaceIdea.says, p.proposal.says, p.context?.says ?? ""];
  if (all.some((t) => detectPersonalInfo(t))) errors.push("Some text looks like real personal information (an email, phone number, date of birth or record number). Use fictional details.");
  if (all.some((t) => detectClinical(t))) errors.push("Some text mentions doses or medications. Clinical content needs clinician review, so this kit doesn't accept it.");
  if (!TIME_WORDS.test(p.proposal.says)) errors.push("The proposal needs a time or day (for example \"tomorrow\" or \"on Friday\"). Agreement means a specific step and a time.");
  if (TIME_WORDS.test(p.ownIdea.says)) warnings.push("The idea mentions a time. Save timing for the proposal, so asking for ideas and agreeing on a plan stay separate.");
  const causeWords = p.cause.says.toLowerCase().split(/\W+/).filter((w) => w.length > 5);
  if (causeWords.some((w) => p.setting.toLowerCase().includes(w) || p.opener.toLowerCase().includes(w))) warnings.push("The setting or opener may give away the hidden cause. The cause should only surface through questions.");
  if (p.visible.topic.trim() === p.cause.topic.trim()) errors.push("The visible fact and the cause need different topics, or one question could reveal both.");
  return { packet: p, errors, warnings };
}

type Step = { tags: Behavior[]; addr: string[] };
function play(s: ConvoScenario, steps: Step[], forceEnd = false) {
  const turns: ConvoTurn[] = [];
  let ending: string | null = null;
  for (const x of steps) {
    const st = replay(s, turns);
    const { guard, fact } = step(s, st, x.tags, x.addr);
    const released = fact ? [...st.released, fact.id] : st.released;
    turns.push({ learner: `[${x.tags.join("+")}]`, reply: fact ? fact.says : "(no new fact)", tags: x.tags, addresses: x.addr, released: fact ? [fact.id] : [], hintBefore: false, guardAfter: guard });
    ending = endingFor(s, st.released, released, x.tags, turns.length, false);
    if (ending) break;
  }
  const st = replay(s, turns);
  if (!ending && forceEnd) ending = endingFor(s, st.released, st.released, [], st.turns, true);
  const results = s.evaluate(turns, st.released);
  return { released: st.released, ending, results, text: ending ? endingText(s, ending as never, st.released) : "" };
}

/** The same rule checks the build runs, applied to an authored scenario. */
export function runAuthoringChecks(s: ConvoScenario): { name: string; pass: boolean }[] {
  const S = (tags: Behavior[], addr: string[] = []): Step => ({ tags, addr });
  const status = (r: ReturnType<typeof play>, id: string) => r.results.find((c) => c.id === id)?.status;
  const ideal = play(s, [S(["open"], ["pattern"]), S(["open"], ["cause"]), S(["askOptions"]), S(["wayForward", "checkin"]), S(["confirms"])]);
  const checks: [string, boolean][] = [
    ["A strong conversation reaches \"plan agreed, cause found\" with every criterion demonstrated", ideal.ending === "plan_key" && ideal.results.every((c) => c.status === "demonstrated")],
    ["A planning question never reveals the cause", !play(s, [S(["open"], ["pattern"]), S(["open", "wayForward", "checkin"], ["cause"])]).released.includes("cause")],
    ["A general question never reveals the cause", !play(s, [S(["open"], ["pattern"]), S(["open"], [])]).released.includes("cause")],
    ["A leading guess never reveals the cause", !play(s, [S(["open"], ["pattern"]), S(["leading", "closed"], ["cause"])]).released.includes("cause")],
    ["Telling first shuts the character down", play(s, [S(["interpretation", "instruction"]), S(["leading"])]).released.length === 0],
    ["Asking for ideas too early gets the surface idea, not the real one", (() => { const r = play(s, [S(["open"], ["pattern"]), S(["askOptions"])]); return r.released.includes("surfaceIdea") && !r.released.includes("idea"); })()],
    ["Asking for a plan is not agreement", (() => { const r = play(s, [S(["open"], ["pattern"]), S(["open"], ["cause"]), S(["askOptions"]), S(["wayForward", "checkin"])]); return r.ending === null && status(r, "P4") === "partial"; })()],
    ["Leaving after a proposal ends \"not confirmed\" and says the cause was found", (() => { const r = play(s, [S(["open"], ["pattern"]), S(["open"], ["cause"]), S(["askOptions"]), S(["wayForward", "checkin"])], true); return r.ending === "unconfirmed" && r.text.startsWith("You found the cause"); })()],
    ["A plan the learner imposes ends \"plan agreed, cause missed\"", play(s, [S(["open"], ["pattern"]), S(["open"], ["cause"]), S(["instruction"]), S(["checkin"]), S(["confirms"])]).ending === "plan_surface"],
    ["Every demonstrated rating quotes a completed behavior", ideal.results.every((c) => c.status !== "demonstrated" || /You said: "|You confirmed: "/.test(c.evidence))],
  ];
  return checks.map(([name, pass]) => ({ name, pass }));
}

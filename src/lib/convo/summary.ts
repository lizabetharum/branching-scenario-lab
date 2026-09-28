import type { ConvoScenario, ConvoTurn } from "./types";
import { planTrace } from "./eval";

/**
 * A plain summary built only from the transcript: what the learner uncovered,
 * and what the conversation still lacked. Used at the top of the debrief so the
 * feedback starts from what actually happened.
 */
export function attemptSummary(s: ConvoScenario, turns: ConvoTurn[]) {
  const released = turns.flatMap((t) => t.released);
  const name = s.counterpart.name;
  const key = s.facts.find((f) => f.key);
  const found = s.facts.filter((f) => released.includes(f.id) && !f.commitment && !f.optional && !f.idea);
  const plan = planTrace(turns);
  const ownIdea = released.includes("idea");
  const missing: string[] = [];
  if (key && !released.includes(key.id)) missing.push(`The cause. ${name} knew something you couldn't see, and no question reached it.`);
  if (key && released.includes(key.id) && !ownIdea) missing.push(`${name}'s own idea for fixing it.`);
  const surfaceOffered = released.includes("surfaceIdea") && !ownIdea;
  if (plan.proposeAt < 0 && surfaceOffered) missing.push(`A plan that addresses the cause. ${name}'s suggestion targets the surface problem, and no specific step and time was confirmed.`);
  else if (plan.proposeAt < 0) missing.push(`A specific next step and check-in proposed by ${name}.`);
  else if (plan.confirmAt < 0) missing.push(`Your confirmation of the step ${name} proposed.`);
  else if (plan.kind === "commitManager") missing.push(`A plan from ${name}. The one agreed came from you.`);
  // One concrete commitment for the next real conversation, from the first thing missing.
  const commitment =
    key && !released.includes(key.id)
      ? `Ask two open questions about what's actually happening, and build on the answer, before I say what I think the cause is.`
      : !ownIdea
        ? `Once the cause is clear, ask what they think would help before I offer my own fix.`
        : plan.confirmAt < 0
          ? `End with a specific first step and a check-in date, and say it back to confirm we agree.`
          : `Keep asking before interpreting, and end every coaching conversation with a confirmed step and date.`;
  return {
    found: found.map((f) => ({ label: f.label, key: Boolean(f.key) })),
    missing,
    commitment,
  };
}

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
  if (plan.proposeAt < 0) missing.push(`A specific next step and check-in proposed by ${name}.`);
  else if (plan.confirmAt < 0) missing.push(`Your confirmation of the step ${name} proposed.`);
  else if (plan.kind === "commitManager") missing.push(`A plan from ${name}. The one agreed came from you.`);
  return {
    found: found.map((f) => ({ label: f.label, key: Boolean(f.key) })),
    missing,
  };
}

import type { Behavior, ConvoEnding, ConvoScenario, ConvoTurn, Fact } from "./types";

// The deterministic half of a fact-packet scenario. Given the AI's labels for
// each turn, it decides guard level, which facts are released and whether the
// conversation has ended. The model doesn't make these decisions, but its
// labels are the input, so a wrong label produces a wrong outcome.

const RAISES_GUARD: Behavior[] = ["leading", "interpretation", "instruction"];
export const PLANNING: Behavior[] = ["wayForward", "checkin", "askOptions"];
const LOWERS_GUARD: Behavior[] = ["acknowledge"];

/** An open question only counts if it isn't leading or answered by the asker. */
export function effectiveTags(tags: Behavior[]): Behavior[] {
  if (tags.includes("selfAnswer") || tags.includes("leading")) return tags.filter((t) => t !== "open");
  return tags;
}

export function isValidOpen(tags: Behavior[]) {
  return effectiveTags(tags).includes("open");
}

export function nextGuard(prev: number, tags: Behavior[]) {
  let g = prev;
  if (tags.some((t) => RAISES_GUARD.includes(t))) g += 1;
  if (tags.some((t) => LOWERS_GUARD.includes(t)) || isValidOpen(tags)) g -= 1;
  return Math.max(0, Math.min(3, g));
}

export interface ConvoState {
  guard: number;
  released: string[];
  validOpens: number;
  concernNamed: boolean;
  turns: number;
  seen: Set<Behavior>;
}

export function replay(s: ConvoScenario, turns: ConvoTurn[]): ConvoState {
  const st: ConvoState = { guard: s.guardStart, released: [], validOpens: 0, concernNamed: false, turns: 0, seen: new Set() };
  for (const t of turns) {
    st.guard = t.guardAfter;
    st.released.push(...t.released);
    if (isValidOpen(t.tags)) st.validOpens += 1;
    if (t.tags.includes("namesConcern")) st.concernNamed = true;
    t.tags.forEach((x) => st.seen.add(x));
    st.turns += 1;
  }
  return st;
}

const commitmentReleased = (s: ConvoScenario, released: string[]) =>
  s.facts.find((f) => f.commitment && released.includes(f.id));

/**
 * Apply one newly labeled turn. Returns the new guard and at most one released fact.
 * `addresses` lists the fact probes the learner's message is relevant to.
 */
export function step(s: ConvoScenario, st: ConvoState, tags: Behavior[], addresses: string[]) {
  const eff = effectiveTags(tags);
  const guard = nextGuard(st.guard, tags);
  const validOpens = st.validOpens + (eff.includes("open") ? 1 : 0);
  const concernNamed = st.concernNamed || tags.includes("namesConcern");
  const instructed = st.seen.has("instruction") || tags.includes("instruction");
  const hasCommitment = Boolean(commitmentReleased(s, st.released));
  // Asking for a plan, a check-in or ideas is not investigation. Whatever topic
  // the AI assigns, these turns never reveal a hidden cause.
  const planning = PLANNING.some((t) => tags.includes(t));
  let fact: Fact | undefined;
  if (guard < 3) {
    fact = s.facts.find(
      (f) =>
        !st.released.includes(f.id) &&
        f.release.anyOf.some((b) => eff.includes(b)) &&
        (!f.probe || (addresses.includes(f.id) && !planning)) &&
        (f.release.requires ?? []).every((r) => st.released.includes(r)) &&
        validOpens >= (f.release.minValidOpens ?? 0) &&
        (!f.release.needsConcern || concernNamed) &&
        (!f.release.needsInstruction || instructed) &&
        !(f.release.unless ?? []).some((u) => st.released.includes(u)) &&
        !(f.commitment && hasCommitment) &&
        guard <= f.release.maxGuard,
    );
  }
  return { guard, fact };
}

/**
 * Did the conversation end on this turn?
 * A plan counts as agreed only when three things happened in order: the learner
 * asked, the counterpart proposed a specific step and time, and the learner
 * confirmed that proposal on a later turn.
 */
export function endingFor(
  s: ConvoScenario,
  releasedBefore: string[],
  releasedAfter: string[],
  tags: Behavior[],
  turnCount: number,
  forced: boolean,
): ConvoEnding["id"] | null {
  const proposed = commitmentReleased(s, releasedBefore);
  if (proposed && tags.includes("confirms")) {
    const key = s.facts.find((f) => f.key);
    const causeFound = Boolean(key && releasedBefore.includes(key.id));
    // A plan that came from the manager, or from the surface idea, never counts as finding the cause.
    return proposed.commitment === "own" && causeFound ? "plan_key" : "plan_surface";
  }
  if (forced || tags.includes("closes")) return commitmentReleased(s, releasedAfter) ? "unconfirmed" : "closed";
  if (turnCount >= s.maxTurns) return commitmentReleased(s, releasedAfter) ? "unconfirmed" : "time";
  return null;
}

export function hintFor(s: ConvoScenario, st: ConvoState): string {
  if (commitmentReleased(s, st.released)) return `${s.counterpart.name} proposed a step and a time. If it works for you, confirm it. If not, say what you'd change.`;
  const next = s.facts.find((f) => !f.optional && !st.released.includes(f.id));
  if (next?.release.needsConcern && !st.concernNamed) return `${s.counterpart.name} doesn't know why you asked to talk. Say what you saw, plainly and once, then ask.`;
  if (st.guard >= 3) return `${s.counterpart.name} has shut down. Acknowledge what happened, then ask a genuine open question.`;
  if (next) return next.hint;
  return "You know what's going on. Agree on a first step, who owns it and when you'll check in.";
}

export function moodFor(guard: number, lastReleased?: Fact): import("../types").Mood {
  if (lastReleased?.commitment) return "proud";
  if (lastReleased?.idea) return "proud";
  if (lastReleased?.key) return "thinking";
  return (["engaged", "neutral", "guarded", "guarded"] as const)[guard];
}

/** Ending text that reflects what happened: finding the cause changes what the ending says. */
export function endingText(s: ConvoScenario, id: ConvoEnding["id"], released: string[]): string {
  const e = s.endings[id];
  const key = s.facts.find((f) => f.key);
  return key && released.includes(key.id) && e.textWithCause ? e.textWithCause : e.text;
}

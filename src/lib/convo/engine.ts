import type { Behavior, ConvoEnding, ConvoScenario, ConvoTurn, Fact } from "./types";

// The deterministic half of a fact-packet scenario. Given the tagged turns so
// far, it decides guard level, which facts are released and whether the
// conversation has ended. The model never makes these decisions.

const RAISES_GUARD: Behavior[] = ["leading", "interpretation", "instruction"];
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

/** Apply one newly tagged turn. Returns the new guard and at most one released fact. */
export function step(s: ConvoScenario, st: ConvoState, tags: Behavior[]) {
  const eff = effectiveTags(tags);
  const guard = nextGuard(st.guard, tags);
  const validOpens = st.validOpens + (eff.includes("open") ? 1 : 0);
  const concernNamed = st.concernNamed || tags.includes("namesConcern");
  let fact: Fact | undefined;
  if (guard < 3) {
    fact = s.facts.find(
      (f) =>
        !st.released.includes(f.id) &&
        f.release.anyOf.some((b) => eff.includes(b)) &&
        (f.release.requires ?? []).every((r) => st.released.includes(r)) &&
        validOpens >= (f.release.minValidOpens ?? 0) &&
        (!f.release.needsConcern || concernNamed) &&
        guard <= f.release.maxGuard,
    );
  }
  return { guard, fact };
}

/** Did the conversation end on this turn? */
export function endingFor(s: ConvoScenario, released: string[], seenAfter: Set<Behavior>, tags: Behavior[], turnCount: number, forced: boolean): ConvoEnding["id"] | null {
  const hasOption = s.facts.some((f) => f.idea && released.includes(f.id)) || seenAfter.has("instruction");
  const key = s.facts.find((f) => f.key);
  const hasPlan = hasOption && (seenAfter.has("wayForward") || seenAfter.has("checkin"));
  const planMoment = hasOption && (tags.includes("wayForward") || tags.includes("checkin"));
  if (planMoment || ((forced || tags.includes("closes")) && hasPlan)) {
    return key && released.includes(key.id) ? "plan_key" : "plan_surface";
  }
  if (forced || tags.includes("closes")) return "closed";
  if (turnCount >= s.maxTurns) return "time";
  return null;
}

export function hintFor(s: ConvoScenario, st: ConvoState): string {
  const next = s.facts.find((f) => !f.optional && !st.released.includes(f.id));
  if (next?.release.needsConcern && !st.concernNamed) return `${s.counterpart.name} doesn't know why you asked to talk. Say what you saw, plainly and once, then ask.`;
  if (st.guard >= 3) return `${s.counterpart.name} has shut down. Acknowledge what happened, then ask a genuine open question.`;
  if (next) return next.hint;
  return "You know what's going on. Agree on a first step, who owns it and when you'll check in.";
}

export function moodFor(guard: number, lastReleased?: Fact): import("../types").Mood {
  if (lastReleased?.idea) return "proud";
  if (lastReleased?.key) return "thinking";
  return (["engaged", "neutral", "guarded", "guarded"] as const)[guard];
}

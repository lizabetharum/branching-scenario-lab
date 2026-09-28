import type { CriterionResult, CriterionStatus, Support } from "../types";
import type { Behavior, ConvoTurn } from "./types";
import { isValidOpen } from "./engine";

const RAISES: Behavior[] = ["leading", "interpretation", "instruction"];

export function supportAt(turns: ConvoTurn[], i: number): Support {
  if (i < 0) return "n/a";
  if (turns[i].hintBefore) return "with_hint";
  if (turns.slice(0, i).some((t) => t.tags.some((x) => RAISES.includes(x)))) return "after_recovery";
  return "independent";
}

export function q(t?: ConvoTurn) {
  if (!t) return "";
  const s = t.learner.length > 160 ? t.learner.slice(0, 157) + "..." : t.learner;
  return `You said: "${s}"`;
}

export const idx = (turns: ConvoTurn[], tag: Behavior) => turns.findIndex((t) => t.tags.includes(tag));
export const validOpenIdx = (turns: ConvoTurn[]) => turns.map((t, i) => (isValidOpen(t.tags) ? i : -1)).filter((i) => i >= 0);

export function cr(id: string, label: string, status: CriterionStatus, support: Support, evidence: string, nextStep: string): CriterionResult {
  return { id, label, status, support, via: status === "not_observed" ? "none" : "own_words", evidence, nextStep };
}

// Plan agreement is three observable events: the learner asks, the counterpart
// proposes a specific step and time, and the learner confirms on a later turn.
export const COMMIT_IDS = ["commit", "commitSurface", "commitManager"];

const trim = (s: string) => (s.length > 160 ? s.slice(0, 157) + "..." : s);
export const proposedQ = (name: string, t?: ConvoTurn) => (t ? `${name} proposed: "${trim(t.reply)}"` : "");
export const confirmedQ = (t?: ConvoTurn) => (t ? `You confirmed: "${trim(t.learner)}"` : "");

export function planTrace(turns: ConvoTurn[]) {
  const askAt = turns.findIndex((t) => t.tags.includes("wayForward") || t.tags.includes("checkin"));
  const proposeAt = turns.findIndex((t) => t.released.some((id) => COMMIT_IDS.includes(id)));
  const kind = proposeAt >= 0 ? turns[proposeAt].released.find((id) => COMMIT_IDS.includes(id)) : undefined;
  const confirmAt = proposeAt >= 0 ? turns.findIndex((t, i) => i > proposeAt && t.tags.includes("confirms")) : -1;
  return { askAt, proposeAt, kind, confirmAt };
}

// Investigation quality. An open question counts toward investigation only if it
// is about the problem: the AI marked it relevant to a topic, or it revealed a
// fact. Requests for plans, check-ins or ideas never count, and neither do
// general questions such as "What would make this useful for you?"
const NOT_INVESTIGATION = new Set(["idea", "surfaceIdea", ...COMMIT_IDS]);
const PLANNING_TAGS: Behavior[] = ["wayForward", "checkin", "askOptions"];

export function investigative(t: ConvoTurn): boolean {
  if (!isValidOpen(t.tags) || PLANNING_TAGS.some((p) => t.tags.includes(p))) return false;
  return (t.addresses?.length ?? 0) > 0 || t.released.some((id) => !NOT_INVESTIGATION.has(id));
}

/** A follow-up is an investigative question asked after something was revealed,
 *  about what was just revealed or the next thread it opened. */
export function isFollowUp(turns: ConvoTurn[], i: number): boolean {
  if (!investigative(turns[i])) return false;
  const revealed = turns.slice(0, i).flatMap((t) => t.released).filter((id) => !NOT_INVESTIGATION.has(id));
  if (revealed.length === 0) return false;
  const topics = turns[i].addresses ?? turns[i].released;
  const last = revealed[revealed.length - 1];
  return topics.includes(last) || topics.some((a) => !revealed.includes(a));
}

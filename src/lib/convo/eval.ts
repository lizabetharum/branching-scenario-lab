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

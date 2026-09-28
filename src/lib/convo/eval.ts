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

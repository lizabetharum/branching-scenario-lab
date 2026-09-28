import type { CriterionResult, CriterionStatus, MoveTag, Support, Turn } from "./types";

export function supportOf(t: Turn | undefined): Support {
  if (!t) return "n/a";
  if (t.hintBefore) return "with_hint";
  if (t.afterRecovery) return "after_recovery";
  return "independent";
}

export function firstWith(history: Turn[], tags: MoveTag[], tagIndex: Map<string, MoveTag[]>) {
  return history.find((t) => (tagIndex.get(t.moveId) ?? []).some((tag) => tags.includes(tag)));
}

export function quote(t: Turn | undefined) {
  if (!t) return "";
  const text = t.learnerText.length > 160 ? t.learnerText.slice(0, 157) + "..." : t.learnerText;
  return `You said: "${text}"`;
}

export function result(
  id: string,
  label: string,
  status: CriterionStatus,
  support: Support,
  evidence: string,
  nextStep: string,
  src?: Turn,
): CriterionResult {
  const via = src ? (src.mode === "free" ? "own_words" : "selected") : "none";
  // Selecting the right option shows recognition. Only the learner's own words count as execution.
  if (status === "demonstrated" && via === "selected") {
    return {
      id, label, status: "recognized", support, via,
      evidence: `${evidence} You selected this from the scripted options.`,
      nextStep: `${nextStep} To show you can do it, retry and write your reply in your own words.`,
    };
  }
  return { id, label, status, support, via, evidence, nextStep };
}

/** A system failure invalidates criteria not already demonstrated. Evidence gathered before it is kept. */
export function applyInterruption(results: CriterionResult[], interrupted: boolean): CriterionResult[] {
  if (!interrupted) return results;
  return results.map((r) =>
    r.status === "demonstrated" || r.status === "recognized"
      ? r
      : { ...r, status: "not_evaluable", support: "n/a", evidence: `Not evaluable. A system failure interrupted this attempt. ${r.evidence}` },
  );
}

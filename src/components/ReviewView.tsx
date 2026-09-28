"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { convoScenarios } from "@/lib/convo";
import { decodeAttempt, type SharedAttempt } from "@/lib/convo/share";
import { BEHAVIORS, type Behavior, type ConvoTurn } from "@/lib/convo/types";
import { TAG_LABEL } from "@/lib/convo/tags";
import { applyInterruption } from "@/lib/eval-helpers";
import type { CriterionStatus } from "@/lib/types";

const SCORE: Record<CriterionStatus, string> = { demonstrated: "2", recognized: "1", partial: "1", not_observed: "0", not_evaluable: "NE" };
const WORD: Record<CriterionStatus, string> = { demonstrated: "Demonstrated", recognized: "Recognized", partial: "Partial", not_observed: "Not demonstrated", not_evaluable: "Not evaluable" };
const ALL = Object.keys(BEHAVIORS) as Behavior[];

// Facilitator view. Everything here runs in the browser from the link fragment.
// Corrections change the scores shown here only. Facts released during the
// conversation stay as they happened, because the character already said them.

export function ReviewView() {
  const [attempt, setAttempt] = useState<SharedAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [edits, setEdits] = useState<Record<number, Behavior[]>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);

  async function load(code: string) {
    try {
      setError(null);
      const a = await decodeAttempt(code);
      if (!convoScenarios[a.scenarioId]) throw new Error("This link is for a scenario this version doesn't have.");
      setAttempt(a);
      setEdits({});
      setNotes({});
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith("This") ? e.message : "That link or code couldn't be read. Ask the learner to make a new one.");
    }
  }

  useEffect(() => {
    const code = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (code) load(code);
  }, []);

  const s = attempt ? convoScenarios[attempt.scenarioId] : null;
  const reviewed: ConvoTurn[] = useMemo(() => (attempt ? attempt.turns.map((t, i) => (edits[i] ? { ...t, tags: edits[i] } : t)) : []), [attempt, edits]);
  const released = attempt ? attempt.turns.flatMap((t) => t.released) : [];
  const original = s && attempt ? applyInterruption(s.evaluate(attempt.turns, released), attempt.interrupted) : [];
  const corrected = s && attempt ? applyInterruption(s.evaluate(reviewed, released), attempt.interrupted) : [];

  if (!attempt || !s) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow">Facilitator review</p>
        <h1 className="mt-2 text-4xl font-extrabold">Review a learner&apos;s conversation</h1>
        <p className="mt-3 text-ink/80">Open the review link the learner sent you, or paste it below. The conversation is inside the link. Nothing is fetched from or saved to a server.</p>
        <form className="mt-6" onSubmit={(e) => { e.preventDefault(); load(paste.includes("#") ? paste.split("#")[1] : paste); }}>
          <label htmlFor="code" className="text-sm font-semibold">Review link or code</label>
          <textarea id="code" rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/20 p-3 text-xs" />
          <button className="btn-primary mt-3" disabled={!paste.trim()}>Open</button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-coral-dark">{error}</p>}
      </section>
    );
  }

  const changedTurns = Object.keys(edits).filter((k) => {
    const i = Number(k);
    const a = [...attempt.turns[i].tags].sort().join();
    const b = [...edits[i]].sort().join();
    return a !== b;
  }).length;
  const agreement = attempt.turns.length ? Math.round(((attempt.turns.length - changedTurns) / attempt.turns.length) * 100) : 0;
  const scoreChanges = corrected.filter((c, i) => c.status !== original[i]?.status).length;

  const summary = [
    `Facilitator review: ${s.title} (${s.caseLabel}), ${s.persona.name} with ${s.counterpart.name}`,
    `Ending: ${s.endings[attempt.ending as keyof typeof s.endings]?.title ?? attempt.ending}${attempt.interrupted ? " (interrupted)" : ""}`,
    `Turns: ${attempt.turns.length}. Learner-flagged turns: ${attempt.flagged.map((i) => i + 1).join(", ") || "none"}.`,
    `Tag agreement with the AI: ${attempt.turns.length - changedTurns} of ${attempt.turns.length} turns (${agreement}%).`,
    ...corrected.map((c, i) => `${c.id} ${c.label}: AI tags ${SCORE[original[i].status]}, reviewed ${SCORE[c.status]}`),
    ...Object.entries(edits).map(([i, t]) => `Turn ${Number(i) + 1} tags changed to: ${t.map((x) => TAG_LABEL[x]).join(", ") || "none"}`),
    ...Object.entries(notes).filter(([, n]) => n.trim()).map(([i, n]) => `Turn ${Number(i) + 1} note: ${n}`),
  ].join("\n");

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow">Facilitator review · {s.caseLabel}</p>
      <h1 className="mt-1 text-3xl font-extrabold">{s.title}: {s.persona.name} with {s.counterpart.name}</h1>
      <p className="mt-2 text-ink/80">
        Ending: <b>{s.endings[attempt.ending as keyof typeof s.endings]?.title ?? attempt.ending}</b>
        {attempt.interrupted && " · interrupted by a system failure"} · {attempt.turns.length} turns · hints requested {attempt.hints.requested}, automatic {attempt.hints.auto}
      </p>
      <p className="mt-2 text-sm text-ink/70">
        Check each turn&apos;s labels. Change any that are wrong. Scores recompute from your labels. Facts the character already revealed stay as they happened.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ol className="space-y-4">
          {attempt.turns.map((t, i) => {
            const tags = edits[i] ?? t.tags;
            const flagged = attempt.flagged.includes(i);
            return (
              <li key={i} className={`card !p-4 ${flagged ? "border-2 border-coral" : ""}`}>
                <p className="text-xs font-bold text-ink/60">Turn {i + 1}{flagged ? " · flagged by the learner" : ""}{t.hintBefore ? " · after a hint" : ""}</p>
                <p className="mt-1"><b>Learner:</b> {t.learner}</p>
                <p className="mt-1 text-ink/75"><b>{s.counterpart.name}:</b> {t.reply}</p>
                {t.released.length > 0 && <p className="mt-1 text-xs text-teal-dark">Revealed: {t.released.map((id) => s.facts.find((f) => f.id === id)?.label ?? id).join("; ")}</p>}
                <fieldset className="mt-3">
                  <legend className="text-xs font-bold text-ink/70">Labels {edits[i] ? "(edited)" : "(from the AI)"}</legend>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {ALL.map((b) => {
                      const on = tags.includes(b);
                      return (
                        <label key={b} title={BEHAVIORS[b]} className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs font-semibold ${on ? "border-ink bg-ink text-white" : "border-ink/20 text-ink/70"}`}>
                          <input type="checkbox" className="sr-only" checked={on} onChange={() => setEdits((e) => ({ ...e, [i]: on ? tags.filter((x) => x !== b) : [...tags, b] }))} />
                          {TAG_LABEL[b]}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="mt-2 block text-xs font-semibold text-ink/70">
                  Note
                  <input value={notes[i] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [i]: e.target.value }))} className="mt-1 w-full rounded-lg border border-ink/20 px-2 py-1 text-sm font-normal" />
                </label>
              </li>
            );
          })}
        </ol>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card !p-4">
            <h2 className="h2">Scores</h2>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-left text-xs text-ink/60"><th className="py-1">Criterion</th><th>AI labels</th><th>Your labels</th></tr></thead>
              <tbody>
                {corrected.map((c, i) => (
                  <tr key={c.id} className="border-t border-ink/10 align-top">
                    <td className="py-1.5 pr-2"><b>{c.id}</b> {c.label}</td>
                    <td className="py-1.5">{SCORE[original[i].status]} <span className="text-xs text-ink/60">{WORD[original[i].status]}</span></td>
                    <td className={`py-1.5 ${c.status !== original[i].status ? "font-bold text-coral-dark" : ""}`}>{SCORE[c.status]} <span className="text-xs">{WORD[c.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card !p-4 text-sm">
            <h2 className="h2">Agreement with the AI</h2>
            <p className="mt-2"><b>{attempt.turns.length - changedTurns} of {attempt.turns.length}</b> turns kept the AI&apos;s labels ({agreement}%). {scoreChanges} score{scoreChanges === 1 ? "" : "s"} changed.</p>
            <p className="mt-2 text-xs text-ink/65">Collected across many reviews, this is the tagger-agreement evidence the review rubric asks for (A2). Copy the summary into your review log.</p>
          </div>
          {attempt.reflection && (
            <div className="card !p-4 text-sm">
              <h2 className="h2">Written reflection</h2>
              <p className="mt-2 whitespace-pre-wrap">{attempt.reflection}</p>
              <p className="mt-2 text-xs text-ink/65">Score against the objective: {s.persona.objective}</p>
            </div>
          )}
          <button className="btn-primary w-full" onClick={async () => { await navigator.clipboard.writeText(summary); setCopied(true); }}>{copied ? "Copied" : "Copy review summary"}</button>
          <p className="text-xs text-ink/60">Nothing on this page is saved. <Link href="/design#review-route" className="link">How review works</Link></p>
        </aside>
      </div>
    </section>
  );
}

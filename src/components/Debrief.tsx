"use client";

import { useState } from "react";
import Link from "next/link";
import { scenarios } from "@/lib/scenarios";
import type { CriterionStatus, Support } from "@/lib/types";
import { applyInterruption } from "@/lib/eval-helpers";
import type { RunSummary } from "./Player";
import { Scene } from "./Scene";
import { BranchMap } from "./BranchMap";
import { WordingPractice } from "./WordingPractice";
import { useViewReset } from "./useViewReset";

const STATUS: Record<CriterionStatus, { icon: string; text: string; score: string; cls: string }> = {
  demonstrated: { icon: "✓", text: "Demonstrated", score: "2", cls: "bg-teal/15 text-teal-dark border-teal" },
  recognized: { icon: "◑", text: "Recognized", score: "1", cls: "bg-mustard/20 text-ink border-mustard" },
  partial: { icon: "◐", text: "Partial", score: "1", cls: "bg-mustard/20 text-ink border-mustard" },
  not_observed: { icon: "–", text: "Not demonstrated", score: "0", cls: "bg-ink/5 text-ink border-ink/30" },
  not_evaluable: { icon: "?", text: "Not evaluable", score: "NE", cls: "bg-white text-ink border-ink/30 border-dashed" },
};
const VIA = { own_words: "In your own words", selected: "Selected from options", none: "" } as const;
const SUPPORT: Record<Support, string> = {
  independent: "Independent",
  after_recovery: "After a recovery",
  with_hint: "With a hint",
  "n/a": "",
};
const TRANSFER: Record<string, string> = {
  jordan: "The next time a student asks you to fix something, ask what they expected, what happened and what changed before you touch it.",
  grow: "Before your next coaching conversation, write down two open questions you will ask before you say what you think is going on.",
};

export function Debrief({ scenarioId, summary, onRetry, onStepBack }: { scenarioId: string; summary: RunSummary; onRetry: () => void; onStepBack: () => void }) {
  const s = scenarios[scenarioId];
  const ending = s.endings[summary.endingId];
  const persona = s.learnerPersonas.find((p) => p.id === summary.personaId)!;
  const results = applyInterruption(s.evaluate(summary.history), summary.interrupted);
  const selectedOnly = summary.history.length > 0 && summary.history.every((t) => t.mode === "choice");
  const heading = useViewReset<HTMLHeadingElement>("debrief", false);
  const [reflection, setReflection] = useState("");
  const [copied, setCopied] = useState(false);
  const allMoves = Object.values(s.nodes).flatMap((n) => n.moves);

  const text = [
    `${s.title} · ${persona.name}`,
    `Ending: ${ending.title}${summary.interrupted ? " (attempt interrupted by a system failure)" : ""}`,
    ...results.map((r) => `${r.id} ${r.label}: ${STATUS[r.status].score} ${STATUS[r.status].text}${VIA[r.via] ? `, ${VIA[r.via].toLowerCase()}` : ""}${SUPPORT[r.support] ? `, ${SUPPORT[r.support].toLowerCase()}` : ""}`),
    `Hints requested: ${summary.hintsRequested}. Automatic support: ${summary.hintsAuto}. Step backs: ${summary.stepBacks}.`,
    `Flagged turns: ${summary.flagged.length ? summary.flagged.map((t) => t + 1).join(", ") : "none"}`,
  ].join("\n");

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <p className="eyebrow">Debrief · {persona.name}</p>
      <h1 ref={heading} tabIndex={-1} className="mt-1 text-4xl font-extrabold text-ink">{ending.title}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Scene scene={s.scene} mood={ending.mood} label={`${s.counterpart.name} at the end of the conversation.`} />
        <div className="card">
          <h2 className="h2">What happened</h2>
          <p className="mt-2 text-ink/85">{ending.text}</p>
          <p className="mt-4 text-sm text-ink/70">
            The ending shows the consequence inside the story. The criteria below show what you did. They are scored by the app from the path you took, not by the AI.
          </p>
          {summary.interrupted && (
            <p className="mt-3 rounded-lg bg-coral/10 p-3 text-sm">
              <b>Interrupted attempt.</b> The AI failed during this attempt. That is recorded as a system failure, not a learner failure.
            </p>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="h2">Criteria</h2>
        <p className="mt-1 text-sm text-ink/70">
          Scale: 2 demonstrated in your own words. 1 recognized (selected from options) or partial. 0 not demonstrated despite the chance. NE not evaluable.
        </p>
        {selectedOnly && (
          <p className="mt-3 rounded-lg border-2 border-mustard bg-mustard/10 p-3 text-sm">
            <b>You used scripted options only.</b> Choosing the right option shows you can recognize the move. It doesn&apos;t show you can make it. Try again with &ldquo;Write your own&rdquo; to practice the actual wording.
          </p>
        )}
        <ul className="mt-4 space-y-4">
          {results.map((r) => (
            <li key={r.id} className="grid gap-3 border-b border-ink/10 pb-4 last:border-0 sm:grid-cols-[180px_1fr]">
              <div>
                <span className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm font-bold ${STATUS[r.status].cls}`}>
                  <span aria-hidden>{STATUS[r.status].icon}</span>
                  {STATUS[r.status].text}
                  <span className="text-xs font-semibold">({STATUS[r.status].score})</span>
                </span>
                {VIA[r.via] && <p className="mt-1 text-xs text-ink/65">{VIA[r.via]}</p>}
                {SUPPORT[r.support] && <p className="text-xs text-ink/65">{SUPPORT[r.support]}</p>}
              </div>
              <div>
                <p className="font-bold">{r.id}. {r.label}</p>
                <p className="mt-1 text-sm text-ink/80"><b>Evidence:</b> {r.evidence}</p>
                <p className="mt-1 text-sm text-ink/80"><b>Next step:</b> {r.nextStep}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="h2">Your path</h2>
          <BranchMap scenario={s} path={summary.path} mode="debrief" />
          <ol className="mt-4 space-y-2 text-sm">
            {summary.history.map((t, i) => {
              const m = allMoves.find((x) => x.id === t.moveId)!;
              return (
                <li key={i} className="rounded-lg bg-paper p-3">
                  <b>{s.nodes[t.nodeId].title}</b> {t.mode === "free" ? "(your words)" : "(scripted)"}
                  {summary.flagged.includes(i) && <span className="ml-2 font-bold text-coral-dark">Flagged</span>}
                  <br />
                  &ldquo;{t.learnerText}&rdquo;
                  <br />
                  <span className="italic text-ink/70">{m.consequence}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="h2">Support used</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink/85">
              <li>Hints requested: {summary.hintsRequested}</li>
              <li>Automatic support after weaker moves: {summary.hintsAuto}</li>
              <li>Steps back: {summary.stepBacks}</li>
              <li>Guardrails triggered: {summary.boundaries.length ? summary.boundaries.map((b) => b.kind.replace("_", " ")).join(", ") : "none"}</li>
            </ul>
            <p className="mt-3 text-xs text-ink/65">A recovery counts. It is reported separately from getting it right the first time.</p>
          </div>
          <div className="card border-l-8 border-l-teal">
            <h2 className="h2">Take it back to work</h2>
            <p className="mt-2 text-ink/85">{TRANSFER[s.id]}</p>
            <p className="mt-3 text-sm text-ink/70"><b>What would show this worked:</b> {s.transferEvidence}</p>
          </div>
          {persona.reflection && (
            <div className="card">
              <h2 className="h2">Written reflection for {persona.name}</h2>
              <label htmlFor="reflection" className="mt-2 block text-sm text-ink/80">{persona.reflection}</label>
              <textarea id="reflection" rows={5} value={reflection} onChange={(e) => setReflection(e.target.value)} className="mt-2 w-full rounded-xl border-2 border-ink/20 p-3" />
              <p className="mt-2 text-xs text-ink/65">
                This stays in your browser. It is not sent to the AI and not scored by the app. A human reviewer scores reflections against the objective.
              </p>
            </div>
          )}
        </div>
      </div>

      <WordingPractice scenarioId={s.id} />

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="btn-primary" onClick={onRetry}>Try again from the start</button>
        <button className="btn-ghost" onClick={onStepBack}>Go back to the last decision</button>
        <button
          className="btn-ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(text + (reflection ? `\n\nReflection:\n${reflection}` : ""));
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy summary for a facilitator"}
        </button>
        <Link href="/design" className="btn-ghost">How this was designed</Link>
      </div>
      <p className="mt-3 text-xs text-ink/70">Nothing on this page is saved. Copying is the only way it leaves this tab, and you choose where it goes.</p>
    </section>
  );
}

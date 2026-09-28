"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { casesFor, convoScenarios } from "@/lib/convo";
import type { Behavior, ConvoEnding, ConvoTurn } from "@/lib/convo/types";
import { TAG_LABEL } from "@/lib/convo/tags";
import { encodeAttempt } from "@/lib/convo/share";
import { endingFor, hintFor, moodFor, replay } from "@/lib/convo/engine";
import type { ConverseResponse } from "@/app/api/converse/route";
import { BOUNDARY_MESSAGES, MAX_INPUT, detectPersonalInfo } from "@/lib/guardrails";
import { applyInterruption } from "@/lib/eval-helpers";
import { PROVIDER_LABEL } from "@/lib/model-info";
import type { CriterionStatus, Support } from "@/lib/types";
import { Scene } from "./Scene";
import { useSpeech } from "./useSpeech";
import { useViewReset } from "./useViewReset";

type Entry =
  | { kind: "setting" | "system" | "boundary"; text: string }
  | { kind: "them"; text: string }
  | { kind: "me"; text: string }
  | { kind: "hint"; text: string; auto: boolean };

const WEAK: Behavior[] = ["leading", "interpretation", "instruction", "selfAnswer", "overSoften"];

const STATUS: Record<CriterionStatus, { icon: string; text: string; score: string; cls: string }> = {
  demonstrated: { icon: "✓", text: "Demonstrated", score: "2", cls: "bg-teal/15 text-teal-dark border-teal" },
  recognized: { icon: "◑", text: "Recognized", score: "1", cls: "bg-mustard/20 text-ink border-mustard" },
  partial: { icon: "◐", text: "Partial", score: "1", cls: "bg-mustard/20 text-ink border-mustard" },
  not_observed: { icon: "–", text: "Not demonstrated", score: "0", cls: "bg-ink/5 text-ink border-ink/30" },
  not_evaluable: { icon: "?", text: "Not evaluable", score: "NE", cls: "bg-white text-ink border-ink/30 border-dashed" },
};
const SUPPORT: Record<Support, string> = { independent: "Independent", after_recovery: "After a recovery", with_hint: "With a hint", "n/a": "" };

export function ConversationPlayer({ scenarioId }: { scenarioId: string }) {
  const s = convoScenarios[scenarioId];
  const p = s.persona;
  const name = s.counterpart.name;

  const [phase, setPhase] = useState<"intake" | "play" | "debrief">("intake");
  const [turns, setTurns] = useState<ConvoTurn[]>([]);
  const [log, setLog] = useState<Entry[]>([]);
  const [ending, setEnding] = useState<ConvoEnding["id"] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [hints, setHints] = useState({ requested: 0, auto: 0 });
  const [boundaries, setBoundaries] = useState<string[]>([]);
  const [failures, setFailures] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [flagged, setFlagged] = useState<number[]>([]);
  const [reflection, setReflection] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareReflection, setShareReflection] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const speech = useSpeech(setDraft);
  const logRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const heading = useViewReset<HTMLHeadingElement>(`${phase}-${attempt}`);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  const st = replay(s, turns);
  const lastFact = [...turns].reverse().flatMap((t) => t.released).map((id) => s.facts.find((f) => f.id === id))[0];
  const cue = [...st.released].reverse().map((id) => s.facts.find((f) => f.id === id)?.cue).find(Boolean);
  const mood = moodFor(st.guard, turns.length ? s.facts.find((f) => turns[turns.length - 1].released.includes(f.id)) : undefined);

  function start() {
    setTurns([]);
    setEnding(null);
    setDraft("");
    setHintShown(false);
    setHints({ requested: 0, auto: 0 });
    setBoundaries([]);
    setFailures(0);
    setInterrupted(false);
    setFlagged([]);
    setShareLink(null);
    setLog([
      { kind: "setting", text: s.setting },
      { kind: "them", text: s.opener },
    ]);
    setPhase("play");
    setAttempt((n) => n + 1);
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy || ending) return;
    if (text.length > MAX_INPUT) return addBoundary("too_long", BOUNDARY_MESSAGES.too_long);
    if (detectPersonalInfo(text)) return addBoundary("personal_info", BOUNDARY_MESSAGES.personal_info);
    speech.stop();
    setBusy(true);
    try {
      const res = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: s.id, text, turns }),
      });
      const d = (await res.json()) as ConverseResponse;
      if (!d.ok) throw new Error(d.message);
      setFailures(0);
      if (d.kind === "boundary") {
        addBoundary(d.boundary, d.message);
        return;
      }
      const turn: ConvoTurn = { learner: text, reply: d.reply, tags: d.tags, released: d.released, hintBefore: hintShown, guardAfter: d.guard };
      const next = [...turns, turn];
      setTurns(next);
      setDraft("");
      setHintShown(false);
      const add: Entry[] = [{ kind: "me", text }, { kind: "them", text: d.reply }];
      if (d.ending) {
        setEnding(d.ending as ConvoEnding["id"]);
      } else if (p.support === "proactive" && d.tags.some((t) => WEAK.includes(t))) {
        // Proactive support for Priya: a hint after a move that doesn't help. Recorded.
        add.push({ kind: "hint", text: hintFor(s, replay(s, next)), auto: true });
        setHintShown(true);
        setHints((h) => ({ ...h, auto: h.auto + 1 }));
      }
      setLog((l) => [...l, ...add]);
    } catch {
      const n = failures + 1;
      setFailures(n);
      if (n >= 2) setInterrupted(true);
      setLog((l) => [
        ...l,
        { kind: "system", text: n >= 2 ? "The AI still isn't responding. This attempt is marked interrupted. You can end the conversation, and anything not yet shown will be scored not evaluable." : "I didn't get a response from the AI. That's a system problem, not yours. Your message is still in the box. Try sending again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function addBoundary(kind: string, text: string) {
    setBoundaries((b) => [...b, kind]);
    setLog((l) => [...l, { kind: "boundary", text }]);
  }

  function hint() {
    if (hintShown) return;
    setHintShown(true);
    setHints((h) => ({ ...h, requested: h.requested + 1 }));
    setLog((l) => [...l, { kind: "hint", text: hintFor(s, st), auto: false }]);
  }

  function endNow() {
    const e = endingFor(s, st.released, st.released, [], st.turns, true) ?? "closed";
    setEnding(e);
  }

  if (phase === "intake") {
    return (
      <section className="mx-auto max-w-5xl px-5 py-10">
        <p className="eyebrow">{s.domain} · open conversation</p>
        <h1 ref={heading} tabIndex={-1} className="mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{s.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink/80">{s.tagline}</p>
        <nav aria-label="Cases for this skill" className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-ink/70">Cases:</span>
          {casesFor(s).map((c) => (
            <Link key={c.id} href={`/scenario/${c.id}`} aria-current={c.id === s.id ? "page" : undefined} className={`rounded-full border-2 px-3 py-1 font-bold ${c.id === s.id ? "border-ink bg-ink text-white" : "border-ink/20 hover:border-ink"}`}>
              {c.caseLabel}: {c.counterpart.name}
            </Link>
          ))}
          <span className="text-ink/70">Same skill, different facts. A second case shows whether the skill carries over.</span>
        </nav>
        <div className="mt-8">
          <div className="card">
            <h2 className="h2">You are {p.name}</h2>
            <p className="mt-2 text-sm text-ink/80">{p.summary}</p>
            <p className="mt-2 text-sm text-ink/80"><b>Gap:</b> {p.gap}</p>
            <p className="mt-2 text-sm text-ink/80"><b>Support:</b> {p.support === "proactive" ? "A hint appears after moves that don't help. Hints are recorded." : "Hints only if you ask. Hints are recorded."}</p>
            <h3 className="mt-4 font-bold">Objective</h3>
            <p className="mt-1 text-sm text-ink/80">{p.objective}</p>
          </div>
        </div>
        {s.framework && (
          <details className="card mt-6" open={p.support === "proactive"}>
            <summary className="cursor-pointer text-xl font-extrabold">
              What is {s.framework.name}? <span className="text-sm font-semibold text-ink/70">({p.support === "proactive" ? "recommended" : "optional"} for {p.name})</span>
            </summary>
            <p className="mt-3 text-ink/80">{s.framework.summary}</p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {s.framework.steps.map((x) => (
                <li key={x.letter} className="rounded-xl bg-paper p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-lg font-extrabold text-white" aria-hidden>{x.letter}</span>
                  <p className="mt-2 font-bold">{x.name}</p>
                  <p className="mt-1 text-sm text-ink/80">{x.purpose}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm font-semibold text-ink/75">{s.framework.note}</p>
          </details>
        )}
        <div className="card mt-6 border-l-8 border-l-mustard">
          <h2 className="h2">Before you start</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink/85">
            {s.prebrief.map((x) => <li key={x}>{x}</li>)}
            <li>
              Each reply goes to an AI model ({PROVIDER_LABEL}) twice: once to label what you did, once to write {name}&apos;s answer. This app keeps no transcript, no account and no analytics. <Link href="/design#privacy" className="link">What happens to your data</Link>
            </li>
          </ul>
          <button onClick={start} className="btn-primary mt-6">Start the conversation</button>
        </div>

        <details className="mt-6 rounded-2xl border border-ink/15 bg-white/60 p-5">
          <summary className="cursor-pointer font-bold text-ink/80">For designers: how this scenario was scoped</summary>
          <p className="mt-3 text-sm text-ink/80">Three questions came before any dialogue: how long the practice should take, the moment the skill breaks down on the job, and what learners already know. Each answer set a limit on what the scenario tries to do.</p>
          <dl className="mt-4 space-y-4">
              {[
                ["How long should this be?", s.intake.duration],
                ["When does the skill break down?", s.intake.situation],
                ["What's the learner's experience level?", s.intake.experience],
              ].map(([q, a]) => (
                <div key={q}>
                  <dt className="font-bold">{q}</dt>
                  <dd className="mt-1 text-ink/80">{a}</dd>
                </div>
              ))}
            </dl>
        </details>
      </section>
    );
  }

  if (phase === "debrief" && ending) {
    const e = s.endings[ending];
    const results = applyInterruption(s.evaluate(turns, st.released), interrupted);
    const summary = [
      `${s.title} (${s.caseLabel}) · ${p.name}`,
      `Ending: ${e.title}${interrupted ? " (interrupted by a system failure)" : ""}`,
      ...results.map((r) => `${r.id} ${r.label}: ${STATUS[r.status].score} ${STATUS[r.status].text}${SUPPORT[r.support] ? `, ${SUPPORT[r.support].toLowerCase()}` : ""}`),
      `Turns: ${turns.length}. Hints requested: ${hints.requested}. Automatic support: ${hints.auto}. Flagged turns: ${flagged.map((i) => i + 1).join(", ") || "none"}.`,
    ].join("\n");
    return (
      <section className="mx-auto max-w-5xl px-5 py-10">
        <p className="eyebrow">Debrief · {p.name}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-1 text-4xl font-extrabold">{e.title}</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Scene scene="pharmacy" who={s.who} mood={ending === "plan_key" ? "proud" : "neutral"} label={`${name} at the end of the conversation.`} />
          <div className="card">
            <h2 className="h2">What happened</h2>
            <p className="mt-2 text-ink/85">{e.text}</p>
            <p className="mt-4 text-sm text-ink/70">The AI labeled each of your turns. Code turned those labels into what the character revealed, how the conversation ended and these scores, so a wrong label means a wrong score. Check the labels below and flag any you disagree with.</p>
            {interrupted && <p className="mt-3 rounded-lg bg-coral/10 p-3 text-sm"><b>Interrupted attempt.</b> A system failure is not a learner failure. Unfinished criteria are marked not evaluable.</p>}
          </div>
        </div>

        <div className="card mt-6">
          <h2 className="h2">Criteria</h2>
          <p className="mt-1 text-sm text-ink/70">Scale: 2 demonstrated. 1 partial. 0 not demonstrated despite the chance. NE not evaluable.</p>
          <ul className="mt-4 space-y-4">
            {results.map((r) => (
              <li key={r.id} className="grid gap-3 border-b border-ink/10 pb-4 last:border-0 sm:grid-cols-[180px_1fr]">
                <div>
                  <span className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm font-bold ${STATUS[r.status].cls}`}>
                    <span aria-hidden>{STATUS[r.status].icon}</span>{STATUS[r.status].text} <span className="text-xs">({STATUS[r.status].score})</span>
                  </span>
                  {SUPPORT[r.support] && <p className="mt-1 text-xs text-ink/65">{SUPPORT[r.support]}</p>}
                </div>
                <div>
                  <p className="font-bold">{r.id}. {r.label}</p>
                  <p className="mt-1 text-sm text-ink/80"><b>Evidence:</b> {r.evidence}</p>
                  {r.nextStep && <p className="mt-1 text-sm text-ink/80"><b>Next step:</b> {r.nextStep}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="h2">What {name} knew</h2>
            <p className="mt-1 text-sm text-ink/70">Everything in the case, and what your questions surfaced.</p>
            <ul className="mt-4 space-y-2">
              {s.facts.map((f) => {
                const found = st.released.includes(f.id);
                return (
                  <li key={f.id} className={`rounded-lg border-2 p-3 text-sm ${found ? "border-teal bg-teal/5" : "border-dashed border-ink/25"}`}>
                    <b>{found ? "✓ Surfaced" : "Not surfaced"}</b>{f.key ? " · the fact observation couldn't show" : ""}{f.optional ? " · optional" : ""}
                    <br />{f.label}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="card">
            <h2 className="h2">Your turns, as tagged</h2>
            <p className="mt-1 text-sm text-ink/70">If a label is wrong, flag it. Flags go into the facilitator summary.</p>
            <ol className="mt-4 space-y-3 text-sm">
              {turns.map((t, i) => (
                <li key={i} className="rounded-lg bg-paper p-3">
                  <p>&ldquo;{t.learner}&rdquo;</p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {t.tags.length ? t.tags.map((x) => (
                      <span key={x} className={`rounded-full px-2 py-0.5 text-xs font-bold ${WEAK.includes(x) ? "bg-mustard/25" : "bg-teal/15"}`}>{TAG_LABEL[x]}</span>
                    )) : <span className="text-xs text-ink/70">No behaviors tagged</span>}
                  </p>
                  <button className="link mt-1 text-xs" aria-pressed={flagged.includes(i)} onClick={() => setFlagged((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]))}>
                    {flagged.includes(i) ? "Flagged for review" : "Disagree? Flag it"}
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-ink/65">Hints requested: {hints.requested}. Automatic support: {hints.auto}. Guardrails triggered: {boundaries.length ? boundaries.join(", ").replaceAll("_", " ") : "none"}.</p>
          </div>
        </div>

        <div className="card mt-6 border-l-8 border-l-teal">
          <h2 className="h2">Take it back to work</h2>
          <p className="mt-2 text-ink/85"><b>What would show this worked:</b> {s.transferEvidence}</p>
        </div>

        {s.reflection && (
          <div className="card mt-6">
            <h2 className="h2">Written reflection</h2>
            <label htmlFor="reflection" className="mt-2 block text-sm text-ink/80">{s.reflection}</label>
            <textarea id="reflection" rows={5} value={reflection} onChange={(ev) => setReflection(ev.target.value)} className="mt-2 w-full rounded-xl border-2 border-ink/20 p-3" />
            <p className="mt-2 text-xs text-ink/65">This stays in your browser. It isn&apos;t sent to the AI or scored by the app. A human reviewer scores reflections against the objective.</p>
          </div>
        )}

        <div className="card mt-6">
          <h2 className="h2">Send to a facilitator for review</h2>
          <p className="mt-2 text-sm text-ink/80">
            This makes a review link that holds your conversation, its labels and your flags. A facilitator can check every label and correct it, and the scores recompute. The conversation lives inside the link itself, after the &ldquo;#&rdquo;. Browsers never send that part to a server, so this app stores nothing. Anyone you give the link to can read it, so send it only to your facilitator.
          </p>
          {s.reflection && (
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={shareReflection} onChange={(ev) => { setShareReflection(ev.target.checked); setShareLink(null); }} className="accent-ink" />
              Include my written reflection
            </label>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              className="btn-ghost"
              onClick={async () => {
                const code = await encodeAttempt({ v: 1, scenarioId: s.id, ending, turns, flagged, interrupted, hints, reflection: shareReflection && reflection ? reflection : undefined });
                const link = `${window.location.origin}/review#${code}`;
                setShareLink(link);
                await navigator.clipboard.writeText(link).catch(() => {});
              }}
            >
              {shareLink ? "Link copied" : "Make a review link"}
            </button>
            {shareLink && <input readOnly value={shareLink} onFocus={(ev) => ev.target.select()} aria-label="Review link" className="min-w-0 flex-1 rounded-lg border border-ink/20 px-2 py-1 text-xs" />}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={start}>Try this case again</button>
          {casesFor(s).filter((c) => c.id !== s.id).map((c) => (
            <Link key={c.id} href={`/scenario/${c.id}`} className="btn-ghost">Try {c.caseLabel}: a new case with {c.counterpart.name}</Link>
          ))}
          <button className="btn-ghost" onClick={async () => { await navigator.clipboard.writeText(summary + (reflection ? `\n\nReflection:\n${reflection}` : "")); setCopied(true); }}>
            {copied ? "Copied" : "Copy summary for a facilitator"}
          </button>
          <Link href="/design#convo" className="btn-ghost">How this was designed</Link>
        </div>
        <p className="mt-3 text-xs text-ink/70">Nothing on this page is saved. Copying is the only way it leaves this tab.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{s.domain} · playing as {p.name}</p>
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-extrabold">{s.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setPaused(true)}>Pause</button>
          <button className="btn-ghost" onClick={start}>Restart</button>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <Scene scene="pharmacy" who={s.who} mood={mood} cue={cue} label={`${name} looks ${mood}.${lastFact?.cue ? " A new detail appears in the room." : ""}`} />
          <div className="card !p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink/70">What {name} has told you</h2>
              <span className="text-xs text-ink/70">Turn {Math.min(st.turns + 1, s.maxTurns)} of {s.maxTurns}</span>
            </div>
            {st.released.length === 0 ? (
              <p className="mt-2 text-sm text-ink/70">Nothing yet beyond what you could already see.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {st.released.map((id) => (
                  <li key={id} className="rounded-lg bg-teal/10 px-3 py-2">{s.facts.find((f) => f.id === id)?.label}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col">
          <div ref={logRef} className="card flex-1 space-y-3 overflow-y-auto !p-4 lg:max-h-[520px]" aria-live="polite" aria-label="Conversation">
            {log.map((e, i) =>
              e.kind === "setting" ? (
                <p key={i} className="rounded-lg bg-paper px-3 py-2 text-sm text-ink/80">{e.text}</p>
              ) : e.kind === "them" ? (
                <div key={i} className="flex"><div className="bubble-them"><span className="block text-xs font-bold text-teal-dark">{name}</span>{e.text}</div></div>
              ) : e.kind === "me" ? (
                <div key={i} className="flex justify-end"><div className="bubble-me"><span className="block text-xs font-bold text-white/80">You</span>{e.text}</div></div>
              ) : e.kind === "hint" ? (
                <p key={i} className="rounded-lg border-2 border-mustard bg-mustard/15 px-3 py-2 text-sm"><b>{e.auto ? "Support" : "Hint"}:</b> {e.text}</p>
              ) : e.kind === "boundary" ? (
                <p key={i} role="alert" className="rounded-lg border-2 border-coral bg-coral/10 px-3 py-2 text-sm"><b>Guardrail:</b> {e.text}</p>
              ) : (
                <p key={i} className="rounded-lg bg-ink/5 px-3 py-2 text-sm"><b>System:</b> {e.text}</p>
              ),
            )}
            {busy && <p className="text-sm italic text-ink/70">{name} is thinking...</p>}
          </div>

          {ending ? (
            <div className="card mt-4">
              <p className="font-bold">The conversation is over. The debrief separates how it ended from what you did.</p>
              <button className="btn-primary mt-3" onClick={() => setPhase("debrief")}>See your debrief</button>
            </div>
          ) : (
            <div className="card mt-4 !p-4">
              {speech.supported && !speech.enabled && (
                <p className="mb-2 text-xs text-ink/80">
                  <button className="link" onClick={speech.enable}>Turn on voice input</button> · audio may go to your browser&apos;s speech service. <Link href="/design#privacy" className="link">How voice works</Link>
                </p>
              )}
              <form onSubmit={(ev) => { ev.preventDefault(); send(); }}>
                <label htmlFor="reply" className="text-sm font-semibold">What do you say to {name}?</label>
                <div className="mt-1 flex gap-2">
                  {speech.enabled && (
                    <button type="button" onClick={speech.toggle} aria-pressed={speech.listening} aria-label={speech.listening ? "Stop recording" : "Speak your reply"} className={`shrink-0 rounded-xl border-2 px-3 font-bold ${speech.listening ? "border-coral bg-coral text-white" : "border-ink/20"}`}>
                      {speech.listening ? "Stop" : "Speak"}
                    </button>
                  )}
                  <textarea
                    id="reply"
                    rows={3}
                    value={draft}
                    onChange={(ev) => setDraft(ev.target.value)}
                    onKeyDown={(ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); send(); } }}
                    className="w-full rounded-xl border-2 border-ink/20 p-3"
                    placeholder="Say it as you would in the room. Fictional details only."
                  />
                </div>
                {speech.listening && <p className="mt-1 text-xs font-semibold text-coral-dark" aria-live="polite">Listening...</p>}
                {speech.error && <p className="mt-1 text-xs text-coral-dark">{speech.error}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/65">
                  <span>{draft.length}/{MAX_INPUT} · Enter to send</span>
                  <button type="submit" className="btn-primary !py-2" disabled={busy || !draft.trim()}>Send</button>
                </div>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button className="link text-sm" onClick={hint} disabled={hintShown}>{hintShown ? "Hint shown" : "Show a hint (recorded)"}</button>
                <button className="btn-ghost" onClick={endNow}>End the conversation</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {paused && (
        <div role="dialog" aria-modal="true" aria-labelledby="paused" className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-6">
          <div className="card max-w-md text-center">
            <h2 id="paused" className="h2">Paused</h2>
            <p className="mt-2 text-ink/80">Nothing is timed. Take the time you need.</p>
            <button className="btn-primary mt-5" autoFocus onClick={() => setPaused(false)}>Resume</button>
          </div>
        </div>
      )}
    </section>
  );
}

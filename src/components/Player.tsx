"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { scenarios } from "@/lib/scenarios";
import type { ApiResponse, BoundaryKind, Move, Turn } from "@/lib/types";
import { BOUNDARY_MESSAGES, MAX_INPUT, TREE_FALLBACK, detectPersonalInfo } from "@/lib/guardrails";
import { Scene } from "./Scene";
import { PROVIDER_LABEL } from "@/lib/model-info";
import { BranchMap } from "./BranchMap";
import { Debrief } from "./Debrief";
import { useViewReset } from "./useViewReset";

type LogEntry =
  | { kind: "situation"; text: string }
  | { kind: "counterpart"; text: string; ai?: boolean }
  | { kind: "learner"; text: string; turn: number; readAs?: string }
  | { kind: "consequence"; text: string }
  | { kind: "boundary"; text: string }
  | { kind: "system"; text: string }
  | { kind: "hint"; text: string; auto: boolean };

interface Snapshot {
  nodeId: string;
  history: Turn[];
  log: LogEntry[];
  path: string[];
}

export interface RunSummary {
  history: Turn[];
  path: string[];
  endingId: string;
  personaId: string;
  hintsRequested: number;
  hintsAuto: number;
  stepBacks: number;
  boundaries: { kind: BoundaryKind; nodeId: string; sentToModel: boolean }[];
  flagged: number[];
  interrupted: boolean;
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
/** Stable per-node shuffle so the strongest option is never always first. */
function orderMoves(nodeId: string, moves: Move[]) {
  return [...moves].sort((a, b) => hash(nodeId + a.id) - hash(nodeId + b.id));
}

export function Player({ scenarioId }: { scenarioId: string }) {
  const s = scenarios[scenarioId];
  const [phase, setPhase] = useState<"intake" | "play" | "debrief">("intake");
  const [personaId, setPersonaId] = useState(s.learnerPersonas[0].id);
  const persona = s.learnerPersonas.find((p) => p.id === personaId)!;

  const [nodeId, setNodeId] = useState(s.start);
  const [history, setHistory] = useState<Turn[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [path, setPath] = useState<string[]>([s.start]);
  const [checkpoints, setCheckpoints] = useState<Snapshot[]>([]);
  const [endingId, setEndingId] = useState<string | null>(null);

  const [hintShown, setHintShown] = useState(false);
  const [hintsRequested, setHintsRequested] = useState(0);
  const [hintsAuto, setHintsAuto] = useState(0);
  const [stepBacks, setStepBacks] = useState(0);
  const [boundaries, setBoundaries] = useState<RunSummary["boundaries"]>([]);
  const [flagged, setFlagged] = useState<number[]>([]);

  const [inputMode, setInputMode] = useState<"choice" | "free">("choice");
  const [aiAvailable, setAiAvailable] = useState(true);
  const [interrupted, setInterrupted] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const heading = useViewReset<HTMLHeadingElement>(`${phase}-${attempt}`);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  const node = s.nodes[nodeId];
  const ending = endingId ? s.endings[endingId] : null;
  const lastMood = useMemo(() => {
    if (ending) return ending.mood;
    const t = history[history.length - 1];
    if (!t) return node.mood;
    const m = Object.values(s.nodes).flatMap((n) => n.moves).find((mv) => mv.id === t.moveId);
    // A node that opens with a new line from the character sets the mood for that line.
    if (node.opener && m?.next === node.id && t.nodeId !== node.id) return node.mood;
    return m?.mood ?? node.mood;
  }, [history, node, ending, s.nodes]);

  function start() {
    setNodeId(s.start);
    setHistory([]);
    setPath([s.start]);
    setCheckpoints([]);
    setEndingId(null);
    setHintShown(false);
    setHintsRequested(0);
    setHintsAuto(0);
    setStepBacks(0);
    setBoundaries([]);
    setFlagged([]);
    setInterrupted(false);
    setAiAvailable(true);
    setInputMode("choice");
    const first = s.nodes[s.start];
    setLog([
      { kind: "situation", text: first.situation },
      ...(first.opener ? [{ kind: "counterpart" as const, text: first.opener }] : []),
    ]);
    setPhase("play");
    setAttempt((n) => n + 1);
  }

  function applyMove(move: Move, mode: "choice" | "free", learnerText: string, counterpartText: string, aiVaried: boolean) {
    setCheckpoints((c) => [...c, { nodeId, history, log, path }]);
    const allMoves = Object.values(s.nodes).flatMap((n) => n.moves);
    const afterRecovery = history.some((t) => allMoves.find((m) => m.id === t.moveId)?.quality === "poor");
    const turn: Turn = { nodeId, moveId: move.id, mode, learnerText, counterpartText, hintBefore: hintShown, afterRecovery };
    const turnIndex = history.length;
    setHistory((h) => [...h, turn]);

    const entries: LogEntry[] = [
      { kind: "learner", text: learnerText, turn: turnIndex, readAs: mode === "free" ? move.label : undefined },
      { kind: "counterpart", text: counterpartText, ai: aiVaried },
      { kind: "consequence", text: move.consequence },
    ];
    setHintShown(false);

    if (move.next in s.endings) {
      setEndingId(move.next);
      setPath((p) => [...p, move.next]);
      entries.push({ kind: "situation", text: s.endings[move.next].text });
      setLog((l) => [...l, ...entries]);
      return;
    }
    const next = s.nodes[move.next];
    if (move.next !== nodeId) {
      entries.push({ kind: "situation", text: next.situation });
      // Some nodes open with a new line from the character (for example, Jordan's frustration at D2).
      if (next.opener) entries.push({ kind: "counterpart", text: next.opener });
    }
    // Proactive support: learners who need scaffolding see the hint after a weaker move.
    if (persona.support === "proactive" && move.quality !== "good") {
      entries.push({ kind: "hint", text: next.hint, auto: true });
      setHintShown(true);
      setHintsAuto((n) => n + 1);
    }
    setNodeId(move.next);
    setPath((p) => [...p, move.next]);
    setLog((l) => [...l, ...entries]);
  }

  function stepBack() {
    const snap = checkpoints[checkpoints.length - 1];
    if (!snap) return;
    setCheckpoints((c) => c.slice(0, -1));
    setNodeId(snap.nodeId);
    setHistory(snap.history);
    setPath(snap.path);
    setEndingId(null);
    setStepBacks((n) => n + 1);
    setLog([...snap.log, { kind: "system", text: "You stepped back one decision. The debrief will note the step back." }]);
  }

  function requestHint() {
    if (hintShown) return;
    setHintShown(true);
    setHintsRequested((n) => n + 1);
    setLog((l) => [...l, { kind: "hint", text: node.hint, auto: false }]);
  }

  function addBoundary(kind: BoundaryKind, message: string, sentToModel: boolean) {
    setBoundaries((b) => [...b, { kind, nodeId, sentToModel }]);
    setLog((l) => [...l, { kind: "boundary", text: TREE_FALLBACK.includes(kind) ? `${message} You can also pick a scripted option.` : message }]);
  }

  async function submitFree() {
    const text = draft.trim();
    if (!text || busy) return;
    if (text.length > MAX_INPUT) return addBoundary("too_long", BOUNDARY_MESSAGES.too_long, false);
    // Stop obvious personal information in the browser, before any network call.
    if (detectPersonalInfo(text)) {
      addBoundary("personal_info", BOUNDARY_MESSAGES.personal_info, false);
      return;
    }
    setBusy(true);
    const recent = log
      .filter((e): e is Extract<LogEntry, { kind: "learner" | "counterpart" }> => e.kind === "learner" || e.kind === "counterpart")
      .slice(-8)
      .map((e) => ({ who: e.kind, text: e.text.slice(0, 600) }));
    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: s.id, nodeId, text, recent }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!data.ok) throw new Error(data.message);
      if (data.kind === "boundary") {
        addBoundary(data.boundary, data.message, data.sentToModel);
      } else {
        const move = node.moves.find((m) => m.id === data.moveId);
        if (!move) throw new Error("State mismatch");
        applyMove(move, "free", text, data.counterpartText, data.aiVaried);
        setDraft("");
      }
    } catch {
      setAiAvailable(false);
      setInterrupted(true);
      setInputMode("choice");
      setLog((l) => [
        ...l,
        { kind: "system", text: "The AI didn't respond. This is a system failure, not yours. Free-text replies are off for this attempt, and the debrief will mark it as interrupted. Continue with the scripted options." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const summary: RunSummary | null = endingId
    ? { history, path, endingId, personaId, hintsRequested, hintsAuto, stepBacks, boundaries, flagged, interrupted }
    : null;

  if (phase === "intake") {
    return (
      <section className="mx-auto max-w-5xl px-5 py-10">
        <p className="eyebrow">{s.domain}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{s.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink/80">{s.tagline}</p>

        <div className="mt-8">
          <div className="card">
            {s.learnerPersonas.length === 1 ? (
              <>
                <h2 className="h2">Your role: {persona.name}</h2>
                <p className="mt-2 text-sm text-ink/80">{persona.summary}</p>
                <p className="mt-2 text-sm text-ink/80"><b>Gap:</b> {persona.gap}</p>
                <p className="mt-2 text-sm text-ink/80"><b>Support:</b> {persona.support === "proactive" ? "Framework cues at each decision and a hint after weaker moves. Hints are recorded." : "Hints only if you ask. Hints are recorded."}</p>
              </>
            ) : (
              <>
                <h2 className="h2">Who are you in this scenario?</h2>
                <fieldset className="mt-3 space-y-3">
                  <legend className="sr-only">Choose a learner persona</legend>
                  {s.learnerPersonas.map((p) => (
                    <label key={p.id} className={`block cursor-pointer rounded-xl border-2 p-4 ${p.id === personaId ? "border-ink bg-paper" : "border-ink/15"}`}>
                      <input type="radio" name="persona" value={p.id} checked={p.id === personaId} onChange={() => setPersonaId(p.id)} className="mr-2 accent-ink" />
                      <span className="font-bold">{p.name}</span>
                      <span className="mt-1 block text-sm text-ink/75">{p.summary}</span>
                      <span className="mt-1 block text-sm text-ink/75"><b>Gap:</b> {p.gap}</span>
                      <span className="mt-1 block text-sm text-ink/75"><b>Support:</b> {p.support === "proactive" ? "Framework cues at each decision and a hint after weaker moves." : "No framework cues. Hints only if you ask."}</span>
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            <h3 className="mt-5 font-bold">Objective</h3>
            <p className="mt-1 text-sm text-ink/80">{persona.objective}</p>
          </div>
        </div>

        {s.framework && (
          <details className="card mt-6" open={persona.support === "proactive"}>
            <summary className="cursor-pointer text-xl font-extrabold text-ink">
              What is {s.framework.name}? <span className="text-sm font-semibold text-ink/70">({persona.support === "proactive" ? `recommended for ${persona.name}` : `optional for ${persona.name}`})</span>
            </summary>
            <p className="mt-3 text-ink/80">{s.framework.summary}</p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {s.framework.steps.map((st) => (
                <li key={st.letter} className="rounded-xl bg-paper p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-lg font-extrabold text-white" aria-hidden>{st.letter}</span>
                  <p className="mt-2 font-bold">{st.name}</p>
                  <p className="mt-1 text-sm text-ink/80">{st.purpose}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm font-semibold text-ink/75">{s.framework.note}</p>
          </details>
        )}

        <div className="card mt-6 border-l-8 border-l-mustard">
          <h2 className="h2">Before you start</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink/85">
            {s.prebrief.map((p) => (
              <li key={p}>{p}</li>
            ))}
            <li>
              Free-text replies go to an AI model ({PROVIDER_LABEL}) to be matched to a response type. This app keeps no transcript,
              no account and no analytics. Your results disappear when you close the tab. <Link href="/design#privacy" className="link">What happens to your data</Link>
            </li>
          </ul>
          <button onClick={start} className="btn-primary mt-6">Start the scenario</button>
        </div>

        <details className="mt-6 rounded-2xl border border-ink/15 bg-white/60 p-5">
          <summary className="cursor-pointer font-bold text-ink/80">For designers: how this scenario was scoped</summary>
          <p className="mt-3 text-sm text-ink/80">Three questions came before any dialogue: how long the practice should take, the moment the skill breaks down on the job, and what learners already know. Each answer set a limit on what the scenario tries to do.</p>
          <dl className="mt-4 space-y-4">
              {[
                ["How long should this be?", s.intake.duration],
                ["When does the skill break down?", s.intake.situation],
                ["What's the learners' experience level?", s.intake.experience],
              ].map(([q, a]) => (
                <div key={q}>
                  <dt className="font-bold text-ink">{q}</dt>
                  <dd className="mt-1 text-ink/80">{a}</dd>
                </div>
              ))}
            </dl>
        </details>
      </section>
    );
  }

  if (phase === "debrief" && summary) {
    return <Debrief scenarioId={s.id} summary={summary} onRetry={start} onStepBack={() => { stepBack(); setPhase("play"); setAttempt((n) => n + 1); }} />;
  }

  const sceneLabel = `${s.counterpart.name} looks ${lastMood}. ${node.cue ? `Visual cue: ${node.cue}.` : ""}`;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{s.domain} · playing as {persona.name}</p>
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-extrabold text-ink">{s.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setPaused(true)}>Pause</button>
          <button className="btn-ghost" onClick={stepBack} disabled={checkpoints.length === 0}>Step back one decision</button>
          <button className="btn-ghost" onClick={start}>Restart</button>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <Scene scene={s.scene} mood={lastMood} cue={ending ? undefined : node.cue} label={sceneLabel} />
          {persona.support === "proactive" && node.stage && !ending && (
            <p className="rounded-xl bg-teal/10 px-4 py-3 text-sm font-semibold text-teal-dark">{node.stage}</p>
          )}
          <div className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink/70">Your path so far</h2>
            <BranchMap scenario={s} path={path} current={ending ? undefined : nodeId} mode="play" />
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col">
          <div ref={logRef} className="card flex-1 space-y-3 overflow-y-auto !p-4 lg:max-h-[520px]" aria-live="polite" aria-label="Conversation">
            {log.map((e, i) => (
              <LogItem key={i} e={e} name={s.counterpart.name} flagged={"turn" in e && flagged.includes(e.turn)} onFlag={(t) => setFlagged((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]))} />
            ))}
            {busy && <p className="text-sm italic text-ink/70">{s.counterpart.name} is thinking...</p>}
          </div>

          {ending ? (
            <div className="card mt-4">
              <p className="font-bold">You reached an ending. The debrief separates the ending from what you did.</p>
              <button className="btn-primary mt-3" onClick={() => setPhase("debrief")}>See your debrief</button>
            </div>
          ) : (
            <div className="card mt-4 !p-4">
              <div role="tablist" aria-label="How to respond" className="mb-3 flex gap-2">
                <button role="tab" aria-selected={inputMode === "choice"} className={`tab ${inputMode === "choice" ? "tab-on" : ""}`} onClick={() => setInputMode("choice")}>Choose a response</button>
                <button role="tab" aria-selected={inputMode === "free"} className={`tab ${inputMode === "free" ? "tab-on" : ""}`} onClick={() => setInputMode("free")} disabled={!aiAvailable} title={aiAvailable ? "" : "AI unavailable for this attempt"}>
                  Write your own {aiAvailable ? "(AI)" : "(off)"}
                </button>
              </div>
              {inputMode === "choice" ? (
                <div className="space-y-2">
                  {orderMoves(node.id, node.moves).map((m) => (
                    <button key={m.id} className="choice" onClick={() => applyMove(m, "choice", m.label, m.reply, false)}>
                      &ldquo;{m.label}&rdquo;
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); submitFree(); }}>
                  <label htmlFor="reply" className="text-sm font-semibold">What do you say to {s.counterpart.name}?</label>
                  <textarea
                    id="reply"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={MAX_INPUT + 50}
                    rows={3}
                    className="mt-1 w-full rounded-xl border-2 border-ink/20 p-3 focus:border-ink"
                    placeholder="Use fictional details only."
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitFree(); } }}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-ink/65">
                    <span>{draft.length}/{MAX_INPUT} · Enter to send. The AI matches your reply to a response type. The app decides what happens next.</span>
                    <button type="submit" className="btn-primary !py-2" disabled={busy || !draft.trim()}>Send</button>
                  </div>
                </form>
              )}
              <div className="mt-3 flex items-center justify-between">
                <button className="link text-sm" onClick={requestHint} disabled={hintShown}>{hintShown ? "Hint shown" : "Show a hint (recorded)"}</button>
                {interrupted && <span className="text-xs font-semibold text-coral-dark">Attempt marked interrupted</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {paused && (
        <div role="dialog" aria-modal="true" aria-labelledby="paused-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-6">
          <div className="card max-w-md text-center">
            <h2 id="paused-title" className="h2">Paused</h2>
            <p className="mt-2 text-ink/80">Nothing is timed. Take the time you need. If something in this scenario doesn&apos;t match real practice, note it in your debrief flags.</p>
            <button className="btn-primary mt-5" autoFocus onClick={() => setPaused(false)}>Resume</button>
          </div>
        </div>
      )}
    </section>
  );
}

function LogItem({ e, name, flagged, onFlag }: { e: LogEntry; name: string; flagged: boolean; onFlag: (t: number) => void }) {
  switch (e.kind) {
    case "situation":
      return <p className="rounded-lg bg-paper px-3 py-2 text-sm text-ink/80">{e.text}</p>;
    case "counterpart":
      return (
        <div className="flex">
          <div className="bubble-them">
            <span className="block text-xs font-bold text-teal-dark">{name}</span>
            {e.text}
          </div>
        </div>
      );
    case "learner":
      return (
        <div className="flex flex-col items-end">
          <div className="bubble-me">
            <span className="block text-xs font-bold text-white/80">You</span>
            {e.text}
          </div>
          {e.readAs && (
            <div className="mt-1 max-w-[85%] text-right text-xs text-ink/65">
              AI read this as: &ldquo;{e.readAs}&rdquo;{" "}
              <button className="link" onClick={() => onFlag(e.turn)} aria-pressed={flagged}>
                {flagged ? "Flagged for review" : "Disagree? Flag it"}
              </button>
            </div>
          )}
        </div>
      );
    case "consequence":
      return <p className="border-l-4 border-ink/25 pl-3 text-sm italic text-ink/75">{e.text}</p>;
    case "boundary":
      return (
        <p role="alert" className="rounded-lg border-2 border-coral bg-coral/10 px-3 py-2 text-sm">
          <b>Guardrail:</b> {e.text}
        </p>
      );
    case "system":
      return <p className="rounded-lg bg-ink/5 px-3 py-2 text-sm"><b>System:</b> {e.text}</p>;
    case "hint":
      return (
        <p className="rounded-lg border-2 border-mustard bg-mustard/15 px-3 py-2 text-sm">
          <b>{e.auto ? "Support" : "Hint"}:</b> {e.text}
        </p>
      );
  }
}

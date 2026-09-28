"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { scenarios } from "@/lib/scenarios";
import type { ApiResponse } from "@/lib/types";
import { BOUNDARY_MESSAGES, MAX_INPUT, detectPersonalInfo } from "@/lib/guardrails";

// Wording practice: the step from recognizing a move to saying it.
// Speech goes through the browser's own speech service. This app receives text only.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognizer = any;

interface Result {
  text: string;
  on: boolean; // matched the target move
  label: string;
  reply?: string;
  feedback: string;
}

export function WordingPractice({ scenarioId }: { scenarioId: string }) {
  const s = scenarios[scenarioId];
  const [i, setI] = useState(0);
  const drill = s.drills[i];
  const node = s.nodes[drill.nodeId];
  const target = node.moves.find((m) => m.quality === "good")!;

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<number, Result[]>>({});
  const [showExample, setShowExample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognizer>(null);

  useEffect(() => {
    const w = window as any;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.abort?.();
  }, []);

  function listen() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r: Recognizer = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let t = "";
      for (let k = 0; k < e.results.length; k++) t += e.results[k][0].transcript;
      setDraft(t);
    };
    r.onerror = (e: any) => {
      setError(e.error === "not-allowed" ? "Microphone access was blocked. You can type instead." : "Speech recognition stopped. You can try again or type.");
      setListening(false);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    setDraft("");
    setListening(true);
    r.start();
  }

  function go(n: number) {
    rec.current?.abort?.();
    setListening(false);
    setI(n);
    setDraft("");
    setShowExample(false);
    setError(null);
  }

  async function check() {
    const text = draft.trim();
    if (!text || busy) return;
    if (text.length > MAX_INPUT) return setError(BOUNDARY_MESSAGES.too_long);
    if (detectPersonalInfo(text)) return setError(BOUNDARY_MESSAGES.personal_info);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: s.id, nodeId: node.id, text, recent: [{ who: "counterpart", text: drill.line }] }),
      });
      const d = (await res.json()) as ApiResponse;
      let r: Result;
      if (!d.ok) {
        setError("The AI didn't respond. That's a system problem, not your wording. Try again in a moment.");
        return;
      }
      if (d.kind === "boundary") {
        r = { text, on: false, label: "Not matched", feedback: d.message };
      } else {
        const m = node.moves.find((x) => x.id === d.moveId)!;
        r =
          m.quality === "good"
            ? { text, on: true, label: m.label, reply: d.counterpartText, feedback: `Your wording does the job: ${m.category.charAt(0).toLowerCase() + m.category.slice(1)} ${m.consequence}` }
            : { text, on: false, label: m.label, reply: d.counterpartText, feedback: `${m.consequence} ${node.hint}` };
      }
      setResults((prev) => ({ ...prev, [i]: [...(prev[i] ?? []), r] }));
      setDraft("");
    } catch {
      setError("The AI didn't respond. That's a system problem, not your wording. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const tries = results[i] ?? [];
  const done = s.drills.filter((_, k) => (results[k] ?? []).some((r) => r.on)).length;

  return (
    <div className="card mt-6 border-t-8 border-t-teal">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h2">Practice the wording</h2>
        <span className="text-sm text-ink/65">{done} of {s.drills.length} moments said in your own words</span>
      </div>
      <p className="mt-2 text-ink/80">
        Choosing the right option shows you recognize the move. Saying it shows you can make it. Respond to each moment out loud or in writing, as many times as you like. Nothing here changes your scores above or is saved.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Practice moments">
        {s.drills.map((d, k) => {
          const ok = (results[k] ?? []).some((r) => r.on);
          return (
            <button key={d.nodeId} role="tab" aria-selected={k === i} className={`tab border ${k === i ? "tab-on border-ink" : "border-ink/20"}`} onClick={() => go(k)}>
              {ok ? "✓ " : ""}{k + 1}{d.stage ? `. ${d.stage}` : ""}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          {drill.stage && <p className="eyebrow">GROW · {drill.stage}</p>}
          <div className="mt-2 flex">
            <div className="bubble-them">
              <span className="block text-xs font-bold text-teal-dark">{s.counterpart.name}</span>
              {drill.line}
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/80"><b>Your aim:</b> {drill.goal}</p>

          {voiceSupported && !voiceOn && (
            <p className="mt-4 text-xs text-ink/80">
              <button className="link" onClick={() => setVoiceOn(true)}>Turn on voice input</button> · audio may go to your browser&apos;s speech service. <Link href="/design#privacy" className="link">How voice works</Link>
            </p>
          )}
          {!voiceSupported && <p className="mt-4 text-sm text-ink/65">Voice input isn&apos;t available in this browser. Type your reply instead, as you would say it.</p>}

          <form className="mt-4" onSubmit={(e) => { e.preventDefault(); check(); }}>
            <label htmlFor="practice" className="text-sm font-semibold">What do you say?</label>
            <div className="mt-1 flex gap-2">
              {voiceOn && (
                <button type="button" onClick={listen} className={`shrink-0 rounded-xl border-2 px-3 font-bold ${listening ? "border-coral bg-coral text-white" : "border-ink/20"}`} aria-pressed={listening} aria-label={listening ? "Stop recording" : "Speak your reply"}>
                  {listening ? "Stop" : "Speak"}
                </button>
              )}
              <textarea id="practice" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} className="w-full rounded-xl border-2 border-ink/20 p-3" placeholder={voiceOn ? "Press Speak, or type" : "Type it as you would say it"} />
            </div>
            {listening && <p className="mt-1 text-xs font-semibold text-coral-dark" aria-live="polite">Listening...</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary !py-2" disabled={busy || !draft.trim()}>{busy ? "Checking..." : "Check my wording"}</button>
              {tries.length > 0 && (
                <button type="button" className="link text-sm" onClick={() => setShowExample((v) => !v)}>{showExample ? "Hide example" : "See one way to say it"}</button>
              )}
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-coral-dark">{error}</p>}
            {showExample && <p className="mt-3 rounded-lg bg-teal/10 p-3 text-sm">&ldquo;{target.label}&rdquo; <span className="text-ink/70">Other wording that does the same thing counts.</span></p>}
          </form>
        </div>

        <div aria-live="polite">
          {tries.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-ink/15 p-5 text-sm text-ink/70">Your attempts appear here. The example stays hidden until you have tried once.</p>
          ) : (
            <ol className="space-y-3">
              {tries.map((r, k) => (
                <li key={k} className={`rounded-xl border-2 p-4 text-sm ${r.on ? "border-teal bg-teal/5" : "border-mustard bg-mustard/10"}`}>
                  <p className="font-bold">{r.on ? "✓ On target" : "Not yet"} <span className="font-normal text-ink/70">· attempt {k + 1}</span></p>
                  <p className="mt-1">You said: &ldquo;{r.text}&rdquo;</p>
                  {r.reply && <p className="mt-1 text-ink/75">{s.counterpart.name}: &ldquo;{r.reply}&rdquo;</p>}
                  <p className="mt-2 text-ink/85">{r.feedback}</p>
                </li>
              ))}
            </ol>
          )}
          {tries.some((r) => r.on) && i < s.drills.length - 1 && (
            <button className="btn-ghost mt-4" onClick={() => go(i + 1)}>Next moment</button>
          )}
        </div>
      </div>
    </div>
  );
}

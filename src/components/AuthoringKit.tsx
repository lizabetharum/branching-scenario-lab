"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EXAMPLE_PACKET, buildScenario, runAuthoringChecks, validatePacket, type AuthoredPacket } from "@/lib/convo/authoring";

export const DRAFT_KEY = "bsl-author-draft";

type Path = (string | number)[];
function get(o: unknown, path: Path): string {
  return String(path.reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k as string], o) ?? "");
}
function set<T>(o: T, path: Path, v: string): T {
  const copy = structuredClone(o) as Record<string, unknown>;
  let cur = copy;
  path.slice(0, -1).forEach((k) => {
    cur[k as string] = { ...(cur[k as string] as object) };
    cur = cur[k as string] as Record<string, unknown>;
  });
  cur[path[path.length - 1] as string] = v;
  return copy as T;
}

function Field({ label, help, path, value, onChange, rows = 1 }: { label: string; help?: string; path: Path; value: AuthoredPacket; onChange: (p: Path, v: string) => void; rows?: number }) {
  const id = path.join("-");
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      {help && <p className="text-xs text-ink/70">{help}</p>}
      {rows > 1 ? (
        <textarea id={id} rows={rows} value={get(value, path)} onChange={(e) => onChange(path, e.target.value)} className="mt-1 w-full rounded-lg border-2 border-ink/20 p-2 text-sm" />
      ) : (
        <input id={id} value={get(value, path)} onChange={(e) => onChange(path, e.target.value)} className="mt-1 w-full rounded-lg border-2 border-ink/20 p-2 text-sm" />
      )}
    </div>
  );
}

/**
 * Authoring kit. One template, the "investigate before interpreting" pattern.
 * The draft lives in this browser only (local storage) until you download it.
 */
export function AuthoringKit() {
  const router = useRouter();
  const [packet, setPacket] = useState<AuthoredPacket>(EXAMPLE_PACKET);
  const [hasContext, setHasContext] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved) as AuthoredPacket;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPacket(p);
        setHasContext(Boolean(p.context));
      } catch {}
    }
    setLoaded(true);
  }, []);

  const effective = useMemo(() => {
    if (hasContext) return packet.context ? packet : { ...packet, context: { label: "", says: "", topic: "" } };
    const rest = { ...packet };
    delete rest.context;
    return rest;
  }, [packet, hasContext]);

  useEffect(() => {
    if (loaded) localStorage.setItem(DRAFT_KEY, JSON.stringify(effective));
  }, [effective, loaded]);

  const v = useMemo(() => validatePacket(effective), [effective]);
  const checks = useMemo(() => (v.packet && !v.errors.length ? runAuthoringChecks(buildScenario(v.packet)) : []), [v]);
  const ready = Boolean(v.packet) && v.errors.length === 0 && checks.length > 0 && checks.every((c) => c.pass);
  const onChange = (p: Path, value: string) => setPacket((cur) => set(hasContext && p[0] === "context" && !cur.context ? { ...cur, context: { label: "", says: "", topic: "" } } : cur, p, value));
  const n = packet.counterpart.name || "the character";

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(effective, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(packet.title || "scenario").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function load(file: File) {
    try {
      const p = JSON.parse(await file.text()) as AuthoredPacket;
      setPacket(p);
      setHasContext(Boolean(p.context));
    } catch {
      alert("That file isn't a scenario from this kit.");
    }
  }


  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <p className="eyebrow">Authoring kit</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Build a practice conversation</h1>
      <p className="mt-3 max-w-3xl text-ink/80">
        Fill in one template. The kit builds the full scenario: what each question can uncover, how the character reacts to telling, the endings and the four scored behaviors. It then runs the same rule checks the site runs before every release. The pattern is &ldquo;investigate before interpreting,&rdquo; the one behind The Label Conversation.
      </p>
      <p className="mt-2 text-sm text-ink/70">Your draft stays in this browser until you download it. Use fictional people and details only. Clinical content isn&apos;t accepted, because it needs clinician review.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <form className="min-w-0 space-y-8" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="card space-y-4">
            <legend className="px-1 text-lg font-extrabold">1. The people</legend>
            <Field value={packet} onChange={onChange} label="Scenario title" path={["title"]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field value={packet} onChange={onChange} label="Learner's name" path={["learner", "name"]} />
              <Field value={packet} onChange={onChange} label="Learner's role" path={["learner", "role"]} />
            </div>
            <Field value={packet} onChange={onChange} label="Learner's gap" help="What the learner does now that the practice targets." path={["learner", "gap"]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field value={packet} onChange={onChange} label="Character's name" path={["counterpart", "name"]} />
              <Field value={packet} onChange={onChange} label="Character's role" path={["counterpart", "role"]} />
            </div>
            <Field value={packet} onChange={onChange} label="How the character talks" path={["counterpart", "voice"]} />
            <Field value={packet} onChange={onChange} label="What the character wants from this conversation" path={["counterpart", "goal"]} />
          </fieldset>

          <fieldset className="card space-y-4">
            <legend className="px-1 text-lg font-extrabold">2. The situation</legend>
            <Field value={packet} onChange={onChange} label="Setting" help="What the learner can already see. Don't give away the cause." path={["setting"]} rows={3} />
            <Field value={packet} onChange={onChange} label={`${n}'s opening line`} path={["opener"]} rows={2} />
          </fieldset>

          <fieldset className="card space-y-5">
            <legend className="px-1 text-lg font-extrabold">3. What {n} knows</legend>
            <div className="space-y-3 rounded-xl bg-paper p-4">
              <p className="text-sm font-bold">The visible pattern <span className="font-normal text-ink/70">· revealed by the first relevant open question</span></p>
              <Field value={packet} onChange={onChange} label="Short label" path={["visible", "label"]} />
              <Field value={packet} onChange={onChange} label={`What ${n} says`} path={["visible", "says"]} rows={2} />
              <Field value={packet} onChange={onChange} label="A relevant question asks about..." help="The AI checks each question against this. Be specific." path={["visible", "topic"]} rows={2} />
            </div>
            <div className="space-y-3 rounded-xl bg-paper p-4">
              <p className="text-sm font-bold">The hidden cause <span className="font-normal text-ink/70">· only a follow-up question about it reveals this. Guessing, planning or general questions never do.</span></p>
              <Field value={packet} onChange={onChange} label="Short label" path={["cause", "label"]} />
              <Field value={packet} onChange={onChange} label={`What ${n} says`} path={["cause", "says"]} rows={3} />
              <Field value={packet} onChange={onChange} label="A relevant question asks about..." path={["cause", "topic"]} rows={2} />
              <Field value={packet} onChange={onChange} label="The cause in a few words" help="Used in endings, such as &ldquo;You found the cause: ...&rdquo;" path={["cause", "short"]} />
            </div>
            <div className="space-y-3 rounded-xl bg-paper p-4">
              <p className="text-sm font-bold">{n}&apos;s own fix <span className="font-normal text-ink/70">· offered when asked for ideas after the cause is known</span></p>
              <Field value={packet} onChange={onChange} label="Short label" path={["ownIdea", "label"]} />
              <Field value={packet} onChange={onChange} label={`What ${n} says`} help="Leave timing out. Timing belongs in the proposal." path={["ownIdea", "says"]} rows={2} />
            </div>
            <div className="space-y-3 rounded-xl bg-paper p-4">
              <p className="text-sm font-bold">The surface fix <span className="font-normal text-ink/70">· what {n} suggests if asked for ideas too early</span></p>
              <Field value={packet} onChange={onChange} label={`What ${n} says`} path={["surfaceIdea", "says"]} rows={2} />
              <Field value={packet} onChange={onChange} label="In a few words" help="Used in feedback, such as &ldquo;That targets ...&rdquo;" path={["surfaceIdea", "short"]} />
            </div>
            <div className="space-y-3 rounded-xl bg-paper p-4">
              <p className="text-sm font-bold">{n}&apos;s proposal <span className="font-normal text-ink/70">· a specific step and a time, offered when asked for a plan. Agreement needs the learner to confirm it.</span></p>
              <Field value={packet} onChange={onChange} label={`What ${n} says`} help="Must include a time or day." path={["proposal", "says"]} rows={2} />
            </div>
            <div className="space-y-3 rounded-xl border-2 border-dashed border-ink/20 p-4">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={hasContext} onChange={(e) => setHasContext(e.target.checked)} className="accent-ink" />
                Optional context <span className="font-normal text-ink/70">· extra background a curious learner can uncover</span>
              </label>
              {hasContext && (
                <>
                  <Field value={packet} onChange={onChange} label="Short label" path={["context", "label"]} />
                  <Field value={packet} onChange={onChange} label={`What ${n} says`} path={["context", "says"]} rows={2} />
                  <Field value={packet} onChange={onChange} label="A relevant question asks about..." path={["context", "topic"]} rows={2} />
                </>
              )}
            </div>
          </fieldset>
        </form>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card !p-4">
            <h2 className="h2">Content check</h2>
            {v.errors.length === 0 && v.warnings.length === 0 && <p className="mt-2 text-sm text-teal-dark">✓ No problems found.</p>}
            {v.errors.length > 0 && <ul className="mt-2 space-y-1 text-sm text-coral-dark">{v.errors.map((e) => <li key={e}>✗ {e}</li>)}</ul>}
            {v.warnings.length > 0 && <ul className="mt-2 space-y-1 text-sm">{v.warnings.map((w) => <li key={w}>! {w}</li>)}</ul>}
          </div>
          <div className="card !p-4">
            <h2 className="h2">Rule checks</h2>
            <p className="mt-1 text-xs text-ink/70">The same checks the site runs before every release, applied to your draft.</p>
            {checks.length === 0 ? (
              <p className="mt-2 text-sm text-ink/80">Fix the content problems above to run the checks.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">{checks.map((c) => <li key={c.name} className={c.pass ? "" : "font-bold text-coral-dark"}>{c.pass ? "✓" : "✗"} {c.name}</li>)}</ul>
            )}
          </div>
          <div className="card space-y-2 !p-4">
            <button
              className="btn-primary w-full"
              disabled={!ready}
              onClick={() => {
                sessionStorage.setItem(DRAFT_KEY, JSON.stringify(effective));
                router.push("/author/play");
              }}
            >
              {ready ? "Playtest this draft" : "Fix the problems to playtest"}
            </button>
            <button className="btn-ghost w-full" onClick={download}>Download as JSON</button>
            <button className="btn-ghost w-full" onClick={() => fileRef.current?.click()}>Load a JSON draft</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
            <button className="link w-full text-sm" onClick={() => { setPacket(EXAMPLE_PACKET); setHasContext(true); }}>Reset to the example</button>
          </div>
          <p className="text-xs text-ink/70">
            Passing these checks means the draft behaves as designed. It doesn&apos;t mean the case is realistic. Have someone who does this work read it. <Link className="link" href="/design#authoring">How the kit works</Link>
          </p>
        </aside>
      </div>
    </section>
  );
}

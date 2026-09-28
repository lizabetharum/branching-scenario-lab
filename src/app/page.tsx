import Link from "next/link";
import { Scene } from "@/components/Scene";
import { scenarios } from "@/lib/scenarios";
import { convoScenarios } from "@/lib/convo";

const PRACTICES = [
  ["Performance first", "Each scenario starts from a behavior an observer could see, not a topic.", "/design#performance"],
  ["Intake before build", "Duration, the moment the skill breaks down, and learner experience set the scope.", "/design#intake"],
  ["Personas as specs", "Characters follow written response rules. Warmth alone doesn't unlock evidence.", "/design#personas"],
  ["Two formats, side by side", "Open conversations built on a fact packet, next to a fixed branching tree. Same guardrails, different trade-offs.", "/design#convo"],
  ["Consequences and recovery", "Mistakes play out, and you can repair them. Repairs stay on the record.", "/design#map"],
  ["AI labels, code scores, people check", "The AI labels what you did on each turn. Code turns those labels into outcomes and scores, so a wrong label means a wrong score. Every label is shown and can be flagged.", "/design#ai"],
  ["Guardrails and privacy", "Personal information, off-topic chat, personal and clinical advice, and rule overrides are caught.", "/design#guardrails"],
];

export default function Home() {
  return (
    <>
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="eyebrow">Branching scenarios for behavior change</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Practice the conversation before it counts.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink/80">
              Three practice conversations in two formats. In the pharmacy scenarios you talk freely, and the character only tells you what your questions earn. In the classroom scenario you move through a fixed branching tree. Every debrief scores what you did, not whether you reached the last screen.
            </p>
            <p className="mt-4 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink/80 ring-1 ring-ink/10">
              Design demonstration. Not yet approved for learner use.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#scenarios" className="btn-primary">Choose a scenario</Link>
              <Link href="/design" className="btn-ghost !px-6 !py-3 !text-base">See how it was designed</Link>
            </div>
          </div>
          <div className="relative pb-10">
            <div className="rotate-[-2deg] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white">
              <Scene scene="pharmacy" mood="thinking" cue="tray" label="A pharmacy technician in a consult room, next to a shared tray of labels." />
            </div>
            <div className="absolute bottom-0 -left-2 w-1/2 rotate-[3deg] overflow-hidden rounded-xl shadow-xl ring-4 ring-white sm:-left-10">
              <Scene scene="classroom" mood="frustrated" label="A frustrated student at a desk with a laptop and a small robot." />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <blockquote className="mx-auto max-w-3xl text-center text-2xl font-bold leading-snug text-ink">
          Success means a change in what people do after the scenario, not finishing it.
        </blockquote>
        <p className="mt-3 text-center text-sm text-ink/70">The design standard for both scenarios, from the research guide behind this app.</p>

        <div id="scenarios" className="mt-12 grid scroll-mt-6 gap-8 lg:grid-cols-3">
          {[
            ...Object.values(convoScenarios).filter((c) => c.caseLabel === "Case A").map((c) => ({
              id: c.id, title: c.title, domain: c.domain, tagline: c.tagline, format: "Open conversation · fact packet",
              who: c.who, scene: "pharmacy" as const, mood: "guarded" as const,
              play: `${c.persona.name}. ${c.persona.gap}`, talk: `${c.counterpart.name}, ${c.counterpart.role.split(",")[0].toLowerCase()}`,
            })),
            ...Object.values(scenarios).map((t) => ({
              id: t.id, title: t.title, domain: t.domain, tagline: t.tagline, format: "Fixed branching tree",
              who: undefined, scene: t.scene, mood: t.nodes[t.start].mood,
              play: t.learnerPersonas.map((p) => p.name).join(" or "), talk: `${t.counterpart.name}, ${t.counterpart.role.charAt(0).toLowerCase() + t.counterpart.role.slice(1)}`,
            })),
          ].map((c) => (
            <article key={c.id} className="card flex flex-col overflow-hidden !p-0">
              <Scene scene={c.scene} who={c.who} mood={c.mood} label={`Opening scene for ${c.title}.`} />
              <div className="flex flex-1 flex-col p-6">
                <p className="eyebrow">{c.domain}</p>
                <h2 className="mt-2 text-2xl font-extrabold">{c.title}</h2>
                <p className="mt-2 inline-block self-start rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">{c.format}</p>
                <p className="mt-3 text-ink/80">{c.tagline}</p>
                <p className="mt-3 text-sm text-ink/70"><b>You play:</b> {c.play} <b>You talk with:</b> {c.talk}.</p>
                <div className="mt-auto pt-5">
                  <Link href={`/scenario/${c.id}`} className="btn-primary">Start</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <h2 className="text-3xl font-extrabold">What the build demonstrates</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRACTICES.map(([t, d, href]) => (
              <Link key={t} href={href} className="rounded-2xl border border-white/15 p-5 transition hover:border-mustard hover:bg-white/5">
                <h3 className="font-bold text-mustard">{t}</h3>
                <p className="mt-2 text-sm text-white/80">{d}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

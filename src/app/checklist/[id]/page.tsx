import { notFound } from "next/navigation";
import { checklistFor } from "@/lib/transfer";
import { PrintButton } from "@/components/PrintButton";

export function generateStaticParams() {
  return ["labels", "labels-b", "pickup", "pickup-b", "jordan"].map((id) => ({ id }));
}

export async function generateMetadata(props: PageProps<"/checklist/[id]">) {
  const { id } = await props.params;
  return { title: `Observation checklist · ${checklistFor(id)?.title ?? ""}`, robots: { index: false } };
}

// A one-page observation checklist for the learner's next real conversation.
// Same behaviors as the debrief, so practice and workplace evidence line up.
export default async function Page(props: PageProps<"/checklist/[id]">) {
  const { id } = await props.params;
  const c = checklistFor(id);
  if (!c) notFound();
  const cols = ["Conversation 1", "Conversation 2", "Conversation 3"];
  return (
    <section className="checklist mx-auto max-w-4xl px-5 py-8">
      <div className="no-print mb-4 flex justify-end"><PrintButton /></div>
      <p className="eyebrow">Observation checklist · {c.title}</p>
      <h1 className="mt-1 text-3xl font-extrabold">Did the practice carry over?</h1>
      <p className="mt-3 text-ink/85">
        For a colleague observing {c.role === "Classroom teacher" ? "a teacher" : "a manager"} in a real conversation. Mark only what you see or hear. If there was no chance for a behavior, mark it &ldquo;no chance,&rdquo; not &ldquo;not seen.&rdquo;
      </p>
      <p className="mt-3 rounded-lg bg-paper p-3 text-sm"><b>Counts as a conversation to observe:</b> {c.eligible}</p>
      <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="p-2">Behavior and what to look for</th>
            {cols.map((h) => <th key={h} className="p-2 text-center">{h}<br /><span className="font-normal">Date: ______</span></th>)}
          </tr>
        </thead>
        <tbody>
          {c.items.map((it) => (
            <tr key={it.id} className="border-b border-ink/20 align-top">
              <td className="p-2"><b>{it.id}. {it.behavior}</b><br /><span className="text-ink/80">Look for: {it.lookFor}</span></td>
              {cols.map((h) => (
                <td key={h} className="p-2 text-center text-xs leading-6">☐ seen<br />☐ partly<br />☐ not seen<br />☐ no chance</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-ink/30 p-3 text-sm"><b>Notes (describe the situation, not the person):</b><div className="h-24" /></div>
        <div className="rounded-lg border border-ink/30 p-3 text-sm">
          <b>Behavior rate:</b> conversations where every behavior was seen ÷ conversations observed (leave out any with &ldquo;no chance&rdquo;).
          <div className="mt-3">______ ÷ ______ = ______</div>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink/70">
        Use fictional or anonymized notes only. This sheet isn&apos;t a performance evaluation and shouldn&apos;t be used for one. It checks whether practice carried over to real work.
      </p>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { delayedCaseFor, delayedPracticeIcs } from "@/lib/transfer";

/**
 * Take it back to work. The debrief is not the end: a commitment, a delayed
 * practice with a new case, and a checklist a peer can use in the next real
 * conversation. Nothing here leaves the browser unless the learner downloads it.
 */
export function TransferCard({ scenarioId, suggestion, evidence }: { scenarioId: string; suggestion: string; evidence: string }) {
  const [commitment, setCommitment] = useState(suggestion);
  // Default: a week from today, in local time.
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const delayed = delayedCaseFor(scenarioId);

  function download() {
    const [y, m, d] = when.split("-").map(Number);
    const ics = delayedPracticeIcs({ origin: window.location.origin, caseId: delayed.id, caseTitle: delayed.title, commitment, when: new Date(y, m - 1, d, 9, 0) });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "delayed-practice.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card mt-6 border-l-8 border-l-teal">
      <h2 className="h2">Take it back to work</h2>
      <p className="mt-1 text-sm text-ink/80">Practice is the start. The change that counts happens in your next real conversation.</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <div>
          <h3 className="font-bold">1. Commit to one thing</h3>
          <label htmlFor="commit" className="mt-1 block text-sm text-ink/80">Next time, I will:</label>
          <textarea id="commit" rows={4} value={commitment} onChange={(e) => setCommitment(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/20 p-3 text-sm" />
          <p className="mt-1 text-xs text-ink/70">Suggested from what was missing. Rewrite it in your own words.</p>
        </div>
        <div>
          <h3 className="font-bold">2. Practice again in a week</h3>
          <p className="mt-1 text-sm text-ink/80">
            A delayed attempt on a new case shows whether the skill held.{" "}
            {delayed.id !== scenarioId ? <>Next up: <Link className="link" href={`/scenario/${delayed.id}`}>{delayed.title}</Link>, a different person and cause.</> : <>Try this scenario again, aiming for independent performance.</>}
          </p>
          <label htmlFor="when" className="mt-2 block text-sm font-semibold">Remind me on</label>
          <input id="when" type="date" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 rounded-lg border-2 border-ink/20 px-2 py-1 text-sm" />
          <button className="btn-ghost mt-3" onClick={download}>Add to my calendar (.ics)</button>
          <p className="mt-1 text-xs text-ink/70">The file is made in your browser. Your commitment goes into the event description, nowhere else.</p>
        </div>
        <div>
          <h3 className="font-bold">3. Get observed</h3>
          <p className="mt-1 text-sm text-ink/80">Print a one-page checklist for a colleague to use in your next real conversation. It uses the same behaviors as this debrief.</p>
          <Link href={`/checklist/${scenarioId}`} className="btn-ghost mt-3" target="_blank">Open the observation checklist</Link>
          <p className="mt-2 text-xs text-ink/70"><b>What would show this worked:</b> {evidence}</p>
        </div>
      </div>
    </div>
  );
}

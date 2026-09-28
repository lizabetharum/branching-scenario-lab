import { convoScenarios } from "./convo";
import { scenarios } from "./scenarios";

// The transfer loop: what happens after the debrief. Delayed practice with a
// new case, and an observation checklist for the next real conversation.
// Everything here is generated in the browser. Nothing is sent or stored.

export interface ChecklistSpec {
  id: string;
  title: string;
  role: string;
  eligible: string;
  items: { id: string; behavior: string; lookFor: string }[];
}

const GROUP_ELIGIBLE: Record<string, string> = {
  marcus: "A conversation with a team member about a pattern: repeated errors, a complaint, a missed standard. Routine check-ins don't count.",
  priya: "A conversation about a change you observed in someone's behavior, before you know the reason for it.",
};

export function checklistFor(id: string): ChecklistSpec | null {
  const c = convoScenarios[id];
  if (c) {
    const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
    const neutral = (t: string) => cap(t.replaceAll(c.counterpart.name, "the other person").replaceAll("Marcus", "the manager").replaceAll("Priya", "the manager"));
    return {
      id,
      title: c.title,
      role: c.persona.name,
      eligible: GROUP_ELIGIBLE[c.caseGroup] ?? "A real conversation where this skill applies.",
      items: c.criteria.map((k) => ({ id: k.id, behavior: neutral(k.label), lookFor: neutral(k.anchors[2]) })),
    };
  }
  if (id === "jordan") {
    return {
      id,
      title: scenarios.jordan.title,
      role: "Classroom teacher",
      eligible: "A student asks you to fix their work, or to tell them what's wrong with it.",
      items: [
        { id: "T1", behavior: "Elicited the student's explanation and evidence", lookFor: "Asked what the student expected, what happened, or what changed, before suggesting anything" },
        { id: "T2", behavior: "Chose one bounded next step", lookFor: "Proposed one change or test and asked the student to predict the result" },
        { id: "T3", behavior: "Kept the student doing the work", lookFor: "The student made every change, and had a specific step whenever the teacher stepped away" },
        { id: "T4", behavior: "Checked the student's reasoning", lookFor: "Asked what the result showed and what it didn't, before moving on" },
      ],
    };
  }
  return null;
}

/** Where to practice next: the other case for the same skill, or the same scenario for the tree. */
export function delayedCaseFor(id: string): { id: string; title: string } {
  const c = convoScenarios[id];
  if (c) {
    const other = Object.values(convoScenarios).find((x) => x.caseGroup === c.caseGroup && x.id !== id);
    if (other) return { id: other.id, title: other.title };
  }
  return { id, title: convoScenarios[id]?.title ?? scenarios[id]?.title ?? id };
}

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");

/** A one-event calendar file. Built in the browser; the learner downloads it. */
export function delayedPracticeIcs(opts: { origin: string; caseId: string; caseTitle: string; commitment: string; when: Date }) {
  const start = opts.when;
  const end = new Date(start.getTime() + 20 * 60_000);
  const url = `${opts.origin}/scenario/${opts.caseId}`;
  const desc = `Delayed practice, about 15 minutes: ${opts.caseTitle}\n${url}\n\nWhat I committed to: ${opts.commitment || "(not written)"}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Branching Scenario Lab//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@branching-scenario-lab`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(`Delayed practice: ${opts.caseTitle}`)}`,
    `DESCRIPTION:${esc(desc)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

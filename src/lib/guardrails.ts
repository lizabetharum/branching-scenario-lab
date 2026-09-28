import type { BoundaryKind } from "./types";

// Shared by the browser and the server. The browser check stops obvious
// personal information before it leaves the device. The server repeats every
// check because the browser can't be trusted.

export const MAX_INPUT = 400;

const PERSONAL_INFO: { label: string; re: RegExp }[] = [
  { label: "an email address", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: "a phone number", re: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/ },
  { label: "a Social Security number", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { label: "a date of birth", re: /\b(dob|date of birth|born on)\b/i },
  { label: "a record or prescription number", re: /\b(mrn|medical record|rx\s*#?\s*\d{4,}|patient id|student id)\b/i },
  { label: "a street address", re: /\b\d{2,5}\s+\w+(\s\w+)?\s(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b/i },
];

export function detectPersonalInfo(text: string): string | null {
  for (const p of PERSONAL_INFO) if (p.re.test(text)) return p.label;
  return null;
}

const OVERRIDE =
  /\b(ignore|disregard|forget)\b.{0,30}\b(instructions|rules|rubric|prompt|role)\b|\b(system prompt|developer mode|jailbreak)\b|\b(give|award|mark)\b.{0,15}\b(me\s+)?(a\s+)?(pass|full (credit|marks)|100)\b|\bshow\b.{0,20}\b(rubric|answer key|correct answers?)\b|\b(evaluator|admin|debug) mode\b|\b(which|what) (option|answer|choice) is (the )?(correct|right|best)\b/i;

export function detectOverride(text: string): boolean {
  return OVERRIDE.test(text);
}

const CLINICAL_INPUT =
  /\b(dos(e|es|age|ing)|\d+\s?(mg|mcg|ml)|milligrams?|max(imum)? daily|overdose|side effects?|contraindicat\w*|drug interactions?|acetaminophen|ibuprofen|insulin|opioids?|antibiotics?|warfarin|what should (i|we) (give|prescribe))\b/i;

/** Clinical questions are caught before the model so the answer never depends on model behavior. */
export function detectClinical(text: string): boolean {
  return CLINICAL_INPUT.test(text);
}

export const BOUNDARY_MESSAGES: Record<BoundaryKind, string> = {
  personal_info:
    "This looks like it includes real personal information. It was not sent to the AI model. Rewrite it with fictional details.",
  off_topic:
    "This practice space only covers the scenario in front of you. Respond to the last thing the character said.",
  personal_advice:
    "This tool can't give personal, legal, financial, medical or career advice. For that, talk to a qualified person you trust. To keep practicing, respond to the character.",
  clinical_advice:
    "This is a coaching simulation, not clinical decision support. It won't answer medication, dosing or patient-care questions. Use your organization's approved references and a pharmacist or clinician.",
  rule_override:
    "Requests to change the rules, reveal the rubric or award a pass don't change the scenario or your results. The rules and scoring are fixed in code, and a request can't change them.",
  unclear:
    "I couldn't match your reply to a response this scenario recognizes, so I didn't guess. Try saying it another way.",
  too_long: `Keep replies under ${MAX_INPUT} characters. In a real conversation this would be several turns.`,
  rate_limited: "Too many messages in a short time. Wait a minute and try again.",
};

/** Words that must never appear in a character reply. If they do, the app uses the authored line. */
const LEAK = /\b(rubric|criteri(on|a)|branch|node|ending|E[123]|score|pass(ed)?|system prompt|as an ai|language model)\b/i;
const CLINICAL = /\b(\d+\s?mg|mcg|dose|dosage|milligrams?|prescribe|diagnos\w*|overdose|drug interactions?|allerg\w*)\b/i;

/** Boundaries where the fixed tree can offer its scripted options as a way forward. */
export const TREE_FALLBACK: BoundaryKind[] = ["personal_info", "off_topic", "unclear", "rate_limited"];

/** Times, days and deadlines. A character may only mention one if a fact it can say contains one. */
export const TIME_WORDS = /\b(next week|this week|in a (couple|few) (of )?(days|weeks)|couple (of )?weeks|tomorrow|tonight|today|this afternoon|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|end of (the )?(day|week|shift)|\d{1,2}(:\d{2})?\s?(am|pm))\b/i;

export function replyIsSafe(reply: string, scene: "classroom" | "pharmacy"): boolean {
  if (!reply || reply.length > 360) return false;
  if (LEAK.test(reply)) return false;
  if (scene === "pharmacy" && CLINICAL.test(reply)) return false;
  return true;
}

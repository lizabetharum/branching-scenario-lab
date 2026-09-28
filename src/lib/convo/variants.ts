import type { ConvoScenario } from "./types";
import { labels, makeLabelsEvaluate } from "./labels";
import { makePickupEvaluate, pickup } from "./pickup";

// Case B for each persona: the same skill, rules and criteria, with a different
// person, a different surface problem and a different hidden cause. A learner
// who memorized case A's conversation gets no help here. That makes case B a
// "new task" in the evidence plan. Facts and dialogue are original and untested.

const rename = (c: ConvoScenario["criteria"], from: string, to: string) =>
  c.map((x) => ({ ...x, label: x.label.replaceAll(from, to), anchors: x.anchors.map((a) => a.replaceAll(from, to)) as [string, string, string] }));

export const labelsB: ConvoScenario = {
  ...labels,
  id: "labels-b",
  caseLabel: "Case B",
  title: "The Phone Number Conversation",
  tagline: "You're Marcus again. A different technician, a different error pattern. Same skill: explore before you interpret.",
  who: "ana",
  counterpart: {
    name: "Ana",
    role: "Pharmacy technician at Gilbert's, four years on the team",
    goal: "Get the conversation over with and get back to drop-off.",
    voice: "Direct and a little tired. Takes mistakes personally. Speaks in short sentences.",
    boundaries: ["Never mentions drugs, doses or patients.", "Doesn't volunteer facts that weren't asked for.", "Doesn't open up because the manager sounds friendly."],
  },
  setting:
    "Monday, 11:40 a.m. In two weeks, three prescriptions entered at Ana's station had the wrong customer phone number, so pickup texts went to the wrong person. Each was caught when the customer called. You asked Ana to step into the consult room.",
  opener: "Is this about the text messages? I heard. I'll double-check the numbers.",
  prebrief: labels.prebrief.map((p) => p.replaceAll("Sam", "Ana")),
  guardLines: ["Sure. What else?", "I don't know. It just happens.", "I said I'll double-check.", "Fine. I'll double-check everything."],
  facts: [
    {
      id: "pattern",
      label: "It happens Monday mornings, when Ana covers the phone and drop-off at once",
      text: "It's mostly Monday mornings. Ana covers the phone line and drop-off until ten, so she's typing while someone is on hold.",
      says: "It's mostly Monday mornings. I've got the phone and drop-off until ten, so I'm typing while somebody's on hold.",
      keywords: ["monday", "on hold", "phone line", "until ten"],
      release: { anyOf: ["open"], minValidOpens: 1, maxGuard: 2 },
      hint: "You don't know why the numbers are wrong yet. Ask something Ana has to describe, without suggesting a cause.",
    },
    {
      id: "form",
      label: "The new intake form puts the prescriber's phone right above the customer's",
      text: "The new intake form puts the prescriber's office phone directly above the customer's phone. When Ana is rushing, she types whichever number her eye lands on.",
      says: "The new intake form has the doctor's office number right above the customer's. When I'm rushing, I type whichever one my eye lands on.",
      keywords: ["form", "field", "office number", "doctor's", "above the"],
      release: { anyOf: ["open"], requires: ["pattern"], minValidOpens: 2, maxGuard: 1 },
      key: true,
      cue: "form",
      hint: "You know when it happens. Ask how Ana actually enters a number when she's juggling the phone.",
    },
    {
      id: "idea",
      label: "Ana's idea: read the number back at drop-off, and ask to swap the form fields",
      text: "Ana's idea: read the phone number back to the customer at drop-off, and ask whether the form could put the customer's number first.",
      says: "What if I read the number back to them at drop-off? And could we ask to put the customer's number first on the form?",
      keywords: ["read the number", "read it back", "read back", "number first"],
      release: { anyOf: ["askOptions"], requires: ["form"], maxGuard: 2 },
      idea: true,
      hint: "Ana knows the form better than you. Ask for Ana's ideas before offering yours.",
    },
    {
      id: "surfaceIdea",
      optional: true,
      label: "Ana's surface idea: type slower",
      text: "Without the real cause on the table, Ana's only idea is to type more slowly.",
      says: "I guess I could just type slower?",
      keywords: ["type slower", "slow down"],
      release: { anyOf: ["askOptions"], maxGuard: 2 },
      idea: true,
      hint: "Ask for Ana's ideas.",
    },
    {
      id: "history",
      optional: true,
      label: "The form changed a month ago without asking the techs",
      text: "The intake form changed about a month ago. Nobody asked the technicians about the layout.",
      says: "They changed that form about a month ago. Nobody asked us about it.",
      keywords: ["month ago", "nobody asked"],
      release: { anyOf: ["open", "acknowledge"], requires: ["form"], maxGuard: 1 },
      hint: "Optional: ask when the form changed.",
    },
  ],
  endings: {
    plan_key: { id: "plan_key", title: "Plan agreed, cause found", text: "Ana heads back with a plan aimed at the form and a read-back at drop-off. Check the criteria below. Reaching a plan doesn't mean every criterion was met." },
    plan_surface: { id: "plan_surface", title: "Plan agreed, cause missed", text: "Ana agrees to type slower. The form layout never came up, so next Monday will likely look the same." },
    closed: { id: "closed", title: "Ended without a plan", text: "Ana goes back to drop-off. Nothing in the conversation targets why the numbers are wrong." },
    time: { id: "time", title: "Out of time", text: "The phone starts ringing and Ana has to go. The conversation stopped before a plan." },
  },
  criteria: rename(labels.criteria, "Sam", "Ana"),
  evaluate: makeLabelsEvaluate({ name: "Ana", cause: "the intake form", surface: "typing speed" }),
};

export const pickupB: ConvoScenario = {
  ...pickup,
  id: "pickup-b",
  caseLabel: "Case B",
  title: "The Missed Huddles",
  tagline: "You're Priya again. A different technician, a different change in behavior. Same idea: asking finds what watching can't.",
  who: "luis",
  counterpart: {
    name: "Luis",
    role: "Pharmacy technician at Gilbert's, two years on the team, usually the friendliest person there",
    goal: "Find out if he's in trouble, and get back to his queue.",
    voice: "Warm but stretched thin. A little embarrassed. Doesn't complain unless invited.",
    boundaries: ["Never mentions drugs, doses or patients.", "Agrees with any answer the manager supplies instead of correcting it.", "Doesn't explain until the manager says why they're talking."],
  },
  setting:
    "Thursday, 12:10 p.m. Luis has skipped the morning huddle twice this week, and a coworker told you Luis snapped at them yesterday. Luis is usually the friendliest person on the team. You asked Luis to step into the consult room.",
  opener: "Hey. Did I do something wrong?",
  intake: {
    ...pickup.intake,
    situation: "A usually friendly technician starts skipping huddles and snapping at coworkers. What a manager sees points one way. The reason only comes out if she asks.",
  },
  prebrief: pickup.prebrief.map((p) => p.replaceAll("Dev", "Luis")),
  guardLines: ["Sure. What else?", "Okay... I'm not sure what you're asking.", "I've been getting my work done.", "Fine. I'll be at huddle."],
  facts: [
    {
      id: "busier",
      label: "Luis has had a lot more on his plate lately",
      text: "Luis has had a lot more on his plate for the last few weeks and feels behind.",
      says: "I've just had a lot on my plate lately. I feel behind all the time.",
      keywords: ["on my plate", "behind"],
      release: { anyOf: ["open"], needsConcern: true, maxGuard: 2 },
      hint: "You know he's stretched. Ask what's been added to his day.",
    },
    {
      id: "training",
      label: "Luis has been training two new hires at his own station since last month",
      text: "Since the two new hires started last month, Luis has been training them at his own station. His own queue backs up, so he skips huddle to catch up.",
      says: "Since the two new hires started, I've been training them at my station. My own queue backs up, so I skip huddle to catch up.",
      keywords: ["new hire", "training", "train them", "my queue"],
      release: { anyOf: ["open"], requires: ["busier"], minValidOpens: 2, maxGuard: 1 },
      key: true,
      cue: "training",
      hint: "You know he's behind. Ask what's changed about his day since last month.",
    },
    {
      id: "idea",
      label: "Luis's idea: a set training hour instead of all day",
      text: "Luis's idea: set one training hour a day instead of training all day, so he can keep up with his own work.",
      says: "If training could be a set hour, not all day, I could keep up with my own work.",
      keywords: ["set hour", "training hour", "one hour"],
      release: { anyOf: ["askOptions"], requires: ["training"], maxGuard: 2 },
      idea: true,
      hint: "Ask Luis what would help. You don't need a solution ready.",
    },
    {
      id: "surfaceIdea",
      optional: true,
      label: "Luis's surface idea: be more patient",
      text: "Without the real cause on the table, Luis's only idea is to try to be more patient.",
      says: "I guess I could try to be more patient?",
      keywords: ["more patient"],
      release: { anyOf: ["askOptions"], maxGuard: 2 },
      idea: true,
      hint: "Ask for Luis's ideas.",
    },
    {
      id: "unaware",
      optional: true,
      label: "Nobody told the team Luis was training",
      text: "Nobody told the rest of the team Luis was training, so they think he's just slow.",
      says: "Nobody told the team I'm training them, so everyone thinks I'm just slow.",
      keywords: ["nobody told", "just slow"],
      release: { anyOf: ["open", "acknowledge"], requires: ["training"], maxGuard: 1 },
      cue: "training",
      hint: "Optional: ask whether the team knows.",
    },
  ],
  endings: {
    plan_key: { id: "plan_key", title: "Plan agreed, cause found", text: "Luis heads back with a set training hour. What you saw at huddle had a cause you couldn't see from there." },
    plan_surface: { id: "plan_surface", title: "Plan agreed, cause missed", text: "Luis agrees to be more patient. The training load never came up, so he'll keep skipping huddle to catch up." },
    closed: { id: "closed", title: "Ended without a plan", text: "Luis goes back to his station, unsure what the conversation was about." },
    time: { id: "time", title: "Out of time", text: "Luis's queue is backing up and he has to go. The conversation stopped before a plan." },
  },
  criteria: rename(pickup.criteria, "Dev", "Luis").map((c) => (c.id === "Q3" ? { ...c, anchors: ["Nothing beyond what was visible at huddle", "Learned Luis feels behind, but not why", "Learned about the training load"] as [string, string, string] } : c)),
  evaluate: makePickupEvaluate({ name: "Luis", keyId: "training", stepId: "busier", keyText: "training the new hires", stepText: "Luis feels behind", stepNext: "Ask what's changed about his day since last month.", vantage: "at huddle" }),
  reflection:
    "What did Luis tell you that you couldn't have seen at huddle? Explain why asking surfaced it when watching didn't. Then give one example from your own team. Describe the situation, not the person. Leave out names.",
};

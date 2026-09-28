import type { CriterionResult, LearnerPersona } from "../types";

// Fact-packet scenarios. There is no fixed tree. The counterpart holds facts,
// and each fact has a release rule the app checks in code after every turn.

/** Observable behaviors the tagger can assign to a learner turn. */
export const BEHAVIORS = {
  open: "Asks an open, exploratory question the other person has to describe or explain (what, how, walk me through, tell me more). Does not suggest the answer.",
  closed: "Asks a yes/no or single-fact question.",
  leading: "Asks a question that suggests its own answer or proposes a cause for the other person to confirm (\"Don't you think...\", \"Is it because...\", \"Wouldn't X fix it?\").",
  selfAnswer: "Asks a question and then answers it in the same turn, or immediately offers the likely answer.",
  interpretation: "States a new cause, judgment or conclusion about the person or the situation. Restating, summarizing or checking something the other person already said is not interpretation. Label that acknowledge (or closed, if it is a yes/no check).",
  instruction: "Tells the person what to do, or supplies the plan or solution.",
  askOptions: "Asks the person for their ideas, options or what they think would work.",
  wayForward: "Asks for or agrees on a specific next step and who will do it.",
  checkin: "Sets or asks for a follow-up time or date to review how it's going.",
  acknowledge: "Acknowledges or reflects back what the person said, or repairs an earlier move (\"I jumped ahead\", \"I put words in your mouth\").",
  namesConcern: "States plainly why the conversation is happening or what was observed.",
  overSoften: "Apologizes, minimizes or hedges so much that the purpose of the conversation becomes unclear (\"Sorry, it's probably nothing, don't worry\").",
  confirms: "Confirms or accepts a specific step and timing the other person just proposed (\"Friday works, let's do it\"). Asking for a plan is not confirming one.",
  closes: "Ends or wraps up the conversation.",
} as const;
export type Behavior = keyof typeof BEHAVIORS;

export interface Fact {
  id: string;
  /** Short name used in the debrief. */
  label: string;
  /** What the counterpart knows. The counterpart may only use released facts. */
  text: string;
  /** Authored line used when the model's reply is unusable. */
  says: string;
  /** Words that indicate the fact was mentioned. Used to catch early leaks. */
  keywords: string[];
  release: {
    /** Released on a turn that shows any of these behaviors. */
    anyOf: Behavior[];
    requires?: string[];
    minValidOpens?: number;
    /** Requires the concern to have been named at some point. */
    needsConcern?: boolean;
    /** Requires the learner to have supplied a plan themselves at some point. */
    needsInstruction?: boolean;
    /** Never releases once any of these facts has released. */
    unless?: string[];
    maxGuard: number;
  };
  /**
   * What a relevant question is about. When set, the fact only releases if the
   * tagger marks the learner's message as addressing this probe. Counting
   * questions is not enough.
   */
  probe?: string;
  /** A specific step and time the counterpart proposes. Only one ever releases. */
  commitment?: "own" | "surface" | "manager";
  /** The fact observation alone can't provide. */
  key?: boolean;
  /** A plan idea from the counterpart. */
  idea?: boolean;
  /** Scene cue shown once released. */
  cue?: string;
  /** Not needed for a good outcome. Skipped by hints. */
  optional?: boolean;
  /** Hint when this is the next fact to find. */
  hint: string;
}

export interface ConvoTurn {
  learner: string;
  reply: string;
  tags: Behavior[];
  /** Topics the tagger said the message was about. Optional for older review links. */
  addresses?: string[];
  released: string[];
  hintBefore: boolean;
  guardAfter: number;
}

export interface ConvoEndingText {
  id: ConvoEnding["id"];
  title: string;
  text: string;
  /** Used instead of text when the learner uncovered the key fact. */
  textWithCause?: string;
}

export interface ConvoEnding {
  id: "plan_key" | "plan_surface" | "unconfirmed" | "closed" | "time";
  kind: "met" | "partial" | "missed";
  title: string;
  text: string;
}

export interface ConvoScenario {
  id: string;
  format: "conversation";
  /** Cases in the same group practice the same skill with different facts. */
  caseGroup: string;
  caseLabel: string;
  title: string;
  domain: string;
  tagline: string;
  who: "sam" | "dev" | "ana" | "luis";
  persona: LearnerPersona;
  counterpart: { name: string; role: string; goal: string; voice: string; boundaries: string[] };
  intake: { duration: string; situation: string; experience: string };
  objective: string;
  transferEvidence: string;
  insufficientEvidence: string;
  prebrief: string[];
  setting: string;
  opener: string;
  guardStart: number;
  /** Tone for each guard level, 0 (open) to 3 (shut down). */
  guardTone: [string, string, string, string];
  /** Authored replies when no fact is released, by guard level. */
  guardLines: [string, string, string, string];
  /** Authored noncommittal reply to a guess. */
  guessLine?: string;
  facts: Fact[];
  maxTurns: number;
  endings: Record<ConvoEnding["id"], ConvoEndingText>;
  criteria: { id: string; label: string; anchors: [string, string, string] }[];
  evaluate: (turns: ConvoTurn[], released: string[]) => CriterionResult[];
  framework?: import("../types").Framework;
  reflection?: string;
}

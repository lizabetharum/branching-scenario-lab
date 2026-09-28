// Core data model for authored branching scenarios.
// The map is authored. The AI may vary wording inside a node, but only the
// application decides which node comes next and how criteria are scored.

export type Quality = "good" | "partial" | "poor"; // author-only label, never shown during play

export type Mood = "neutral" | "frustrated" | "guarded" | "engaged" | "thinking" | "proud";

export type MoveTag =
  | "open" // open, exploratory question
  | "leading" // question that suggests its own answer
  | "closed" // yes/no question
  | "interpretation" // manager or teacher states a conclusion or fix
  | "takeover" // adult does the work for the learner
  | "elicit" // asks for expected result, observed result, recent change
  | "bounded" // one testable next step
  | "overload" // several changes at once
  | "verify" // checks reasoning
  | "repair" // recognizes an earlier move and recovers
  | "employeeOptions" // asks the employee to generate options
  | "managerOptions" // manager supplies the plan
  | "wayForward" // specific next step plus check-in
  | "unfocused" // vague prompt with no focus
  | "triage" // handles an interruption while leaving the learner a next step
  | "noStep"; // walks away without leaving the learner a next step

export interface Move {
  id: string;
  /** Scripted option text shown to the learner. */
  label: string;
  /** What this response category means. Used by the AI classifier. */
  category: string;
  quality: Quality;
  tags: MoveTag[];
  /** Narrated consequence, shown after the counterpart reply. */
  consequence: string;
  /** The authored counterpart line. The AI may rephrase it, never add facts. */
  reply: string;
  mood: Mood;
  next: string;
  /** What this choice cost, shown in the debrief apart from the scores. */
  tradeoff?: string;
}

export interface ScenarioNode {
  id: string;
  title: string; // author-facing name, e.g. "D1: Diagnose"
  situation: string;
  /** Counterpart line that opens the node (only for the start node or when arriving without a move reply). */
  opener?: string;
  mood: Mood;
  moves: Move[];
  hint: string;
  /** Optional framework stage shown to learners who get proactive support. */
  stage?: string;
  /** Visual cue to make relevant information noticeable in the scene. */
  cue?: string;
  /** Layout for the branch map (column, row). */
  pos: [number, number];
}

export interface Ending {
  id: string;
  title: string;
  kind: "met" | "partial" | "missed";
  text: string;
  mood: Mood;
  pos: [number, number];
}

/**
 * Rubric scale (learner-performance rubric):
 * 2 demonstrated   = carried out in the learner's own words
 * 1 recognized     = chose the right action from scripted options (recognition, not execution)
 * 1 partial        = some of the behavior, or only after the first interpretation
 * 0 not_observed   = not demonstrated despite a fair opportunity
 * NE not_evaluable = no fair opportunity, or a system failure invalidated the evidence
 */
export type CriterionStatus = "demonstrated" | "recognized" | "partial" | "not_observed" | "not_evaluable";
export type Support = "independent" | "after_recovery" | "with_hint" | "n/a";

export interface CriterionResult {
  id: string;
  label: string;
  status: CriterionStatus;
  support: Support;
  /** How the evidence was produced. */
  via: "own_words" | "selected" | "none";
  evidence: string;
  nextStep: string;
}

export interface LearnerPersona {
  id: string;
  name: string;
  summary: string;
  gap: string;
  objective: string;
  /** Novices get proactive support. Experienced practitioners get hints on request. */
  support: "proactive" | "on_request";
  reflection?: string;
}

export interface Counterpart {
  name: string;
  role: string;
  goal: string;
  facts: string[];
  responseRules: string[];
  boundaries: string[];
}

export interface Drill {
  nodeId: string;
  /** Who says the line, if not the scenario's main counterpart. */
  speaker?: string;
  /** Framework stage shown as a label, if the scenario uses one. */
  stage?: string;
  /** The character line the learner responds to. */
  line: string;
  /** What the learner is practicing, in plain words. */
  goal: string;
}

export interface Framework {
  name: string;
  summary: string;
  steps: { letter: string; name: string; purpose: string }[];
  note: string;
}

export interface Scenario {
  id: string;
  title: string;
  domain: string;
  tagline: string;
  scene: "classroom" | "pharmacy";
  intake: { duration: string; situation: string; experience: string };
  objective: string;
  transferEvidence: string;
  insufficientEvidence: string;
  prebrief: string[];
  counterpart: Counterpart;
  learnerPersonas: LearnerPersona[];
  start: string;
  nodes: Record<string, ScenarioNode>;
  endings: Record<string, Ending>;
  criteria: { id: string; label: string }[];
  framework?: Framework;
  /** Key moments for the wording practice after the scenario. */
  drills: Drill[];
  evaluate: (history: Turn[]) => CriterionResult[];
  sources: string[];
}

export interface Turn {
  nodeId: string;
  moveId: string;
  mode: "choice" | "free";
  learnerText: string;
  counterpartText: string;
  hintBefore: boolean;
  afterRecovery: boolean;
}

export type BoundaryKind =
  | "personal_info"
  | "off_topic"
  | "personal_advice"
  | "clinical_advice"
  | "rule_override"
  | "unclear"
  | "too_long"
  | "rate_limited";

export interface TurnResponse {
  ok: true;
  kind: "move";
  moveId: string;
  counterpartText: string;
  aiVaried: boolean;
}

export interface BoundaryResponse {
  ok: true;
  kind: "boundary";
  boundary: BoundaryKind;
  message: string;
  sentToModel: boolean;
}

export interface FailureResponse {
  ok: false;
  kind: "system_failure";
  message: string;
}

export type ApiResponse = TurnResponse | BoundaryResponse | FailureResponse;

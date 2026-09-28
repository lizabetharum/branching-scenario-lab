import { scenarios } from "@/lib/scenarios";
import { testRun } from "@/lib/test-results";
import { DEFAULT_MODEL } from "@/lib/model";

// The scenario-design template and review rubric, filled in for this build.
// Tables that describe the map are generated from the scenario data, so they
// can't drift from what runs.

export const VERSION = "v1.3";
export const VERSION_DATE = "2026-09-28";

const BRIEF = {
  grow: {
    current: "A manager sees an error pattern and opens with a verdict or a leading question (\"You need to slow down\").",
    desired: "The manager asks at least two open questions before interpreting, asks no leading questions, and closes with a plan the technician helped build.",
    gap: "None collected. The scenario is fictional. Before real use, confirm the gap through manager interviews, observed coaching conversations or incident reviews.",
    barriers: "Register staffing during the rush and a shared label tray. These are workflow problems. A pharmacy operations owner would address them. The scenario shows them but can't fix them.",
    why: "What Sam reveals depends on the kind of question. The shared tray only appears after a second open question, so earlier moves change later evidence.",
    simpler: "A GROW job aid with a worked example. It would teach the steps but not the moment-to-moment choice between asking and telling.",
    outOfScope: "Clinical judgment, medication safety, formal discipline and HR processes.",
  },
  jordan: {
    current: "A teacher, short on time, fixes the student's project or offers encouragement with no next step.",
    desired: "The teacher elicits the student's evidence, proposes one bounded test, keeps the student doing the work and checks the student's reasoning.",
    gap: "None collected. The example comes from the research guide. Before real use, confirm it through classroom observation or teacher interviews.",
    barriers: "Short work sessions and many students waiting. Scheduling and support staffing sit outside this scenario.",
    why: "Taking over makes the project work but closes off the student's reasoning. Recovery paths show whether a teacher can hand control back.",
    simpler: "A case discussion. It would surface the idea but not practice the wording under the pressure of \"Can you just fix it?\"",
    outOfScope: "Debugging content knowledge and classroom management.",
  },
} as const;

const ALIGN = {
  grow: [
    ["B1", "Asks two or more open, exploratory questions before stating any interpretation", "G1, G2, G2b, RL, RT, OM", "P1", "Scored count of open questions before first interpretation in a real coaching conversation"],
    ["B2", "Asks no leading questions", "G1, G3", "P2", "Count of leading questions in the same observed conversation"],
    ["B3", "Asks the employee to generate options before offering any", "G3, OM", "P3", "Observer notes who proposed the adopted option"],
    ["B4", "Closes with a specific next step and a check-in", "W1", "P4", "Written plan or observer note with owner and date"],
  ],
  jordan: [
    ["B1", "Elicits expected result, observed result or recent change before choosing a step", "D1, D1b, R1", "T1", "Observed student help request, teacher's first move recorded"],
    ["B2", "Proposes one bounded test and asks for a prediction", "D2, R2", "T2", "Observer records the next step given"],
    ["B3", "Keeps the student making the changes", "D1, D1b, R1", "T3", "Observer records who touched the work"],
    ["B4", "Asks the student to explain what the result shows and doesn't", "D3", "T4", "Observer records a reasoning check before the teacher leaves"],
  ],
} as const;

const ANCHORS = {
  grow: [
    ["P1", "No open question before the first interpretation, leading question or supplied plan", "One open question before interpreting, or two only after an interpretation (recovery)", "Two or more open questions before any interpretation"],
    ["P2", "One or more leading questions", "Not used. The persona objective requires zero leading questions.", "No leading questions"],
    ["P3", "The manager supplies the option, or options never come up", "Not used in this version. No authored move represents a shared option.", "Sam proposes the option the plan uses"],
    ["P4", "Ends without a first step and a check-in, or the manager takes the step over", "Not used in this version", "Sam names a first step and a check-in date is set"],
  ],
  jordan: [
    ["T1", "Fixes, reassures or directs without asking what Jordan expected, saw or changed", "Not used in this version. The vague \"explain your thinking\" move loops back without credit.", "Asks for the expected result, the observed result or a recent change"],
    ["T2", "Gives several changes at once, or trial and error", "Not used in this version", "Proposes one change and asks for a prediction"],
    ["T3", "Makes the change for Jordan and moves on", "Takes over, then hands control back (recovery)", "Jordan makes and tests every change"],
    ["T4", "Ends on \"it works\" or explains the result for Jordan", "Not used in this version", "Asks what the result shows and what it doesn't"],
  ],
} as const;

const REVISIONS = [
  ["RV-01", "Every free-text turn failed in production. The Vercel AI Gateway free tier blocks Claude models.", "Critical", "Hosting configuration", "Call the Anthropic API directly with the project's API key.", "T01–T16"],
  ["RV-02", "A clinical dosing question (T15) timed out and showed as a system failure instead of a clinical boundary.", "Major", "Depended on model latency for a safety boundary", "Added a server-side clinical word filter that runs before the model.", "T15"],
  ["RV-03", "A disguised instruction attack (T10) was classified \"unclear.\" Safe, since nothing changed, but mislabeled.", "Minor", "Override pattern too narrow", "Added evaluator-mode and \"which option is correct\" patterns.", "T09, T10"],
  ["RV-04", "The clinical filter matched \"diagnose,\" a normal word for teachers debugging a project.", "Minor", "Filter too broad", "Removed diagnosis and symptom terms. The model still classifies clinical questions.", "T04, T15"],
  ["RV-05", "Choosing a scripted option scored \"demonstrated.\" Rubric red flag: recognition substituted for execution (C2).", "Major", "Scoring did not record how evidence was produced", "Scripted selections now score \"recognized\" (1). Only the learner's own words score 2.", "check-maps regression"],
  ["RV-06", "Attempts interrupted by an AI failure still scored unfinished criteria as 0. Rubric red flag: misclassified failure.", "Major", "No not-evaluable status", "Added NE. Criteria already demonstrated keep their evidence.", "check-maps regression"],
  ["RV-07", "The only way to practice actual wording was free text mid-scenario. Learners who used scripted options never practiced saying the move.", "Major", "Recognition-only path", "Added a wording practice after the debrief with optional voice input. Model answer hidden until the first attempt.", "Manual check. Voice needs browser testing."],
] as const;

const RATINGS: [string, string, string, string, string, string][] = [
  ["C1 Performance problem", "1", "Objectives, briefs", "Observable objectives. No evidence of the gap.", "Major", "Collect gap evidence before learner use. Design owner."],
  ["C2 Alignment and assessment", "1", "Alignment table, rubric, RV-05, wording practice", "Behavior-to-node-to-rubric map exists. Recognition is scored apart from execution, and a spoken or typed wording practice follows every run. Not independently reviewed.", "Minor", "External design review"],
  ["C3 Personas and roles", "1", "Counterpart cards, persona objectives", "Coherent and written. Not reviewed by pharmacy leaders or teachers.", "Minor", "SME review"],
  ["C4 Decisions and alternatives", "1", "Node register, T02, T04", "Plausible options, shuffled order, equivalent wording accepted in tests. No learner think-aloud yet.", "Minor", "Learner testing"],
  ["C5 Consequences and state", "2", "check-maps.ts", "Every state reachable, no dead ends, history kept across recovery merges.", "None", "Rerun on every map change"],
  ["C6 Failure and recovery", "2", "Failure table, RV-06, T16", "Five failure types separated and tested. Step back and restart work.", "None", "Confirm with learners"],
  ["C7 Feedback and debrief", "1", "Debrief, feedback contract", "Cites the learner's words, gives one next step, no trait judgments. Not tested with learners.", "Minor", "Learner testing"],
  ["C8 Learner scoring", "1", "Rubric anchors, RV-05, RV-06", "Anchors defined. Several 1-level anchors unused. No independent human rating.", "Major", "Rater calibration on a sample"],
  ["C9 Accessibility and usability", "1", "Accessibility plan below", "Built to WCAG 2.2 practices. No assistive-technology testing.", "Major", "AT user testing"],
  ["C10 Privacy and appropriate use", "1", "Data register, route code", "No storage or text logging, verified in code. Anthropic API terms not reviewed by a privacy owner.", "Major", "Privacy review"],
  ["C11 Testing and revision", "2", "T01–T16, revision log", "Risk-based cases pass on the deployed configuration. One run per case.", "Minor", "Repeated runs"],
  ["C12 Transfer evaluation", "1", "Evidence plan", "Plan drafted. No owner, no authorization, no baseline.", "Major", "Assign evaluation owner"],
  ["A1 Bounded roles and facts", "2", "Route code, T05, T09, T10", "Transitions and scoring enforced in code. Replies limited to authored lines and filtered.", "None", "Monitor in pilot"],
  ["A2 Evaluation reliability", "1", "T01–T08", "Correct on single runs. No repeated runs or human comparison.", "Major", "Repeat each case 5+ times"],
  ["A3 Resilience and lifecycle", "1", "T09–T16, model.ts", "Boundaries and failure recovery tested. No monitoring owner or automated regression gate.", "Major", "Add CI gate and owner"],
  ["H1 Clinical validity and roles", "1", "Scenario facts", "No clinical content by design. Pharmacy workflow not reviewed by a pharmacy professional.", "Major", "Pharmacy SME review"],
  ["H2 Prebrief and debrief", "1", "Prebrief, pause control", "Stakes, fiction, pause and recording stated. No facilitator process.", "Major", "Facilitator guide"],
  ["H3 Confidentiality and claims", "1", "Data register, claims language", "Synthetic material, no outcome claims. Staff-data use decision not made by an authority.", "Minor", "Institutional decision"],
];

function NodeRegister({ id }: { id: "grow" | "jordan" }) {
  const s = scenarios[id];
  return (
    <details className="mt-4 rounded-xl border border-ink/15 bg-white p-4">
      <summary className="cursor-pointer font-bold">Node register: {s.title} ({Object.values(s.nodes).reduce((n, x) => n + x.moves.length, 0)} transitions)</summary>
      <div className="overflow-x-auto">
        <table>
          <thead><tr><th>Node</th><th>Evidence available</th><th>Response category</th><th>Consequence</th><th>Next</th><th>Author label</th></tr></thead>
          <tbody>
            {Object.values(s.nodes).flatMap((n) =>
              n.moves.map((m, i) => (
                <tr key={m.id}>
                  <td>{i === 0 ? <b>{n.title}</b> : ""}</td>
                  <td>{i === 0 ? n.situation : ""}</td>
                  <td>{m.category}</td>
                  <td>{m.consequence}</td>
                  <td>{m.next}</td>
                  <td>{m.quality}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function DesignRecord() {
  const { grow, jordan } = scenarios;
  const sample = (tid: string) => testRun?.cases.find((c) => c.id === tid);
  const samples: [string, string, string][] = [
    ["I1", "Effective first attempt", "T01"],
    ["I2", "Partial response", "T07"],
    ["I3", "Error then repair", "T06"],
    ["I4", "Alternative valid approach", "T04"],
    ["I5", "Safety or privacy boundary", "T11"],
    ["I6", "Ambiguity or system failure", "T08"],
  ];

  return (
    <>
      <h2 id="record">Design record</h2>
      <p>
        This section fills in the scenario-design template for this build. The template separates a proposed rule, a reviewed rule and a tested result. So does this record.
      </p>
      <table>
        <tbody>
          <tr><td><b>Scenario IDs and version</b></td><td><code>grow</code> and <code>jordan</code>, {VERSION}, {VERSION_DATE}</td></tr>
          <tr><td><b>Design and technical owner</b></td><td>Lizabeth Arum</td></tr>
          <tr><td><b>Subject-matter, evaluation and privacy owners</b></td><td>Not assigned. Required before learner use.</td></tr>
          <tr><td><b>Audience and setting</b></td><td>Pharmacy leaders with some coaching experience. Teachers who help students one-on-one. Self-paced, on the web.</td></tr>
          <tr><td><b>Format</b></td><td>Hybrid. An authored map, with AI-classified free text or scripted choices. Model: <code>{DEFAULT_MODEL}</code>.</td></tr>
          <tr><td><b>Stage and use</b></td><td>Prototype. Practice only. No decision depends on the results.</td></tr>
          <tr><td><b>Versioned artifacts</b></td><td>Maps in <code>src/lib/scenarios/</code>. Prompt in <code>src/lib/prompts.ts</code>. Guardrails in <code>src/lib/guardrails.ts</code>. Tests in <code>scripts/</code>. History in git.</td></tr>
          <tr><td><b>Review triggers</b></td><td>Any change to the map, prompt, guardrails, model or rubric. Any learner-reported mismatch.</td></tr>
        </tbody>
      </table>

      <h3 id="brief">Performance brief</h3>
      <table>
        <thead><tr><th></th><th>{grow.title}</th><th>{jordan.title}</th></tr></thead>
        <tbody>
          {([
            ["Current behavior", "current"],
            ["Desired behavior", "desired"],
            ["Evidence of the gap", "gap"],
            ["Non-training barriers", "barriers"],
            ["Why branching", "why"],
            ["Simpler alternative considered", "simpler"],
            ["Out of scope", "outOfScope"],
          ] as const).map(([label, k]) => (
            <tr key={k}><td><b>{label}</b></td><td>{BRIEF.grow[k]}</td><td>{BRIEF.jordan[k]}</td></tr>
          ))}
          <tr><td><b>Critical errors</b></td><td colSpan={2}>None defined. This is practice with no safety-critical action. Privacy and safety problems are handled as interruptions outside scoring. A clinical version would need clinician-defined critical errors that no other strength can offset.</td></tr>
        </tbody>
      </table>

      <h3 id="alignment">Alignment record</h3>
      <p>Each behavior ID runs through the objective, the map, the rubric and the transfer evidence. Every assessed behavior has at least one node where it can appear.</p>
      {(["grow", "jordan"] as const).map((id) => (
        <div key={id}>
          <p className="!mt-6 font-bold">{scenarios[id].title}</p>
          <table>
            <thead><tr><th>ID</th><th>Observable behavior</th><th>Practice nodes</th><th>Rubric</th><th>Later transfer evidence</th></tr></thead>
            <tbody>{ALIGN[id].map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}

      <h3 id="rubric">Learner-performance rubric</h3>
      <p>
        The rubric scores learner actions, not the design. <b>2</b> means demonstrated to criterion in the learner&apos;s own words. <b>1</b> means partial, or <em>recognized</em>: the learner selected the right scripted option but didn&apos;t produce it. <b>0</b> means not demonstrated despite a fair opportunity. <b>NE</b> means not evaluable, because there was no fair opportunity or a system failure invalidated the evidence. Where a level has no authored move behind it, the table says so instead of implying it is scored.
      </p>
      {(["grow", "jordan"] as const).map((id) => (
        <div key={id}>
          <p className="!mt-6 font-bold">{scenarios[id].title}</p>
          <table>
            <thead><tr><th>Criterion</th><th>0</th><th>1</th><th>2</th></tr></thead>
            <tbody>
              {ANCHORS[id].map((r) => (
                <tr key={r[0]}><td><b>{r[0]}</b> {scenarios[id].criteria.find((c) => c.id === r[0])?.label}</td><td>{r[1]}</td><td>{r[2].startsWith("Not used") ? "No partial move authored." : r[2]}<br /><span className="text-xs">Or recognized: chose the 2-level move from scripted options.</span></td><td>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <ul>
        <li><b>Achievement rule.</b> The simulation objective is met only when all four criteria score 2. Any 1, 0 or NE means not yet met. Hints and recoveries are reported next to the score, not deducted from it.</li>
        <li><b>Assistance record.</b> Independent, after a recovery, or with a hint. Automatic support for Priya counts as a hint.</li>
        <li><b>Accommodations.</b> Pausing, stepping back and choosing text over the illustration are not coaching and are not recorded as assistance.</li>
        <li><b>Calibration.</b> Not done. Before scored use, two raters score a sample of transcripts independently, then compare with the app&apos;s scores.</li>
        <li><b>Review and appeal.</b> Learners can flag any AI reading. The flag goes into the facilitator summary. No reviewer is assigned yet.</li>
        <li><b>High-stakes limit.</b> Not authorized for any consequential decision.</li>
      </ul>

      <h3 id="nodes">Node register</h3>
      <p>Generated from the scenario data, so it always matches what runs. Author labels are never shown to learners.</p>
      <NodeRegister id="grow" />
      <NodeRegister id="jordan" />

      <h3 id="samples">Interaction sample register</h3>
      <p>Observed on the deployed configuration, not written as examples.</p>
      <table>
        <thead><tr><th>Sample</th><th>Type</th><th>Learner input</th><th>System response</th></tr></thead>
        <tbody>
          {samples.map(([sid, type, tid]) => {
            const c = sample(tid);
            return (
              <tr key={sid}><td>{sid} ({tid})</td><td>{type}</td><td>{c ? `"${c.input}"` : "Not run"}</td><td>{c?.observed ?? "Not run"}</td></tr>
            );
          })}
        </tbody>
      </table>

      <h3 id="accessibility">Accessibility test plan</h3>
      <table>
        <tbody>
          <tr><td><b>Equivalent evidence</b></td><td>Every fact shown in an illustration also appears in the situation text. Each scene has a text description.</td></tr>
          <tr><td><b>Interaction access</b></td><td>Voice input is optional. Typing is always available. All controls are native buttons, radios and text areas. Visible focus. Skip link. The conversation is an aria-live region.</td></tr>
          <tr><td><b>Presentation</b></td><td>Status uses an icon and a word, never color alone. Map edges use dash patterns as well as color. Text reflows on small screens.</td></tr>
          <tr><td><b>Time and motion</b></td><td>No timers. A pause control. Animations turn off under reduced-motion settings.</td></tr>
          <tr><td><b>Tested so far</b></td><td>None yet. Keyboard, screen-reader, magnification and voice-control testing, with people who use them, are open items.</td></tr>
        </tbody>
      </table>

      <h3 id="revisions">Revision record</h3>
      <p>Real issues found while building and testing this version.</p>
      <table>
        <thead><tr><th>ID</th><th>Problem and evidence</th><th>Severity</th><th>Cause</th><th>Revision</th><th>Retest</th></tr></thead>
        <tbody>{REVISIONS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
      </table>

      <h2 id="review">Review and release decision</h2>
      <p>
        <b>This is a designer self-review, not an independent review.</b> The rubric asks for independent reviewers who compare ratings. Treat these ratings as the designer&apos;s starting position for that review. Ratings are not averaged. One major gap blocks learner use, however strong the rest is.
      </p>
      <table>
        <thead><tr><th>Criterion</th><th>Rating</th><th>Evidence</th><th>Finding</th><th>Severity</th><th>Action</th></tr></thead>
        <tbody>{RATINGS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{i === 1 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
      </table>
      <h3>Stop conditions checked</h3>
      <ul>
        <li><b>Unsupported authority:</b> not present. Requests to pass are blocked before the model (T09, T10), and the model never scores.</li>
        <li><b>Uncontrolled evidence:</b> not present. Scores come from the path in code. Character replies can&apos;t add facts that count.</li>
        <li><b>Unsafe continuation:</b> not present. Boundary turns never move the map forward.</li>
        <li><b>No review route:</b> partly present. Learners can flag readings, but no reviewer receives the flags. This blocks scored use.</li>
        <li><b>Silent configuration change:</b> at risk. The model is set in one file and the test script exists, but no automated gate runs it before deploys.</li>
        <li><b>Forced unsafe sequence, invented clinical content, acronym-only scoring:</b> not present. No clinical actions, a clinical filter on replies, and scoring on behavior rather than naming GROW steps.</li>
      </ul>
      <h3>Decision record</h3>
      <table>
        <tbody>
          <tr><td><b>Decision</b></td><td>Revise before learner use.</td></tr>
          <tr><td><b>Authorized use</b></td><td>Public design demonstration of {VERSION}.</td></tr>
          <tr><td><b>Prohibited uses</b></td><td>Scored assessment. Employment, credentialing or student decisions. Clinical training. Entering real learner, patient or staff information.</td></tr>
          <tr><td><b>Blocking issues</b></td><td>C1, C8, C9, C10, C12, A2, A3, H1, H2</td></tr>
          <tr><td><b>Path to a limited pilot</b></td><td>Pharmacy SME and teacher review. Assistive-technology testing. Privacy review of API terms. Rater calibration. A named reviewer for flags. Repeated AI test runs in a pre-deploy gate.</td></tr>
          <tr><td><b>Owner</b></td><td>Lizabeth Arum</td></tr>
        </tbody>
      </table>
      <h3>Outcome evidence</h3>
      <table>
        <tbody>
          <tr><td><b>Current evidence status</b></td><td>None. No learners have used it. Not even participation data exists.</td></tr>
          <tr><td><b>Authorized wording</b></td><td>&ldquo;A tested prototype of two branching scenarios. No learner performance or transfer evidence yet.&rdquo;</td></tr>
          <tr><td><b>Next evidence needed</b></td><td>Immediate scenario performance from a supervised pilot, scored by calibrated raters.</td></tr>
        </tbody>
      </table>
    </>
  );
}

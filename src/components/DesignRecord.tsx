import { scenarios } from "@/lib/scenarios";
import { convoScenarios } from "@/lib/convo";
import { testRun } from "@/lib/test-results";
import { DEFAULT_MODEL } from "@/lib/model-info";

// The scenario-design template and review rubric, filled in for this build.
// Tables that describe the map are generated from the scenario data, so they
// can't drift from what runs.

export const VERSION = "v2.3";
export const VERSION_DATE = "2026-09-28";

const BRIEF = {
  labels: {
    current: "Marcus sees an error pattern and opens with a verdict or a leading question (\"You need to slow down\").",
    desired: "He asks at least two open questions before interpreting, asks no leading questions, and closes with a plan the technician helped build.",
    gap: "None collected. The scenario is fictional. Before real use, confirm the gap through manager interviews, observed coaching conversations or incident reviews.",
    barriers: "Register staffing during the rush and a shared label tray. These are workflow problems for a pharmacy operations owner. The scenario shows them but can't fix them.",
    why: "What Sam reveals depends on how Marcus asks. Telling raises Sam's guard and shuts the conversation down.",
    simpler: "A GROW job aid with a worked example. It would teach the steps but not the moment-to-moment choice between asking and telling.",
    outOfScope: "Clinical judgment, medication safety, formal discipline and HR processes.",
  },
  pickup: {
    current: "Priya avoids the conversation, softens it until the purpose is lost, or asks a question and answers it herself.",
    desired: "She names what she saw, asks open questions she leaves for Dev to answer, and surfaces a cause she couldn't see from the counter.",
    gap: "None collected. Built from the persona description. Before real use, confirm it by observing new managers' first coaching conversations.",
    barriers: "A district schedule that has one technician covering two stations. The scenario surfaces it. Changing it is outside the conversation.",
    why: "Dev explains nothing until Priya names the concern, and a self-answered question earns nothing. Her failure modes need consequences a menu of options can't show.",
    simpler: "A reading on why asking works. It would give Priya the argument, but not the experience of a question finding something she couldn't have known.",
    outOfScope: "Customer-service standards, scheduling policy and clinical content.",
  },
  jordan: {
    current: "A teacher, short on time, fixes the student's robot, guesses at a cause, or walks away to help someone else without leaving a next step.",
    desired: "The teacher elicits the student's evidence, proposes one bounded test, keeps the student doing the work and checks the student's reasoning.",
    gap: "None collected. The example comes from the research guide. Before real use, confirm it through classroom observation or teacher interviews.",
    barriers: "Short work periods, fixed deadlines like a qualifying run, and several students needing help at once. Scheduling and support staffing sit outside this scenario.",
    why: "Taking over makes the project work but closes off the student's reasoning. Recovery paths show whether a teacher can hand control back.",
    simpler: "A case discussion. It would surface the idea but not practice the choice under the pressure of a deadline and a second student waiting.",
    outOfScope: "Robotics content knowledge and whole-class management. The second student tests one moment of triage, not classroom management in general.",
  },
} as const;

const ALIGN = {
  labels: [
    ["B1", "Asks two or more open, exploratory questions before stating any interpretation", "Any turn. Facts: pattern, tray", "P1", "Count of open questions before the first interpretation in a real coaching conversation"],
    ["B2", "Asks no leading questions", "Any turn", "P2", "Count of leading questions in the same observed conversation"],
    ["B3", "Asks for options after the cause is known", "Fact: idea (needs tray)", "P3", "Observer notes who proposed the adopted option"],
    ["B4", "Closes with a specific next step and a check-in", "Any turn after an option exists", "P4", "Written plan or observer note with owner and date"],
  ],
  pickup: [
    ["B1", "Names the observed concern plainly and early", "First two turns. Gates fact: busier", "Q1", "Observer notes whether the purpose was stated"],
    ["B2", "Asks open questions and leaves them for the employee to answer", "Any turn. Facts: busier, drive", "Q2", "Count of open questions not self-answered"],
    ["B3", "Surfaces a cause that observation couldn't show", "Fact: drive", "Q3", "Written reflection with an example, reviewed by a human"],
    ["B4", "Builds the way forward with the employee", "Fact: idea (needs drive)", "Q4", "Observer notes who proposed the plan"],
  ],
  jordan: [
    ["B1", "Elicits expected result, observed result or recent change before choosing a step", "D1, D1b, R1", "T1", "Observed student help request, teacher's first move recorded"],
    ["B2", "Proposes one bounded test and asks for a prediction", "D2, R2, R2b", "T2", "Observer records the next step given"],
    ["B3", "Keeps the student making the changes, including when stepping away", "D1, D1b, R1, P1", "T3", "Observer records who touched the work"],
    ["B4", "Asks the student to explain what the result shows and doesn't", "D3", "T4", "Observer records a reasoning check before the teacher leaves"],
  ],
} as const;

const ANCHORS = {
  jordan: [
    ["T1", "Fixes, reassures or directs without asking what Jordan expected, saw or changed", "Not used in this version. The vague \"explain your thinking\" move loops back without credit.", "Asks for the expected result, the observed result or a recent change"],
    ["T2", "Gives several changes at once, or trial and error", "Not used in this version", "Proposes one change and asks for a prediction"],
    ["T3", "Makes the change for Jordan and moves on", "Takes over then hands control back, or steps away without leaving a next step", "Jordan makes and tests every change, and has a step to carry out whenever you step away"],
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
  ["RV-08", "Marcus and Priya shared one scenario. Every weaker option was one of Marcus's mistakes, so Priya's failure modes had nowhere to appear.", "Major", "Differentiated objectives, same practice", "Built a separate scenario for each persona, with release rules that encode each gap.", "Engine checks in check-maps"],
  ["RV-09", "Scenarios offered little free will. Typing only chose among two or three authored moves.", "Major", "Tree-only design", "Rebuilt the pharmacy scenarios on a fact packet with a tagger, a counterpart and a code engine. Kept the classroom tree for comparison.", "T01–T20, convo-sim runs"],
  ["RV-10", "In a test conversation, Dev said pickup was \"nothing out of the ordinary,\" which contradicts a hidden fact.", "Minor", "The character denied instead of staying vague", "Added a rule: never deny or contradict. Stay noncommittal until asked.", "convo-sim, pickup soft path"],
  ["RV-11", "Published results marked T18 as a pass while Sam's reply confirmed the guess: \"We've been sharing one for a while though.\"", "Critical", "The test checked for the words \"tray\" and \"Jess,\" not meaning. The app had the same blind spot.", "Added a meaning-based leak check with a quoted-evidence rule. Tests now repeat three times and check for hints, not only names.", "T18, T21, T23"],
  ["RV-12", "The first leak check blocked about half of all correct replies, including facts the learner had earned.", "Major", "It treated related facts as revealed and erred toward blocking", "Required an exact quote that code verifies, skipped optional facts, moved to the stronger model. Fallbacks on ideal runs dropped from 2 of 4 turns to 0.", "Probe set of 7, convo-sim"],
  ["RV-13", "Guardrail messages in the conversations said \"pick a scripted option,\" but the conversations have none.", "Minor", "Messages written for the tree only", "Made shared messages format-neutral. The tree adds its own line.", "Manual check"],
  ["RV-14", "No release rule check protected when Sam or Dev will share while guarded. A loosened rule passed every check.", "Major", "Coverage gap found by deliberately breaking a rule", "Added guard checks for both personas. The loosened rule now fails the build.", "Sabotage run, check-maps"],
  ["RV-15", "The gate blocked a release: Dev answered a correct drive-through guess with \"Yeah, that's probably part of it,\" and Sam hinted \"we rotate through the same station.\" An earlier run had marked the Dev reply a pass.", "Critical", "A character rule said to \"go along with\" suggested causes, which confirms right guesses. Tests only looked for fact words.", "Guesses now get a one-sentence noncommittal reply. Code rejects agreeing openers and long replies on guess turns. Tests also check for confirmations.", "T07, T17, T18, T21, T23 (3 runs each for guesses)"],
  ["RV-16", "The classroom scenario was too generic: an unnamed \"project\" and options that read as right versus wrong.", "Major", "No concrete content, no competing demands", "Rebuilt around a micro:bit line-following robot with three specific changes. Added a plausible wrong lead, a revert-everything request, a second student and the end of class. Trade-off costs appear in the debrief, unscored.", "check-maps tree trade-off paths"],
  ["RV-17", "Outside review: asking \"What will you do first, and when should we check?\" ended the conversation as \"Plan agreed, cause found\" and scored P4 demonstrated, though Sam never proposed anything. Reproduced in the engine.", "Critical", "The ending fired on the learner's question, and Marcus's own earlier instruction counted as a plan on the table", "Agreement now needs three events: the learner asks, the character proposes a specific step and time, the learner confirms on a later turn. A plan the learner imposed ends as plan agreed, cause missed.", "check-maps REVIEW FINDING 1, T27, T28, C1, C2"],
  ["RV-18", "Outside review: \"What would make this conversation useful for you?\" released the shared tray, because any second open question did. Reproduced in the engine.", "Major", "Release rules counted questions instead of checking relevance", "Each hidden fact has a topic. The tagger marks which topics a question addresses, and a fact releases only on a relevant question.", "check-maps REVIEW FINDING 2, T29, C4"],
  ["RV-19", "Outside review: the rubric treated one conversational form as competence. The research allows equivalent effective strategies.", "Major", "Criteria written from one persona's objective, with no tests of alternatives", "Added tests for a relevant closed clarification, an accurate summary and a Goal-first opening. A next-step question now draws out the character's own idea. The rubric states it measures a practice constraint.", "T24, T25, T26, T27"],
  ["RV-20", "Outside review: \"the app scores, not the AI\" understated how much AI labels drive results.", "Major", "Wording claimed more independence than the design has", "Rewrote the claim on the home page, design page and both debriefs. Added full-conversation tests and an evidence rule: every demonstrated rating must quote a completed behavior.", "Evidence checks, C1 to C5"],
  ["RV-21", "The first full-conversation run showed a pass for C4 while every turn had been rate-limited, so nothing happened and the expected \"nothing released\" matched.", "Major", "The tests treated a blocked turn as a normal result, and the app's own rate limiter throttled local test traffic", "A blocked or rate-limited turn now fails any test. The limiter exempts only loopback addresses, which no request through Vercel can have.", "Conversation tests rerun"],
  ["RV-22", "CI caught T24 failing: a relevant clarifying question (\"So this is when you get called away in the middle of a label?\") was labeled an interpretation, raising Sam's guard. It passed locally, then failed in 2 of 5 repeated local runs.", "Major", "The interpretation definition didn't exclude checking back what the other person said", "Narrowed the definition and added a worked example with a different sentence than the test. Three clarifying phrasings then passed 15 of 15 runs. T24 and T25 now repeat three times per run.", "T24, T25, 15-run measurement"],
] as const;

const RATINGS: [string, string, string, string, string, string][] = [
  ["C1 Performance problem", "1", "Objectives, briefs", "Observable objectives. No evidence of the gap.", "Major", "Collect gap evidence before learner use. Design owner."],
  ["C2 Alignment and assessment", "1", "Alignment tables, rubric, RV-05, RV-08", "Behavior-to-practice-to-rubric maps exist for all three. The conversations score own words only. The tree separates recognition from execution. Not independently reviewed.", "Minor", "External design review"],
  ["C3 Personas and roles", "1", "Counterpart cards, fact packets, guard tones", "Separate scenarios per persona. Release rules encode each gap. Not reviewed by pharmacy leaders or teachers.", "Minor", "SME review"],
  ["C4 Decisions and alternatives", "1", "Node register, fact packets, T02, T04", "The conversations accept any wording. Tree options are plausible and shuffled. No learner think-aloud yet.", "Minor", "Learner testing"],
  ["C5 Consequences and state", "2", "check-maps.ts", "Tree: every state reachable, no dead ends. Engine: release rules, guard and endings checked against tag sequences.", "None", "Rerun on every map change"],
  ["C6 Failure and recovery", "2", "Failure table, RV-06, T16", "Five failure types separated and tested. Step back and restart work.", "None", "Confirm with learners"],
  ["C7 Feedback and debrief", "1", "Debrief, feedback contract", "Cites the learner's words, gives one next step, no trait judgments. Not tested with learners.", "Minor", "Learner testing"],
  ["C8 Learner scoring", "1", "Rubric anchors, RV-05, RV-06, review page", "Anchors defined. A facilitator can now correct labels and see scores recompute. No independent human rating collected yet.", "Major", "Rater calibration on a sample"],
  ["C9 Accessibility and usability", "1", "Accessibility plan below", "Built to WCAG 2.2 practices. No assistive-technology testing.", "Major", "AT user testing"],
  ["C10 Privacy and appropriate use", "1", "Data register, route code", "No storage or text logging, verified in code. Anthropic API terms not reviewed by a privacy owner.", "Major", "Privacy review"],
  ["C11 Testing and revision", "2", "T01–T23, revision log, release gate", "Risk-based cases pass. Leak cases repeat three times. A build gate and a release script block deploys that fail.", "Minor", "Repeated runs"],
  ["C12 Transfer evaluation", "1", "Evidence plan", "Plan drafted. No owner, no authorization, no baseline.", "Major", "Assign evaluation owner"],
  ["A1 Bounded roles and facts", "2", "Route code, T05, T09, T10, T18", "Tagger and counterpart are separate calls. Fact release, guard, endings and scores are in code. Unreleased-fact and missed-fact checks.", "None", "Monitor in pilot"],
  ["A2 Evaluation reliability", "1", "T01–T08, T17, T19, review page", "Tagging correct in the test set. The review page now measures agreement with a human, but no reviews have been collected.", "Major", "Repeat each case 5+ times"],
  ["A3 Resilience and lifecycle", "2", "T09–T23, release.sh, CI workflow", "Boundaries, leak checks and failure recovery tested. A regression gate runs before every deploy. No monitoring owner yet.", "Major", "Add CI gate and owner"],
  ["H1 Clinical validity and roles", "1", "Scenario facts", "No clinical content by design. Pharmacy workflow not reviewed by a pharmacy professional.", "Major", "Pharmacy SME review"],
  ["H2 Prebrief and debrief", "1", "Prebrief, pause control", "Stakes, fiction, pause and recording stated. No facilitator process.", "Major", "Facilitator guide"],
  ["H3 Confidentiality and claims", "1", "Data register, claims language", "Synthetic material, no outcome claims. Staff-data use decision not made by an authority.", "Minor", "Institutional decision"],
];

function NodeRegister({ id }: { id: "jordan" }) {
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
  const { jordan } = scenarios;
  const { labels, pickup } = convoScenarios;
  const all = [labels, pickup, jordan] as const;
  const sample = (tid: string) => testRun?.cases.find((c) => c.id === tid);
  const samples: [string, string, string][] = [
    ["I1", "Effective first attempt", "T01"],
    ["I2", "Partial response", "T07"],
    ["I3", "Error then repair", "T06"],
    ["I4", "Alternative valid approach", "T04"],
    ["I5", "Safety or privacy boundary", "T11"],
    ["I6", "Ambiguity or system failure", "T08"],
    ["I7", "Guessing a hidden fact", "T18"],
  ];

  return (
    <>
      <h2 id="record">Design record</h2>
      <p>
        This section fills in the scenario-design template for this build. The template separates a proposed rule, a reviewed rule and a tested result. So does this record.
      </p>
      <table>
        <tbody>
          <tr><td><b>Scenario IDs and version</b></td><td><code>labels</code>, <code>pickup</code> and <code>jordan</code>, {VERSION}, {VERSION_DATE}</td></tr>
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
        <thead><tr><th></th>{all.map((x) => <th key={x.id}>{x.title}</th>)}</tr></thead>
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
            <tr key={k}><td><b>{label}</b></td>{all.map((x) => <td key={x.id}>{BRIEF[x.id as keyof typeof BRIEF][k]}</td>)}</tr>
          ))}
          <tr><td><b>Critical errors</b></td><td colSpan={3}>None defined. This is practice with no safety-critical action. Privacy and safety problems are handled as interruptions outside scoring. A clinical version would need clinician-defined critical errors that no other strength can offset.</td></tr>
        </tbody>
      </table>

      <h3 id="alignment">Alignment record</h3>
      <p>Each behavior ID runs through the objective, the practice, the rubric and the transfer evidence. Every assessed behavior has a fair opportunity to appear: in the tree, at a node. In the conversations, on any turn, with the fact that proves it listed.</p>
      {all.map(({ id, title }) => (
        <div key={id}>
          <p className="!mt-6 font-bold">{title}</p>
          <table>
            <thead><tr><th>ID</th><th>Observable behavior</th><th>Where it can appear</th><th>Rubric</th><th>Later transfer evidence</th></tr></thead>
            <tbody>{ALIGN[id as keyof typeof ALIGN].map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}

      <h3 id="rubric">Learner-performance rubric</h3>
      <p>
        The rubric scores learner actions, not the design. <b>2</b> means demonstrated to criterion in the learner&apos;s own words. <b>1</b> means partial, or <em>recognized</em>: the learner selected the right scripted option but didn&apos;t produce it. <b>0</b> means not demonstrated despite a fair opportunity. <b>NE</b> means not evaluable, because there was no fair opportunity or a system failure invalidated the evidence. Where a level has no authored move behind it, the table says so instead of implying it is scored.
      </p>
      {[labels, pickup].map((c) => (
        <div key={c.id}>
          <p className="!mt-6 font-bold">{c.title} (conversation, own words only)</p>
          <table>
            <thead><tr><th>Criterion</th><th>0</th><th>1</th><th>2</th></tr></thead>
            <tbody>
              {c.criteria.map((r) => (
                <tr key={r.id}><td><b>{r.id}</b> {r.label}</td><td>{r.anchors[0]}</td><td>{r.anchors[1]}</td><td>{r.anchors[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {(["jordan"] as const).map((id) => (
        <div key={id}>
          <p className="!mt-6 font-bold">{scenarios[id].title} (tree)</p>
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
        <li><b>Assistance record.</b> Independent, after a recovery, or with a hint. Automatic support for Priya counts as a hint. In the conversations, &ldquo;after a recovery&rdquo; means a leading question, interpretation or supplied plan came earlier.</li>
        <li><b>Accommodations.</b> Pausing, stepping back and choosing text over the illustration are not coaching and are not recorded as assistance.</li>
        <li><b>Calibration.</b> Not done. Before scored use, two raters score a sample of transcripts independently, then compare with the app&apos;s scores.</li>
        <li><b>Evidence rule.</b> Every &ldquo;demonstrated&rdquo; rating quotes a completed behavior from the transcript. Plan agreement quotes the character&apos;s proposal and the learner&apos;s confirmation. The build fails if a rating breaks this rule.</li>
        <li><b>A practice constraint, not a coaching measure.</b> The pharmacy criteria measure the constraint in each persona&apos;s objective. Other effective coaching forms exist, and these criteria don&apos;t judge them. Not for workplace performance judgments.</li>
        <li><b>Tagging is evidence, not a verdict.</b> In the conversations, the tagger&apos;s labels feed the scores. Every turn&apos;s tags are shown in the debrief so a learner or reviewer can check them.</li>
        <li><b>Review and appeal.</b> Learners can flag any AI reading. The flag goes into the facilitator summary. No reviewer is assigned yet.</li>
        <li><b>High-stakes limit.</b> Not authorized for any consequential decision.</li>
      </ul>

      <h3 id="nodes">Node register</h3>
      <p>Generated from the scenario data, so it always matches what runs. Author labels are never shown to learners. The conversations have no nodes. Their fact packets are listed in the Two formats section.</p>
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
        <b>This is a designer self-review, plus one outside review.</b> A colleague reviewed one complete pharmacy conversation, its debrief, the prebrief and this documentation. Four findings came from that review (RV-17 to RV-20). Both behavioral findings were reproduced in the engine before fixing. The rubric asks for independent reviewers who compare ratings. Treat these ratings as the designer&apos;s starting position for that review. Ratings are not averaged. One major gap blocks learner use, however strong the rest is.
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
        <li><b>No review route:</b> resolved in the tool. Review links carry flagged attempts to a facilitator, who can correct labels. No reviewer is assigned, which still blocks scored use.</li>
        <li><b>Silent configuration change:</b> controlled. The release script runs every AI case before deploying and again after. Deploys that skip the script still run the rule checks in the build.</li>
        <li><b>Forced unsafe sequence, invented clinical content, acronym-only scoring:</b> not present. No clinical actions, a clinical filter on replies, and scoring on behavior rather than naming GROW steps.</li>
      </ul>
      <h3>Decision record</h3>
      <table>
        <tbody>
          <tr><td><b>Decision</b></td><td>Revise before learner use.</td></tr>
          <tr><td><b>Authorized use</b></td><td>Public design demonstration of {VERSION}.</td></tr>
          <tr><td><b>Prohibited uses</b></td><td>Scored assessment. Employment, credentialing or student decisions. Clinical training. Entering real learner, patient or staff information.</td></tr>
          <tr><td><b>Blocking issues</b></td><td>C1, C8, C9, C10, C12, A2, H1, H2</td></tr>
          <tr><td><b>Path to a limited pilot</b></td><td>Pharmacy SME and teacher review. Assistive-technology testing. Privacy review of API terms. Rater calibration. A named reviewer using the review page, with agreement tracked across reviews.</td></tr>
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

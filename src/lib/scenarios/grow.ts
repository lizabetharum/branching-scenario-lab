import type { MoveTag, Scenario, Turn } from "../types";
import { firstWith, quote, result, supportOf } from "../eval-helpers";

// A GROW coaching scenario at Gilbert's, a fictional pharmacy, following the
// research guide's design rules. The node map, Sam's facts and all dialogue are original and untested.
// This is a management-coaching scenario. It contains no clinical content by design.

const nodes: Scenario["nodes"] = {
  G1: {
    id: "G1",
    title: "G1: Open the conversation",
    situation:
      "2:15 p.m., before the evening rush. Final check caught three labeling errors from Sam's station in two weeks. All three were caught before anything left the pharmacy. You asked Sam to step into the consult room for ten minutes.",
    opener: "You wanted to see me? If this is about the labels, I know. I'll be more careful.",
    mood: "guarded",
    hint: "You don't know why the errors are happening yet. An open question about what happens at the station lets Sam tell you.",
    pos: [0, 1],
    moves: [
      {
        id: "G1.open",
        label: "Thanks for coming in. Walk me through what's going on at your station when these mix-ups happen.",
        category: "Asks an open, exploratory question about what is happening, the situation, or Sam's goal, without suggesting a cause.",
        quality: "good",
        tags: ["open"],
        reply: "Mostly it's around five. The line backs up, I get called to the register, and when I come back I pick up where I think I left off.",
        consequence: "Sam relaxes a little and describes the pattern.",
        mood: "engaged",
        next: "G2",
      },
      {
        id: "G1.leading",
        label: "Would you say you've been rushing because the line gets long?",
        category: "Asks a question that suggests its own answer or proposes a cause for Sam to confirm.",
        quality: "poor",
        tags: ["leading"],
        reply: "Yeah, I guess I've been rushing. I'll slow down.",
        consequence: "Sam agrees with your explanation. You learned nothing new.",
        mood: "guarded",
        next: "RL",
      },
      {
        id: "G1.tell",
        label: "Three errors in two weeks is too many. You need to slow down and double-check every label.",
        category: "States a conclusion, judgment, or instruction before asking anything.",
        quality: "poor",
        tags: ["interpretation"],
        reply: "Okay. I'll double-check.",
        consequence: "Sam crosses their arms and waits for the conversation to end.",
        mood: "guarded",
        next: "RT",
      },
    ],
  },
  RL: {
    id: "RL",
    title: "RL: Recover from a leading question",
    situation: "Sam agreed with the cause you suggested. You don't know if it's the real one.",
    mood: "guarded",
    hint: "Sam agreed with you, which isn't the same as telling you. You can take the question back.",
    pos: [1, 0],
    moves: [
      {
        id: "RL.repair",
        label: "Actually, I put words in your mouth. In your own words, what's happening when these come up?",
        category: "Recognizes the leading question and asks an open question instead.",
        quality: "good",
        tags: ["repair", "open"],
        reply: "Well, it's not really rushing. Around five the line backs up, I get pulled to the register, and when I come back I pick up where I think I left off.",
        consequence: "Sam corrects your first guess and describes the pattern.",
        mood: "engaged",
        next: "G2",
      },
      {
        id: "RL.close",
        label: "Good. Just slow down and we're set.",
        category: "Accepts Sam's agreement and ends the conversation.",
        quality: "poor",
        tags: ["interpretation"],
        reply: "Okay. (Sam heads back to the counter.)",
        consequence: "The conversation ends on your explanation, not Sam's.",
        mood: "neutral",
        next: "E2",
      },
    ],
  },
  RT: {
    id: "RT",
    title: "RT: Recover from telling",
    situation: "Sam is waiting for this to be over.",
    mood: "guarded",
    hint: "You started with a verdict. You can still start again with a question.",
    pos: [1, 2],
    moves: [
      {
        id: "RT.repair",
        label: "Let me back up. I don't have the whole picture. What's been happening at your station when these come up?",
        category: "Acknowledges the opening and asks an open, exploratory question.",
        quality: "good",
        tags: ["repair", "open"],
        reply: "Mostly it's around five. The line backs up, I get called to the register, and when I come back I pick up where I think I left off.",
        consequence: "Sam uncrosses their arms and starts explaining.",
        mood: "engaged",
        next: "G2",
      },
      {
        id: "RT.close",
        label: "Great. Let's check in next month.",
        category: "Ends the conversation without exploring what is happening.",
        quality: "poor",
        tags: ["interpretation"],
        reply: "Sure. (Sam heads back to the counter.)",
        consequence: "Sam leaves with an instruction and no plan that fits the cause.",
        mood: "neutral",
        next: "E2",
      },
    ],
  },
  G2: {
    id: "G2",
    title: "G2: Explore reality",
    situation: "Sam named a pattern: interruptions during the five o'clock rush.",
    mood: "engaged",
    hint: "You have one piece. Ask what happens to the unfinished label when Sam is called away.",
    pos: [2, 1],
    moves: [
      {
        id: "G2.followup",
        label: "What happens to the label you were working on when you get called away?",
        category: "Asks a second open, exploratory follow-up question about the details of what happens.",
        quality: "good",
        tags: ["open"],
        reply: "Honestly? I leave it in the shared tray. Jess uses that tray too. Sometimes when I come back I grab the wrong one.",
        consequence: "Sam names something you couldn't see from the error log: a shared tray.",
        mood: "thinking",
        next: "G3",
      },
      {
        id: "G2.interpret",
        label: "So it's the interruptions. I'll tell the team not to pull you to the register.",
        category: "States an interpretation or supplies a solution after one question.",
        quality: "partial",
        tags: ["interpretation", "managerOptions"],
        reply: "Okay. I mean, somebody has to cover the register, though.",
        consequence: "You have a plan, but it's built on half the picture.",
        mood: "neutral",
        next: "OM",
      },
      {
        id: "G2.closed",
        label: "Is it always the five o'clock rush?",
        category: "Asks a closed yes/no question.",
        quality: "partial",
        tags: ["closed"],
        reply: "Pretty much, yeah.",
        consequence: "A yes/no question got a yes. Nothing new came up.",
        mood: "neutral",
        next: "G2b",
      },
    ],
  },
  G2b: {
    id: "G2b",
    title: "G2b: After a closed question",
    situation: "Sam confirmed the timing. You still don't know what goes wrong.",
    mood: "neutral",
    hint: "A closed question gets a one-word answer. Ask something Sam has to describe.",
    pos: [3, 0],
    moves: [
      {
        id: "G2b.followup",
        label: "Walk me through what happens to the label you were working on when you get called away.",
        category: "Asks an open, exploratory follow-up question about what happens.",
        quality: "good",
        tags: ["open"],
        reply: "I leave it in the shared tray. Jess uses that tray too. Sometimes when I come back I grab the wrong one.",
        consequence: "Sam names something you couldn't see from the error log: a shared tray.",
        mood: "thinking",
        next: "G3",
      },
      {
        id: "G2b.interpret",
        label: "Then we need to keep you off the register during the rush.",
        category: "States an interpretation or supplies a solution.",
        quality: "partial",
        tags: ["interpretation", "managerOptions"],
        reply: "Okay. Somebody has to cover it, though.",
        consequence: "You have a plan, but it's built on half the picture.",
        mood: "neutral",
        next: "OM",
      },
    ],
  },
  OM: {
    id: "OM",
    title: "OM: Manager-owned plan",
    situation: "Sam agreed to your plan but hasn't said what would work at the station.",
    mood: "neutral",
    hint: "Your plan skips Sam's knowledge of the station. Ask what Sam thinks would work.",
    pos: [3, 2],
    moves: [
      {
        id: "OM.repair",
        label: "Before we lock that in, what do you think would actually work at your station?",
        category: "Hands the options back to Sam with an open question.",
        quality: "good",
        tags: ["repair", "open"],
        reply: "Honestly, the register isn't the real problem. I leave the label in the shared tray, and Jess uses it too. Sometimes I grab the wrong one.",
        consequence: "Sam names the cause your plan missed: a shared tray.",
        mood: "thinking",
        next: "G3",
      },
      {
        id: "OM.close",
        label: "Good. I'll keep an eye on the error log next week.",
        category: "Ends with the manager's plan and no input from Sam.",
        quality: "poor",
        tags: ["managerOptions"],
        reply: "Sounds good. (Sam heads back to the counter.)",
        consequence: "The plan targets the register. The shared tray is still there.",
        mood: "neutral",
        next: "E3",
      },
    ],
  },
  G3: {
    id: "G3",
    title: "G3: Options",
    situation: "The cause is clearer: unfinished labels go into a tray two techs share.",
    mood: "thinking",
    hint: "Sam knows the station better than you do. Ask for Sam's ideas before offering yours.",
    pos: [4, 1],
    moves: [
      {
        id: "G3.options",
        label: "That's useful. What could you try so a label doesn't get mixed up when you're called away?",
        category: "Asks Sam to generate options or ideas.",
        quality: "good",
        tags: ["employeeOptions", "open"],
        reply: "What if Jess and I each had our own bin? If I get called away, the label stays in my bin.",
        consequence: "Sam comes up with a fix that targets the cause.",
        mood: "engaged",
        next: "W1",
      },
      {
        id: "G3.leading",
        label: "Wouldn't a separate tray for each of you fix that?",
        category: "Proposes a solution phrased as a question for Sam to confirm.",
        quality: "partial",
        tags: ["leading", "managerOptions"],
        reply: "Yeah, probably. Each of us could have our own bin.",
        consequence: "Right idea. It's yours, not Sam's.",
        mood: "neutral",
        next: "W1",
      },
      {
        id: "G3.instruct",
        label: "Okay. Starting today, finish every label before you leave the station.",
        category: "Gives an instruction or rule without asking Sam for options.",
        quality: "partial",
        tags: ["interpretation", "managerOptions"],
        reply: "Even if there are six people at the register?",
        consequence: "Sam points out that your rule won't hold up during the rush.",
        mood: "guarded",
        next: "OM",
      },
    ],
  },
  W1: {
    id: "W1",
    title: "W1: Way forward",
    situation: "A plan is on the table: a separate bin for each tech.",
    mood: "engaged",
    hint: "A plan needs a first step and a check-in date to hold up next week.",
    pos: [5, 1],
    moves: [
      {
        id: "W1.commit",
        label: "Let's try it. What will you do first, and when should we check how it's going?",
        category: "Asks Sam to commit to a specific next step and sets a follow-up or check-in.",
        quality: "good",
        tags: ["wayForward"],
        reply: "I'll set up the bins before the rush tonight. Can we look at the error log together on Friday?",
        consequence: "Sam owns the first step, and you have a check-in date.",
        mood: "proud",
        next: "E1",
      },
      {
        id: "W1.thanks",
        label: "Great idea. Thanks, Sam.",
        category: "Ends positively without a specific step or follow-up.",
        quality: "partial",
        tags: [],
        reply: "Sure. (Sam heads back to the counter.)",
        consequence: "Good idea. No first step and no date.",
        mood: "neutral",
        next: "E3",
      },
      {
        id: "W1.managerDoes",
        label: "Good. I'll order the bins and set up the rule for everyone.",
        category: "Takes ownership of the next step away from Sam.",
        quality: "partial",
        tags: ["managerOptions"],
        reply: "Okay. Thanks.",
        consequence: "The fix will happen. Sam's part in it is unclear.",
        mood: "neutral",
        next: "E3",
      },
    ],
  },
};

const STAGES: Record<string, [string, string?]> = {
  G1: ["Goal and Reality: find out what is happening before you decide what it means."],
  RL: ["Reality: Sam agreed with you. That isn't the same as Sam telling you."],
  RT: ["Reality: you started with a verdict. Reality comes from Sam."],
  G2: ["Reality: one open question surfaced a pattern. Keep exploring.", "rush"],
  G2b: ["Reality: closed questions confirm. Open questions discover.", "rush"],
  OM: ["Options: whose options are these?", "rush"],
  G3: ["Options: the person closest to the work often has the best idea.", "tray"],
  W1: ["Way forward: who does what, by when, and when will you check?", "bins"],
};
for (const [id, [stage, cue]] of Object.entries(STAGES)) Object.assign(nodes[id], { stage, cue });

const endings: Scenario["endings"] = {
  E1: {
    id: "E1",
    title: "E1: GROW conversation completed",
    kind: "met",
    text: "Sam heads back with a plan Sam built, a first step for tonight and a check-in on Friday. Check the criteria below. Reaching this ending is not the same as meeting every criterion.",
    mood: "proud",
    pos: [6, 0],
  },
  E3: {
    id: "E3",
    title: "E3: Partial",
    kind: "partial",
    text: "The conversation ends with a plan, but part of GROW was skipped. The plan may not hold up during the next five o'clock rush.",
    mood: "neutral",
    pos: [6, 1],
  },
  E2: {
    id: "E2",
    title: "E2: Objective not met",
    kind: "missed",
    text: "Sam goes back to the counter. You still don't know why the errors happen, so nothing in the plan targets the cause.",
    mood: "neutral",
    pos: [6, 2],
  },
};

const tagIndex = new Map<string, MoveTag[]>(
  Object.values(nodes).flatMap((n) => n.moves.map((m) => [m.id, m.tags] as [string, MoveTag[]])),
);
const has = (t: Turn, tag: MoveTag) => (tagIndex.get(t.moveId) ?? []).includes(tag);

function evaluate(history: Turn[]) {
  const firstInterp = history.findIndex((t) => has(t, "interpretation") || has(t, "leading") || has(t, "managerOptions"));
  const opens = history.filter((t) => has(t, "open"));
  const opensBefore = (firstInterp === -1 ? history : history.slice(0, firstInterp)).filter((t) => has(t, "open"));
  const leading = history.filter((t) => has(t, "leading"));
  const empOptions = firstWith(history, ["employeeOptions"], tagIndex);
  const mgrOptions = firstWith(history, ["managerOptions"], tagIndex);
  const way = firstWith(history, ["wayForward"], tagIndex);

  const p1 =
    opensBefore.length >= 2
      ? result("P1", "Asked two or more open questions before any interpretation", "demonstrated", supportOf(opensBefore[1]), `${opensBefore.length} open questions before any interpretation. ${quote(opensBefore[1])}`, "Keep exploring before you name a cause.", opensBefore[1])
      : opens.length >= 2
        ? result("P1", "Asked two or more open questions before any interpretation", "partial", "after_recovery", `You asked ${opens.length} open questions, but only ${opensBefore.length} came before your first interpretation. ${quote(history[firstInterp])}`, "Hold your interpretation until Sam has answered two open questions.")
        : result("P1", "Asked two or more open questions before any interpretation", opensBefore.length === 1 ? "partial" : "not_observed", opensBefore.length === 1 ? supportOf(opensBefore[0]) : "n/a", `${opensBefore.length} open question(s) before the first interpretation.`, "Ask a second open follow-up before offering any explanation.", opensBefore[0]);

  const p2 =
    leading.length === 0
      ? result("P2", "Asked no leading questions", "demonstrated", "independent", "No leading questions observed.", "Keep phrasing questions so Sam supplies the answer.", history.find((t) => t.mode === "free") ?? history[0])
      : result("P2", "Asked no leading questions", "not_observed", "n/a", `${leading.length} leading question(s). ${quote(leading[0])}`, "Turn \"Wouldn't X fix it?\" into \"What could you try?\"");

  const p3 = empOptions
    ? result("P3", "Sam generated the option", "demonstrated", supportOf(empOptions), quote(empOptions), "Keep asking for Sam's ideas before offering yours.", empOptions)
    : result("P3", "Sam generated the option", "not_observed", "n/a", mgrOptions ? `You supplied the option. ${quote(mgrOptions)}` : "Options never came up.", "Ask \"What could you try?\" and wait for Sam's answer.");

  const p4 = way
    ? result("P4", "Agreed on a specific next step and check-in", "demonstrated", supportOf(way), quote(way), "Keep ending with who does what, and when you'll check.", way)
    : result("P4", "Agreed on a specific next step and check-in", "not_observed", "n/a", "The conversation ended without a first step and a check-in.", "Close by asking what Sam will do first and when you'll follow up.");

  return [p1, p2, p3, p4];
}

export const grow: Scenario = {
  id: "grow",
  title: "The Label Conversation",
  domain: "Healthcare · pharmacy leadership coaching",
  tagline: "Coach a pharmacy technician through the GROW model after a pattern of labeling errors.",
  scene: "pharmacy",
  intake: {
    duration: "15 to 20 minutes. That covers one skill clearly: running a GROW conversation with a realistic scenario. It won't make anyone a master coach.",
    situation: "Pharmacy techs juggle prescription-filling accuracy with customer service. The skill breaks down when a manager sees an error pattern and tells instead of asks.",
    experience: "Leaders with \"some experience but inconsistent coaching approaches.\" Not a 101 course. It gives practitioners a shared framework and shared language.",
  },
  objective:
    "Given a pharmacy performance scenario involving a technician error pattern, the leader will investigate by posing at least two open, exploratory questions before stating any interpretation, with zero leading questions, and close with a way forward the technician helped build.",
  transferEvidence:
    "In the next real coaching conversation about a performance pattern, a trained observer or the leader's own recording (with consent) is scored with the same GROW investigation rubric.",
  insufficientEvidence:
    "Reaching the \"plan agreed\" ending, reciting the four GROW steps, or reporting more confidence without the questioning behavior.",
  prebrief: [
    "This is a fictional coaching simulation at a fictional pharmacy. Sam is not a real person.",
    "It is not clinical decision support. It will not answer medication, dosing or patient-care questions.",
    "Do not enter real employee, patient or customer information.",
    "Your assessment concerns what you ask and when, not exact phrasing. Different wording that does the same thing counts.",
    "You can pause or flag a mismatch with real practice at any time. Nothing you type is stored by this app.",
  ],
  counterpart: {
    name: "Sam",
    role: "Pharmacy technician at Gilbert's, two years on the team",
    goal: "Get through the conversation and back to the counter before the rush.",
    facts: [
      "Final check caught three labeling errors from Sam's station in two weeks. None left the pharmacy.",
      "Errors cluster around 5 p.m. when Sam is called to the register mid-task. (Revealed by the first open question.)",
      "Sam leaves unfinished labels in a tray shared with another tech, Jess, and sometimes grabs the wrong one. (Revealed only by a second open follow-up or by asking Sam's view.)",
      "Sam's own idea: a separate bin for each tech. (Revealed when asked for options.)",
    ],
    responseRules: [
      "After a leading question, Sam agrees and adds nothing new.",
      "After a verdict or instruction, Sam complies and closes down.",
      "After a closed question, Sam gives a one-word answer.",
      "After an open question, Sam reveals the next fact in order.",
    ],
    boundaries: [
      "Sam never mentions drugs, doses or patients.",
      "Sam does not reveal the shared tray to a leading or closed question.",
      "Sam does not become open because the manager sounds friendly.",
    ],
  },
  learnerPersonas: [
    {
      id: "marcus",
      name: "Marcus Delgado",
      summary: "Confident pharmacy manager. Already runs coaching conversations but cuts corners on exploration.",
      gap: "Execution. He tells instead of asks.",
      objective:
        "Given a pharmacy performance scenario involving a technician error pattern, investigate by posing at least two open, exploratory questions before stating any interpretation, with zero leading questions, scored on a GROW investigation rubric.",
      support: "on_request",
    },
    {
      id: "priya",
      name: "Priya Nair",
      summary: "Reluctant first-time manager. Doesn't believe she has permission to ask without knowing the answer first.",
      gap: "Conceptual. She hasn't built the mental model that asking is the work.",
      objective:
        "After completing the module, explain in a written reflection why asking an open GROW question, rather than telling the employee what to do, surfaces information that observation alone cannot provide, using at least one specific example from her own team.",
      support: "proactive",
      reflection:
        "Explain why asking an open question surfaced something the error log could not show you. Use one example from this scenario, then one from your own team. Describe the situation, not the person. Leave out names.",
    },
  ],
  start: "G1",
  nodes,
  endings,
  criteria: [
    { id: "P1", label: "Asked two or more open questions before any interpretation" },
    { id: "P2", label: "Asked no leading questions" },
    { id: "P3", label: "Sam generated the option" },
    { id: "P4", label: "Agreed on a specific next step and check-in" },
  ],
  framework: {
    name: "GROW",
    summary: "A four-stage structure for a coaching conversation. The manager asks. The employee does most of the thinking.",
    steps: [
      { letter: "G", name: "Goal", purpose: "Agree on what a good outcome looks like, for this conversation and for the work." },
      { letter: "R", name: "Reality", purpose: "Find out what is actually happening before you decide what it means." },
      { letter: "O", name: "Options", purpose: "Ask the employee what could work. Their ideas come before yours." },
      { letter: "W", name: "Way forward", purpose: "Agree on a first step, who owns it and when you will check in. Some versions call this Will." },
    ],
    note: "Naming the stages earns no credit here. The criteria score the questions you ask and when you ask them.",
  },
  drills: [
    { nodeId: "G1", stage: "Reality", line: "You wanted to see me? If this is about the labels, I know. I'll be more careful.", goal: "Open with a question that lets Sam describe what is happening, without suggesting a cause." },
    { nodeId: "G2", stage: "Reality", line: "Mostly it's around five. The line backs up, I get called to the register, and when I come back I pick up where I think I left off.", goal: "Ask a second open follow-up before you interpret anything." },
    { nodeId: "G3", stage: "Options", line: "Honestly? I leave it in the shared tray. Jess uses that tray too. Sometimes when I come back I grab the wrong one.", goal: "Ask Sam for options instead of offering yours." },
    { nodeId: "W1", stage: "Way forward", line: "What if Jess and I each had our own bin? If I get called away, the label stays in my bin.", goal: "Get a specific first step from Sam and set a check-in." },
  ],
  evaluate,
  sources: [
    "Branching scenarios for behavior change (research guide)",
  ],
};

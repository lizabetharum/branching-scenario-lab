import type { MoveTag, Scenario, Turn } from "../types";
import { firstWith, quote, result, supportOf } from "../eval-helpers";

// Source: "Branching scenarios for behavior change" (the research guide).
// Node IDs, response rules and endings follow the guide's example map.
// Dialogue wording is original and has not been tested with teachers or students.

const nodes: Scenario["nodes"] = {
  D1: {
    id: "D1",
    title: "D1: Diagnose",
    situation:
      "Project work session. Ten minutes left. Jordan's project gave the expected result yesterday. Today it doesn't. Jordan waves you over.",
    opener: "It still doesn't work. Can you just fix it?",
    mood: "frustrated",
    hint: "Before choosing a next step, find out what Jordan expected, what happened instead, and what changed.",
    pos: [0, 1],
    moves: [
      {
        id: "D1.diagnose",
        label: "What did you expect to happen, and what happened instead? Show me the version you just tested.",
        category: "Asks a focused diagnostic question about the expected result, the observed result, recent changes, or asks to see the version tested.",
        quality: "good",
        tags: ["elicit"],
        reply: "I expected it to do what it did yesterday. Then I changed a few things at once, and now it doesn't. This is the version I just tested.",
        consequence: "Jordan shows you the latest version and names the moment it stopped working.",
        mood: "engaged",
        next: "D2",
      },
      {
        id: "D1.takeover",
        label: "Scoot over and let me look. I'll change this part for you.",
        category: "Supplies a fix, edits the project, or tells Jordan exactly what to change without asking anything first.",
        quality: "poor",
        tags: ["takeover"],
        reply: "Okay. (Jordan watches you work.) Oh, it works now. But I don't know why.",
        consequence: "The project runs. Jordan followed along but can't explain what changed.",
        mood: "neutral",
        next: "R1",
      },
      {
        id: "D1.encourage",
        label: "You're really close. Keep trying, you've got this.",
        category: "Offers encouragement or general reassurance without asking for evidence or giving a next step.",
        quality: "poor",
        tags: ["unfocused"],
        reply: "But I have been trying. Can you just fix it?",
        consequence: "Jordan repeats the request. There is still no clear next step.",
        mood: "frustrated",
        next: "D1b",
      },
    ],
  },
  D1b: {
    id: "D1b",
    title: "D1b: Refocus",
    situation: "Jordan is still stuck and asking you to take over.",
    mood: "frustrated",
    hint: "Encouragement alone didn't give Jordan a next step. Ask a question Jordan can answer with evidence.",
    pos: [1, 0],
    moves: [
      {
        id: "D1b.diagnose",
        label: "Walk me through it. What did you expect, what happened, and what did you change since it last worked?",
        category: "Asks a focused diagnostic question about the expected result, the observed result, or recent changes.",
        quality: "good",
        tags: ["elicit"],
        reply: "It worked yesterday. I changed a few things at once, and now it doesn't. This is the version I just tested.",
        consequence: "Jordan gives you the same evidence that was available at the start.",
        mood: "engaged",
        next: "D2",
      },
      {
        id: "D1b.takeover",
        label: "Fine, let me see it. I'll fix it and you can watch.",
        category: "Supplies a fix or edits the project for Jordan.",
        quality: "poor",
        tags: ["takeover"],
        reply: "Okay. (Jordan watches you work.) Oh, it works now. But I don't know why.",
        consequence: "The project runs. Jordan can't explain what changed.",
        mood: "neutral",
        next: "R1",
      },
    ],
  },
  R1: {
    id: "R1",
    title: "R1: Repair",
    situation: "The project works because you changed it. Jordan is ready to move on.",
    mood: "neutral",
    hint: "You can still hand the thinking back. Ask Jordan what they expected and what they had already tried.",
    pos: [1, 2],
    moves: [
      {
        id: "R1.repair",
        label: "I moved too fast. Before we keep that change, show me what you expected and what you had already tried.",
        category: "Recognizes the takeover, returns control to Jordan, and asks for Jordan's expectation, evidence, or explanation.",
        quality: "good",
        tags: ["repair", "elicit"],
        reply: "I changed a few things at once before I called you. I can show you the version I tested.",
        consequence: "A diagnostic opportunity opens again. The takeover stays in the record.",
        mood: "engaged",
        next: "D2",
      },
      {
        id: "R1.continue",
        label: "Great, it works. Save it and move on to the next part.",
        category: "Accepts the working project and ends or moves on without checking Jordan's understanding.",
        quality: "poor",
        tags: ["takeover"],
        reply: "Okay. (Jordan saves the file.)",
        consequence: "The project works. Jordan's reasoning never came up.",
        mood: "neutral",
        next: "E2",
      },
    ],
  },
  D2: {
    id: "D2",
    title: "D2: Scaffold",
    situation: "Jordan changed several things at once. Any one of them could be the cause.",
    mood: "thinking",
    hint: "Several changes happened together. What single comparison would tell Jordan which one mattered?",
    pos: [2, 1],
    moves: [
      {
        id: "D2.scaffold",
        label: "Let's test one change at a time. Which one do you want to try first, and what do you expect if it's the cause?",
        category: "Proposes one bounded comparison or single-change test and asks Jordan for a prediction.",
        quality: "good",
        tags: ["bounded"],
        reply: "I'll put back just the last change and leave the rest. If that's the cause, it should work like yesterday.",
        consequence: "Jordan makes a testable prediction and runs the test.",
        mood: "engaged",
        next: "D3",
      },
      {
        id: "D2.overload",
        label: "Undo the last two changes, update the other part, and restart it.",
        category: "Gives several changes or steps at once without isolating one.",
        quality: "poor",
        tags: ["overload"],
        reply: "Okay, I did all of that. Now it's different, but still wrong. Which one fixed it and which one broke it?",
        consequence: "The result can't tell anyone which change mattered.",
        mood: "frustrated",
        next: "R2",
      },
      {
        id: "D2.unfocused",
        label: "So what do you think is wrong? Explain your thinking.",
        category: "Asks Jordan to explain in general terms with no focus on a specific change, comparison, or prediction.",
        quality: "partial",
        tags: ["unfocused"],
        reply: "I don't know. That's why I called you. One of the things I changed, maybe?",
        consequence: "Jordan's answer is incomplete. A more specific question would help.",
        mood: "frustrated",
        next: "D2",
      },
    ],
  },
  R2: {
    id: "R2",
    title: "R2: Simplify",
    situation: "The project changed again, but no one can say why.",
    mood: "frustrated",
    hint: "Go back to a single comparison. One change, one prediction, one test.",
    pos: [3, 2],
    moves: [
      {
        id: "R2.simplify",
        label: "Let's go back. Pick one change, test only that, and tell me what you predict first.",
        category: "Returns to a single comparison and asks for a prediction.",
        quality: "good",
        tags: ["bounded", "repair"],
        reply: "Okay. I'll put back just the last change. If that's it, it should work like yesterday.",
        consequence: "Jordan can make a testable prediction now.",
        mood: "engaged",
        next: "D3",
      },
      {
        id: "R2.continue",
        label: "Keep adjusting things until it works.",
        category: "Continues trial and error without isolating evidence.",
        quality: "poor",
        tags: ["overload"],
        reply: "(Jordan keeps changing things. The bell rings.)",
        consequence: "Jordan has no result that means anything yet.",
        mood: "frustrated",
        next: "E2",
      },
    ],
  },
  D3: {
    id: "D3",
    title: "D3: Verify",
    situation: "Jordan ran the test.",
    mood: "proud",
    hint: "A working project is not the same as a student who can explain it. Ask what the result shows.",
    pos: [4, 1],
    moves: [
      {
        id: "D3.verify",
        label: "What does that result tell you, and what doesn't it tell you yet? What will you try next?",
        category: "Asks Jordan to explain what the result shows, what it does not show, or to choose a next step.",
        quality: "good",
        tags: ["verify"],
        reply: "Putting back that one change fixed it, so that change was the problem. It doesn't tell me if the other changes are okay. I'll test those one at a time.",
        consequence: "Jordan's reasoning is out loud, tied to the test.",
        mood: "proud",
        next: "E1",
      },
      {
        id: "D3.stop",
        label: "Nice, it works! Good job.",
        category: "Praises the working result and ends without checking Jordan's reasoning.",
        quality: "partial",
        tags: [],
        reply: "Thanks! (Jordan packs up.)",
        consequence: "The result is visible. The reasoning was not checked.",
        mood: "proud",
        next: "E3",
      },
      {
        id: "D3.explainForJordan",
        label: "Right. That last change caused it, so leave it out from now on.",
        category: "States the conclusion for Jordan instead of asking Jordan to explain it.",
        quality: "partial",
        tags: ["interpretation"],
        reply: "Okay, got it.",
        consequence: "You explained the result. Jordan agreed but never explained it.",
        mood: "neutral",
        next: "E3",
      },
    ],
  },
};

const CUES: Record<string, string> = { D2: "versions", R2: "versions", D3: "working" };
for (const [id, cue] of Object.entries(CUES)) nodes[id].cue = cue;

const endings: Scenario["endings"] = {
  E1: {
    id: "E1",
    title: "E1: Target demonstrated",
    kind: "met",
    text: "The bell rings. Jordan is still testing one change at a time and knows what to try next. You can hear the reasoning, so you know Jordan could start this without you.",
    mood: "proud",
    pos: [5, 0],
  },
  E3: {
    id: "E3",
    title: "E3: Partial evidence",
    kind: "partial",
    text: "The project works. You never heard Jordan's reasoning, so you can't tell whether Jordan could do this alone next time.",
    mood: "neutral",
    pos: [5, 1],
  },
  E2: {
    id: "E2",
    title: "E2: Objective not met",
    kind: "missed",
    text: "The project may run, but Jordan can't explain why. The next time it breaks, Jordan will wave you over again.",
    mood: "neutral",
    pos: [5, 2],
  },
};

const tagIndex = new Map<string, MoveTag[]>(
  Object.values(nodes).flatMap((n) => n.moves.map((m) => [m.id, m.tags] as [string, MoveTag[]])),
);

function evaluate(history: Turn[]) {
  const elicit = firstWith(history, ["elicit"], tagIndex);
  const bounded = firstWith(history, ["bounded"], tagIndex);
  const overload = firstWith(history, ["overload"], tagIndex);
  const takeover = firstWith(history, ["takeover"], tagIndex);
  const repair = firstWith(history, ["repair"], tagIndex);
  const verify = firstWith(history, ["verify"], tagIndex);

  return [
    elicit
      ? result("T1", "Elicited Jordan's explanation and evidence", "demonstrated", supportOf(elicit), quote(elicit), "Keep asking for the expected result, the observed result and one recent change.", elicit)
      : result("T1", "Elicited Jordan's explanation and evidence", "not_observed", "n/a", "No question asked for what Jordan expected, saw, or changed.", "On the retry, ask what Jordan expected, what happened, and what changed before choosing a next step."),
    bounded
      ? result("T2", "Chose one bounded next step based on that evidence", "demonstrated", supportOf(bounded), quote(bounded), "Keep each test to one change with a prediction.", bounded)
      : result("T2", "Chose one bounded next step based on that evidence", "not_observed", "n/a", overload ? `You gave several changes at once. ${quote(overload)}` : "No single-change test was proposed.", "Ask Jordan to change one thing and predict the result before testing."),
    takeover && !repair
      ? result("T3", "Kept Jordan doing the work", "not_observed", "n/a", `You made the change for Jordan. ${quote(takeover)}`, "Hand the keyboard back. Ask Jordan to make the change and explain it.")
      : takeover && repair
        ? result("T3", "Kept Jordan doing the work", "partial", "after_recovery", `You took over, then handed control back. ${quote(repair)}`, "Next time, ask first. The repair worked, but the first move was a takeover.")
        : bounded
          ? result("T3", "Kept Jordan doing the work", "demonstrated", supportOf(bounded), "Jordan made and tested the change.", "Keep the next action in Jordan's hands.", bounded)
          : result("T3", "Kept Jordan doing the work", "not_observed", "n/a", "The interaction ended before Jordan acted on a next step.", "Give Jordan one step to carry out."),
    verify
      ? result("T4", "Checked Jordan's reasoning", "demonstrated", supportOf(verify), quote(verify), "Keep asking what a result shows and what it doesn't.", verify)
      : result("T4", "Checked Jordan's reasoning", "not_observed", "n/a", "No question asked Jordan to explain the result.", "Before you walk away, ask what the result lets Jordan conclude and what it doesn't."),
  ];
}

export const jordan: Scenario = {
  id: "jordan",
  title: "Can You Just Fix It?",
  domain: "Education · teacher professional development",
  tagline: "A student asks you to fix their project. Help them find the problem without taking it over.",
  scene: "classroom",
  intake: {
    duration: "10 to 15 minutes. That's enough time for one skill: responding to a request for a fix without taking over.",
    situation: "The skill breaks down in the last minutes of a work session. The student is frustrated, and fixing it yourself is the fastest way to get the project working.",
    experience: "Teachers who already help students one-on-one but tend to take over when time is short. This recalibrates an existing habit, so the scenario starts right away.",
  },
  objective:
    "When a student asks for a fix, the teacher will elicit the student's current explanation and inspect relevant evidence before selecting a next step. The teacher will then ask the student to predict, test and explain that step rather than taking over the task.",
  transferEvidence:
    "In a later classroom interaction where a student asks for help, an observer records whether the teacher carries out those actions, using the same behavior definitions.",
  insufficientEvidence:
    "Finishing the scenario, choosing an option labeled \"ask a question,\" reporting more confidence, or getting the fictional project working without eliciting student thinking.",
  prebrief: [
    "This is a fictional practice interaction. Jordan is not a real student.",
    "Do not enter real student names, records or identifying incidents.",
    "Respond as you would in class. Your aim is to help Jordan investigate the problem and take an evidence-based next step, not only to make the project work.",
    "Hints are available. Hint use is recorded separately from independent performance.",
    "You can pause at any time. Nothing is timed.",
  ],
  counterpart: {
    name: "Jordan",
    role: "A student building a classroom project",
    goal: "Get the project working before the session ends.",
    facts: [
      "Jordan changed several things at once.",
      "Jordan remembers the last expected result (it worked yesterday).",
      "Jordan can point to the most recent version.",
      "Putting back only the last change restores yesterday's result.",
    ],
    responseRules: [
      "After a focused diagnostic question, Jordan gives the relevant known evidence.",
      "After \"Explain your thinking\" with no focus, Jordan gives an incomplete answer and needs a more specific question.",
      "After a direct fix, Jordan follows it but can't explain why it works.",
      "After a bounded next step, Jordan makes a prediction, tests one change and reports the result.",
    ],
    boundaries: [
      "Jordan does not invent project facts.",
      "Jordan does not become compliant because the teacher sounds friendly.",
      "Jordan never discloses real student information.",
    ],
  },
  learnerPersonas: [
    {
      id: "teacher",
      name: "Classroom teacher",
      summary: "Some one-on-one help experience. Takes over when time is short.",
      gap: "Execution under time pressure. Knows asking matters, but defaults to fixing.",
      objective:
        "Elicit the student's explanation and evidence before choosing a next step, then have the student predict, test and explain.",
      support: "on_request",
    },
  ],
  start: "D1",
  nodes,
  endings,
  criteria: [
    { id: "T1", label: "Elicited Jordan's explanation and evidence" },
    { id: "T2", label: "Chose one bounded next step based on that evidence" },
    { id: "T3", label: "Kept Jordan doing the work" },
    { id: "T4", label: "Checked Jordan's reasoning" },
  ],
  drills: [
    { nodeId: "D1", line: "It still doesn't work. Can you just fix it?", goal: "Ask for evidence (what Jordan expected, what happened, what changed) instead of fixing it." },
    { nodeId: "D2", line: "I expected it to do what it did yesterday. Then I changed a few things at once, and now it doesn't. This is the version I just tested.", goal: "Propose one bounded test and ask Jordan for a prediction." },
    { nodeId: "D3", line: "I put back just the last change. It works like yesterday.", goal: "Ask Jordan to explain what the result shows and what it doesn't." },
  ],
  evaluate,
  sources: ["Branching scenarios for behavior change (research guide), worked teacher example"],
};

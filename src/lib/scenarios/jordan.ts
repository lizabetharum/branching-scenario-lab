import type { MoveTag, Scenario, Turn } from "../types";
import { firstWith, quote, result, supportOf } from "../eval-helpers";

// Source: "Branching scenarios for behavior change" (the research guide), worked
// teacher example. The guide's node logic (diagnose, scaffold, verify, with
// repair paths) is kept. The concrete case is a classroom micro:bit
// line-following robot, and the pressure points (a plausible wrong lead, a
// frustrated student, a second student waiting, the end of class) are original.
// None of it has been tested with teachers or students.

const nodes: Scenario["nodes"] = {
  D1: {
    id: "D1",
    title: "D1: Diagnose",
    situation:
      "Robotics work period. Twelve minutes left, and each team does a qualifying run on the tape track at the end of class. Jordan's micro:bit robot followed the black line all the way around yesterday. Today it drives straight off the tape at the first curve. Jordan waves you over.",
    opener: "It followed the line yesterday. Now it just drives straight off at the curve. The run's at the end of class. Can you just fix it?",
    mood: "frustrated",
    hint: "Before choosing a next step, find out what the robot did yesterday, what it does now, and what Jordan changed in between.",
    pos: [0, 1],
    moves: [
      {
        id: "D1.diagnose",
        label: "What did it do yesterday, what does it do now, and what have you changed since then?",
        category: "Asks a focused diagnostic question about the expected behavior, the observed behavior, recent changes, or asks to see the code or robot as tested.",
        quality: "good",
        tags: ["elicit"],
        reply: "Yesterday it made the curve every time. Today it shoots straight off. I changed three things: I sped it up from 40 to 70, raised the sensor bracket so it stops scraping, and cleaned up my variable names.",
        consequence: "Jordan lists three changes. Any one of them could be the cause.",
        mood: "engaged",
        next: "D2",
      },
      {
        id: "D1.sensors",
        label: "Line followers usually fail because of the sensors. Check your sensor readings first.",
        category: "Proposes a specific cause, such as the sensors, for Jordan to check, without first asking what changed.",
        quality: "partial",
        tags: ["interpretation"],
        reply: "Okay. (Jordan holds the robot over the tape and reads the values.) They read the line fine. Both of them. It still drives off.",
        consequence: "Two minutes gone. The sensors work. You still don't know what changed.",
        mood: "frustrated",
        next: "D1b",
        tradeoff: "A reasonable hunch. It cost two minutes before you knew what had changed. Asking first would have pointed straight at the three changes.",
      },
      {
        id: "D1.takeover",
        label: "Let me see your code. I'll find it.",
        category: "Takes over the code or robot, supplies a fix, or tells Jordan exactly what to change without asking anything first.",
        quality: "poor",
        tags: ["takeover"],
        reply: "Okay. (You scroll through the code, set the speed back to 40 and hand the robot back. It makes the curve.) Oh, it works. What did you change?",
        consequence: "The robot makes the curve. Jordan watched but can't explain why.",
        mood: "neutral",
        next: "R1",
      },
      {
        id: "D1.encourage",
        label: "You're close. Keep testing, you'll get it.",
        category: "Offers encouragement or general reassurance without asking for evidence or giving a next step.",
        quality: "poor",
        tags: ["unfocused"],
        reply: "I have been testing. It does the same thing every time. Can you just fix it?",
        consequence: "Jordan asks again. There's still no next step, and less time.",
        mood: "frustrated",
        next: "D1b",
      },
    ],
  },
  D1b: {
    id: "D1b",
    title: "D1b: Refocus",
    situation: "Ten minutes left. Jordan is still stuck and wants you to take over.",
    mood: "frustrated",
    hint: "Guessing at causes and encouragement haven't given Jordan a next step. Ask what changed since yesterday.",
    pos: [1, 0],
    moves: [
      {
        id: "D1b.diagnose",
        label: "Walk me through it. What's different between yesterday's robot and today's?",
        category: "Asks a focused diagnostic question about recent changes or the difference between the working and broken versions.",
        quality: "good",
        tags: ["elicit"],
        reply: "I changed three things. Speed from 40 to 70, I raised the sensor bracket, and I renamed some variables.",
        consequence: "Jordan gives you the evidence that was available from the start.",
        mood: "engaged",
        next: "D2",
      },
      {
        id: "D1b.takeover",
        label: "Fine, hand it over. I'll get it working for your run.",
        category: "Takes over the code or robot, or supplies a fix.",
        quality: "poor",
        tags: ["takeover"],
        reply: "Okay. (You set the speed back to 40. It makes the curve.) Oh. It works. Why?",
        consequence: "The robot makes the curve. Jordan can't explain what changed.",
        mood: "neutral",
        next: "R1",
      },
    ],
  },
  R1: {
    id: "R1",
    title: "R1: Repair",
    situation: "The robot makes the curve because you changed the code. Jordan is ready to head to the track.",
    mood: "neutral",
    hint: "You can still hand the thinking back. Ask what Jordan had changed and which change Jordan thinks mattered.",
    pos: [1, 2],
    moves: [
      {
        id: "R1.repair",
        label: "I jumped in too fast. Before your run: what had you changed, and which one do you think broke it?",
        category: "Recognizes the takeover, returns control to Jordan, and asks for Jordan's changes, evidence or explanation.",
        quality: "good",
        tags: ["repair", "elicit"],
        reply: "Speed from 40 to 70, the sensor bracket, and variable names. I don't know which one broke it.",
        consequence: "The thinking goes back to Jordan. Your takeover stays in the record.",
        mood: "engaged",
        next: "D2",
      },
      {
        id: "R1.continue",
        label: "Great, it works. Go get in line for the track.",
        category: "Accepts the working robot and sends Jordan on without checking understanding.",
        quality: "poor",
        tags: ["takeover"],
        reply: "Okay! (Jordan heads to the track.)",
        consequence: "The robot runs. Jordan's reasoning never came up.",
        mood: "neutral",
        next: "E2",
      },
    ],
  },
  D2: {
    id: "D2",
    title: "D2: Scaffold",
    situation: "Eight minutes to the run. Three changes, one broken robot. Jordan is getting frustrated.",
    opener: "Can we just put all three back? Then at least it works for the run.",
    mood: "frustrated",
    hint: "Reverting everything gets a working robot but no answer. What single change could Jordan test in one run?",
    pos: [2, 1],
    moves: [
      {
        id: "D2.scaffold",
        label: "Put only the speed back to 40 and leave the rest. What do you predict will happen?",
        category: "Proposes one bounded comparison or single-change test and asks Jordan for a prediction.",
        quality: "good",
        tags: ["bounded"],
        reply: "If it's the speed, it'll make the curve even with the bracket up. If it still drives off, it's the bracket.",
        consequence: "Jordan makes a testable prediction and sets up the run.",
        mood: "engaged",
        next: "P1",
      },
      {
        id: "D2.revertAll",
        label: "Sure. Put all three back so you're ready for the run.",
        category: "Agrees to undo all the changes at once so the robot works, without isolating which change mattered.",
        quality: "partial",
        tags: [],
        reply: "(Jordan reverts everything. It makes the curve.) Okay, it works. But now I don't know which one broke it.",
        consequence: "The robot is ready for the run. No one knows which change mattered.",
        mood: "neutral",
        next: "R2b",
        tradeoff: "Reverting guaranteed a working robot for the run. It also erased the evidence of which change broke it, so learning anything took another test.",
      },
      {
        id: "D2.overload",
        label: "Set the speed to 50, lower the bracket halfway and recalibrate the sensors.",
        category: "Gives several changes or steps at once without isolating one.",
        quality: "poor",
        tags: ["overload"],
        reply: "Okay, I did all that. Now it wobbles along the straight part and still misses the curve. Which one did what?",
        consequence: "Three more changes. The result can't tell anyone which one mattered.",
        mood: "frustrated",
        next: "R2",
      },
      {
        id: "D2.unfocused",
        label: "So what do you think is wrong? Explain your thinking.",
        category: "Asks Jordan to explain in general terms with no focus on a specific change, comparison or prediction.",
        quality: "partial",
        tags: ["unfocused"],
        reply: "I don't know! That's why I called you. The run's in eight minutes.",
        consequence: "Jordan's answer is incomplete, and the clock is running.",
        mood: "frustrated",
        next: "D2",
      },
    ],
  },
  R2b: {
    id: "R2b",
    title: "R2b: It works, but which one?",
    situation: "Seven minutes left. The robot works because everything is back the way it was.",
    mood: "neutral",
    hint: "There's time for one test run. Which change could Jordan put back alone?",
    pos: [3, 0],
    moves: [
      {
        id: "R2b.oneAtATime",
        label: "You have time for one test. Put just the speed back up to 70 and run it. What do you expect?",
        category: "Uses the working version to test one change at a time and asks for a prediction.",
        quality: "good",
        tags: ["bounded", "repair"],
        reply: "If 70 is the problem, it'll drive off the curve again. (It does.) Okay, so it's the speed. I'll put it back to 40 for the run.",
        consequence: "One run isolates the cause. Jordan puts the speed back to 40.",
        mood: "engaged",
        next: "D3",
      },
      {
        id: "R2b.go",
        label: "It works. That's what matters for today. Go get in line.",
        category: "Accepts the working robot and ends without isolating the cause or checking reasoning.",
        quality: "partial",
        tags: [],
        reply: "Okay. (Jordan heads to the track.)",
        consequence: "The run will go fine. The next time Jordan speeds it up, it will fail the same way.",
        mood: "neutral",
        next: "E3",
      },
    ],
  },
  P1: {
    id: "P1",
    title: "P1: Interruption",
    situation:
      "As Jordan sets up the test, Maya at the next table calls out. Her hand has been up for three minutes: \"My micro:bit won't download. I've tried twice.\" Her team also runs at the end of class.",
    mood: "thinking",
    hint: "You can't be in two places. What would keep both students moving while you're with one of them?",
    pos: [3, 1],
    moves: [
      {
        id: "P1.triage",
        label: "Maya, I'll be there in two minutes. Unplug the cable and try once more. Jordan, run your test and tell me what happens.",
        category: "Handles the second student briefly while leaving Jordan a specific next step to carry out alone.",
        quality: "good",
        tags: ["triage"],
        reply: "Okay. (Jordan runs the test and waits for you with the result.)",
        consequence: "Maya is trying one thing. Jordan is running the test without you.",
        mood: "engaged",
        next: "D3",
        tradeoff: "Maya waited two more minutes, with one thing to try. Jordan kept working without you.",
      },
      {
        id: "P1.leave",
        label: "Jordan, keep at it. I'll be right back. (You go to Maya.)",
        category: "Leaves Jordan to help the other student without giving Jordan a specific next step.",
        quality: "partial",
        tags: ["noStep"],
        reply: "(While you're with Maya, Jordan changes the turn angle too. When you come back, the robot spins in place.) I tried something else. Now it's worse.",
        consequence: "Maya's robot downloads. Jordan, with no next step, changed a fourth thing.",
        mood: "frustrated",
        next: "R2",
        tradeoff: "Maya got help right away. Jordan, with no next step, changed a fourth thing and lost time you didn't have.",
      },
      {
        id: "P1.wait",
        label: "Maya, you'll have to wait. Jordan, go ahead and run it.",
        category: "Stays with Jordan and asks the other student to wait.",
        quality: "partial",
        tags: [],
        reply: "(Jordan runs the test. Across the room, Maya stops trying and starts packing up.)",
        consequence: "Jordan's test runs. Maya has given up, and her team may miss its run.",
        mood: "neutral",
        next: "D3",
        tradeoff: "Jordan stayed on track, and none of Jordan's scores reflect this choice. Maya gave up, and her team may miss its run. A 20-second step for Maya might have kept both students moving.",
      },
    ],
  },
  R2: {
    id: "R2",
    title: "R2: Simplify",
    situation: "Five minutes left. The robot has changed again, and no one can say why.",
    mood: "frustrated",
    hint: "Go back to one comparison. One change, one prediction, one run.",
    pos: [4, 2],
    moves: [
      {
        id: "R2.simplify",
        label: "Let's go back to yesterday's code, then change only the speed to 70. What do you predict?",
        category: "Returns to a known working version and a single comparison, and asks for a prediction.",
        quality: "good",
        tags: ["bounded", "repair"],
        reply: "If it's the speed, it'll drive off the curve. (It does.) So it's the speed. I'll run at 40.",
        consequence: "One comparison finds the cause, with minutes to spare.",
        mood: "engaged",
        next: "D3",
      },
      {
        id: "R2.continue",
        label: "Keep adjusting things until it works.",
        category: "Continues trial and error without isolating evidence.",
        quality: "poor",
        tags: ["overload"],
        reply: "(Jordan keeps changing numbers. The bell rings before the run.)",
        consequence: "Jordan misses the run and still has no result that means anything.",
        mood: "frustrated",
        next: "E2",
      },
    ],
  },
  D3: {
    id: "D3",
    title: "D3: Verify",
    situation: "Two minutes to the run. With the speed back at 40 and the bracket still raised, the robot makes the curve.",
    mood: "proud",
    hint: "A working robot is not the same as a student who can explain it. Ask what the result shows, and what it doesn't.",
    pos: [5, 1],
    moves: [
      {
        id: "D3.verify",
        label: "Quick, before you go: what does that tell you, and what doesn't it tell you yet?",
        category: "Asks Jordan to explain what the result shows, what it does not show, or what to test next.",
        quality: "good",
        tags: ["verify"],
        reply: "It was the speed, not the bracket. At 70 it goes past the tape before it can turn. It doesn't tell me how fast is too fast. I'll try 55 after the run.",
        consequence: "Jordan explains the result and plans the next test, in under a minute.",
        mood: "proud",
        next: "E1",
      },
      {
        id: "D3.stop",
        label: "Nice! Go get in line for the track.",
        category: "Praises the working result and ends without checking Jordan's reasoning.",
        quality: "partial",
        tags: [],
        reply: "Thanks! (Jordan runs to the track.)",
        consequence: "The robot is ready. You never heard Jordan's reasoning.",
        mood: "proud",
        next: "E3",
      },
      {
        id: "D3.explainForJordan",
        label: "See? At 70 it's too fast to turn in time. Keep it at 40.",
        category: "States the conclusion for Jordan instead of asking Jordan to explain it.",
        quality: "partial",
        tags: ["interpretation"],
        reply: "Oh, okay. Got it.",
        consequence: "You explained the result. Jordan agreed but never explained it.",
        mood: "neutral",
        next: "E3",
      },
    ],
  },
};

const CUES: Record<string, string> = { D1: "track", D1b: "track", D2: "versions", R2b: "working", P1: "waiting", R2: "versions", D3: "working" };
for (const [id, cue] of Object.entries(CUES)) nodes[id].cue = cue;

const endings: Scenario["endings"] = {
  E1: {
    id: "E1",
    title: "E1: Target demonstrated",
    kind: "met",
    text: "Jordan lines up for the run knowing the speed caused it and planning to test 55 next. You heard the reasoning, so you know Jordan could start the next problem without you.",
    mood: "proud",
    pos: [6, 0],
  },
  E3: {
    id: "E3",
    title: "E3: Partial evidence",
    kind: "partial",
    text: "The robot makes its run. You never heard Jordan's reasoning, so you can't tell whether Jordan could solve the next one alone.",
    mood: "neutral",
    pos: [6, 1],
  },
  E2: {
    id: "E2",
    title: "E2: Objective not met",
    kind: "missed",
    text: "The robot may run or not, but Jordan can't explain why. The next time Jordan changes the speed, you'll get waved over again.",
    mood: "neutral",
    pos: [6, 2],
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
  const triage = firstWith(history, ["triage"], tagIndex);
  const noStep = firstWith(history, ["noStep"], tagIndex);

  const T3 = "Kept Jordan doing the work";
  const t3 =
    takeover && !repair
      ? result("T3", T3, "not_observed", "n/a", `You made the change for Jordan. ${quote(takeover)}`, "Hand the robot back. Ask Jordan to make the change and explain it.")
      : takeover && repair
        ? result("T3", T3, "partial", "after_recovery", `You took over, then handed control back. ${quote(repair)}`, "Next time, ask first. The repair worked, but the first move was a takeover.")
        : noStep
          ? result("T3", T3, "partial", supportOf(noStep), `You left without giving Jordan a next step, and Jordan changed a fourth thing. ${quote(noStep)}`, "Before you turn away, leave one specific thing to do: run this test, then tell me what happened.")
          : triage
            ? result("T3", T3, "demonstrated", supportOf(triage), `You handled Maya and left Jordan a test to run alone. ${quote(triage)}`, "Keep leaving a concrete next step whenever you step away.", triage)
            : bounded
              ? result("T3", T3, "demonstrated", supportOf(bounded), "Jordan made and tested every change.", "Keep the next action in Jordan's hands.", bounded)
              : result("T3", T3, "not_observed", "n/a", "The interaction ended before Jordan acted on a next step.", "Give Jordan one step to carry out.");

  return [
    elicit
      ? result("T1", "Elicited Jordan's explanation and evidence", "demonstrated", supportOf(elicit), quote(elicit), "Keep asking what it did before, what it does now and what changed.", elicit)
      : result("T1", "Elicited Jordan's explanation and evidence", "not_observed", "n/a", "No question asked what the robot did before, what it does now, or what changed.", "On the retry, ask what changed since yesterday before choosing a next step."),
    bounded
      ? result("T2", "Chose one bounded next step based on that evidence", "demonstrated", supportOf(bounded), quote(bounded), "Keep each test to one change with a prediction.", bounded)
      : result("T2", "Chose one bounded next step based on that evidence", "not_observed", "n/a", overload ? `You gave several changes at once. ${quote(overload)}` : "No single-change test was proposed.", "Ask Jordan to change one thing and predict the result before running it."),
    t3,
    verify
      ? result("T4", "Checked Jordan's reasoning", "demonstrated", supportOf(verify), quote(verify), "Keep asking what a result shows and what it doesn't, even with the clock running.", verify)
      : result("T4", "Checked Jordan's reasoning", "not_observed", "n/a", "No question asked Jordan to explain the result.", "Before Jordan heads to the track, ask what the result shows and what it doesn't. It takes under a minute."),
  ];
}

export const jordan: Scenario = {
  id: "jordan",
  title: "Can You Just Fix It?",
  domain: "Education · teacher professional development",
  tagline: "A student's line-following robot broke before the qualifying run. Help them find the cause without taking over, while another student waits.",
  scene: "classroom",
  intake: {
    duration: "10 to 15 minutes. That's enough time for one skill: responding to a request for a fix without taking over, under time pressure.",
    situation: "The skill breaks down in the last minutes of a work period, with a deadline and other students waiting. Fixing it yourself is the fastest way to get the robot working.",
    experience: "Teachers who already help students debug one-on-one but take over when time is short. The scenario recalibrates an existing habit, so it starts right away.",
  },
  objective:
    "When a student asks for a fix, the teacher will elicit the student's current explanation and inspect relevant evidence before selecting a next step. The teacher will then ask the student to predict, test and explain that step rather than taking over the task, including when other demands pull the teacher away.",
  transferEvidence:
    "In a later work period where a student asks for help, an observer records whether the teacher carries out those actions, using the same behavior definitions.",
  insufficientEvidence:
    "Finishing the scenario, choosing an option labeled \"ask a question,\" reporting more confidence, or getting the fictional robot working without eliciting student thinking.",
  prebrief: [
    "This is a fictional practice interaction. Jordan and Maya are not real students.",
    "Do not enter real student names, records or identifying incidents.",
    "Respond as you would in class. Your aim is to help Jordan find the cause and take an evidence-based next step, not only to get the robot working.",
    "Some choices are trade-offs, not right or wrong. The debrief shows what each one cost.",
    "Hints are available and recorded separately from independent performance. You can pause at any time. Nothing is timed.",
  ],
  counterpart: {
    name: "Jordan",
    role: "A student whose micro:bit line-following robot stopped working before the qualifying run",
    goal: "Get the robot around the track before the run at the end of class.",
    facts: [
      "The robot followed the line yesterday. Today it drives straight off the tape at the first curve.",
      "Jordan changed three things: speed from 40 to 70, raised the sensor bracket, and renamed variables.",
      "The sensors still read the tape correctly.",
      "Putting only the speed back to 40 makes the robot take the curve. The speed is the cause.",
    ],
    responseRules: [
      "After a focused diagnostic question, Jordan lists the three changes.",
      "After \"Explain your thinking\" with no focus, Jordan gives an incomplete answer and names the time pressure.",
      "After a direct fix, Jordan follows it but can't explain why it works.",
      "After a bounded next step, Jordan makes a prediction, runs one test and reports the result.",
      "Left without a next step, Jordan changes something else.",
    ],
    boundaries: [
      "Jordan does not invent facts beyond the three changes.",
      "Jordan does not become compliant because the teacher sounds friendly.",
      "Jordan never discloses real student information.",
    ],
  },
  learnerPersonas: [
    {
      id: "teacher",
      name: "Classroom teacher",
      summary: "Helps students debug one-on-one. Takes over when time is short.",
      gap: "Execution under time pressure. Knows asking matters, but defaults to fixing.",
      objective:
        "Elicit the student's evidence before choosing a next step, then have the student predict, test and explain, including when another student needs you.",
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
    { nodeId: "D1", line: "It followed the line yesterday. Now it just drives straight off at the curve. The run's at the end of class. Can you just fix it?", goal: "Ask for evidence (what it did yesterday, what it does now, what changed) instead of fixing it." },
    { nodeId: "D2", line: "Can we just put all three back? Then at least it works for the run.", goal: "Propose one bounded test and ask Jordan for a prediction, even under time pressure." },
    { nodeId: "P1", speaker: "Maya", line: "My micro:bit won't download. I've tried twice. Can you come look?", goal: "Give Maya a quick step and leave Jordan a specific test to run while you're away." },
    { nodeId: "D3", line: "It made the curve with the speed back at 40!", goal: "Ask Jordan to explain what the result shows and what it doesn't, in under a minute." },
  ],
  evaluate,
  sources: ["Branching scenarios for behavior change (research guide), worked teacher example"],
};

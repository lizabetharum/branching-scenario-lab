// Written by scripts/conversation-tests.mts. Observed results against designer-authored expectations.
export const conversationRun = {
  "date": "2026-09-28",
  "target": "production build, run locally before deploy",
  "conversations": [
    {
      "id": "C1",
      "name": "Marcus, strong conversation",
      "scenario": "labels",
      "ending": "plan_key",
      "endingText": "Sam heads back with a plan aimed at the shared tray. Check the criteria below. Reaching a plan doesn't mean every criterion was met.",
      "expectedEnding": "plan_key",
      "scores": {
        "P1": "demonstrated",
        "P2": "demonstrated",
        "P3": "demonstrated",
        "P4": "demonstrated"
      },
      "expected": {
        "P1": [
          "demonstrated"
        ],
        "P2": [
          "demonstrated"
        ],
        "P3": [
          "demonstrated"
        ],
        "P4": [
          "demonstrated"
        ]
      },
      "note": "Every criterion quotes a completed behavior, including Sam's proposal and the confirmation.",
      "transcript": [
        "Thanks for coming in. Walk me through what's been happening at your station when these mix-ups happen. → [open, namesConcern] released pattern",
        "What happens to the label you were working on when you get called to the register? → [open] released tray",
        "That makes sense. What do you think would help? → [acknowledge, askOptions] released idea",
        "Let's try it. What will you do first, and when should we check how it's going? → [acknowledge, wayForward, checkin] released commit",
        "Friday works. Let's do it. → [confirms]"
      ],
      "pass": true
    },
    {
      "id": "C2",
      "name": "The reviewer's conversation: directive, repair, ask for a plan",
      "scenario": "labels",
      "ending": "closed",
      "endingText": "Sam goes back to the counter. Nothing in the conversation targets why the errors happen.",
      "expectedEnding": "unconfirmed or closed",
      "scores": {
        "P1": "not_observed",
        "P2": "demonstrated",
        "P3": "partial",
        "P4": "partial"
      },
      "expected": {
        "P1": [
          "partial",
          "not_observed"
        ],
        "P3": [
          "not_observed",
          "partial"
        ],
        "P4": [
          "partial",
          "not_observed"
        ]
      },
      "note": "Pins the reviewer's finding: no plan ending, and no P4 credit for asking. P3 varies between runs (not observed, or partial when the question draws out Sam's surface idea), so either is accepted.",
      "transcript": [
        "You need to slow down and double-check every label. → [instruction]",
        "Sorry, I jumped ahead. What's actually happening at your station when these come up? → [open, acknowledge] released pattern",
        "What will you do first, and when should we check how it is working? → [open, wayForward, checkin] released surfaceIdea"
      ],
      "pass": true
    },
    {
      "id": "C3",
      "name": "Asks for an action that never occurs",
      "scenario": "labels",
      "ending": "closed",
      "endingText": "Sam goes back to the counter. Nothing in the conversation targets why the errors happen.",
      "expectedEnding": "closed",
      "scores": {
        "P1": "partial",
        "P2": "demonstrated",
        "P3": "partial",
        "P4": "partial"
      },
      "expected": {
        "P3": [
          "partial",
          "not_observed"
        ],
        "P4": [
          "partial"
        ]
      },
      "note": "Asked before the cause surfaced. No step and time is proposed or confirmed, so nothing is agreed (P4 partial). P3 is partial when the question draws out Sam's surface idea, otherwise not observed. P3 was first written as not_observed only, then widened when a next-step question began drawing out the character's idea.",
      "transcript": [
        "Walk me through what's been happening at your station when these mix-ups happen. → [open] released pattern",
        "Okay. What will you do first, and when do we check in? → [wayForward, checkin] released surfaceIdea"
      ],
      "pass": true
    },
    {
      "id": "C4",
      "name": "Off-topic second question (review finding 2)",
      "scenario": "labels",
      "ending": "closed",
      "endingText": "Sam goes back to the counter. Nothing in the conversation targets why the errors happen.",
      "expectedEnding": "closed",
      "scores": {
        "P1": "partial",
        "P2": "demonstrated",
        "P3": "not_observed",
        "P4": "not_observed"
      },
      "expected": {
        "P1": [
          "partial"
        ],
        "P3": [
          "not_observed"
        ],
        "P4": [
          "not_observed"
        ]
      },
      "note": "The shared tray must stay hidden after a question that isn't about it, and the general question earns no P1 credit.",
      "transcript": [
        "Walk me through what's been happening at your station when these mix-ups happen. → [open] released pattern",
        "What would make this conversation useful for you? → [open]"
      ],
      "pass": true
    },
    {
      "id": "C6",
      "name": "Ana: cause found, no plan (review 2, finding 2)",
      "scenario": "labels-b",
      "ending": "closed",
      "endingText": "You found the cause: the new form puts the prescriber's phone right above the customer's. The conversation ended before Ana proposed a fix and you agreed on it, so nothing changes yet.",
      "expectedEnding": "closed",
      "scores": {
        "P1": "demonstrated",
        "P2": "demonstrated",
        "P3": "not_observed",
        "P4": "not_observed"
      },
      "expected": {
        "P1": [
          "demonstrated"
        ],
        "P4": [
          "not_observed"
        ]
      },
      "note": "The ending must acknowledge the diagnosis (the form layout) and name the missing agreement, not say nothing targeted the cause.",
      "transcript": [
        "Walk me through how these wrong numbers end up in the system. → [open] released pattern",
        "When you're typing a number in, what are you looking at on the screen? → [open] released form"
      ],
      "pass": true
    },
    {
      "id": "C5",
      "name": "Priya, strong conversation",
      "scenario": "pickup",
      "ending": "plan_key",
      "endingText": "Dev heads back with a plan for the four-to-six block. What you saw at the counter had a cause you couldn't see from there.",
      "expectedEnding": "plan_key",
      "scores": {
        "Q1": "demonstrated",
        "Q2": "demonstrated",
        "Q3": "demonstrated",
        "Q4": "demonstrated"
      },
      "expected": {
        "Q1": [
          "demonstrated"
        ],
        "Q2": [
          "demonstrated"
        ],
        "Q3": [
          "demonstrated"
        ],
        "Q4": [
          "demonstrated"
        ]
      },
      "note": "Q4 needs Dev's own idea, Dev's proposal and Priya's confirmation.",
      "transcript": [
        "Thanks for coming in. A customer said yesterday they felt rushed at pickup, and I've noticed a couple of quick handoffs this week. What's been going on? → [namesConcern, open] released busier",
        "What's different about how the afternoons run now? → [open] released drive",
        "I didn't know that. What do you think would help? → [acknowledge, askOptions] released idea",
        "Let's try that. What's the first step, and when should we check in? → [wayForward, checkin] released commit",
        "Friday it is. Thanks, Dev. → [confirms, closes]"
      ],
      "pass": true
    }
  ]
} as const;

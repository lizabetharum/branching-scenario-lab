# Branching Scenario Lab

Two AI-supported branching scenarios built for behavior change, not completion.

- **The Label Conversation**: a pharmacy manager coaches a technician through GROW after a pattern of labeling errors. Two learner personas (Marcus and Priya) with different objectives and support.
- **Can You Just Fix It?**: a teacher helps a student find a problem without taking over the project.

Live: https://branching-scenario-lab.vercel.app · Design notes: https://branching-scenario-lab.vercel.app/design

## How it works

The branch maps are authored in `src/lib/scenarios/`. In free-text mode, one model call sorts the learner's reply into one of the moves allowed at the current node, or into a guardrail category, and rephrases the authored character line. The app, not the model, decides the next node and scores the criteria.

Guardrails check for personal information, rule overrides and clinical questions before anything reaches the model. The model then catches off-topic chat, personal-advice requests and unclear replies. Character replies are checked for leaks and clinical terms, and the authored line is used whenever a reply fails those checks. No transcripts, accounts or analytics.

## Scripts

```bash
npm run dev
npx tsx scripts/check-maps.ts                    # every node reachable, ideal path meets all criteria
node scripts/guardrail-tests.mjs <url> [--write] # AI and guardrail test cases
```

The model is set in `src/lib/model.ts`. The Vercel AI Gateway free tier blocks Claude models, so the default is `openai/gpt-oss-120b`. Rerun the guardrail tests after any model change.

All people, places and events are fictional. Not clinical decision support. The scenarios have not been tested with real learners.

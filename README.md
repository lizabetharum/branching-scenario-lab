# Branching Scenario Lab

Three practice conversations in two formats, built for behavior change, not completion.

- **The Label Conversation** (Marcus, open conversation): a confident manager coaches a technician after labeling errors. Telling and leading shut the technician down.
- **The Pickup Counter** (Priya, open conversation): a new manager asks a technician why they've been rushing customers. Softening and self-answered questions earn nothing.
- **Can You Just Fix It?** (fixed branching tree): a teacher helps a student without taking over the project.

Live: https://branching-scenario-lab.vercel.app · Design notes: https://branching-scenario-lab.vercel.app/design

## How it works

**Fact packet (pharmacy).** No tree. The character holds facts with release rules (`src/lib/convo/`). Each turn makes two model calls with separate roles. A tagger labels the learner's behavior and never plays the character. The counterpart plays the character using only released facts. The engine, in code, decides guard level, fact release, endings and scores. Replies that leak an unreleased fact, or skip a fact the learner earned, are swapped for authored lines.

**Fixed tree (classroom).** Authored map in `src/lib/scenarios/`. One model call matches the reply to an allowed move and rephrases the authored line. The app picks the next node and scores the path.

**Guardrails.** Checks for personal information, rule overrides and clinical questions run before any model call. The tagger or classifier then catches off-topic chat and requests for personal advice. No transcripts, accounts or analytics. Voice input is optional and uses the browser's speech service.

## Scripts

```bash
npm run dev
npx tsx scripts/check-maps.ts                    # tree reachability, scoring regressions, fact-packet engine rules
node scripts/convo-sim.mjs <url> labels "line 1" "line 2"   # play a scripted conversation
node scripts/guardrail-tests.mjs <url> [--write] # AI and guardrail test cases
```

Models are set in `src/lib/model-info.ts` and `src/lib/model.ts` (Anthropic API, `ANTHROPIC_API_KEY`). Rerun the guardrail tests after any model or prompt change.

All people, places and events are fictional. Not clinical decision support. The scenarios have not been tested with real learners.

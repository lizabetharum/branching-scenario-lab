import { anthropic } from "@ai-sdk/anthropic";
import { COUNTERPART_DEFAULT, DEFAULT_MODEL } from "./model-info";

// Server only. Calls go straight to the Anthropic API with ANTHROPIC_API_KEY.
// After any change, rerun scripts/guardrail-tests.mjs before deploying.
export const MODEL_ID = process.env.AI_MODEL ?? DEFAULT_MODEL;
export const model = () => anthropic(MODEL_ID);
/** The character voice needs speed more than judgment, so it uses a smaller model. */
export const COUNTERPART_MODEL_ID = process.env.AI_COUNTERPART_MODEL ?? COUNTERPART_DEFAULT;
export const counterpartModel = () => anthropic(COUNTERPART_MODEL_ID);

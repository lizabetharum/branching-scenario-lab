import { anthropic } from "@ai-sdk/anthropic";

// One place for the model choice, so the privacy notice always matches what runs.
// Calls go straight to the Anthropic API with ANTHROPIC_API_KEY.
// After any change, rerun scripts/guardrail-tests.mjs before deploying.
export const MODEL_ID = process.env.AI_MODEL ?? "claude-sonnet-5";
export const DEFAULT_MODEL = "claude-sonnet-5";
export const PROVIDER_LABEL = "Anthropic's Claude, through the Anthropic API";
export const model = () => anthropic(MODEL_ID);

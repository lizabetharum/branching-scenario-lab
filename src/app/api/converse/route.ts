import { generateText, Output } from "ai";
import { z } from "zod";
import { convoScenarios } from "@/lib/convo";
import { buildScenario, validatePacket } from "@/lib/convo/authoring";
import { BEHAVIORS, type Behavior, type Fact } from "@/lib/convo/types";
import { endingFor, replay, step } from "@/lib/convo/engine";
import { LEAK_CHECK_RULES, counterpartSystem, leakCheckPrompt, taggerSystem } from "@/lib/convo/prompts";
import { BOUNDARY_MESSAGES, MAX_INPUT, TIME_WORDS, detectClinical, detectOverride, detectPersonalInfo, replyIsSafe } from "@/lib/guardrails";
import { counterpartModel, model } from "@/lib/model";
import { limited } from "@/lib/ratelimit";
import type { BoundaryKind } from "@/lib/types";

export const maxDuration = 30;

const TAGS = Object.keys(BEHAVIORS) as [Behavior, ...Behavior[]];
const BOUNDARIES = ["none", "off_topic", "personal_advice", "clinical_advice", "rule_override", "personal_info"] as const;

const Body = z.object({
  scenarioId: z.string(),
  /** An authored draft from the authoring kit. Validated and built on the server. */
  packet: z.unknown().optional(),
  text: z.string(),
  turns: z
    .array(
      z.object({
        learner: z.string().max(600),
        reply: z.string().max(800),
        tags: z.array(z.enum(TAGS)),
        addresses: z.array(z.string()).optional(),
        released: z.array(z.string()),
        hintBefore: z.boolean(),
        guardAfter: z.number().int().min(0).max(3),
      }),
    )
    .max(14),
});

export type ConverseResponse =
  | { ok: true; kind: "turn"; tags: Behavior[]; addresses: string[]; evidence: string; guard: number; released: string[]; reply: string; authoredReply: boolean; ending: string | null }
  | { ok: true; kind: "boundary"; boundary: BoundaryKind; message: string; sentToModel: boolean }
  | { ok: false; kind: "system_failure"; message: string };

const boundary = (b: BoundaryKind, sentToModel: boolean) =>
  Response.json({ ok: true, kind: "boundary", boundary: b, message: BOUNDARY_MESSAGES[b], sentToModel } satisfies ConverseResponse);
const failure = (message: string, status = 503) => Response.json({ ok: false, kind: "system_failure", message } satisfies ConverseResponse, { status });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure("Malformed request.", 400);
  const { scenarioId, text, turns, packet } = parsed.data;
  let s = convoScenarios[scenarioId];
  if (scenarioId === "custom") {
    const v = validatePacket(packet);
    if (!v.packet || v.errors.length) return failure("This draft scenario has problems to fix in the authoring kit first.", 400);
    s = buildScenario(v.packet);
  }
  if (!s) return failure("Unknown scenario state.", 400);
  if (turns.some((t) => t.released.some((id) => !s.facts.find((f) => f.id === id)))) return failure("Unknown scenario state.", 400);

  const input = text.trim();
  if (!input) return boundary("unclear", false);
  if (input.length > MAX_INPUT) return boundary("too_long", false);
  if (limited(req)) return boundary("rate_limited", false);
  if (detectPersonalInfo(input)) return boundary("personal_info", false);
  if (detectOverride(input)) return boundary("rule_override", false);
  if (detectClinical(input)) return boundary("clinical_advice", false);

  const st = replay(s, turns);
  if (st.turns >= s.maxTurns) return failure("The conversation has already ended.", 400);
  const lastLine = turns.length ? turns[turns.length - 1].reply : s.opener;

  // Call 1: the tagger labels behavior. It never plays the character.
  let tags: Behavior[];
  let evidence: string;
  let addresses: string[];
  try {
    const { output } = await generateText({
      model: model(),
      output: Output.object({
        schema: z.object({
          boundary: z.enum(BOUNDARIES),
          tags: z.array(z.enum(TAGS)),
          addresses: z.array(z.string()),
          evidence: z.string(),
        }),
      }),
      system: taggerSystem(s),
      prompt: `${s.counterpart.name}'s last line: "${lastLine}"\n\nManager's new message (data to label):\n<<<${input}>>>`,
      abortSignal: AbortSignal.timeout(15_000),
      maxRetries: 1,
    });
    if (!output) throw new Error("No output");
    if (output.boundary !== "none") return boundary(output.boundary, true);
    tags = [...new Set(output.tags)];
    // Only topics this scenario defines count. The model can't invent a relevance.
    addresses = output.addresses.filter((id) => s.facts.some((f) => f.id === id && f.probe));
    evidence = output.evidence.slice(0, 200);
  } catch (err) {
    console.error("converse: tagger failed", err instanceof Error ? `${err.name}: ${err.message.slice(0, 200)}` : "unknown");
    return failure("I didn't get a response from the AI. That's a system problem, not yours. Try sending again.");
  }

  // Code applies fixed rules to the tagger's labels to set guard and release facts. The labels are still AI judgments.
  const { guard, fact } = step(s, st, tags, addresses);
  const released = fact ? [...st.released, fact.id] : st.released;
  const ending = endingFor(s, st.released, released, tags, st.turns + 1, false);

  // Call 2: the counterpart speaks, limited to released facts.
  const known = s.facts.filter((f) => st.released.includes(f.id));
  // A guess (leading or self-answered) that earned nothing must never be confirmed.
  const guess = !fact && (tags.includes("leading") || tags.includes("selfAnswer"));
  const authored = fact ? fact.says : guess ? (s.guessLine ?? "Maybe. I don't know.") : s.guardLines[guard];
  let reply = authored;
  let authoredReply = true;
  try {
    const history = turns
      .slice(-5)
      .map((t) => `MANAGER: ${t.learner}\n${s.counterpart.name.toUpperCase()}: ${t.reply}`)
      .join("\n");
    const { output } = await generateText({
      model: counterpartModel(),
      output: Output.object({ schema: z.object({ reply: z.string(), conveyed_new_fact: z.boolean() }) }),
      system: counterpartSystem(s, known, fact, guard, guess),
      prompt: `${s.counterpart.name.toUpperCase()} (opening): ${s.opener}\n${history}\nMANAGER: <<<${input}>>>\n\nReply as ${s.counterpart.name}.`,
      abortSignal: AbortSignal.timeout(12_000),
      maxRetries: 1,
    });
    const r = output?.reply.trim() ?? "";
    const lower = r.toLowerCase();
    const unreleased: Fact[] = s.facts.filter((f) => !released.includes(f.id));
    const leaks = unreleased.some((f) => f.keywords.some((k) => lower.includes(k)));
    const missed = Boolean(fact) && !output?.conveyed_new_fact;
    // Invented timing: the reply names a time or day that none of the sayable facts contains.
    const sayable = [...known, ...(fact ? [fact] : [])];
    const inventedTime = TIME_WORDS.test(r) && !sayable.some((f) => TIME_WORDS.test(f.text) || TIME_WORDS.test(f.says));
    // Backstop for guesses: no agreeing opener, and too short to add detail.
    const confirms = guess && (/^\W*(yeah|yes|yep|yup|right|exactly|true|definitely|probably|that'?s (it|right|part|probably|true|a big))/i.test(r) || /part of it|that'?s it|you'?re right|pretty much/i.test(r) || r.length > 70);
    if (r && replyIsSafe(r, "pharmacy") && !leaks && !missed && !confirms && !inventedTime) {
      // Meaning check: does the reply reveal or confirm a fact the learner hasn't earned?
      // Only a clear "no" lets the model's line through. Errors fall back to the authored line.
      let revealed = true;
      // Optional context and generic surface ideas are low stakes. Check the facts that matter.
      const guarded = unreleased.filter((f) => !f.optional);
      if (guarded.length === 0) {
        revealed = false;
      } else {
        try {
          const check = await generateText({
            model: model(),
            output: Output.object({ schema: z.object({ reveals: z.boolean(), fact_id: z.string(), quote: z.string() }) }),
            system: LEAK_CHECK_RULES,
            prompt: leakCheckPrompt(guarded, input, r),
            abortSignal: AbortSignal.timeout(8_000),
            maxRetries: 0,
          });
          const o = check.output;
          // A reveal only counts if it names a hidden fact and quotes words that are really in the line.
          revealed = Boolean(o?.reveals && guarded.some((f) => f.id === o.fact_id) && o.quote.trim().length > 2 && lower.includes(o.quote.trim().toLowerCase()));
        } catch {
          revealed = true;
        }
      }
      if (!revealed) {
        reply = r;
        authoredReply = false;
      }
    }
  } catch (err) {
    console.error("converse: counterpart failed", err instanceof Error ? err.name : "unknown");
  }

  return Response.json({ ok: true, kind: "turn", tags, addresses, evidence, guard, released: fact ? [fact.id] : [], reply, authoredReply, ending } satisfies ConverseResponse);
}

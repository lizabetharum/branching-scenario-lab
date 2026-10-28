import { jordan } from "./jordan";
import type { Scenario, Turn } from "../types";

export const scenarios: Record<string, Scenario> = { jordan };

/** The ending text plus any cost the learner's path carried into it, such as lost time. */
export function endingText(s: Scenario, endingId: string, history: Turn[]): string {
  const moves = Object.values(s.nodes).flatMap((n) => n.moves);
  const notes = history.map((t) => moves.find((m) => m.id === t.moveId)?.endingNote).filter(Boolean);
  return [s.endings[endingId].text, ...notes].join(" ");
}

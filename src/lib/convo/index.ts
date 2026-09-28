import { labels } from "./labels";
import { pickup } from "./pickup";
import { labelsB, pickupB } from "./variants";
import type { ConvoScenario } from "./types";

export const convoScenarios: Record<string, ConvoScenario> = { labels, "labels-b": labelsB, pickup, "pickup-b": pickupB };

/** Other cases that practice the same skill. */
export const casesFor = (s: ConvoScenario) => Object.values(convoScenarios).filter((c) => c.caseGroup === s.caseGroup);

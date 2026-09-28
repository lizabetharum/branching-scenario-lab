import { grow } from "./grow";
import { jordan } from "./jordan";
import type { Scenario } from "../types";

export const scenarios: Record<string, Scenario> = { jordan, grow };
export const scenarioList = [grow, jordan];

import type { Behavior } from "./types";

export const TAG_LABEL: Record<Behavior, string> = {
  open: "Open question",
  closed: "Closed question",
  leading: "Leading question",
  selfAnswer: "Answered own question",
  interpretation: "Interpretation",
  instruction: "Supplied the plan",
  askOptions: "Asked for ideas",
  wayForward: "Next step",
  checkin: "Check-in",
  acknowledge: "Acknowledged",
  namesConcern: "Named the concern",
  overSoften: "Over-softened",
  confirms: "Confirmed a proposed plan",
  closes: "Closed the conversation",
};


/** Plain-language version of a release rule, for the design page. */
export function describeRule(r: import("./types").Fact["release"], factLabel: (id: string) => string, name: string, probe?: string): string {
  const parts = [r.anyOf.map((b) => TAG_LABEL[b].toLowerCase()).join(" or ") + (probe ? ` that ${probe}` : "")];
  if (r.needsConcern) parts.push("after the concern has been named");
  if (r.needsInstruction) parts.push("only if you supplied a plan yourself earlier");
  if (r.unless?.length) parts.push(`never after "${r.unless.map(factLabel).join(", ")}"`);
  if (r.requires?.length) parts.push(`after "${r.requires.map(factLabel).join(", ")}"`);
  if (r.minValidOpens) parts.push(`once ${r.minValidOpens} open question${r.minValidOpens > 1 ? "s" : ""} have been left for ${name} to answer`);
  parts.push(`only if ${name}'s guard is ${r.maxGuard} or lower`);
  return parts.join(", ");
}

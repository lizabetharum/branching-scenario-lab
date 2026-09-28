import { notFound } from "next/navigation";
import { Player } from "@/components/Player";
import { ConversationPlayer } from "@/components/ConversationPlayer";
import { scenarios } from "@/lib/scenarios";
import { convoScenarios } from "@/lib/convo";

export function generateStaticParams() {
  return [...Object.keys(convoScenarios), ...Object.keys(scenarios)].map((id) => ({ id }));
}

export async function generateMetadata(props: PageProps<"/scenario/[id]">) {
  const { id } = await props.params;
  return { title: `${convoScenarios[id]?.title ?? scenarios[id]?.title ?? "Scenario"} · Branching Scenario Lab` };
}

export default async function Page(props: PageProps<"/scenario/[id]">) {
  const { id } = await props.params;
  if (convoScenarios[id]) return <ConversationPlayer scenarioId={id} />;
  if (scenarios[id]) return <Player scenarioId={id} />;
  notFound();
}

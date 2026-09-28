import { notFound } from "next/navigation";
import { Player } from "@/components/Player";
import { scenarios } from "@/lib/scenarios";

export function generateStaticParams() {
  return Object.keys(scenarios).map((id) => ({ id }));
}

export async function generateMetadata(props: PageProps<"/scenario/[id]">) {
  const { id } = await props.params;
  return { title: `${scenarios[id]?.title ?? "Scenario"} · Branching Scenario Lab` };
}

export default async function Page(props: PageProps<"/scenario/[id]">) {
  const { id } = await props.params;
  if (!scenarios[id]) notFound();
  return <Player scenarioId={id} />;
}

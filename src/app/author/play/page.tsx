import type { Metadata } from "next";
import { DraftPlayer } from "@/components/DraftPlayer";

export const metadata: Metadata = { title: "Playtest your draft · Branching Scenario Lab", robots: { index: false } };

export default function Page() {
  return <DraftPlayer />;
}

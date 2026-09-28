import type { Metadata } from "next";
import { ReviewView } from "@/components/ReviewView";

export const metadata: Metadata = { title: "Facilitator review · Branching Scenario Lab", robots: { index: false } };

export default function Page() {
  return <ReviewView />;
}

import type { Metadata } from "next";
import { AuthoringKit } from "@/components/AuthoringKit";

export const metadata: Metadata = { title: "Authoring kit · Branching Scenario Lab" };

export default function Page() {
  return <AuthoringKit />;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildScenario, validatePacket, type AuthoredPacket } from "@/lib/convo/authoring";
import { ConversationPlayer } from "./ConversationPlayer";
import { DRAFT_KEY } from "./AuthoringKit";

/** Plays the draft saved by the authoring kit in this browser tab. */
export function DraftPlayer() {
  const [packet, setPacket] = useState<AuthoredPacket | null | "missing">(null);
  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY) ?? localStorage.getItem(DRAFT_KEY);
    const v = raw ? validatePacket(JSON.parse(raw)) : { errors: ["none"] as string[] };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPacket("packet" in v && v.packet && !v.errors.length ? v.packet : "missing");
  }, []);
  if (packet === null) return null;
  if (packet === "missing")
    return (
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-extrabold">No draft to play</h1>
        <p className="mt-3 text-ink/80">Open the authoring kit, fix any problems, and choose Playtest.</p>
        <Link href="/author" className="btn-primary mt-5">Go to the authoring kit</Link>
      </section>
    );
  return (
    <>
      <div className="mx-auto max-w-7xl px-5 pt-4"><Link href="/author" className="link text-sm">← Back to the authoring kit</Link></div>
      <ConversationPlayer scenarioId="custom" custom={{ scenario: buildScenario(packet), packet }} />
    </>
  );
}

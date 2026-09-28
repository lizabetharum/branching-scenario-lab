import type { ConvoTurn } from "./types";

// A review link carries the whole attempt in the URL fragment (after "#").
// Browsers never send the fragment to a server, so this app stores nothing.
// Anyone who has the link can read it, so the learner decides who gets it.

export interface SharedAttempt {
  v: 1;
  scenarioId: string;
  ending: string;
  turns: ConvoTurn[];
  flagged: number[];
  interrupted: boolean;
  hints: { requested: number; auto: number };
  reflection?: string;
}

const toB64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeAttempt(a: SharedAttempt): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(a));
  return toB64url(await pipe(raw, new CompressionStream("deflate-raw")));
}

export async function decodeAttempt(code: string): Promise<SharedAttempt> {
  const bytes = await pipe(fromB64url(code.trim()), new DecompressionStream("deflate-raw"));
  const a = JSON.parse(new TextDecoder().decode(bytes)) as SharedAttempt;
  if (a.v !== 1 || !Array.isArray(a.turns)) throw new Error("Not a review link from this app.");
  return a;
}

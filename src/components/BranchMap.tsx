import type { Quality, Scenario } from "@/lib/types";

const CW = 108;
const RH = 80;
const BW = 90;
const BH = 42;
const PAD = 14;

const EDGE: Record<Quality, { stroke: string; dash?: string; width: number; label: string }> = {
  good: { stroke: "#0f766e", width: 2.6, label: "Stronger move (solid)" },
  partial: { stroke: "#b7791f", dash: "7 5", width: 2.2, label: "Partial move (dashed)" },
  poor: { stroke: "#c2412d", dash: "2 5", width: 2.2, label: "Weaker move (dotted)" },
};

/**
 * mode "play": only nodes you have visited are labeled. Quality labels stay hidden.
 * mode "debrief": the full structure, with your path highlighted. Still no quality labels.
 * mode "author": everything, including the author-only quality of each move.
 */
export function BranchMap({
  scenario,
  path,
  current,
  mode,
}: {
  scenario: Scenario;
  path: string[];
  current?: string;
  mode: "play" | "debrief" | "author";
}) {
  const all = { ...scenario.nodes, ...scenario.endings } as Record<string, { id: string; title: string; pos: [number, number] }>;
  const cols = Math.max(...Object.values(all).map((n) => n.pos[0])) + 1;
  const w = cols * CW + PAD * 2 - (CW - BW);
  const h = 3 * RH + PAD * 2 - (RH - BH);
  const xy = (id: string) => {
    const [c, r] = all[id].pos;
    return [PAD + c * CW, PAD + r * RH] as const;
  };
  const visited = new Set(path);
  const traversed = new Set(path.slice(1).map((id, i) => `${path[i]}>${id}`));

  const edges = Object.values(scenario.nodes).flatMap((n) =>
    n.moves.map((m) => ({ from: n.id, to: m.next, quality: m.quality, id: m.id })),
  );
  // Collapse duplicate from>to pairs, keeping the strongest quality for author view.
  const rank = { good: 0, partial: 1, poor: 2 } as const;
  const unique = new Map<string, (typeof edges)[number]>();
  for (const e of edges) {
    const k = `${e.from}>${e.to}`;
    const prev = unique.get(k);
    if (!prev || rank[e.quality] < rank[prev.quality]) unique.set(k, e);
  }

  const labelled = (id: string) => mode !== "play" || visited.has(id);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Branch map for ${scenario.title}. ${path.length ? `Your path: ${path.map((p) => all[p]?.title ?? p).join(", then ")}.` : ""}`}
      >
        <defs>
          <marker id={`arrow-${mode}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#6b7280" />
          </marker>
        </defs>
        {[...unique.values()].map((e) => {
          const k = `${e.from}>${e.to}`;
          const on = traversed.has(k);
          if (mode === "play" && !on) return null;
          const [x1, y1] = xy(e.from);
          const [x2, y2] = xy(e.to);
          let d: string;
          if (e.from === e.to) {
            d = `M${x1 + BW * 0.3} ${y1} C${x1 + BW * 0.2} ${y1 - 26} ${x1 + BW * 0.8} ${y1 - 26} ${x1 + BW * 0.7} ${y1}`;
          } else {
            const sx = x1 + BW, sy = y1 + BH / 2, tx = x2, ty = y2 + BH / 2;
            const mx = (sx + tx) / 2;
            d = `M${sx} ${sy} C${mx} ${sy} ${mx} ${ty} ${tx - 2} ${ty}`;
          }
          const style = EDGE[e.quality];
          return (
            <path
              key={k}
              d={d}
              fill="none"
              stroke={mode === "author" ? style.stroke : on ? "#1d2433" : "#c3c8d0"}
              strokeWidth={on ? 3.2 : mode === "author" ? style.width : 1.6}
              strokeDasharray={mode === "author" ? style.dash : undefined}
              markerEnd={`url(#arrow-${mode})`}
              opacity={mode === "author" || on ? 1 : 0.8}
            />
          );
        })}
        {Object.values(all).map((n) => {
          const [x, y] = xy(n.id);
          const isEnd = n.id in scenario.endings;
          const kind = isEnd ? scenario.endings[n.id].kind : null;
          const isCurrent = current === n.id;
          const seen = visited.has(n.id);
          const show = labelled(n.id);
          const [code, ...rest] = n.title.split(": ");
          return (
            <g key={n.id} transform={`translate(${x} ${y})`} className={isCurrent ? "map-current" : undefined}>
              <rect
                width={BW}
                height={BH}
                rx={isEnd ? 21 : 8}
                fill={!show ? "#f1f3f5" : seen ? (isEnd ? (kind === "met" ? "#dff3ec" : kind === "partial" ? "#fbf0d6" : "#fbe3dd") : "#fff") : "#fafafa"}
                stroke={isCurrent ? "#e3a83b" : seen ? "#1d2433" : "#c3c8d0"}
                strokeWidth={isCurrent ? 3.5 : seen ? 2 : 1.2}
                strokeDasharray={!show ? "4 4" : undefined}
              />
              {show ? (
                <>
                  <text x={BW / 2} y={17} textAnchor="middle" fontSize={12} fontWeight={800} fill="#1d2433">
                    {code}
                  </text>
                  <text x={BW / 2} y={32} textAnchor="middle" fontSize={8.5} fill="#4b5563">
                    {(rest.join(": ") || "").slice(0, 20)}
                  </text>
                </>
              ) : (
                <text x={BW / 2} y={26} textAnchor="middle" fontSize={12} fill="#9ca3af">?</text>
              )}
            </g>
          );
        })}
      </svg>
      {mode === "author" && (
        <figcaption className="mt-3 flex flex-wrap gap-4 text-sm text-ink/80">
          {(Object.keys(EDGE) as Quality[]).map((q) => (
            <span key={q} className="inline-flex items-center gap-2">
              <svg width="36" height="10" aria-hidden>
                <path d="M2 5h32" stroke={EDGE[q].stroke} strokeWidth={3} strokeDasharray={EDGE[q].dash} />
              </svg>
              {EDGE[q].label}
            </span>
          ))}
          <span>Round boxes are endings.</span>
        </figcaption>
      )}
      {mode === "play" && <figcaption className="sr-only">Unvisited points on the map are shown as question marks.</figcaption>}
    </figure>
  );
}

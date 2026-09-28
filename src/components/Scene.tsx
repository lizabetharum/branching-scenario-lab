import type { Mood } from "@/lib/types";

// Hand-built SVG illustrations. The scene changes with the character's mood and
// shows a visual cue when a relevant fact appears. That cue is deliberate: the
// research finds that making relevant information noticeable matters more than
// photo realism.

const INK = "#1d2433";

function Face({ mood, cx, cy }: { mood: Mood; cx: number; cy: number }) {
  const eyeY = cy - 2;
  const brow = {
    neutral: [0, 0],
    frustrated: [5, -5],
    guarded: [2, -2],
    engaged: [-3, 3],
    thinking: [-4, 1],
    proud: [-3, 3],
  }[mood];
  const mouth = {
    neutral: `M${cx - 7} ${cy + 12} h14`,
    frustrated: `M${cx - 8} ${cy + 15} q8 -7 16 0`,
    guarded: `M${cx - 5} ${cy + 13} h10`,
    engaged: `M${cx - 8} ${cy + 11} q8 6 16 0`,
    thinking: `M${cx - 4} ${cy + 13} q4 2 8 -1`,
    proud: `M${cx - 10} ${cy + 10} q10 11 20 0`,
  }[mood];
  return (
    <g stroke={INK} strokeWidth={2.4} strokeLinecap="round" fill="none">
      {mood === "proud" ? (
        <>
          <path d={`M${cx - 13} ${eyeY} q4 -4 8 0`} />
          <path d={`M${cx + 5} ${eyeY} q4 -4 8 0`} />
        </>
      ) : (
        <>
          <circle cx={cx - 9 + (mood === "thinking" ? 3 : 0)} cy={eyeY - (mood === "thinking" ? 2 : 0)} r={2.4} fill={INK} stroke="none" />
          <circle cx={cx + 9 + (mood === "thinking" ? 3 : 0)} cy={eyeY - (mood === "thinking" ? 2 : 0)} r={2.4} fill={INK} stroke="none" />
        </>
      )}
      <path d={`M${cx - 15} ${eyeY - 9 - brow[1]} L${cx - 4} ${eyeY - 9 + brow[0] - brow[1]}`} />
      <path d={`M${cx + 15} ${eyeY - 9 - brow[1]} L${cx + 4} ${eyeY - 9 + brow[0] - brow[1]}`} />
      <path d={mouth} />
    </g>
  );
}

function Person({
  x,
  y,
  mood,
  skin,
  hair,
  shirt,
  hairStyle,
  crossed,
  badge,
}: {
  x: number;
  y: number;
  mood: Mood;
  skin: string;
  hair: string;
  shirt: string;
  hairStyle: "short" | "curly" | "bun";
  crossed?: boolean;
  badge?: boolean;
}) {
  const bob = mood === "proud" || mood === "engaged" ? -3 : mood === "frustrated" ? 2 : 0;
  return (
    <g transform={`translate(${x} ${y + bob})`} className="scene-person">
      {/* torso */}
      <path d="M-58 150 q0 -78 58 -84 q58 6 58 84 z" fill={shirt} />
      <path d="M-12 66 l12 16 l12 -16" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={3} />
      {badge && <rect x={18} y={92} width={20} height={14} rx={3} fill="#fff" stroke={INK} strokeWidth={1.5} />}
      {/* arms */}
      {crossed ? (
        <path d="M-46 118 q46 -16 92 0 q-46 20 -92 0z" fill={shirt} stroke="rgba(0,0,0,.2)" strokeWidth={2} />
      ) : (
        <>
          <path d="M-56 150 q-6 -40 6 -62" stroke="rgba(0,0,0,.12)" strokeWidth={3} fill="none" />
          <path d="M56 150 q6 -40 -6 -62" stroke="rgba(0,0,0,.12)" strokeWidth={3} fill="none" />
        </>
      )}
      {/* neck and head */}
      <rect x={-9} y={50} width={18} height={20} fill={skin} />
      <circle cx={0} cy={22} r={38} fill={skin} />
      {hairStyle === "short" && <path d="M-38 16 q2 -44 40 -42 q38 2 36 42 q-8 -22 -38 -24 q-28 0 -38 24z" fill={hair} />}
      {hairStyle === "curly" && (
        <g fill={hair}>
          {[-30, -16, 0, 16, 30].map((cx, i) => (
            <circle key={i} cx={cx} cy={-12 + Math.abs(cx) / 4} r={15} />
          ))}
          <circle cx={-36} cy={6} r={10} />
          <circle cx={36} cy={6} r={10} />
        </g>
      )}
      {hairStyle === "bun" && (
        <g fill={hair}>
          <circle cx={0} cy={-26} r={13} />
          <path d="M-38 18 q0 -42 38 -42 q38 0 38 42 q-10 -26 -38 -26 q-28 0 -38 26z" />
        </g>
      )}
      <Face mood={mood} cx={0} cy={24} />
    </g>
  );
}

/** The learner's own character, seen from behind, so the scene is in their point of view. */
function Learner({ x, color, hair }: { x: number; color: string; hair: string }) {
  return (
    <g transform={`translate(${x} 300)`} aria-hidden>
      <path d="M-90 80 q0 -70 90 -76 q90 6 90 76z" fill={color} />
      <circle cx={0} cy={-26} r={44} fill={hair} />
    </g>
  );
}

function Classroom({ mood, cue }: { mood: Mood; cue?: string }) {
  return (
    <>
      <rect width={640} height={360} fill="#efe6d4" />
      <rect y={270} width={640} height={90} fill="#d8c6a4" />
      {/* window */}
      <rect x={34} y={40} width={130} height={110} rx={6} fill="#bcd9e8" stroke="#fff" strokeWidth={6} />
      <path d="M99 40v110M34 95h130" stroke="#fff" strokeWidth={5} />
      <circle cx={70} cy={70} r={12} fill="#f4d58d" />
      {/* whiteboard */}
      <rect x={410} y={34} width={196} height={116} rx={4} fill="#fbfbf8" stroke="#9aa3b2" strokeWidth={3} />
      <g stroke="#3b6f8f" strokeWidth={3} strokeLinecap="round" fill="none">
        <path d="M430 64h60M430 84h40M430 104h70" />
        <path d="M520 70l24 0m-8 -8l8 8l-8 8" />
        <circle cx={572} cy={90} r={18} />
      </g>
      {/* Jordan */}
      <Person x={340} y={96} mood={mood} skin="#b9825a" hair="#2b1d16" shirt="#e0704f" hairStyle="curly" />
      {/* desk */}
      <rect x={180} y={238} width={380} height={18} rx={4} fill="#8a5a3b" />
      <rect x={200} y={256} width={14} height={80} fill="#6f4730" />
      <rect x={526} y={256} width={14} height={80} fill="#6f4730" />
      {/* laptop */}
      <g transform="translate(236 168)">
        <rect width={120} height={72} rx={6} fill="#2b3446" />
        <rect x={6} y={6} width={108} height={60} rx={3} fill={cue === "working" ? "#e6f4ea" : "#fdf1ee"} />
        {cue === "versions" || cue === "working" ? (
          <g fontSize={9} fontFamily="var(--font-sans)" fontWeight={700}>
            {["v1", "v2", "v3"].map((v, i) => (
              <g key={v} transform={`translate(${12 + i * 34} 14)`}>
                <rect width={28} height={16} rx={3} fill={i === 2 ? "#e3a83b" : "#fff"} stroke={INK} strokeWidth={1} />
                <text x={14} y={11.5} textAnchor="middle" fill={INK}>{v}</text>
              </g>
            ))}
          </g>
        ) : (
          <g stroke="#8b93a3" strokeWidth={3} strokeLinecap="round">
            <path d="M16 20h50M16 32h70M16 44h40" />
          </g>
        )}
        {cue === "working" ? (
          <path d="M46 44l10 10l20 -22" stroke="#1d7a46" strokeWidth={5} fill="none" strokeLinecap="round" />
        ) : (
          <path d={cue === "versions" ? "M50 40l16 16m0 -16l-16 16" : "M84 38l14 14m0 -14l-14 14"} stroke="#c2412d" strokeWidth={4} strokeLinecap="round" />
        )}
        <rect x={-10} y={72} width={140} height={8} rx={3} fill="#4a5568" />
      </g>
      {/* small robot project */}
      <g transform="translate(410 202)">
        <rect width={70} height={30} rx={6} fill="#0f766e" />
        <rect x={22} y={-14} width={26} height={16} rx={3} fill="#1d2433" />
        <circle cx={14} cy={34} r={8} fill={INK} />
        <circle cx={56} cy={34} r={8} fill={INK} />
        <path d="M35 -14 q10 -20 26 -18" stroke="#e3a83b" strokeWidth={3} fill="none" />
      </g>
      <Learner x={96} color="#3b5b92" hair="#5a3b2a" />
    </>
  );
}

function Pharmacy({ mood, cue, who = "sam" }: { mood: Mood; cue?: string; who?: "sam" | "dev" }) {
  const boxes = ["#e8d7c3", "#cfe3e1", "#f1d9a8", "#d9dbe8", "#e7c9c0"];
  return (
    <>
      <rect width={640} height={360} fill="#e9eef0" />
      <rect y={272} width={640} height={88} fill="#c9d3d6" />
      {/* shelves with unlabeled boxes */}
      {[0, 1, 2].map((r) => (
        <g key={r} transform={`translate(24 ${40 + r * 58})`}>
          <rect width={200} height={6} y={46} fill="#9aa7ab" />
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={i} x={6 + i * 28} y={14 + ((i + r) % 3) * 4} width={22} height={32 - ((i + r) % 3) * 4} rx={2} fill={boxes[(i + r) % 5]} />
          ))}
        </g>
      ))}
      {/* clock: 2:15 for Sam, 1:30 for Dev */}
      <g transform="translate(560 64)">
        <circle r={28} fill="#fff" stroke={INK} strokeWidth={3} />
        {who === "sam" ? (
          <path d="M0 0v-12M0 0h15" stroke={INK} strokeWidth={3} strokeLinecap="round" transform="rotate(8)" />
        ) : (
          <path d="M0 0l6 -10M0 0v18" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        )}
      </g>
      {/* drive-through window */}
      {cue === "drive" && (
        <g transform="translate(470 58)" className="cue">
          <rect x={-8} y={-10} width={156} height={108} rx={10} fill="none" stroke="#e3a83b" strokeWidth={3} strokeDasharray="6 5" />
          <rect width={140} height={80} rx={4} fill="#bcd9e8" stroke="#fff" strokeWidth={5} />
          <path d="M14 66 q6 -22 30 -24 h40 q20 2 30 24z" fill="#5d6b78" />
          <circle cx={36} cy={68} r={7} fill={INK} />
          <circle cx={98} cy={68} r={7} fill={INK} />
          <circle cx={126} cy={14} r={8} fill="#e3a83b" />
          <text x={70} y={-16} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} fontFamily="var(--font-sans)">drive-through, 4 to 6</text>
        </g>
      )}
      {/* schedule on the wall */}
      {cue === "schedule" && (
        <g transform="translate(250 40)" className="cue">
          <rect width={92} height={112} rx={3} fill="#fff" stroke={INK} strokeWidth={2} transform="rotate(-3 46 56)" />
          {[0, 1, 2, 3, 4].map((r) => (
            <path key={r} d={`M10 ${24 + r * 18}h72`} stroke="#9aa7ab" strokeWidth={2} transform="rotate(-3 46 56)" />
          ))}
          <rect x={8} y={74} width={76} height={16} fill="#e3a83b" opacity={0.6} transform="rotate(-3 46 56)" />
          <text x={46} y={16} textAnchor="middle" fontSize={10} fontWeight={800} fill={INK} fontFamily="var(--font-sans)" transform="rotate(-3 46 56)">SCHEDULE</text>
        </g>
      )}
      {who === "sam" ? (
        <Person x={380} y={92} mood={mood} skin="#e0b394" hair="#3a2a1f" shirt="#2f7f8a" hairStyle="bun" crossed={mood === "guarded"} badge />
      ) : (
        <Person x={380} y={92} mood={mood} skin="#8d5a3b" hair="#1d1611" shirt="#3b6ea5" hairStyle="short" crossed={mood === "guarded"} badge />
      )}
      {/* counter */}
      <rect x={220} y={240} width={400} height={22} rx={4} fill="#5d6b78" />
      <rect x={236} y={262} width={368} height={80} fill="#7c8a96" />
      {/* rush thought bubble */}
      {cue === "rush" && (
        <g transform="translate(470 64)" className="cue">
          <circle cx={-18} cy={70} r={5} fill="#fff" />
          <circle cx={-6} cy={56} r={8} fill="#fff" />
          <rect x={0} y={-6} width={140} height={60} rx={24} fill="#fff" stroke={INK} strokeWidth={2} />
          <text x={70} y={12} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} fontFamily="var(--font-sans)">5:00 rush</text>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${28 + i * 20} 32)`}>
              <circle r={5} fill="#7c8a96" />
              <rect x={-6} y={5} width={12} height={10} rx={4} fill="#7c8a96" />
            </g>
          ))}
        </g>
      )}
      {/* shared tray */}
      {(cue === "tray" || cue === "bins") && (
        <g transform="translate(260 206)" className="cue">
          {cue === "tray" ? (
            <>
              <rect x={-8} y={-10} width={116} height={48} rx={10} fill="none" stroke="#e3a83b" strokeWidth={3} strokeDasharray="6 5" />
              <rect x={0} y={14} width={100} height={20} rx={3} fill="#9aa7ab" />
              <rect x={14} y={2} width={34} height={22} fill="#fff" stroke={INK} strokeWidth={1.4} transform="rotate(-8 31 13)" />
              <rect x={44} y={0} width={34} height={22} fill="#fff" stroke={INK} strokeWidth={1.4} transform="rotate(6 61 11)" />
              <text x={50} y={-16} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} fontFamily="var(--font-sans)">shared tray</text>
            </>
          ) : (
            <>
              {["Sam", "Jess"].map((n, i) => (
                <g key={n} transform={`translate(${i * 62} 0)`}>
                  <rect y={8} width={52} height={28} rx={3} fill={i === 0 ? "#2f7f8a" : "#e3a83b"} />
                  <rect x={10} y={0} width={30} height={16} fill="#fff" stroke={INK} strokeWidth={1.4} />
                  <text x={26} y={30} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff" fontFamily="var(--font-sans)">{n}</text>
                </g>
              ))}
            </>
          )}
        </g>
      )}
      <Learner x={110} color="#1d2433" hair="#8a8f99" />
    </>
  );
}

export function Scene({
  scene,
  mood,
  cue,
  label,
  who,
}: {
  scene: "classroom" | "pharmacy";
  mood: Mood;
  cue?: string;
  label: string;
  who?: "sam" | "dev";
}) {
  return (
    <svg viewBox="0 0 640 360" role="img" aria-label={label} className="w-full h-auto rounded-2xl block">
      {scene === "classroom" ? <Classroom mood={mood} cue={cue} /> : <Pharmacy mood={mood} cue={cue} who={who} />}
    </svg>
  );
}

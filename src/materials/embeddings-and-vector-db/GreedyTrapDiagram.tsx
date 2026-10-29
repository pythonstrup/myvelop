import type { Lang } from "./lang";

// 탐욕 탐색이 가장 가까운 점이 아닌 곳에서 멈추는 경우. 점선 원은 질문에서 멈춘 곳까지의 거리다.
// 멈춘 곳의 이웃은 모두 원 밖에 있고, 원 안의 진짜 가장 가까운 점은 멈춘 곳과 이어져 있지 않다. 정적 SVG.
const LABELS = {
	ko: {
		start: "출발점",
		stop: "멈춘 곳",
		nearest: "진짜 가장 가까운 점",
		query: "질문",
		note: "멈춘 곳의 이웃은 모두 질문에서 더 멀다",
		aria: "탐욕 탐색이 가장 가까운 점을 놓치는 그래프. 출발점에서 질문에 더 가까운 이웃으로 두 번 옮겨 간 뒤, 이웃이 모두 질문에서 더 먼 점에 이르러 멈춘다. 진짜 가장 가까운 점은 질문 바로 옆에 있지만 멈춘 곳과 선으로 이어져 있지 않아 찾지 못한다.",
	},
	en: {
		start: "start",
		stop: "stops here",
		nearest: "true nearest",
		query: "query",
		note: "Every neighbor of the stop is farther from the query",
		aria: "A graph where greedy search misses the nearest point. From the start it moves twice to a neighbor closer to the query, then reaches a point whose neighbors are all farther from the query and stops. The true nearest point sits right next to the query but has no edge to the stopping point, so it is never found.",
	},
} as const satisfies Record<Lang, unknown>;

type P = readonly [number, number];
const Q: P = [300, 170];
const N = {
	start: [60, 260],
	n1: [120, 215],
	stop: [200, 150],
	n2: [170, 70],
	n3: [215, 262],
	n4: [110, 100],
	near: [322, 190],
	n5: [380, 240],
	n6: [360, 110],
	n7: [412, 172],
} as const satisfies Record<string, P>;
type Key = keyof typeof N;
const EDGES: [Key, Key][] = [
	["start", "n1"],
	["n1", "stop"],
	["n1", "n4"],
	["stop", "n2"],
	["stop", "n3"],
	["stop", "n4"],
	["n2", "n4"],
	["n2", "n6"],
	["n3", "n5"],
	["near", "n5"],
	["near", "n6"],
	["near", "n7"],
	["n5", "n7"],
	["n6", "n7"],
];
const PATH: Key[] = ["start", "n1", "stop"];
const R = 6;
// 질문에서 멈춘 곳까지의 거리 ≈ 102
const STOP_DIST = Math.hypot(N.stop[0] - Q[0], N.stop[1] - Q[1]);

// 두 점 사이 선분을 점 반지름만큼 줄여 화살촉이 점에 묻히지 않게 한다
function trimmed(a: P, b: P, pad: number) {
	const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
	const ux = (b[0] - a[0]) / len;
	const uy = (b[1] - a[1]) / len;
	return { x1: a[0] + ux * pad, y1: a[1] + uy * pad, x2: b[0] - ux * pad, y2: b[1] - uy * pad };
}

export default function GreedyTrapDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 6,
		strokeLinejoin: "round",
	} as const;
	return (
		<svg
			viewBox="0 0 460 320"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<defs>
				<marker id="gt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent)" />
				</marker>
			</defs>

			<circle cx={Q[0]} cy={Q[1]} r={STOP_DIST} fill="none" stroke="rgb(var(--gray))" strokeWidth="1" strokeDasharray="4 4" />

			{EDGES.map(([a, b]) => (
				<line key={`${a}-${b}`} x1={N[a][0]} y1={N[a][1]} x2={N[b][0]} y2={N[b][1]} stroke="var(--border)" strokeWidth="1.5" />
			))}
			{PATH.slice(1).map((k, i) => (
				<line
					key={k}
					{...trimmed(N[PATH[i]], N[k], R + 3)}
					stroke="var(--accent)"
					strokeWidth="2.5"
					markerEnd="url(#gt-arrow)"
				/>
			))}

			{(Object.keys(N) as Key[]).map((k) => (
				<circle
					key={k}
					cx={N[k][0]}
					cy={N[k][1]}
					r={R}
					fill={k === "near" ? "var(--foreground)" : k === "stop" ? "var(--destructive)" : "var(--background, #fff)"}
					stroke={k === "stop" ? "var(--destructive)" : "var(--foreground)"}
					strokeWidth="1.5"
				/>
			))}

			{/* 질문은 빈 원에 십자를 그은 표시 */}
			<circle cx={Q[0]} cy={Q[1]} r="8" fill="none" stroke="var(--accent)" strokeWidth="2" />
			<path d={`M ${Q[0] - 5} ${Q[1]} H ${Q[0] + 5} M ${Q[0]} ${Q[1] - 5} V ${Q[1] + 5}`} stroke="var(--accent)" strokeWidth="2" />

			<text x={N.start[0]} y={N.start[1] + 24} textAnchor="middle" fontSize="12.5" fill="var(--foreground)" {...halo}>
				{t.start}
			</text>
			<text x={N.stop[0]} y={N.stop[1] - 14} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--destructive)" {...halo}>
				{t.stop}
			</text>
			<text x={N.near[0] + 6} y={N.near[1] + 24} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--foreground)" {...halo}>
				{t.nearest}
			</text>
			<text x={Q[0] - 14} y={Q[1] - 6} textAnchor="end" fontSize="12.5" fontWeight="600" fill="var(--accent)" {...halo}>
				{t.query}
			</text>

			<text x="230" y="306" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{t.note}
			</text>
		</svg>
	);
}

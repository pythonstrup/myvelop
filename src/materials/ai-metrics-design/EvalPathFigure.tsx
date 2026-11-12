import { FIG_STYLE, type Tone } from "@/materials/monitoring-design/figure";

// 가드레일이 있는 응답 경로와 평가기가 있는 채점 경로를 위아래로 그린 그림. SSR 에서 정적 SVG 로 나간다.
// 연결선만 흐르게 하고, 채점 경로는 응답 경로보다 느리게 흘려 응답이 나간 뒤 따로 돈다는 것을 보인다.
const W = 720;
const COL_X = [130, 283, 436, 589];
const BOX_W = 110;
const LANES = [
	{
		title: "응답 경로",
		sub: "사용자가 보기 전",
		top: 24,
		h: 44,
		flow: "ev-now",
		boxes: [{ label: ["요청"] }, { label: ["모델"] }, { label: ["가드레일"], tone: "red" }, { label: ["사용자"] }],
	},
	{
		title: "채점 경로",
		sub: "응답이 나간 뒤",
		top: 124,
		h: 52,
		flow: "ev-later",
		boxes: [{ label: ["운영 트레이스"] }, { label: ["표본 추출"] }, { label: ["평가기"], tone: "blue" }, { label: ["대시보드", "회귀 시험"] }],
	},
] as const;
const [NOW, LATER] = LANES;
const cyOf = (lane: (typeof LANES)[number]) => lane.top + lane.h / 2;
const H = LATER.top + LATER.h + 22;
// 응답이 가드레일을 지나 사용자에게 가는 화살표의 가운데에서 채점 경로가 갈라진다
const BRANCH_X = (COL_X[2] + BOX_W + COL_X[3]) / 2;
const ELBOW_Y = (NOW.top + NOW.h + LATER.top) / 2;
const ARIA =
	"운영 중인 AI 응답이 지나는 두 경로를 그린 그림. 위쪽 응답 경로에서는 요청이 모델과 가드레일을 거쳐 사용자에게 간다. 가드레일은 사용자가 응답을 보기 전에 막거나 고친다. 아래쪽 채점 경로는 응답이 나간 뒤에 돈다. 운영 트레이스에서 표본을 뽑아 평가기가 채점하고, 그 결과가 대시보드와 회귀 시험으로 간다. 평가기는 원래 응답을 막지 않는다.";

// 오른쪽(x1 → x2) 또는 아래(y1 → y2)로 가는 화살표. 선만 흐르고 화살촉은 멈춰 있다.
function Arrow({ x1, y1, x2, y2, flow }: { x1: number; y1: number; x2: number; y2: number; flow: string }) {
	const down = x1 === x2;
	const head = down ? `${x2 - 6},${y2 - 9} ${x2 + 6},${y2 - 9} ${x2},${y2}` : `${x2 - 9},${y2 - 6} ${x2 - 9},${y2 + 6} ${x2},${y2}`;
	return (
		<g>
			<line x1={x1} y1={y1} x2={down ? x2 : x2 - 8} y2={down ? y2 - 8 : y2} className={`fg-arrow ${flow}`} strokeWidth={2} />
			<polygon points={head} className="fg-head" />
		</g>
	);
}

export default function EvalPathFigure() {
	const traceX = COL_X[0] + BOX_W / 2;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{`${FIG_STYLE}
				.ev-now { stroke-dasharray: 6 6; animation: ev-dash 0.9s linear infinite; }
				.ev-later { stroke-dasharray: 6 6; animation: ev-dash 1.8s linear infinite; }
				@keyframes ev-dash { to { stroke-dashoffset: -12; } }
				@media (prefers-reduced-motion: reduce) { .ev-now, .ev-later { animation: none; } }
			`}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{/* 갈라지는 선을 상자보다 먼저 그려 상자가 선 끝을 덮게 한다 */}
			<polyline points={`${BRANCH_X},${cyOf(NOW)} ${BRANCH_X},${ELBOW_Y} ${traceX},${ELBOW_Y} ${traceX},${LATER.top - 8}`} fill="none" className="fg-arrow ev-later" strokeWidth={2} />
			<polygon points={`${traceX - 6},${LATER.top - 9} ${traceX + 6},${LATER.top - 9} ${traceX},${LATER.top}`} className="fg-head" />
			<circle cx={BRANCH_X} cy={cyOf(NOW)} r={4} className="fg-head" />
			{LANES.map((lane) => {
				const cy = cyOf(lane);
				return (
					<g key={lane.title}>
						<text x={20} y={cy - 4} className="fg-text" fontSize={15} fontWeight={700}>
							{lane.title}
						</text>
						<text x={20} y={cy + 14} className="fg-sub" fontSize={12}>
							{lane.sub}
						</text>
						{lane.boxes.slice(1).map((_, i) => (
							<Arrow key={i} x1={COL_X[i] + BOX_W} y1={cy} x2={COL_X[i + 1]} y2={cy} flow={lane.flow} />
						))}
						{lane.boxes.map((b, i) => {
							const tone: Tone | undefined = "tone" in b ? b.tone : undefined;
							return (
								<g key={b.label.join()}>
									<rect x={COL_X[i]} y={lane.top} width={BOX_W} height={lane.h} rx={8} className={tone ? `fg-${tone}-fill fg-${tone}` : "fg-box"} strokeWidth={1.5} />
									{b.label.map((line, j) => (
										<text
											key={line}
											x={COL_X[i] + BOX_W / 2}
											y={cy + 5 + (j - (b.label.length - 1) / 2) * 18}
											textAnchor="middle"
											className={tone ? `fg-${tone}-ink` : "fg-text"}
											fontSize={14}
											fontWeight={tone ? 700 : 400}
										>
											{line}
										</text>
									))}
								</g>
							);
						})}
					</g>
				);
			})}
		</svg>
	);
}

import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// A/B 실험과 그림자 실험을 위아래로 견주는 정적 그림.
// A/B 실험은 사용자를 나눠 각자 다른 응답을 보여 주고, 그림자 실험은 같은 요청에 두 응답을 만들어 기존 응답만 보여 준다.
const W = 720;
const SRC_X = 146;
const SRC_W = 116;
const RESP_X = 296;
const RESP_W = 150;
const RESP_H = 44;
const RESULT_X = 490;
const LANES = [
	{
		title: "A/B 실험",
		top: 24,
		src: ["사용자", "둘로 나눈다"],
		resps: [
			{ label: "기존 응답", sub: "한 그룹이 본다", hidden: false },
			{ label: "새 응답", sub: "다른 그룹이 본다", hidden: false },
		],
		results: [{ text: "사용자 반응을 잴 수 있다", tone: "green" }],
	},
	{
		title: "그림자 실험",
		top: 160,
		src: ["요청 하나", "두 응답을 만든다"],
		resps: [
			{ label: "기존 응답", sub: "사용자에게 보인다", hidden: false },
			{ label: "새 응답", sub: "기록만 하고 숨긴다", hidden: true },
		],
		results: [
			{ text: "같은 요청끼리 짝지어 비교한다", tone: "blue" },
			{ text: "새 응답의 사용자 반응은 못 잰다", tone: "red" },
		],
	},
] as const;
const LANE_H = RESP_H * 2 + 10;
const H = LANES[1].top + LANE_H + 20;
const ARIA =
	"A/B 실험과 그림자 실험을 견준 그림. A/B 실험은 사용자를 둘로 나눠 한 그룹은 기존 응답을, 다른 그룹은 새 응답을 보게 하므로 사용자 반응을 잴 수 있다. 그림자 실험은 같은 요청에 기존 응답과 새 응답을 모두 만들고 기존 응답만 보여 준다. 같은 요청끼리 짝지어 비교할 수 있지만 사용자가 새 응답을 보지 못하므로 새 응답에 대한 사용자 반응은 잴 수 없다.";

// (x1, y1) 에서 (x2, y2) 로 가는 화살표. 화살촉 끝이 (x2, y2) 다.
function Arrow({ x1, y1, x2, y2, dashed }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }) {
	const a = Math.atan2(y2 - y1, x2 - x1);
	const c = Math.cos(a);
	const s = Math.sin(a);
	const bx = x2 - 9 * c;
	const by = y2 - 9 * s;
	return (
		<g>
			<line x1={x1} y1={y1} x2={x2 - 8 * c} y2={y2 - 8 * s} className="fg-arrow" strokeWidth={2} strokeDasharray={dashed ? "5 4" : undefined} />
			<polygon points={`${bx - 6 * s},${by + 6 * c} ${bx + 6 * s},${by - 6 * c} ${x2},${y2}`} className="fg-head" />
		</g>
	);
}

export default function ShadowExperimentFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<line x1={20} y1={LANES[1].top - 18} x2={W - 20} y2={LANES[1].top - 18} className="fg-frame" />
			{LANES.map((lane) => {
				const cy = lane.top + LANE_H / 2;
				const respCy = lane.resps.map((_, i) => lane.top + i * (RESP_H + 10) + RESP_H / 2);
				return (
					<g key={lane.title}>
						<text x={20} y={cy + 5} className="fg-text" fontSize={15} fontWeight={700}>
							{lane.title}
						</text>
						{/* 화살표를 상자보다 먼저 그린다 */}
						{lane.resps.map((r, i) => (
							<g key={r.sub}>
								<Arrow x1={SRC_X + SRC_W} y1={cy} x2={RESP_X} y2={respCy[i]} dashed={r.hidden} />
								<Arrow x1={RESP_X + RESP_W} y1={respCy[i]} x2={RESULT_X - 8} y2={cy} dashed={r.hidden} />
							</g>
						))}
						<rect x={SRC_X} y={cy - 26} width={SRC_W} height={52} rx={8} className="fg-box" strokeWidth={1.5} />
						<text x={SRC_X + SRC_W / 2} y={cy - 3} textAnchor="middle" className="fg-text" fontSize={14} fontWeight={700}>
							{lane.src[0]}
						</text>
						<text x={SRC_X + SRC_W / 2} y={cy + 16} textAnchor="middle" className="fg-sub" fontSize={12.5}>
							{lane.src[1]}
						</text>
						{lane.resps.map((r, i) => (
							<g key={r.sub}>
								<rect
									x={RESP_X}
									y={respCy[i] - RESP_H / 2}
									width={RESP_W}
									height={RESP_H}
									rx={8}
									className={r.hidden ? "fg-gray-fill fg-gray" : "fg-blue-fill fg-blue"}
									strokeWidth={1.5}
									strokeDasharray={r.hidden ? "5 4" : undefined}
								/>
								<text x={RESP_X + RESP_W / 2} y={respCy[i] - 3} textAnchor="middle" className={r.hidden ? "fg-gray-ink" : "fg-blue-ink"} fontSize={14} fontWeight={700}>
									{r.label}
								</text>
								<text x={RESP_X + RESP_W / 2} y={respCy[i] + 15} textAnchor="middle" className="fg-sub" fontSize={12.5}>
									{r.sub}
								</text>
							</g>
						))}
						{lane.results.map((res, i) => (
							<text key={res.text} x={RESULT_X} y={cy + 5 + (i - (lane.results.length - 1) / 2) * 22} className={`fg-${res.tone}-ink`} fontSize={13.5} fontWeight={700}>
								{res.text}
							</text>
						))}
					</g>
				);
			})}
		</svg>
	);
}

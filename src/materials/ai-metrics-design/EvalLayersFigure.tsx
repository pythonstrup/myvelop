import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// LinkedIn 이 품질을 평가한 세 겹을 왼쪽에서 오른쪽으로 놓은 정적 그림.
// 오른쪽으로 갈수록 느리지만 실제 사용자의 판단에 가깝다. 걸린 시간은 LinkedIn 글에 적힌 것만 쓴다.
const W = 720;
const BOX_W = 200;
const BOX_H = 92;
const TOP = 24;
const COL_X = [30, 260, 490];
const AXIS_Y = TOP + BOX_H + 34;
const H = AXIS_Y + 40;
const LAYERS = [
	{ who: "엔지니어", lines: ["빠르고 러프하게", "방향을 본다"] },
	{ who: "채점자", lines: ["하루쯤 걸려", "더 자세히 평가한다"] },
	{ who: "실제 사용자", lines: ["마지막 판단을 내린다", "변경 하나에 사흘 넘게"] },
];
const ARIA =
	"LinkedIn이 품질을 평가한 세 겹. 엔지니어가 빠르고 러프하게 방향을 보고, 채점자가 하루쯤 걸려 더 자세히 평가하고, 실제 사용자가 마지막 판단을 내린다. 사용자 반응으로 보면 변경 하나에 사흘 넘게 걸리기도 했다. 오른쪽으로 갈수록 느리지만 실제에 가깝다.";

function Head({ x, y }: { x: number; y: number }) {
	return <polygon points={`${x - 9},${y - 6} ${x - 9},${y + 6} ${x},${y}`} className="fg-head" />;
}

export default function EvalLayersFigure() {
	const cy = TOP + BOX_H / 2;
	const axisEnd = COL_X[2] + BOX_W;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{LAYERS.map((l, i) => (
				<g key={l.who}>
					<rect x={COL_X[i]} y={TOP} width={BOX_W} height={BOX_H} rx={10} className="fg-box" strokeWidth={1.5} />
					<text x={COL_X[i] + BOX_W / 2} y={TOP + 30} textAnchor="middle" className="fg-text" fontSize={15} fontWeight={700}>
						{l.who}
					</text>
					{l.lines.map((line, j) => (
						<text key={line} x={COL_X[i] + BOX_W / 2} y={TOP + 56 + j * 20} textAnchor="middle" className="fg-sub" fontSize={13}>
							{line}
						</text>
					))}
				</g>
			))}
			{COL_X.slice(1).map((x) => (
				<g key={x}>
					<line x1={x - 26} y1={cy} x2={x - 10} y2={cy} className="fg-arrow" strokeWidth={2} />
					<Head x={x - 2} y={cy} />
				</g>
			))}
			<line x1={COL_X[0]} y1={AXIS_Y} x2={axisEnd - 8} y2={AXIS_Y} className="fg-arrow" strokeWidth={2} />
			<Head x={axisEnd} y={AXIS_Y} />
			<text x={COL_X[0]} y={AXIS_Y + 24} className="fg-sub" fontSize={13}>
				빠르고 러프하다
			</text>
			<text x={axisEnd} y={AXIS_Y + 24} textAnchor="end" className="fg-sub" fontSize={13}>
				느리지만 실제에 가깝다
			</text>
		</svg>
	);
}

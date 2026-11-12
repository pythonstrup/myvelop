import { FIG_STYLE, VLine } from "@/materials/monitoring-design/figure";

// DORA가 말하는 J커브를 숫자 없이 모양만 그린 개념도.
// 도입 직후 생산성이 기준선 아래로 잠시 떨어졌다가 다시 올라 기준선을 넘는다.
// 곡선이 왼쪽부터 그려지는 애니메이션이 있고, 움직임 줄이기 설정에서는 다 그려진 모습으로 멈춘다.
const W = 720;
const H = 270;
const X0 = 76; // 세로축
const ADOPT = 190; // 도입 시점
const BASE_Y = 116; // 도입 전 수준
const AXIS_Y = 230;
const CURVE = `M ${X0} ${BASE_Y} L ${ADOPT} ${BASE_Y} C 240 ${BASE_Y} 260 196 310 196 C 360 196 390 136 430 ${BASE_Y} C 490 86 590 66 676 56`;
const DIP = `M ${ADOPT} ${BASE_Y} C 240 ${BASE_Y} 260 196 310 196 C 360 196 390 136 430 ${BASE_Y} Z`;
const ANIM = `
	.jc-line { stroke-dasharray: 1; animation: jc-draw 6s ease-in-out infinite; }
	@keyframes jc-draw { 0% { stroke-dashoffset: 1; } 70%, 100% { stroke-dashoffset: 0; } }
	@media (prefers-reduced-motion: reduce) { .jc-line { animation: none; } }
`;
const ARIA =
	"J커브 개념도. 숫자 없이 모양만 그렸다. AI를 도입한 직후 생산성이 도입 전 수준 아래로 잠시 떨어지고 불안정해진다. 코드가 빨리 많이 나와 리뷰와 자동 시험에 드는 시간이 늘어나는 검증 부담이 원인 가운데 하나다. 이 구간을 지나면 생산성이 도입 전 수준을 넘어 오른다.";

export default function JCurveFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE + ANIM}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 축 */}
			<line x1={X0} y1={AXIS_Y} x2={W - 30} y2={AXIS_Y} className="fg-axis" strokeWidth={1.5} />
			<path d={`M ${W - 30} ${AXIS_Y - 5} L ${W - 22} ${AXIS_Y} L ${W - 30} ${AXIS_Y + 5} Z`} className="fg-head" />
			<line x1={X0} y1={AXIS_Y} x2={X0} y2={34} className="fg-axis" strokeWidth={1.5} />
			<path d={`M ${X0 - 5} 34 L ${X0} 26 L ${X0 + 5} 34 Z`} className="fg-head" />
			<text x={X0 - 10} y={42} textAnchor="end" className="fg-sub" fontSize={13}>
				생산성
			</text>
			<text x={W - 22} y={AXIS_Y + 22} textAnchor="end" className="fg-sub" fontSize={13}>
				시간
			</text>

			{/* 도입 전 수준과 도입 시점 */}
			<line x1={X0} y1={BASE_Y} x2={W - 40} y2={BASE_Y} className="fg-gray" strokeWidth={1.5} strokeDasharray="4 3" />
			<text x={X0 + 10} y={BASE_Y - 10} className="fg-sub" fontSize={13}>
				도입 전 수준
			</text>
			<VLine x={ADOPT} y1={40} y2={AXIS_Y} tone="gray" />
			<text x={ADOPT} y={AXIS_Y + 22} textAnchor="middle" className="fg-text" fontSize={13}>
				AI 도입
			</text>

			{/* 기준선 아래로 내려간 구간 */}
			<path d={DIP} className="fg-red-fill" />
			<path d={CURVE} pathLength={1} fill="none" className="jc-line fg-blue" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

			<text x={310} y={214} textAnchor="middle" className="fg-red-ink" fontSize={14} fontWeight={700}>
				잠시 떨어지고 불안정해진다
			</text>
			<text x={460} y={162} className="fg-sub" fontSize={12.5}>
				검증 부담: 리뷰와 자동 시험에
			</text>
			<text x={460} y={180} className="fg-sub" fontSize={12.5}>
				드는 시간이 늘어난다
			</text>
			<text x={676} y={42} textAnchor="end" className="fg-blue-ink" fontSize={14} fontWeight={700}>
				지나고 나면 도입 전보다 오른다
			</text>
		</svg>
	);
}

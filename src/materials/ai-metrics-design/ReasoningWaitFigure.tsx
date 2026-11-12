import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// 추론 토큰 200개가 사용자에게 보이지 않은 채 먼저 나오고, 그 뒤에 답 토큰이 나오는 시간선.
// 숫자는 본문의 LinkedIn 예(추론 토큰 200개, 토큰당 시간 10ms 증가, 2초)다. 칸 수는 모양을 보이려고 줄였다.
// 커튼이 왼쪽에서 오른쪽으로 걷히며 토큰이 나온다. 애니메이션을 끄면 커튼이 숨어 다 나온 모습이 된다.
const W = 720;
const H = 236;
const X0 = 168; // 요청을 보낸 때
const XR = 478; // 추론이 끝나고 답이 시작하는 때
const XN = 690; // 마지막 토큰
const ROW1 = 70; // 모델이 만드는 토큰
const ROW2 = 118; // 사용자가 보는 화면
const ROW_H = 26;
const HIDDEN = 20;
const SHOWN = 8;
const hiddenGap = (XR - X0) / HIDDEN;
const shownGap = (XN - XR) / SHOWN;
const SWEEP = XN - X0 + 4;
const LOOP = 7.5; // 초. 6초 동안 걷히고 1.5초 멈춘다

const ANIM = `
	.rw-curtain { visibility: hidden; animation: rw-sweep ${LOOP}s linear infinite; }
	@keyframes rw-sweep { 0% { transform: translateX(0); visibility: visible; } 80%, 100% { transform: translateX(${SWEEP}px); visibility: visible; } }
	@media (prefers-reduced-motion: reduce) { .rw-curtain { animation: none; } }
`;
const ARIA =
	"추론 토큰과 답 토큰의 시간선. 모델은 사용자에게 보이지 않는 추론 토큰 200개를 먼저 만들고 그 뒤에 답 토큰을 만든다. 추론 토큰이 나오는 동안 사용자 화면에는 답이 보이지 않는다. 토큰당 시간이 10ms 늘면 200개 곱하기 10ms로 답이 보이기까지 2초를 더 기다린다.";

function Bracket({ x1, x2, y, tone }: { x1: number; x2: number; y: number; tone: "gray" | "blue" | "amber" }) {
	return (
		<g className={`fg-${tone}`} strokeWidth={1.5}>
			<line x1={x1} y1={y} x2={x2} y2={y} />
			<line x1={x1} y1={y - 6} x2={x1} y2={y + 6} />
			<line x1={x2} y1={y - 6} x2={x2} y2={y + 6} />
		</g>
	);
}

function AnswerTokens({ y }: { y: number }) {
	return (
		<>
			{Array.from({ length: SHOWN }, (_, i) => (
				<rect key={i} x={XR + i * shownGap + 3} y={y} width={shownGap - 6} height={ROW_H} rx={4} className="fg-blue-fill fg-blue" strokeWidth={1.5} />
			))}
		</>
	);
}

export default function ReasoningWaitFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE + ANIM}</style>

			<text x={24} y={ROW1 + 18} className="fg-text" fontSize={13}>
				모델이 만드는 토큰
			</text>
			<text x={24} y={ROW2 + 18} className="fg-text" fontSize={13}>
				사용자가 보는 화면
			</text>

			{/* 위 줄: 보이지 않는 추론 토큰 뒤에 답 토큰 */}
			{Array.from({ length: HIDDEN }, (_, i) => (
				<rect key={i} x={X0 + i * hiddenGap + 2} y={ROW1} width={hiddenGap - 4} height={ROW_H} rx={3} className="fg-gray-fill fg-gray" strokeWidth={1.5} />
			))}
			<AnswerTokens y={ROW1} />

			{/* 아래 줄: 추론하는 동안은 기다리기만 한다 */}
			<rect x={X0 + 2} y={ROW2} width={XR - X0 - 4} height={ROW_H} rx={5} className="fg-box" strokeDasharray="4 3" />
			<text x={(X0 + XR) / 2} y={ROW2 + 18} textAnchor="middle" className="fg-sub" fontSize={13}>
				답이 보이지 않는다 · 기다리는 중
			</text>
			<AnswerTokens y={ROW2} />

			{/* 시간이 흐르는 모습: 페이지 바탕색 커튼이 걷힌다 */}
			<g className="rw-curtain">
				<rect x={X0 - 2} y={ROW1 - 8} width={SWEEP} height={ROW2 + ROW_H - ROW1 + 16} className="fg-bg" />
				<line x1={X0 - 2} y1={ROW1 - 10} x2={X0 - 2} y2={ROW2 + ROW_H + 10} className="fg-sub-line" strokeWidth={1.5} />
			</g>

			<Bracket x1={X0} x2={XR} y={40} tone="gray" />
			<Bracket x1={XR} x2={XN} y={40} tone="blue" />
			<Bracket x1={X0} x2={XR} y={170} tone="amber" />
			<Pill cx={(X0 + XR) / 2} cy={40} label="추론 토큰 200개" tone="gray" maxX={W} />
			<Pill cx={(XR + XN) / 2} cy={40} label="답 토큰" tone="blue" maxX={W} />
			<Pill cx={(X0 + XR) / 2} cy={170} label="+10ms × 200개 = +2초" tone="amber" maxX={W} />
			<text x={(X0 + XR) / 2} y={206} textAnchor="middle" className="fg-sub" fontSize={13}>
				토큰당 시간이 10ms 늘면 답이 보이기까지 2초 더 기다린다
			</text>

			{/* 커튼이 오른쪽 끝을 덮지 않도록 테두리는 마지막에 그린다 */}
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
		</svg>
	);
}

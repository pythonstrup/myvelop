import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// 에이전트를 한 번 부른 구간 안에서 모델 호출과 도구 호출이 번갈아 일어나는 간트형 그림.
// 모델 3번, 도구 2번과 각 호출의 길이는 모양을 보이려고 가정한 값이다.
const W = 720;
const H = 212;
const X0 = 150;
const XN = 600;
const UNIT = (XN - X0) / 10; // 실행 전체를 10으로 본다
const LANES = [
	{ label: "모델 호출", tone: "blue", y: 84, calls: [[0, 2], [3.5, 5.5], [7.5, 10]] },
	{ label: "도구 호출", tone: "green", y: 132, calls: [[2, 3.5], [5.5, 7.5]] },
] as const;
const ROW_H = 30;
const ARIA =
	"에이전트를 한 번 부른 시간 gen_ai.invoke_agent.duration 안에서 모델 호출과 도구 호출이 번갈아 일어난다. 이 예에서는 모델을 3번, 도구를 2번 불렀다. 규약은 실행 시간과 함께 모델과 도구를 부른 횟수를 잰다.";

export default function AgentCallsFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 에이전트 한 번의 실행 구간 */}
			<g className="fg-gray" strokeWidth={1.5}>
				<line x1={X0} y1={40} x2={XN} y2={40} />
				<line x1={X0} y1={34} x2={X0} y2={46} />
				<line x1={XN} y1={34} x2={XN} y2={46} />
			</g>
			<line x1={X0} y1={46} x2={X0} y2={170} className="fg-gray" strokeWidth={1.5} strokeDasharray="4 3" />
			<line x1={XN} y1={46} x2={XN} y2={170} className="fg-gray" strokeWidth={1.5} strokeDasharray="4 3" />

			<text x={XN + 24} y={68} className="fg-sub" fontSize={12.5}>
				부른 횟수
			</text>
			{LANES.map((l) => (
				<g key={l.label}>
					<text x={24} y={l.y + 20} className="fg-text" fontSize={13.5}>
						{l.label}
					</text>
					{l.calls.map(([a, b]) => (
						<rect key={a} x={X0 + a * UNIT + 2} y={l.y} width={(b - a) * UNIT - 4} height={ROW_H} rx={5} className={`fg-${l.tone}-fill fg-${l.tone}`} strokeWidth={1.5} />
					))}
					<text x={XN + 24} y={l.y + 21} className={`fg-${l.tone}-ink`} fontSize={15} fontWeight={700}>
						{l.calls.length}번
					</text>
				</g>
			))}

			<text x={(X0 + XN) / 2} y={196} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				호출 한 번이 빨라도 부르는 횟수가 늘면 전체가 길어진다
			</text>
			<Pill cx={(X0 + XN) / 2} cy={40} label="gen_ai.invoke_agent.duration" tone="gray" maxX={W} />
		</svg>
	);
}

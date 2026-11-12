import { FIG_STYLE, type Tone, VLine } from "@/materials/monitoring-design/figure";

// SAGE 논문의 판정 모델과 사람의 일치도(가중 카파)를 한 눈금 위에 찍은 정적 그림. 숫자는 논문 값 그대로다.
// 사람끼리의 일치도 0.83 을 논문은 이 일의 실질적인 상한으로 본다.
const W = 720;
const X0 = 60;
const X1 = 660;
const K0 = 0.6;
const K1 = 0.9;
const AXIS_Y = 112;
const H = AXIS_Y + 92;
const xOf = (k: number) => X0 + ((k - K0) / (K1 - K0)) * (X1 - X0);
const ABOVE: { k: number; name: string; tone: Tone }[] = [
	{ k: 0.67, name: "처음 판정 모델", tone: "gray" },
	{ k: 0.77, name: "보정 뒤", tone: "blue" },
	{ k: 0.83, name: "사람끼리", tone: "green" },
];
const DISTILL = { from: 0.72, to: 0.73, name: "작은 모델로 증류" };
const TICKS = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];
const ARIA =
	"판정 모델과 사람의 일치도를 가중 카파 눈금 위에 찍은 그림. 처음 만든 판정 모델은 0.67, 보정을 거친 뒤는 0.77, 작은 모델로 증류한 뒤는 0.72에서 0.73이다. 사람끼리 같은 일을 채점했을 때의 일치도는 0.83이고, 논문은 이것을 이 일의 실질적인 상한으로 본다.";

export default function JudgeAgreementFigure() {
	const ceilX = xOf(0.83);
	const dx = (xOf(DISTILL.from) + xOf(DISTILL.to)) / 2;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{/* 선을 먼저 모두 그리고 점과 글자를 나중에 그린다 */}
			<VLine x={ceilX} y1={70} y2={AXIS_Y + 10} tone="green" />
			<line x1={X0} y1={AXIS_Y} x2={X1} y2={AXIS_Y} className="fg-axis" strokeWidth={2} />
			{TICKS.map((k) => (
				<line key={k} x1={xOf(k)} y1={AXIS_Y - 5} x2={xOf(k)} y2={AXIS_Y + 5} className="fg-axis" strokeWidth={1.5} />
			))}
			{[0.6, 0.7, 0.8, 0.9].map((k) => (
				<text key={k} x={xOf(k)} y={AXIS_Y + 24} textAnchor="middle" className="fg-sub" fontSize={12.5}>
					{k.toFixed(1)}
				</text>
			))}
			<text x={X0} y={AXIS_Y + 52} className="fg-sub" fontSize={12.5}>
				가중 카파
			</text>
			{ABOVE.filter((p) => p.k !== 0.83).map((p) => (
				<line key={p.k} x1={xOf(p.k)} y1={70} x2={xOf(p.k)} y2={AXIS_Y - 8} className={`fg-${p.tone}`} strokeWidth={1.5} />
			))}
			<line x1={dx} y1={AXIS_Y + 8} x2={dx} y2={AXIS_Y + 36} className="fg-amber" strokeWidth={1.5} />

			<line x1={xOf(DISTILL.from)} y1={AXIS_Y} x2={xOf(DISTILL.to)} y2={AXIS_Y} className="fg-amber" strokeWidth={12} strokeLinecap="round" />
			{ABOVE.map((p) => (
				<g key={p.k}>
					<circle cx={xOf(p.k)} cy={AXIS_Y} r={6} className={`fg-${p.tone}-ink`} />
					<text x={xOf(p.k)} y={38} textAnchor="middle" className={`fg-${p.tone}-ink`} fontSize={14} fontWeight={700}>
						{p.name}
					</text>
					<text x={xOf(p.k)} y={58} textAnchor="middle" className={`fg-${p.tone}-ink`} fontSize={13}>
						{p.k.toFixed(2)}
					</text>
				</g>
			))}
			<text x={ceilX + 10} y={AXIS_Y - 14} className="fg-green-ink" fontSize={12.5}>
				실질적인 상한
			</text>
			<text x={dx} y={AXIS_Y + 54} textAnchor="middle" className="fg-amber-ink" fontSize={14} fontWeight={700}>
				{DISTILL.name}
			</text>
			<text x={dx} y={AXIS_Y + 74} textAnchor="middle" className="fg-amber-ink" fontSize={13}>
				{DISTILL.from.toFixed(2)}~{DISTILL.to.toFixed(2)}
			</text>
		</svg>
	);
}

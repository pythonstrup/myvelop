import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// Microsoft ExP 글의 프롬프트·응답 단계를 막대로 그린 정적 그림.
// 막대 길이는 단계마다 줄어드는 모양만 보이려고 지어낸 값이다.
const W = 720;
const ROW = 36;
const TOP = 24;
const BAR_X = 200;
const STEPS = [
	{ label: "기능이 불림", w: 440 },
	{ label: "프롬프트", w: 380 },
	{ label: "응답", w: 350 },
	{ label: "사용자가 본 응답", w: 260 },
	{ label: "받아들인 응답", w: 110 },
	{ label: "남은 내용", w: 80 },
] as const;
const H = TOP * 2 + STEPS.length * ROW;
const SEEN = 3;
const ACCEPTED = 4;
const yOf = (i: number) => TOP + i * ROW + ROW / 2;
const ARIA =
	"AI 기능의 사용 단계를 위에서 아래로 줄어드는 막대로 그린 그림. 기능이 불림, 프롬프트, 응답, 사용자가 본 응답, 받아들인 응답, 남은 내용 순서이고, 사용자가 본 응답 가운데 받아들인 응답의 비율이 수락률이다.";

export default function FunnelFigure() {
	const bx = BAR_X + STEPS[SEEN].w + 28;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{STEPS.map((s, i) => (
				<g key={s.label}>
					<text x={BAR_X - 16} y={yOf(i) + 5} textAnchor="end" className="fg-text" fontSize={14}>
						{s.label}
					</text>
					<rect
						x={BAR_X}
						y={yOf(i) - 11}
						width={s.w}
						height={22}
						rx={4}
						className={i === SEEN || i === ACCEPTED ? "fg-blue-fill fg-blue" : "fg-gray-fill fg-gray"}
						strokeWidth={1.5}
					/>
				</g>
			))}
			{/* 본 응답에서 받아들인 응답으로 이어지는 괄호 */}
			<g className="fg-blue" strokeWidth={1.5} fill="none">
				<line x1={bx} y1={yOf(SEEN)} x2={bx} y2={yOf(ACCEPTED)} />
				<line x1={bx - 8} y1={yOf(SEEN)} x2={bx} y2={yOf(SEEN)} />
				<line x1={bx - 8} y1={yOf(ACCEPTED)} x2={bx} y2={yOf(ACCEPTED)} />
			</g>
			<Pill cx={bx + 100} cy={(yOf(SEEN) + yOf(ACCEPTED)) / 2} label="수락률 = 받아들인 ÷ 본" tone="blue" maxX={W} />
		</svg>
	);
}

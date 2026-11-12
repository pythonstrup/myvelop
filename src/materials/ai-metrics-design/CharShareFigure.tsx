import { FIG_STYLE, Pill, type Tone } from "@/materials/monitoring-design/figure";

// Google 2026년 논문의 AI 문자 비율을 두 분모로 나눠 보이는 정적 그림.
// 한 줄 막대를 받아들인 AI 문자, 직접 친 문자, 붙여넣은 문자로 나눈다.
// 칸 길이는 공개된 두 비율(붙여넣은 문자를 분모에 넣으면 28.7%, 빼면 70.6%)에서 거꾸로 계산했다.
// AI 28.7%, 직접 친 문자 28.7 / 0.706 - 28.7 ≈ 12.0%, 나머지 붙여넣은 문자 ≈ 59.3%.
const W = 720;
const H = 214;
const X0 = 40;
const BAR_W = 640;
const BAR_Y = 80;
const BAR_H = 44;
const AI = 28.7;
const TYPED = AI / 0.706 - AI;
const xOf = (pct: number) => X0 + (pct / 100) * BAR_W;
const SEGS = [
	{ lines: ["받아들인 AI 문자"], from: 0, to: AI, cls: "fg-blue-fill fg-blue", ink: "fg-blue-ink" },
	{ lines: ["직접 친", "문자"], from: AI, to: AI + TYPED, cls: "fg-gray-fill fg-gray", ink: "fg-text" },
	{ lines: ["붙여넣은 문자"], from: AI + TYPED, to: 100, cls: "fg-box", ink: "fg-text" },
] as const;
const ARIA =
	"Google이 낸 AI 문자 비율의 두 분모. 받아들인 AI 문자, 직접 친 문자, 붙여넣은 문자를 한 줄에 놓았다. 분모에서 붙여넣은 문자를 빼면 AI 문자 비율은 70.6%이고, 넣으면 28.7%다. 두 비율 모두 분자는 받아들인 AI 문자다.";

function Bracket({ x1, x2, y, dir, tone }: { x1: number; x2: number; y: number; dir: 1 | -1; tone: Tone }) {
	return (
		<g className={`fg-${tone}`} strokeWidth={1.5} fill="none">
			<line x1={x1} y1={y} x2={x2} y2={y} />
			<line x1={x1} y1={y} x2={x1} y2={y + dir * 8} />
			<line x1={x2} y1={y} x2={x2} y2={y + dir * 8} />
		</g>
	);
}

export default function CharShareFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{SEGS.map((s) => {
				const cx = (xOf(s.from) + xOf(s.to)) / 2;
				const y0 = BAR_Y + BAR_H / 2 + 5 - ((s.lines.length - 1) * 16) / 2;
				return (
					<g key={s.lines.join("")}>
						<rect x={xOf(s.from)} y={BAR_Y} width={xOf(s.to) - xOf(s.from)} height={BAR_H} className={s.cls} strokeWidth={1.5} />
						{s.lines.map((line, i) => (
							<text key={line} x={cx} y={y0 + i * 16} textAnchor="middle" className={s.ink} fontSize={13} fontWeight={700}>
								{line}
							</text>
						))}
					</g>
				);
			})}

			{/* 위는 붙여넣은 문자를 뺀 분모, 아래는 넣은 분모 */}
			<Bracket x1={xOf(0)} x2={xOf(AI + TYPED)} y={62} dir={1} tone="blue" />
			<Bracket x1={xOf(0)} x2={xOf(100)} y={142} dir={-1} tone="amber" />
			<Pill cx={(xOf(0) + xOf(AI + TYPED)) / 2} cy={38} label="붙여넣은 문자를 빼면 70.6%" tone="blue" maxX={W} />
			<Pill cx={xOf(50)} cy={166} label="붙여넣은 문자를 넣으면 28.7%" tone="amber" maxX={W} />

			<text x={W / 2} y={200} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				두 비율 모두 분자는 받아들인 AI 문자다
			</text>
		</svg>
	);
}

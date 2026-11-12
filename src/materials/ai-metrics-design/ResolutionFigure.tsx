import { FIG_STYLE, Pill, type Tone } from "@/materials/monitoring-design/figure";

// Intercom Fin의 관여율, 해결률, 자동화율이 어떻게 이어지는지 보이는 정적 그림.
// 대화 수는 가정한 값이다. 새 대화 100건 가운데 Fin이 80건에 나서고, 그 80건에서 확인된 해결 20건,
// 추정된 해결 40건, 사람 상담원에게 넘김 15건, 나머지 5건이 나왔다고 둔다.
// 관여율 80%, 해결률 60 ÷ 80 = 75%, 자동화율 60 ÷ 100 = 60% = 80% × 75%.
const W = 720;
const H = 288;
const X0 = 150;
const PER = 4; // 대화 1건당 px
const BAR_H = 30;
const ROWS_Y = [30, 96, 184]; // 막대 윗변
const xOf = (n: number) => X0 + n * PER;
type Seg = { label: string; from: number; to: number; tone: Tone | "box"; dashed?: boolean };
const ROWS: { label: string; segs: Seg[]; pill: string; tone: Tone }[] = [
	{
		label: "새 대화 100건",
		segs: [
			{ label: "Fin이 나섬 80", from: 0, to: 80, tone: "blue" },
			{ label: "안 나섬 20", from: 80, to: 100, tone: "box" },
		],
		pill: "관여율 80%",
		tone: "blue",
	},
	{
		label: "Fin이 나선 80건",
		segs: [
			{ label: "확인 20", from: 0, to: 20, tone: "green" },
			{ label: "추정 40", from: 20, to: 60, tone: "green", dashed: true },
			{ label: "넘김 15", from: 60, to: 75, tone: "amber" },
			{ label: "5", from: 75, to: 80, tone: "box" },
		],
		pill: "해결률 75%",
		tone: "green",
	},
	{
		label: "새 대화 100건",
		segs: [
			{ label: "해결 60", from: 0, to: 60, tone: "green" },
			{ label: "그 밖 40", from: 60, to: 100, tone: "box" },
		],
		pill: "자동화율 60%",
		tone: "green",
	},
];
const ARIA =
	"Fin의 관여율, 해결률, 자동화율을 가정한 숫자로 그린 그림. 새 대화 100건 가운데 Fin이 80건에 나서 관여율은 80%다. 나선 80건 가운데 확인된 해결 20건과 추정된 해결 40건을 더한 60건이 해결되어 해결률은 75%이고, 15건은 사람 상담원에게 넘어갔다. 새 대화 100건 가운데 해결된 60건의 비율인 자동화율 60%는 관여율 80%에 해결률 75%를 곱한 값과 같다.";

export default function ResolutionFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 나선 80건이 아래 줄에서 나뉜다 */}
			{[0, 80].map((n) => (
				<line key={n} x1={xOf(n)} y1={ROWS_Y[0] + BAR_H} x2={xOf(n)} y2={ROWS_Y[1]} className="fg-sub-line" strokeWidth={1} strokeDasharray="3 3" />
			))}

			{ROWS.map((r, i) => {
				const y = ROWS_Y[i];
				return (
					<g key={`${r.label}-${i}`}>
						<text x={X0 - 12} y={y + BAR_H / 2 + 5} textAnchor="end" className="fg-text" fontSize={13.5}>
							{r.label}
						</text>
						{r.segs.map((s) => (
							<g key={s.label}>
								<rect
									x={xOf(s.from)}
									y={y}
									width={(s.to - s.from) * PER}
									height={BAR_H}
									className={s.tone === "box" ? "fg-box" : `fg-${s.tone}-fill fg-${s.tone}`}
									strokeWidth={1.5}
									strokeDasharray={s.dashed ? "5 3" : undefined}
								/>
								<text
									x={(xOf(s.from) + xOf(s.to)) / 2}
									y={y + BAR_H / 2 + 5}
									textAnchor="middle"
									className={s.tone === "box" ? "fg-sub" : `fg-${s.tone}-ink`}
									fontSize={12.5}
									fontWeight={700}
								>
									{s.label}
								</text>
							</g>
						))}
						<Pill cx={636} cy={y + BAR_H / 2} label={r.pill} tone={r.tone} maxX={W} />
					</g>
				);
			})}

			{/* 해결 60건 = 확인 + 추정 */}
			<g className="fg-green" strokeWidth={1.5} fill="none">
				<line x1={xOf(0)} y1={140} x2={xOf(60)} y2={140} />
				<line x1={xOf(0)} y1={132} x2={xOf(0)} y2={140} />
				<line x1={xOf(60)} y1={132} x2={xOf(60)} y2={140} />
			</g>
			<text x={xOf(30)} y={160} textAnchor="middle" className="fg-green-ink" fontSize={13} fontWeight={700}>
				해결 60건
			</text>
			<text x={X0} y={236} className="fg-sub" fontSize={12.5}>
				자동화율 60% = 관여율 80% × 해결률 75%
			</text>

			<rect x={X0} y={256} width={22} height={12} className="fg-green-fill fg-green" strokeWidth={1.5} />
			<text x={X0 + 30} y={267} className="fg-sub" fontSize={12.5}>
				확인된 해결
			</text>
			<rect x={X0 + 120} y={256} width={22} height={12} className="fg-green-fill fg-green" strokeWidth={1.5} strokeDasharray="5 3" />
			<text x={X0 + 150} y={267} className="fg-sub" fontSize={12.5}>
				추정된 해결
			</text>
			<rect x={X0 + 240} y={256} width={22} height={12} className="fg-amber-fill fg-amber" strokeWidth={1.5} />
			<text x={X0 + 270} y={267} className="fg-sub" fontSize={12.5}>
				사람 상담원에게 넘김
			</text>
		</svg>
	);
}

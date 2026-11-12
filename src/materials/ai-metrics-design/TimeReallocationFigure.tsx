import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// Humlum·Vestergaard 개정판에서 사용자가 아낀 시간을 어디에 썼는지 나타낸 세 비율을 가로 막대로 그린 정적 그림.
// 휴식은 원문이 「10% 미만」이라고만 적어서, 10% 지점까지 점선 막대로 그려 미만임을 보인다.
const W = 720;
const ROW = 44;
const TOP = 22;
const LABEL_X = 196; // 행 이름의 오른쪽 끝
const X0 = 212;
const PER = 4.4; // 1%당 px
const ROWS = [
	{ label: "다른 업무에 썼다", pct: 85, text: "85%", under: false },
	{ label: "그 일에 시간을 더 들였다", pct: 30, text: "약 30%", under: false },
	{ label: "휴식에 썼다", pct: 10, text: "10% 미만", under: true },
] as const;
const AXIS_Y = TOP + ROWS.length * ROW + 4;
const H = AXIS_Y + 58;
const yOf = (i: number) => TOP + i * ROW + ROW / 2;
const ARIA =
	"Humlum과 Vestergaard의 개정판에서 사용자가 아낀 시간을 어디에 썼는지 나타낸 그림. 85%는 다른 업무에 썼고, 약 30%는 시간을 아낀 바로 그 일에 시간을 더 들였으며, 휴식에 쓴 사람은 10%가 안 됐다. 세 항목은 겹칠 수 있어 합이 100%를 넘는다.";

export default function TimeReallocationFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{[0, 25, 50, 75, 100].map((pct) => (
				<g key={pct}>
					<line x1={X0 + pct * PER} y1={TOP} x2={X0 + pct * PER} y2={AXIS_Y} className="fg-axis" strokeWidth={1} />
					<text x={X0 + pct * PER} y={AXIS_Y + 18} textAnchor="middle" className="fg-sub" fontSize={12.5}>
						{pct}%
					</text>
				</g>
			))}
			{ROWS.map((r, i) => (
				<g key={r.label}>
					<text x={LABEL_X} y={yOf(i) + 5} textAnchor="end" className="fg-text" fontSize={14}>
						{r.label}
					</text>
					<rect
						x={X0}
						y={yOf(i) - 12}
						width={r.pct * PER}
						height={24}
						rx={4}
						className={r.under ? "fg-gray-fill fg-gray" : "fg-blue-fill fg-blue"}
						strokeWidth={1.5}
						strokeDasharray={r.under ? "4 3" : undefined}
					/>
					<text x={X0 + r.pct * PER + 8} y={yOf(i) + 5} className={r.under ? "fg-gray-ink" : "fg-blue-ink"} fontSize={14} fontWeight={700}>
						{r.text}
					</text>
				</g>
			))}
			<text x={X0} y={AXIS_Y + 44} className="fg-sub" fontSize={12.5}>
				사용자 가운데 비율. 세 항목은 겹칠 수 있어 합이 100%를 넘는다.
			</text>
		</svg>
	);
}

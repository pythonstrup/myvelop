import { FIG_STYLE, VLine } from "@/materials/monitoring-design/figure";

// pass@k 와 pass^k 가 시도 횟수에 따라 벌어지는 모양을 그린 정적 그림.
// 시도마다 성공 확률이 75%(Anthropic 글의 예)이고 시도끼리 독립이라고 가정해 계산한 값이다.
const W = 720;
const X0 = 70;
const STEP = 70; // k 하나당 px
const TOP = 30;
const BOTTOM = 230;
const H = BOTTOM + 56;
const P = 0.75;
const KS = [1, 2, 3, 4, 5, 6, 7, 8];
const MARK = 3;
const LAST = KS[KS.length - 1];
const xOf = (k: number) => X0 + (k - 1) * STEP;
const yOf = (pct: number) => BOTTOM - (pct / 100) * (BOTTOM - TOP);
const SERIES = [
	{ label: "pass@k", sub: "한 번이라도 성공", tone: "blue", pct: (k: number) => (1 - (1 - P) ** k) * 100 },
	{ label: "pass^k", sub: "매번 성공", tone: "red", pct: (k: number) => P ** k * 100 },
] as const;
const [AT_LEAST_ONCE, EVERY_TIME] = SERIES;
const ARIA =
	"시도 횟수 k에 따라 pass@k와 pass^k를 그린 그림. 시도마다 성공할 확률을 75%로 가정했다. k가 1이면 둘 다 75%다. k가 늘수록 한 번이라도 성공할 확률인 pass@k는 100%에 가까워지고, 매번 성공할 확률인 pass^k는 떨어진다. k가 3이면 pass@k는 약 98%, pass^k는 약 42%이고, k가 8이면 pass^k는 약 10%다.";

export default function PassKFigure() {
	const markX = xOf(MARK);
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{[0, 25, 50, 75, 100].map((pct) => (
				<g key={pct}>
					<line x1={X0} y1={yOf(pct)} x2={xOf(LAST)} y2={yOf(pct)} className="fg-axis" strokeWidth={1} />
					<text x={X0 - 12} y={yOf(pct) + 4} textAnchor="end" className="fg-sub" fontSize={12}>
						{pct}%
					</text>
				</g>
			))}
			{KS.map((k) => (
				<text key={k} x={xOf(k)} y={BOTTOM + 20} textAnchor="middle" className="fg-sub" fontSize={12}>
					{k}
				</text>
			))}
			<text x={(X0 + xOf(LAST)) / 2} y={BOTTOM + 44} textAnchor="middle" className="fg-sub" fontSize={12}>
				시도 횟수 k
			</text>
			<VLine x={markX} y1={TOP} y2={BOTTOM} tone="gray" />
			{SERIES.map((s) => (
				<g key={s.label}>
					<polyline points={KS.map((k) => `${xOf(k)},${yOf(s.pct(k))}`).join(" ")} fill="none" className={`fg-${s.tone}`} strokeWidth={2.5} strokeLinejoin="round" />
					{KS.map((k) => (
						<circle key={k} cx={xOf(k)} cy={yOf(s.pct(k))} r={4} className={`fg-bg fg-${s.tone}`} strokeWidth={2} />
					))}
					<text x={xOf(LAST) + 20} y={yOf(s.pct(LAST)) + 5} className={`fg-${s.tone}-ink`} fontSize={14} fontWeight={700}>
						{s.label}
					</text>
					<text x={xOf(LAST) + 20} y={yOf(s.pct(LAST)) + 21} className="fg-sub" fontSize={12}>
						{s.sub}
					</text>
				</g>
			))}
			{/* k=3 의 두 값과 k=8 의 pass^k. 값은 반올림해 적는다 */}
			<text x={markX} y={yOf(AT_LEAST_ONCE.pct(MARK)) - 10} textAnchor="middle" className="fg-blue-ink" fontSize={14} fontWeight={700}>
				약 {Math.round(AT_LEAST_ONCE.pct(MARK))}%
			</text>
			<text x={markX + 12} y={yOf(EVERY_TIME.pct(MARK)) - 8} className="fg-red-ink" fontSize={14} fontWeight={700}>
				약 {Math.round(EVERY_TIME.pct(MARK))}%
			</text>
			<text x={xOf(LAST)} y={yOf(EVERY_TIME.pct(LAST)) - 14} textAnchor="middle" className="fg-red-ink" fontSize={14} fontWeight={700}>
				약 {Math.round(EVERY_TIME.pct(LAST))}%
			</text>
		</svg>
	);
}

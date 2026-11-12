import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// 가드레일 지표를 k개 두고 지표마다 유의수준 0.05로 경보를 낼 때, 아무것도 바꾸지 않은 AA 테스트에서도
// 잘못된 경보가 하나 이상 날 확률 1 - 0.95^k 를 그린 정적 그림. 지표끼리 서로 독립이라고 가정했다.
// k=50 의 약 92% 는 Airbnb 글의 계산과 같고, k=1·10 의 값은 같은 식으로 계산했다.
const W = 720;
const X0 = 70;
const X1 = 620;
const TOP = 30;
const BOTTOM = 230;
const H = BOTTOM + 56;
const KMAX = 50;
const KS = Array.from({ length: KMAX }, (_, i) => i + 1);
const TICKS = [1, 10, 20, 30, 40, 50];
const xOf = (k: number) => X0 + ((k - 1) / (KMAX - 1)) * (X1 - X0);
const yOf = (pct: number) => BOTTOM - (pct / 100) * (BOTTOM - TOP);
const pctOf = (k: number) => (1 - 0.95 ** k) * 100;
const ARIA =
	"가드레일 지표 개수 k에 따라 잘못된 경보가 하나 이상 날 확률을 그린 그림. 지표마다 유의수준 0.05로 경보를 내고 지표끼리 독립이라고 가정해 1 − 0.95의 k제곱으로 계산했다. 지표가 1개면 5%, 10개면 약 40%, 50개면 약 92%다.";

export default function GuardrailFalseAlarmFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{[0, 25, 50, 75, 100].map((pct) => (
				<g key={pct}>
					<line x1={X0} y1={yOf(pct)} x2={X1} y2={yOf(pct)} className="fg-axis" strokeWidth={1} />
					<text x={X0 - 12} y={yOf(pct) + 4} textAnchor="end" className="fg-sub" fontSize={12}>
						{pct}%
					</text>
				</g>
			))}
			{TICKS.map((k) => (
				<text key={k} x={xOf(k)} y={BOTTOM + 20} textAnchor="middle" className="fg-sub" fontSize={12}>
					{k}
				</text>
			))}
			<text x={(X0 + X1) / 2} y={BOTTOM + 44} textAnchor="middle" className="fg-sub" fontSize={12}>
				가드레일 지표 개수 k
			</text>

			<text x={X0 + 16} y={yOf(92)} className="fg-text" fontSize={13.5} fontWeight={700}>
				잘못된 경보가 하나 이상 날 확률
			</text>
			<text x={X0 + 16} y={yOf(92) + 18} className="fg-sub" fontSize={12.5}>
				1 − 0.95^k, 지표마다 유의수준 0.05
			</text>

			<polyline points={KS.map((k) => `${xOf(k)},${yOf(pctOf(k))}`).join(" ")} fill="none" className="fg-red" strokeWidth={2.5} strokeLinejoin="round" />
			{[1, 10, 50].map((k) => (
				<circle key={k} cx={xOf(k)} cy={yOf(pctOf(k))} r={4.5} className="fg-bg fg-red" strokeWidth={2} />
			))}
			<text x={xOf(1) + 12} y={yOf(pctOf(1)) + 5} className="fg-red-ink" fontSize={13} fontWeight={700}>
				5%
			</text>
			<text x={xOf(10) - 10} y={yOf(pctOf(10)) - 10} textAnchor="end" className="fg-red-ink" fontSize={13} fontWeight={700}>
				약 {Math.round(pctOf(10))}%
			</text>
			<text x={xOf(KMAX) + 12} y={yOf(pctOf(KMAX)) + 5} className="fg-red-ink" fontSize={14} fontWeight={700}>
				약 {Math.round(pctOf(KMAX))}%
			</text>
		</svg>
	);
}

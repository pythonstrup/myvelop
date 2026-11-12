import { FIG_STYLE, VLine } from "@/materials/monitoring-design/figure";

// 사용자가 늘 때 끝난 주문의 개수와 비율을 위아래로 견주는 정적 그림.
// 값은 가정이다. 시작한 주문은 첫 주 1,000건에서 매주 300건씩 늘고,
// 끝난 비율은 4주째까지 60%였다가 5주째부터 주마다 3%p씩 떨어진다.
const W = 720;
const H = 304;
const X0 = 76;
const X1 = 600;
const WEEKS = 8;
const STARTED = Array.from({ length: WEEKS }, (_, i) => 1000 + 300 * i);
const RATE = [60, 60, 60, 60, 57, 54, 51, 48];
const DONE = STARTED.map((s, i) => Math.round((s * RATE[i]) / 100));
const DROP = 4; // 비율이 떨어지기 시작하는 주의 칸(5주째)
const COUNT = { top: 52, base: 132, min: 400, max: 1600 };
const RATE_P = { top: 182, base: 262, min: 40, max: 65 };
const ARIA =
	"8주 동안 끝난 주문의 개수와 끝난 비율을 위아래로 그린 그림. 시작한 주문이 매주 늘어서 끝난 주문의 개수는 600건에서 1,488건으로 계속 오른다. 그런데 끝난 비율은 4주째까지 60%였다가 5주째부터 48%까지 떨어진다. 개수만 보면 이 문제를 놓친다.";

const xOf = (i: number) => X0 + (i / (WEEKS - 1)) * (X1 - X0);
const yOf = (v: number, p: { top: number; base: number; min: number; max: number }) => p.base - ((v - p.min) / (p.max - p.min)) * (p.base - p.top);
const pts = (vs: readonly number[], p: typeof COUNT, from = 0) => vs.map((v, i) => `${xOf(i + from).toFixed(1)},${yOf(v, p).toFixed(1)}`).join(" ");
const fmt = (n: number) => n.toLocaleString("en-US");

export default function CountVsRateFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			<VLine x={xOf(DROP)} y1={44} y2={RATE_P.base} tone="red" />
			<line x1={X0} y1={COUNT.base + 0.5} x2={X1} y2={COUNT.base + 0.5} className="fg-axis" />
			<line x1={X0} y1={RATE_P.base + 0.5} x2={X1} y2={RATE_P.base + 0.5} className="fg-axis" />

			{/* 위: 끝난 주문의 개수 */}
			<text x={24} y={34} className="fg-text" fontSize={15} fontWeight={700}>
				끝난 주문의 개수
			</text>
			<polyline points={pts(DONE, COUNT)} fill="none" className="fg-blue" strokeWidth={2.5} strokeLinejoin="round" />
			{DONE.map((v, i) => (
				<circle key={i} cx={xOf(i)} cy={yOf(v, COUNT)} r={3} className="fg-blue-ink" />
			))}
			<text x={X0 - 10} y={yOf(DONE[0], COUNT) + 5} textAnchor="end" className="fg-sub" fontSize={12.5}>
				{fmt(DONE[0])}건
			</text>
			<text x={X1 + 12} y={yOf(DONE[WEEKS - 1], COUNT) + 5} className="fg-blue-ink" fontSize={13} fontWeight={700}>
				{fmt(DONE[WEEKS - 1])}건
			</text>
			<text x={X1 + 12} y={yOf(DONE[WEEKS - 1], COUNT) + 24} className="fg-sub" fontSize={12.5}>
				계속 오른다
			</text>

			{/* 아래: 끝난 비율 */}
			<text x={24} y={164} className="fg-text" fontSize={15} fontWeight={700}>
				끝난 비율
			</text>
			<polyline points={pts(RATE.slice(0, DROP + 1), RATE_P)} fill="none" className="fg-blue" strokeWidth={2.5} strokeLinejoin="round" />
			<polyline points={pts(RATE.slice(DROP), RATE_P, DROP)} fill="none" className="fg-red" strokeWidth={2.5} strokeLinejoin="round" />
			{RATE.map((v, i) => (
				<circle key={i} cx={xOf(i)} cy={yOf(v, RATE_P)} r={3} className={i > DROP ? "fg-red-ink" : "fg-blue-ink"} />
			))}
			<text x={X0 - 10} y={yOf(RATE[0], RATE_P) + 5} textAnchor="end" className="fg-sub" fontSize={12.5}>
				{RATE[0]}%
			</text>
			<text x={X1 + 12} y={yOf(RATE[WEEKS - 1], RATE_P) + 5} className="fg-red-ink" fontSize={13} fontWeight={700}>
				{RATE[WEEKS - 1]}%
			</text>
			<text x={X1 + 12} y={yOf(RATE[WEEKS - 1], RATE_P) - 14} className="fg-sub" fontSize={12.5}>
				떨어진다
			</text>
			<text x={xOf(DROP) + 8} y={RATE_P.top - 2} className="fg-red-ink" fontSize={12.5} fontWeight={700}>
				5주째부터
			</text>

			{STARTED.map((_, i) => (
				<text key={i} x={xOf(i)} y={RATE_P.base + 22} textAnchor="middle" className="fg-sub" fontSize={12.5}>
					{i + 1}주
				</text>
			))}
		</svg>
	);
}

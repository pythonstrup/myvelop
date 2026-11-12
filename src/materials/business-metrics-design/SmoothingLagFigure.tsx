import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// Netflix가 쓴 이중 지수 평활의 약점을 보이는 개념도. 값은 모양만 보이려고 지어낸 것이다.
// 실제 값이 장애로 뚝 떨어지면 예상 범위를 벗어나 경보가 난다(맞는 경보).
// 장애가 끝나 값이 갑자기 회복하면, 평활한 예상값이 아직 아래에 머물러 있어 잠깐 범위 위로 벗어난다(잘못된 경보).
// 예상값은 한 단계 앞을 내다보는 홀트의 이중 지수 평활(level 0.12, trend 0.04)로 계산했다.
// 시간선이 왼쪽에서 오른쪽으로 지나가며 그래프가 드러난다. 움직임 줄이기 설정에서는 다 드러난 모습으로 멈춘다.
const W = 720;
const H = 290;
const X0 = 40;
const X1 = 696;
const BASE = 250;
const T = 72;
const OUTAGE = { from: 32, to: 39 };
const BAND = 0.12;
const LOOP = 8;
const SWEEP = X1 - X0;

const actual = (t: number) => (t >= OUTAGE.from && t < OUTAGE.to ? 0.3 + 0.02 * Math.sin(t * 1.3) : 0.66 + 0.025 * Math.sin(t * 0.9));
const TS = Array.from({ length: T + 1 }, (_, t) => t);
// 한 단계 앞 예상값. forecast[t] 는 t-1 까지만 보고 낸 값이다.
const forecast = (() => {
	const a = 0.12;
	const b = 0.04;
	const out = [actual(0)];
	let level = actual(0);
	let trend = 0;
	for (let t = 1; t <= T; t++) {
		out.push(level + trend);
		const next = a * actual(t) + (1 - a) * (level + trend);
		trend = b * (next - level) + (1 - b) * trend;
		level = next;
	}
	return out;
})();
const xOf = (t: number) => X0 + (t / T) * (X1 - X0);
const yOf = (v: number) => BASE - (v - 0.15) * 240;
const pts = (f: (t: number) => number, ts: readonly number[] = TS) => ts.map((t) => `${xOf(t).toFixed(1)},${yOf(f(t)).toFixed(1)}`).join(" ");
const fc = (t: number) => forecast[t];
// 실제 값이 범위 아래(-1) 또는 위(1)로 벗어난 시점들
const outside = (side: 1 | -1) => TS.filter((t) => side * (actual(t) - fc(t)) > BAND);
const DOWN = outside(-1);
const UP = outside(1);
// 벗어난 점과 그 앞 점을 이어 굵게 덧칠한다
const span = (ts: number[]) => [ts[0] - 1, ...ts];

const ANIM = `
	.sl-curtain { visibility: hidden; animation: sl-sweep ${LOOP}s linear infinite; }
	@keyframes sl-sweep { 0% { transform: translateX(0); visibility: visible; } 80%, 100% { transform: translateX(${SWEEP}px); visibility: visible; } }
	@media (prefers-reduced-motion: reduce) { .sl-curtain { animation: none; } }
`;
const ARIA =
	"이중 지수 평활로 그린 예상 범위와 실제 값을 비교한 개념도. 장애로 실제 값이 뚝 떨어지자 범위 아래로 벗어나 맞는 경보가 난다. 장애가 끝나 실제 값이 갑자기 회복하자 예상 범위는 아직 아래에 머물러 있다가 늦게 따라 올라와서, 그동안 실제 값이 범위 위로 벗어나 잘못된 경보가 난다.";

export default function SmoothingLagFigure() {
	const band = `${pts((t) => fc(t) + BAND)} ${pts((t) => fc(t) - BAND, [...TS].reverse())}`;
	const downMid = xOf((DOWN[0] + DOWN[DOWN.length - 1]) / 2);
	const upMid = xOf((UP[0] + UP[UP.length - 1]) / 2);
	const lagT = UP[UP.length - 1] + 3;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE + ANIM}</style>
			<defs>
				<clipPath id="sl-clip">
					<rect x={X0 - 4} y={20} width={X1 - X0 + 8} height={BASE - 20} />
				</clipPath>
			</defs>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 장애 구간 */}
			<rect x={xOf(OUTAGE.from - 0.5)} y={100} width={xOf(OUTAGE.to - 0.5) - xOf(OUTAGE.from - 0.5)} height={BASE - 100} className="fg-gray-fill" />
			<text x={xOf((OUTAGE.from + OUTAGE.to - 1) / 2)} y={BASE - 8} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				장애
			</text>

			{/* 예상 범위, 예상값, 실제 값 */}
			<polygon points={band} className="fg-blue-fill" />
			<polyline points={pts(fc)} fill="none" className="fg-gray" strokeWidth={1.5} strokeDasharray="6 4" />
			<polyline points={pts(actual)} fill="none" className="fg-blue" strokeWidth={2.5} strokeLinejoin="round" />
			<polyline points={pts(actual, span(DOWN))} fill="none" className="fg-red" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
			<polyline points={pts(actual, span(UP))} fill="none" className="fg-amber" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />

			{/* 이름표와 이끔선 */}
			<line x1={downMid} y1={53} x2={downMid} y2={yOf(0.3) - 8} className="fg-red" strokeWidth={1} strokeDasharray="3 3" />
			<line x1={upMid} y1={89} x2={upMid} y2={yOf(0.66) - 8} className="fg-amber" strokeWidth={1} strokeDasharray="3 3" />
			<line x1={xOf(lagT)} y1={53} x2={xOf(lagT)} y2={yOf(fc(lagT)) - 4} className="fg-blue" strokeWidth={1} strokeDasharray="3 3" />
			<Pill cx={downMid} cy={40} label="맞는 경보" tone="red" maxX={W} />
			<Pill cx={upMid} cy={76} label="잘못된 경보" tone="amber" maxX={W} />
			<Pill cx={xOf(lagT) + 70} cy={40} label="예상 범위가 늦게 따라온다" tone="blue" maxX={W} />

			{/* 아직 오지 않은 시간을 덮는 바탕색 커튼 */}
			<g clipPath="url(#sl-clip)">
				<g className="sl-curtain">
					<rect x={X0 - 4} y={20} width={SWEEP + 8} height={BASE - 20} className="fg-bg" />
				</g>
			</g>

			{/* 가로축과 범례 */}
			<line x1={X0} y1={BASE + 0.5} x2={X1} y2={BASE + 0.5} className="fg-axis" />
			<text x={X1} y={BASE + 20} textAnchor="end" className="fg-sub" fontSize={12.5}>
				시간 →
			</text>
			<line x1={X0} y1={BASE + 16} x2={X0 + 18} y2={BASE + 16} className="fg-blue" strokeWidth={2.5} />
			<text x={X0 + 24} y={BASE + 20} className="fg-sub" fontSize={12.5}>
				실제 값
			</text>
			<line x1={X0 + 88} y1={BASE + 16} x2={X0 + 106} y2={BASE + 16} className="fg-gray" strokeWidth={1.5} strokeDasharray="6 4" />
			<text x={X0 + 112} y={BASE + 20} className="fg-sub" fontSize={12.5}>
				예상값
			</text>
			<rect x={X0 + 164} y={BASE + 10} width={18} height={12} rx={2} className="fg-blue-fill" />
			<text x={X0 + 188} y={BASE + 20} className="fg-sub" fontSize={12.5}>
				예상 범위
			</text>
		</svg>
	);
}

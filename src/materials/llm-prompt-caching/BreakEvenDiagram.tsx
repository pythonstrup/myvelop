// 적중률에 따른 요청 1건의 입력 비용을 캐시가 없을 때(= 1)와 비교한다. 정적 SVG로 SSR에서만 렌더링한다.
// 비용은 기본 입력가 대비다. 5분 TTL은 1.25 − 1.15h, 1시간 TTL은 2 − 1.9h (읽기 0.1배 기준).
const X0 = 44;
const X1 = 380;
const Y_TOP = 50; // 세로축 2.1 자리
const Y_BASE = 222; // 세로축 0 자리
const Y_MAX = 2.1;

const x = (hit: number) => X0 + (X1 - X0) * hit;
const y = (cost: number) => Y_BASE - ((Y_BASE - Y_TOP) * cost) / Y_MAX;
const cost5m = (hit: number) => 1.25 - 1.15 * hit;
const cost1h = (hit: number) => 2 - 1.9 * hit;
const EVEN_5M = 0.25 / 1.15; // 22%
const EVEN_1H = 1 / 1.9; // 53%

// 색각 이상 시뮬레이션까지 검증한 계열 색. 다크 테마는 밝기 대역에 맞춰 파랑을 한 단계 바꾼다.
const STYLE = `
	.be-5m { stroke: #1971c2; } .be-5m-dot { fill: #1971c2; }
	.be-1h { stroke: #e8590c; } .be-1h-dot { fill: #e8590c; }
	html.dark .be-5m { stroke: #339af0; } html.dark .be-5m-dot { fill: #339af0; }
`;

const LABELS = {
	ko: {
		legend: ["캐시 없음", "5분 TTL", "1시간 TTL"],
		yTitle: "요청 1건 비용 (캐시 없음 = 1)",
		xTitle: "적중률",
		aria: "적중률에 따라 요청 1건의 입력 비용을 캐시가 없을 때와 비교한 선 그래프. 캐시 없음은 1로 수평이다. 5분 TTL은 적중률 0%에서 1.25로 시작해 22%에서 1과 만나고 100%에서 0.1이 된다. 1시간 TTL은 2에서 시작해 53%에서 1과 만나고 100%에서 0.1이 된다.",
	},
	en: {
		legend: ["No cache", "5-min TTL", "1-hour TTL"],
		yTitle: "Cost per request (no cache = 1)",
		xTitle: "Hit rate",
		aria: "Line chart of the input cost per request against the hit rate, relative to no cache. No cache stays flat at 1. The 5-minute TTL starts at 1.25 at a 0% hit rate, crosses 1 at 22%, and reaches 0.1 at 100%. The 1-hour TTL starts at 2, crosses 1 at 53%, and reaches 0.1 at 100%.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function BreakEvenDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const line = { strokeWidth: 2, strokeLinecap: "round", fill: "none" } as const;
	const ring = { r: 4.5, stroke: "var(--background)", strokeWidth: 2 } as const;
	const legendX = [44, 130, 212];
	const legendClass = ["", "be-5m", "be-1h"];
	return (
		<svg viewBox="0 0 400 268" role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{STYLE}</style>

			{/* 범례 */}
			{L.legend.map((name, i) => (
				<g key={name}>
					<line
						x1={legendX[i]}
						x2={legendX[i] + 16}
						y1={14}
						y2={14}
						className={legendClass[i]}
						stroke={i === 0 ? "rgb(var(--gray))" : undefined}
						{...line}
					/>
					<text x={legendX[i] + 22} y={18} fontSize="12" fill="var(--foreground)">
						{name}
					</text>
				</g>
			))}
			<text x={X0} y={38} fontSize="11.5" fill={muted}>
				{L.yTitle}
			</text>

			{/* 눈금선과 세로축 눈금 */}
			{[0, 0.5, 1, 1.5, 2].map((v) => (
				<g key={v}>
					<line x1={X0} x2={X1} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
					<text x={X0 - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill={muted}>
						{v.toFixed(1)}
					</text>
				</g>
			))}

			{/* 본전 지점에서 가로축으로 내린 안내선 */}
			{[EVEN_5M, EVEN_1H].map((h) => (
				<line key={h} x1={x(h)} x2={x(h)} y1={y(1)} y2={Y_BASE} stroke={muted} strokeOpacity="0.5" strokeWidth="1" />
			))}

			{/* 세 선 */}
			<line x1={x(0)} x2={x(1)} y1={y(1)} y2={y(1)} stroke="rgb(var(--gray))" {...line} />
			<line x1={x(0)} x2={x(1)} y1={y(cost5m(0))} y2={y(cost5m(1))} className="be-5m" {...line} />
			<line x1={x(0)} x2={x(1)} y1={y(cost1h(0))} y2={y(cost1h(1))} className="be-1h" {...line} />
			<circle cx={x(EVEN_5M)} cy={y(1)} className="be-5m-dot" {...ring} />
			<circle cx={x(EVEN_1H)} cy={y(1)} className="be-1h-dot" {...ring} />

			{/* 선 이름 */}
			<text x={130} y={84} fontSize="12" fill={muted}>
				{L.legend[2]}
			</text>
			<text x={250} y={208} fontSize="12" fill={muted}>
				{L.legend[1]}
			</text>
			<text x={X1} y={y(1) - 8} fontSize="12" textAnchor="end" fill={muted}>
				{L.legend[0]}
			</text>

			{/* 가로축 눈금: 양 끝과 본전 지점 */}
			<text x={x(0)} y={Y_BASE + 16} fontSize="11" textAnchor="middle" fill={muted}>
				0%
			</text>
			<text x={x(1)} y={Y_BASE + 16} fontSize="11" textAnchor="middle" fill={muted}>
				100%
			</text>
			{[EVEN_5M, EVEN_1H].map((h) => (
				<text key={h} x={x(h)} y={Y_BASE + 16} fontSize="11.5" fontWeight="600" textAnchor="middle" fill="var(--foreground)">
					{`${Math.round(h * 100)}%`}
				</text>
			))}
			<text x={(X0 + X1) / 2} y={Y_BASE + 38} fontSize="11.5" textAnchor="middle" fill={muted}>
				{L.xTitle}
			</text>
		</svg>
	);
}

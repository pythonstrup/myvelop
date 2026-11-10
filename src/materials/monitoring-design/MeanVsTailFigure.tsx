import { FIG_STYLE, Pill, VLine } from "./figure";

// 요청 1%가 5초 걸릴 때 평균은 조금 움직이고 꼬리 백분위는 크게 뛰는 것을 단계별로 보여 주는 정적 그림.
// 책의 예(평균 100ms, 1%는 5초)에 맞춰 나머지 99%는 50ms 근처로 둔다. 0.99 × 50 + 0.01 × 5000 ≈ 100.
const W = 720;
const H = 206;
const X0 = 20;
const X1 = W - 20;
const TOP = 88;
const BASE = 178;
const BULK_MS = 50;
const TAIL_MS = 5000;
const TAIL_SHARE = 0.01;
const BINS = 72;
const LOG_MIN = 1; // 10ms
const LOG_MAX = 4; // 10s
const TICKS = ["10ms", "100ms", "1s", "10s"];

const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
const binCenter = (i: number) => LOG_MIN + ((i + 0.5) / BINS) * (LOG_MAX - LOG_MIN);
const xOf = (ms: number) => X0 + ((Math.log10(ms) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (X1 - X0);

// 구간마다 요청 비율. 가로축은 로그 눈금이다.
function bins(tailShare: number) {
	const bulk = Array.from({ length: BINS }, (_, i) => gauss(binCenter(i), Math.log10(BULK_MS), 0.11));
	const tail = Array.from({ length: BINS }, (_, i) => gauss(binCenter(i), Math.log10(TAIL_MS), 0.03));
	const bulkSum = bulk.reduce((a, b) => a + b, 0);
	const tailSum = tail.reduce((a, b) => a + b, 0);
	return bulk.map((b, i) => ((1 - tailShare) * b) / bulkSum + (tailShare * tail[i]) / tailSum);
}
const PEAK = Math.max(...bins(0));

const ARIA = {
	1: "가로축이 10ms부터 10초까지인 지연 분포 그래프. 요청 대부분이 50ms 근처에 몰려 있고, p50과 평균이 모두 50ms다.",
	2: "같은 그래프에서 5초 자리에 요청 1%를 뜻하는 작은 빨간 막대가 생겼다. p50은 50ms 그대로이고 평균은 100ms로 옮겨 갔다.",
	3: "같은 그래프에 p99.9 표시가 더해졌다. p50은 50ms, 평균은 100ms인데 p99.9는 5초다.",
} as const;
type Step = keyof typeof ARIA;

export default function MeanVsTailFigure({ step }: { step: Step }) {
	const share = step === 1 ? 0 : TAIL_SHARE;
	const data = bins(share);
	const bw = (X1 - X0) / BINS;
	const meanMs = (1 - share) * BULK_MS + share * TAIL_MS;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA[step]} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 막대. 1%는 너무 낮아 보이지 않으므로 최소 높이를 준다. */}
			{data.map((d, i) => {
				const isTail = binCenter(i) > 3;
				const h = isTail && d > 1e-4 ? Math.max((d / PEAK) * (BASE - TOP), 10) : (d / PEAK) * (BASE - TOP);
				if (h < 0.5) return null;
				return <rect key={i} x={X0 + i * bw + 0.5} y={BASE - h} width={Math.max(1, bw - 1)} height={h} className={isTail ? "fg-red-ink" : "fg-blue-ink"} opacity={isTail ? 0.85 : 0.6} />;
			})}

			{/* 가로축 */}
			<line x1={X0} y1={BASE + 0.5} x2={X1} y2={BASE + 0.5} className="fg-axis" />
			{TICKS.map((label, i) => (
				<text key={label} x={xOf(10 ** (LOG_MIN + i))} y={BASE + 18} textAnchor={i === 0 ? "start" : i === TICKS.length - 1 ? "end" : "middle"} className="fg-sub" fontSize={12}>
					{label}
				</text>
			))}

			{/* p50, 평균, p99.9 */}
			<VLine x={xOf(BULK_MS)} y1={43} y2={BASE} tone="blue" />
			<VLine x={xOf(meanMs)} y1={71} y2={BASE} tone="amber" />
			{step === 3 && <VLine x={xOf(TAIL_MS)} y1={43} y2={BASE} tone="red" />}
			<Pill cx={xOf(BULK_MS)} cy={30} label={`p50 ${BULK_MS}ms`} tone="blue" maxX={W} />
			<Pill cx={xOf(meanMs)} cy={58} label={`평균 ${Math.round(meanMs)}ms`} tone="amber" maxX={W} />
			{step === 3 && <Pill cx={xOf(TAIL_MS)} cy={30} label="p99.9 5s" tone="red" maxX={W} />}
			{step >= 2 && <Pill cx={xOf(TAIL_MS)} cy={BASE - 30} label="1%" tone="red" maxX={W} />}
		</svg>
	);
}

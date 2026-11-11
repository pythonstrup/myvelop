import { FIG_STYLE, Pill, VLine } from "./figure";

// Prometheus 문서의 예를 단계별로 보여 주는 정적 그림. 요청은 220ms 근처에 몰려 있는데 구간이 200~300ms로 넓으면
// histogram_quantile은 p95를 295ms로 추정한다. 250ms 경계를 더하면 247.5ms, 300ms 안에 끝난 비율은 바로 센다.
const W = 720;
const H = 250;
const X0 = 24;
const X1 = W - 48;
const TOP = 112;
const BASE = 216;
const MAX_MS = 500;
const ACTUAL_MS = 220;
const TARGET_MS = 300;
const BOUNDS = [100, 200, 300, 450];
const xOf = (ms: number) => X0 + (ms / MAX_MS) * (X1 - X0);
const fmt = (v: number) => v.toFixed(1).replace(/\.0$/, "");

// 220ms 근처에 흩어진 요청. 매번 같은 모양이 나오도록 고정한 값이다.
const SAMPLES = Array.from({ length: 32 }, (_, i) => ACTUAL_MS + Math.sin(i * 12.9898) * 5 + Math.cos(i * 4.1414) * 1.5);
// 3ms 칸마다 쌓은 점 위치
const DOTS = (() => {
	const stacks = new Map<number, number>();
	return SAMPLES.map((ms) => {
		const col = Math.round(ms / 3);
		const k = stacks.get(col) ?? 0;
		stacks.set(col, k + 1);
		return { x: xOf(col * 3), y: BASE - 5 - k * 8 };
	});
})();

const ARIA = {
	1: "가로축이 0부터 500ms까지인 지연 그래프. 요청을 뜻하는 점이 거의 다 220ms 근처에 쌓여 있고, 실제 p95는 약 220ms, 목표는 300ms다.",
	2: "구간 경계 100, 200, 300, 450ms가 점선으로 그어지고, 점들은 200~300ms 구간 하나를 채운 막대로 바뀌었다.",
	3: "200~300ms 구간 막대 위에 추정 p95가 295ms로 표시되어 목표 300ms에 거의 닿아 있다. 실제 p95는 약 220ms다.",
	4: "250ms에 경계가 더해져 막대가 200~250ms 구간으로 좁아지고, 추정 p95가 247.5ms로 내려왔다.",
	5: "0부터 300ms까지가 초록으로 칠해지고 300ms 안에 끝난 비율이 100%라고 적혀 있다.",
} as const;
type Step = keyof typeof ARIA;

export default function QuantileEstimateFigure({ step }: { step: Step }) {
	const bucketed = step >= 2;
	const finer = step >= 4;
	const estimate = finer ? 247.5 : 295;
	const ticks = bucketed ? [...BOUNDS, ...(finer ? [250] : [])] : [0, 100, 200, 300, 400, 500];
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA[step]} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 300ms 안쪽 */}
			{step === 5 && <rect x={X0} y={TOP} width={xOf(TARGET_MS) - X0} height={BASE - TOP} className="fg-green-fill" />}

			{/* 구간 경계 */}
			{bucketed && [...BOUNDS, ...(finer ? [250] : [])].map((b) => <line key={b} x1={xOf(b)} y1={TOP - 6} x2={xOf(b)} y2={BASE} className="fg-sub-line" strokeWidth={1} strokeDasharray="4 3" opacity={0.8} />)}

			{/* 점(실제 요청) 또는 막대(구간의 요청 수) */}
			{bucketed ? (
				<rect x={xOf(200) + 1} y={BASE - 70} width={xOf(finer ? 250 : 300) - xOf(200) - 2} height={70} className="fg-blue-ink" opacity={0.7} />
			) : (
				DOTS.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={3} className="fg-blue-ink" />)
			)}

			{/* 가로축과 눈금 */}
			<line x1={X0} y1={BASE + 0.5} x2={X1} y2={BASE + 0.5} className="fg-axis" />
			{ticks.map((v) => (
				<text key={v} x={xOf(v)} y={BASE + 18} textAnchor="middle" className="fg-sub" fontSize={12}>
					{v}
				</text>
			))}
			<text x={X1 + 18} y={BASE + 18} className="fg-sub" fontSize={12}>
				ms
			</text>

			{/* 목표, 실제, 추정 */}
			<VLine x={xOf(TARGET_MS)} y1={39} y2={BASE} tone="red" />
			<VLine x={xOf(ACTUAL_MS)} y1={99} y2={BASE} tone="blue" />
			{step >= 3 && <VLine x={xOf(estimate)} y1={69} y2={BASE} tone="amber" />}
			<Pill cx={xOf(TARGET_MS)} cy={26} label={`목표 ${TARGET_MS}ms`} tone="red" maxX={W} />
			{step >= 3 && <Pill cx={xOf(estimate)} cy={56} label={`추정 p95 ${fmt(estimate)}ms`} tone="amber" maxX={W} />}
			<Pill cx={xOf(ACTUAL_MS)} cy={86} label={`실제 p95 약 ${ACTUAL_MS}ms`} tone="blue" maxX={W} />
			{step === 5 && <Pill cx={(X0 + xOf(TARGET_MS)) / 2} cy={TOP + 18} label="300ms 안: 100%" tone="green" maxX={W} />}
		</svg>
	);
}

import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// 하루에 한 번 오르내리는 사업 지표에 고정 기준과 예상 범위를 그었을 때를 비교하는 정적 그림.
// 값은 모양을 보이려고 지어낸 것이다. 18시 무렵 가장 높고 6시 무렵 가장 낮으며, 둘째 날 저녁에 장애로 떨어진다.
const W = 720;
const H = 250;
const X0 = 24;
const X1 = 696;
const TOP = 46;
const BASE = 206;
const HOURS = 48;
const STATIC_FLOOR = 0.3;
const BAND = 0.1;
const INCIDENT = { from: 40, to: 44 }; // 둘째 날 16시 ~ 20시

const usual = (h: number) => 0.5 - 0.35 * Math.cos((2 * Math.PI * (h - 6)) / 24);
const actual = (h: number) => (h > INCIDENT.from && h < INCIDENT.to ? usual(h) * 0.55 : usual(h));
const xOf = (h: number) => X0 + (h / HOURS) * (X1 - X0);
const yOf = (v: number) => BASE - v * (BASE - TOP);
const STEPS = Array.from({ length: HOURS * 4 + 1 }, (_, i) => i / 4);
const line = (f: (h: number) => number, hs: readonly number[] = STEPS) => hs.map((h) => `${xOf(h).toFixed(1)},${yOf(f(h)).toFixed(1)}`).join(" ");

// 조건을 만족하는 시간 구간들
function ranges(test: (h: number) => boolean) {
	const out: number[][] = [];
	for (const h of STEPS) {
		if (!test(h)) continue;
		const last = out[out.length - 1];
		if (last && last[last.length - 1] === h - 0.25) last.push(h);
		else out.push([h]);
	}
	return out;
}

const ARIA = {
	static: "이틀 동안 하루에 한 번 오르내리는 지표에 고정 기준선을 그은 그림. 매일 새벽 정상적으로 내려간 값이 기준선 아래로 내려가 잘못된 경보가 두 번 나고, 둘째 날 저녁 장애로 떨어진 값은 기준선 위에 있어 놓친다.",
	expected: "같은 지표에 지난주 같은 시각의 값을 가운데 둔 예상 범위를 그은 그림. 새벽의 낮은 값은 범위 안에 있어 경보가 나지 않고, 둘째 날 저녁 장애로 떨어진 값만 범위를 벗어나 경보가 난다.",
} as const;
type Mode = keyof typeof ARIA;

export default function ThresholdFigure({ mode }: { mode: Mode }) {
	const alarms = mode === "static" ? ranges((h) => actual(h) < STATIC_FLOOR) : ranges((h) => Math.abs(actual(h) - usual(h)) > BAND);
	const missed = mode === "static" ? ranges((h) => h > INCIDENT.from && h < INCIDENT.to && actual(h) >= STATIC_FLOOR) : [];
	const band = `${line((h) => usual(h) + BAND)} ${line((h) => usual(h) - BAND, [...STEPS].reverse())}`;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA[mode]} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 기준 */}
			{mode === "static" ? (
				<line x1={X0} y1={yOf(STATIC_FLOOR)} x2={X1} y2={yOf(STATIC_FLOOR)} className="fg-red" strokeWidth={1.5} strokeDasharray="6 4" />
			) : (
				<>
					<polygon points={band} className="fg-blue-fill" opacity={0.9} />
					<polyline points={line(usual)} fill="none" className="fg-gray" strokeWidth={1.5} strokeDasharray="6 4" />
				</>
			)}

			{/* 실제 값. 경보가 난 구간과 놓친 구간은 굵게 덧칠한다. */}
			<polyline points={line(actual)} fill="none" className="fg-blue" strokeWidth={2.5} strokeLinejoin="round" />
			{alarms.map((r) => (
				<polyline key={`a${r[0]}`} points={line(actual, r)} fill="none" className="fg-red" strokeWidth={5} strokeLinecap="round" />
			))}
			{missed.map((r) => (
				<polyline key={`m${r[0]}`} points={line(actual, r)} fill="none" className="fg-amber" strokeWidth={5} strokeLinecap="round" />
			))}

			{/* 가로축 */}
			<line x1={X0} y1={BASE + 0.5} x2={X1} y2={BASE + 0.5} className="fg-axis" />
			{[0, 6, 12, 18, 24, 30, 36, 42, 48].map((h) => (
				<text key={h} x={xOf(h)} y={BASE + 18} textAnchor={h === 0 ? "start" : h === HOURS ? "end" : "middle"} className="fg-sub" fontSize={12}>
					{`${h % 24}시`}
				</text>
			))}

			{/* 이름표 */}
			{mode === "static" ? (
				<>
					<Pill cx={xOf(17)} cy={yOf(STATIC_FLOOR) - 16} label="고정 기준" tone="red" maxX={W} />
					<Pill cx={xOf(6)} cy={yOf(STATIC_FLOOR) - 16} label="잘못된 경보" tone="red" maxX={W} />
					<Pill cx={xOf(30)} cy={yOf(STATIC_FLOOR) - 16} label="잘못된 경보" tone="red" maxX={W} />
					<Pill cx={xOf(42)} cy={60} label="놓친 장애" tone="amber" maxX={W} />
				</>
			) : (
				<>
					<Pill cx={xOf(6)} cy={78} label="지난주 같은 시각 ± 범위" tone="blue" maxX={W} />
					<Pill cx={xOf(42)} cy={yOf(actual(42)) + 30} label="경보" tone="red" maxX={W} />
				</>
			)}
		</svg>
	);
}

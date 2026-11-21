import { SVG_STYLE } from "./colors";

// 한 번에 묻는 방식 10번의 API 시간과 Jev 5번의 응답 시간을 점으로 찍는다. 정적 SVG로 SSR에서만 렌더링한다.
// Haiku는 생각할지를 요청마다 스스로 정해서, 같은 effort low 설정이 2~3초 무리와 11초 가까운 무리로 갈린다.
const JEV = [0.235, 0.176, 0.191, 0.188, 0.177];
const DEFAULT_THINK = [13.7, 10.8, 12.2, 12.7, 11.4]; // 기본 설정, 다섯 번 모두 생각했다
const LOW_THINK = [10.6, 10.9]; // effort low, 생각했다
const LOW_NO_THINK = [3.4, 2.9, 2.3]; // effort low, 생각하지 않았다

const AXIS_MAX = 14;
const TICKS = [0, 2, 4, 6, 8, 10, 12, 14];
const X0 = 116;
const X1 = 386;
const Y_JEV = 62;
const Y_DEFAULT = 100;
const Y_LOW = 140;
const Y_AXIS = 176;
const R = 4.5;
const x = (s: number) => X0 + ((X1 - X0) * s) / AXIS_MAX;
// 10.6초와 10.9초는 점이 겹쳐서 위아래로 조금 벌려 찍는다.
const LOW_THINK_DY = [-3.5, 3.5];

const LABELS = {
	ko: {
		rows: ["Jev", "Haiku · 기본", "Haiku · effort low"],
		legend: ["Jev", "생각 함", "생각 안 함"],
		sec: (s: number) => `${s}초`,
		jevRange: "5번 모두 0.18~0.24초",
		defaultRange: "10.8~13.7초",
		lowNoThink: "2.3~3.4초",
		lowThink: "10.6~10.9초",
		split: "같은 설정이 두 무리로 갈렸다",
		aria: "한 번에 묻는 방식 10번의 API 시간과 Jev 5번의 응답 시간을 점으로 찍은 그림. Jev는 다섯 번 모두 0.18초에서 0.24초였다. Haiku 기본 설정은 다섯 번 모두 생각했고 10.8초에서 13.7초가 걸렸다. effort를 low로 내린 다섯 번은 생각하지 않은 세 번이 2.3초에서 3.4초, 생각한 두 번이 10.6초와 10.9초로 두 무리로 갈렸다.",
	},
	en: {
		rows: ["Jev", "Haiku · default", "Haiku · effort low"],
		legend: ["Jev", "Thought", "No thinking"],
		sec: (s: number) => `${s} s`,
		jevRange: "All 5 runs 0.18–0.24 s",
		defaultRange: "10.8–13.7 s",
		lowNoThink: "2.3–3.4 s",
		lowThink: "10.6–10.9 s",
		split: "Same setting, two clusters",
		aria: "Dot plot of the API time for the 10 all-at-once runs and the response time for 5 Jev runs. Jev took 0.18 to 0.24 s in all five. Haiku at the default setting thought in all five and took 10.8 to 13.7 s. With effort lowered to low, the five runs split into two clusters: three without thinking at 2.3 to 3.4 s, and two with thinking at 10.6 and 10.9 s.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function ThinkingSpreadDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const fg = "var(--foreground)";
	const think = (s: number, cy: number) => <circle key={`${s}-${cy}`} cx={x(s)} cy={cy} r={R} className="jv-amber" />;
	const noThink = (s: number) => (
		<circle key={s} cx={x(s)} cy={Y_LOW} r={R} className="jv-amber-line" fill="var(--background)" strokeWidth="1.8" />
	);
	return (
		<svg viewBox="0 0 400 200" role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>

			{/* 범례 */}
			<circle cx={14} cy={16} r={R} className="jv-blue" />
			<text x={24} y={20} fontSize="12" fill={fg}>
				{L.legend[0]}
			</text>
			<circle cx={74} cy={16} r={R} className="jv-amber" />
			<text x={84} y={20} fontSize="12" fill={fg}>
				{L.legend[1]}
			</text>
			<circle cx={154} cy={16} r={R} className="jv-amber-line" fill="var(--background)" strokeWidth="1.8" />
			<text x={164} y={20} fontSize="12" fill={fg}>
				{L.legend[2]}
			</text>

			{/* 줄 이름과 줄 안내선 */}
			{[Y_JEV, Y_DEFAULT, Y_LOW].map((cy, i) => (
				<g key={cy}>
					<text x={8} y={cy + 4} fontSize="11.5" fontWeight={i === 0 ? 700 : 500} fill={fg}>
						{L.rows[i]}
					</text>
					<line x1={X0} x2={X1} y1={cy} y2={cy} stroke="var(--border)" strokeWidth="1" />
				</g>
			))}

			{/* Jev 다섯 점은 거의 한 자리에 겹친다 */}
			{JEV.map((s) => (
				<circle key={s} cx={x(s)} cy={Y_JEV} r={R} className="jv-blue" fillOpacity="0.55" />
			))}
			<text x={x(0.2) + 10} y={Y_JEV - 8} fontSize="11" fill={muted}>
				{L.jevRange}
			</text>

			{DEFAULT_THINK.map((s) => think(s, Y_DEFAULT))}
			<text x={x(12.25)} y={Y_DEFAULT - 10} fontSize="11" textAnchor="middle" fill={muted}>
				{L.defaultRange}
			</text>

			{LOW_NO_THINK.map(noThink)}
			{LOW_THINK.map((s, i) => think(s, Y_LOW + LOW_THINK_DY[i]))}
			<text x={x(2.85)} y={Y_LOW - 10} fontSize="11" textAnchor="middle" fill={muted}>
				{L.lowNoThink}
			</text>
			<text x={x(10.75)} y={Y_LOW - 11} fontSize="11" textAnchor="middle" fill={muted}>
				{L.lowThink}
			</text>
			<line x1={x(3.4) + 9} x2={x(10.6) - 9} y1={Y_LOW} y2={Y_LOW} stroke={muted} strokeDasharray="3 3" strokeWidth="1" />
			<text x={x(7)} y={Y_LOW + 18} fontSize="11" fontWeight="600" textAnchor="middle" fill={fg}>
				{L.split}
			</text>

			{/* 가로축 */}
			<line x1={X0} x2={X1} y1={Y_AXIS} y2={Y_AXIS} stroke={muted} strokeWidth="1" />
			{TICKS.map((s) => (
				<g key={s}>
					<line x1={x(s)} x2={x(s)} y1={Y_AXIS} y2={Y_AXIS + 4} stroke={muted} strokeWidth="1" />
					<text x={x(s)} y={Y_AXIS + 17} fontSize="11" textAnchor="middle" fill={muted}>
						{s === AXIS_MAX ? L.sec(s) : s}
					</text>
				</g>
			))}
		</svg>
	);
}

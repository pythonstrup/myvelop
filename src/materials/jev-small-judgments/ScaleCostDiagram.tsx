import { SVG_STYLE } from "./colors";

// 이력서 3만 장에 같은 판단 20개를 할 때의 비용을 가로 막대로 비교한다. 정적 SVG로 SSR에서만 렌더링한다.
// 값은 이력서 한 장 비용(정가)에 3만을 곱해 반올림한 것이다.
const ROWS = [
	{ usd: 3.5, jev: true },
	{ usd: 21, jev: false },
	{ usd: 50, jev: false },
	{ usd: 218, jev: false },
];
const MAX_USD = 218;
const X0 = 132;
const X1 = 326;
const Y_FIRST = 44;
const ROW_PITCH = 30;
const BAR_H = 14;
const MIN_BAR = 2; // Jev 막대도 보이도록 남기는 최소 폭
const w = (usd: number) => Math.max(MIN_BAR, ((X1 - X0) * usd) / MAX_USD);

const LABELS = {
	ko: {
		title: "이력서 3만 장에 같은 판단 20개를 할 때의 비용",
		rows: ["Jev", "Haiku 생각 안 함", "Haiku 생각 함", "Haiku 문항마다 따로"],
		value: (usd: number) => `약 $${usd}`,
		aria: "이력서 3만 장에 같은 판단 20개를 할 때의 비용을 비교한 가로 막대 그래프. Jev는 약 3.5달러, 생각하지 않는 Haiku는 약 21달러, 생각하는 Haiku는 약 50달러, 문항마다 따로 묻는 Haiku는 약 218달러다.",
	},
	en: {
		title: "Cost of the same 20 judgments on 30,000 resumes",
		rows: ["Jev", "Haiku, no thinking", "Haiku, thinking", "Haiku, per question"],
		value: (usd: number) => `about $${usd}`,
		aria: "Horizontal bar chart of the cost of the same 20 judgments on 30,000 resumes. Jev costs about $3.5, Haiku without thinking about $21, Haiku with thinking about $50, and Haiku asked one question per call about $218.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function ScaleCostDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const fg = "var(--foreground)";
	return (
		<svg viewBox="0 0 400 150" role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<text x={8} y={18} fontSize="12" fontWeight="700" fill={fg}>
				{L.title}
			</text>
			{ROWS.map((r, i) => {
				const cy = Y_FIRST + i * ROW_PITCH;
				return (
					<g key={r.usd}>
						<text x={8} y={cy + 4} fontSize="11.5" fontWeight={r.jev ? 700 : 500} fill={fg}>
							{L.rows[i]}
						</text>
						<rect x={X0} y={cy - BAR_H / 2} width={X1 - X0} height={BAR_H} rx={4} className="jv-box" />
						<rect x={X0} y={cy - BAR_H / 2} width={w(r.usd)} height={BAR_H} rx={r.jev ? 1 : 4} className={r.jev ? "jv-blue" : "jv-amber"} />
						<text x={X0 + w(r.usd) + 6} y={cy + 4} fontSize="11.5" fontWeight="600" fill={fg}>
							{L.value(r.usd)}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

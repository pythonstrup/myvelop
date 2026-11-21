import { SVG_STYLE } from "./colors";

// 이력서 한 장에 판단 20개를 물을 때의 비용을 입력·생각 출력·답 출력으로 쌓은 가로 막대. 정적 SVG로 SSR에서만 렌더링한다.
// 정가 기준: Jev 입력 $0.042/1M, Haiku 5.5 입력 $0.10/1M·출력 $0.50/1M. 생각 함은 비용 중앙값 실행(출력 2,379 = 생각 1,939 + 답 440)이다.
const ROWS = [
	{ key: "jev", input: 0.000116, thinking: 0, answer: 0, total: "$0.000116" },
	{ key: "off", input: 0.000458, thinking: 0, answer: 0.000246, total: "$0.00070" },
	{ key: "on", input: 0.000458, thinking: 0.00097, answer: 0.00022, total: "$0.00165" },
] as const;
const MAX = 0.00165;

const W = 400;
const X0 = 8;
const BAR_W = 300; // MAX가 차지하는 막대 길이
const BAR_H = 18;
const TOP = 52;
const ROW_H = 64;
const HEIGHT = TOP + ROWS.length * ROW_H + 8;
const x = (usd: number) => (BAR_W * usd) / MAX;

const LABELS = {
	ko: {
		title: "이력서 한 장에 판단 20개를 물을 때의 비용",
		legend: ["입력", "생각 출력", "답 출력"],
		legendX: [8, 62, 146],
		rows: ["Jev", "Haiku 5.5, 생각 안 함", "Haiku 5.5, 생각 함"],
		tokens: ["입력 2,768토큰, 출력 없음", "입력 4,584토큰, 답 492토큰", "입력 4,584토큰, 생각 1,939토큰, 답 440토큰"],
		aria: "이력서 한 장에 판단 20개를 물을 때의 정가 비용을 입력, 생각 출력, 답 출력으로 나눠 쌓은 막대그래프. Jev는 입력 2,768토큰에 $0.000116이고 출력 비용이 없다. 생각하지 않는 Haiku 5.5는 입력 $0.000458에 답 출력 492토큰 $0.000246이 붙어 $0.00070이다. 생각하는 Haiku 5.5는 입력 $0.000458에 생각 출력 1,939토큰과 답 출력 440토큰이 붙어 $0.00165다. 두 Haiku의 입력 비용은 같고, 차이는 출력에서 난다.",
	},
	en: {
		title: "Cost of 20 judgments on one resume",
		legend: ["Input", "Thinking output", "Answer output"],
		legendX: [8, 72, 186],
		rows: ["Jev", "Haiku 5.5, no thinking", "Haiku 5.5, thinking"],
		tokens: ["2,768 input tokens, no output", "4,584 input, 492 answer tokens", "4,584 input, 1,939 thinking, 440 answer tokens"],
		aria: "Stacked bar chart of the list-price cost of 20 judgments on one resume, split into input, thinking output, and answer output. Jev costs $0.000116 for 2,768 input tokens and nothing for output. Haiku 5.5 without thinking costs $0.000458 for input plus $0.000246 for 492 answer tokens, $0.00070 in all. Haiku 5.5 with thinking costs $0.000458 for input plus 1,939 thinking tokens and 440 answer tokens, $0.00165 in all. Both Haiku runs pay the same for input; the difference comes from output.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function CostBreakdownDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const inputFill = { fill: "rgb(var(--gray))", fillOpacity: 0.45 } as const;
	const swatch = (i: number) =>
		i === 0 ? { ...inputFill } : i === 1 ? { className: "jv-amber-soft jv-amber-line", strokeWidth: 1.2 } : { className: "jv-amber" };
	return (
		<svg viewBox={`0 0 ${W} ${HEIGHT}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<text x={X0} y={16} fontSize="13" fontWeight="700" fill="var(--foreground)">
				{L.title}
			</text>
			{L.legend.map((name, i) => (
				<g key={name}>
					<rect x={L.legendX[i]} y={27} width={11} height={11} rx={2} {...swatch(i)} />
					<text x={L.legendX[i] + 16} y={37} fontSize="11.5" fill={muted}>
						{name}
					</text>
				</g>
			))}

			{ROWS.map((row, i) => {
				const y = TOP + i * ROW_H;
				const barY = y + 10;
				const inW = x(row.input);
				const thW = x(row.thinking);
				const anW = x(row.answer);
				const end = X0 + inW + thW + anW;
				return (
					<g key={row.key}>
						<text x={X0} y={y + 4} fontSize="12.5" fontWeight="600" fill="var(--foreground)" className={row.key === "jev" ? "jv-blue" : undefined}>
							{L.rows[i]}
						</text>
						<rect x={X0} y={barY} width={BAR_W} height={BAR_H} rx={3} className="jv-box" />
						<rect x={X0} y={barY} width={inW} height={BAR_H} {...inputFill} />
						{thW > 0 && <rect x={X0 + inW} y={barY} width={thW} height={BAR_H} className="jv-amber-soft jv-amber-line" strokeWidth={1.2} />}
						{anW > 0 && <rect x={X0 + inW + thW} y={barY} width={anW} height={BAR_H} className="jv-amber" />}
						<text x={end + 6} y={barY + 13} fontSize="12" fontWeight="700" fill="var(--foreground)">
							{row.total}
						</text>
						<text x={X0} y={barY + BAR_H + 16} fontSize="11" fill={muted}>
							{L.tokens[i]}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

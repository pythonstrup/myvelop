import { BGE_M3, BGE_M3_LONG_SYSTEM, BGE_M3_SHORT_SYSTEM, E5_SMALL, GROUPS, MINILM, type Sims } from "./data";
import { MARK_STYLE, Mark } from "./marks";

// 같은 질문 14쌍의 유사도를 조건마다 한 묶음씩 찍어 견주는 정적 그림.
// models는 임베딩 모델을 바꿨을 때, system은 앞에 붙인 시스템 프롬프트 길이를 바꿨을 때다.
const X0 = 16;
const X1 = 350;
const LANE = 17; // 무리 한 줄의 높이
const BLOCK = 92; // 조건 한 묶음의 높이
const TOP = 34;

const VARIANTS: Record<"models" | "system", { min: number; ticks: number[]; threshold: number; rows: { name: string; sims: Sims }[]; aria: string }> = {
	models: {
		min: 0.2,
		ticks: [0.2, 0.4, 0.6, 0.8, 1],
		threshold: 0.8,
		rows: [
			{ name: "paraphrase-multilingual-MiniLM-L12-v2", sims: MINILM },
			{ name: "multilingual-e5-small", sims: E5_SMALL },
			{ name: "bge-m3", sims: BGE_M3 },
		],
		aria: "같은 질문 14쌍의 유사도를 임베딩 모델 셋으로 잰 점 그래프. MiniLM은 뜻이 같은 질문이 0.466에서 0.890, 답이 다른 질문이 0.900에서 0.991, 상관없는 질문이 0.244와 0.375다. e5-small은 각각 0.835에서 0.972, 0.935에서 0.994, 0.799와 0.810이다. bge-m3는 각각 0.699에서 0.959, 0.822에서 0.970, 0.479와 0.560이다. 문턱값 0.8 선을 그으면 MiniLM에서는 뜻이 같은 질문 2쌍만, e5-small에서는 상관없는 질문 1쌍까지 선을 넘는다.",
	},
	system: {
		min: 0.45,
		ticks: [0.5, 0.6, 0.7, 0.8, 0.9, 1],
		threshold: 0.95,
		rows: [
			{ name: "질문만", sims: BGE_M3 },
			{ name: "시스템 프롬프트 37토큰 + 질문", sims: BGE_M3_SHORT_SYSTEM },
			{ name: "시스템 프롬프트 261토큰 + 질문", sims: BGE_M3_LONG_SYSTEM },
		],
		aria: "같은 질문 14쌍의 유사도를 bge-m3로 재되, 앞에 붙인 시스템 프롬프트 길이를 바꾼 점 그래프. 질문만 넣으면 상관없는 질문이 0.479와 0.560에 있다. 37토큰 시스템 프롬프트를 붙이면 0.781과 0.816으로 오르고, 261토큰을 붙이면 0.974와 0.976까지 올라 14쌍이 모두 문턱값 0.95를 넘는다.",
	},
};

export default function SimilarityRowsDiagram({ variant }: { variant: keyof typeof VARIANTS }) {
	const { min, ticks, threshold, rows, aria } = VARIANTS[variant];
	const x = (v: number) => X0 + ((X1 - X0) * (v - min)) / (1 - min);
	const axisY = TOP + BLOCK * rows.length;
	return (
		<svg viewBox={`0 0 400 ${axisY + 34}`} role="img" aria-label={aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{MARK_STYLE}</style>

			{/* 범례 */}
			{GROUPS.map(({ key, name }, i) => (
				<g key={key}>
					<Mark group={key} x={X0 + 5 + i * 118} y={12} />
					<text x={X0 + 15 + i * 118} y={16} fontSize="12" fill="var(--foreground)">
						{name}
					</text>
				</g>
			))}

			<text x="394" y={30} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
				넘은 쌍
			</text>

			{/* 문턱값 선 */}
			<line x1={x(threshold)} x2={x(threshold)} y1={TOP} y2={axisY} stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="5 4" />

			{rows.map((row, r) => {
				const top = TOP + BLOCK * r;
				return (
					<g key={row.name}>
						<text x={X0} y={top + 17} fontSize="12" fontWeight="600" fill="var(--foreground)" stroke="var(--background)" strokeWidth="4" style={{ paintOrder: "stroke" }}>
							{row.name}
						</text>
						{GROUPS.map(({ key }, g) => {
							const y = top + 35 + g * LANE;
							return (
								<g key={key}>
									<line x1={X0} x2={X1} y1={y} y2={y} stroke="var(--border)" />
									<text x="394" y={y + 4} textAnchor="end" fontSize="11.5" fontWeight="600" fill="var(--foreground)">
										{`${row.sims[key].filter((v) => v >= threshold).length}/${row.sims[key].length}`}
									</text>
									{row.sims[key].map((v, i, all) => {
										// 값이 같은 점은 조금 위로 올려 둘 다 보이게 한다
										const n = all.slice(0, i).filter((u) => u === v).length;
										return <Mark key={i} group={key} x={x(v)} y={y - n * 7} filled={v >= threshold} />;
									})}
								</g>
							);
						})}
					</g>
				);
			})}

			{/* 가로축 */}
			<line x1={X0} x2={X1} y1={axisY} y2={axisY} stroke="rgb(var(--gray))" strokeOpacity="0.6" />
			{ticks.map((v) => (
				<text key={v} x={x(v)} y={axisY + 15} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
					{v.toFixed(1)}
				</text>
			))}
			<text x={x(threshold)} y={axisY + 29} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--accent)">
				{`문턱값 ${threshold}`}
			</text>
			<text x={X0} y={axisY + 29} fontSize="11" fill="var(--muted-foreground)">
				유사도
			</text>
		</svg>
	);
}

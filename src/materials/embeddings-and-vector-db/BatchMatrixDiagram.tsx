import type { Lang } from "./lang";

// 배치 안의 다른 정답을 오답으로 쓰는 B×B 점수표(B = 4). 대각선이 정답, 나머지가 오답이다. 정적 SVG.
const LABELS = {
	ko: {
		cols: "정답 문서",
		rows: "질문",
		pos: "정답",
		neg: "오답",
		note: "질문마다 오답 B − 1개 (여기서는 3개)",
		aria: "배치 크기 4의 점수표. 행은 질문 q₁부터 q₄, 열은 정답 문서 p₁부터 p₄다. 점수표 S는 Q와 P의 전치를 곱해 얻고, 칸 Sᵢⱼ는 s(qᵢ, pⱼ)다. 대각선 네 칸은 정답 점수이고 나머지 열두 칸은 오답 점수라서, 질문마다 오답 3개가 생긴다.",
	},
	en: {
		cols: "positive documents",
		rows: "queries",
		pos: "positive",
		neg: "negative",
		note: "B − 1 negatives per query (3 here)",
		aria: "Score matrix for a batch of 4. Rows are queries q₁ to q₄ and columns are positive documents p₁ to p₄. The matrix S is Q times P transposed, and cell Sᵢⱼ is s(qᵢ, pⱼ). The four diagonal cells are positive scores and the other twelve are negative scores, so every query gets 3 negatives.",
	},
} as const satisfies Record<Lang, unknown>;

const SUB = ["₁", "₂", "₃", "₄"];
const LEFT = 102;
const TOP = 58;
const CW = 64;
const CH = 44;

export default function BatchMatrixDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	return (
		<svg
			viewBox="0 0 460 282"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<text x={LEFT + 2 * CW} y="22" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
				{t.cols}
			</text>
			<text x="46" y={TOP + 2 * CH + 4} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
				{t.rows}
			</text>
			{SUB.map((s, i) => (
				<g key={s}>
					<text x={LEFT + i * CW + CW / 2} y={TOP - 10} textAnchor="middle" fontSize="13" fill="var(--muted-foreground)">
						p{s}
					</text>
					<text x={LEFT - 12} y={TOP + i * CH + CH / 2 + 4} textAnchor="end" fontSize="13" fill="var(--muted-foreground)">
						q{s}
					</text>
				</g>
			))}
			{SUB.flatMap((_, r) =>
				SUB.map((_, c) => {
					const pos = r === c;
					return (
						<g key={`${r}-${c}`}>
							<rect
								x={LEFT + c * CW + 2}
								y={TOP + r * CH + 2}
								width={CW - 4}
								height={CH - 4}
								rx="4"
								fill={pos ? "var(--accent)" : "var(--destructive)"}
								fillOpacity={pos ? 0.22 : 0.08}
								stroke={pos ? "var(--accent)" : "var(--border)"}
								strokeWidth={pos ? 1.5 : 1}
							/>
							<text
								x={LEFT + c * CW + CW / 2}
								y={TOP + r * CH + CH / 2 + 4}
								textAnchor="middle"
								fontSize="12"
								fontWeight={pos ? 700 : 400}
								fill={pos ? "var(--accent)" : "var(--muted-foreground)"}
							>
								{pos ? t.pos : t.neg}
							</text>
						</g>
					);
				}),
			)}
			<text x="230" y="266" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{t.note}
			</text>
		</svg>
	);
}

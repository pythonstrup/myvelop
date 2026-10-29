import type { Lang } from "./lang";

// 임베딩 순위와 낱말 검색 순위를 RRF(k = 60)로 합치는 그림. 순위와 점수는 글의 예와 같다. 정적 SVG.
const LABELS = {
	ko: {
		cols: ["임베딩 순위", "낱말 검색 순위", "RRF로 합친 순위"],
		noB: "B는 없다",
		note: "목록에 없는 문서는 그 목록에서 아무것도 더하지 않는다",
		aria: "순위 목록 두 개를 RRF로 합치는 그림. 임베딩 순위는 1위 A, 2위 B, 5위 C이고, 낱말 검색 순위는 1위 C, 3위 A이며 B는 없다. RRF 점수는 A가 1/61 더하기 1/63으로 약 0.0323, C가 1/65 더하기 1/61로 약 0.0318, B가 1/62로 약 0.0161이라서 합친 순위는 A, C, B다.",
	},
	en: {
		cols: ["Embedding rank", "Keyword rank", "Merged by RRF"],
		noB: "no B",
		note: "A list that lacks a document adds nothing for it",
		aria: "Two ranked lists merged with RRF. The embedding list ranks A 1st, B 2nd, and C 5th; the keyword list ranks C 1st and A 3rd and has no B. The RRF scores are about 0.0323 for A (1/61 + 1/63), 0.0318 for C (1/65 + 1/61), and 0.0161 for B (1/62), so the merged order is A, C, B.",
	},
} as const satisfies Record<Lang, unknown>;

// null 은 이름 없는 다른 문서
const LISTS: (string | null)[][] = [
	["A", "B", null, null, "C"],
	["C", null, "A"],
];
const MERGED = [
	["A", "0.0323"],
	["C", "0.0318"],
	["B", "0.0161"],
] as const;
const COL_X = [72, 218, 352];
const ROW_Y = (i: number) => 62 + i * 36;

function Chip({ cx, cy, doc }: { cx: number; cy: number; doc: string | null }) {
	return (
		<g>
			<rect
				x={cx - 26}
				y={cy - 13}
				width="52"
				height="26"
				rx="6"
				fill={doc ? "var(--accent)" : "var(--secondary)"}
				fillOpacity={doc ? 0.18 : 1}
				stroke={doc ? "var(--accent)" : "var(--border)"}
				strokeWidth="1.5"
			/>
			<text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight={doc ? 700 : 400} fill={doc ? "var(--accent)" : "rgb(var(--gray))"}>
				{doc ?? "·"}
			</text>
		</g>
	);
}

export default function RrfMergeDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	return (
		<svg
			viewBox="0 0 460 300"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			{t.cols.map((c, i) => (
				<text key={c} x={COL_X[i] + (i === 2 ? 20 : 0)} y="26" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
					{c}
				</text>
			))}

			{LISTS.map((list, li) =>
				list.map((doc, i) => (
					<g key={`${li}-${i}`}>
						<text x={COL_X[li] - 40} y={ROW_Y(i) + 5} textAnchor="end" fontSize="12.5" fill="var(--muted-foreground)">
							{i + 1}
						</text>
						<Chip cx={COL_X[li]} cy={ROW_Y(i)} doc={doc} />
					</g>
				)),
			)}
			<text x={COL_X[1]} y={ROW_Y(3) + 5} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.noB}
			</text>

			<text x="145" y={ROW_Y(2) + 6} textAnchor="middle" fontSize="18" fill="rgb(var(--gray))">
				+
			</text>
			<text x="285" y={ROW_Y(2) + 6} textAnchor="middle" fontSize="18" fill="rgb(var(--gray))">
				→
			</text>

			{MERGED.map(([doc, score], i) => (
				<g key={doc}>
					<text x={COL_X[2] - 40} y={ROW_Y(i) + 5} textAnchor="end" fontSize="12.5" fill="var(--muted-foreground)">
						{i + 1}
					</text>
					<Chip cx={COL_X[2]} cy={ROW_Y(i)} doc={doc} />
					<text x={COL_X[2] + 34} y={ROW_Y(i) + 5} fontSize="12.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--foreground)">
						{score}
					</text>
				</g>
			))}

			<text x="230" y="262" textAnchor="middle" fontSize="14" fill="var(--foreground)">
				RRF(d) = Σ 1 / (60 + r(d))
			</text>
			<text x="230" y="288" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.note}
			</text>
		</svg>
	);
}

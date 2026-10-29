import type { Lang } from "./lang";

// 검색 네 단계를 아래로 갈수록 좁아지는 깔때기로 그린다. 위는 빠르고 거칠고, 아래는 느리고 정확하다. 정적 SVG.
const LABELS = {
	ko: {
		steps: [
			["① 후보 뽑기", "낱말 검색 + 임베딩 검색으로 넉넉히"],
			["② RRF로 합치기", "두 순위 목록을 하나로"],
			["③ 재순위", "위쪽 수십~100개만 다시 매긴다"],
			["④ 상위 k개를 쓴다", ""],
		],
		fast: "빠르고 거칠다",
		slow: "느리고 정확하다",
		aria: "검색 네 단계를 아래로 갈수록 좁아지는 깔때기로 그린 그림. 첫째, 낱말 검색과 임베딩 검색으로 후보를 넉넉히 뽑는다. 둘째, 두 순위 목록을 RRF로 합친다. 셋째, 위쪽 후보 수십~100개만 재순위 모델로 다시 매긴다. 넷째, 상위 k개를 쓴다. 위 단계일수록 빠르고 거칠고, 아래 단계일수록 느리고 정확하다.",
	},
	en: {
		steps: [
			["① Gather candidates", "keyword + embedding search, generously"],
			["② Merge with RRF", "two ranked lists into one"],
			["③ Rerank", "only the top tens to ~100"],
			["④ Use the top k", ""],
		],
		fast: "fast, coarse",
		slow: "slow, precise",
		aria: "A funnel of the four retrieval steps, narrowing downward. First, gather plenty of candidates with keyword and embedding search. Second, merge the two ranked lists with RRF. Third, rerank only the top tens to about 100 candidates. Fourth, use the top k. Upper steps are fast and coarse; lower steps are slow and precise.",
	},
} as const satisfies Record<Lang, unknown>;

const CX = 190;
const WIDTHS = [340, 280, 210, 140];
const TOP = 30;
const H = 58;
const GAP = 12;

export default function RetrievalFunnelDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const bottom = TOP + WIDTHS.length * H + (WIDTHS.length - 1) * GAP;
	return (
		<svg
			viewBox="0 0 460 330"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<defs>
				<marker id="rf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			{t.steps.map(([title, detail], i) => {
				const w = WIDTHS[i];
				const y = TOP + i * (H + GAP);
				const last = i === WIDTHS.length - 1;
				return (
					<g key={title}>
						<rect
							x={CX - w / 2}
							y={y}
							width={w}
							height={H}
							rx="8"
							fill={last ? "var(--accent)" : "var(--secondary)"}
							fillOpacity={last ? 0.18 : 1}
							stroke={last ? "var(--accent)" : "var(--border)"}
							strokeWidth="1.5"
						/>
						<text
							x={CX}
							y={detail ? y + 25 : y + H / 2 + 5}
							textAnchor="middle"
							fontSize="13.5"
							fontWeight="600"
							fill={last ? "var(--accent)" : "var(--foreground)"}
						>
							{title}
						</text>
						{detail && (
							<text x={CX} y={y + 44} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
								{detail}
							</text>
						)}
					</g>
				);
			})}

			<text x="410" y="20" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.fast}
			</text>
			<line x1="410" y1={TOP + 4} x2="410" y2={bottom - 4} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#rf-arrow)" />
			<text x="410" y={bottom + 20} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.slow}
			</text>
		</svg>
	);
}

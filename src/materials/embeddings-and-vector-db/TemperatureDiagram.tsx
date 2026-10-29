import type { Lang } from "./lang";

// 같은 점수(0.80·0.60·0.50)에서 온도 τ에 따라 후보를 고를 확률이 어떻게 갈리는지 막대 두 묶음으로 보인다. 정적 SVG.
const LABELS = {
	ko: {
		axis: "후보를 고를 확률",
		cands: ["정답", "오답 1", "오답 2"],
		note: "점수는 같다: 정답 0.80 · 오답 1 0.60 · 오답 2 0.50",
		aria: "온도에 따라 후보를 고를 확률이 달라지는 막대 그래프. 점수는 정답 0.80, 오답 1 0.60, 오답 2 0.50으로 같다. 온도 τ가 1이면 정답 39%, 오답 1 32%, 오답 2 29%로 고르게 나뉜다. τ가 0.05이면 정답 98%, 오답 1 1.8%, 오답 2 0.24%로 정답에 몰린다.",
	},
	en: {
		axis: "probability of picking each candidate",
		cands: ["positive", "negative 1", "negative 2"],
		note: "Same scores: positive 0.80 · negative 1 0.60 · negative 2 0.50",
		aria: "Bar chart of how temperature changes the probability of picking each candidate. The scores stay the same: positive 0.80, negative 1 0.60, negative 2 0.50. At τ = 1 the probabilities are spread out: 39%, 32%, and 29%. At τ = 0.05 they pile onto the positive: 98%, 1.8%, and 0.24%.",
	},
} as const satisfies Record<Lang, unknown>;

const GROUPS = [
	{ title: "τ = 1", x: 30, values: [39, 32, 29], text: ["39%", "32%", "29%"] },
	{ title: "τ = 0.05", x: 250, values: [98, 1.8, 0.24], text: ["98%", "1.8%", "0.24%"] },
];
const BASE = 240;
const MAX_H = 170;
const BAR_W = 46;
const STEP = 64;
const GROUP_W = 9 * 2 + 2 * STEP + BAR_W;

export default function TemperatureDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	return (
		<svg
			viewBox="0 0 460 300"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<text x="30" y="18" fontSize="12" fill="var(--muted-foreground)">
				{t.axis}
			</text>
			{GROUPS.map((g) => (
				<g key={g.title}>
					<text x={g.x + GROUP_W / 2} y="46" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
						{g.title}
					</text>
					<line x1={g.x} y1={BASE} x2={g.x + GROUP_W} y2={BASE} stroke="rgb(var(--gray))" strokeWidth="1" />
					{g.values.map((v, i) => {
						// 아주 작은 값도 막대가 보이도록 최소 높이를 둔다
						const h = Math.max(1.5, (v / 100) * MAX_H);
						const x = g.x + 9 + i * STEP;
						const positive = i === 0;
						return (
							<g key={t.cands[i]}>
								<rect
									x={x}
									y={BASE - h}
									width={BAR_W}
									height={h}
									rx="3"
									fill={positive ? "var(--accent)" : "rgb(var(--gray))"}
									fillOpacity={positive ? 0.9 : 0.55}
								/>
								<text
									x={x + BAR_W / 2}
									y={BASE - h - 6}
									textAnchor="middle"
									fontSize="12.5"
									fontWeight={positive ? 700 : 400}
									fill={positive ? "var(--accent)" : "var(--muted-foreground)"}
								>
									{g.text[i]}
								</text>
								<text x={x + BAR_W / 2} y={BASE + 18} textAnchor="middle" fontSize="12" fill="var(--foreground)">
									{t.cands[i]}
								</text>
							</g>
						);
					})}
				</g>
			))}
			<text x="230" y="288" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.note}
			</text>
		</svg>
	);
}

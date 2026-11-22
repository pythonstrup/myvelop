// 담당자 셋의 최근 50개를 찾을 때 정확한 조건만 건 쪽(B-tree)과 넓은 조건을 더한 쪽(GIN)이 읽은 페이지를 막대로 나란히 놓은 그림. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다. 같은 숫자의 표가 본문에 바로 위에 있다.
const GROUPS = [
	{ name: "park", share: "30%, 60,151행", btree: 152, gin: 38060 },
	{ name: "kim 혼자", share: "1%, 2,004행", btree: 5176, gin: 5698 },
	{ name: "choi", share: "0.5%, 980행", btree: 14030, gin: 1907 },
] as const;

const LABELS = {
	ko: {
		title: "최근 50개를 찾으며 읽은 페이지",
		btree: "정확한 조건만 (B-tree)",
		gin: "넓은 조건을 더함 (GIN)",
		caption: "흔한 값은 정확한 조건만, 드문 값은 넓은 조건을 더한 쪽이 적게 읽는다",
		aria: "담당자 셋의 최근 티켓 50개를 찾을 때 읽은 페이지를 비교한 막대 그림. park(30%, 60,151행)는 정확한 조건만 걸면 B-tree로 152페이지, 넓은 조건을 더하면 GIN으로 38,060페이지를 읽었다. kim 혼자(1%, 2,004행)는 5,176페이지와 5,698페이지로 비슷했다. choi(0.5%, 980행)는 정확한 조건만 걸면 14,030페이지, 넓은 조건을 더하면 1,907페이지를 읽었다.",
	},
} as const;
type Lang = keyof typeof LABELS;

const X0 = 112;
const MAX_W = 266;
const MAX = 38060;
const BAR_H = 14;
const GROUP_Y = 54;
const GROUP_GAP = 50;

// 막대 끝(값 쪽)만 둥글게, 기준선 쪽은 각지게.
const bar = (y: number, w: number) => {
	const r = Math.min(4, w / 2);
	return `M ${X0} ${y} H ${X0 + w - r} Q ${X0 + w} ${y} ${X0 + w} ${y + r} V ${y + BAR_H - r} Q ${X0 + w} ${y + BAR_H} ${X0 + w - r} ${y + BAR_H} H ${X0} Z`;
};

export default function LimitPagesDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const width = (v: number) => Math.max(1, (v / MAX) * MAX_W);
	const swatch = (x: number, fill: string, label: string) => (
		<g>
			<rect x={x} y="28" width="12" height="12" rx="3" fill={fill} />
			<text x={x + 18} y="38" fontSize="11" fill="var(--muted-foreground)">
				{label}
			</text>
		</g>
	);
	const lastY = GROUP_Y + (GROUPS.length - 1) * GROUP_GAP + 2 * BAR_H + 2;
	return (
		<svg viewBox="0 0 440 222" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 440, margin: "2rem auto" }}>
			<text x="10" y="16" fontSize="12.5" fill="var(--foreground)" fontWeight="600">
				{t.title}
			</text>
			{swatch(10, "rgb(var(--gray))", t.btree)}
			{swatch(190, "var(--accent)", t.gin)}

			<line x1={X0} y1={GROUP_Y - 6} x2={X0} y2={lastY + 6} stroke="rgb(var(--gray))" strokeOpacity="0.5" />

			{GROUPS.map((g, i) => {
				const y = GROUP_Y + i * GROUP_GAP;
				const rows = [
					{ v: g.btree, fill: "rgb(var(--gray))", y },
					{ v: g.gin, fill: "var(--accent)", y: y + BAR_H + 2 },
				];
				return (
					<g key={g.name}>
						<text x="10" y={y + 12} fontSize="12" fontWeight="600" fill="var(--foreground)">
							{g.name}
						</text>
						<text x="10" y={y + 27} fontSize="10.5" fill="var(--muted-foreground)">
							{g.share}
						</text>
						{rows.map((r) => (
							<g key={r.y}>
								<path d={bar(r.y, width(r.v))} fill={r.fill} />
								<text x={X0 + width(r.v) + 6} y={r.y + 11} fontSize="11" fill="var(--foreground)">
									{r.v.toLocaleString("en-US")}
								</text>
							</g>
						))}
					</g>
				);
			})}

			<text x="220" y="212" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{t.caption}
			</text>
		</svg>
	);
}

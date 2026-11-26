// 행 셋의 data 에서 키를 떼어 GIN 의 키 B-tree 와 행 목록으로 뒤집는 그림. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const ROWS = [
	{ id: "1", data: '{"status": "open", "assignees": ["kim", "lee"]}' },
	{ id: "2", data: '{"status": "closed", "assignees": ["park"]}' },
	{ id: "3", data: '{"status": "open", "assignees": ["kim"]}' },
] as const;

const LEAVES = [
	{
		x: 10,
		entries: [
			{ key: "assignees: kim", rows: "1, 3" },
			{ key: "assignees: lee", rows: "1" },
			{ key: "assignees: park", rows: "2" },
		],
	},
	{
		x: 230,
		entries: [
			{ key: "status: closed", rows: "2" },
			{ key: "status: open", rows: "1, 3" },
		],
	},
] as const;

const LABELS = {
	ko: {
		table: "테이블 tickets — 행마다 값을 적는다",
		flip: "필드와 값을 하나씩 떼어 키로",
		index: "GIN 인덱스 — 키마다 행 번호를 적는다",
		root: "위 페이지",
		leaf: "잎 페이지",
		caption: "잎 항목마다 키와 그 키가 든 행 번호 목록(posting list)",
		aria: "tickets 테이블의 세 행에서 필드와 값을 떼어 GIN 인덱스의 키로 뒤집는 그림. 키는 B-tree로 정렬되고, 위 페이지는 키 범위로 두 잎 페이지를 가리킨다. 잎 페이지에는 assignees: kim은 1, 3번 행, assignees: lee는 1번, assignees: park는 2번, status: closed는 2번, status: open은 1, 3번 행처럼 키마다 행 번호 목록이 붙어 있다.",
	},
} as const;
type Lang = keyof typeof LABELS;

const ROW_H = 30;
const ENTRY_H = 26;
const LEAF_W = 200;
const LEAF_Y = 300;

export default function InvertedIndexDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
	const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)" } as const;
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 8,
		strokeLinejoin: "round",
	} as const;
	const leafH = (n: number) => n * ENTRY_H + 30;
	return (
		<svg
			viewBox="0 0 440 440"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 440, margin: "2rem auto" }}
		>
			<defs>
				<marker id="ii-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<text x="10" y="18" fontSize="12.5" fill="var(--muted-foreground)">
				{t.table}
			</text>
			{ROWS.map((r, i) => {
				const y = 28 + i * (ROW_H + 4);
				return (
					<g key={r.id}>
						<rect x="10" y={y} width="420" height={ROW_H} rx="6" {...box} />
						<text x="26" y={y + 20} fontSize="13" fontWeight="600" fill="var(--foreground)">
							{r.id}
						</text>
						<text x="46" y={y + 20} fontSize="11.5" fill="var(--foreground)" {...mono}>
							{r.data}
						</text>
					</g>
				);
			})}

			<line x1="220" y1="132" x2="220" y2="184" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#ii-arrow)" />
			<text x="220" y="162" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)" {...halo}>
				{t.flip}
			</text>

			<text x="10" y="206" fontSize="12.5" fill="var(--muted-foreground)">
				{t.index}
			</text>
			<rect x="90" y="216" width="260" height="44" rx="8" {...box} />
			<text x="220" y="230" textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
				{t.root}
			</text>
			<text x="155" y="250" textAnchor="middle" fontSize="11.5" fill="var(--foreground)" {...mono}>
				assignees…
			</text>
			<line x1="220" y1="238" x2="220" y2="256" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			<text x="285" y="250" textAnchor="middle" fontSize="11.5" fill="var(--foreground)" {...mono}>
				status…
			</text>
			<line x1="155" y1="260" x2={LEAVES[0].x + LEAF_W / 2} y2={LEAF_Y - 2} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#ii-arrow)" />
			<line x1="285" y1="260" x2={LEAVES[1].x + LEAF_W / 2} y2={LEAF_Y - 2} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#ii-arrow)" />

			{LEAVES.map((leaf) => (
				<g key={leaf.x}>
					<rect x={leaf.x} y={LEAF_Y} width={LEAF_W} height={leafH(leaf.entries.length)} rx="8" {...box} />
					<text x={leaf.x + LEAF_W / 2} y={LEAF_Y + 15} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
						{t.leaf}
					</text>
					{leaf.entries.map((e, i) => {
						const y = LEAF_Y + 24 + i * ENTRY_H;
						return (
							<g key={e.key}>
								<rect x={leaf.x + 6} y={y} width={LEAF_W - 12} height={ENTRY_H - 4} rx="4" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity="0.3" />
								<text x={leaf.x + 14} y={y + 15} fontSize="11.5" fill="var(--foreground)" {...mono}>
									{e.key}
								</text>
								<text x={leaf.x + LEAF_W - 14} y={y + 15} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--accent)">
									{e.rows}
								</text>
							</g>
						);
					})}
				</g>
			))}

			<text x="220" y="432" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.caption}
			</text>
		</svg>
	);
}

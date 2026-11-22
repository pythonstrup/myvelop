// 넣은 순서대로 쌓인 대기 목록과 키 순서로 정렬된 본 구조를 나란히 그리고, kim 을 찾을 때 본 구조는 키 하나로 바로 가지만 대기 목록은 다 읽는 모습을 보이는 그림. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
type Entry = { key: string; rows: string; hit: boolean };

const PENDING: Entry[] = [
	{ key: "status: open", rows: "4", hit: false },
	{ key: "assignees: kim", rows: "4", hit: true },
	{ key: "status: closed", rows: "5", hit: false },
	{ key: "assignees: park", rows: "5", hit: false },
	{ key: "status: open", rows: "6", hit: false },
	{ key: "assignees: lee", rows: "6", hit: false },
];

const MAIN: Entry[] = [
	{ key: "assignees: kim", rows: "1, 3", hit: true },
	{ key: "assignees: lee", rows: "1", hit: false },
	{ key: "assignees: park", rows: "2", hit: false },
	{ key: "status: closed", rows: "2", hit: false },
	{ key: "status: open", rows: "1, 3", hit: false },
];

const LABELS = {
	ko: {
		pending: "대기 목록 — 넣은 순서",
		pendingSub: "새 키를 정렬하지 않고 뒤에 붙인다",
		main: "본 구조 — 키 순서",
		mainSub: "키 B-tree와 행 목록",
		move: "옮긴다",
		search: "kim이 맡은 티켓을 찾을 때",
		pendingNote: "처음부터 끝까지 다 읽는다",
		mainNote: "키를 찾아 바로 간다",
		result: "찾은 행: 1, 3(본 구조) + 4(대기 목록)",
		caption: "VACUUM이나 한도를 넘긴 쓰기가 대기 목록을 본 구조로 한꺼번에 옮긴다",
		aria: "GIN의 대기 목록과 본 구조를 나란히 그린 그림. 본 구조에는 2장의 1~3번 행이 키 순서로 들어 있다: assignees: kim은 1, 3번, assignees: lee는 1번, assignees: park는 2번, status: closed는 2번, status: open은 1, 3번. 새로 넣은 4~6번 행의 키는 대기 목록에 넣은 순서대로 붙어 있다: status: open 4, assignees: kim 4, status: closed 5, assignees: park 5, status: open 6, assignees: lee 6. kim이 맡은 티켓을 찾을 때 본 구조에서는 키를 찾아 1, 3번으로 바로 가지만, 대기 목록은 정렬되어 있지 않아 처음부터 끝까지 읽어서 4번을 찾는다. VACUUM이나 한도를 넘긴 쓰기가 대기 목록을 본 구조로 한꺼번에 옮긴다.",
	},
} as const;
type Lang = keyof typeof LABELS;

const COL_W = 180;
const COLS = { pending: 10, main: 250 } as const;
const BOX_Y = 46;
const ENTRY_H = 26;

export default function PendingListDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
	const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)" } as const;
	const boxH = (n: number) => n * ENTRY_H + 12;

	const column = (x: number, title: string, sub: string, entries: Entry[], readAll: boolean) => (
		<g>
			<text x={x} y="18" fontSize="12.5" fill="var(--foreground)" fontWeight="600">
				{title}
			</text>
			<text x={x} y="34" fontSize="11" fill="var(--muted-foreground)">
				{sub}
			</text>
			<rect
				x={x}
				y={BOX_Y}
				width={COL_W}
				height={boxH(entries.length)}
				rx="8"
				{...box}
				{...(readAll ? { stroke: "var(--accent)", strokeOpacity: 1, strokeDasharray: "5 4", strokeWidth: 1.5 } : {})}
			/>
			{entries.map((e, i) => {
				const y = BOX_Y + 8 + i * ENTRY_H;
				return (
					<g key={`${e.key}-${e.rows}`}>
						<rect
							x={x + 6}
							y={y}
							width={COL_W - 12}
							height={ENTRY_H - 4}
							rx="4"
							fill={e.hit ? "var(--accent)" : "var(--background)"}
							fillOpacity={e.hit ? 0.12 : 1}
							stroke={e.hit ? "var(--accent)" : "rgb(var(--gray))"}
							strokeOpacity={e.hit ? 1 : 0.3}
						/>
						<text x={x + 14} y={y + 15} fontSize="11.5" fontWeight={e.hit ? 600 : 400} fill="var(--foreground)" {...mono}>
							{e.key}
						</text>
						<text
							x={x + COL_W - 14}
							y={y + 15}
							textAnchor="end"
							fontSize="12"
							fontWeight="600"
							fill={e.hit ? "var(--accent)" : "var(--foreground)"}
						>
							{e.rows}
						</text>
					</g>
				);
			})}
		</g>
	);

	const arrowY = BOX_Y + boxH(MAIN.length) / 2;
	return (
		<svg viewBox="0 0 440 314" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 440, margin: "2rem auto" }}>
			<defs>
				<marker id="pl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			{column(COLS.pending, t.pending, t.pendingSub, PENDING, true)}
			{column(COLS.main, t.main, t.mainSub, MAIN, false)}

			<line
				x1={COLS.pending + COL_W + 4}
				y1={arrowY}
				x2={COLS.main - 4}
				y2={arrowY}
				stroke="rgb(var(--gray))"
				strokeWidth="1.5"
				markerEnd="url(#pl-arrow)"
			/>
			<text x="220" y={arrowY - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{t.move}
			</text>

			<text x="220" y="238" textAnchor="middle" fontSize="12" fill="var(--foreground)">
				{t.search}
			</text>
			<text x={COLS.pending} y="258" fontSize="11" fill="var(--accent)">
				{t.pendingNote}
			</text>
			<text x={COLS.main} y="258" fontSize="11" fill="var(--accent)">
				{t.mainNote}
			</text>
			<text x="220" y="280" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--foreground)">
				{t.result}
			</text>
			<text x="220" y="304" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.caption}
			</text>
		</svg>
	);
}

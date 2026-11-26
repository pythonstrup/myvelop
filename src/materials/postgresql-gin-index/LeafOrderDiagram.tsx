// 같은 세 행으로 B-tree 잎과 GIN 잎을 나란히 그려, 한 행이 B-tree에는 한 번, GIN에는 키 수만큼 나오는 모습을 보이는 그림. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const HIT = "1";

const BTREE = [
	{ key: "10월 2일", rows: ["2"] },
	{ key: "10월 5일", rows: ["1"] },
	{ key: "10월 9일", rows: ["3"] },
] as const;

const GIN = [
	{ key: "assignees: kim", rows: ["1", "3"] },
	{ key: "assignees: lee", rows: ["1"] },
	{ key: "assignees: park", rows: ["2"] },
	{ key: "status: closed", rows: ["2"] },
	{ key: "status: open", rows: ["1", "3"] },
] as const;

type Entry = { key: string; rows: readonly string[] };

const LABELS = {
	ko: {
		btree: "B-tree — created_at 값을 정렬",
		gin: "GIN — 떼어 낸 키를 정렬",
		leaf: "잎 페이지",
		read: "잎을 차례로 읽으면 나오는 행",
		btreeNote: "created_at 순서, 행마다 한 번",
		ginNote: "1번 행이 세 번, 순서는 없다",
		caption: "1번 행은 B-tree에 한 번, GIN에는 키 셋의 목록에 나온다",
		aria: "같은 세 행으로 만든 B-tree 잎과 GIN 잎을 나란히 그린 그림. B-tree 잎은 created_at 순서로 10월 2일 2번 행, 10월 5일 1번 행, 10월 9일 3번 행을 하나씩 적고, 차례로 읽으면 2, 1, 3번 행이 한 번씩 나온다. GIN 잎은 키 순서로 assignees: kim에 1, 3번, assignees: lee에 1번, assignees: park에 2번, status: closed에 2번, status: open에 1, 3번을 적는다. 차례로 읽으면 1, 3, 1, 2, 2, 1, 3번이 나와 1번 행이 세 번 나오고 행의 순서는 없다.",
	},
} as const;
type Lang = keyof typeof LABELS;

const COL_W = 200;
const COLS = { btree: 10, gin: 230 } as const;
const LEAF_Y = 30;
const ENTRY_H = 26;
const READ_Y = 214;
const CHIP = { w: 22, h: 22, gap: 5 } as const;

export default function LeafOrderDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
	const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)" } as const;

	const leaf = (x: number, entries: readonly Entry[], isMono: boolean) => (
		<g>
			<rect x={x} y={LEAF_Y} width={COL_W} height={entries.length * ENTRY_H + 30} rx="8" {...box} />
			<text x={x + COL_W / 2} y={LEAF_Y + 15} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
				{t.leaf}
			</text>
			{entries.map((e, i) => {
				const y = LEAF_Y + 24 + i * ENTRY_H;
				const hit = e.rows.includes(HIT);
				return (
					<g key={e.key}>
						<rect
							x={x + 6}
							y={y}
							width={COL_W - 12}
							height={ENTRY_H - 4}
							rx="4"
							fill={hit ? "var(--accent)" : "var(--background)"}
							fillOpacity={hit ? 0.12 : 1}
							stroke="rgb(var(--gray))"
							strokeOpacity="0.3"
						/>
						<text x={x + 14} y={y + 15} fontSize="11.5" fill="var(--foreground)" {...(isMono ? mono : {})}>
							{e.key}
						</text>
						<text x={x + COL_W - 14} y={y + 15} textAnchor="end" fontSize="12" fontWeight="600">
							{e.rows.map((r, j) => (
								<tspan key={r} fill={r === HIT ? "var(--accent)" : "var(--foreground)"}>
									{j > 0 ? `, ${r}` : r}
								</tspan>
							))}
						</text>
					</g>
				);
			})}
		</g>
	);

	const chips = (x: number, rows: readonly string[]) =>
		rows.map((r, i) => {
			const cx = x + i * (CHIP.w + CHIP.gap);
			const hit = r === HIT;
			return (
				<g key={`${x}-${i}`}>
					<rect
						x={cx}
						y={READ_Y + 10}
						width={CHIP.w}
						height={CHIP.h}
						rx="4"
						fill="var(--background)"
						stroke={hit ? "var(--accent)" : "rgb(var(--gray))"}
						strokeOpacity={hit ? 1 : 0.5}
						strokeWidth={hit ? 1.5 : 1}
					/>
					<text
						x={cx + CHIP.w / 2}
						y={READ_Y + 25}
						textAnchor="middle"
						fontSize="12"
						fontWeight={hit ? 600 : 400}
						fill={hit ? "var(--accent)" : "var(--foreground)"}
					>
						{r}
					</text>
				</g>
			);
		});

	const column = (x: number, title: string, entries: readonly Entry[], isMono: boolean, note: string) => (
		<g>
			<text x={x} y="18" fontSize="12.5" fill="var(--muted-foreground)">
				{title}
			</text>
			{leaf(x, entries, isMono)}
			<text x={x} y={READ_Y} fontSize="11" fill="var(--muted-foreground)">
				{t.read}
			</text>
			{chips(x, entries.flatMap((e) => e.rows))}
			<text x={x} y={READ_Y + 50} fontSize="11" fill="var(--muted-foreground)">
				{note}
			</text>
		</g>
	);

	return (
		<svg viewBox="0 0 440 304" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 440, margin: "2rem auto" }}>
			{column(COLS.btree, t.btree, BTREE, false, t.btreeNote)}
			{column(COLS.gin, t.gin, GIN, true, t.ginNote)}
			<text x="220" y="294" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.caption}
			</text>
		</svg>
	);
}

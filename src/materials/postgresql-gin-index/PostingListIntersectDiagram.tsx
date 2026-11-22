// 키 두 개의 행 목록을 행 번호대로 나란히 놓고 양쪽에 다 있는 행만 남기는 그림. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const COLS = [
	{ id: "1", x: 250 },
	{ id: "2", x: 320 },
	{ id: "3", x: 390 },
] as const;

const LISTS = [
	{ key: "status: open", rows: ["1", "3"] },
	{ key: "assignees: lee", rows: ["1"] },
] as const;

const RESULT = ["1"] as const;

const LABELS = {
	ko: {
		question: "찾는 것: 상태가 open이고 담당자에 lee가 있는 행",
		row: (id: string) => `${id}번`,
		result: "양쪽에 다 있는 행",
		caption: "키마다 행 목록을 읽고, 두 목록에 다 있는 행 번호만 남긴다",
		aria: "status: open 키의 행 목록 1, 3과 assignees: lee 키의 행 목록 1을 행 번호대로 나란히 놓은 그림. 두 목록에 다 있는 1번 행만 결과로 남는다.",
	},
} as const;
type Lang = keyof typeof LABELS;

const ROW_Y = [74, 114] as const;
const RESULT_Y = 172;
const CHIP_W = 40;
const CHIP_H = 26;
const BAND_W = 54;

export default function PostingListIntersectDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)" } as const;
	const chip = (x: number, y: number, id: string, hit: boolean) => (
		<g key={`${x}-${y}`}>
			<rect
				x={x - CHIP_W / 2}
				y={y}
				width={CHIP_W}
				height={CHIP_H}
				rx="6"
				fill="var(--background)"
				stroke={hit ? "var(--accent)" : "rgb(var(--gray))"}
				strokeOpacity={hit ? 1 : 0.5}
				strokeWidth={hit ? 2 : 1}
			/>
			<text x={x} y={y + 17.5} textAnchor="middle" fontSize="13" fontWeight="600" fill={hit ? "var(--accent)" : "var(--foreground)"}>
				{id}
			</text>
		</g>
	);
	return (
		<svg
			viewBox="0 0 440 244"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 440, margin: "2rem auto" }}
		>
			<defs>
				<marker id="pi-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<text x="10" y="18" fontSize="12.5" fill="var(--muted-foreground)">
				{t.question}
			</text>

			{COLS.map((c) => {
				const hit = RESULT.some((r) => r === c.id);
				return (
					<g key={c.id}>
						<rect
							x={c.x - BAND_W / 2}
							y="38"
							width={BAND_W}
							height={RESULT_Y + CHIP_H + 8 - 38}
							rx="8"
							fill={hit ? "var(--accent)" : "rgb(var(--gray))"}
							fillOpacity={hit ? 0.12 : 0.06}
						/>
						<text x={c.x} y="56" textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
							{t.row(c.id)}
						</text>
					</g>
				);
			})}

			{LISTS.map((l, i) => {
				const y = ROW_Y[i];
				return (
					<g key={l.key}>
						<rect x="10" y={y} width="150" height={CHIP_H} rx="6" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
						<text x="20" y={y + 17.5} fontSize="11.5" fill="var(--foreground)" {...mono}>
							{l.key}
						</text>
						<line x1="164" y1={y + CHIP_H / 2} x2="196" y2={y + CHIP_H / 2} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#pi-arrow)" />
						{COLS.filter((c) => l.rows.some((r) => r === c.id)).map((c) => chip(c.x, y, c.id, false))}
					</g>
				);
			})}

			<line x1="210" y1="156" x2="430" y2="156" stroke="rgb(var(--gray))" strokeOpacity="0.6" />

			<text x="10" y={RESULT_Y + 17.5} fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				{t.result}
			</text>
			<line x1="164" y1={RESULT_Y + CHIP_H / 2} x2="196" y2={RESULT_Y + CHIP_H / 2} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#pi-arrow)" />
			{COLS.filter((c) => RESULT.some((r) => r === c.id)).map((c) => chip(c.x, RESULT_Y, c.id, true))}

			<text x="220" y="236" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.caption}
			</text>
		</svg>
	);
}

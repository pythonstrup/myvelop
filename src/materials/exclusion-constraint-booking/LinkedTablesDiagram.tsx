// 연결 예약 A+B 가 reservation 1행과 reservation_room 2행으로 저장되는 구조. 자식은 부모를 참조하고
// 시간과 active 를 부모에서 복사해 갖는다. EXCLUDE 는 자식 테이블에 걸린다. 정적 SVG — SSR로만 렌더링한다.
const LABELS = {
	ko: {
		parentNote: "원본",
		childNote: "회의실마다 한 행",
		title: "주간 회의",
		refer: "참조",
		copy: "복사",
		exclude: "EXCLUDE  room =  ·  시간 &&  ·  active인 행만",
		aria: "reservation 테이블의 1행(id 1, 주간 회의, 10:00–11:00, cancelled_at null)이 reservation_room 테이블의 A·B 2행으로 이어지는 구조. 자식 행은 reservation_id로 부모를 참조하고, 시간과 active를 부모에서 복사해 갖는다. active는 cancelled_at이 null인지의 사본이다. EXCLUDE 제약조건은 자식 테이블에 걸려 active인 행끼리 같은 회의실에서 시간이 겹치는지 검사한다.",
	},
	en: {
		parentNote: "source",
		childNote: "one row per room",
		title: "Weekly sync",
		refer: "references",
		copy: "copy",
		exclude: "EXCLUDE  room =  ·  time &&  ·  active rows only",
		aria: "Structure where one reservation row (id 1, Weekly sync, 10:00–11:00, cancelled_at null) maps to two reservation_room rows for rooms A and B. The child rows reference the parent by reservation_id and copy its time and active flag; active is a copy of whether cancelled_at is null. The EXCLUDE constraint sits on the child table and checks active rows for overlapping time in the same room.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
type Col = { x: number; w: number; head: string; copy?: boolean };

const PARENT: Col[] = [
	{ x: 0, w: 44, head: "id" },
	{ x: 44, w: 106, head: "title" },
	{ x: 150, w: 120, head: "starts_at · ends_at", copy: true },
	{ x: 270, w: 110, head: "cancelled_at", copy: true },
];
const CHILD: Col[] = [
	{ x: 0, w: 104, head: "reservation_id" },
	{ x: 104, w: 50, head: "room" },
	{ x: 154, w: 120, head: "starts_at · ends_at", copy: true },
	{ x: 274, w: 106, head: "active", copy: true },
];

function Table({ y, name, note, cols, rows }: { y: number; name: string; note: string; cols: Col[]; rows: string[][] }) {
	const line = { stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
	const height = 42 + rows.length * 24;
	return (
		<g>
			<rect x="0.5" y={y + 0.5} width="379" height={height} rx="6" fill="var(--background)" {...line} />
			<rect x="0.5" y={y + 0.5} width="379" height="22" rx="6" fill="var(--secondary)" />
			<text x="10" y={y + 15.5} fontSize="11.5" fill="var(--foreground)">
				<tspan fontWeight="700" fontFamily={MONO}>
					{name}
				</tspan>
				<tspan dx="8" fontWeight="500" fontSize="10.5" fill="var(--muted-foreground)">
					{note}
				</tspan>
			</text>
			{cols.map((col) => (
				<g key={col.head}>
					{col.copy && <rect x={col.x + 1} y={y + 23} width={col.w - 2} height={height - 23} fill="var(--accent)" fillOpacity="0.1" />}
					<text x={col.x + col.w / 2} y={y + 36} fontSize="10" textAnchor="middle" fill="var(--muted-foreground)">
						{col.head}
					</text>
				</g>
			))}
			<line x1="0.5" x2="379.5" y1={y + 42} y2={y + 42} {...line} />
			{rows.map((row, r) => (
				<g key={row.join()}>
					{r > 0 && <line x1="0.5" x2="379.5" y1={y + 42 + r * 24} y2={y + 42 + r * 24} {...line} />}
					{row.map((value, i) => (
						<text key={cols[i].head} x={cols[i].x + cols[i].w / 2} y={y + 58 + r * 24} fontSize="11.5" fontWeight="600" textAnchor="middle" fill="var(--foreground)">
							{value}
						</text>
					))}
				</g>
			))}
		</g>
	);
}

export default function LinkedTablesDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const halo = { paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 6, strokeLinejoin: "round" } as const;
	const arrow = (x1: number, x2: number, copy: boolean, label: string) => (
		<g>
			<line
				x1={x1}
				y1="68"
				x2={x2}
				y2="106"
				stroke={copy ? "var(--accent)" : "rgb(var(--gray))"}
				strokeWidth="1.5"
				strokeDasharray={copy ? "4 3" : undefined}
				markerEnd={copy ? "url(#ltd-arrow-copy)" : "url(#ltd-arrow)"}
			/>
			<text x={(x1 + x2) / 2 + 6} y="91" fontSize="10.5" fill={copy ? "var(--accent)" : "var(--muted-foreground)"} {...halo}>
				{label}
			</text>
		</g>
	);
	return (
		<svg viewBox="0 0 380 246" role="img" aria-label={t.aria} style={{ display: "block", width: "100%", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<marker id="ltd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
				<marker id="ltd-arrow-copy" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent)" />
				</marker>
			</defs>
			<Table y={0} name="reservation" note={t.parentNote} cols={PARENT} rows={[["1", t.title, "10:00–11:00", "null"]]} />
			{arrow(22, 52, false, t.refer)}
			{arrow(210, 214, true, t.copy)}
			{arrow(325, 327, true, "is null")}
			<Table y={110} name="reservation_room" note={t.childNote} cols={CHILD} rows={[["1", "A", "10:00–11:00", "true"], ["1", "B", "10:00–11:00", "true"]]} />
			<rect x="50" y="214" width="280" height="24" rx="12" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
			<text x="190" y="230" fontSize="11" fontWeight="600" textAnchor="middle" fill="var(--accent)">
				{t.exclude}
			</text>
		</svg>
	);
}

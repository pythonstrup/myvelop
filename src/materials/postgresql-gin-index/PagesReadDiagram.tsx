// kim 쿼리의 실행 계획 두 단계가 무엇을 읽는지, GIN 없이 읽을 때와 테이블 페이지 수로 견주는 그림. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
// 숫자는 합성 데이터(20만 행)에서 EXPLAIN (ANALYZE, BUFFERS)로 잰 값이다.
const TABLE_PAGES = 50_000;
const INDEX_PAGES = 7;
const HEAP_PAGES = 5_691;
const MATCHED_ROWS = 5_956;
const REMOVED_ROWS = 194_044;

const fmt = (n: number) => n.toLocaleString("en-US");

const LABELS = {
	ko: {
		gin: "GIN으로 찾을 때",
		indexNode: "Bitmap Index Scan on tickets_data_gin",
		index: "GIN 인덱스",
		indexRead: `페이지 ${INDEX_PAGES}개 읽음`,
		rowIds: `행 번호 ${fmt(MATCHED_ROWS)}개`,
		heapNode: "Bitmap Heap Scan on tickets",
		heapRead: `테이블 ${fmt(TABLE_PAGES)}페이지 중 ${fmt(HEAP_PAGES)}페이지를 찾아가 ${fmt(MATCHED_ROWS)}행을 읽음`,
		seq: "GIN을 쓰지 못하게 하면",
		seqNode: "Seq Scan on tickets",
		seqRead: `${fmt(TABLE_PAGES)}페이지를 모두 읽고 ${fmt(REMOVED_ROWS)}행을 버림`,
		caption: "막대 길이는 읽은 테이블 페이지 수",
		aria: `실행 계획을 읽는 순서대로 그린 그림. 먼저 Bitmap Index Scan이 GIN 인덱스 페이지 ${INDEX_PAGES}개를 읽어 행 번호 ${fmt(MATCHED_ROWS)}개를 얻는다. 다음으로 Bitmap Heap Scan이 테이블 ${fmt(TABLE_PAGES)}페이지 중 ${fmt(HEAP_PAGES)}페이지만 찾아가 행을 읽는다. GIN을 쓰지 못하게 하면 Seq Scan이 ${fmt(TABLE_PAGES)}페이지를 모두 읽고 ${fmt(REMOVED_ROWS)}행을 버린다.`,
	},
} as const;
type Lang = keyof typeof LABELS;

const LEFT = 34;
const BAR_W = 396;
const BAR_H = 14;

export default function PagesReadDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)" } as const;
	const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
	const step = (n: string, y: number, node: string) => (
		<g>
			<circle cx="19" cy={y - 4} r="9" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
			<text x="19" y={y} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--accent)">
				{n}
			</text>
			<text x={LEFT} y={y} fontSize="11" fill="var(--foreground)" {...mono}>
				{node}
			</text>
		</g>
	);
	const bar = (y: number, pages: number) => (
		<g>
			<rect x={LEFT} y={y} width={BAR_W} height={BAR_H} rx="4" fill="rgb(var(--gray))" fillOpacity="0.15" />
			<rect x={LEFT} y={y} width={(BAR_W * pages) / TABLE_PAGES} height={BAR_H} rx="4" fill="var(--accent)" />
		</g>
	);
	return (
		<svg
			viewBox="0 0 440 300"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 440, margin: "2rem auto" }}
		>
			<defs>
				<marker id="pr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<text x="10" y="18" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				{t.gin}
			</text>

			{step("1", 44, t.indexNode)}
			<rect x={LEFT} y="54" width="130" height="36" rx="6" {...box} />
			<text x={LEFT + 65} y="69" textAnchor="middle" fontSize="12" fill="var(--foreground)">
				{t.index}
			</text>
			<text x={LEFT + 65} y="83" textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
				{t.indexRead}
			</text>
			<line x1={LEFT + 134} y1="72" x2={LEFT + 172} y2="72" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#pr-arrow)" />
			<rect x={LEFT + 176} y="54" width="150" height="36" rx="6" fill="var(--background)" stroke="var(--accent)" strokeWidth="1.5" />
			<text x={LEFT + 251} y="76" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				{t.rowIds}
			</text>

			{step("2", 114, t.heapNode)}
			{bar(124, HEAP_PAGES)}
			<text x={LEFT} y="156" fontSize="11.5" fill="var(--muted-foreground)">
				{t.heapRead}
			</text>

			<line x1="10" y1="176" x2="430" y2="176" stroke="rgb(var(--gray))" strokeOpacity="0.35" />

			<text x="10" y="200" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				{t.seq}
			</text>
			<text x={LEFT} y="222" fontSize="11" fill="var(--foreground)" {...mono}>
				{t.seqNode}
			</text>
			{bar(232, TABLE_PAGES)}
			<text x={LEFT} y="264" fontSize="11.5" fill="var(--muted-foreground)">
				{t.seqRead}
			</text>

			<text x="220" y="292" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.caption}
			</text>
		</svg>
	);
}

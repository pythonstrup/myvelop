// Parquet 단위 3계층 요약도. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
// 파일 → 덩어리(row group) → 청크(column chunk) → 페이지(page)로 한 단계씩 확대한다.
const LABELS = {
	ko: {
		t1: "파일 — 행을 덩어리(row group)로 자른다",
		t2: "덩어리 하나 — 열마다 청크(column chunk)가 하나씩 생긴다",
		t3: "청크 하나 — 크기가 찰 때마다 페이지(page)로 잘린다",
		sum: "건너뛰기는 덩어리 단위 · I/O는 청크 단위 · 압축과 인코딩은 페이지 단위",
		g1: "덩어리 1",
		g2: "덩어리 2",
		toc: "목차",
		c1: "user_id 청크",
		c2: "name 청크",
		c3: "status 청크",
		hdr: "머리말",
		page: "페이지",
		aria: "Parquet의 세 단위를 한 장으로 겹쳐 그린 구조도. 맨 위 파일 막대는 매직넘버 PAR1 사이에 덩어리 1과 덩어리 2, 목차가 차례로 놓인 모습이고, 덩어리는 행 방향으로 자른 단위다. 덩어리 1을 확대한 두 번째 막대에는 user_id, name, status 열마다 청크가 하나씩 있고, 청크는 덩어리와 열이 교차하며 저절로 생기는 단위다. status 청크를 다시 확대한 세 번째 막대는 머리말과 페이지가 번갈아 놓인 모습으로, 페이지는 크기가 찰 때마다 잘리는 단위다. 건너뛰기는 덩어리 단위, I/O는 청크 단위, 압축과 인코딩은 페이지 단위로 움직인다.",
	},
	en: {
		t1: "file — rows are cut into row groups",
		t2: "one row group — one column chunk per column",
		t3: "one chunk — cut into pages as bytes fill up",
		sum: "skipping works per row group · I/O per chunk · compression per page",
		g1: "row group 1",
		g2: "row group 2",
		toc: "footer",
		c1: "user_id chunk",
		c2: "name chunk",
		c3: "status chunk",
		hdr: "header",
		page: "page",
		aria: "A single structural diagram stacking Parquet's three units. The top bar is the file: between the PAR1 magic numbers sit row group 1, row group 2 and the footer; a row group is a horizontal cut of the rows. Zooming into row group 1, the second bar holds one column chunk per column: user_id, name and status; a chunk simply appears where a row group and a column intersect. Zooming into the status chunk, the third bar alternates page headers and pages; a page is cut whenever enough bytes accumulate. Skipping works per row group, I/O per chunk, and compression and encoding per page.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function UnitHierarchyDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const box = {
		fill: "var(--secondary)",
		stroke: "rgb(var(--gray))",
		strokeOpacity: 0.45,
	} as const;
	const hi = {
		fill: "var(--secondary)",
		stroke: "var(--accent)",
		strokeWidth: 1.6,
	} as const;
	const pageBox = {
		fill: "var(--accent)",
		fillOpacity: 0.13,
		stroke: "var(--accent)",
		strokeOpacity: 0.7,
	} as const;
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 7,
		strokeLinejoin: "round",
	} as const;
	const zoom = {
		stroke: "rgb(var(--gray))",
		strokeOpacity: 0.55,
		strokeWidth: 1.2,
		strokeDasharray: "4 3",
	} as const;
	const cell = { fontSize: 11.5, fill: "var(--foreground)", textAnchor: "middle" } as const;
	const title = { fontSize: 13, fontWeight: 600, fill: "var(--foreground)" } as const;
	return (
		<svg
			viewBox="0 0 560 300"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 560, margin: "2rem auto" }}
		>
			{/* ① 파일 */}
			<text x="20" y="16" {...title}>{t.t1}</text>
			<rect x="20" y="26" width="28" height="34" rx="4" {...box} />
			<text x="34" y="47" fontSize="8" fill="var(--muted-foreground)" textAnchor="middle">PAR1</text>
			<rect x="48" y="26" width="204" height="34" rx="4" {...hi} />
			<text x="150" y="47" {...cell}>{t.g1}</text>
			<rect x="252" y="26" width="204" height="34" rx="4" {...box} />
			<text x="354" y="47" {...cell}>{t.g2}</text>
			<rect x="456" y="26" width="56" height="34" rx="4" {...box} />
			<text x="484" y="47" fontSize="11.5" fill="var(--muted-foreground)" textAnchor="middle">{t.toc}</text>
			<rect x="512" y="26" width="28" height="34" rx="4" {...box} />
			<text x="526" y="47" fontSize="8" fill="var(--muted-foreground)" textAnchor="middle">PAR1</text>

			{/* 덩어리 1 확대 */}
			<line x1="48" y1="60" x2="20" y2="120" {...zoom} />
			<line x1="252" y1="60" x2="540" y2="120" {...zoom} />

			{/* ② 덩어리 하나 */}
			<text x="34" y="110" {...title} {...halo}>{t.t2}</text>
			<rect x="20" y="120" width="130" height="34" rx="4" {...box} />
			<text x="85" y="141" {...cell}>{t.c1}</text>
			<rect x="150" y="120" width="156" height="34" rx="4" {...box} />
			<text x="228" y="141" {...cell}>{t.c2}</text>
			<rect x="306" y="120" width="234" height="34" rx="4" {...hi} />
			<text x="423" y="141" {...cell}>{t.c3}</text>

			{/* status 청크 확대 */}
			<line x1="306" y1="154" x2="20" y2="214" {...zoom} />
			<line x1="540" y1="154" x2="540" y2="214" {...zoom} />

			{/* ③ 청크 하나 */}
			<text x="34" y="204" {...title} {...halo}>{t.t3}</text>
			<rect x="20" y="214" width="40" height="34" rx="4" {...box} />
			<text x="40" y="235" fontSize="10" fill="var(--muted-foreground)" textAnchor="middle">{t.hdr}</text>
			<rect x="60" y="214" width="204" height="34" rx="4" {...pageBox} />
			<text x="162" y="235" {...cell}>{t.page}</text>
			<rect x="264" y="214" width="40" height="34" rx="4" {...box} />
			<text x="284" y="235" fontSize="10" fill="var(--muted-foreground)" textAnchor="middle">{t.hdr}</text>
			<rect x="304" y="214" width="236" height="34" rx="4" {...pageBox} />
			<text x="422" y="235" {...cell}>{t.page}</text>

			{/* 요약 */}
			<text x="280" y="284" fontSize="12" fill="var(--muted-foreground)" textAnchor="middle">
				{t.sum}
			</text>
		</svg>
	);
}

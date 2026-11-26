// 책 본문 세 쪽과 뒤쪽 찾아보기를 나란히 그려, 낱말에서 쪽으로 바로 가는 역색인의 생김새를 보이는 그림. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
type Line = { before: number; word?: Word };
type Word = "인덱스" | "해시" | "B-tree";

const WORD_W: Record<Word, number> = { 인덱스: 42, 해시: 32, "B-tree": 44 };
const TARGET: Word = "인덱스";

const PAGES: { no: string; x: number; lines: Line[] }[] = [
	{ no: "12", x: 10, lines: [{ before: 106 }, { before: 30, word: "인덱스" }, { before: 90 }, { before: 46, word: "B-tree" }] },
	{ no: "47", x: 155, lines: [{ before: 14, word: "해시" }, { before: 100 }, { before: 44, word: "인덱스" }, { before: 70 }] },
	{ no: "103", x: 300, lines: [{ before: 106 }, { before: 56, word: "해시" }, { before: 96 }, { before: 60 }] },
];

// 찾아보기는 가나다순으로 한글 낱말을 먼저, 영문을 뒤에 둔다.
const ENTRIES: { word: Word; pages: string }[] = [
	{ word: "인덱스", pages: "12, 47" },
	{ word: "해시", pages: "47, 103" },
	{ word: "B-tree", pages: "12" },
];

const LABELS = {
	ko: {
		body: "본문 — 쪽마다 무슨 내용이 있는지 적는다",
		page: (no: string) => `${no}쪽`,
		index: "찾아보기 — 낱말마다 나오는 쪽",
		caption: "「인덱스」를 찾아보기에서 찾고, 적힌 12쪽과 47쪽으로 바로 간다",
		aria: "책의 본문 세 쪽(12쪽, 47쪽, 103쪽)과 뒤쪽 찾아보기를 그린 그림. 본문에는 쪽마다 인덱스, 해시, B-tree 같은 낱말이 흩어져 있다. 찾아보기는 낱말마다 그 낱말이 나오는 쪽 번호를 적는다. 인덱스 항목에는 12, 47이 적혀 있어 본문을 넘기지 않고 두 쪽으로 바로 간다.",
	},
} as const;
type Lang = keyof typeof LABELS;

const PAGE_Y = 28;
const PAGE_W = 130;
const PAGE_H = 96;
const INNER_W = 106;
const BOX = { x: 90, y: 176, w: 260, h: 96 } as const;
const ARROW_FROM = { x: 318, y: BOX.y } as const;

export default function BookIndexDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const bar = (x: number, y: number, w: number, key: string) =>
		w > 0 ? <rect key={key} x={x} y={y - 3} width={w} height="6" rx="3" fill="rgb(var(--gray))" fillOpacity="0.3" /> : null;
	const chip = (x: number, y: number, word: Word) => {
		const hit = word === TARGET;
		return (
			<g key={`chip-${x}-${y}`}>
				<rect
					x={x}
					y={y - 8}
					width={WORD_W[word]}
					height="16"
					rx="4"
					fill="var(--background)"
					stroke={hit ? "var(--accent)" : "rgb(var(--gray))"}
					strokeOpacity={hit ? 1 : 0.5}
					strokeWidth={hit ? 1.5 : 1}
				/>
				<text x={x + WORD_W[word] / 2} y={y + 4} textAnchor="middle" fontSize="10.5" fontWeight={hit ? 600 : 400} fill="var(--foreground)">
					{word}
				</text>
			</g>
		);
	};
	return (
		<svg
			viewBox="0 0 440 306"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 440, margin: "2rem auto" }}
		>
			<defs>
				<marker id="bi-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent)" />
				</marker>
			</defs>

			<text x="10" y="18" fontSize="12.5" fill="var(--muted-foreground)">
				{t.body}
			</text>
			{PAGES.map((p) => {
				const left = p.x + 12;
				return (
					<g key={p.no}>
						<rect x={p.x} y={PAGE_Y} width={PAGE_W} height={PAGE_H} rx="4" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
						{p.lines.map((l, i) => {
							const y = PAGE_Y + 18 + i * 16;
							if (!l.word) return bar(left, y, l.before, `${p.no}-${i}`);
							const chipX = left + l.before + 4;
							const afterX = chipX + WORD_W[l.word] + 4;
							return (
								<g key={`${p.no}-${i}`}>
									{bar(left, y, l.before, "b")}
									{chip(chipX, y, l.word)}
									{bar(afterX, y, left + INNER_W - afterX, "a")}
								</g>
							);
						})}
						<text x={p.x + PAGE_W / 2} y={PAGE_Y + PAGE_H - 8} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
							{t.page(p.no)}
						</text>
					</g>
				);
			})}

			{PAGES.filter((p) => ENTRIES[0].pages.split(", ").includes(p.no)).map((p) => (
				<line
					key={`arrow-${p.no}`}
					x1={ARROW_FROM.x}
					y1={ARROW_FROM.y}
					x2={p.x + PAGE_W / 2}
					y2={PAGE_Y + PAGE_H + 4}
					stroke="var(--accent)"
					strokeWidth="1.5"
					markerEnd="url(#bi-arrow)"
				/>
			))}

			<rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx="6" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			<text x={BOX.x + 14} y={BOX.y + 16} fontSize="10.5" fill="var(--muted-foreground)">
				{t.index}
			</text>
			{ENTRIES.map((e, i) => {
				const top = BOX.y + 24 + i * 24;
				const hit = e.word === TARGET;
				return (
					<g key={e.word}>
						{hit ? <rect x={BOX.x + 6} y={top} width={BOX.w - 12} height="22" rx="4" fill="var(--accent)" fillOpacity="0.12" /> : null}
						<text x={BOX.x + 14} y={top + 15} fontSize="12" fontWeight={hit ? 600 : 400} fill="var(--foreground)">
							{e.word}
						</text>
						<line x1={BOX.x + 70} y1={top + 12} x2={BOX.x + 190} y2={top + 12} stroke="rgb(var(--gray))" strokeOpacity="0.6" strokeDasharray="1 4" strokeLinecap="round" />
						<text x={BOX.x + BOX.w - 14} y={top + 15} textAnchor="end" fontSize="12" fontWeight="600" fill={hit ? "var(--accent)" : "var(--foreground)"}>
							{e.pages}
						</text>
					</g>
				);
			})}

			<text x="220" y="296" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.caption}
			</text>
		</svg>
	);
}

import { documentOf, expand, type Lang, mergeTouching, type Rect, shrink } from "./detectGeometry";

// 정답 영역을 줄여서 배우는 이유. 같은 두 줄짜리 문서에서, 단어 영역을 그대로 쓰면 위아래 줄이 맞닿아 한 덩어리로 묶이고
// 줄인 영역을 쓰면 단어마다 따로 묶인 뒤 넓혀서 원래 크기가 되는 것을 위아래로 비교한다. 정적 SVG — SSR로만 렌더링한다.
const LABELS = {
	ko: {
		plainTitle: "① 단어 영역을 그대로 배우면",
		plainNote: (n: number, words: number) => `단어 ${words}개 → 덩어리 ${n}개`,
		shrunkTitle: "② 줄인 영역을 배우면",
		shrunkNote: (n: number) => `단어마다 따로, 넓혀서 상자 ${n}개`,
		aria: "정답 영역을 줄여서 배우는 이유를 보여주는 그림. 줄 간격이 좁은 두 줄 '갑과 을은 다음과 같이 / 계약을 체결한다'에서 단어 영역을 그대로 쓰면 위아래 줄의 영역이 맞닿아, 단어 여섯 개가 덩어리 두 개로 묶인다. 테두리를 안쪽으로 줄인 영역을 쓰면 영역끼리 떨어져 단어마다 따로 묶이고, 줄인 만큼 다시 넓히면 단어 여섯 개를 감싸는 상자 여섯 개가 된다.",
	},
	en: {
		plainTitle: "① Learning the word regions as they are",
		plainNote: (n: number, words: number) => `${words} words → ${n} blobs`,
		shrunkTitle: "② Learning shrunken regions",
		shrunkNote: (n: number) => `${n} boxes, one per word`,
		aria: "Why the labels are shrunk. In the tightly spaced two-line text 'Both parties agree / to the following terms', using the word regions as they are makes the regions of the upper and lower lines touch, so seven words are grouped into three blobs. Using regions shrunk inward keeps them apart, so each word forms its own blob, and growing each blob back gives seven boxes, one around each word.",
	},
} as const;

const LEFT = 20;
const WIDTH = 420;

export default function ShrinkDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const doc = documentOf(lang);
	const scale = WIDTH / doc.width;
	const ph = doc.height * scale;
	const merged = mergeTouching(doc.words);
	const shrunk = doc.words.map(shrink);
	const panel2 = 30 + ph + 52;
	const height = panel2 + ph + 14;

	const box = (r: Rect, top: number) => ({
		x: LEFT + r.x0 * scale,
		y: top + r.y0 * scale,
		width: (r.x1 - r.x0) * scale,
		height: (r.y1 - r.y0) * scale,
	});
	const ink = (top: number) =>
		doc.lines.map((line) => (
			<path
				key={line.y}
				d={line.pixels}
				transform={`translate(${LEFT + line.x * scale} ${top + line.y * scale}) scale(${scale})`}
				fill="var(--foreground)"
			/>
		));
	const heading = (y: number, title: string, note: string, color: string) => (
		<>
			<text x={LEFT} y={y} fontSize="15" fontWeight="600" fill="var(--foreground)">
				{title}
			</text>
			<text x={LEFT + WIDTH} y={y} textAnchor="end" fontSize="12.5" fill={color}>
				{note}
			</text>
		</>
	);

	return (
		<svg
			viewBox={`0 0 460 ${height}`}
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			{heading(18, t.plainTitle, t.plainNote(merged.length, doc.words.length), "var(--destructive)")}
			<rect x={LEFT} y={30} width={WIDTH} height={ph} rx="6" fill="var(--secondary)" fillOpacity="0.5" />
			{/* 덩어리 테두리: 상자마다 굵은 테두리를 그린 뒤 같은 상자를 불투명하게 덮으면 겹친 안쪽 선은 가려지고 바깥 윤곽만 남는다 */}
			{doc.words.map((r) => (
				<rect key={`s${r.x0},${r.y0}`} {...box(r, 30)} fill="none" stroke="var(--destructive)" strokeWidth="3" />
			))}
			{doc.words.map((r) => (
				<g key={`b${r.x0},${r.y0}`}>
					<rect {...box(r, 30)} fill="var(--background)" />
					<rect {...box(r, 30)} fill="var(--secondary)" fillOpacity="0.5" />
				</g>
			))}
			{doc.words.map((r) => (
				<rect key={`f${r.x0},${r.y0}`} {...box(r, 30)} fill="var(--destructive)" fillOpacity="0.16" />
			))}
			{ink(30)}

			{heading(panel2 - 12, t.shrunkTitle, t.shrunkNote(shrunk.length), "var(--accent)")}
			<rect x={LEFT} y={panel2} width={WIDTH} height={ph} rx="6" fill="var(--secondary)" fillOpacity="0.5" />
			{shrunk.map((r) => (
				<rect key={`${r.x0},${r.y0}`} {...box(r, panel2)} fill="var(--accent)" fillOpacity="0.28" />
			))}
			{ink(panel2)}
			{shrunk.map((r) => (
				<rect key={`${r.x0},${r.y0}`} {...box(expand(r), panel2)} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
			))}
		</svg>
	);
}

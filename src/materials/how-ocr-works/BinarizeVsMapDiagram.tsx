import { BINARIZED_LINES } from "./binarizedLines";
import { MARGIN, type Rect, shrink, wordBoxes } from "./detectGeometry";

// 고전 OCR의 이진화와 딥러닝 검출의 확률 지도가 같은 줄에서 무엇을 남기는지 비교한다. 정적 SVG — SSR로만 렌더링한다.
// 줄 픽셀은 실측값이고, 도장과 확률 지도는 설명용으로 그렸다. 확률 지도는 DbDetectDemo처럼 줄인 단어 영역을 흐리게 그린다.
// 이진화 결과(흰 바탕에 검은 잉크)와 확률 지도(어두운 바탕에 밝은 글자 영역)는 테마와 상관없는 흑백 이미지라 색을 고정한다.
const MAP_BG = "#0f1115";
const MAP_FG = "#ffffff";
const BIN_BG = "#ffffff";
const BIN_INK = "#000000";

const DATA = {
	ko: { ...BINARIZED_LINES.ko, stamp: { cx: 136, cy: 12, r: 14, mark: "인" } },
	en: { ...BINARIZED_LINES.en, stamp: { cx: 150, cy: 12, r: 14, mark: "印" } },
} as const;

const LABELS = {
	ko: {
		rows: [
			["① 원본", "글자 위에 붉은 도장이 찍혔다"],
			["② 고전 이진화 — 잉크인가?", "획만 남고, 도장도 검게 남는다"],
			["③ 확률 지도 — 글자 영역인가?", "단어가 통째로 밝고, 도장은 빠진다"],
		],
		aria: "같은 줄을 고전 이진화와 확률 지도로 비교한 그림. ① 원본 '계약을 체결한다' 위에 붉은 도장이 겹쳐 찍혀 있다. ② 고전 이진화는 밝기로 잉크인지를 가르므로 획만 검게 남고 글자 사이는 비며, 도장도 글자처럼 검게 남아 글자와 붙는다. ③ 확률 지도는 글자 영역인지를 묻기 때문에 '계약을'과 '체결한다' 두 단어가 각각 한 덩어리로 밝게 나오고, 도장은 어둡게 빠진다.",
	},
	en: {
		rows: [
			["① Original", "a red seal stamped over the text"],
			["② Binarization — ink?", "strokes only, the seal stays"],
			["③ Probability map — text?", "words light up, seal drops out"],
		],
		aria: "The same line seen through classic binarization and a probability map. 1: a red seal is stamped over the original line 'Both parties agree'. 2: classic binarization splits pixels by brightness into ink or not, so only the strokes come out dark with gaps between letters, and the seal also stays dark and merges with the letters. 3: the probability map asks whether a pixel is inside text, so each of the three words lights up as one blob and the seal drops out.",
	},
} as const;
type Lang = keyof typeof LABELS;

const LEFT = 20;
const WIDTH = 420;
const ROW_GAP = 46;

export default function BinarizeVsMapDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const line = DATA[lang];
	const docW = line.w + MARGIN * 2;
	const docH = line.h + MARGIN * 2;
	const scale = WIDTH / docW;
	const ph = docH * scale;
	const tops = [0, 1, 2].map((i) => 30 + i * (ph + ROW_GAP));
	const glow = wordBoxes(line, MARGIN).map(shrink);

	const at = (top: number) => `translate(${LEFT} ${top}) scale(${scale})`;
	const ink = (top: number, fill: string) => (
		<path d={line.pixels} transform={`${at(top)} translate(${MARGIN} ${MARGIN})`} fill={fill} />
	);
	const stamp = (top: number, color: string) => {
		const { cx, cy, r, mark } = line.stamp;
		return (
			<g transform={at(top)}>
				<circle cx={MARGIN + cx} cy={MARGIN + cy} r={r} fill="none" stroke={color} strokeWidth="2.4" />
				<text
					x={MARGIN + cx}
					y={MARGIN + cy + 5.5}
					textAnchor="middle"
					fontSize="15"
					fontWeight="700"
					fill={color}
				>
					{mark}
				</text>
			</g>
		);
	};
	const heading = (i: number) => (
		<>
			<text x={LEFT} y={tops[i] - 12} fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.rows[i][0]}
			</text>
			<text x={LEFT + WIDTH} y={tops[i] - 12} textAnchor="end" fontSize="12.5" fill="var(--muted-foreground)">
				{t.rows[i][1]}
			</text>
		</>
	);
	const rect = (r: Rect, top: number) => ({
		x: LEFT + r.x0 * scale,
		y: top + r.y0 * scale,
		width: (r.x1 - r.x0) * scale,
		height: (r.y1 - r.y0) * scale,
	});

	return (
		<svg
			viewBox={`0 0 460 ${tops[2] + ph + 12}`}
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<defs>
				<filter id="ocr-map-glow" x="-20%" y="-60%" width="140%" height="220%">
					<feGaussianBlur stdDeviation={1.6 * scale} />
				</filter>
			</defs>

			{heading(0)}
			<rect x={LEFT} y={tops[0]} width={WIDTH} height={ph} rx="6" fill="var(--secondary)" fillOpacity="0.5" />
			{ink(tops[0], "var(--foreground)")}
			{stamp(tops[0], "var(--destructive)")}

			{heading(1)}
			<rect x={LEFT} y={tops[1]} width={WIDTH} height={ph} rx="6" fill={BIN_BG} stroke="rgb(var(--gray))" strokeOpacity="0.4" />
			{ink(tops[1], BIN_INK)}
			{stamp(tops[1], BIN_INK)}

			{heading(2)}
			<rect x={LEFT} y={tops[2]} width={WIDTH} height={ph} rx="6" fill={MAP_BG} stroke="rgb(var(--gray))" strokeOpacity="0.4" />
			<g filter="url(#ocr-map-glow)">
				{glow.map((r) => (
					<rect key={r.x0} {...rect(r, tops[2])} fill={MAP_FG} />
				))}
			</g>
			{/* 도장이 있던 자리만 점선으로 남겨 빠졌다는 것을 보인다 */}
			<g transform={at(tops[2])}>
				<circle
					cx={MARGIN + line.stamp.cx}
					cy={MARGIN + line.stamp.cy}
					r={line.stamp.r}
					fill="none"
					stroke={MAP_FG}
					strokeOpacity="0.35"
					strokeWidth="0.8"
					strokeDasharray="2 2"
				/>
			</g>
		</svg>
	);
}

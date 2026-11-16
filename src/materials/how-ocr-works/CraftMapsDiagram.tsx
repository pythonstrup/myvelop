import { BINARIZED_LINES, cropLine } from "./binarizedLines";

// CRAFT가 글자 중심 지도와 글자 사이 지도를 겹쳐 단어 하나로 잇는 과정. 정적 SVG — SSR로만 렌더링한다.
// 줄 픽셀은 실측값이고, 두 지도는 글자 위치에서 계산해 그린 설명용 그림이다. 가우시안 모양은 겹친 타원으로 흉내 낸다.
const DATA = {
	// "계약을" = 0~63열. 계는 0으로 끊긴 두 조각, 약·을은 한 조각
	ko: { ...BINARIZED_LINES.ko, from: 0, to: 63, chars: [[0, 1], [2], [3]] },
	// "agree" = 159~224열, 글자마다 한 조각
	en: { ...BINARIZED_LINES.en, from: 159, to: 224, chars: [[0], [1], [2], [3], [4]] },
} as const;

const LABELS = {
	ko: {
		rows: [
			["① 글자 중심 지도", ["글자마다", "중심이 밝다"]],
			["② 글자 사이 지도", ["이웃한 두 글자", "사이가 밝다"]],
			["③ 둘을 잘라 겹치면", ["이어진 덩어리 하나가", "단어 하나"]],
		],
		aria: "CRAFT가 '계약을'을 찾는 과정. ① 글자 중심 지도에서는 계, 약, 을 세 글자의 중심이 각각 밝다. ② 글자 사이 지도에서는 계와 약 사이, 약과 을 사이가 밝다. ③ 두 지도를 기준값으로 잘라 겹치면 글자 중심들이 글자 사이를 타고 이어져 한 덩어리가 되고, 그 덩어리를 감싼 상자가 단어 하나가 된다.",
	},
	en: {
		rows: [
			["① Character center map", ["bright at the center", "of each character"]],
			["② Character link map", ["bright between", "neighboring characters"]],
			["③ Threshold and overlay", ["one connected blob", "is one word"]],
		],
		aria: "How CRAFT finds 'agree'. 1: in the character center map, the centers of the five letters are bright. 2: in the character link map, the spaces between neighboring letters are bright. 3: thresholding both maps and overlaying them links the letter centers through the spaces between them into one blob, and the box around that blob is one word.",
	},
} as const;
type Lang = keyof typeof LABELS;

const LEFT = 20;
const S = 3.4;
const LAYERS = [1, 0.78, 0.56, 0.34];
const CORE = 0.62;

type Blob = { cx: number; cy: number; rx: number; ry: number };

export default function CraftMapsDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const line = DATA[lang];
	const cols = line.cols.split(",").map(Number);
	const { d, runs } = cropLine(line.pixels, line.from, line.to);

	// 0인 열로 끊긴 조각을 찾고, 조각을 글자로 묶어 글자마다 잉크의 가로·세로 범위를 잰다
	const pieces: [number, number][] = [];
	for (let x = 0; x <= line.to - line.from; x++) {
		if (!cols[line.from + x]) continue;
		const last = pieces.at(-1);
		if (last && last[1] === x - 1) last[1] = x;
		else pieces.push([x, x]);
	}
	const charPieces: readonly (readonly number[])[] = line.chars;
	const chars: Blob[] = charPieces.map((ids) => {
		const a = pieces[ids[0]][0];
		const b = pieces[ids[ids.length - 1]][1];
		const ys = runs.filter(([x0, , x1]) => x0 <= b && x1 >= a).map(([, y]) => y);
		const y0 = Math.min(...ys);
		const y1 = Math.max(...ys) + 1;
		return { cx: (a + b + 1) / 2, cy: (y0 + y1) / 2, rx: (b - a + 1) / 2, ry: (y1 - y0) / 2 };
	});
	// 글자 사이 지도는 이웃한 두 글자 중심의 가운데에 놓는다
	const links: Blob[] = chars.slice(1).map((c, i) => {
		const p = chars[i];
		return { cx: (p.cx + c.cx) / 2, cy: (p.cy + c.cy) / 2, rx: (c.cx - p.cx) * 0.36, ry: Math.min(p.ry, c.ry) * 0.7 };
	});

	const width = (line.to - line.from + 1) * S;
	const ph = line.h * S + 16;
	const tops = [0, 1, 2].map((i) => 30 + i * (ph + 44));
	const crop = (top: number, opacity: number) => (
		<path d={d} transform={`translate(${LEFT + 8} ${top + 8}) scale(${S})`} fill="var(--foreground)" opacity={opacity} />
	);
	const at = (b: Blob, top: number, k: number) => ({
		cx: LEFT + 8 + b.cx * S,
		cy: top + 8 + b.cy * S,
		rx: b.rx * S * k,
		ry: b.ry * S * k,
	});
	const glow = (blobs: Blob[], top: number, color: string) =>
		blobs.flatMap((b, i) =>
			LAYERS.map((k) => <ellipse key={`${i}-${k}`} {...at(b, top, k)} fill={color} fillOpacity="0.2" />),
		);
	const heading = (i: number) => (
		<>
			<text x={LEFT} y={tops[i] - 12} fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.rows[i][0]}
			</text>
			{t.rows[i][1].map((note, k) => (
				<text key={note} x={LEFT + width + 32} y={tops[i] + ph / 2 - 3 + k * 17} fontSize="12.5" fill="var(--muted-foreground)">
					{note}
				</text>
			))}
		</>
	);
	const panel = (top: number) => (
		<rect x={LEFT} y={top} width={width + 16} height={ph} rx="6" fill="var(--secondary)" fillOpacity="0.5" />
	);

	// ③ 덩어리를 감싼 상자: 잘라 낸 핵심 타원들의 바깥 범위
	const cores = [...chars.map((b) => at(b, tops[2], CORE)), ...links.map((b) => at(b, tops[2], CORE * 1.6))];
	const box = {
		x0: Math.min(...cores.map((e) => e.cx - e.rx)) - 4,
		x1: Math.max(...cores.map((e) => e.cx + e.rx)) + 4,
		y0: Math.min(...cores.map((e) => e.cy - e.ry)) - 4,
		y1: Math.max(...cores.map((e) => e.cy + e.ry)) + 4,
	};

	return (
		<svg
			viewBox={`0 0 460 ${tops[2] + ph + 12}`}
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			{heading(0)}
			{panel(tops[0])}
			{crop(tops[0], 0.3)}
			{glow(chars, tops[0], "var(--accent)")}

			{heading(1)}
			{panel(tops[1])}
			{crop(tops[1], 0.3)}
			{glow(links, tops[1], "var(--destructive)")}

			{heading(2)}
			{panel(tops[2])}
			{crop(tops[2], 0.3)}
			{chars.map((b, i) => (
				<ellipse key={`c${i}`} {...at(b, tops[2], CORE)} fill="var(--accent)" fillOpacity="0.75" />
			))}
			{links.map((b, i) => (
				<ellipse key={`l${i}`} {...at(b, tops[2], CORE * 1.6)} fill="var(--destructive)" fillOpacity="0.6" />
			))}
			<rect
				x={box.x0}
				y={box.y0}
				width={box.x1 - box.x0}
				height={box.y1 - box.y0}
				rx="3"
				fill="none"
				stroke="var(--foreground)"
				strokeWidth="1.5"
			/>
		</svg>
	);
}

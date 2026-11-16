import { BINARIZED_LINES, EXTRA_LINES } from "./binarizedLines";

// DbDetectDemo와 ShrinkDiagram이 함께 쓰는 두 줄짜리 문서와 DBNet 방식의 상자 계산.
// 정답 영역을 줄이는 폭과 다시 넓히는 폭은 DBNet 논문의 식을 그대로 쓴다. A는 넓이, L은 둘레다.
//   줄이기 D = A(1 − r²) / L, r = 0.4
//   넓히기 D′ = A′ × r′ / L′, r′ = 1.5
// ponytail: 상자가 모두 직사각형이라 Vatti clipping 대신 네 변을 같은 폭만큼 옮긴다.

export type Rect = { x0: number; y0: number; x1: number; y1: number };
type Line = { readonly w: number; readonly h: number; readonly pixels: string; readonly cols: string };

export const MARGIN = 8; // 문서 테두리 여백
const PAD = 2; // 정답 상자를 잉크보다 넓게 잡는 여백
const LINE_GAP = 3; // 두 줄 사이 잉크 간격. 위아래 정답 상자가 맞닿을 만큼 좁다
const WORD_GAP = 6; // 빈 열이 이보다 길게 이어지면 단어 사이로 본다

const PAIRS = {
	ko: [EXTRA_LINES.ko, BINARIZED_LINES.ko],
	en: [BINARIZED_LINES.en, EXTRA_LINES.en],
} as const;
export type Lang = keyof typeof PAIRS;

// 잉크가 있는 열을 단어 단위로 묶고, 단어마다 잉크를 PAD만큼 감싼 정답 상자를 만든다. 줄은 MARGIN만큼 들여 놓는다고 본다
export function wordBoxes(line: Line, top: number): Rect[] {
	const runs = [...line.pixels.matchAll(/M(\d+) (\d+)h(\d+)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
	const spans: [number, number][] = [];
	let gap = Number.POSITIVE_INFINITY;
	line.cols.split(",").forEach((count, x) => {
		if (count === "0") {
			gap++;
			return;
		}
		const last = spans.at(-1);
		if (last && gap <= WORD_GAP) last[1] = x;
		else spans.push([x, x]);
		gap = 0;
	});
	return spans.map(([a, b]) => {
		const ys = runs.filter(([x, , n]) => x <= b && x + n > a).map(([, y]) => y);
		return {
			x0: MARGIN + a - PAD,
			x1: MARGIN + b + 1 + PAD,
			y0: top + Math.min(...ys) - PAD,
			y1: top + Math.max(...ys) + 1 + PAD,
		};
	});
}

export function documentOf(lang: Lang) {
	const [first, second] = PAIRS[lang];
	const top2 = MARGIN + first.h + LINE_GAP;
	return {
		lines: [
			{ pixels: first.pixels, x: MARGIN, y: MARGIN },
			{ pixels: second.pixels, x: MARGIN, y: top2 },
		],
		width: Math.max(first.w, second.w) + MARGIN * 2,
		height: top2 + second.h + MARGIN,
		words: [...wordBoxes(first, MARGIN), ...wordBoxes(second, top2)],
	};
}

const area = (r: Rect) => (r.x1 - r.x0) * (r.y1 - r.y0);
const perimeter = (r: Rect) => 2 * (r.x1 - r.x0 + r.y1 - r.y0);
const grow = (r: Rect, d: number): Rect => ({ x0: r.x0 - d, y0: r.y0 - d, x1: r.x1 + d, y1: r.y1 + d });

export const shrink = (r: Rect) => grow(r, -(area(r) * (1 - 0.4 ** 2)) / perimeter(r));
export const expand = (r: Rect) => grow(r, (area(r) * 1.5) / perimeter(r));

// 맞닿거나 겹치는 상자끼리 한 덩어리로 묶어 덩어리마다 바깥 상자를 돌려준다
export function mergeTouching(rects: Rect[]): Rect[] {
	const touch = (a: Rect, b: Rect) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
	const groups: Rect[][] = [];
	for (const r of rects) {
		const hits = groups.filter((g) => g.some((m) => touch(m, r)));
		const merged = [...hits.flat(), r];
		groups.splice(0, groups.length, ...groups.filter((g) => !hits.includes(g)), merged);
	}
	return groups.map((g) => ({
		x0: Math.min(...g.map((r) => r.x0)),
		y0: Math.min(...g.map((r) => r.y0)),
		x1: Math.max(...g.map((r) => r.x1)),
		y1: Math.max(...g.map((r) => r.y1)),
	}));
}

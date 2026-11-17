import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";
import { LAYOUT_SCAN } from "./layoutScan";

// Tesseract가 페이지를 나누는 네 단계를 반복 재생한다.
// 바탕 밝기가 고르지 않은 계약서 조각 스캔을 Otsu 기준값 하나로 흑백으로 바꾸고, 이어진 검은 픽셀 덩어리를 찾고,
// 덩어리를 줄과 단어로 묶은 뒤, 단을 나눠 읽는 순서를 매긴다.
// 기준값·흑백 이미지·연결 요소는 layoutScan의 밝기 값에서 이 파일이 직접 계산한다.
// 줄·단어·블록 묶기는 고정 간격으로 나눈 설명용 규칙이고, Tesseract의 실제 판정 방식은 아니다.
const UNTIL = [4200, 7800, 11800, 17000];
const CYCLE = 17000;
const HEIGHT = 286;
const IMG_MAX_H = 170;
// 이미지 아래에 붙는 정보 줄(막대그래프·개수)과 캡션의 높이. 이미지와 함께 세로 가운데에 놓는다
const BELOW_H = 94;
// 원본 픽셀 단위 간격. 덩어리 사이가 이보다 멀면 다른 줄·단어·블록으로 본다
const LINE_GAP = 10;
const WORD_GAP = 3;
const BLOCK_GAP = 12;

const LABELS = {
	captions: [
		"① 밝기 분포로 기준값을 정해 흑백으로 바꾼다",
		"② 이어진 검은 픽셀 덩어리를 찾는다",
		"③ 덩어리를 줄로 묶고 줄을 단어로 나눈다",
		"④ 단을 나눠 읽는 순서를 정한다",
	],
	dark: "어두움",
	light: "밝음",
	histogram: "밝기 분포",
	threshold: "Otsu 기준값",
	components: (chars: number, n: number) => `글자 ${chars}자 → 덩어리 ${n}개`,
	lines: (lines: number, words: number) => (words ? `줄 ${lines}개 · 단어 ${words}개` : `줄 ${lines}개`),
	order: "왼쪽 단을 다 읽은 뒤 오른쪽 단으로 간다",
	aria: (chars: number, comps: number, lines: number, words: number) =>
		`Tesseract가 페이지를 나누는 네 단계를 반복 재생하는 애니메이션. 바탕 밝기가 고르지 않은 계약서 조각 스캔에서 시작한다. 제목 '임대차 계약서' 아래 왼쪽 단에는 '계약 기간은', '2년으로 한다' 두 줄이, 오른쪽 단에는 '보증금은', '500만 원이다' 두 줄이 있다. 먼저 밝기 분포에서 Otsu 기준값 하나를 정해 이미지를 흑백으로 바꾼다. 이어진 검은 픽셀 덩어리를 찾으면 글자 ${chars}자가 덩어리 ${comps}개로 나뉜다. 한 글자 안에서도 자음과 모음이 떨어져 있으면 다른 덩어리가 된다. 덩어리를 기준선에 맞춰 줄 ${lines}개로 묶고, 간격을 보고 단어 ${words}개로 나눈다. 마지막으로 제목과 두 단을 블록으로 나누고 제목, 왼쪽 단, 오른쪽 단 순서로 줄마다 읽는 번호를 매긴다.`,
};

type Box = { x0: number; y0: number; x1: number; y1: number };
type Run = { x: number; y: number; len: number; v: number };

const { w: W, h: H } = LAYOUT_SCAN;
const GRAY = LAYOUT_SCAN.rows.map((row) => Array.from(row, (ch) => Number.parseInt(ch, 16)));
const CHARS = LAYOUT_SCAN.text.join("").replaceAll(" ", "").length;

const union = (a: Box, b: Box): Box => ({
	x0: Math.min(a.x0, b.x0),
	y0: Math.min(a.y0, b.y0),
	x1: Math.max(a.x1, b.x1),
	y1: Math.max(a.y1, b.y1),
});

// 밝기 16단계의 막대그래프에서 두 무리의 분산 차가 가장 큰 자리를 고른다. 이 값 이하가 검은 픽셀이다
function otsu(hist: readonly number[]) {
	const total = hist.reduce((s, n) => s + n, 0);
	const sumAll = hist.reduce((s, n, v) => s + n * v, 0);
	let best = { t: 0, score: -1 };
	let count = 0;
	let sum = 0;
	for (let t = 0; t < hist.length - 1; t++) {
		count += hist[t];
		sum += t * hist[t];
		const rest = total - count;
		if (!count || !rest) continue;
		const d = sum / count - (sumAll - sum) / rest;
		const score = count * rest * d * d;
		if (score > best.score) best = { t, score };
	}
	return best.t;
}

const HIST = Array.from({ length: 16 }, (_, v) => GRAY.flat().filter((g) => g === v).length);
const THRESHOLD = otsu(HIST);
const INK = GRAY.map((row) => row.map((v) => v <= THRESHOLD));

// 행마다 같은 값이 이어진 구간을 사각형 하나로 그린다
function toRuns(rows: readonly (readonly number[])[]) {
	const runs: Run[] = [];
	rows.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			let len = 1;
			while (x + len < row.length && row[x + len] === row[x]) len++;
			runs.push({ x, y, len, v: row[x] });
			x += len;
		}
	});
	return runs;
}
const GRAY_RUNS = toRuns(GRAY).filter((r) => r.v < 15);
const INK_RUNS = toRuns(INK.map((row) => row.map(Number))).filter((r) => r.v === 1);

// 8방향으로 이어진 검은 픽셀을 한 덩어리로 묶는다
function components(ink: readonly (readonly boolean[])[]) {
	const seen = ink.map((row) => row.map(() => false));
	const boxes: Box[] = [];
	ink.forEach((row, y) =>
		row.forEach((on, x) => {
			if (!on || seen[y][x]) return;
			seen[y][x] = true;
			let box = { x0: x, y0: y, x1: x + 1, y1: y + 1 };
			const stack = [[x, y]];
			for (let p = stack.pop(); p; p = stack.pop()) {
				const [cx, cy] = p;
				box = union(box, { x0: cx, y0: cy, x1: cx + 1, y1: cy + 1 });
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						const nx = cx + dx;
						const ny = cy + dy;
						if (!ink[ny]?.[nx] || seen[ny][nx]) continue;
						seen[ny][nx] = true;
						stack.push([nx, ny]);
					}
				}
			}
			boxes.push(box);
		}),
	);
	return boxes.sort((a, b) => a.x0 - b.x0);
}
const COMPONENTS = components(INK);

const overlapY = (a: Box, b: Box) => Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);

// 왼쪽부터 덩어리를 보며 높이가 절반 이상 겹치고 가까이 붙은 줄에 넣는다
function groupLines(comps: readonly Box[]) {
	const lines: { box: Box; parts: Box[] }[] = [];
	for (const c of comps) {
		const line = lines.find(
			(l) => overlapY(l.box, c) >= Math.min(c.y1 - c.y0, l.box.y1 - l.box.y0) / 2 && c.x0 - l.box.x1 <= LINE_GAP,
		);
		if (line) {
			line.box = union(line.box, c);
			line.parts.push(c);
		} else lines.push({ box: c, parts: [c] });
	}
	// 줄 안에서 덩어리 사이가 WORD_GAP보다 벌어지면 단어를 끊는다
	return lines.map(({ box, parts }) => {
		const words: Box[] = [];
		for (const p of parts) {
			const last = words.at(-1);
			if (last && p.x0 - last.x1 <= WORD_GAP) words[words.length - 1] = union(last, p);
			else words.push(p);
		}
		return { box, words };
	});
}
type Line = ReturnType<typeof groupLines>[number];

// 위에서부터 줄을 보며 가로로 겹치고 바로 아래에 붙은 줄을 같은 블록에 넣는다.
// 블록은 위→아래, 왼쪽→오른쪽 순으로 읽고, 블록 안의 줄은 위에서 아래로 읽는다
function groupBlocks(lines: readonly Line[]) {
	const blocks: { box: Box; lines: Line[] }[] = [];
	for (const line of [...lines].sort((a, b) => a.box.y0 - b.box.y0)) {
		const block = blocks.find((b) => {
			const last = b.lines[b.lines.length - 1].box;
			const overlapX = Math.min(last.x1, line.box.x1) - Math.max(last.x0, line.box.x0);
			return overlapX > 0 && line.box.y0 - last.y1 <= BLOCK_GAP;
		});
		if (block) {
			block.box = union(block.box, line.box);
			block.lines.push(line);
		} else blocks.push({ box: line.box, lines: [line] });
	}
	return blocks.sort((a, b) => a.box.y0 - b.box.y0 || a.box.x0 - b.box.x0);
}
const LINES = groupLines(COMPONENTS).sort((a, b) => a.box.y0 - b.box.y0 || a.box.x0 - b.box.x0);
const BLOCKS = groupBlocks(LINES);
const READING = BLOCKS.flatMap((b) => b.lines);
const WORDS = LINES.flatMap((l) => l.words);

const fade = (t: number, at: number, dur = 300) => clamp01((t - at) / dur);

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);

	// 원본 픽셀 좌표 → 화면 좌표. 정수로 맞춰 사각형 사이에 틈이 생기지 않게 한다
	const s = Math.min((w - 16) / W, IMG_MAX_H / H, 3);
	const iw = Math.round(W * s);
	const ih = Math.round(H * s);
	const ix = Math.round((w - iw) / 2);
	const iy = Math.round((HEIGHT - ih - BELOW_H) / 2);
	const infoTop = iy + ih + 14;
	const X = (x: number) => ix + Math.round(x * s);
	const Y = (y: number) => iy + Math.round(y * s);
	const fillRuns = (runs: readonly Run[], alpha: (v: number) => number) => {
		ctx.fillStyle = c.text;
		for (const r of runs) {
			ctx.globalAlpha = alpha(r.v);
			ctx.fillRect(X(r.x), Y(r.y), X(r.x + r.len) - X(r.x), Y(r.y + 1) - Y(r.y));
		}
		ctx.globalAlpha = 1;
	};
	const strokeBox = (b: Box, pad: number, color: string, alpha: number, width = 1.2, radius = 2) => {
		if (alpha <= 0) return;
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.beginPath();
		ctx.roundRect(X(b.x0) - pad + 0.5, Y(b.y0) - pad + 0.5, X(b.x1) - X(b.x0) + pad * 2 - 1, Y(b.y1) - Y(b.y0) + pad * 2 - 1, radius);
		ctx.stroke();
		ctx.globalAlpha = 1;
	};
	const info = (text: string, alpha = 1) => {
		ctx.globalAlpha = alpha;
		ctx.fillStyle = c.sub;
		ctx.font = `500 12.5px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, w / 2, infoTop + 28);
		ctx.globalAlpha = 1;
	};

	// 종이
	ctx.fillStyle = c.boxFill;
	ctx.fillRect(ix, iy, iw, ih);
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1;
	ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);

	// ① 회색 스캔에서 흑백으로 바뀐다
	const bw = ease(fade(t, 2600, 800));
	if (bw < 1) fillRuns(GRAY_RUNS, (v) => ((1 - bw) * (15 - v)) / 16);
	if (bw > 0) fillRuns(INK_RUNS, () => bw);

	if (step === 0) {
		const hw = Math.min(iw, 240);
		const hx = (w - hw) / 2;
		const barW = hw / HIST.length;
		const base = infoTop + 42;
		const max = Math.sqrt(Math.max(...HIST));
		const grow = ease(fade(t, 400, 900));
		const cut = fade(t, 1600, 400);
		// 막대 높이는 제곱근으로 줄였다. 바탕 픽셀이 글자보다 훨씬 많아서다
		HIST.forEach((n, v) => {
			const h = (Math.sqrt(n) / max) * 30 * grow;
			ctx.fillStyle = cut > 0 && v <= THRESHOLD ? c.text : c.sub;
			ctx.globalAlpha = fade(t, 400) * (cut > 0 && v > THRESHOLD ? 0.6 : 1);
			ctx.fillRect(hx + v * barW + 1, base - h, barW - 2, h);
		});
		ctx.globalAlpha = fade(t, 400);
		ctx.fillStyle = c.sub;
		ctx.font = `500 11px ${FONT}`;
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		ctx.fillText(LABELS.dark, hx, base + 12);
		ctx.textAlign = "right";
		ctx.fillText(LABELS.light, hx + hw, base + 12);
		ctx.textAlign = "center";
		ctx.fillText(LABELS.histogram, hx + hw / 2, base + 12);
		if (cut > 0) {
			const tx = hx + (THRESHOLD + 1) * barW;
			ctx.globalAlpha = cut;
			ctx.strokeStyle = c.red;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(tx, infoTop + 6);
			ctx.lineTo(tx, base + 2);
			ctx.stroke();
			ctx.fillStyle = c.red;
			ctx.textAlign = "left";
			ctx.fillText(LABELS.threshold, tx + 5, infoTop + 6);
		}
		ctx.globalAlpha = 1;
	}

	// ② 왼쪽부터 훑으며 덩어리마다 상자를 친다. ③에서 흐려지다 사라진다
	const sweep = ((t - UNTIL[0] - 200) / 2600) * (W + 8);
	const compAlpha = step === 1 ? 1 : step === 2 ? 1 - 0.7 * fade(t, UNTIL[1] + 100, 500) - 0.3 * fade(t, UNTIL[1] + 1800, 600) : 0;
	if (compAlpha > 0) {
		for (const b of COMPONENTS) strokeBox(b, 1, c.amber, compAlpha * clamp01((sweep - b.x0) / 8), 1, 1);
	}
	if (step === 1) {
		if (sweep > 0 && sweep < W) {
			ctx.globalAlpha = 0.6;
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(X(sweep), iy - 4);
			ctx.lineTo(X(sweep), iy + ih + 4);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
		info(LABELS.components(CHARS, COMPONENTS.filter((b) => sweep > b.x0).length), fade(t, UNTIL[0]));
	}

	// ③ 줄마다 기준선을 긋고, 줄을 단어로 나눈다. ④에서 기준선은 지우고 단어 상자는 흐리게 남긴다
	const later = step === 3 ? 1 - 0.65 * fade(t, UNTIL[2] + 100, 500) : 1;
	if (step >= 2) {
		LINES.forEach((line, i) => {
			const at = UNTIL[1] + 200 + i * 250;
			const p = ease(fade(t, at, 500));
			if (p <= 0) return;
			const y = Y(line.box.y1) + 5.5;
			ctx.globalAlpha = step === 3 ? 1 - fade(t, UNTIL[2] + 100, 500) : 1;
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(X(line.box.x0) - 2, y);
			ctx.lineTo(X(line.box.x0) - 2 + (X(line.box.x1) - X(line.box.x0) + 4) * p, y);
			ctx.stroke();
			ctx.globalAlpha = 1;
		});
		const wordAt = (j: number) => UNTIL[1] + 1900 + j * 140;
		WORDS.forEach((word, j) => strokeBox(word, 3, c.green, fade(t, wordAt(j), 250) * later, 1.4, 3));
		if (step === 2) {
			const lines = LINES.filter((_, i) => t >= UNTIL[1] + 200 + i * 250).length;
			const words = WORDS.filter((_, j) => t >= wordAt(j)).length;
			info(LABELS.lines(lines, words), fade(t, UNTIL[1] + 200));
		}
	}

	// ④ 블록을 나누고 줄마다 읽는 순서를 매긴다
	if (step === 3) {
		ctx.save();
		ctx.setLineDash([4, 3]);
		BLOCKS.forEach((block, k) => strokeBox(block.box, 6, c.sub, fade(t, UNTIL[2] + 300 + k * 300, 400), 1.2, 4));
		ctx.restore();
		READING.forEach((line, i) => {
			const block = BLOCKS.find((b) => b.lines.includes(line));
			const left = block ? X(block.box.x0) - 6 : X(line.box.x0);
			const cy = (Y(line.box.y0) + Y(line.box.y1)) / 2;
			drawBadge(ctx, left - 13, cy, String(i + 1), c.blueFill, c.blue, fade(t, UNTIL[2] + 1300 + i * 500, 300));
		});
		info(LABELS.order, fade(t, UNTIL[2] + 1300 + READING.length * 500, 400));
	}

	// 하단 캡션
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(LABELS.captions[step], w / 2, infoTop + 80);
}

export default function TesseractLayoutDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas
				ref={canvasRef}
				role="img"
				aria-label={LABELS.aria(CHARS, COMPONENTS.length, LINES.length, WORDS.length)}
				style={{ display: "block", width: "100%" }}
			/>
		</div>
	);
}

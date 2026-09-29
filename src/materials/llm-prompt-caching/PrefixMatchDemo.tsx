import { type Colors, clamp01, FONT, palette, useCanvasScene } from "@/materials/shared";

// 캐시에 있는 앞부분과 두 요청을 비교한다. 요청 1은 앞부분이 같고, 요청 2는 system 앞머리가 바뀌었다.
// 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const UNTIL = [1400, 3200, 4400, 5800, 7000, 8400, 10000, 12400];
const CYCLE = 12400;
const HEIGHT = 246;

// 칸 하나가 100토큰이다. 앞부분 16칸 뒤에 새 질문 2칸이 붙는다.
const SEGMENTS = [
	{ name: "tools", cells: 3 },
	{ name: "system", cells: 7 },
	{ name: "messages", cells: 6 },
];
const PREFIX = 16;
const NEW = 2;
const CHANGED = 3; // system 앞머리 칸
const PER_CELL = 100;

const CELL_H = 20;
const CACHE_Y = 24;
const REQ1_Y = 92;
const REQ2_Y = 160;

type Labels = {
	captions: string[];
	cache: string;
	req1: string;
	req2: string;
	newQ: string;
	computed: (n: number) => string;
	read: (n: number) => string;
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		captions: [
			"① 캐시에 이전 요청의 앞부분이 있다",
			"② 앞부분이 같으면 끝까지 읽는다",
			"③ 새 질문만 새로 계산한다",
			"④ system 앞머리에 현재 시각이 들어갔다",
			"⑤ 바뀐 칸 앞까지만 읽는다",
			"⑥ 그 뒤로는 K·V가 전부 달라진다",
			"⑦ 바뀐 칸부터 끝까지 다시 계산한다",
			"⑧ 바뀌는 값은 앞이 아니라 뒤에 둔다",
		],
		cache: "캐시에 있는 앞부분",
		req1: "요청 1 · 앞부분이 같다",
		req2: "요청 2 · system 앞머리에 현재 시각",
		newQ: "새 질문",
		computed: (n) => `새로 계산 ${n.toLocaleString("ko-KR")} 토큰`,
		read: (n) => `캐시 읽기 ${n.toLocaleString("ko-KR")} 토큰`,
		aria: "캐시에 있는 앞부분(tools 3칸, system 7칸, messages 6칸)과 요청 두 개를 비교하며 반복 재생하는 애니메이션. 앞부분이 같은 요청 1은 1,600토큰을 전부 캐시에서 읽고 새 질문 200토큰만 계산한다. system 앞머리에 현재 시각이 들어간 요청 2는 바뀐 칸 앞의 tools 300토큰만 읽고, 그 뒤는 K·V가 모두 달라져 1,500토큰을 다시 계산한다.",
	},
	en: {
		captions: [
			"① The cache holds an earlier request's prefix",
			"② Same prefix: read all the way to the end",
			"③ Compute only the new question",
			"④ The current time lands at the top of system",
			"⑤ Read only up to the changed cell",
			"⑥ Every K·V after it changes",
			"⑦ Recompute from the changed cell to the end",
			"⑧ Put changing values last, not first",
		],
		cache: "Prefix in the cache",
		req1: "Request 1 · same prefix",
		req2: "Request 2 · current time at the top of system",
		newQ: "New",
		computed: (n) => `Computed ${n.toLocaleString("en-US")}`,
		read: (n) => `cache read ${n.toLocaleString("en-US")} tokens`,
		aria: "Looping animation comparing the prefix in the cache (3 cells of tools, 7 of system, 6 of messages) with two requests. Request 1 has the same prefix, so it reads all 1,600 tokens from the cache and computes only the new 200-token question. Request 2 has the current time at the top of system, so it reads only the 300 tokens of tools before the changed cell; every K·V after it changes and 1,500 tokens are recomputed.",
	},
};
type Lang = keyof typeof LABELS;

// 앞부분 16칸과 새 질문 2칸을 한 줄에 놓고 가운데 맞춘다.
function layout(w: number) {
	const gap = 2;
	const newGap = 8;
	const cells = PREFIX + NEW;
	const fixed = gap * (cells - 2) + newGap;
	const cellW = Math.min(26, (w - 16 - fixed) / cells);
	const left = (w - (cellW * cells + fixed)) / 2;
	const pitch = cellW + gap;
	const x = (i: number) => (i < PREFIX ? left + i * pitch : left + PREFIX * pitch - gap + newGap + (i - PREFIX) * pitch);
	return { cellW, x };
}
type Layout = ReturnType<typeof layout>;

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, fill: string, stroke: string, alpha = 1) {
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.beginPath();
	ctx.roundRect(x, y, w, CELL_H, 3);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, c: Colors, text: string, x: number, y: number) {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(text, x, y);
}

function drawCounter(ctx: CanvasRenderingContext2D, c: Colors, L: Labels, x: number, y: number, computed: number, read: number) {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 11px ${FONT}`;
	const a = L.computed(computed);
	const dot = " · ";
	ctx.fillStyle = c.blue;
	ctx.fillText(a, x, y);
	const dx = x + ctx.measureText(a).width;
	ctx.fillStyle = c.sub;
	ctx.fillText(dot, dx, y);
	ctx.fillStyle = c.green;
	ctx.fillText(L.read(read), dx + ctx.measureText(dot).width, y);
}

// tools·system·messages 구간을 캐시 행 아래 괄호로 표시한다.
function drawSegments(ctx: CanvasRenderingContext2D, c: Colors, g: Layout) {
	const y = CACHE_Y + CELL_H + 6;
	let start = 0;
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 10px ${FONT}`;
	ctx.fillStyle = c.sub;
	for (const seg of SEGMENTS) {
		const x0 = g.x(start) + 1;
		const x1 = g.x(start + seg.cells - 1) + g.cellW - 1;
		ctx.beginPath();
		ctx.moveTo(x0, y - 3);
		ctx.lineTo(x0, y);
		ctx.lineTo(x1, y);
		ctx.lineTo(x1, y - 3);
		ctx.stroke();
		ctx.fillText(seg.name, (x0 + x1) / 2, y + 10);
		start += seg.cells;
	}
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const g = layout(w);
		const step = UNTIL.findIndex((u) => t < u);
		const from = step === 0 ? 0 : UNTIL[step - 1];
		const p = clamp01((t - from) / (UNTIL[step] - from));

		// 칸의 반을 넘게 지나가면 처리된 것으로 센다. at(s, n)은 s단계 동안 0에서 n으로 늘어난다.
		const done = (s: number) => Math.max(0, Math.ceil(s - 0.5));
		const at = (s: number, n: number) => (step < s ? 0 : step === s ? p * n : n);

		// 캐시 행
		drawLabel(ctx, c, L.cache, g.x(0), CACHE_Y - 9);
		for (let i = 0; i < PREFIX; i++) drawCell(ctx, g.x(i), CACHE_Y, g.cellW, c.amberFill, c.amber);
		drawSegments(ctx, c, g);

		// 요청 1: ② 앞부분 16칸을 전부 읽고 ③ 새 질문 2칸만 계산한다
		const read1 = done(at(1, PREFIX));
		const comp1 = done(at(2, NEW));
		ctx.save();
		ctx.globalAlpha = step < 1 ? 0.35 : 1;
		drawLabel(ctx, c, L.req1, g.x(0), REQ1_Y - 9);
		drawLabel(ctx, c, L.newQ, g.x(PREFIX), REQ1_Y - 9);
		for (let i = 0; i < PREFIX + NEW; i++) {
			if (i < read1) drawCell(ctx, g.x(i), REQ1_Y, g.cellW, c.greenFill, c.green);
			else if (i >= PREFIX && i - PREFIX < comp1) drawCell(ctx, g.x(i), REQ1_Y, g.cellW, c.blueFill, c.blue);
			else drawCell(ctx, g.x(i), REQ1_Y, g.cellW, c.boxFill, c.boxStroke);
		}
		if (step >= 1) drawCounter(ctx, c, L, g.x(0), REQ1_Y + CELL_H + 13, comp1 * PER_CELL, read1 * PER_CELL);
		ctx.restore();

		// 요청 2: ⑤ 바뀐 칸 앞까지 읽고 ⑥ 그 뒤가 무효가 된 뒤 ⑦ 바뀐 칸부터 다시 계산한다
		const read2 = done(at(4, CHANGED));
		const ripple = done(at(5, PREFIX - CHANGED - 1));
		const comp2 = done(at(6, PREFIX - CHANGED + NEW));
		ctx.save();
		ctx.globalAlpha = step < 3 ? 0.35 : 1;
		drawLabel(ctx, c, L.req2, g.x(0), REQ2_Y - 9);
		drawLabel(ctx, c, L.newQ, g.x(PREFIX), REQ2_Y - 9);
		for (let i = 0; i < PREFIX + NEW; i++) {
			const x = g.x(i);
			if (i < read2) drawCell(ctx, x, REQ2_Y, g.cellW, c.greenFill, c.green);
			else if (i >= CHANGED && i - CHANGED < comp2) drawCell(ctx, x, REQ2_Y, g.cellW, c.blueFill, c.blue);
			else if (i === CHANGED && step >= 3) drawCell(ctx, x, REQ2_Y, g.cellW, c.redFill, c.red);
			else if (i > CHANGED && i < PREFIX && i - CHANGED - 1 < ripple) drawCell(ctx, x, REQ2_Y, g.cellW, c.redFill, c.red, 0.55);
			else drawCell(ctx, x, REQ2_Y, g.cellW, c.boxFill, c.boxStroke);
		}
		if (step >= 4) drawCounter(ctx, c, L, g.x(0), REQ2_Y + CELL_H + 13, comp2 * PER_CELL, read2 * PER_CELL);
		ctx.restore();

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function PrefixMatchDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

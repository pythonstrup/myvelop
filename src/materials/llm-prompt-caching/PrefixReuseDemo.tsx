import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 1회차는 입력 전체를 계산하고 앞부분 KV를 캐시에 쓴다. 2회차는 그 KV를 읽고 질문만 계산한다.
// 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const UNTIL = [2000, 3600, 5000, 6600, 7800, 9200, 11500];
const CYCLE = 11500;
const HEIGHT = 262;

// 칸 하나가 100토큰이다. 시스템 프롬프트 1,200토큰, 질문 300토큰.
const SYS = 12;
const Q = 3;
const ANS = 4;
const PER_CELL = 100;

const CELL_H = 20;
const ROW1 = 38; // 1회차 칸 윗변
const CACHE = 100; // 캐시 상자 윗변
const ROW2 = 164; // 2회차 칸 윗변

type Labels = {
	captions: string[];
	labelW: number;
	round1: string;
	round2: string;
	system: string;
	qA: string;
	qB: string;
	answer: string;
	cache: string;
	write: string;
	read: string;
	computed: (tokens: number) => string;
	cacheRead: string;
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		captions: [
			"① prefill: 입력 전체의 KV를 계산한다",
			"② 시스템 프롬프트 구간의 KV를 캐시에 쓴다",
			"③ decode로 답을 한 토큰씩 만든다",
			"④ 2회차: 앞부분 KV를 캐시에서 읽는다",
			"⑤ prefill은 질문 B만 한다",
			"⑥ decode: 답은 매번 새로 만든다",
			"⑦ 새로 계산한 입력 1,500 → 300 토큰",
		],
		labelW: 40,
		round1: "1회차",
		round2: "2회차",
		system: "시스템 프롬프트",
		qA: "질문 A",
		qB: "질문 B",
		answer: "답",
		cache: "KV 캐시",
		write: "쓰기",
		read: "읽기",
		computed: (tokens) => `새로 계산 ${tokens.toLocaleString("ko-KR")} 토큰`,
		cacheRead: `캐시 읽기 ${(SYS * PER_CELL).toLocaleString("ko-KR")} 토큰`,
		aria: "1회차와 2회차 요청을 위아래로 놓고 반복 재생하는 애니메이션. 1회차는 시스템 프롬프트와 질문 A를 모두 prefill해 KV를 계산하고, 시스템 프롬프트 구간의 KV를 캐시에 쓴 뒤 답을 만든다. 2회차는 같은 시스템 프롬프트의 KV를 캐시에서 읽고 질문 B만 prefill한 뒤 답을 새로 만든다. 새로 계산한 입력은 1,500토큰에서 300토큰으로 준다.",
	},
	en: {
		captions: [
			"① prefill: compute KV for the whole input",
			"② Write the system prompt's KV to the cache",
			"③ decode the answer one token at a time",
			"④ Call 2: read the prefix KV from the cache",
			"⑤ prefill runs on question B only",
			"⑥ decode: the answer is new every time",
			"⑦ Newly computed input: 1,500 → 300 tokens",
		],
		labelW: 46,
		round1: "Call 1",
		round2: "Call 2",
		system: "System prompt",
		qA: "Question A",
		qB: "Question B",
		answer: "Answer",
		cache: "KV cache",
		write: "write",
		read: "read",
		computed: (tokens) => `Computed ${tokens.toLocaleString("en-US")} tokens`,
		cacheRead: `cache read ${(SYS * PER_CELL).toLocaleString("en-US")}`,
		aria: "Looping animation of two calls, one above the other. Call 1 prefills the system prompt and question A to compute their KV, writes the system prompt's KV to the cache, and then generates the answer. Call 2 reads the same system prompt's KV from the cache, prefills only question B, and generates a new answer. Newly computed input drops from 1,500 tokens to 300.",
	},
};
type Lang = keyof typeof LABELS;

// 칸 위치. 행 이름 폭까지 합친 블록을 가운데 놓는다.
function layout(w: number, labelW: number) {
	const gap = 2;
	const segGap = 6;
	const ansGap = 20;
	const cells = SYS + Q + ANS;
	const fixed = segGap + ansGap + gap * (cells - 3);
	const cellW = Math.min(24, (w - 16 - labelW - fixed) / cells);
	const left = (w - (labelW + cellW * cells + fixed)) / 2;
	const pitch = cellW + gap;
	const sysX = (i: number) => left + labelW + i * pitch;
	const sysEnd = sysX(SYS - 1) + cellW;
	const qX = (i: number) => sysEnd + segGap + i * pitch;
	const qEnd = qX(Q - 1) + cellW;
	const ansX = (i: number) => qEnd + ansGap + i * pitch;
	return { left, cellW, sysX, sysEnd, qX, qEnd, ansX };
}
type Layout = ReturnType<typeof layout>;

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, fill: string, stroke: string) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, CELL_H, 3);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1;
	ctx.stroke();
}

// 시스템 프롬프트 구간의 KV 12칸을 한 덩어리로 그린다.
function drawBand(ctx: CanvasRenderingContext2D, g: Layout, y: number, fill: string, stroke: string) {
	for (let i = 0; i < SYS; i++) drawCell(ctx, g.sysX(i), y, g.cellW, fill, stroke);
}

function drawRowFrame(ctx: CanvasRenderingContext2D, g: Layout, c: Colors, L: Labels, y: number, round: string, question: string) {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 11px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(round, g.left, y + CELL_H / 2);
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(L.system, g.sysX(0), y - 9);
	ctx.fillText(question, g.qX(0), y - 9);
	ctx.fillText(L.answer, g.ansX(0), y - 9);

	// 입력 → 답 화살표
	const x0 = g.qEnd + 5;
	const x1 = g.ansX(0) - 5;
	const ay = y + CELL_H / 2;
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(x0, ay);
	ctx.lineTo(x1, ay);
	ctx.moveTo(x1 - 4, ay - 3);
	ctx.lineTo(x1, ay);
	ctx.lineTo(x1 - 4, ay + 3);
	ctx.stroke();
}

function drawAnswers(ctx: CanvasRenderingContext2D, g: Layout, c: Colors, y: number, n: number) {
	for (let i = 0; i < n; i++) drawCell(ctx, g.ansX(i), y, g.cellW, c.line, c.sub);
}

function drawScan(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors) {
	ctx.strokeStyle = c.blue;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x, y - 3);
	ctx.lineTo(x, y + CELL_H + 3);
	ctx.stroke();
}

function drawCounter(ctx: CanvasRenderingContext2D, c: Colors, L: Labels, x: number, y: number, tokens: number, withRead: boolean) {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 11px ${FONT}`;
	const computed = L.computed(tokens);
	ctx.fillStyle = c.blue;
	ctx.fillText(computed, x, y);
	if (!withRead) return;
	const dot = " · ";
	const dx = x + ctx.measureText(computed).width;
	ctx.fillStyle = c.sub;
	ctx.fillText(dot, dx, y);
	ctx.fillStyle = c.green;
	ctx.fillText(L.cacheRead, dx + ctx.measureText(dot).width, y);
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const g = layout(w, L.labelW);
		const step = UNTIL.findIndex((u) => t < u);
		const from = step === 0 ? 0 : UNTIL[step - 1];
		const p = clamp01((t - from) / (UNTIL[step] - from));

		// 진행 상태는 칸 단위로 센다. 칸의 반을 넘게 지나가면 계산된 것으로 본다.
		const done = (s: number) => Math.max(0, Math.ceil(s - 0.5));
		const scan1 = step === 0 ? p * (SYS + Q) : SYS + Q; // ① 1회차 prefill은 입력 전체
		const scan2 = step < 4 ? 0 : step === 4 ? p * Q : Q; // ⑤ 2회차 prefill은 질문만
		const writeP = step === 1 ? clamp01(p / 0.8) : step > 1 ? 1 : 0; // ② 캐시 쓰기
		const readP = step === 3 ? clamp01(p / 0.75) : step > 3 ? 1 : 0; // ④ 캐시 읽기
		const answers = (at: number) => (step < at ? 0 : step === at ? Math.min(ANS, Math.floor(p * ANS) + 1) : ANS);
		const bandCx = (g.sysX(0) + g.sysEnd) / 2;

		// 1회차
		drawRowFrame(ctx, g, c, L, ROW1, L.round1, L.qA);
		for (let k = 0; k < SYS + Q; k++) {
			const on = k < done(scan1);
			const x = k < SYS ? g.sysX(k) : g.qX(k - SYS);
			drawCell(ctx, x, ROW1, g.cellW, on ? c.blueFill : c.boxFill, on ? c.blue : c.boxStroke);
		}
		drawAnswers(ctx, g, c, ROW1, answers(2));
		if (step === 0) {
			const k = Math.min(Math.floor(scan1), SYS + Q - 1);
			const x = (k < SYS ? g.sysX(k) : g.qX(k - SYS)) + (scan1 - k) * g.cellW;
			drawScan(ctx, x, ROW1, c);
		}
		drawCounter(ctx, c, L, g.sysX(0), ROW1 + CELL_H + 14, done(scan1) * PER_CELL, false);

		// 캐시 상자
		ctx.save();
		ctx.setLineDash([4, 3]);
		ctx.beginPath();
		ctx.roundRect(g.sysX(0) - 4, CACHE, g.sysEnd - g.sysX(0) + 8, CELL_H + 8, 6);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.restore();
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(L.cache, g.sysEnd + 12, CACHE + (CELL_H + 8) / 2);
		if (writeP >= 1) drawBand(ctx, g, CACHE + 4, c.amberFill, c.amber);

		// ② 쓰기: 1회차 앞부분의 KV가 캐시로 내려간다
		if (step === 1) {
			const y = lerp(ROW1, CACHE + 4, ease(writeP));
			if (writeP < 1) drawBand(ctx, g, y, c.amberFill, c.amber);
			drawBadge(ctx, bandCx, y + CELL_H / 2, L.write, c.amberFill, c.amber, 1);
		}

		// 2회차는 차례가 오기 전까지 흐리게 둔다
		ctx.save();
		ctx.globalAlpha = step < 3 ? 0.35 : step === 3 ? lerp(0.35, 1, clamp01(p / 0.2)) : 1;
		drawRowFrame(ctx, g, c, L, ROW2, L.round2, L.qB);
		for (let i = 0; i < SYS; i++) {
			const on = readP >= 1;
			drawCell(ctx, g.sysX(i), ROW2, g.cellW, on ? c.greenFill : c.boxFill, on ? c.green : c.boxStroke);
		}
		for (let i = 0; i < Q; i++) {
			const on = i < done(scan2);
			drawCell(ctx, g.qX(i), ROW2, g.cellW, on ? c.blueFill : c.boxFill, on ? c.blue : c.boxStroke);
		}
		drawAnswers(ctx, g, c, ROW2, answers(5));
		if (step === 4) {
			const k = Math.min(Math.floor(scan2), Q - 1);
			drawScan(ctx, g.qX(k) + (scan2 - k) * g.cellW, ROW2, c);
		}
		if (step >= 3) drawCounter(ctx, c, L, g.sysX(0), ROW2 + CELL_H + 14, done(scan2) * PER_CELL, readP >= 1);
		ctx.restore();

		// ④ 읽기: 캐시의 KV가 2회차 앞부분으로 내려간다
		if (step === 3) {
			const y = lerp(CACHE + 4, ROW2, ease(readP));
			if (readP < 1) drawBand(ctx, g, y, c.greenFill, c.green);
			drawBadge(ctx, bandCx, y + CELL_H / 2, L.read, c.greenFill, c.green, 1);
		}

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 20);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function PrefixReuseDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

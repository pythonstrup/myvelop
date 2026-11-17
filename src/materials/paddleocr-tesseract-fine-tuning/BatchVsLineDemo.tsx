import { type Colors, clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 두 엔진에서 학습의 한 걸음이 무엇인지 위아래 두 칸으로 나란히 재생한다.
// 위 PaddleOCR은 GPU에서 줄 이미지 64장을 한 묶음으로 함께 계산하고 가중치를 한 번 고친다.
// 이번 실험은 T4 메모리 때문에 공식 설정의 128장 대신 64장을 썼다.
// 아래 Tesseract는 CPU에서 길이가 제각각인 줄을 하나씩 넣고 줄마다 가중치를 고친다.
// 시간 간격과 줄 길이는 설명용으로 정한 값이다.
const UNTIL = [4500, 9300, 15800];
const CYCLE = 15800;
const HEIGHT = 300;
const LANE_H = 118;
const LANE_TOP = [8, 138];
const MODEL_W = 84;
const MODEL_H = 48;
const MODEL_Y = 30; // 칸 위에서부터
const ARROW = 30;
const DIM = 0.4;

// 64장 = 8 × 8. 묶음 안의 이미지는 크기가 같다
const GRID = 8;
const CELL_W = 10;
const CELL_H = 4;
const CELL_GAP = 2;
const BUNDLE_W = GRID * CELL_W + (GRID - 1) * CELL_GAP;
const BUNDLE_H = GRID * CELL_H + (GRID - 1) * CELL_GAP;

// 묶음(또는 줄) 하나 안에서의 구간 비율: 들어감 → 계산 → 가중치 고침 → 사라짐
const PADDLE = { period: 4500, starts: [0, 9300], in: 0.27, calc: 0.53, gone: 0.7, pulse: 1100 };
const TESS = {
	period: 800,
	starts: [...Array.from({ length: 6 }, (_, i) => 4500 + i * 800), ...Array.from({ length: 7 }, (_, i) => 9300 + i * 800)],
	in: 0.35,
	calc: 0.6,
	gone: 0.9,
	pulse: 560,
};
// 줄마다 길이가 다르다(가장 긴 줄 대비)
const TESS_LENS = [0.72, 0.45, 0.95, 0.6, 0.35, 0.82, 0.52, 0.68, 0.4, 0.9, 0.58, 0.3, 0.76, 0.5, 0.86, 0.64];
const LINE_H = 10;
const SLOT_GAP = 13;

const LABELS = {
	captions: ["① PaddleOCR은 64장을 함께 계산하고 가중치를 한 번 고친다", "② Tesseract는 줄 하나를 읽을 때마다 가중치를 고친다", "③ 그래서 두 엔진의 한 걸음은 뜻이 다르다"],
	lanes: ["PaddleOCR · GPU", "Tesseract · CPU"],
	meaning: ["한 걸음 = 이미지 64장(이번 실험)", "한 걸음 = 줄 하나"],
	counter: (n: number) => `걸음 ${n}`,
	model: "모델",
	update: "가중치 고침",
	aria: "두 엔진에서 학습의 한 걸음이 무엇을 뜻하는지 위아래로 나란히 보여 주는 애니메이션. 위 칸의 PaddleOCR은 GPU에서 같은 크기의 줄 이미지 64장을 한 묶음으로 모델에 넣어 함께 계산한 뒤 가중치를 한 번 고치고, 걸음 수가 1 오른다. 이번 실험은 메모리 때문에 공식 설정의 128장 대신 64장을 썼다. 아래 칸의 Tesseract는 CPU에서 길이가 제각각인 줄을 하나씩 넣고, 줄 하나를 읽을 때마다 가중치를 고쳐 걸음 수가 1씩 오른다. 그래서 PaddleOCR의 한 걸음은 이미지 64장이고 Tesseract의 한 걸음은 줄 하나다.",
};

const fade = (t: number, at: number, dur = 300) => clamp01((t - at) / dur);

// 지금까지 지난 가중치 고침 횟수와 마지막 고침이 얼마나 생생한지(1 → 0)
function pulses(lane: typeof PADDLE | typeof TESS, t: number) {
	let count = 0;
	let since = Number.POSITIVE_INFINITY;
	for (const s of lane.starts) {
		const at = s + lane.period * lane.calc;
		if (at <= t) {
			count++;
			since = t - at;
		}
	}
	return { count, glow: 1 - clamp01(since / lane.pulse) };
}

// 가장 최근에 들어가기 시작한 묶음(또는 줄)과 그 안에서의 진행 비율
function latest(lane: typeof PADDLE | typeof TESS, t: number) {
	let index = -1;
	for (let i = 0; i < lane.starts.length; i++) if (lane.starts[i] <= t) index = i;
	return { index, f: index < 0 ? Number.POSITIVE_INFINITY : (t - lane.starts[index]) / lane.period };
}

function drawLane(ctx: CanvasRenderingContext2D, c: Colors, w: number, top: number, i: number, count: number, glow: number, strong: boolean) {
	ctx.beginPath();
	ctx.roundRect(0.5, top + 0.5, w - 1, LANE_H, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1;
	ctx.stroke();

	ctx.textBaseline = "alphabetic";
	ctx.font = `600 12.5px ${FONT}`;
	ctx.textAlign = "left";
	ctx.fillStyle = c.text;
	ctx.fillText(LABELS.lanes[i], 14, top + 22);
	ctx.font = `600 ${12.5 + 2 * glow}px ${FONT}`;
	ctx.textAlign = "right";
	ctx.fillStyle = glow > 0.3 ? c.green : c.text;
	ctx.fillText(LABELS.counter(count), w - 14, top + 22);

	ctx.font = `${strong ? 600 : 500} 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.fillStyle = strong ? c.blue : c.sub;
	ctx.fillText(LABELS.meaning[i], 14, top + LANE_H - 12);
}

// 모델 상자. 가중치를 고치는 순간 초록으로 번쩍인다
function drawModel(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, glow: number) {
	ctx.beginPath();
	ctx.roundRect(x, y, MODEL_W, MODEL_H, 6);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1.2;
	ctx.stroke();
	const base = ctx.globalAlpha;
	if (glow > 0) {
		ctx.globalAlpha = base * glow;
		ctx.fillStyle = c.greenFill;
		ctx.fill();
		ctx.strokeStyle = c.green;
		ctx.lineWidth = 2;
		ctx.stroke();
	}
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `600 12px ${FONT}`;
	ctx.globalAlpha = base;
	// 두 글이 겹쳐 보이지 않게 섞지 않고 바꿔 단다
	const updating = glow > 0.25;
	ctx.fillStyle = updating ? c.green : c.text;
	if (updating) ctx.font = `600 11.5px ${FONT}`;
	ctx.fillText(updating ? LABELS.update : LABELS.model, x + MODEL_W / 2, y + MODEL_H / 2 + 1);
}

function drawArrow(ctx: CanvasRenderingContext2D, c: Colors, x1: number, x2: number, y: number, t: number, flowing: boolean) {
	ctx.save();
	ctx.strokeStyle = flowing ? c.blue : c.line;
	ctx.fillStyle = flowing ? c.blue : c.line;
	ctx.lineWidth = 1.5;
	if (flowing) {
		ctx.setLineDash([4, 3]);
		ctx.lineDashOffset = -t / 40;
	}
	ctx.beginPath();
	ctx.moveTo(x1, y);
	ctx.lineTo(x2 - 5, y);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.beginPath();
	ctx.moveTo(x2, y);
	ctx.lineTo(x2 - 6, y - 4);
	ctx.lineTo(x2 - 6, y + 4);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

function drawBundle(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, lit: number) {
	const base = ctx.globalAlpha;
	for (let r = 0; r < GRID; r++) {
		for (let k = 0; k < GRID; k++) {
			const cx = x + k * (CELL_W + CELL_GAP);
			const cy = y + r * (CELL_H + CELL_GAP);
			ctx.globalAlpha = base * 0.55;
			ctx.fillStyle = c.sub;
			ctx.fillRect(cx, cy, CELL_W, CELL_H);
			if (lit > 0) {
				ctx.globalAlpha = base * lit;
				ctx.fillStyle = c.blue;
				ctx.fillRect(cx, cy, CELL_W, CELL_H);
			}
		}
	}
	ctx.globalAlpha = base;
}

// 줄 이미지 한 장. 안에 낱말 모양의 막대를 그린다
const WORDS = [14, 8, 20, 11, 6, 16];
function drawLine(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, len: number, lit: boolean) {
	ctx.beginPath();
	ctx.roundRect(x, y - LINE_H / 2, len, LINE_H, 2);
	ctx.fillStyle = lit ? c.blueFill : c.boxFill;
	ctx.fill();
	ctx.strokeStyle = lit ? c.blue : c.sub;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.fillStyle = lit ? c.blue : c.sub;
	let wx = x + 3;
	for (let k = 0; wx < x + len - 5; k++) {
		const ww = Math.min(WORDS[k % WORDS.length], x + len - 3 - wx);
		ctx.fillRect(wx, y - 1.5, ww, 3);
		wx += ww + 3;
	}
}

function drawPaddle(ctx: CanvasRenderingContext2D, c: Colors, top: number, t: number, dockRight: number) {
	const midY = top + MODEL_Y + MODEL_H / 2;
	const waitX = 14;
	const dockX = dockRight - BUNDLE_W;
	const by = midY - BUNDLE_H / 2;
	const { f } = latest(PADDLE, t);
	if (f < PADDLE.gone) {
		const m = ease(clamp01(f / PADDLE.in));
		const computing = f >= PADDLE.in && f < PADDLE.calc;
		const out = ease(fade(f, PADDLE.calc, PADDLE.gone - PADDLE.calc));
		ctx.globalAlpha *= 1 - out;
		drawBundle(ctx, c, lerp(waitX, dockX, m) + out * 14, by, computing ? 1 : 0);
		ctx.globalAlpha = 1;
	} else {
		// 다음 묶음이 기다린다
		ctx.globalAlpha *= fade(f, PADDLE.gone, 0.12);
		drawBundle(ctx, c, waitX, by, 0);
		ctx.globalAlpha = 1;
	}
	return f >= PADDLE.in && f < PADDLE.calc;
}

function drawTess(ctx: CanvasRenderingContext2D, c: Colors, top: number, t: number, dockRight: number) {
	const midY = top + MODEL_Y + MODEL_H / 2;
	// 기다리는 줄과 모델 앞에 선 줄이 가로로 겹치지 않는 길이
	const maxLen = Math.min(110, (dockRight - 14 - 12) / 2);
	const slotY = (slot: number) => midY + slot * SLOT_GAP;
	const { index, f } = latest(TESS, t);
	const started = index + 1;
	const m = index < 0 ? 1 : ease(clamp01(f / TESS.in));
	// 앞줄이 모델 앞에 선 뒤에야 뒷줄이 한 칸씩 올라온다
	const q = index < 0 ? 1 : ease(clamp01((f - TESS.in) / 0.2));
	const base = ctx.globalAlpha;
	// 기다리는 줄
	for (let k = started; k < started + 4; k++) {
		const slot = k - started + (1 - q);
		const a = clamp01(3 - slot);
		if (a <= 0) continue;
		ctx.globalAlpha = base * a;
		drawLine(ctx, c, 14, slotY(slot), TESS_LENS[k % TESS_LENS.length] * maxLen, false);
	}
	// 지금 들어가는 줄
	const computing = index >= 0 && f >= TESS.in && f < TESS.calc;
	if (index >= 0 && f < TESS.gone) {
		const len = TESS_LENS[index % TESS_LENS.length] * maxLen;
		const out = fade(f, TESS.calc, TESS.gone - TESS.calc);
		ctx.globalAlpha = base * (1 - out);
		drawLine(ctx, c, lerp(14, dockRight - len, m) + out * 14, midY, len, computing);
	}
	ctx.globalAlpha = base;
	return computing;
}

function drawCaption(ctx: CanvasRenderingContext2D, c: Colors, w: number, text: string) {
	ctx.font = `500 12px ${FONT}`;
	const size = Math.max(10.5, Math.min(12, (12 * (w - 16)) / ctx.measureText(text).width));
	ctx.font = `500 ${size}px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.fillText(text, w / 2, HEIGHT - 18);
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const modelX = w - 14 - MODEL_W;
	const dockRight = modelX - ARROW;
	// ①에서는 Tesseract를, ②에서는 PaddleOCR을 흐리게 둔다
	const alphas =
		step === 0
			? [1, DIM]
			: step === 1
				? [1 - (1 - DIM) * fade(t, UNTIL[0], 400), DIM + (1 - DIM) * fade(t, UNTIL[0], 400)]
				: [DIM + (1 - DIM) * fade(t, UNTIL[1], 400), 1];

	const lanes = [PADDLE, TESS] as const;
	lanes.forEach((lane, i) => {
		const top = LANE_TOP[i];
		const { count, glow } = pulses(lane, t);
		ctx.globalAlpha = alphas[i];
		drawLane(ctx, c, w, top, i, count, glow, step === 2);
		ctx.globalAlpha = alphas[i];
		const computing = i === 0 ? drawPaddle(ctx, c, top, t, dockRight) : drawTess(ctx, c, top, t, dockRight);
		ctx.globalAlpha = alphas[i];
		const midY = top + MODEL_Y + MODEL_H / 2;
		drawArrow(ctx, c, dockRight + 6, modelX - 4, midY, t, computing);
		drawModel(ctx, c, modelX, top + MODEL_Y, glow);
		ctx.globalAlpha = 1;
	});

	drawCaption(ctx, c, w, LABELS.captions[step]);
}

export default function BatchVsLineDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS.aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

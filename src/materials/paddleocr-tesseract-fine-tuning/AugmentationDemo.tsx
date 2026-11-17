import { type Colors, clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// PaddleOCR 학습 코드가 줄 이미지 하나를 부풀려 넣는 과정을 반복 재생한다.
// 다른 줄을 이어 붙이고, 비틀고, 흐리게 만든 뒤, 줄 높이를 32·48·64로 바꾼다.
// 마지막에는 같은 줄이 볼 때마다 다른 조합으로 들어가는 모습을 늘어놓는다.
// 비틀린 모양과 회차마다 고른 조합은 설명용으로 정한 값이다.
const UNTIL = [1800, 4400, 6800, 9000, 12000, 17000];
const CYCLE = 17000;
const HEIGHT = 300;
const STAGE_MID = 156;
// 줄 높이 1당 화면 픽셀. 좁은 화면에서는 긴 줄이 들어가도록 더 줄인다
const MAX_SCALE = 0.85;
const LABEL_GAP = 15;
const GAP = 10;
const PASS_LABEL_W = 46;
// 비틀 때 위아래를 어긋나게 미는 정도
const SHEAR = 0.18;

const LINE = "임차인 홍길동";
const PARTNER = "금 3,500,000원";
const HEIGHTS = [32, 48, 64];

type Look = { warp: number; blur: number; phase: number };
const FLAT: Look = { warp: 0, blur: 0, phase: 0 };
const PHASE = 0.8;

// ⑥ 회차마다 고른 조합
const PASSES: (Look & { h: number; segs: string[] })[] = [
	{ h: 48, segs: [LINE], warp: 0.9, blur: 0, phase: 2.2 },
	{ h: 32, segs: [LINE, "월세 450,000원"], warp: 0, blur: 0.8, phase: 0 },
	{ h: 64, segs: [LINE], warp: 0.7, blur: 0.6, phase: 4.1 },
	{ h: 48, segs: [LINE], warp: 0, blur: 0, phase: 0 },
];

const LABELS = {
	captions: [
		"① 원본 줄 이미지 하나에서 시작한다",
		"② 다른 줄을 이어 붙여 긴 줄을 만든다",
		"③ 일부러 비틀어 모양을 흐트러뜨린다",
		"④ 글자가 번진 것처럼 흐리게 만든다",
		"⑤ 줄 높이를 32·48·64로 섞어서 넣는다",
		"⑥ 같은 줄도 볼 때마다 조금씩 다르게 들어간다",
	],
	tools: ["이어 붙이기", "비틀기", "흐리기", "줄 높이"],
	height: (h: number) => `높이 ${h}`,
	pass: (i: number) => `${i + 1}번째`,
	aria: "학습 중에 줄 이미지 하나가 바뀌어 들어가는 과정을 반복 재생하는 애니메이션. '임차인 홍길동' 줄 이미지 뒤에 '금 3,500,000원' 줄을 이어 붙여 긴 줄을 만들고, 일부러 비틀고, 흐리게 만든 뒤, 같은 줄을 높이 32, 48, 64 세 가지로 바꿔 보여 준다. 마지막에는 같은 줄이 볼 때마다 다른 조합으로 들어가는 모습을 네 줄로 늘어놓는다. 첫 번째는 비틀기만, 두 번째는 다른 줄을 이어 붙이고 흐리게, 세 번째는 높이 64로 비틀고 흐리게 만들었고, 네 번째는 그대로 들어간다. 비틀린 모양과 조합은 설명용으로 정한 값이다.",
};

const fade = (t: number, at: number, dur = 300) => clamp01((t - at) / dur);

// 흐리기: ctx.filter 대신 글자를 조금씩 비켜 여러 번 겹쳐 그린다
const RING = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)]);
const BLUR_LAYERS = [
	{ r: 1, a: 0.07 },
	{ r: 0.5, a: 0.14 },
];

function glyph(ctx: CanvasRenderingContext2D, ch: string, radius: number, b: number) {
	const base = ctx.globalAlpha;
	if (b > 0) {
		for (const { r, a } of BLUR_LAYERS) {
			ctx.globalAlpha = base * a * b;
			for (const [dx, dy] of RING) ctx.fillText(ch, dx * r * radius, dy * r * radius);
		}
	}
	ctx.globalAlpha = base * (1 - 0.6 * b);
	ctx.fillText(ch, 0, 0);
	ctx.globalAlpha = base;
}

// 줄 이미지 안의 글자 위치. 이어 붙인 줄은 조각마다 여백을 따로 둔다
function layout(ctx: CanvasRenderingContext2D, dh: number, segs: readonly string[]) {
	ctx.font = `500 ${dh * 0.5}px ${FONT}`;
	const pad = dh * 0.28;
	const glyphs: { ch: string; x: number }[] = [];
	const seams: number[] = [];
	let x = 0;
	segs.forEach((seg, i) => {
		if (i > 0) seams.push(x);
		x += pad;
		for (const ch of seg) {
			const cw = ctx.measureText(ch).width;
			if (ch !== " ") glyphs.push({ ch, x: x + cw / 2 });
			x += cw;
		}
		x += pad;
	});
	return { width: x, glyphs, seams };
}

const tileWidth = (ctx: CanvasRenderingContext2D, dh: number, segs: readonly string[]) => layout(ctx, dh, segs).width;

// 종이 같은 줄 이미지 한 장. warp만큼 물결치며 기울고, blur만큼 번진다
function drawTile(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, dh: number, segs: readonly string[], look: Look, seam = 0) {
	const { width, glyphs, seams } = layout(ctx, dh, segs);
	const k = 1.6 / dh;
	const wave = (xr: number) => look.warp * dh * 0.12 * Math.sin(xr * k + look.phase);
	const tilt = (xr: number) => look.warp * 0.25 * Math.cos(xr * k + look.phase);
	ctx.save();
	ctx.translate(x, y + dh / 2);
	ctx.transform(1, 0, -SHEAR * look.warp, 1, 0, 0);
	const n = Math.max(2, Math.ceil(width / 6));
	ctx.beginPath();
	for (let i = 0; i <= n; i++) ctx.lineTo((width * i) / n, -dh / 2 + wave((width * i) / n));
	for (let i = n; i >= 0; i--) ctx.lineTo((width * i) / n, dh / 2 + wave((width * i) / n));
	ctx.closePath();
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.stroke();

	if (seam > 0) {
		const a = ctx.globalAlpha;
		ctx.globalAlpha = a * seam;
		ctx.setLineDash([3, 3]);
		for (const sx of seams) {
			ctx.beginPath();
			ctx.moveTo(sx, -dh / 2 + wave(sx));
			ctx.lineTo(sx, dh / 2 + wave(sx));
			ctx.stroke();
		}
		ctx.setLineDash([]);
		ctx.globalAlpha = a;
	}

	ctx.fillStyle = c.text;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const radius = dh * 0.09;
	for (const g of glyphs) {
		ctx.save();
		ctx.translate(g.x, wave(g.x) + dh * 0.03);
		ctx.rotate(tilt(g.x));
		glyph(ctx, g.ch, radius, look.blur);
		ctx.restore();
	}
	ctx.restore();
}

// 위쪽 줄: 네 가지 장치. 지금 단계는 진하게, 이미 거친 것은 테두리만
function drawTools(ctx: CanvasRenderingContext2D, c: Colors, w: number, step: number) {
	ctx.font = `600 11px ${FONT}`;
	const widths = LABELS.tools.map((s) => ctx.measureText(s).width + 20);
	let x = (w - widths.reduce((a, b) => a + b, 0) - 6 * (widths.length - 1)) / 2;
	LABELS.tools.forEach((label, i) => {
		const active = step === i + 1;
		const done = step > i + 1;
		ctx.beginPath();
		ctx.roundRect(x, 10, widths[i], 22, 11);
		ctx.fillStyle = active ? c.blueFill : c.boxFill;
		ctx.fill();
		ctx.strokeStyle = active || done ? c.blue : c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.fillStyle = active || done ? c.text : c.sub;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, x + widths[i] / 2, 21.5);
		x += widths[i] + 6;
	});
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
	// 가장 큰 높이 64의 긴 줄이 기울어진 채로 화면 폭에 들어가는 배율
	const s = Math.min(MAX_SCALE, (w - 24) / (tileWidth(ctx, 64, [LINE, PARTNER]) + 64 * SHEAR));

	drawTools(ctx, c, w, step);

	const dh48 = 48 * s;
	const mainW = tileWidth(ctx, dh48, [LINE]);
	const joinedX = (w - tileWidth(ctx, dh48, [LINE, PARTNER])) / 2;
	const topY = STAGE_MID - dh48 / 2;
	const full: Look = { warp: 1, blur: 1, phase: PHASE };

	// ①~④ 한 장이 차례로 바뀐다
	if (step <= 3) {
		const slideAt = UNTIL[0] + 200;
		const slide = ease(fade(t, slideAt, 900));
		ctx.globalAlpha = fade(t, 0, 400);
		if (t < slideAt + 900) {
			// 이어 붙이기 전에는 두 장을 따로 그린다
			const mainX = lerp((w - mainW) / 2, joinedX, slide);
			drawTile(ctx, c, mainX, topY, dh48, [LINE], FLAT);
			if (slide > 0) {
				ctx.globalAlpha = slide;
				drawTile(ctx, c, mainX + mainW + lerp(16, 0, slide), topY, dh48, [PARTNER], FLAT);
			}
		} else {
			const look: Look = { warp: ease(fade(t, UNTIL[1] + 200, 900)), blur: ease(fade(t, UNTIL[2] + 200, 800)), phase: PHASE };
			drawTile(ctx, c, joinedX, topY, dh48, [LINE, PARTNER], look, 1 - fade(t, slideAt + 1000, 500));
		}
		ctx.globalAlpha = 1;
	}

	// ⑤ 같은 줄을 높이 32·48·64로. 48은 지금까지의 그 줄이 자리를 옮긴다
	if (step === 4 || (step === 5 && t < UNTIL[4] + 300)) {
		const out = step === 5 ? 1 - fade(t, UNTIL[4], 300) : 1;
		const move = ease(fade(t, UNTIL[3], 600));
		const appear = fade(t, UNTIL[3] + 300, 500);
		const dhs = HEIGHTS.map((h) => h * s);
		const left = (w - tileWidth(ctx, dhs[2], [LINE, PARTNER])) / 2;
		let y = STAGE_MID - (dhs.reduce((a, b) => a + b, 0) + LABEL_GAP * 3 + GAP * 2) / 2;
		dhs.forEach((dh, i) => {
			const tileY = y + LABEL_GAP;
			const isMain = HEIGHTS[i] === 48;
			ctx.globalAlpha = (isMain ? 1 : appear) * out;
			drawTile(ctx, c, isMain ? lerp(joinedX, left, move) : left, isMain ? lerp(topY, tileY, move) : tileY, dh, [LINE, PARTNER], full);
			ctx.globalAlpha = appear * out;
			ctx.font = `500 11px ${FONT}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "alphabetic";
			ctx.fillStyle = c.sub;
			ctx.fillText(LABELS.height(HEIGHTS[i]), left, y + 10);
			y = tileY + dh + GAP;
		});
		ctx.globalAlpha = 1;
	}

	// ⑥ 회차마다 다른 조합으로 들어온다
	if (step === 5) {
		const widest = Math.max(...PASSES.map((p) => tileWidth(ctx, p.h, p.segs)));
		const sm = Math.min(s, (w - 24 - PASS_LABEL_W) / widest);
		const dhs = PASSES.map((p) => p.h * sm);
		const x0 = (w - PASS_LABEL_W - widest * sm) / 2;
		let y = STAGE_MID - (dhs.reduce((a, b) => a + b, 0) + GAP * (PASSES.length - 1)) / 2;
		PASSES.forEach((p, i) => {
			const a = fade(t, UNTIL[4] + 300 + i * 350, 350);
			ctx.globalAlpha = a;
			ctx.font = `500 11px ${FONT}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillStyle = c.sub;
			ctx.fillText(LABELS.pass(i), x0, y + dhs[i] / 2);
			drawTile(ctx, c, x0 + PASS_LABEL_W + (1 - a) * 12, y, dhs[i], p.segs, p);
			y += dhs[i] + GAP;
		});
		ctx.globalAlpha = 1;
	}

	drawCaption(ctx, c, w, LABELS.captions[step]);
}

export default function AugmentationDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS.aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

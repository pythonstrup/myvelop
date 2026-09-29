import { type Colors, clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";

// Sonnet 5에서 최소 길이보다 짧은 앞부분과 긴 앞부분에 똑같이 캐시 표시를 붙여 1회차·2회차를 비교한다.
// 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const UNTIL = [1400, 3000, 4400, 5800, 7400, 8800, 11000];
const CYCLE = 11000;
const HEIGHT = 216;

const MIN = 1024; // Sonnet 5의 최소 길이(토큰)
const SCALE = 2000; // 막대 눈금의 끝(토큰)
const SHORT = 800;
const LONG = 1600;

const BAR_H = 20;
const ROW_A = 60;
const ROW_B = 134;

type Labels = {
	captions: string[];
	min: string;
	row: (tokens: number, round: number) => string;
	noCache: string;
	write: string;
	read: string;
	firstWrite: (tokens: number) => string;
	secondRead: (tokens: number) => string;
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		captions: [
			"① Sonnet 5의 최소 길이는 1,024토큰이다",
			"② 800토큰 앞부분에 캐시 표시를 붙인다",
			"③ 최소 길이에 못 미쳐 캐시되지 않는다",
			"④ 다음 요청도 처음부터 다시 계산한다",
			"⑤ 1,600토큰이면 캐시에 쓴다",
			"⑥ 다음 요청은 캐시에서 읽는다",
			"⑦ 짧으면 표시를 붙여도 캐시되지 않는다",
		],
		min: "최소 길이 1,024토큰",
		row: (tokens, round) => `앞부분 ${tokens.toLocaleString("ko-KR")}토큰 · ${round}회차`,
		noCache: "캐시 안 됨 · 에러 없음",
		write: "쓰기",
		read: "읽기",
		firstWrite: (tokens) => `1회차 쓰기 ${tokens.toLocaleString("ko-KR")}`,
		secondRead: (tokens) => `2회차 읽기 ${tokens.toLocaleString("ko-KR")}`,
		aria: "Sonnet 5의 최소 길이 1,024토큰에 선을 긋고 두 앞부분을 비교하며 반복 재생하는 애니메이션. 800토큰 앞부분은 캐시 표시를 붙여도 에러 없이 캐시되지 않아 다음 요청도 처음부터 다시 계산한다. 1,600토큰 앞부분은 1회차에 캐시에 쓰고 2회차에 캐시에서 읽는다.",
	},
	en: {
		captions: [
			"① Sonnet 5's minimum length is 1,024 tokens",
			"② Put a cache marker on an 800-token prefix",
			"③ Below the minimum, nothing is cached",
			"④ The next call computes it all again",
			"⑤ At 1,600 tokens it is written to the cache",
			"⑥ The next call reads it from the cache",
			"⑦ Too short means no cache, marker or not",
		],
		min: "Minimum 1,024 tokens",
		row: (tokens, round) => `${tokens.toLocaleString("en-US")}-token prefix · call ${round}`,
		noCache: "Not cached · no error",
		write: "write",
		read: "read",
		firstWrite: (tokens) => `Call 1 write ${tokens.toLocaleString("en-US")}`,
		secondRead: (tokens) => `call 2 read ${tokens.toLocaleString("en-US")}`,
		aria: "Looping animation with a line at Sonnet 5's minimum length of 1,024 tokens, comparing two prefixes. The 800-token prefix is not cached even with a cache marker, and no error is returned, so the next call computes it all again. The 1,600-token prefix is written to the cache on call 1 and read from the cache on call 2.",
	},
};
type Lang = keyof typeof LABELS;

function drawBar(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, fill: string, stroke: string) {
	if (x1 - x0 < 1) return;
	ctx.beginPath();
	ctx.roundRect(x0, y, x1 - x0, BAR_H, 4);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1;
	ctx.stroke();
}

// 앞부분의 길이만큼 점선 틀을 그리고, 끝에 캐시 표시를 단다.
function drawSlot(ctx: CanvasRenderingContext2D, c: Colors, x0: number, x1: number, y: number) {
	ctx.save();
	ctx.setLineDash([4, 3]);
	ctx.beginPath();
	ctx.roundRect(x0, y, x1 - x0, BAR_H, 4);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.boxStroke;
	ctx.stroke();
	ctx.restore();
	ctx.beginPath();
	ctx.moveTo(x1 - 6, y - 5);
	ctx.lineTo(x1, y - 5);
	ctx.lineTo(x1, y + 1);
	ctx.closePath();
	ctx.fillStyle = c.amber;
	ctx.fill();
}

function drawText(ctx: CanvasRenderingContext2D, parts: [string, string][], x: number, y: number) {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 11px ${FONT}`;
	let dx = x;
	for (const [text, color] of parts) {
		ctx.fillStyle = color;
		ctx.fillText(text, dx, y);
		dx += ctx.measureText(text).width;
	}
}

function drawRowLabel(ctx: CanvasRenderingContext2D, c: Colors, text: string, x: number, y: number) {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(text, x, y);
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const x = (tokens: number) => margin + ((w - margin * 2) * tokens) / SCALE;
		const step = UNTIL.findIndex((u) => t < u);
		const from = step === 0 ? 0 : UNTIL[step - 1];
		const p = clamp01((t - from) / (UNTIL[step] - from));

		// 최소 길이 선. 두 막대 높이에만 긋는다.
		const mx = x(MIN);
		ctx.save();
		ctx.globalAlpha = step === 0 ? 0.3 + 0.7 * p : 1;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = c.red;
		ctx.fillText(L.min, mx, ROW_A - 26);
		ctx.strokeStyle = c.red;
		ctx.lineWidth = 1.5;
		ctx.setLineDash([4, 3]);
		ctx.beginPath();
		ctx.moveTo(mx, ROW_A - 18);
		ctx.lineTo(mx, ROW_A + BAR_H + 6);
		ctx.moveTo(mx, ROW_B - 6);
		ctx.lineTo(mx, ROW_B + BAR_H + 6);
		ctx.stroke();
		ctx.restore();

		// 짧은 앞부분: ② 1회차 계산 → ③ 캐시 안 됨 → ④ 2회차도 처음부터 계산
		const fillA = step < 1 ? 0 : step === 1 || step === 3 ? p * SHORT : SHORT;
		ctx.save();
		ctx.globalAlpha = step < 1 ? 0.35 : 1;
		drawRowLabel(ctx, c, L.row(SHORT, step >= 3 ? 2 : 1), margin, ROW_A - 9);
		drawSlot(ctx, c, x(0), x(SHORT), ROW_A);
		drawBar(ctx, x(0), x(fillA), ROW_A, c.blueFill, c.blue);
		if (step >= 2) {
			ctx.font = `600 10.5px ${FONT}`;
			const half = (ctx.measureText(L.noCache).width + 14) / 2;
			drawBadge(ctx, Math.min(x(SHORT) + 8 + half, w - margin - half), ROW_A + BAR_H / 2, L.noCache, c.redFill, c.red, 1);
		}
		const partsA: [string, string][] = [];
		if (step >= 2) partsA.push([L.firstWrite(0), c.amber]);
		if (step >= 4) partsA.push([" · ", c.sub], [L.secondRead(0), c.green]);
		drawText(ctx, partsA, margin, ROW_A + BAR_H + 13);
		ctx.restore();

		// 긴 앞부분: ⑤ 1회차 계산 뒤 캐시에 쓰기 → ⑥ 2회차는 캐시에서 읽기
		const written = step > 4 || (step === 4 && p >= 0.7);
		const fillB = step < 4 ? 0 : step === 4 ? clamp01(p / 0.7) * LONG : LONG;
		ctx.save();
		ctx.globalAlpha = step < 4 ? 0.35 : 1;
		drawRowLabel(ctx, c, L.row(LONG, step >= 5 ? 2 : 1), margin, ROW_B - 9);
		drawSlot(ctx, c, x(0), x(LONG), ROW_B);
		if (step >= 5) drawBar(ctx, x(0), x(LONG), ROW_B, c.greenFill, c.green);
		else if (written) drawBar(ctx, x(0), x(LONG), ROW_B, c.amberFill, c.amber);
		else drawBar(ctx, x(0), x(fillB), ROW_B, c.blueFill, c.blue);
		if (step === 4 && written) drawBadge(ctx, x(LONG / 2), ROW_B + BAR_H / 2, L.write, c.amberFill, c.amber, 1);
		if (step === 5) drawBadge(ctx, x(LONG / 2), ROW_B + BAR_H / 2, L.read, c.greenFill, c.green, 1);
		const partsB: [string, string][] = [];
		if (written) partsB.push([L.firstWrite(LONG), c.amber]);
		if (step >= 5) partsB.push([" · ", c.sub], [L.secondRead(LONG), c.green]);
		drawText(ctx, partsB, margin, ROW_B + BAR_H + 13);
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

export default function MinLengthDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

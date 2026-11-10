import { clamp01, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 같은 이력서에 질문 여러 개를 물을 때, 생성 모델은 답을 차례로 쓰며 앞의 답을 문맥으로 다시 읽고
// Jev는 질문들을 나란히 처리해 답끼리 서로 보지 않는다는 것을 보여주는 개념 애니메이션이다.
const N = 5;
const START = 400;
const STEP_MS = 700; // 생성 모델이 답 하나를 쓰는 간격
const FADE_MS = 300;
const SEQ_END = START + (N - 1) * STEP_MS + FADE_MS;
const PAR_START = SEQ_END + 400;
const LINE_MS = 500;
const PAR_ANSWER = PAR_START + LINE_MS + 100;
const CYCLE = PAR_ANSWER + 3400;

const ARC_BASE = 14; // 문맥 화살표 호의 기본 깊이
const ARC_STEP = 10; // 떨어진 답 하나마다 더하는 깊이
const GAP = 8;
const BOX_H = 28;
const STATE_H = 22;
// 위: 생성 모델, 아래: Jev
const P1 = { title: 14, state: 30, box: 72 };
const P2 = { title: 168, state: 184, box: 228 };
const HEIGHT = P2.box + BOX_H + 44;

type Labels = { gen: string; jev: string; state: string; answer: (i: number) => string; captions: readonly string[]; aria: string };

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		gen: "생성 모델 · 답을 차례로 쓴다",
		jev: "Jev · 질문을 나란히 판단한다",
		state: "state · 이력서 한 장",
		answer: (i) => `답 ${i}`,
		captions: ["① 생성 모델은 앞의 답을 읽으며 다음 답을 쓴다", "② Jev의 답은 나란히 나와 서로를 보지 않는다"],
		aria: "같은 이력서에 질문 다섯 개를 묻는 두 방식을 비교한 애니메이션. 생성 모델은 답 1부터 답 5까지 차례로 쓰는데, 답을 하나 쓸 때마다 앞에 쓴 답들이 문맥으로 함께 들어가 흐린 화살표로 이어진다. Jev는 같은 state에서 다섯 질문을 나란히 처리하고, 다섯 답이 서로를 보지 않은 채 한꺼번에 돌아온다.",
	},
	en: {
		gen: "Generative model · writes answers in order",
		jev: "Jev · judges the questions side by side",
		state: "state · one resume",
		answer: (i) => `Answer ${i}`,
		captions: ["① Each answer is written after rereading the earlier ones", "② Jev answers in parallel; no answer sees another"],
		aria: "Animation comparing two ways of asking five questions about the same resume. A generative model writes answers 1 through 5 in order, and each new answer has the earlier answers in its context, shown as faint arrows. Jev processes the five questions side by side from the same state, and all five answers come back at once without seeing each other.",
	},
};
type Lang = keyof typeof LABELS;

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "left") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 6);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1;
	ctx.stroke();
}

function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(-6, -3.5);
	ctx.lineTo(-6, 3.5);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const m = 8;
		const bw = (w - 2 * m - (N - 1) * GAP) / N;
		const bx = (i: number) => m + i * (bw + GAP);
		const mid = (i: number) => bx(i) + bw / 2;
		const ansFont = `600 11px ${FONT}`;

		// ── 생성 모델 ──
		drawText(ctx, L.gen, m, P1.title, c.amber, `700 12px ${FONT}`);
		box(ctx, m, P1.state, w - 2 * m, STATE_H, c.boxFill, c.boxStroke);
		drawText(ctx, L.state, w / 2, P1.state + STATE_H / 2, c.sub, `500 11px ${FONT}`, "center");
		for (let k = 0; k < N; k++) {
			const appear = START + k * STEP_MS;
			const a = clamp01((t - appear) / FADE_MS);
			// 빈 자리
			box(ctx, bx(k), P1.box, bw, BOX_H, "transparent", c.line);
			if (a <= 0) continue;
			ctx.globalAlpha = a;
			// state는 어느 답이든 읽는다(Jev 쪽과 같다).
			ctx.beginPath();
			ctx.moveTo(mid(k), P1.state + STATE_H);
			ctx.lineTo(mid(k), P1.box - 2);
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			arrowHead(ctx, mid(k), P1.box - 1, Math.PI / 2, c.amber);
			// 앞의 답들에서 지금 답으로 들어오는 문맥 화살표(상자 아래쪽 호). 끝점을 조금씩 벌려 겹치지 않게 한다.
			ctx.globalAlpha = 0.6 * a;
			for (let i = 0; i < k; i++) {
				const x1 = mid(i);
				const x2 = mid(k) - bw * 0.3 + (bw * 0.6 * i) / Math.max(1, k - 1);
				const y = P1.box + BOX_H + 2;
				const cpY = y + ARC_BASE + ARC_STEP * (k - i);
				const cpX = (x1 + x2) / 2;
				ctx.beginPath();
				ctx.moveTo(x1, y);
				ctx.quadraticCurveTo(cpX, cpY, x2, y + 3);
				ctx.strokeStyle = c.amber;
				ctx.lineWidth = 1.2;
				ctx.stroke();
				arrowHead(ctx, x2, y + 3, Math.atan2(y + 3 - cpY, x2 - cpX), c.amber);
			}
			ctx.globalAlpha = a;
			box(ctx, bx(k), P1.box, bw, BOX_H, c.amberFill, c.amber);
			drawText(ctx, L.answer(k + 1), mid(k), P1.box + BOX_H / 2, c.text, ansFont, "center");
			ctx.globalAlpha = 1;
		}

		// ── Jev ──
		drawText(ctx, L.jev, m, P2.title, c.blue, `700 12px ${FONT}`);
		box(ctx, m, P2.state, w - 2 * m, STATE_H, c.boxFill, c.boxStroke);
		drawText(ctx, L.state, w / 2, P2.state + STATE_H / 2, c.sub, `500 11px ${FONT}`, "center");
		const lineP = ease(clamp01((t - PAR_START) / LINE_MS));
		const ansA = clamp01((t - PAR_ANSWER) / FADE_MS);
		for (let k = 0; k < N; k++) {
			box(ctx, bx(k), P2.box, bw, BOX_H, "transparent", c.line);
			if (lineP > 0) {
				const y0 = P2.state + STATE_H;
				const y1 = y0 + (P2.box - y0) * lineP;
				ctx.beginPath();
				ctx.moveTo(mid(k), y0);
				ctx.lineTo(mid(k), y1);
				ctx.strokeStyle = c.blue;
				ctx.lineWidth = 1.5;
				ctx.stroke();
				if (lineP >= 1) arrowHead(ctx, mid(k), P2.box - 1, Math.PI / 2, c.blue);
			}
			if (ansA > 0) {
				ctx.globalAlpha = ansA;
				box(ctx, bx(k), P2.box, bw, BOX_H, c.blueFill, c.blue);
				drawText(ctx, L.answer(k + 1), mid(k), P2.box + BOX_H / 2, c.text, ansFont, "center");
				ctx.globalAlpha = 1;
			}
		}

		drawText(ctx, L.captions[t < PAR_START ? 0 : 1], w / 2, HEIGHT - 12, c.text, `500 12px ${FONT}`, "center");
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function IndependenceDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 질문 하나가 시맨틱 캐시를 지나는 길. 1부는 적중, 2부는 놓친 뒤 저장하는 모습이다.
// 유사도는 bge-m3로 잰 값이고 문턱값 0.9는 가정이다. 매 사이클 같은 장면을 재생한다.
const STEPS = [1800, 3600, 5400, 7200]; // 한 부의 단계가 끝나는 시점(ms)
const PART = 7600;
const CYCLE = PART * 2;
const HEIGHT = 300;

const Q_Y = 26;
const EMB_Y = 74;
const LIST_Y = 122;
const ROW_H = 26;
const END_Y = 224;

const STORED = ["환불은 어떻게 하나요?", "배송은 며칠 걸려요?", "포인트는 언제 적립되나요?"];
const PARTS = [
	{
		title: "적중",
		question: "환불하려면 어떻게 해야 하나요?",
		sims: ["0.959", "0.597", "0.539"],
		best: 0,
		hit: true,
		captions: [
			"① 질문을 벡터로 바꾼다",
			"② 저장된 질문과의 유사도를 잰다",
			"③ 가장 높은 0.959가 문턱값 0.9를 넘는다",
			"④ 그 질문에 딸린 답을 돌려준다",
		],
	},
	{
		title: "놓침",
		question: "매장에 주차할 수 있나요?",
		sims: ["0.529", "0.552", "0.474"],
		best: 1,
		hit: false,
		captions: [
			"① 질문을 벡터로 바꾼다",
			"② 저장된 질문과의 유사도를 잰다",
			"③ 가장 높은 0.552가 문턱값 0.9에 못 미친다",
			"④ 모델을 부르고 질문과 답을 저장한다",
		],
	},
];

const ARIA =
	"질문이 시맨틱 캐시를 지나는 두 경우를 이어서 재생하는 애니메이션. 캐시에는 환불, 배송, 포인트 질문이 저장되어 있고 문턱값은 0.9라고 가정한다. 「환불하려면 어떻게 해야 하나요?」가 오면 벡터로 바꿔 유사도를 재고, 가장 높은 「환불은 어떻게 하나요?」의 0.959가 문턱값을 넘어 저장된 답을 돌려준다. 「매장에 주차할 수 있나요?」는 가장 높은 값이 0.552라 문턱값에 못 미치므로, 모델을 불러 답을 만들고 질문과 답을 캐시에 저장한다.";

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "center") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 8);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.4;
	ctx.stroke();
}

function drawLine(ctx: CanvasRenderingContext2D, c: Colors, x0: number, y0: number, x1: number, y1: number, on: boolean) {
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.strokeStyle = on ? c.blue : c.line;
	ctx.lineWidth = on ? 1.8 : 1.2;
	ctx.stroke();
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const part = PARTS[t < PART ? 0 : 1];
	const local = t % PART;
	const found = STEPS.findIndex((end) => local < end);
	const step = found === -1 ? 3 : found;
	const start = step === 0 ? 0 : STEPS[step - 1];
	const p = clamp01((local - start) / (STEPS[step] - start));

	const cx = w / 2;
	const listW = Math.min(340, w - 16);
	const listX = cx - listW / 2;
	const endW = Math.min(150, (w - 36) / 2);
	const cacheX = cx - endW - 10;
	const modelX = cx + 10;
	const listBottom = LIST_Y + ROW_H * 3 + 8;

	drawText(ctx, part.title, 8, 10, part.hit ? c.green : c.amber, `700 12.5px ${FONT}`, "left");

	// 질문 → 임베딩 → 목록 → 결과를 잇는 선
	drawLine(ctx, c, cx, Q_Y + 13, cx, EMB_Y - 13, step === 0);
	drawLine(ctx, c, cx, EMB_Y + 13, cx, LIST_Y - 4, step === 1);
	const endCx = part.hit ? cacheX + endW / 2 : modelX + endW / 2;
	drawLine(ctx, c, cx, listBottom, cacheX + endW / 2, END_Y, step === 3 && part.hit);
	drawLine(ctx, c, cx, listBottom, modelX + endW / 2, END_Y, step === 3 && !part.hit);

	// 질문
	const qW = Math.min(250, w - 16);
	drawBox(ctx, cx - qW / 2, Q_Y - 13, qW, 26, c.blueFill, c.blue);
	drawText(ctx, part.question, cx, Q_Y + 0.5, c.text, `600 12px ${FONT}`);

	// 임베딩 모델
	drawBox(ctx, cx - 62, EMB_Y - 13, 124, 26, c.boxFill, step === 0 && p > 0.6 ? c.blue : c.boxStroke);
	drawText(ctx, "임베딩 모델", cx, EMB_Y + 0.5, c.text, `500 12px ${FONT}`);

	// 저장된 질문 목록
	drawBox(ctx, listX, LIST_Y - 4, listW, ROW_H * 3 + 12, c.boxFill, c.boxStroke);
	STORED.forEach((q, i) => {
		const y = LIST_Y + 2 + ROW_H * i + ROW_H / 2;
		const isBest = i === part.best && step >= 2;
		if (isBest) {
			ctx.beginPath();
			ctx.roundRect(listX + 5, y - 11, listW - 10, 22, 6);
			ctx.fillStyle = part.hit ? c.greenFill : c.amberFill;
			ctx.fill();
		}
		drawText(ctx, q, listX + 14, y, c.text, `${isBest ? 600 : 400} 12px ${FONT}`, "left");
		const shown = step > 1 || (step === 1 && p > (i + 1) / 4);
		if (shown) {
			const color = isBest ? (part.hit ? c.green : c.amber) : c.sub;
			drawText(ctx, part.sims[i], listX + listW - 14, y, color, `600 12px ${FONT}`, "right");
		}
	});

	// 결과: 저장된 답 / 모델
	const done = step === 3 && p > 0.45;
	drawBox(ctx, cacheX, END_Y, endW, 30, done && part.hit ? c.greenFill : c.boxFill, done && part.hit ? c.green : c.boxStroke);
	drawText(ctx, "저장된 답", cacheX + endW / 2, END_Y + 15.5, c.text, `600 12px ${FONT}`);
	drawBox(ctx, modelX, END_Y, endW, 30, done && !part.hit ? c.amberFill : c.boxFill, done && !part.hit ? c.amber : c.boxStroke);
	drawText(ctx, "모델 호출", modelX + endW / 2, END_Y + 15.5, c.text, `600 12px ${FONT}`);
	if (done && !part.hit) drawBadge(ctx, cacheX + endW / 2, END_Y + 42, "새로 저장", c.amberFill, c.amber, clamp01((p - 0.45) / 0.2));

	// 움직이는 점
	if (step === 0) drawDot(ctx, c, cx, lerp(Q_Y + 13, EMB_Y - 13, ease(clamp01(p / 0.6))));
	if (step === 1) drawDot(ctx, c, cx, lerp(EMB_Y + 13, LIST_Y - 4, ease(clamp01(p / 0.25))));
	if (step === 3 && !done) {
		const k = ease(clamp01(p / 0.45));
		drawDot(ctx, c, lerp(cx, endCx, k), lerp(listBottom, END_Y, k));
	}

	drawText(ctx, part.captions[step], cx, HEIGHT - 12, c.text, `500 12px ${FONT}`);
}

function drawDot(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number) {
	ctx.beginPath();
	ctx.arc(x, y, 5, 0, Math.PI * 2);
	ctx.fillStyle = c.blue;
	ctx.fill();
}

export default function LookupFlowDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={ARIA} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

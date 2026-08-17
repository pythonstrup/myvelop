import { type Colors, drawBadge, ease, FONT, lerp, clamp01, palette, useCanvasScene } from "@/materials/shared";

// 시나리오 타임라인(ms). 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const UNTIL = [2600, 5600, 9600, 12600];
const CYCLE = 12600;
const HEIGHT = 232;
// 각 청크가 완주하는 step ③ 내부 진행률. 청크 1이 마지막에 끝난다.
const FINISH = [0.5, 0.78, 0.3];

const LABELS = {
	ko: {
		captions: [
			"① FlowProducer는 적재 시점에 트리를 선언한다",
			"② 그룹이 이미 있으면 생성 단계 자체가 없다",
			"③ 발송 트리거는 마지막에 끝난 청크의 몫이다",
			"④ 적재 시점에 아는 것이 없다, 처리 시점에 푼다",
		],
		create: "그룹 생성",
		chunk: "청크",
		send: "발송",
		declared: "적재 시점에 전부 선언",
		trigger: "트리거",
		resolve: "moveToWaitingChildren",
		aria: "FlowProducer가 요구하는 정적 트리 선언과 처리 시점에야 결정되는 실제 흐름의 어긋남을 재생하는 애니메이션. 적재 시점에 그룹 생성, 청크, 발송으로 트리를 선언해 보지만, 그룹 생성 단계는 그룹이 이미 있으면 사라지고, 발송 트리거는 마지막으로 끝나는 청크가 정해지는 처리 시점에야 알 수 있다. 그래서 트리를 미리 선언하는 대신 moveToWaitingChildren으로 처리 시점에 푼다.",
	},
	en: {
		captions: [
			"① FlowProducer declares the whole tree at add time",
			"② If the group already exists, there is no create step",
			"③ The last chunk to finish owns the send trigger",
			"④ Nothing is known at add time; resolve at run time",
		],
		create: "group create",
		chunk: "chunk",
		send: "send",
		declared: "declared entirely at add time",
		trigger: "trigger",
		resolve: "moveToWaitingChildren",
		aria: "Looping animation contrasting FlowProducer's static tree declaration with a flow decided at processing time: the group-create step disappears when a group already exists, and the send trigger belongs to whichever chunk finishes last, so the tree cannot be declared upfront and is resolved at run time with moveToWaitingChildren.",
	},
} as const;
type Lang = keyof typeof LABELS;

function drawNode(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	w: number,
	h: number,
	title: string,
	c: Colors,
	stroke: string,
	dashed: boolean,
	alpha: number,
	progress = 0,
) {
	ctx.save();
	ctx.globalAlpha = alpha;
	if (dashed) ctx.setLineDash([5, 4]);
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	if (progress > 0) {
		ctx.save();
		ctx.clip();
		ctx.fillStyle = c.blueFill;
		ctx.fillRect(cx - w / 2, cy - h / 2, w * progress, h);
		ctx.restore();
	}
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 12.5px ${FONT}`;
	ctx.fillText(title, cx, cy + 0.5);
	ctx.restore();
}

function drawArrow(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: string,
	dashed: boolean,
	alpha: number,
) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	if (dashed) ctx.setLineDash([5, 4]);
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.setLineDash([]);
	const a = Math.atan2(y2 - y1, x2 - x1);
	ctx.beginPath();
	ctx.moveTo(x2 - 6 * Math.cos(a - 0.45), y2 - 6 * Math.sin(a - 0.45));
	ctx.lineTo(x2, y2);
	ctx.lineTo(x2 - 6 * Math.cos(a + 0.45), y2 - 6 * Math.sin(a + 0.45));
	ctx.stroke();
	ctx.restore();
}

function drawQuestion(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors, dark: boolean, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(x, y, 9, 0, Math.PI * 2);
	ctx.fillStyle = c.amber;
	ctx.fill();
	ctx.fillStyle = dark ? "#1a1a1a" : "#ffffff";
	ctx.font = `700 12px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("?", x, y + 0.5);
	ctx.restore();
}

function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors, dark: boolean, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(x, y, 8, 0, Math.PI * 2);
	ctx.fillStyle = c.green;
	ctx.fill();
	ctx.strokeStyle = dark ? "#1a1a1a" : "#ffffff";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x - 3.5, y);
	ctx.lineTo(x - 1, y + 2.5);
	ctx.lineTo(x + 3.5, y - 3.5);
	ctx.stroke();
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 10;
		const boxW = Math.min(130, (w - margin * 2) / 3 - 14);
		const chunkH = 34;
		const rowYs = [54, 102, 150];
		const midY = 102;
		const createX = margin + boxW / 2;
		const sendX = w - margin - boxW / 2;
		const midX = w / 2;

		const step = UNTIL.findIndex((u) => t < u);
		const from = step === 0 ? 0 : UNTIL[step - 1];
		const p = ease((t - from) / (UNTIL[step] - from));

		// ①에서는 트리가 서서히 나타나고, ④에서는 전체가 점선 가정으로 물러난다.
		const treeAlpha = step === 0 ? Math.min(1, p * 1.6) : step === 3 ? 0.75 : 1;
		const allDashed = step === 3;

		// 생성 노드 — ②에서 "있을 수도 없을 수도"로 깜박이고, 이후 점선으로 남는다.
		const createPulse = step === 1 ? 0.35 + 0.65 * Math.abs(Math.cos(p * Math.PI * 2)) : 1;
		const createDashed = step >= 1;
		const createAlpha = treeAlpha * (step === 1 ? createPulse : step >= 2 ? 0.55 : 1);

		// 생성 → 청크 화살표
		for (const y of rowYs) {
			drawArrow(ctx, createX + boxW / 2 + 3, midY, midX - boxW / 2 - 5, y, c.line, createDashed || allDashed, createAlpha);
		}
		// 청크 → 발송 화살표. ③ 끝에서 마지막 완주자의 화살표만 실선 강조가 된다.
		const lastDone = step === 2 ? clamp01((p - FINISH[1]) / (1 - FINISH[1])) : 0;
		rowYs.forEach((y, i) => {
			const hot = step === 2 && i === 1 && lastDone > 0;
			drawArrow(
				ctx,
				midX + boxW / 2 + 3,
				y,
				sendX - boxW / 2 - 5,
				midY,
				hot ? c.amber : c.line,
				allDashed || (step === 2 && !hot),
				treeAlpha * (hot ? lastDone : 1),
			);
		});

		drawNode(ctx, createX, midY, boxW, 44, L.create, c, createDashed ? c.amber : c.boxStroke, createDashed, createAlpha);
		rowYs.forEach((y, i) => {
			const prog = step === 2 ? clamp01(p / FINISH[i]) : 0;
			const hot = step === 2 && i === 1 && lastDone > 0;
			drawNode(ctx, midX, y, boxW, chunkH, `${L.chunk} ${i}`, c, hot ? c.amber : c.boxStroke, allDashed, treeAlpha, prog);
			if (step === 2 && prog >= 1) drawCheck(ctx, midX + boxW / 2 - 2, y - chunkH / 2 + 2, c, dark, 1);
		});
		drawNode(ctx, sendX, midY, boxW, 44, L.send, c, allDashed ? c.amber : c.boxStroke, allDashed, treeAlpha);

		// ①: 트리 전체가 적재 시점에 확정된다는 선언 배지.
		if (step === 0) drawBadge(ctx, w / 2, 18, L.declared, c.blueFill, c.blue, Math.min(1, p * 1.6));
		// ②·④: 생성 노드의 물음표.
		if (step === 1 || step === 3) drawQuestion(ctx, createX + boxW / 2 - 2, midY - 24, c, dark, step === 1 ? Math.min(1, p * 2) : 1);
		// ③: 마지막 완주자가 트리거 배지를 단다. ④: 발송 쪽 물음표.
		if (step === 2 && lastDone > 0) drawBadge(ctx, midX + (sendX - midX) / 2, rowYs[1] - 16, L.trigger, c.amberFill, c.amber, lastDone);
		if (step === 3) drawQuestion(ctx, sendX - boxW / 2 + 2, midY - 24, c, dark, 1);
		// ④: 결론 — 트리 선언 대신 처리 시점의 저수준 도구.
		if (step === 3 && p > 0.45) drawBadge(ctx, w / 2, 18, L.resolve, c.blueFill, c.blue, clamp01((p - 0.45) / 0.3));

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 26);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function FlowProducerMismatchDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas
				ref={canvasRef}
				role="img"
				aria-label={LABELS[lang].aria}
				style={{ display: "block", width: "100%" }}
			/>
		</div>
	);
}

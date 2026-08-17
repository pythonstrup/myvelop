import { type Colors, drawBadge, ease, FONT, lerp, clamp01, palette, useCanvasScene } from "@/materials/shared";

// 시나리오 타임라인(ms). 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const UNTIL = [2000, 4200, 6600, 8600, 10800, 13000];
const CYCLE = 13000;
const HEIGHT = 232;

const LABELS = {
	ko: {
		captions: [
			"① 그룹이 아직 없다, 청크 job이 적재를 멈춘다",
			"② 자식을 낳고 waiting-children으로 잠든다",
			"③ 자식이 limiter를 지나 그룹을 만든다",
			"④ 자식 완료, 부모가 처음부터 재실행된다",
			"⑤ 이번엔 그룹이 있다, 메시지를 적재한다",
			"⑥ 묶음 완성, 독립 job group.send가 발송한다",
		],
		parent: "청크 job",
		parentSub: "부모",
		child: "group.create",
		childSub: "자식",
		group: "그룹",
		none: "아직 없다",
		created: "생성됨",
		staging: "적재 중",
		sending: "발송",
		stageTry: "적재?",
		createDot: "그룹 생성",
		waiting: "waiting-children",
		reentry: "처음부터 재실행",
		sendJob: "group.send",
		aria: "청크 job이 그룹이 없어 group.create 자식을 낳고 waiting-children으로 잠들었다가, 자식이 limiter를 지나 그룹을 만들면 처음부터 재실행되어 적재를 이어가고, 묶음이 완성되면 독립 job인 group.send가 발송을 트리거하는 여섯 단계를 반복 재생하는 애니메이션.",
	},
	en: {
		captions: [
			"① No group yet, the chunk job stops staging",
			"② It spawns a child and moves to waiting-children",
			"③ The child passes the limiter and creates the group",
			"④ Child done, the parent re-runs from the top",
			"⑤ The group exists now, messages are staged",
			"⑥ Batch complete, a standalone group.send job fires",
		],
		parent: "chunk job",
		parentSub: "parent",
		child: "group.create",
		childSub: "child",
		group: "group",
		none: "missing",
		created: "created",
		staging: "staging",
		sending: "sending",
		stageTry: "stage?",
		createDot: "create group",
		waiting: "waiting-children",
		reentry: "re-run from top",
		sendJob: "group.send",
		aria: "Looping animation of six steps: a chunk job finds no group, spawns a group.create child and sleeps in waiting-children; once the child creates the group through the limiter, the parent re-runs from the top and stages its messages; when the batch completes, a standalone group.send job triggers the send.",
	},
} as const;
type Lang = keyof typeof LABELS;

function drawBox(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	w: number,
	h: number,
	title: string,
	sub: string,
	c: Colors,
	stroke = c.boxStroke,
	dashed = false,
	alpha = 1,
) {
	ctx.save();
	ctx.globalAlpha = alpha;
	if (dashed) ctx.setLineDash([5, 4]);
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 13px ${FONT}`;
	ctx.fillText(title, cx, cy - 8);
	ctx.fillStyle = c.sub;
	ctx.font = `400 10.5px ${FONT}`;
	ctx.fillText(sub, cx, cy + 9);
	ctx.restore();
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
	ctx.beginPath();
	ctx.arc(x, y, 6, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
	ctx.font = `600 10.5px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	ctx.fillText(label, x, y - 10);
}

function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors, dark: boolean, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(x, y, 9, 0, Math.PI * 2);
	ctx.fillStyle = c.green;
	ctx.fill();
	ctx.strokeStyle = dark ? "#1a1a1a" : "#ffffff";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x - 4, y);
	ctx.lineTo(x - 1, y + 3);
	ctx.lineTo(x + 4, y - 4);
	ctx.stroke();
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const boxW = Math.min(150, (w - margin * 2) / 3 - 10);
		const boxH = 52;
		const topY = 62;
		const childY = 152;

		const parentX = margin + boxW / 2;
		const groupX = w - margin - boxW / 2;
		const childX = w / 2;
		const leftA = parentX + boxW / 2 + 8;
		const rightB = groupX - boxW / 2 - 8;

		const step = UNTIL.findIndex((u) => t < u);
		const from = step === 0 ? 0 : UNTIL[step - 1];
		const p = ease((t - from) / (UNTIL[step] - from));

		// 상시 적재 경로(부모 ↔ 그룹)
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(leftA, topY);
		ctx.lineTo(rightB, topY);
		ctx.stroke();

		// 부모-자식 연결(elbow). ②에서 나타나 이후 계속 남는다.
		if (step >= 1) {
			ctx.save();
			ctx.globalAlpha = step === 1 ? p : 1;
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(parentX, topY + boxH / 2);
			ctx.lineTo(parentX, childY);
			ctx.lineTo(childX - boxW / 2 - 8, childY);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.restore();
		}

		// 그룹 박스 — ③ 후반에 실체가 되고, ⑥에서 발송 완료로 굳는다.
		const exists = step >= 3 || (step === 2 && p > 0.85);
		const groupSub = !exists ? L.none : step === 4 ? L.staging : step === 5 ? L.sending : L.created;
		const groupStroke = step === 5 ? c.green : exists ? c.boxStroke : c.line;
		drawBox(ctx, groupX, topY, boxW, boxH, L.group, groupSub, c, groupStroke, !exists);

		// 부모 박스 — ②~③ 동안 잠들어 흐려진다.
		const parentAlpha =
			step === 1 ? lerp(1, 0.45, p) : step === 2 ? 0.45 : step === 3 ? lerp(0.45, 1, p) : 1;
		drawBox(ctx, parentX, topY, boxW, boxH, L.parent, L.parentSub, c, c.boxStroke, false, parentAlpha);

		// 자식 박스 — ②에서 태어나 ④에 완료된다.
		if (step >= 1) {
			const childStroke = step >= 3 ? c.green : step === 2 ? c.blue : c.boxStroke;
			drawBox(ctx, childX, childY, boxW, boxH, L.child, L.childSub, c, childStroke, false, step === 1 ? p : 1);
			if (step >= 3) drawCheck(ctx, childX + boxW / 2 - 2, childY - boxH / 2 + 2, c, dark, step === 3 ? p : 1);
		}

		const badgeY = topY - boxH / 2 - 16;
		// ①: 적재 시도가 없는 그룹에 막힌다.
		if (step === 0) {
			drawDot(ctx, lerp(leftA, rightB, Math.min(p, 0.8) / 0.8), topY, L.stageTry, c.amber);
			if (p > 0.8) {
				ctx.save();
				ctx.globalAlpha = (p - 0.8) / 0.2;
				ctx.strokeStyle = c.red;
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.moveTo(rightB - 5, topY - 5);
				ctx.lineTo(rightB + 5, topY + 5);
				ctx.moveTo(rightB + 5, topY - 5);
				ctx.lineTo(rightB - 5, topY + 5);
				ctx.stroke();
				ctx.restore();
			}
		}
		// ②~③: 부모는 waiting-children 배지를 달고 잠들어 있다.
		if (step === 1 || step === 2) drawBadge(ctx, parentX, badgeY, L.waiting, c.amberFill, c.amber, step === 1 ? p : 1);
		// ④: 부모가 깨어난다 — 이어하기가 아니라 처음부터다.
		if (step === 3) drawBadge(ctx, parentX, badgeY, L.reentry, c.blueFill, c.blue, p);
		// ③: 자식이 그룹을 만든다.
		if (step === 2) {
			const dx = lerp(childX + boxW / 2 + 6, groupX, p);
			const dy = lerp(childY, topY + boxH / 2 + 8, p);
			drawDot(ctx, dx, dy, L.createDot, c.green);
		}
		// ⑤: 메시지들이 그룹으로 흘러 들어간다.
		if (step === 4) {
			ctx.fillStyle = c.blue;
			for (let i = 0; i < 3; i += 1) {
				const q = clamp01(p * 1.36 - i * 0.18);
				if (q > 0 && q < 1) {
					ctx.beginPath();
					ctx.arc(lerp(leftA, rightB, q), topY, 4, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}
		// ⑥: 독립 job group.send가 발송을 트리거한다.
		if (step === 5) {
			drawBadge(ctx, groupX, childY, L.sendJob, c.blueFill, c.blue, p);
			ctx.save();
			ctx.globalAlpha = p;
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(groupX, childY - 12);
			ctx.lineTo(groupX, topY + boxH / 2 + 4);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(groupX - 4, topY + boxH / 2 + 10);
			ctx.lineTo(groupX, topY + boxH / 2 + 4);
			ctx.lineTo(groupX + 4, topY + boxH / 2 + 10);
			ctx.stroke();
			ctx.restore();
			if (p > 0.5) drawCheck(ctx, groupX + boxW / 2 - 2, topY - boxH / 2 + 2, c, dark, (p - 0.5) / 0.5);
		}

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

export default function WaitingChildrenDemo({ lang = "ko" }: { lang?: Lang }) {
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

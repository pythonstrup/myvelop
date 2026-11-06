import { clamp01, type Colors, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";
import { CONTRACT } from "./FictionalContract";

// VLM이 가린 계약서를 읽고 답을 쓰는 과정을 반복 재생한다. 이미지를 조각으로 잘라 토큰 줄에 세우고, 질문 토큰을 이어 LLM에 넣은 뒤,
// 답 토큰을 하나씩 쓸 때마다 어느 토큰을 참고하는지(어텐션)를 주황 선으로 잇는다. 어느 토큰에 가중치가 몰리는지는 설명을 위해 단순하게 정했다.
const C = CONTRACT.ko;
const COLS = 6;
const ROWS = 4;
const P = 36;
const IW = P * COLS;
const IH = P * ROWS;
const QUESTION = ["계약서", "성명을", "알려줘"];
const OUTPUT = [
	{ text: "성명은", patches: [6], question: [1], note: "“성명은”: 질문의 “성명을”과 “성명” 조각을 본다" },
	{ text: C.rows[0][1], patches: [9], question: [], note: `“${C.rows[0][1]}”: 그 옆 값 조각을 본다` },
	{ text: "입니다", patches: [], question: [1, 2], note: "“입니다”: 질문을 보고 문장을 맺는다" },
];
const CAPTIONS = [
	"① 이미지를 같은 크기의 조각(패치)으로 자른다",
	"② 조각마다 벡터로 바꿔 이미지 토큰으로 세운다",
	"③ 질문 토큰을 이어 붙여 LLM에 넣는다",
	"④ 답을 한 토큰씩 쓰며, 쓸 때마다 참고할 토큰을 고른다",
];
const ARIA =
	"VLM이 민감정보를 가린 가상의 용역 계약서를 읽는 애니메이션. 이미지를 가로 6, 세로 4의 조각 24개로 자르고, 조각마다 벡터로 바꿔 이미지 토큰으로 세운 뒤, '계약서 성명을 알려줘'라는 질문 토큰을 이어 LLM에 넣는다. LLM이 '성명은', '홍길동', '입니다'를 한 토큰씩 쓸 때마다 참고하는 토큰을 선으로 잇는다. '성명은'은 질문과 '성명' 조각을, '홍길동'은 그 옆 값 조각을, '입니다'는 질문을 본다. 답에는 조각의 위치가 아니라 글만 나온다.";

const UNTIL = [1200, 4200, 5600];
const GEN_MS = 1900;
const CYCLE = UNTIL[2] + GEN_MS * OUTPUT.length + 1700;
const HEIGHT = 420;
const IY = 6;
const TY = IY + IH + 34;
const CHIP_H = 22;

// 가린 계약서 한 장을 조각 크기에 맞춰 그린 원본. 조각을 잘라 토큰으로 옮길 때 이 캔버스에서 떠 온다.
let paper: { key: string; canvas: HTMLCanvasElement } | null = null;
function paperOf(dpr: number, dark: boolean, c: Colors) {
	const key = `${dpr}-${dark}`;
	if (paper?.key === key) return paper.canvas;
	const canvas = document.createElement("canvas");
	canvas.width = IW * dpr;
	canvas.height = IH * dpr;
	const g = canvas.getContext("2d");
	if (!g) throw new Error("2d 캔버스를 만들 수 없다");
	g.scale(dpr, dpr);
	g.fillStyle = dark ? "#2b3036" : "#f8f9fa";
	g.fillRect(0, 0, IW, IH);
	g.fillStyle = c.text;
	g.textBaseline = "middle";
	g.textAlign = "center";
	g.font = `700 13px ${FONT}`;
	g.fillText(C.title, IW / 2, P * 0.55);
	g.textAlign = "left";
	C.rows.forEach(([label, value], i) => {
		const y = P * (i + 1.55);
		g.font = `500 ${i === 0 ? 11.5 : 10}px ${FONT}`;
		g.fillStyle = c.sub;
		g.fillText(label, 5, y);
		g.fillStyle = c.text;
		if (i === 0) g.fillText(value, P * 3 + 2, y);
		else g.fillRect(P * 3 + 2, y - 7, P * 1.8, 14);
	});
	paper = { key, canvas };
	return canvas;
}

function chip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, hot: boolean, c: Colors, size = 11) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 5);
	ctx.fillStyle = hot ? c.amberFill : c.boxFill;
	ctx.fill();
	ctx.strokeStyle = hot ? c.amber : c.sub;
	ctx.lineWidth = hot ? 2 : 1;
	ctx.stroke();
	ctx.fillStyle = c.text;
	ctx.font = `600 ${size}px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, x + w / 2, y + h / 2 + 1);
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const dpr = ctx.getTransform().a;
	const src = paperOf(dpr, dark, c);
	const step = t < UNTIL[0] ? 0 : t < UNTIL[1] ? 1 : t < UNTIL[2] ? 2 : 3;
	const gen = step < 3 ? -1 : Math.min(OUTPUT.length - 1, Math.floor((t - UNTIL[2]) / GEN_MS));
	const att = gen >= 0 ? OUTPUT[gen] : null;

	// 토큰 줄 배치: 넓으면 이미지 토큰 뒤에 질문 토큰을 한 줄로, 좁으면 질문 토큰을 다음 줄로
	const rowW = Math.min(640, w - 24);
	const left = (w - rowW) / 2;
	ctx.font = `600 11px ${FONT}`;
	const qW = QUESTION.map((q) => ctx.measureText(q).width + 14);
	const qTotal = qW.reduce((s, v) => s + v + 4, 0);
	const narrow = rowW < 24 * 16 + qTotal + 12;
	const ts = Math.min(18, (narrow ? rowW : rowW - qTotal - 12) / 24 - 2);
	const slot = (k: number) => left + k * (ts + 2);
	const qY = narrow ? TY + CHIP_H + 20 : TY;
	const qX: number[] = [];
	qW.reduce((x, qw) => (qX.push(x), x + qw + 4), narrow ? left : slot(24) + 10);
	const barY = qY + CHIP_H + 22;
	const outY = barY + 34 + 30;
	const ix = (w - IW) / 2;

	// 원본 이미지와 조각 격자
	ctx.drawImage(src, ix, IY, IW, IH);
	ctx.globalAlpha = clamp01((t - 300) / 700) * 0.8;
	ctx.strokeStyle = c.blue;
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let i = 1; i < COLS; i++) (ctx.moveTo(ix + i * P, IY), ctx.lineTo(ix + i * P, IY + IH));
	for (let j = 1; j < ROWS; j++) (ctx.moveTo(ix, IY + j * P), ctx.lineTo(ix + IW, IY + j * P));
	ctx.stroke();
	ctx.globalAlpha = 1;
	ctx.strokeStyle = c.line;
	ctx.strokeRect(ix, IY, IW, IH);

	// 토큰 줄 이름
	ctx.font = `500 11px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	if (t >= UNTIL[0]) ctx.fillText("이미지 토큰 24개", left, TY - 8);
	ctx.globalAlpha = clamp01((t - 3700) / 500);
	ctx.fillText("질문 토큰", qX[0], qY - 8);
	QUESTION.forEach((q, i) => chip(ctx, qX[i], qY, qW[i], CHIP_H, q, !!att?.question.includes(i), c));
	ctx.globalAlpha = 1;

	// 조각이 토큰 자리로 날아간다
	for (let k = 0; k < COLS * ROWS; k++) {
		const u = ease(clamp01((t - UNTIL[0] - k * 90) / 600));
		if (u <= 0) continue;
		const sx = (k % COLS) * P;
		const sy = Math.floor(k / COLS) * P;
		const size = lerp(P, ts, u);
		const x = lerp(ix + sx, slot(k), u);
		const y = lerp(IY + sy, TY + (CHIP_H - ts) / 2, u);
		const hot = !!att?.patches.includes(k);
		ctx.drawImage(src, sx * dpr, sy * dpr, P * dpr, P * dpr, x, y, size, size);
		ctx.strokeStyle = hot ? c.amber : c.blue;
		ctx.lineWidth = hot ? 2 : 1;
		ctx.strokeRect(x, y, size, size);
		if (hot) {
			ctx.fillStyle = c.amberFill;
			ctx.globalAlpha = 0.6;
			ctx.fillRect(ix + sx, IY + sy, P, P);
			ctx.globalAlpha = 1;
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 2;
			ctx.strokeRect(ix + sx, IY + sy, P, P);
		}
	}

	// 어텐션 선: 답 토큰에서 참고하는 토큰까지. LLM 막대가 가운데를 덮어 막대 안에서 일어나는 일로 보이게 먼저 그린다
	const outW = 64;
	if (att) {
		const ox = left + gen * (outW + 6) + outW / 2;
		const targets = [
			...att.patches.map((k) => [slot(k) + ts / 2, TY + (CHIP_H + ts) / 2]),
			...att.question.map((i) => [qX[i] + qW[i] / 2, qY + CHIP_H]),
		];
		ctx.strokeStyle = c.amber;
		ctx.lineWidth = 2;
		ctx.globalAlpha = 0.85;
		for (const [tx, ty] of targets) {
			ctx.beginPath();
			ctx.moveTo(ox, outY);
			ctx.bezierCurveTo(ox, outY - 50, tx, ty + 50, tx, ty + 2);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	// LLM
	const llmOn = t >= UNTIL[1];
	ctx.beginPath();
	ctx.roundRect(left, barY, rowW, 34, 8);
	ctx.fillStyle = llmOn ? c.text : c.boxFill;
	ctx.fill();
	ctx.fillStyle = llmOn ? (dark ? "#1b1e22" : "#fff") : c.sub;
	ctx.font = `700 12px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("LLM — 토큰을 쓸 때마다 앞의 모든 토큰을 본다", left + rowW / 2, barY + 18);

	// 답 토큰
	ctx.font = `500 11px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "right";
	ctx.textBaseline = "alphabetic";
	ctx.fillText("답 토큰", left + rowW, outY + 17);
	for (let i = 0; i <= gen; i++) chip(ctx, left + i * (outW + 6), outY, outW, 26, OUTPUT[i].text, i === gen, c, 12.5);
	if (att) {
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(att.note, left, outY + 46);
	}

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(CAPTIONS[step], w / 2, HEIGHT - 16);
}

export default function VlmAttentionDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={ARIA} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

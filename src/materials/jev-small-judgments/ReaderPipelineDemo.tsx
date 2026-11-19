import { type Colors, clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 가상의 이력서 판독기에서 이력서 카드 여섯 장이 네 단계를 지나는 장면이다.
// 규칙 처리 → Jev 한 요청 → 확실하면 코드가 순서를 매기고, 애매하면 큰 모델을 거쳐 순서에 들어간다 → 사람이 결정한다.
// 판독기가 떨어뜨리는 단계는 없다. 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
type Kind = "rule" | "sure" | "unsure";
const CARDS: Kind[] = ["sure", "unsure", "sure", "rule", "sure", "unsure"];
const PASS = [0, 1, 2, 4, 5]; // 규칙을 지나 Jev로 가는 카드
const SURE = [0, 2, 4];
const UNSURE = [1, 5];
const ORDER_SLOT = [...SURE, ...UNSURE]; // 순서 칸에 도착하는 차례
const RANK = [2, 5, 0, 4, 1]; // 사람이 읽는 순서(카드 번호). 애매했던 카드도 점수대로 섞여 들어간다.

const MOVE = 800; // 카드 한 번 이동하는 시간(ms)
const STAGGER = 90;
const RANK_STAGGER = 120;
const T_RULE = 600;
const T_BIN = 2400;
const T_JEV = 3600;
const T_JUDGED = 5400; // 확실·애매 표시가 붙는 시점
const T_SURE = 6400;
const T_BIG = 8200;
const T_MEMO = 9300;
const T_BACK = 10000;
const T_HUMAN = 11400;
const CYCLE = 16000;
const STEP_ENDS = [T_JEV, T_SURE, T_BIG, T_HUMAN]; // 캡션 ①~⑤ 경계

const MARGIN = 8;
const GAP = 12;
const BOX_Y = 8;
const BOX_H = 72;
const ARROW_Y = BOX_Y + 24;
const LOW_Y = 112;
const LOW_H = 64;
const HUMAN_BOTTOM = LOW_Y + LOW_H;
const LIST_TOP = BOX_Y + 44;
const LIST_ROW = 21;
const CARD_W = 13;
const CARD_H = 16;
const FAN_MAX = 8;
const LOW_SPAN = 1.6; // 아래 칸 너비 = 기둥 너비 × 이 값
const CARD_FILL = { light: "#ffffff", dark: "#343a40" };
const CAPTION_Y = 200;
const HEIGHT = 216;

type BoxLabel = { t: string; s: string };
type Labels = { boxes: BoxLabel[]; bin: BoxLabel; big: BoxLabel; captions: string[]; aria: string };

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		boxes: [
			{ t: "이력서", s: "들어옴" },
			{ t: "규칙", s: "코드" },
			{ t: "Jev", s: "한 요청" },
			{ t: "순서", s: "코드" },
			{ t: "사람", s: "결정" },
		],
		bin: { t: "규칙 처리", s: "마감·서류" },
		big: { t: "큰 모델", s: "이유 메모" },
		captions: [
			"① 규칙으로 가릴 것은 코드가 먼저 처리한다",
			"② 나머지는 Jev에 기준을 한 요청으로 묻는다",
			"③ 확실한 이력서는 코드가 바로 순서를 매긴다",
			"④ 애매한 이력서만 큰 모델이 이유를 적는다",
			"⑤ 사람이 순서대로 읽고 결정한다",
		],
		aria: "가상의 이력서 판독기에서 이력서 여섯 장이 흘러가는 애니메이션. 마감 뒤 지원이나 빠진 서류처럼 규칙으로 가릴 수 있는 한 장은 코드가 먼저 처리한다. 나머지 다섯 장은 Jev에 한 요청으로 기준을 묻고, 답이 확실한 세 장은 코드가 바로 읽는 순서를 매긴다. 애매한 두 장은 큰 모델이 다시 읽고 이유를 적은 뒤 순서에 들어간다. 마지막에 사람이 정해진 순서대로 읽고 결정한다. 판독기가 이력서를 떨어뜨리는 단계는 없다.",
	},
	en: {
		boxes: [
			{ t: "Resumes", s: "incoming" },
			{ t: "Rules", s: "code" },
			{ t: "Jev", s: "1 request" },
			{ t: "Order", s: "code" },
			{ t: "Person", s: "decides" },
		],
		bin: { t: "Rule cases", s: "deadline, docs" },
		big: { t: "Large model", s: "notes why" },
		captions: [
			"① Code handles what rules can catch",
			"② The rest go to Jev in one request",
			"③ Code orders the sure ones at once",
			"④ A large model rereads the unclear ones",
			"⑤ A person reads in order and decides",
		],
		aria: "Animation of six resumes moving through a hypothetical resume reader. One resume that rules can catch, such as a late application or missing documents, is handled by code first. The other five go to Jev in one request, and code sets the reading order for the three with sure answers right away. The two unclear ones are reread by a large model, which notes why they are unclear, and then join the order. Finally a person reads them in that order and decides. No step in the reader rejects a resume.",
	},
};
type Lang = keyof typeof LABELS;

type Pt = { x: number; y: number };

type Geo = {
	colW: number;
	colX: (i: number) => number;
	colC: (i: number) => number;
	cardY: number;
	lowCardY: number;
	binC: number;
	bigC: number;
	lowW: number;
	humanCardX: number;
	rowY: (r: number) => number;
	fan: (n: number, k: number, cx: number, width: number) => number;
};

function geometry(w: number): Geo {
	const colW = (w - MARGIN * 2 - GAP * 4) / 5;
	const colX = (i: number) => MARGIN + i * (colW + GAP);
	const colC = (i: number) => colX(i) + colW / 2;
	return {
		colW,
		colX,
		colC,
		cardY: BOX_Y + BOX_H - CARD_H / 2 - 10,
		lowCardY: LOW_Y + LOW_H - CARD_H / 2 - 8,
		binC: (colC(0) + colC(1)) / 2,
		bigC: (colC(2) + colC(3)) / 2,
		lowW: colW * LOW_SPAN,
		humanCardX: colC(4) + 6,
		rowY: (r: number) => LIST_TOP + r * LIST_ROW + LIST_ROW / 2,
		fan: (n, k, cx, width) => cx + (k - (n - 1) / 2) * Math.min(FAN_MAX, (width - CARD_W - 8) / Math.max(1, n - 1)),
	};
}

// 카드마다 [출발 시각, 도착 위치] 목록을 만든다. 첫 항목은 처음 위치다.
function track(i: number, g: Geo): [number, Pt][] {
	const pts: [number, Pt][] = [[0, { x: g.fan(6, i, g.colC(0), g.colW), y: g.cardY }]];
	pts.push([T_RULE + i * STAGGER, { x: g.fan(6, i, g.colC(1), g.colW), y: g.cardY }]);
	if (CARDS[i] === "rule") {
		pts.push([T_BIN, { x: g.binC, y: g.lowCardY }]);
		return pts;
	}
	const j = PASS.indexOf(i);
	pts.push([T_JEV + j * STAGGER, { x: g.fan(5, j, g.colC(2), g.colW), y: g.cardY }]);
	const o = ORDER_SLOT.indexOf(i);
	const orderPt = { x: g.fan(5, o, g.colC(3), g.colW), y: g.cardY };
	if (CARDS[i] === "sure") {
		pts.push([T_SURE + o * STAGGER, orderPt]);
	} else {
		const u = UNSURE.indexOf(i);
		pts.push([T_BIG + u * STAGGER, { x: g.fan(2, u, g.bigC, g.lowW), y: g.lowCardY }]);
		pts.push([T_BACK + u * STAGGER, orderPt]);
	}
	const r = RANK.indexOf(i);
	pts.push([T_HUMAN + r * RANK_STAGGER, { x: g.humanCardX, y: g.rowY(r) }]);
	return pts;
}

function posAt(pts: [number, Pt][], t: number): Pt {
	let p = pts[0][1];
	for (let k = 1; k < pts.length; k++) {
		const [at, to] = pts[k];
		if (t <= at) break;
		const q = ease(clamp01((t - at) / MOVE));
		p = { x: lerp(p.x, to.x, q), y: lerp(p.y, to.y, q) };
		if (q < 1) break;
	}
	return p;
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "center") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string, active: boolean, dashed = false) {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 8);
	ctx.fillStyle = fill;
	ctx.fill();
	if (dashed) ctx.setLineDash([4, 3]);
	ctx.strokeStyle = stroke;
	ctx.lineWidth = active ? 2.2 : 1.2;
	ctx.stroke();
	ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
	const a = Math.atan2(y2 - y1, x2 - x1);
	const head = 4.5;
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2 - Math.cos(a) * head, y2 - Math.sin(a) * head);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x2, y2);
	ctx.lineTo(x2 - head * Math.cos(a - 0.5), y2 - head * Math.sin(a - 0.5));
	ctx.lineTo(x2 - head * Math.cos(a + 0.5), y2 - head * Math.sin(a + 0.5));
	ctx.closePath();
	ctx.fill();
}

function drawCard(ctx: CanvasRenderingContext2D, c: Colors, dark: boolean, p: Pt, badge: string | null, memo: boolean, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	const x = p.x - CARD_W / 2;
	const y = p.y - CARD_H / 2;
	ctx.beginPath();
	ctx.roundRect(x, y, CARD_W, CARD_H, 2.5);
	ctx.fillStyle = dark ? CARD_FILL.dark : CARD_FILL.light;
	ctx.fill();
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.strokeStyle = c.line;
	for (const dy of [5, 8.5, 12]) {
		ctx.beginPath();
		ctx.moveTo(x + 3, y + dy);
		ctx.lineTo(x + CARD_W - (dy === 12 ? 6 : 3), y + dy);
		ctx.stroke();
	}
	if (memo) {
		ctx.beginPath();
		ctx.roundRect(x + CARD_W - 4, y + CARD_H - 6, 7, 8, 1.5);
		ctx.fillStyle = c.amber;
		ctx.fill();
	}
	if (badge) {
		ctx.beginPath();
		ctx.arc(x + CARD_W, y, 3.4, 0, Math.PI * 2);
		ctx.fillStyle = badge;
		ctx.fill();
	}
	ctx.restore();
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const g = geometry(w);
		const step = STEP_ENDS.findIndex((end) => t < end);
		const phase = step === -1 ? STEP_ENDS.length : step;

		// 위 줄 다섯 칸. 사람 칸은 목록이 들어가도록 아래 줄까지 길다.
		const upper = [
			{ fill: c.boxFill, stroke: c.boxStroke, active: false },
			{ fill: c.boxFill, stroke: c.boxStroke, active: phase === 0 },
			{ fill: c.blueFill, stroke: c.blue, active: phase === 1 },
			{ fill: c.boxFill, stroke: c.boxStroke, active: phase === 2 },
			{ fill: c.boxFill, stroke: c.boxStroke, active: phase === 4 },
		];
		upper.forEach((b, i) => {
			const h = i === 4 ? HUMAN_BOTTOM - BOX_Y : BOX_H;
			drawBox(ctx, g.colX(i), BOX_Y, g.colW, h, b.fill, b.active && i !== 2 ? c.text : b.stroke, b.active);
			drawText(ctx, L.boxes[i].t, g.colC(i), BOX_Y + 15, i === 2 ? c.blue : c.text, `700 11.5px ${FONT}`);
			drawText(ctx, L.boxes[i].s, g.colC(i), BOX_Y + 30, c.sub, `500 10.5px ${FONT}`);
		});
		drawBox(ctx, g.binC - g.lowW / 2, LOW_Y, g.lowW, LOW_H, c.boxFill, phase === 0 ? c.text : c.boxStroke, phase === 0, true);
		drawText(ctx, L.bin.t, g.binC, LOW_Y + 15, c.text, `700 11px ${FONT}`);
		drawText(ctx, L.bin.s, g.binC, LOW_Y + 29, c.sub, `500 10.5px ${FONT}`);
		drawBox(ctx, g.bigC - g.lowW / 2, LOW_Y, g.lowW, LOW_H, c.amberFill, c.amber, phase === 3);
		drawText(ctx, L.big.t, g.bigC, LOW_Y + 15, c.amber, `700 11px ${FONT}`);
		drawText(ctx, L.big.s, g.bigC, LOW_Y + 29, c.sub, `500 10.5px ${FONT}`);

		// 칸 사이 화살표
		for (let i = 0; i < 4; i++) drawArrow(ctx, g.colX(i) + g.colW + 1, ARROW_Y, g.colX(i + 1) - 1, ARROW_Y, c.sub);
		drawArrow(ctx, g.colC(1) - 8, BOX_Y + BOX_H + 1, g.colC(1) - 8, LOW_Y - 1, c.sub);
		drawArrow(ctx, g.colC(2), BOX_Y + BOX_H + 1, g.colC(2), LOW_Y - 1, c.amber);
		drawArrow(ctx, g.colC(3), LOW_Y - 1, g.colC(3), BOX_Y + BOX_H + 1, c.amber);

		// 사람 칸 순번
		RANK.forEach((_, r) => {
			const shown = t >= T_HUMAN + r * RANK_STAGGER + MOVE * 0.6;
			if (shown) drawText(ctx, String(r + 1), g.colC(4) - 12, g.rowY(r), c.sub, `600 10.5px ${FONT}`);
		});

		// 카드
		const alpha = clamp01(t / 400);
		CARDS.forEach((kind, i) => {
			const p = posAt(track(i, g), t);
			const j = PASS.indexOf(i);
			const judged = kind !== "rule" && t >= T_JUDGED + j * STAGGER;
			const badge = judged ? (kind === "sure" ? c.green : c.amber) : null;
			const memo = kind === "unsure" && t >= T_MEMO + UNSURE.indexOf(i) * 200;
			drawCard(ctx, c, dark, p, badge, memo, alpha);
		});

		drawText(ctx, L.captions[phase], w / 2, CAPTION_Y, c.text, `500 12px ${FONT}`);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function ReaderPipelineDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

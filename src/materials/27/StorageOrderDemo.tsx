import { type Colors, clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 같은 표를 두 가지 순서로 파일에 늘어놓는다.
// 행 지향은 행 단위로 섞이고, Parquet은 같은 열끼리 모은다.
const UNTIL = [2800, 6400, 10000, 13600, 17200];
const CYCLE = 17200;
const HEIGHT = 290;

const ROWS = 4;
const COLS = 3;
type Ck = "blue" | "amber" | "green";
const TABLE: { key: string; ck: Ck }[] = [
	{ key: "user_id", ck: "blue" },
	{ key: "name", ck: "amber" },
	{ key: "status", ck: "green" },
];
const STATUS = 2;

const rowOrder: { c: number; r: number }[] = [];
const colOrder: { c: number; r: number }[] = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) rowOrder.push({ c, r });
for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) colOrder.push({ c, r });

const LABELS = {
	ko: {
	captions: [
		"① 표 하나가 있다 — 행 4개, 열 3개",
		"② 행 지향은 한 행씩 통째로 이어 붙인다 — 열이 섞인다",
		"③ Parquet은 반대다 — 같은 열끼리 모아서 저장한다",
		"④ status만 읽을 때: 행 지향은 흩어지고, Parquet은 한 블록이다",
		"⑤ 같은 값이 이웃해 있어 압축도 잘 먹는다",
	],
	laneA: "행 지향 — 한 행씩",
	laneB: "Parquet — 같은 열끼리",
	scatter: "4곳에 흩어짐",
	oneBlock: "한 블록",
	dict: '사전 인코딩: "OK"×3 · "FAIL"',
		vals: [["1", "2", "3", "4"], ["김", "이", "박", "최"], ["OK", "OK", "OK", "FAIL"]],
	aria: "같은 표를 두 가지 순서로 파일에 저장하는 차이를 반복 재생하는 애니메이션. 행 4개와 user_id, name, status 열 3개짜리 표를 놓고, 행 지향 저장은 한 행씩 통째로 이어 붙여 열이 섞이고, Parquet은 같은 열끼리 모아 저장하는 것을 보여준다. status만 읽는 조회에서 행 지향은 값이 네 곳에 흩어져 있지만 Parquet은 한 블록이라 그것만 읽으면 되고, OK처럼 같은 값이 이웃해 있어 사전 인코딩 압축도 잘 먹는다.",
},
	en: {
		captions: [
			"\u2460 One table \u2014 4 rows, 3 columns",
			"\u2461 Row-major appends one row at a time \u2014 columns interleave",
			"\u2462 Parquet does the opposite \u2014 same column, side by side",
			"\u2463 Reading status only: scattered vs one block",
			"\u2464 Neighbouring equal values compress well",
		],
		laneA: "row-major \u2014 one row at a time",
		laneB: "Parquet \u2014 same column together",
		scatter: "scattered in 4 places",
		oneBlock: "one block",
		dict: 'dictionary: "OK"\u00d73 \u00b7 "FAIL"',
		vals: [["1", "2", "3", "4"], ["Kim", "Lee", "Park", "Choi"], ["OK", "OK", "OK", "FAIL"]],
		aria: "Looping animation contrasting two physical orders for the same table. With four rows and the columns user_id, name and status, row-major storage appends one row at a time so columns interleave, while Parquet stores the same column's values side by side. A query that reads only status finds its values scattered across four places in row-major order but in a single block in Parquet, and neighbouring equal values such as OK compress well with dictionary encoding.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 14;
const TAPE_H = 22;
const CELL_H = 20;
const TABLE_TOP = 34;
const A_LABEL = 168;
const A_Y = 176;
const B_LABEL = 214;
const B_Y = 222;

const fade = (t: number, at: number, dur = 500) => ease(clamp01((t - at) / dur));
const accent = (c: Colors, ck: Ck) => (ck === "blue" ? c.blue : ck === "amber" ? c.amber : c.green);
const accentFill = (c: Colors, ck: Ck) =>
	ck === "blue" ? c.blueFill : ck === "amber" ? c.amberFill : c.greenFill;

// 값 하나가 테이프에 내려앉는다.
function drawSeg(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	sw: number,
	ck: Ck,
	val: string,
	c: Colors,
	a: number,
) {
	if (a <= 0) return;
	const dy = (1 - a) * -8;
	ctx.save();
	ctx.globalAlpha = a;
	ctx.beginPath();
	ctx.rect(x, y + dy, sw, TAPE_H);
	ctx.fillStyle = accentFill(c, ck);
	ctx.fill();
	ctx.strokeStyle = accent(c, ck);
	ctx.lineWidth = 0.9;
	ctx.stroke();
	ctx.font = `600 9.5px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.fillText(val, x + sw / 2, y + dy + TAPE_H / 2 + 0.5);
	ctx.restore();
}

function tapeOutline(ctx: CanvasRenderingContext2D, y: number, w: number, c: Colors) {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(MARGIN, y, w, TAPE_H, 4);
	ctx.setLineDash([4, 4]);
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1.1;
	ctx.stroke();
	ctx.restore();
}

function thickMark(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors) {
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(x, y - 2);
	ctx.lineTo(x, y + TAPE_H + 2);
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1.8;
	ctx.stroke();
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const usable = w - MARGIN * 2;
	const step = UNTIL.findIndex((u) => t < u);

	// 표 — 값이 실려 나갈 원본
	const colW = Math.min(88, (usable - 40) / 3);
	const tableX = (w - colW * COLS) / 2;
	for (let ci = 0; ci < COLS; ci++) {
		const col = TABLE[ci];
		const x = tableX + ci * colW;
		ctx.beginPath();
		ctx.rect(x, TABLE_TOP, colW, CELL_H);
		ctx.fillStyle = accentFill(c, col.ck);
		ctx.fill();
		ctx.strokeStyle = accent(c, col.ck);
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.font = `600 11px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = accent(c, col.ck);
		ctx.fillText(col.key, x + colW / 2, TABLE_TOP + CELL_H / 2);
		for (let r = 0; r < ROWS; r++) {
			const rowA = fade(t, 300 + r * 280, 350);
			const y = TABLE_TOP + CELL_H * (r + 1);
			ctx.save();
			ctx.globalAlpha = rowA;
			ctx.beginPath();
			ctx.rect(x, y, colW, CELL_H);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 0.9;
			ctx.stroke();
			ctx.font = `500 11px ${FONT}`;
			ctx.fillStyle = c.text;
			ctx.fillText(L.vals[ci][r], x + colW / 2, y + CELL_H / 2);
			ctx.restore();
		}
	}

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 12px ${FONT}`;
	ctx.fillStyle = step >= 1 ? c.text : c.sub;
	ctx.fillText(L.laneA, MARGIN, A_LABEL);
	ctx.fillStyle = step >= 2 ? c.text : c.sub;
	ctx.fillText(L.laneB, MARGIN, B_LABEL);
	tapeOutline(ctx, A_Y, usable, c);
	tapeOutline(ctx, B_Y, usable, c);

	const segW = usable / (ROWS * COLS);

	// ② 행 지향: 한 행씩 흘러든다 (표의 해당 칸이 같이 반짝인다)
	if (step >= 1) {
		rowOrder.forEach((s, i) => {
			const land = UNTIL[0] + 200 + i * 140;
			const a = fade(t, land, 250);
			drawSeg(ctx, MARGIN + i * segW, A_Y, segW, TABLE[s.c].ck, L.vals[s.c][s.r], c, a);
			if (i % COLS === COLS - 1 && a > 0.9) thickMark(ctx, MARGIN + (i + 1) * segW, A_Y, c);
			const flash = fade(t, land, 200) * (1 - fade(t, land + 350, 300));
			if (flash > 0 && step === 1) {
				ctx.save();
				ctx.globalAlpha = flash;
				ctx.beginPath();
				ctx.rect(tableX + s.c * colW + 1, TABLE_TOP + CELL_H * (s.r + 1) + 1, colW - 2, CELL_H - 2);
				ctx.strokeStyle = accent(c, TABLE[s.c].ck);
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.restore();
			}
		});
	}

	// ③ Parquet: 같은 열끼리 흘러든다
	if (step >= 2) {
		colOrder.forEach((s, i) => {
			const land = UNTIL[1] + 200 + i * 140;
			const a = fade(t, land, 250);
			drawSeg(ctx, MARGIN + i * segW, B_Y, segW, TABLE[s.c].ck, L.vals[s.c][s.r], c, a);
			if (i % ROWS === ROWS - 1 && a > 0.9) thickMark(ctx, MARGIN + (i + 1) * segW, B_Y, c);
			const flash = fade(t, land, 200) * (1 - fade(t, land + 350, 300));
			if (flash > 0 && step === 2) {
				ctx.save();
				ctx.globalAlpha = flash;
				ctx.beginPath();
				ctx.rect(tableX + s.c * colW + 1, TABLE_TOP + CELL_H * (s.r + 1) + 1, colW - 2, CELL_H - 2);
				ctx.strokeStyle = accent(c, TABLE[s.c].ck);
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.restore();
			}
		});
	}

	// ④ status만 읽는다면 — 행 지향은 흩어지고 Parquet은 한 블록
	if (step >= 3) {
		const a = fade(t, UNTIL[2], 450) * (step >= 4 ? 0.55 : 1);
		ctx.save();
		ctx.globalAlpha = a;
		ctx.setLineDash([3, 2]);
		ctx.lineWidth = 2;
		rowOrder.forEach((s, i) => {
			if (s.c !== STATUS) return;
			ctx.strokeStyle = c.red;
			ctx.beginPath();
			ctx.roundRect(MARGIN + i * segW - 0.5, A_Y - 2.5, segW + 1, TAPE_H + 5, 4);
			ctx.stroke();
		});
		ctx.setLineDash([]);
		ctx.strokeStyle = c.green;
		ctx.beginPath();
		ctx.roundRect(MARGIN + STATUS * ROWS * segW - 0.5, B_Y - 2.5, segW * ROWS + 1, TAPE_H + 5, 4);
		ctx.stroke();
		ctx.restore();
		const ba = fade(t, UNTIL[2] + 600, 400) * (step >= 4 ? 0.55 : 1);
		drawBadge(ctx, w - MARGIN - 48, A_LABEL, L.scatter, c.redFill, c.red, ba);
		const handoff = step >= 4 ? fade(t, UNTIL[3] + 300, 400) : 0;
		drawBadge(ctx, w - MARGIN - 48, B_LABEL, L.oneBlock, c.greenFill, c.green, ba * (1 - handoff));
	}

	// ⑤ 이웃한 같은 값 → 사전 인코딩 ("한 블록" 배지 자리를 이어받는다)
	if (step >= 4) {
		const a = fade(t, UNTIL[3] + 300, 450);
		ctx.save();
		ctx.font = `600 10.5px ${FONT}`;
		const dictW = ctx.measureText(L.dict).width / 2 + 8;
		ctx.restore();
		drawBadge(ctx, w - MARGIN - dictW, B_LABEL, L.dict, c.greenFill, c.green, a);
	}

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function StorageOrderDemo({ lang = "ko" }: { lang?: Lang }) {
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

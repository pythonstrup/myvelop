import { type Colors, clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// footer 목차가 담는 것: 컬럼별 바이트 위치와 덩어리별 min/max.
// user_id = 42 조회가 min/max로 덩어리를 고르고 위치로 점프하는 데까지 간다.
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
const UNTIL = [3200, 6600, 10200, 13800, 18400, 21600];
const CYCLE = 21600;
const HEIGHT = 320;

const GROUPS = 3;
const FOOTER_W = 0.08; // 실제보다 두껍게 그린다 — 안 그러면 안 보인다
const GROUP_W = (1 - FOOTER_W) / GROUPS;
const UID_W = 0.2; // 덩어리 안에서 user_id 열이 차지하는 폭
const HIT = 1; // 42가 들어 있는 덩어리 2 (0부터 세면 1)

const ROWS = [
	{ name: "덩어리1", pos: "bytes    0– 199", stat: "min  1 · max 25", ok: false },
	{ name: "덩어리2", pos: "bytes 1000–1199", stat: "min 26 · max 50", ok: true },
	{ name: "덩어리3", pos: "bytes 2000–2199", stat: "min 51 · max 99", ok: false },
] as const;

const LABELS = {
	ko: {
	captions: [
		"① Parquet은 행을 덩어리로 자르고, 덩어리 안을 열로 모은다",
		"② 파일 맨 끝에 목차(footer)가 붙는다 — 덩어리·컬럼마다 한 줄씩",
		"③ 목차에는 각 컬럼이 몇 바이트부터 몇 바이트까지인지가 적혀 있다",
		"④ 그리고 덩어리마다 그 컬럼 값의 min/max가 적혀 있다",
		"⑤ user_id = 42: min/max로 덩어리 2만 고르고, 위치로 점프한다",
		"⑥ 목차 = 어디에 있나(바이트 위치) + 뭐가 들었나(min/max)",
	],
	file: "data.parquet",
	colA: "user_id",
	colB: "event",
	group: (n: number) => `덩어리 ${n}`,
	tail: "목차(footer)",
	tocTitle: "footer 목차 — user_id 컬럼",
	query: "user_id = 42 를 찾는다",
	hit: "읽는 건 bytes 1000–1199, 200바이트뿐",
		rowNames: ["덩어리1", "덩어리2", "덩어리3"],
	aria: "Parquet 파일 끝의 목차인 footer가 무엇을 담는지 반복 재생하는 애니메이션. 파일은 행을 덩어리 셋으로 자르고 덩어리 안을 user_id와 event 열로 모으며, 맨 끝에 목차가 붙는다. 목차를 펼치면 덩어리마다 한 줄씩, user_id 컬럼이 몇 바이트부터 몇 바이트까지인지 위치가 적혀 있고, 그 덩어리에 든 값의 최솟값과 최댓값도 적혀 있다. user_id가 42인 행을 찾을 때는 min/max만 보고 26에서 50 사이인 덩어리 2만 고르고, 적힌 바이트 위치 1000에서 1199로 곧장 점프해 그 200바이트만 읽는다.",
},
	en: {
		captions: [
			"\u2460 Parquet cuts rows into groups and stores columns inside",
			"\u2461 A table of contents \u2014 the footer \u2014 sits at the very end",
			"\u2462 It records each column's byte range per row group",
			"\u2463 And the min/max of the values in each row group",
			"\u2464 user_id = 42: min/max picks group 2, the offset jumps there",
			"\u2465 The footer = where things are (bytes) + what's inside (min/max)",
		],
		file: "data.parquet",
		colA: "user_id",
		colB: "event",
		group: (n: number) => `group ${n}`,
		tail: "footer",
		tocTitle: "footer ToC \u2014 user_id column",
		query: "find user_id = 42",
		hit: "read bytes 1000\u20131199 only \u2014 200 bytes",
		rowNames: ["group 1", "group 2", "group 3"],
		aria: "Looping animation of what the footer, the table of contents at the end of a Parquet file, actually holds. The file cuts rows into three groups with user_id and event columns inside, and the footer sits at the very end. Unfolding it shows one line per row group: the byte range where the user_id column lives, plus the minimum and maximum of its values. To find the row with user_id 42, min/max alone picks row group 2, whose range 26 to 50 contains it, and the recorded byte offset 1000 to 1199 jumps straight to those 200 bytes.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 14;
const BAR_Y = 48;
const BAR_H = 34;
const BAR_BOTTOM = BAR_Y + BAR_H;
const TICK_Y = BAR_BOTTOM + 14;
const CARD_TOP = 122;
const LINE_H = 18;
const BADGE_Y = 232;
const BYTE_LABELS = ["0", "1000", "2000", "3000"];

const fade = (t: number, at: number, dur = 500) => ease(clamp01((t - at) / dur));

function drawCurve(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: string,
	alpha: number,
	dashed: boolean,
	head: boolean,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = head ? 1.8 : 1.2;
	if (dashed) ctx.setLineDash([4, 4]);
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.quadraticCurveTo((x1 + x2) / 2 + 30, y1 - 10, x2, y2 + (head ? 8 : 0));
	ctx.stroke();
	if (head) {
		ctx.setLineDash([]);
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(x2 - 4.5, y2 + 8);
		ctx.lineTo(x2 + 4.5, y2 + 8);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
	}
	ctx.restore();
}

function drawLegend(
	ctx: CanvasRenderingContext2D,
	rightX: number,
	y: number,
	c: Colors,
	items: { label: string; color: string; fill: string }[],
) {
	ctx.save();
	ctx.font = `600 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	const widths = items.map((it) => 15 + ctx.measureText(it.label).width);
	const total = widths.reduce((a, b) => a + b, 0) + 14 * (items.length - 1);
	let x = rightX - total;
	items.forEach((it, i) => {
		ctx.beginPath();
		ctx.roundRect(x, y - 5, 10, 10, 2);
		ctx.fillStyle = it.fill;
		ctx.fill();
		ctx.strokeStyle = it.color;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.fillStyle = c.sub;
		ctx.fillText(it.label, x + 15, y + 0.5);
		x += widths[i] + 14;
	});
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const usable = w - MARGIN * 2;
	const step = UNTIL.findIndex((u) => t < u);

	const groupX = (g: number) => MARGIN + g * GROUP_W * usable;
	const groupW = GROUP_W * usable;
	const uidX = (g: number) => groupX(g);
	const uidW = UID_W * groupW;
	const footerX = MARGIN + (1 - FOOTER_W) * usable;
	const footerW = FOOTER_W * usable;

	// 파일 이름과 열 범례
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	ctx.font = `600 12px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(L.file, MARGIN, 18);
	drawLegend(ctx, w - MARGIN, 18, c, [
		{ label: L.colA, color: c.blue, fill: c.blueFill },
		{ label: L.colB, color: c.amber, fill: c.amberFill },
	]);

	// 파일 막대: 덩어리 3개(user_id + event) + 꼬리
	for (let g = 0; g < GROUPS; g++) {
		ctx.beginPath();
		ctx.rect(uidX(g), BAR_Y, uidW, BAR_H);
		ctx.fillStyle = c.blueFill;
		ctx.fill();
		ctx.strokeStyle = c.blue;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.beginPath();
		ctx.rect(uidX(g) + uidW, BAR_Y, groupW - uidW, BAR_H);
		ctx.fillStyle = c.amberFill;
		ctx.fill();
		ctx.strokeStyle = c.amber;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(groupX(g) + groupW, BAR_Y - 2);
		ctx.lineTo(groupX(g) + groupW, BAR_BOTTOM + 2);
		ctx.strokeStyle = c.sub;
		ctx.lineWidth = 1.8;
		ctx.stroke();
		ctx.restore();
		ctx.textAlign = "center";
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(L.group(g + 1), groupX(g) + groupW / 2, 38);
	}

	// 꼬리 — ①에서는 잿빛, ②부터 붉은 강조
	const tailHot = fade(t, UNTIL[0], 500);
	ctx.beginPath();
	ctx.rect(footerX, BAR_Y, footerW, BAR_H);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.stroke();
	if (tailHot > 0) {
		ctx.save();
		ctx.globalAlpha = tailHot;
		ctx.beginPath();
		ctx.rect(footerX, BAR_Y, footerW, BAR_H);
		ctx.fillStyle = c.redFill;
		ctx.fill();
		ctx.strokeStyle = c.red;
		ctx.lineWidth = 1.4;
		ctx.stroke();
		ctx.strokeStyle = c.red;
		ctx.lineWidth = 1.2;
		for (let g = 0; g < GROUPS; g++) {
			const y = BAR_Y + 9 + g * 8;
			ctx.beginPath();
			ctx.moveTo(footerX + 5, y);
			ctx.lineTo(footerX + footerW - 5, y);
			ctx.stroke();
		}
		ctx.restore();
	}
	ctx.textAlign = "center";
	ctx.font = `600 11px ${FONT}`;
	ctx.fillStyle = tailHot > 0.5 ? c.red : c.sub;
	ctx.fillText(L.tail, footerX + footerW / 2 - 6, 38);

	// 막대 밑 바이트 주소 눈금
	ctx.font = `500 10px ${MONO}`;
	ctx.fillStyle = c.sub;
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	BYTE_LABELS.forEach((label, i) => {
		const x = i < GROUPS ? groupX(i) : footerX;
		ctx.beginPath();
		ctx.moveTo(x, BAR_BOTTOM);
		ctx.lineTo(x, BAR_BOTTOM + 5);
		ctx.stroke();
		ctx.textAlign = i === 0 ? "left" : "center";
		ctx.fillText(label, x, TICK_Y);
	});

	// ②부터: 목차 카드 (꼬리를 펼친 것)
	if (step >= 1) {
		const cardA = fade(t, UNTIL[0], 400);
		ctx.font = `600 11px ${MONO}`;
		const nameW = ctx.measureText(`${L.rowNames[0]}  `).width;
		const posW = ctx.measureText(ROWS[0].pos).width;
		const sepW = ctx.measureText("  ").width;
		const statW = ctx.measureText(ROWS[0].stat).width;
		const cardW = 12 + nameW + posW + sepW + statW + 26;
		const cardH = 16 + LINE_H * (ROWS.length + 1) + 6;
		const cardX = MARGIN;

		drawCurve(ctx, footerX + footerW / 2, BAR_BOTTOM + 20, cardX + cardW - 30, CARD_TOP + 2, c.red, cardA * 0.8, true, false);

		ctx.save();
		ctx.globalAlpha = cardA;
		ctx.beginPath();
		ctx.roundRect(cardX, CARD_TOP, cardW, cardH, 8);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = tailHot > 0 ? c.red : c.line;
		ctx.lineWidth = 1.1;
		ctx.stroke();
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = c.red;
		ctx.fillText(L.tocTitle, cardX + 12, CARD_TOP + 14);
		ctx.restore();

		const statOn = step >= 3 ? fade(t, UNTIL[2], 450) : 0;
		const picking = step >= 4 ? fade(t, UNTIL[3] + 600, 450) : 0;

		ROWS.forEach((r, i) => {
			const rowA = cardA * fade(t, UNTIL[0] + 300 + i * 350, 350);
			const posOnRow = step >= 2 ? fade(t, UNTIL[1] + i * 450, 400) : 0;
			const rowY = CARD_TOP + 16 + LINE_H * (i + 1);
			const dim = picking > 0 && !r.ok ? 1 - picking * 0.62 : 1;
			const xName = cardX + 12;
			const xPos = xName + nameW;
			const xStat = xPos + posW + sepW;

			ctx.save();
			ctx.globalAlpha = rowA * dim;

			// ⑤ 고른 줄 뒤에 초록 바탕
			if (r.ok && picking > 0) {
				ctx.save();
				ctx.globalAlpha = rowA * picking;
				ctx.beginPath();
				ctx.roundRect(cardX + 6, rowY - 8.5, cardW - 12, 17, 5);
				ctx.fillStyle = c.greenFill;
				ctx.fill();
				ctx.strokeStyle = c.green;
				ctx.lineWidth = 1.2;
				ctx.stroke();
				ctx.restore();
			}
			// ③ 위치 칸, ④ min/max 칸 바탕색
			if (posOnRow > 0) {
				ctx.save();
				ctx.globalAlpha = rowA * posOnRow * (r.ok || picking === 0 ? 1 : dim);
				ctx.beginPath();
				ctx.roundRect(xPos - 3, rowY - 8, posW + 6, 16, 4);
				ctx.fillStyle = c.blueFill;
				ctx.fill();
				ctx.restore();
			}
			if (statOn > 0) {
				ctx.save();
				ctx.globalAlpha = rowA * statOn * (r.ok || picking === 0 ? 1 : dim);
				ctx.beginPath();
				ctx.roundRect(xStat - 3, rowY - 8, statW + 6, 16, 4);
				ctx.fillStyle = c.amberFill;
				ctx.fill();
				ctx.restore();
			}

			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.font = `600 11px ${MONO}`;
			ctx.fillStyle = c.text;
			ctx.fillText(L.rowNames[i], xName, rowY);
			ctx.fillStyle = posOnRow > 0.5 ? c.blue : c.sub;
			ctx.fillText(r.pos, xPos, rowY);
			ctx.fillStyle = statOn > 0.5 ? c.amber : c.sub;
			ctx.fillText(r.stat, xStat, rowY);

			// ⑤ min/max 판정 표시
			if (picking > 0) {
				ctx.save();
				ctx.globalAlpha = rowA * picking;
				ctx.font = `700 12px ${FONT}`;
				ctx.fillStyle = r.ok ? c.green : c.red;
				ctx.fillText(r.ok ? "✓" : "✗", cardX + cardW - 18, rowY);
				ctx.restore();
			}
			ctx.restore();

			// ③ 같은 타이밍에 파일의 해당 조각을 고리로 짚어 짝을 보여준다
			const ringA = posOnRow * (1 - fade(t, UNTIL[2], 400));
			if (ringA > 0 && i < GROUPS) {
				ctx.save();
				ctx.globalAlpha = ringA;
				ctx.setLineDash([4, 3]);
				ctx.strokeStyle = c.blue;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.roundRect(uidX(i) - 1.5, BAR_Y - 2, uidW + 3, BAR_H + 4, 4);
				ctx.stroke();
				ctx.restore();
			}
		});

		// ⑤ 조회: 질문 배지 → 고른 줄에서 파일 위치로 점프
		if (step >= 4) {
			const qa = fade(t, UNTIL[3], 350);
			ctx.save();
			ctx.font = `600 11px ${FONT}`;
			const qw = ctx.measureText(L.query).width / 2 + 8;
			ctx.restore();
			drawBadge(ctx, Math.min(cardX + cardW + 8 + qw, w - MARGIN - qw), CARD_TOP + 14, L.query, c.boxFill, c.text, qa);
			const jump = fade(t, UNTIL[3] + 1600, 500);
			const rowY = CARD_TOP + 16 + LINE_H * (HIT + 1);
			drawCurve(ctx, cardX + cardW + 2, rowY, uidX(HIT) + uidW / 2, BAR_BOTTOM + 6, c.green, jump, false, true);
			if (jump > 0) {
				ctx.save();
				ctx.globalAlpha = jump;
				ctx.beginPath();
				ctx.roundRect(uidX(HIT) - 1.5, BAR_Y - 2, uidW + 3, BAR_H + 4, 4);
				ctx.strokeStyle = c.green;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.globalAlpha = jump * 0.3;
				ctx.fillStyle = c.green;
				ctx.fillRect(uidX(HIT), BAR_Y, uidW, BAR_H);
				ctx.restore();
			}
			drawBadge(ctx, w / 2, BADGE_Y, L.hit, c.greenFill, c.green, fade(t, UNTIL[3] + 2300, 400));
		}
	}

	ctx.textAlign = "center";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function FooterTocDemo({ lang = "ko" }: { lang?: Lang }) {
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

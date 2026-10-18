import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, drawCard, fitCaption } from "./canvas";

// 두 요청이 「조회 → 넣기」 사이에서 엇갈려 회의실 A에 겹친 예약 두 개가 남는 순서를 그린다.
// lock 이면 조회에 FOR UPDATE 를 붙인 경우다. 잠글 행이 없어서 결과가 같다.
// 회의실 열은 요구사항 그림처럼 시간이 세로로 흐른다. 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const CYCLE = 11400;
const HEIGHT = 250;

const T_TOP = 10; // 10:00
const T_BOT = 12; // 12:00
const Y_TOP = 40;
const Y_BOT = 200;
const yAt = (hour: number) => Y_TOP + ((Y_BOT - Y_TOP) * (hour - T_TOP)) / (T_BOT - T_TOP);

const REQ = [
	{ from: 10, to: 11 }, // 요청 1
	{ from: 10.5, to: 11.5 }, // 요청 2
];
const CARD_Y = [Y_TOP, Y_TOP + 96];
const CARD_H = 64;

// 단계 경계와 각 동작의 시작 시각(ms). 동작은 MOVE 동안 진행한다.
const STEP_END = [2200, 4400, 6400, 8400, CYCLE];
const MOVE = 800;
const QUERY_AT = [300, 2500]; // 요청 1·2 조회
const INSERT_AT = [6700, 4700]; // 요청 1·2 넣기 (요청 2가 먼저 넣는다)
const OVERLAP_AT = 8600;

type Labels = {
	cards: [string, string];
	query: string;
	insert: string;
	room: string;
	found: string;
	overlap: string;
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, { select: Labels; lock: Labels }> = {
	ko: {
		select: {
			cards: ["요청 1 · A 10:00–11:00", "요청 2 · A 10:30–11:30"],
			query: "조회 → 0건",
			insert: "넣고 커밋",
			room: "회의실 A",
			found: "0건",
			overlap: "겹침",
			captions: [
				"① 요청 1이 겹치는 예약을 조회한다 → 0건",
				"② 요청 2도 조회한다 → 0건",
				"③ 요청 2가 넣고 커밋한다",
				"④ 요청 1도 넣고 커밋한다",
				"⑤ 10:30–11:00에 예약 두 개가 겹친다",
			],
			aria: "두 요청이 회의실 A에 예약을 넣는 순서를 반복 재생하는 애니메이션. 요청 1이 10시–11시와 겹치는 예약을 조회해 0건을 받고, 요청 2도 10시 30분–11시 30분을 조회해 0건을 받는다. 요청 2가 먼저 넣고 커밋한 뒤 요청 1도 넣고 커밋해서, 10시 30분부터 11시까지 예약 두 개가 겹친다.",
		},
		lock: {
			cards: ["요청 1 · A 10:00–11:00", "요청 2 · A 10:30–11:30"],
			query: "FOR UPDATE → 0건",
			insert: "넣고 커밋",
			room: "회의실 A",
			found: "잠글 행 없음",
			overlap: "겹침",
			captions: [
				"① FOR UPDATE로 조회해도 잠글 행이 없다",
				"② 요청 2도 기다리지 않고 조회한다",
				"③ 요청 2가 넣고 커밋한다",
				"④ 요청 1도 넣고 커밋한다",
				"⑤ 잠금 없이 지나가서 두 예약이 겹친다",
			],
			aria: "조회에 FOR UPDATE를 붙인 경우를 반복 재생하는 애니메이션. 요청 1이 FOR UPDATE로 회의실 A의 10시–11시와 겹치는 예약을 조회하지만 0건이라 잠글 행이 없다. 요청 2도 기다리지 않고 조회해 0건을 받는다. 요청 2가 먼저 넣고 커밋한 뒤 요청 1도 넣고 커밋해서 두 예약이 겹친다.",
		},
	},
	en: {
		select: {
			cards: ["Request 1 · A 10:00–11:00", "Request 2 · A 10:30–11:30"],
			query: "Check → 0 rows",
			insert: "Insert, commit",
			room: "Room A",
			found: "0 rows",
			overlap: "overlap",
			captions: [
				"① Request 1 checks for overlaps → 0 rows",
				"② Request 2 checks too → 0 rows",
				"③ Request 2 inserts and commits",
				"④ Request 1 inserts and commits too",
				"⑤ Two bookings overlap at 10:30–11:00",
			],
			aria: "Looping animation of two requests booking room A. Request 1 checks for bookings overlapping 10:00–11:00 and gets 0 rows; request 2 checks 10:30–11:30 and also gets 0 rows. Request 2 inserts and commits first, then request 1 inserts and commits, leaving two bookings that overlap from 10:30 to 11:00.",
		},
		lock: {
			cards: ["Request 1 · A 10:00–11:00", "Request 2 · A 10:30–11:30"],
			query: "FOR UPDATE → 0 rows",
			insert: "Insert, commit",
			room: "Room A",
			found: "nothing to lock",
			overlap: "overlap",
			captions: [
				"① FOR UPDATE finds no row to lock",
				"② Request 2 checks without waiting",
				"③ Request 2 inserts and commits",
				"④ Request 1 inserts and commits too",
				"⑤ Nothing was locked, so they overlap",
			],
			aria: "Looping animation of the same check with FOR UPDATE. Request 1 checks room A for bookings overlapping 10:00–11:00 with FOR UPDATE, but gets 0 rows, so nothing is locked. Request 2 checks without waiting and also gets 0 rows. Request 2 inserts and commits first, then request 1 inserts and commits, and the two bookings overlap.",
		},
	},
};

// 가로 배치: 왼쪽에 요청 카드, 오른쪽에 회의실 A 열과 시각 눈금.
function layout(w: number) {
	const comp = Math.min(w - 28, 520);
	const ox = (w - comp) / 2;
	const colW = comp * 0.3;
	const colX = ox + comp - colW - 36;
	const cardW = comp - colW - 36 - 30;
	return { ox, colW, colX, cardW };
}

const progress = (t: number, at: number) => ease(clamp01((t - at) / MOVE));

// 아무것도 걸리지 않은 자물쇠. 점선으로 그려 잠긴 행이 없음을 보인다.
function drawLock(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.6;
	ctx.setLineDash([3, 2]);
	ctx.beginPath();
	ctx.arc(cx, cy - 4, 5, Math.PI, 0);
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(cx - 7.5, cy - 4, 15, 11, 2);
	ctx.stroke();
	ctx.restore();
}

function makeScene(L: Labels, lock: boolean) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const { ox, colW, colX, cardW } = layout(w);
		const step = STEP_END.findIndex((end) => t < end);
		const colors = [
			{ stroke: c.blue, fill: c.blueFill },
			{ stroke: c.amber, fill: c.amberFill },
		];

		// 회의실 A 열: 머리글, 칸, 30분 눈금, 시각
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.room, colX + colW / 2, Y_TOP - 16);
		ctx.beginPath();
		ctx.roundRect(colX, Y_TOP, colW, Y_BOT - Y_TOP, 6);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		for (const hour of [10.5, 11, 11.5]) {
			ctx.save();
			ctx.strokeStyle = c.line;
			if (!Number.isInteger(hour)) ctx.setLineDash([2, 3]);
			ctx.beginPath();
			ctx.moveTo(colX, yAt(hour));
			ctx.lineTo(colX + colW, yAt(hour));
			ctx.stroke();
			ctx.restore();
		}
		ctx.textAlign = "left";
		ctx.font = `500 10px ${FONT}`;
		ctx.fillStyle = c.sub;
		for (const hour of [10, 11, 12]) ctx.fillText(`${hour}:00`, colX + colW + 6, yAt(hour));

		// 넣은 예약: 요청 1은 왼쪽 반, 요청 2는 오른쪽 반에 위에서 아래로 자란다.
		REQ.forEach((r, i) => {
			const p = progress(t, INSERT_AT[i]);
			if (p <= 0) return;
			const half = colW / 2;
			const x = i === 0 ? colX + 4 : colX + half + 2;
			const y0 = yAt(r.from);
			const h = (yAt(r.to) - y0) * p;
			ctx.beginPath();
			ctx.roundRect(x, y0, half - 6, h, 4);
			ctx.fillStyle = colors[i].fill;
			ctx.fill();
			ctx.strokeStyle = colors[i].stroke;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			if (p > 0.6) {
				ctx.textAlign = "center";
				ctx.font = `700 11px ${FONT}`;
				ctx.fillStyle = colors[i].stroke;
				ctx.fillText(String(i + 1), x + (half - 6) / 2, y0 + 12);
			}
		});

		// 겹친 구간
		const ov = clamp01((t - OVERLAP_AT) / 600);
		if (ov > 0) {
			ctx.save();
			ctx.globalAlpha = ov * 0.3;
			ctx.fillStyle = c.red;
			ctx.fillRect(colX + 1, yAt(10.5), colW - 2, yAt(11) - yAt(10.5));
			ctx.restore();
			// 붉은 띠 위에서도 읽히게 배지 바탕은 페이지 배경색으로 칠한다.
			drawBadge(ctx, colX + colW / 2, (yAt(10.5) + yAt(11)) / 2, L.overlap, dark ? "#0d1117" : "#ffffff", c.red, ov);
		}

		// 조회: 해당 시간 범위를 점선으로 훑고, 결과 배지를 띄웠다가 다음 단계에서 사라진다.
		REQ.forEach((r, i) => {
			const p = progress(t, QUERY_AT[i]);
			const done = QUERY_AT[i] + MOVE;
			const alpha = t < QUERY_AT[i] ? 0 : t < done + 900 ? 1 : 1 - clamp01((t - done - 900) / 400);
			if (alpha <= 0) return;
			const y0 = yAt(r.from);
			const y1 = yAt(r.to);
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.setLineDash([4, 3]);
			ctx.strokeStyle = colors[i].stroke;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.roundRect(colX + 2, y0, colW - 4, (y1 - y0) * p, 4);
			ctx.stroke();
			ctx.restore();
			if (t >= done) {
				const a = alpha * clamp01((t - done) / 250);
				const mid = (y0 + y1) / 2;
				if (lock) drawLock(ctx, colX + colW / 2, mid - 14, colors[i].stroke, a);
				drawBadge(ctx, colX + colW / 2, lock ? mid + 10 : mid, L.found, c.boxFill, colors[i].stroke, a);
			}
			drawArrow(ctx, ox + cardW + 6, CARD_Y[i] + CARD_H / 2, colX - 6, (y0 + y1) / 2, colors[i].stroke, alpha * clamp01((t - QUERY_AT[i]) / 200), true);
		});

		// 넣기 화살표
		REQ.forEach((r, i) => {
			const start = INSERT_AT[i];
			const alpha = t < start ? 0 : t < start + MOVE + 500 ? 1 : 1 - clamp01((t - start - MOVE - 500) / 400);
			drawArrow(ctx, ox + cardW + 6, CARD_Y[i] + CARD_H / 2, colX - 6, (yAt(r.from) + yAt(r.to)) / 2, colors[i].stroke, alpha, false);
		});

		// 요청 카드: 조회 결과와 커밋을 한 줄씩 남긴다.
		REQ.forEach((_, i) => {
			drawCard(
				ctx,
				c,
				ox,
				CARD_Y[i],
				cardW,
				CARD_H,
				L.cards[i],
				[
					{ text: L.query, alpha: clamp01((t - QUERY_AT[i] - MOVE) / 250) },
					{ text: L.insert, alpha: clamp01((t - INSERT_AT[i] - MOVE) / 250) },
				],
				colors[i].stroke,
				colors[i].fill,
			);
		});

		// 하단 캡션
		const caption = L.captions[step];
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		fitCaption(ctx, caption, w);
		ctx.fillStyle = c.text;
		ctx.fillText(caption, w / 2, HEIGHT - 16);
	};
}

// 언어·모드별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = {
	ko: { select: makeScene(LABELS.ko.select, false), lock: makeScene(LABELS.ko.lock, true) },
	en: { select: makeScene(LABELS.en.select, false), lock: makeScene(LABELS.en.lock, true) },
};

export default function CheckThenInsertDemo({ lang = "ko", lock = false }: { lang?: Lang; lock?: boolean }) {
	const mode = lock ? "lock" : "select";
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang][mode]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang][mode].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

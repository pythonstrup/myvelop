import { clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, drawCard, fitCaption } from "./canvas";

// 회의실 A의 15분 칸 행을 두고 10:00–11:00(세션 1)과 10:30–11:30(세션 2)이 같은 순간에 다투는 과정.
// 세션 1이 빈 칸을 시각 순서로 잠그면 세션 2는 10:30 행의 잠금을 기다린다. 세션 1이 커밋하면 세션 2는 찬 칸을 건너뛰고
// 2칸만 잠가 롤백한다. 교착 검사를 기다리는 1초가 없다. 시간은 세로축이다.
const CYCLE = 11400;
const HEIGHT = 230;
const STEP_END = [2200, 4600, 6400, 8600, CYCLE];
const TIMES = ["10:00", "10:15", "10:30", "10:45", "11:00", "11:15"];
const CELL_TOP = 30;
const CELL_H = 24;
const CELL_GAP = 2;
const S1_LOCK = [2400, 2650, 2900, 3150];
const S2_WAIT = 3400;
const S1_COMMIT = 4800;
const S2_RECHECK = 6600;
const S2_LOCK = [7000, 7250];
const S2_ROLLBACK = 8800;
const CARD = [
	{ y: 26, h: 64 },
	{ y: 104, h: 82 },
];

type Labels = {
	room: string;
	cards: [string, string];
	s1: [string, string];
	s2: [string, string, string];
	cell: string;
	wait: string;
	taken: string;
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		room: "회의실 A",
		cards: ["세션 1 · 10:00–11:00", "세션 2 · 10:30–11:30"],
		s1: ["빈 칸 4개 잠금", "고치고 커밋"],
		s2: ["10:30에서 세션 1을 기다림", "다시 확인 → 2칸만 잠금", "롤백 · 이미 예약된 시간"],
		cell: "세션 1",
		wait: "대기",
		taken: "찬 칸",
		captions: [
			"① 10:00–11:00과 10:30–11:30이 같은 순간에 들어온다",
			"② 세션 1이 빈 칸을 순서대로 잠그고, 세션 2는 10:30에서 기다린다",
			"③ 세션 1이 칸을 고치고 커밋한다",
			"④ 세션 2는 다시 확인해 찬 칸을 건너뛰고 2칸만 잠근다",
			"⑤ 4칸이 아니라서 롤백한다 · 교착 검사 1초가 없다",
		],
		aria: "회의실 A의 15분 칸 행을 두고 두 예약이 다투는 과정을 반복 재생하는 애니메이션. 10:00–11:00(세션 1)과 10:30–11:30(세션 2)이 같은 순간에 들어온다. 세션 1이 10:00부터 10:45까지 빈 칸 4개를 시각 순서로 잠그고, 세션 2는 10:30 행의 잠금을 기다린다. 세션 1이 칸을 고치고 커밋하면 세션 2는 10:30과 10:45를 다시 확인해 찬 칸이라 건너뛰고, 11:00과 11:15 두 칸만 잠근다. 4칸이 아니므로 롤백하고 이미 예약된 시간이라고 답한다. 교착 검사를 기다리는 1초가 없다.",
	},
	en: {
		room: "Room A",
		cards: ["Session 1 · 10:00–11:00", "Session 2 · 10:30–11:30"],
		s1: ["locks 4 free slots", "updates and commits"],
		s2: ["waits for session 1 at 10:30", "rechecks → locks only 2", "rollback · already booked"],
		cell: "session 1",
		wait: "waiting",
		taken: "taken",
		captions: [
			"① 10:00–11:00 and 10:30–11:30 arrive at the same moment",
			"② Session 1 locks free slots in order; session 2 waits at 10:30",
			"③ Session 1 updates the slots and commits",
			"④ Session 2 rechecks, skips taken slots, and locks only 2",
			"⑤ Not 4 slots, so it rolls back · no 1 s deadlock check",
		],
		aria: "Looping animation of two bookings competing for room A's 15-minute slot rows. 10:00–11:00 (session 1) and 10:30–11:30 (session 2) arrive at the same moment. Session 1 locks the four free slots from 10:00 to 10:45 in time order, and session 2 waits for the lock on the 10:30 row. When session 1 updates the slots and commits, session 2 rechecks 10:30 and 10:45, skips them as taken, and locks only 11:00 and 11:15. Having locked fewer than 4 slots, it rolls back and answers that the time is already booked. There is no 1-second deadlock check.",
	},
};

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pageBg = dark ? "#0d1117" : "#ffffff";
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const cardW = comp * 0.56;
		const colX = ox + cardW + 46;
		const colW = comp - cardW - 46 - 40;
		const cellY = (k: number) => CELL_TOP + k * (CELL_H + CELL_GAP);
		const step = STEP_END.findIndex((end) => t < end);
		const fade = (at: number) => clamp01((t - at) / 300);
		const committed = t >= S1_COMMIT;
		const s2Gone = 1 - clamp01((t - S2_ROLLBACK) / 600);

		// 회의실 A의 칸과 시각
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(L.room, colX + colW / 2, 14);
		TIMES.forEach((time, k) => {
			ctx.beginPath();
			ctx.roundRect(colX, cellY(k), colW, CELL_H, 4);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = c.boxStroke;
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.font = `500 10px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.fillText(time, colX + colW + 6, cellY(k) + CELL_H / 2);
		});

		// 칸 하나를 잠그거나 고친 모습. 커밋 전은 점선이다.
		const fill = (k: number, color: string, bg: string, dashed: boolean, alpha: number, label?: string) => {
			if (alpha <= 0) return;
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.beginPath();
			ctx.roundRect(colX + 2, cellY(k) + 2, colW - 4, CELL_H - 4, 3);
			ctx.fillStyle = bg;
			ctx.fill();
			if (dashed) ctx.setLineDash([4, 3]);
			ctx.strokeStyle = color;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			if (label) {
				ctx.font = `700 9.5px ${FONT}`;
				ctx.fillStyle = color;
				ctx.textAlign = "center";
				ctx.fillText(label, colX + colW / 2, cellY(k) + CELL_H / 2 + 0.5);
			}
			ctx.restore();
		};
		S1_LOCK.forEach((at, k) => fill(k, c.blue, c.blueFill, !committed, fade(at), committed ? L.cell : undefined));
		S2_LOCK.forEach((at, i) => fill(4 + i, c.amber, c.amberFill, true, fade(at) * s2Gone));

		// 세션 2가 10:30 행의 잠금을 기다리는 화살표
		const waitAlpha = fade(S2_WAIT) * (1 - clamp01((t - S1_COMMIT - 200) / 400));
		const ax0 = ox + cardW + 4;
		const ay0 = CARD[1].y + 30;
		const ax1 = colX - 4;
		const ay1 = cellY(2) + CELL_H / 2;
		drawArrow(ctx, ax0, ay0, ax1, ay1, c.amber, waitAlpha, true);
		if (waitAlpha > 0) drawBadge(ctx, (ax0 + ax1) / 2, (ay0 + ay1) / 2 + 12, L.wait, pageBg, c.amber, waitAlpha * (0.55 + 0.45 * Math.abs(Math.sin(t / 300))));

		// 다시 확인한 찬 칸 두 개를 표시한다
		const recheck = fade(S2_RECHECK) * (1 - clamp01((t - S2_ROLLBACK) / 400));
		if (recheck > 0) {
			ctx.save();
			ctx.globalAlpha = recheck;
			ctx.setLineDash([3, 3]);
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(colX - 3, cellY(2) - 3, colW + 6, CELL_H * 2 + CELL_GAP + 6, 5);
			ctx.stroke();
			ctx.restore();
			drawBadge(ctx, colX - 24, cellY(3), L.taken, pageBg, c.amber, recheck);
		}

		// 세션 카드
		drawCard(ctx, c, ox, CARD[0].y, cardW, CARD[0].h, L.cards[0], [
			{ text: L.s1[0], alpha: fade(S1_LOCK[3]) },
			{ text: L.s1[1], alpha: fade(S1_COMMIT), color: c.green },
		], c.blue, c.blueFill);
		drawCard(ctx, c, ox, CARD[1].y, cardW, CARD[1].h, L.cards[1], [
			{ text: L.s2[0], alpha: fade(S2_WAIT), color: committed ? c.sub : c.amber },
			{ text: L.s2[1], alpha: fade(S2_LOCK[1]) },
			{ text: L.s2[2], alpha: fade(S2_ROLLBACK), color: c.red },
		], c.amber, c.amberFill);

		const caption = L.captions[step];
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		fitCaption(ctx, caption, w);
		ctx.fillStyle = c.text;
		ctx.fillText(caption, w / 2, HEIGHT - 16);
	};
}

const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function SlotContentionDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

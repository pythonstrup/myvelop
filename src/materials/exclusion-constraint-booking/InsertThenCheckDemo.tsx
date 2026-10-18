import { clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, drawCard, drawEntry, fitCaption } from "./canvas";

// 같은 예약을 같은 순간에 넣는 두 세션을 UNIQUE(위)와 EXCLUDE(아래)로 나란히 놓는다.
// UNIQUE 는 확인하며 넣어서 늦은 쪽이 자기 항목 없이 기다리고, EXCLUDE 는 먼저 넣은 뒤 검사해서 서로를 기다린다.
const CYCLE = 13000;
const HEIGHT = 292;
const STEP_END = [1600, 4000, 6400, 9000, CYCLE];
const LANE_Y = [30, 162];
const CARD_H = 46;
const ROW_GAP = 54; // 세션 1 줄과 세션 2 줄의 간격
const INSERT_AT = 1800; // EXCLUDE 의 세션 2는 200ms 뒤
const U_WAIT_AT = 4200;
const E_CHECK_AT = 6600;
const E_DEADLOCK_AT = 8000;
const U_COMMIT_AT = 9200;
const U_REJECT_AT = 9800;

type Labels = {
	lanes: [string, string];
	session: [string, string];
	entry: [string, string];
	notInserted: string;
	u1: [string, string];
	u2: [string, string];
	e: [string, string, string];
	deadlock: string;
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		lanes: ["UNIQUE · B-tree 인덱스", "EXCLUDE · GiST 인덱스"],
		session: ["세션 1", "세션 2"],
		entry: ["세션 1 항목", "세션 2 항목"],
		notInserted: "넣지 않음",
		u1: ["확인하며 넣음", "커밋"],
		u2: ["같은 키 발견 → 대기", "다시 확인 → 23505"],
		e: ["먼저 넣음", "세션 2를 기다림", "세션 1을 기다림"],
		deadlock: "교착",
		captions: [
			"① 두 세션이 같은 순간에 같은 예약을 넣는다",
			"② UNIQUE는 확인하며 넣고, EXCLUDE는 먼저 넣는다",
			"③ UNIQUE의 세션 2는 자기 항목 없이 기다린다",
			"④ EXCLUDE는 서로의 항목을 찾아 서로를 기다린다",
			"⑤ UNIQUE는 23505로 끝나고 EXCLUDE는 교착에 빠진다",
		],
		aria: "같은 회의실과 시간의 예약을 같은 순간에 넣는 두 세션을 UNIQUE와 EXCLUDE로 나란히 보여 주는 반복 애니메이션. UNIQUE는 인덱스에 항목을 넣으면서 같은 키를 확인한다. 세션 1이 먼저 넣고, 세션 2는 세션 1의 항목을 발견해 자기 항목을 넣지 않은 채 기다리다가 세션 1이 커밋하자 23505로 거절된다. EXCLUDE는 두 세션이 모두 항목을 먼저 넣은 뒤 검사한다. 각자 상대의 커밋 전 항목을 찾아 서로를 기다리고, 어느 쪽도 끝나지 않는 교착에 빠진다.",
	},
	en: {
		lanes: ["UNIQUE · B-tree index", "EXCLUDE · GiST index"],
		session: ["Session 1", "Session 2"],
		entry: ["session 1 entry", "session 2 entry"],
		notInserted: "not inserted",
		u1: ["checks while inserting", "committed"],
		u2: ["finds the key → waits", "rechecks → 23505"],
		e: ["inserts first", "waits for session 2", "waits for session 1"],
		deadlock: "deadlock",
		captions: [
			"① Two sessions insert the same booking at once",
			"② UNIQUE checks while inserting; EXCLUDE inserts first",
			"③ UNIQUE's session 2 waits without its own entry",
			"④ EXCLUDE sessions find each other's entries and wait",
			"⑤ UNIQUE ends in 23505; EXCLUDE is deadlocked",
		],
		aria: "Looping animation comparing UNIQUE and EXCLUDE when two sessions insert a booking for the same room and time at the same moment. UNIQUE checks for the key while inserting the index entry: session 1 inserts first, and session 2 finds session 1's entry and waits without inserting its own, then is rejected with 23505 when session 1 commits. With EXCLUDE both sessions insert their entries first and then check. Each finds the other's uncommitted entry, they wait for each other, and neither finishes: a deadlock.",
	},
};


function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pageBg = dark ? "#0d1117" : "#ffffff";
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const cardW = comp * 0.5;
		const gapX = 44;
		const idxX = ox + cardW + gapX;
		const idxW = comp - cardW - gapX;
		const step = STEP_END.findIndex((end) => t < end);
		const fade = (at: number) => clamp01((t - at) / 300);
		const pulse = (at: number, until: number) => (t < at ? 0 : t < until ? 1 : 1 - clamp01((t - until) / 400));
		const sessionColor = [c.blue, c.amber];
		const sessionFill = [c.blueFill, c.amberFill];

		LANE_Y.forEach((y0, lane) => {
			const unique = lane === 0;
			const cy = (k: number) => y0 + k * ROW_GAP + CARD_H / 2;
			const fromX = ox + cardW + 4;
			const toX = idxX + 6;

			ctx.font = `600 10.5px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(L.lanes[lane], ox, y0 - 12);
			ctx.beginPath();
			ctx.roundRect(idxX, y0, idxW, ROW_GAP + CARD_H, 8);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = c.boxStroke;
			ctx.lineWidth = 1;
			ctx.stroke();

			// 항목을 넣는 화살표와 항목
			const entryX = idxX + 8;
			const entryW = idxW - 16;
			const insertAt = (k: number) => INSERT_AT + (unique ? 0 : k * 200);
			const inserts = unique ? [0] : [0, 1];
			for (const k of inserts) {
				drawArrow(ctx, fromX, cy(k), toX, cy(k), sessionColor[k], pulse(insertAt(k) - 300, insertAt(k) + 700), false);
				const committed = unique && t >= U_COMMIT_AT;
				drawEntry(ctx, c, entryX, cy(k), entryW, L.entry[k], sessionColor[k], sessionFill[k], !committed, fade(insertAt(k)));
			}
			if (unique) drawEntry(ctx, c, entryX, cy(1), entryW, L.notInserted, c.boxStroke, c.boxFill, true, fade(U_WAIT_AT));

			// 검사가 상대 항목을 찾아 기다리는 화살표. EXCLUDE 는 교착이 나면 빨갛게 바뀐다.
			if (unique) {
				drawArrow(ctx, fromX, cy(1), toX, cy(0) + 7, c.amber, pulse(U_WAIT_AT, U_REJECT_AT), true);
			} else {
				const stuck = t >= E_DEADLOCK_AT;
				drawArrow(ctx, fromX, cy(0), toX, cy(1) - 7, stuck ? c.red : c.blue, fade(E_CHECK_AT), true);
				drawArrow(ctx, fromX, cy(1), toX, cy(0) + 7, stuck ? c.red : c.amber, fade(E_CHECK_AT), true);
				if (stuck) {
					const blink = 0.55 + 0.45 * Math.abs(Math.sin(t / 300));
					drawBadge(ctx, ox + cardW + gapX / 2, (cy(0) + cy(1)) / 2, L.deadlock, pageBg, c.red, fade(E_DEADLOCK_AT) * blink);
				}
			}

			// 세션 카드
			if (unique) {
				const committed = t >= U_COMMIT_AT;
				const rejected = t >= U_REJECT_AT;
				drawCard(ctx, c, ox, y0, cardW, CARD_H, L.session[0], [{ text: committed ? L.u1[1] : L.u1[0], alpha: fade(INSERT_AT), color: committed ? c.green : undefined }], c.blue, c.blueFill);
				drawCard(ctx, c, ox, y0 + ROW_GAP, cardW, CARD_H, L.session[1], [{ text: rejected ? L.u2[1] : L.u2[0], alpha: fade(U_WAIT_AT + 200), color: rejected ? c.red : c.amber }], c.amber, c.amberFill);
			} else {
				const checked = t >= E_CHECK_AT + 200;
				for (const k of [0, 1]) {
					drawCard(ctx, c, ox, y0 + k * ROW_GAP, cardW, CARD_H, L.session[k], [{ text: checked ? L.e[k + 1] : L.e[0], alpha: fade(insertAt(k)), color: checked ? (t >= E_DEADLOCK_AT ? c.red : c.amber) : undefined }], sessionColor[k], sessionFill[k]);
				}
			}
		});

		const caption = L.captions[step];
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		fitCaption(ctx, caption, w);
		ctx.fillStyle = c.text;
		ctx.fillText(caption, w / 2, HEIGHT - 16);
	};
}

const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function InsertThenCheckDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

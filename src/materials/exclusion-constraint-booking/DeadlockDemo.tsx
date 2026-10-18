import { clamp01, drawBadge, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, drawCard, drawEntry, drawTimer, fitCaption } from "./canvas";

// 서로의 항목을 찾아 서로를 기다리는 두 세션 가운데 세션 1이 deadlock_timeout(1초) 뒤 교착 검사를 돌린다.
// 고리를 찾은 세션 1은 40P01로 롤백되고, 그 항목이 사라지면 세션 2는 다시 검사해 통과한다.
const CYCLE = 11600;
const HEIGHT = 222;
const STEP_END = [2400, 5400, 8000, CYCLE];
const CARD_Y = [24, 114];
const CARD_H = 62;
const WAIT_AT = 500;
const TIMER = [2600, 5000];
const FOUND_AT = 5400;
const ABORT_AT = 6000;
const PASS_AT = 8200;
const COMMIT_AT = 8800;

type Labels = {
	session: [string, string];
	entry: [string, string];
	wait: [string, string];
	abort: string;
	pass: string;
	timer: string;
	cycle: string;
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		session: ["세션 1", "세션 2"],
		entry: ["세션 1 항목", "세션 2 항목"],
		wait: ["세션 2를 기다림", "세션 1을 기다림"],
		abort: "교착 검사 → 40P01",
		pass: "다시 검사 → 통과, 커밋",
		timer: "1초",
		cycle: "고리 발견",
		captions: [
			"① 두 세션이 서로의 항목을 찾아 서로를 기다린다",
			"② 1초(deadlock_timeout)가 지나면 세션 1이 교착 검사를 돌린다",
			"③ 고리를 찾은 세션 1이 40P01로 끝나고 롤백된다",
			"④ 세션 1의 항목이 사라져 세션 2는 다시 검사해 통과한다",
		],
		aria: "서로를 기다리는 두 세션의 교착이 풀리는 과정을 반복 재생하는 애니메이션. 두 세션은 같은 회의실과 시간의 항목을 넣고 각자 상대의 커밋 전 항목을 찾아 서로를 기다린다. 기다린 지 1초(deadlock_timeout)가 지나면 세션 1이 교착 검사를 돌려 고리를 찾고, 40P01로 끝나 롤백된다. 세션 1의 항목이 사라지자 세션 2는 다시 검사해 통과하고 커밋한다.",
	},
	en: {
		session: ["Session 1", "Session 2"],
		entry: ["session 1 entry", "session 2 entry"],
		wait: ["waits for session 2", "waits for session 1"],
		abort: "deadlock check → 40P01",
		pass: "recheck passes, commits",
		timer: "1 s",
		cycle: "cycle found",
		captions: [
			"① Each session finds the other's entry and waits",
			"② After 1 s (deadlock_timeout) session 1 runs the deadlock check",
			"③ Session 1 finds the cycle, fails with 40P01, rolls back",
			"④ Session 1's entry is gone; session 2 rechecks and passes",
		],
		aria: "Looping animation of a deadlock between two sessions being resolved. Both insert an entry for the same room and time, each finds the other's uncommitted entry, and they wait for each other. After waiting 1 second (deadlock_timeout), session 1 runs the deadlock check, finds the cycle, fails with 40P01 and rolls back. With session 1's entry gone, session 2 rechecks, passes and commits.",
	},
};


function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pageBg = dark ? "#0d1117" : "#ffffff";
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const cardW = comp * 0.52;
		const gapX = 56;
		const idxX = ox + cardW + gapX;
		const idxW = comp - cardW - gapX;
		const step = STEP_END.findIndex((end) => t < end);
		const fade = (at: number) => clamp01((t - at) / 300);
		const cy = (k: number) => CARD_Y[k] + CARD_H / 2;
		const midX = ox + cardW + gapX / 2;
		const midY = (cy(0) + cy(1)) / 2;
		const found = t >= FOUND_AT;
		const aborted = t >= ABORT_AT;

		// 인덱스와 두 항목. 세션 1의 항목은 롤백과 함께 사라지고, 세션 2의 항목은 커밋하면 실선이 된다.
		ctx.beginPath();
		ctx.roundRect(idxX, CARD_Y[0], idxW, CARD_Y[1] + CARD_H - CARD_Y[0], 8);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		drawEntry(ctx, c, idxX + 8, cy(0), idxW - 16, L.entry[0], c.blue, c.blueFill, true, fade(0) * (1 - clamp01((t - ABORT_AT - 200) / 600)));
		drawEntry(ctx, c, idxX + 8, cy(1), idxW - 16, L.entry[1], c.amber, c.amberFill, t < COMMIT_AT, fade(0));

		// 서로를 기다리는 화살표. 고리를 찾으면 빨갛게 바뀌고, 세션 1이 물러나면 차례로 사라진다.
		const s1Arrow = fade(WAIT_AT) * (1 - clamp01((t - ABORT_AT) / 400));
		const s2Arrow = fade(WAIT_AT) * (1 - clamp01((t - ABORT_AT - 800) / 400));
		drawArrow(ctx, ox + cardW + 4, cy(0), idxX + 6, cy(1) - 7, found ? c.red : c.blue, s1Arrow, true);
		drawArrow(ctx, ox + cardW + 4, cy(1), idxX + 6, cy(0) + 7, found ? c.red : c.amber, s2Arrow, true);

		// deadlock_timeout 타이머, 이어서 고리 발견 표시
		const timerP = clamp01((t - TIMER[0]) / (TIMER[1] - TIMER[0]));
		drawTimer(ctx, c, midX, midY, timerP, L.timer, timerP >= 1 ? c.red : c.amber, pageBg, fade(TIMER[0] - 200) * (1 - fade(FOUND_AT)));
		if (found) drawBadge(ctx, midX, midY, L.cycle, pageBg, c.red, fade(FOUND_AT) * (1 - clamp01((t - ABORT_AT - 800) / 400)));

		// 세션 카드
		drawCard(ctx, c, ox, CARD_Y[0], cardW, CARD_H, L.session[0], [
			{ text: L.wait[0], alpha: fade(WAIT_AT + 200), color: aborted ? c.sub : c.blue },
			{ text: L.abort, alpha: fade(ABORT_AT), color: c.red },
		], c.blue, c.blueFill);
		drawCard(ctx, c, ox, CARD_Y[1], cardW, CARD_H, L.session[1], [
			{ text: L.wait[1], alpha: fade(WAIT_AT + 200), color: t >= PASS_AT ? c.sub : c.amber },
			{ text: L.pass, alpha: fade(PASS_AT), color: c.green },
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

export default function DeadlockDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

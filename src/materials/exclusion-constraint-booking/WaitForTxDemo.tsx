import { type Colors, clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawCard, fitCaption } from "./canvas";

// 검사가 진행 중인 행을 만나 그 트랜잭션 번호의 잠금을 기다리고, 상대가 끝나면 다시 검사하는 과정.
// 앞 절반은 상대가 커밋해 23P01, 뒤 절반은 롤백해 통과한다. 번호는 글의 실험(3082775, 3082776)과 같다.
const CYCLE = 15000;
const HEIGHT = 250;
const STEP_END = [2000, 4200, 5800, 8200, 10200, 11800, CYCLE];
const PART_B = 8200;
const A = { found: 1200, request: 2100, end: 4400, unlock: 4600, result: 6000 };
const B = { end: 9400, unlock: 10200, result: 11800 };

type Labels = {
	s1: [string, string, string, string];
	s2: [string, string, string, string, string];
	tx: string;
	held: string;
	waiting: string;
	wait: string;
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		s1: ["세션 1 · 3082775", "10:00–11:00 넣음", "커밋", "롤백"],
		s2: ["세션 2 · 3082776", "10:30–11:30 넣음", "3082775 행 발견", "다시 검사 → 23P01", "다시 검사 → 통과"],
		tx: "트랜잭션",
		held: "ExclusiveLock",
		waiting: "ShareLock 요청",
		wait: "대기",
		captions: [
			"① 세션 2가 넣고 검사하다 3082775의 행을 만난다",
			"② 3082775에 ShareLock을 요청하고 기다린다",
			"③ 세션 1이 커밋해서 잠금이 풀린다",
			"④ 다시 검사하면 살아 있는 행과 겹친다 → 23P01",
			"⑤ 같은 상황에서 이번에는 세션 1이 롤백한다",
			"⑥ 잠금이 풀리고 다시 검사한다",
			"⑦ 그 행은 없던 것이 되어 통과한다",
		],
		aria: "검사가 상대 트랜잭션을 기다리는 과정을 반복 재생하는 애니메이션. 세션 1(트랜잭션 3082775)은 A 10:00–11:00을 넣고 자기 번호에 ExclusiveLock을 쥐고 있다. 세션 2(3082776)는 A 10:30–11:30을 넣고 검사하다 3082775의 행을 만나, 3082775에 ShareLock을 요청하고 기다린다. 세션 1이 커밋하면 잠금이 풀리고, 다시 검사한 세션 2는 살아 있는 행과 겹쳐 23P01로 거절된다. 같은 상황에서 세션 1이 롤백하면 다시 검사할 때 그 행은 없던 것이 되어 세션 2가 통과한다.",
	},
	en: {
		s1: ["Session 1 · 3082775", "Inserted 10:00–11:00", "Committed", "Rolled back"],
		s2: ["Session 2 · 3082776", "Inserted 10:30–11:30", "Found 3082775's row", "Recheck → 23P01", "Recheck → passes"],
		tx: "Transaction",
		held: "ExclusiveLock",
		waiting: "ShareLock request",
		wait: "waiting",
		captions: [
			"① Session 2 inserts, checks, and finds 3082775's row",
			"② It requests a ShareLock on 3082775 and waits",
			"③ Session 1 commits, releasing the lock",
			"④ The recheck hits a live row → 23P01",
			"⑤ Same setup; this time session 1 rolls back",
			"⑥ The lock is released and it checks again",
			"⑦ The row never happened, so it passes",
		],
		aria: "Looping animation of the check waiting for another transaction. Session 1 (transaction 3082775) has inserted A 10:00–11:00 and holds an ExclusiveLock on its own xid. Session 2 (3082776) inserts A 10:30–11:30, finds 3082775's row while checking, requests a ShareLock on 3082775, and waits. When session 1 commits, the lock is released and session 2's recheck hits a live row, so it is rejected with 23P01. In the same setup, when session 1 rolls back, the row never happened and session 2 passes.",
	},
};

// 자물쇠. open 이 1에 가까울수록 고리가 들려 풀린 모습이 된다.
function drawPadlock(ctx: CanvasRenderingContext2D, c: Colors, cx: number, cy: number, open: number, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = c.blue;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.arc(cx, cy - 6 - open * 7, 8, Math.PI, 0);
	ctx.lineTo(cx + 8, cy - 6 - open * 7 + (open > 0.5 ? 0 : 6));
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(cx - 12, cy - 6, 24, 19, 4);
	ctx.fillStyle = c.blueFill;
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, bg: string) {
	ctx.save();
	ctx.lineWidth = 4;
	ctx.strokeStyle = bg;
	ctx.lineJoin = "round";
	ctx.strokeText(text, x, y);
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
	ctx.restore();
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pageBg = dark ? "#0d1117" : "#ffffff";
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const cardW = comp * 0.6;
		const lockX = ox + comp * 0.84;
		const lockY = 56;
		const step = STEP_END.findIndex((end) => t < end);
		const inB = t >= PART_B;
		const fade = (at: number) => clamp01((t - at) / 300);

		// 이 장면에서 상대가 끝나는 시각과 결과
		const endAt = inB ? B.end : A.end;
		const unlockAt = inB ? B.unlock : A.unlock;
		const resultAt = inB ? B.result : A.result;
		const open = clamp01((t - unlockAt) / 400);
		const lockAlpha = 1 - clamp01((t - unlockAt - 400) / 400);

		// 세션 1과 자기 번호의 배타 잠금
		drawCard(ctx, c, ox, 24, cardW, 66, L.s1[0], [
			{ text: L.s1[1], alpha: 1 },
			{ text: inB ? L.s1[3] : L.s1[2], alpha: fade(endAt), color: inB ? c.red : c.green },
		], c.blue, c.blueFill);
		if (lockAlpha > 0) {
			ctx.save();
			ctx.globalAlpha = lockAlpha;
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(ox + cardW + 4, lockY);
			ctx.lineTo(lockX - 18, lockY);
			ctx.stroke();
			ctx.font = `600 9.5px ${FONT}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			haloText(ctx, L.held, (ox + cardW + lockX - 14) / 2, lockY - 9, c.blue, pageBg);
			ctx.restore();
		}
		drawPadlock(ctx, c, lockX, lockY, open, lockAlpha);
		ctx.save();
		ctx.globalAlpha = lockAlpha;
		ctx.font = `600 10px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.tx, lockX, lockY + 28);
		ctx.font = `700 11px ${FONT}`;
		ctx.fillStyle = c.blue;
		ctx.fillText("3082775", lockX, lockY + 42);
		ctx.restore();

		// 세션 2: 넣고, 검사에서 발견하고, 공유 잠금을 요청해 기다리고, 다시 검사한다.
		const s2Y = 118;
		const rejected = !inB;
		drawCard(ctx, c, ox, s2Y, cardW, 82, L.s2[0], [
			{ text: L.s2[1], alpha: inB ? 1 : fade(300) },
			{ text: L.s2[2], alpha: inB ? 1 : fade(A.found) },
			{ text: rejected ? L.s2[3] : L.s2[4], alpha: fade(resultAt), color: rejected ? c.red : c.green },
		], c.amber, c.amberFill);

		const waiting = (inB || t >= A.request) && t < unlockAt + 400;
		if (waiting) {
			const x0 = ox + cardW + 4;
			const y0 = s2Y + 41;
			const x1 = lockX - 14;
			const y1 = lockY + 16;
			ctx.save();
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 3]);
			ctx.beginPath();
			ctx.moveTo(x0, y0);
			ctx.lineTo(x1, y1);
			ctx.stroke();
			ctx.restore();
			ctx.font = `600 9.5px ${FONT}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			haloText(ctx, L.waiting, (x0 + x1) / 2, (y0 + y1) / 2 + 14, c.amber, pageBg);
			const pulse = t < unlockAt ? 0.55 + 0.45 * Math.abs(Math.sin(t / 300)) : 1 - open;
			drawBadge(ctx, (x0 + x1) / 2, (y0 + y1) / 2 - 4, L.wait, pageBg, c.amber, pulse);
		}

		const caption = L.captions[step];
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		fitCaption(ctx, caption, w);
		ctx.fillStyle = c.text;
		ctx.fillText(caption, w / 2, HEIGHT - 16);
	};
}

const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function WaitForTxDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

import { clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";
import { drawCard, fitCaption } from "./canvas";

// 스냅샷의 경계가 옮겨 가면서 세션 1의 행이 세션 2에게 보이게 되는 과정을 번호 줄 위에 그린다.
// 경계 오른쪽(경계 값 이상)은 아직 끝나지 않은 번호다. 번호는 글의 실험(3082769)과 같다.
const CYCLE = 11400;
const HEIGHT = 250;
const STEP_END = [2600, 5400, 7800, CYCLE];
const XIDS = [3082767, 3082768, 3082769, 3082770, 3082771];
const MINE = 3082769;
const BOUNDARY_IN = 2800; // 경계가 나타난다
const COMMIT_AT = 5600;
const MOVE_AT = 8000; // 새 스냅샷: 경계가 한 칸 옮겨 간다
const LINE_Y = 74;

type Labels = {
	finished: string;
	unfinished: string;
	snapshot: string;
	visible: string;
	hidden: string;
	s1: [string, string, string];
	s2: [string, string, string];
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		finished: "끝남",
		unfinished: "아직 안 끝남",
		snapshot: "스냅샷",
		visible: "보임",
		hidden: "안 보임",
		s1: ["세션 1 · 3082769", "A 10:00–11:00 넣음", "커밋"],
		s2: ["세션 2", "조회 → 0건", "다시 조회 → 1건"],
		captions: [
			"① 세션 1(3082769)이 행을 넣는다. 아직 커밋 전이다",
			"② 3082769는 경계 안쪽, 안 끝난 번호다 → 0건",
			"③ 세션 1이 커밋한다",
			"④ 새 스냅샷에서는 3082769가 끝난 쪽이다 → 1건",
		],
		aria: "스냅샷 경계에 따라 행이 보이는지가 바뀌는 과정을 반복 재생하는 애니메이션. 세션 1(트랜잭션 3082769)이 행을 넣고 커밋하지 않은 동안 세션 2의 스냅샷은 3082769:3082769:이라 3082769부터를 끝나지 않은 번호로 보고, 조회 결과는 0건이다. 세션 1이 커밋한 뒤 새 스냅샷 3082770:3082770:에서는 경계가 한 칸 옮겨 가 3082769가 끝난 쪽에 들어오고, 조회 결과는 1건이다.",
	},
	en: {
		finished: "finished",
		unfinished: "not finished",
		snapshot: "snapshot",
		visible: "visible",
		hidden: "hidden",
		s1: ["Session 1 · 3082769", "Inserted A 10:00–11:00", "Committed"],
		s2: ["Session 2", "Select → 0 rows", "Select again → 1 row"],
		captions: [
			"① Session 1 (3082769) inserts a row, not committed yet",
			"② 3082769 is on the unfinished side → 0 rows",
			"③ Session 1 commits",
			"④ In the new snapshot 3082769 is finished → 1 row",
		],
		aria: "Looping animation of how the snapshot boundary decides whether a row is visible. While session 1 (transaction 3082769) has inserted a row without committing, session 2's snapshot is 3082769:3082769:, treating 3082769 and above as unfinished, so its select returns 0 rows. After session 1 commits, the new snapshot 3082770:3082770: moves the boundary by one, 3082769 falls on the finished side, and the select returns 1 row.",
	},
};

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const step = STEP_END.findIndex((end) => t < end);
		const gap = comp / XIDS.length;
		const xAt = (i: number) => ox + gap * (i + 0.5);
		const mineX = xAt(XIDS.indexOf(MINE));

		// 경계: 3082769 바로 왼쪽에서 시작해 새 스냅샷에서 3082770 바로 왼쪽으로 옮겨 간다.
		const shown = clamp01((t - BOUNDARY_IN) / 400);
		const bx = lerp(xAt(2) - gap / 2, xAt(3) - gap / 2, ease(clamp01((t - MOVE_AT) / 700)));
		const snap = t >= MOVE_AT ? "3082770:3082770:" : "3082769:3082769:";

		if (shown > 0) {
			ctx.save();
			ctx.globalAlpha = shown;
			ctx.fillStyle = c.redFill;
			ctx.fillRect(bx, LINE_Y - 22, ox + comp - bx, 44);
			ctx.fillStyle = c.greenFill;
			ctx.fillRect(ox, LINE_Y - 22, bx - ox, 44);
			ctx.font = `600 10.5px ${FONT}`;
			ctx.textBaseline = "middle";
			ctx.textAlign = "left";
			ctx.fillStyle = c.green;
			ctx.fillText(L.finished, ox + 6, LINE_Y - 12);
			ctx.textAlign = "right";
			ctx.fillStyle = c.red;
			ctx.fillText(L.unfinished, ox + comp - 6, LINE_Y - 12);
			ctx.strokeStyle = c.text;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(bx, LINE_Y - 30);
			ctx.lineTo(bx, LINE_Y + 26);
			ctx.stroke();
			ctx.font = `700 11px ${FONT}`;
			ctx.fillStyle = c.text;
			ctx.textAlign = Math.abs(bx - ox) < 70 ? "left" : "center";
			ctx.fillText(`${L.snapshot} ${snap}`, bx, LINE_Y - 40);
			ctx.restore();
		}

		// 번호 줄
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(ox, LINE_Y);
		ctx.lineTo(ox + comp, LINE_Y);
		ctx.stroke();
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		XIDS.forEach((xid, i) => {
			ctx.beginPath();
			ctx.moveTo(xAt(i), LINE_Y - 4);
			ctx.lineTo(xAt(i), LINE_Y + 4);
			ctx.stroke();
			ctx.font = `${xid === MINE ? 700 : 500} 10px ${FONT}`;
			ctx.fillStyle = xid === MINE ? c.blue : c.sub;
			ctx.fillText(String(xid), xAt(i), LINE_Y + 15);
		});

		// 세션 1의 번호: 커밋 전은 빈 점, 커밋 뒤는 채운 점
		const dot = clamp01((t - 300) / 400);
		if (dot > 0) {
			ctx.save();
			ctx.globalAlpha = dot;
			ctx.beginPath();
			ctx.arc(mineX, LINE_Y, 6, 0, Math.PI * 2);
			ctx.fillStyle = t >= COMMIT_AT ? c.blue : dark ? "#0d1117" : "#ffffff";
			ctx.fill();
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();
		}
		if (shown > 0) {
			const vis = t >= MOVE_AT + 700;
			drawBadge(ctx, mineX, LINE_Y + 34, vis ? L.visible : L.hidden, vis ? c.greenFill : c.redFill, vis ? c.green : c.red, shown);
		}

		// 세션 카드
		const cardY = 136;
		const cardW = (comp - 14) / 2;
		const fade = (at: number) => clamp01((t - at) / 300);
		drawCard(ctx, c, ox, cardY, cardW, 64, L.s1[0], [
			{ text: L.s1[1], alpha: fade(300) },
			{ text: L.s1[2], alpha: fade(COMMIT_AT) },
		], c.blue, c.blueFill);
		drawCard(ctx, c, ox + cardW + 14, cardY, cardW, 64, L.s2[0], [
			{ text: L.s2[1], alpha: fade(BOUNDARY_IN + 500), color: c.red },
			{ text: L.s2[2], alpha: fade(MOVE_AT + 700), color: c.green },
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

export default function SnapshotDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

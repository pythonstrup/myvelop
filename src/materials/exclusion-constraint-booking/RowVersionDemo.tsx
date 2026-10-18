import { type Colors, clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, drawCard, fitCaption } from "./canvas";

// UPDATE 가 원래 행의 xmax 에 번호를 적고 새 버전을 따로 쓰는 모습과, 그때 제약조건 인덱스가 어떻게 되는지.
// cancel: 취소한 새 버전은 where 조건 밖이라 인덱스에 없고, 겹치는 요청은 원래 행을 만나 취소 트랜잭션을 기다린다.
// move: 옮긴 새 버전은 인덱스에 들어가 검사를 받고, 검사는 자기가 지운 원래 행을 넘긴다. 번호는 글의 실험과 같다.
const CYCLE = 12000;
const HEIGHT = 250;
const STEP_END = [2200, 4600, 6600, 9200, CYCLE];
const XMAX_AT = 2600;
const NEW_AT = 3200;
const INDEX_AT = 4800;
const PROBE_AT = 6800;
const END_AT = 9400;

type Mode = "cancel" | "move";
type Labels = {
	heap: string;
	index: string;
	cancelled: string;
	pending: string;
	dead: string;
	noEntry: string;
	card: Record<Mode, [string, string, string, string]>;
	captions: Record<Mode, string[]>;
	aria: Record<Mode, string>;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		heap: "booking 테이블",
		index: "제약조건 인덱스",
		cancelled: "취소",
		pending: "커밋 전",
		dead: "지워짐",
		noEntry: "(0,2) 없음 · 조건 밖",
		card: {
			cancel: ["세션 2 · A 10:30–11:30 넣기", "(0,1) 발견 · xmax 3082799 진행 중", "3082799 대기", "→ (0,1)은 지워진 행, 통과"],
			move: ["검사 · 새 버전 (0,2)", "(0,1)과 겹침 · xmax가 나(3082799)", "내가 지운 행 → 없는 행으로 봄", "→ 통과"],
		},
		captions: {
			cancel: [
				"① 3082798이 넣은 (0,1)을 인덱스 항목이 가리킨다",
				"② 3082799가 취소하면 (0,1)의 xmax에 번호가 적힌다",
				"③ 새 버전 (0,2)는 where 조건 밖이라 인덱스에 없다",
				"④ 겹치는 요청은 (0,1)을 만나 3082799를 기다린다",
				"⑤ 취소가 커밋되면 (0,1)은 지워진 행이라 통과한다",
			],
			move: [
				"① 3082798이 넣은 (0,1)을 인덱스 항목이 가리킨다",
				"② 3082799가 시간을 옮기면 (0,1)의 xmax에 번호가 적힌다",
				"③ 새 버전 (0,2)도 인덱스에 들어가 검사를 받는다",
				"④ 검사는 겹치는 (0,1)을 찾지만 내가 지운 행이다",
				"⑤ 자기 원래 행과 겹쳐도 수정이 통과한다",
			],
		},
		aria: {
			cancel: "취소하는 동안 행 버전과 제약조건 인덱스가 바뀌는 과정을 반복 재생하는 애니메이션. 트랜잭션 3082798이 넣은 행 (0,1)을 인덱스 항목이 가리킨다. 트랜잭션 3082799가 취소하면 (0,1)의 xmax에 3082799가 적히고 새 버전 (0,2)가 생기지만, 새 버전은 where 조건 밖이라 인덱스에 들어가지 않는다. 커밋 전에 겹치는 요청은 (0,1)을 만나 3082799를 기다리고, 취소가 커밋되면 (0,1)은 지워진 행이 되어 요청이 통과한다.",
			move: "시간을 옮기는 수정에서 행 버전과 제약조건 인덱스가 바뀌는 과정을 반복 재생하는 애니메이션. 트랜잭션 3082798이 넣은 행 (0,1)을 인덱스 항목이 가리킨다. 트랜잭션 3082799가 10:30–11:30으로 옮기면 (0,1)의 xmax에 3082799가 적히고, 새 버전 (0,2)가 인덱스에 들어가 검사를 받는다. 검사는 겹치는 (0,1)을 찾지만 자기 트랜잭션이 지운 행이라 없는 행으로 보고 넘겨서 수정이 통과한다.",
		},
	},
	en: {
		heap: "booking table",
		index: "constraint index",
		cancelled: "cancelled",
		pending: "uncommitted",
		dead: "dead",
		noEntry: "no (0,2) · outside where",
		card: {
			cancel: ["Session 2 · insert A 10:30–11:30", "Found (0,1) · xmax 3082799 running", "waiting on 3082799", "→ (0,1) is dead, passes"],
			move: ["Check · new version (0,2)", "Overlaps (0,1) · xmax is me (3082799)", "deleted by me → treated as gone", "→ passes"],
		},
		captions: {
			cancel: [
				"① An index entry points to (0,1), inserted by 3082798",
				"② Cancelling as 3082799 sets (0,1)'s xmax",
				"③ New version (0,2) fails the where clause: no entry",
				"④ An overlapping request hits (0,1) and waits on 3082799",
				"⑤ Once the cancel commits, (0,1) is dead and it passes",
			],
			move: [
				"① An index entry points to (0,1), inserted by 3082798",
				"② Moving it as 3082799 sets (0,1)'s xmax",
				"③ New version (0,2) enters the index and is checked",
				"④ The check finds (0,1), but I deleted it",
				"⑤ The update passes despite overlapping its old row",
			],
		},
		aria: {
			cancel: "Looping animation of row versions and the constraint index during a cancellation. An index entry points to row (0,1), inserted by transaction 3082798. When transaction 3082799 cancels it, (0,1)'s xmax becomes 3082799 and a new version (0,2) appears, but it fails the where clause and gets no index entry. An overlapping request made before the commit hits (0,1) and waits on 3082799; once the cancellation commits, (0,1) is dead and the request passes.",
			move: "Looping animation of row versions and the constraint index when an update moves the time. An index entry points to row (0,1), inserted by transaction 3082798. When transaction 3082799 moves it to 10:30–11:30, (0,1)'s xmax becomes 3082799 and the new version (0,2) enters the index and is checked. The check finds the overlapping (0,1), but since its own transaction deleted it, it treats the row as gone and the update passes.",
		},
	},
};

function drawTuple(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, w: number, line1: string, line2: string, color: string, fill: string, dashed: boolean, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(x, y, w, 40, 6);
	ctx.fillStyle = fill;
	ctx.fill();
	if (dashed) ctx.setLineDash([4, 3]);
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `700 11px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(line1, x + 8, y + 13);
	ctx.font = `500 10px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(line2, x + 8, y + 29);
	ctx.restore();
}

function makeScene(L: Labels, mode: Mode) {
	const card = L.card[mode];
	const captions = L.captions[mode];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pageBg = dark ? "#0d1117" : "#ffffff";
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const heapW = comp * 0.58;
		const idxX = ox + comp * 0.62;
		const idxW = comp * 0.38;
		const step = STEP_END.findIndex((end) => t < end);
		const fade = (at: number) => clamp01((t - at) / 300);
		const ended = t >= END_AT;

		// 상자 제목
		ctx.font = `600 10.5px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(L.heap, ox, 18);
		ctx.fillText(L.index, idxX, 18);

		// 원래 행 (0,1)
		const t1Y = 32;
		const t2Y = 80;
		const xmaxSet = t >= XMAX_AT;
		const oldDead = mode === "cancel" && ended;
		drawTuple(ctx, c, ox, t1Y, heapW, "(0,1)  A 10:00–11:00", `xmin 3082798 · xmax ${xmaxSet ? "3082799" : "0"}`, c.blue, c.blueFill, false, oldDead ? 1 - 0.55 * fade(END_AT) : 1);
		// 새로 적힌 xmax 값에 테두리를 두른다. 위치는 앞 글자 폭을 재서 맞춘다.
		if (xmaxSet && !oldDead) {
			ctx.save();
			ctx.font = `500 10px ${FONT}`;
			const prefix = ctx.measureText("xmin 3082798 · xmax ").width;
			const value = ctx.measureText("3082799").width;
			ctx.globalAlpha = fade(XMAX_AT) * 0.9;
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(ox + 8 + prefix - 3, t1Y + 21, value + 6, 16, 4);
			ctx.stroke();
			ctx.restore();
		}
		if (oldDead) drawBadge(ctx, ox + heapW - 32, t1Y + 12, L.dead, pageBg, c.sub, fade(END_AT));

		// 새 버전 (0,2): 커밋 전은 점선
		const newLine1 = mode === "cancel" ? `(0,2)  A 10:00–11:00 · ${L.cancelled}` : "(0,2)  A 10:30–11:30";
		drawTuple(ctx, c, ox, t2Y, heapW, newLine1, "xmin 3082799 · xmax 0", c.amber, c.amberFill, !ended, fade(NEW_AT));
		if (t >= NEW_AT && !ended) drawBadge(ctx, ox + heapW - 34, t2Y + 29, L.pending, pageBg, c.amber, fade(NEW_AT));

		// 인덱스 항목
		const e1Y = 38;
		const e2Y = 86;
		const entry = (y: number, text: string, color: string, dashed: boolean, alpha: number) => {
			if (alpha <= 0) return;
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.beginPath();
			ctx.roundRect(idxX, y, idxW, 28, 5);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			if (dashed) ctx.setLineDash([3, 3]);
			ctx.strokeStyle = color;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.font = `600 10px ${FONT}`;
			ctx.fillStyle = dashed ? c.sub : c.text;
			ctx.textAlign = "center";
			ctx.fillText(text, idxX + idxW / 2, y + 14);
			ctx.restore();
		};
		entry(e1Y, "10:00–11:00 → (0,1)", c.blue, false, 1);
		drawArrow(ctx, idxX - 4, e1Y + 14, ox + heapW + 4, t1Y + 20, c.blue, 0.8, false);
		if (mode === "cancel") {
			entry(e2Y, L.noEntry, c.boxStroke, true, fade(INDEX_AT));
		} else {
			entry(e2Y, "10:30–11:30 → (0,2)", c.amber, false, fade(INDEX_AT));
			drawArrow(ctx, idxX - 4, e2Y + 14, ox + heapW + 4, t2Y + 20, c.amber, fade(INDEX_AT) * 0.8, false);
		}

		// 아래 카드: 겹치는 요청(취소) 또는 새 버전의 검사(수정)
		const cardY = 130;
		const waiting = mode === "cancel" && t >= PROBE_AT && !ended;
		drawCard(ctx, c, ox, cardY, comp, 84, card[0], [
			{ text: card[1], alpha: fade(PROBE_AT) },
			{ text: card[2], alpha: fade(PROBE_AT + 900), color: waiting ? c.amber : undefined },
			{ text: card[3], alpha: fade(END_AT), color: c.green },
		], mode === "cancel" ? c.green : c.amber, mode === "cancel" ? c.greenFill : c.amberFill);
		// 검사가 원래 행의 인덱스 항목을 찾는 화살표: 취소는 요청 카드에서, 수정은 새 버전의 항목에서 올라간다.
		if (t >= PROBE_AT) {
			const alpha = fade(PROBE_AT) * (ended ? 1 - fade(END_AT + 600) : 1);
			const fromY = mode === "cancel" ? cardY - 4 : e2Y - 2;
			const ax = mode === "cancel" ? idxX + idxW / 2 : idxX + idxW * 0.2;
			drawArrow(ctx, ax, fromY, ax, e1Y + 30, c.green, alpha, true);
		}

		const caption = captions[step];
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		fitCaption(ctx, caption, w);
		ctx.fillStyle = c.text;
		ctx.fillText(caption, w / 2, HEIGHT - 16);
	};
}

const SCENES = {
	ko: { cancel: makeScene(LABELS.ko, "cancel"), move: makeScene(LABELS.ko, "move") },
	en: { cancel: makeScene(LABELS.en, "cancel"), move: makeScene(LABELS.en, "move") },
};

export default function RowVersionDemo({ lang = "ko", mode = "cancel" }: { lang?: Lang; mode?: Mode }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang][mode]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria[mode]} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

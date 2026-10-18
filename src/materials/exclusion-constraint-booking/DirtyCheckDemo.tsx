import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, fitCaption } from "./canvas";

// 같은 테이블을 SELECT(스냅샷)와 제약 검사(dirty snapshot)가 각각 어떻게 보는지 나란히 그린다.
// 세션 1(3082775)이 넣고 커밋하지 않은 행이 SELECT 에는 없고 검사에는 있다. 번호는 글의 실험과 같다.
const CYCLE = 10400;
const HEIGHT = 240;
const STEP_END = [2600, 5200, 7800, CYCLE];
const ROW_AT = 300;
const LEFT_AT = 2900;
const RIGHT_AT = 5500;
const XID_AT = 8000;

type Labels = {
	table: string;
	pending: string;
	left: [string, string];
	right: [string, string];
	none: string;
	zero: string;
	one: string;
	xid: string;
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		table: "booking",
		pending: "진행 중 · 3082775",
		left: ["SELECT", "스냅샷"],
		right: ["제약 검사", "dirty snapshot"],
		none: "보이는 행 없음",
		zero: "0건",
		one: "1건",
		xid: "3082775 진행 중",
		captions: [
			"① 세션 1(3082775)이 넣은 행이 있다. 아직 커밋 전이다",
			"② SELECT의 스냅샷에는 이 행이 없다 → 0건",
			"③ 제약 검사의 dirty snapshot에는 이 행이 있다",
			"④ 검사는 이 행을 넣은 번호 3082775도 함께 받는다",
		],
		aria: "같은 테이블을 SELECT와 제약 검사가 보는 방식을 비교하는 애니메이션. 세션 1(트랜잭션 3082775)이 넣고 아직 커밋하지 않은 A 10:00–11:00 행이 있다. SELECT의 스냅샷에는 이 행이 없어 0건이다. 제약 검사의 dirty snapshot에는 이 행이 있고, 검사는 이 행을 넣은 번호 3082775가 아직 진행 중이라는 것도 함께 받는다.",
	},
	en: {
		table: "booking",
		pending: "in progress · 3082775",
		left: ["SELECT", "snapshot"],
		right: ["Constraint check", "dirty snapshot"],
		none: "no visible rows",
		zero: "0 rows",
		one: "1 row",
		xid: "3082775 in progress",
		captions: [
			"① Session 1 (3082775) inserted a row, not committed",
			"② SELECT's snapshot does not include it → 0 rows",
			"③ The check's dirty snapshot includes it",
			"④ The check also learns who inserted it: 3082775",
		],
		aria: "Animation comparing how SELECT and the constraint check see the same table. Session 1 (transaction 3082775) has inserted row A 10:00–11:00 without committing. SELECT's snapshot does not include it, so it returns 0 rows. The constraint check's dirty snapshot includes it, and the check also learns that its inserter, 3082775, is still in progress.",
	},
};

function drawRow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, stroke: string, fill: string, text: string, textColor: string) {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, w, 26, 5);
	ctx.fillStyle = fill;
	ctx.globalAlpha *= 0.7;
	ctx.fill();
	ctx.globalAlpha /= 0.7;
	ctx.setLineDash([4, 3]);
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.restore();
	ctx.font = `700 11.5px ${FONT}`;
	ctx.fillStyle = textColor;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillText(text, x + 10, y + 13);
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const step = STEP_END.findIndex((end) => t < end);
		const pageBg = dark ? "#0d1117" : "#ffffff";

		// 위: 실제 테이블. 커밋 전 행은 점선이다.
		const tw = Math.min(comp, 290);
		const tx = ox + (comp - tw) / 2;
		ctx.beginPath();
		ctx.roundRect(tx, 22, tw, 62, 8);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.font = `600 10.5px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(L.table, tx + 10, 36);
		const rowA = ease(clamp01((t - ROW_AT) / 500));
		if (rowA > 0) {
			ctx.save();
			ctx.globalAlpha = rowA;
			drawRow(ctx, tx + 8, 48, tw - 16, c.blue, c.blueFill, "A · 10:00–11:00", c.text);
			ctx.restore();
			ctx.font = `600 10px ${FONT}`;
			const bw = ctx.measureText(L.pending).width + 14;
			drawBadge(ctx, tx + tw - 14 - bw / 2, 61, L.pending, pageBg, c.blue, rowA);
		}

		// 아래: 두 눈. 왼쪽은 SELECT, 오른쪽은 제약 검사.
		const py = 120;
		const ph = 94;
		const pw = (comp - 14) / 2;
		const panel = (x: number, title: [string, string], alpha: number, color: string) => {
			ctx.save();
			ctx.globalAlpha = 0.35 + 0.65 * alpha;
			ctx.beginPath();
			ctx.roundRect(x, py, pw, ph, 8);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = alpha > 0 ? color : c.boxStroke;
			ctx.lineWidth = alpha > 0 ? 1.5 : 1;
			ctx.stroke();
			ctx.font = `700 11.5px ${FONT}`;
			ctx.fillStyle = c.text;
			ctx.textAlign = "left";
			ctx.fillText(title[0], x + 10, py + 15);
			ctx.font = `500 10px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.fillText(title[1], x + 10, py + 30);
			ctx.restore();
		};
		const leftA = clamp01((t - LEFT_AT) / 400);
		const rightA = clamp01((t - RIGHT_AT) / 400);
		panel(ox, L.left, leftA, c.amber);
		panel(ox + pw + 14, L.right, rightA, c.amber);
		drawArrow(ctx, tx + tw * 0.3, 88, ox + pw / 2, py - 4, c.amber, leftA, true);
		drawArrow(ctx, tx + tw * 0.7, 88, ox + pw + 14 + pw / 2, py - 4, c.amber, rightA, true);

		if (leftA > 0) {
			ctx.save();
			ctx.globalAlpha = leftA;
			ctx.font = `500 10.5px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.fillText(L.none, ox + 10, py + 52);
			ctx.font = `700 12px ${FONT}`;
			ctx.fillStyle = c.red;
			ctx.textAlign = "right";
			ctx.fillText(L.zero, ox + pw - 10, py + 15);
			ctx.restore();
		}
		if (rightA > 0) {
			const rx = ox + pw + 14;
			ctx.save();
			ctx.globalAlpha = rightA;
			drawRow(ctx, rx + 8, py + 42, pw - 16, c.blue, c.blueFill, "A · 10:00–11:00", c.text);
			ctx.font = `700 12px ${FONT}`;
			ctx.fillStyle = c.green;
			ctx.textAlign = "right";
			ctx.fillText(L.one, rx + pw - 10, py + 15);
			ctx.restore();
			drawBadge(ctx, rx + pw / 2, py + 80, L.xid, pageBg, c.blue, clamp01((t - XID_AT) / 300));
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

export default function DirtyCheckDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

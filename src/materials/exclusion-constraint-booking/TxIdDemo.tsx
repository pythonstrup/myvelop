import { clamp01, ease, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, fitCaption } from "./canvas";

// 트랜잭션이 번호를 받고, 넣은 행의 xmin 에 그 번호가 적히고, 다른 트랜잭션이 고치면 xmax 에 그 번호가 적히는 순서.
// 번호는 글의 실험(3082798 이 넣고 3082799 가 고침)과 같다. 매 사이클 같은 장면을 재생한다.
const CYCLE = 10400;
const HEIGHT = 210;
const STEP_END = [2600, 5200, 7800, CYCLE];
const T1_AT = 300;
const ROW_AT = 2900;
const T2_AT = 5500;
const XMAX_AT = 6300;
const MOVE = 600;

type Labels = { tx: string; started: string; row: string; captions: string[]; aria: string };
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		tx: "트랜잭션",
		started: "쓰기 시작 → 번호 받음",
		row: "booking 행",
		captions: [
			"① 트랜잭션이 쓰기를 시작하며 번호 3082798을 받는다",
			"② 넣은 행의 xmin에 3082798이 적힌다. xmax는 0이다",
			"③ 3082799가 이 행을 고치면 xmax에 그 번호가 적힌다",
			"④ 행에는 만든 번호와 지운 번호가 함께 남는다",
		],
		aria: "트랜잭션 번호가 행에 적히는 순서를 반복 재생하는 애니메이션. 트랜잭션이 쓰기를 시작하며 번호 3082798을 받고, 넣은 행의 xmin에 3082798이, xmax에 0이 적힌다. 트랜잭션 3082799가 이 행을 고치면 xmax에 3082799가 적힌다.",
	},
	en: {
		tx: "Transaction",
		started: "first write → gets an xid",
		row: "booking row",
		captions: [
			"① A transaction gets xid 3082798 when it first writes",
			"② The new row's xmin is 3082798; xmax is 0",
			"③ When 3082799 updates it, xmax records that xid",
			"④ The row keeps both its creator and deleter",
		],
		aria: "Looping animation of transaction IDs being recorded on a row. A transaction gets xid 3082798 when it first writes, and the row it inserts has xmin 3082798 and xmax 0. When transaction 3082799 updates the row, its xmax becomes 3082799.",
	},
};

function layout(w: number) {
	const comp = Math.min(w - 28, 500);
	const ox = (w - comp) / 2;
	const pillW = Math.min(150, comp * 0.42);
	const cardW = Math.min(190, comp * 0.5);
	return { ox, pillW, cardX: ox + comp - cardW, cardW };
}

function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, text: string, color: string, fill: string, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(x, y - 15, w, 30, 15);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.font = `700 11.5px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, x + w / 2, y);
	ctx.restore();
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const { ox, pillW, cardX, cardW } = layout(w);
		const step = STEP_END.findIndex((end) => t < end);
		const y1 = 58;
		const y2 = 132;

		// 트랜잭션 두 개
		drawPill(ctx, ox, y1, pillW, `${L.tx} 3082798`, c.blue, c.blueFill, clamp01((t - T1_AT) / 400));
		if (t >= T1_AT + 500) {
			ctx.font = `500 10.5px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.globalAlpha = clamp01((t - T1_AT - 500) / 300);
			ctx.fillText(L.started, ox + 4, y1 + 28);
			ctx.globalAlpha = 1;
		}
		drawPill(ctx, ox, y2, pillW, `${L.tx} 3082799`, c.amber, c.amberFill, clamp01((t - T2_AT) / 400));

		// 행 카드: 예약 내용과 xmin·xmax 두 칸
		const rowAlpha = ease(clamp01((t - ROW_AT) / MOVE));
		const cardY = 40;
		const cardH = 116;
		if (rowAlpha > 0) {
			ctx.save();
			ctx.globalAlpha = rowAlpha;
			ctx.beginPath();
			ctx.roundRect(cardX, cardY, cardW, cardH, 8);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = c.boxStroke;
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.font = `500 10.5px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(L.row, cardX + 12, cardY + 16);
			ctx.font = `700 13px ${FONT}`;
			ctx.fillStyle = c.text;
			ctx.fillText("A · 10:00–11:00", cardX + 12, cardY + 38);

			const field = (y: number, name: string, value: string, color: string | null, fill: string | null) => {
				if (fill) {
					ctx.beginPath();
					ctx.roundRect(cardX + 8, y - 12, cardW - 16, 24, 5);
					ctx.fillStyle = fill;
					ctx.fill();
				}
				ctx.font = `600 11px ${FONT}`;
				ctx.fillStyle = c.sub;
				ctx.textAlign = "left";
				ctx.fillText(name, cardX + 16, y);
				ctx.font = `700 12px ${FONT}`;
				ctx.fillStyle = color ?? c.text;
				ctx.textAlign = "right";
				ctx.fillText(value, cardX + cardW - 16, y);
			};
			const xmaxSet = t >= XMAX_AT;
			field(cardY + 66, "xmin", "3082798", c.blue, c.blueFill);
			field(cardY + 94, "xmax", xmaxSet ? "3082799" : "0", xmaxSet ? c.amber : null, xmaxSet ? c.amberFill : null);
			ctx.restore();
		}

		// 화살표: 넣기, 고치기
		const pulse = (at: number) => (t < at ? 0 : t < at + 1400 ? 1 : 1 - clamp01((t - at - 1400) / 400));
		drawArrow(ctx, ox + pillW + 6, y1, cardX - 6, cardY + 66, c.blue, pulse(ROW_AT), false);
		drawArrow(ctx, ox + pillW + 6, y2, cardX - 6, cardY + 94, c.amber, pulse(XMAX_AT - 300), false);

		const caption = L.captions[step];
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		fitCaption(ctx, caption, w);
		ctx.fillStyle = c.text;
		ctx.fillText(caption, w / 2, HEIGHT - 16);
	};
}

const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function TxIdDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

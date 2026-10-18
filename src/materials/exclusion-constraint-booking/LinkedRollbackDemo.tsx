import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, drawCard, fitCaption } from "./canvas";

// A+B 와 B+C 연결 예약이 같은 시간(10:00–11:00)에 들어와 회의실 B 에서 부딪히는 순서를 그린다.
// 진 쪽 트랜잭션은 롤백되면서 먼저 넣은 A 행까지 사라져 반쪽 예약이 남지 않는다.
// 회의실은 열, 시간은 세로축이다. 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const CYCLE = 12400;
const HEIGHT = 250;
const Y_TOP = 48; // 10:00
const Y_BOT = 200; // 11:00
const ROOMS = ["A", "B", "C"];

// 단계 경계와 동작 시각(ms)
const STEP_END = [2400, 4900, 6700, 9300, CYCLE];
const MOVE = 700;
const BC_INSERT = 300; // B+C: 부모·B·C 넣기
const AB_INSERT = 2600; // A+B: 부모·A 넣기
const AB_TRY_B = 3500; // A+B: B 를 넣다가 B+C 를 기다린다
const BC_COMMIT = 5000;
const AB_REJECT = 6900;
const AB_ROLLBACK = 7900;
const CARD_Y = [36, 140];
const CARD_H = [80, 64];

type Labels = {
	cards: [string, string];
	ab: [string, string, string, string];
	bc: [string, string];
	wait: string;
	reject: string;
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		cards: ["A+B 예약", "B+C 예약"],
		ab: ["부모·A 넣음", "B → 대기", "B → 거절 (23P01)", "롤백 → 남는 행 없음"],
		bc: ["부모·B·C 넣음", "커밋"],
		wait: "대기",
		reject: "23P01",
		captions: [
			"① B+C가 부모와 B·C 행을 넣는다 (커밋 전)",
			"② A+B는 A를 넣고 B에서 B+C를 기다린다",
			"③ B+C가 커밋한다",
			"④ A+B의 B가 거절되고 트랜잭션이 롤백된다",
			"⑤ B+C만 남고 반쪽 예약은 없다",
		],
		aria: "A+B와 B+C 연결 예약이 같은 시간에 들어오는 과정을 반복 재생하는 애니메이션. B+C가 부모 행과 회의실 B·C 행을 넣고 아직 커밋하지 않았을 때, A+B가 부모 행과 A 행을 넣은 뒤 B 행을 넣으려다 B+C를 기다린다. B+C가 커밋하면 A+B의 B 행은 23P01로 거절되고, A+B 트랜잭션이 롤백되면서 먼저 넣은 A 행과 부모 행도 사라진다. B+C만 남고 반쪽 예약은 남지 않는다.",
	},
	en: {
		cards: ["A+B booking", "B+C booking"],
		ab: ["Parent·A added", "B → waiting", "B → 23P01", "All rolled back"],
		bc: ["Parent·B·C added", "Committed"],
		wait: "waiting",
		reject: "23P01",
		captions: [
			"① B+C inserts its parent, B and C (uncommitted)",
			"② A+B inserts A, then waits on B+C at B",
			"③ B+C commits",
			"④ A+B's B is rejected and it rolls back",
			"⑤ Only B+C remains; no half booking",
		],
		aria: "Looping animation of linked bookings A+B and B+C arriving for the same time. B+C inserts its parent row and rows for rooms B and C without committing yet. A+B inserts its parent row and room A, then waits on B+C when inserting room B. Once B+C commits, A+B's row for B is rejected with 23P01, and the A+B transaction rolls back, taking the already inserted A row and parent row with it. Only B+C remains, and no half booking is left.",
	},
};

// 왼쪽에 예약 카드 두 장, 오른쪽에 회의실 A·B·C 열과 시각 눈금
function layout(w: number) {
	const comp = Math.min(w - 28, 540);
	const ox = (w - comp) / 2;
	const gridW = comp * 0.42;
	const gap = 4;
	const colW = (gridW - gap * 2) / 3;
	const gridX = ox + comp - gridW - 34;
	const cardW = comp - gridW - 34 - 30;
	return { ox, gridW, colW, gridX, cardW, colX: (i: number) => gridX + i * (colW + gap) };
}

const progress = (t: number, at: number) => ease(clamp01((t - at) / MOVE));
const fadeIn = (t: number, at: number) => clamp01((t - at) / 250);

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const { ox, gridW, colW, gridX, cardW, colX } = layout(w);
		const step = STEP_END.findIndex((end) => t < end);
		const pageBg = dark ? "#0d1117" : "#ffffff";

		// 회의실 열과 시각
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ROOMS.forEach((room, i) => ctx.fillText(room, colX(i) + colW / 2, Y_TOP - 14));
		ROOMS.forEach((_, i) => {
			ctx.beginPath();
			ctx.roundRect(colX(i), Y_TOP, colW, Y_BOT - Y_TOP, 6);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = c.boxStroke;
			ctx.lineWidth = 1;
			ctx.stroke();
		});
		ctx.textAlign = "left";
		ctx.font = `500 10px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText("10:00", gridX + gridW + 6, Y_TOP);
		ctx.fillText("11:00", gridX + gridW + 6, Y_BOT);

		// 회의실 행. 커밋 전은 점선, 커밋 뒤는 실선이다.
		const block = (i: number, stroke: string, fill: string, p: number, committed: boolean, alpha: number, label: string) => {
			if (p <= 0 || alpha <= 0) return;
			const x = colX(i) + 2;
			const h = (Y_BOT - Y_TOP - 4) * p;
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.beginPath();
			ctx.roundRect(x, Y_TOP + 2, colW - 4, h, 4);
			ctx.fillStyle = fill;
			if (!committed) ctx.globalAlpha = alpha * 0.6;
			ctx.fill();
			ctx.globalAlpha = alpha;
			ctx.strokeStyle = stroke;
			ctx.lineWidth = 1.5;
			if (!committed) ctx.setLineDash([4, 3]);
			ctx.stroke();
			if (p > 0.6) {
				ctx.textAlign = "center";
				ctx.font = `700 10px ${FONT}`;
				ctx.fillStyle = stroke;
				ctx.fillText(label, x + (colW - 4) / 2, Y_TOP + 14);
			}
			ctx.restore();
		};
		const bcCommitted = t >= BC_COMMIT;
		for (const i of [1, 2]) block(i, c.amber, c.amberFill, progress(t, BC_INSERT), bcCommitted, 1, "B+C");
		const abAlpha = t < AB_ROLLBACK ? 1 : 1 - clamp01((t - AB_ROLLBACK) / 600);
		block(0, c.blue, c.blueFill, progress(t, AB_INSERT), false, abAlpha, "A+B");

		// A+B 가 B 에 넣으려는 행: B+C 의 행 위에 겹쳐 그린다. 기다리다가 거절되고 롤백과 함께 사라진다.
		const tryAlpha = fadeIn(t, AB_TRY_B) * abAlpha;
		if (tryAlpha > 0) {
			const rejected = t >= AB_REJECT;
			const color = rejected ? c.red : c.blue;
			ctx.save();
			ctx.globalAlpha = tryAlpha;
			ctx.setLineDash([4, 3]);
			ctx.strokeStyle = color;
			ctx.lineWidth = 1.8;
			ctx.beginPath();
			ctx.roundRect(colX(1) + 6, Y_TOP + 22, colW - 12, Y_BOT - Y_TOP - 30, 4);
			ctx.stroke();
			ctx.restore();
			drawBadge(ctx, colX(1) + colW / 2, (Y_TOP + Y_BOT) / 2 + 8, rejected ? L.reject : L.wait, pageBg, color, tryAlpha);
		}

		// 동작 화살표
		const mid = (Y_TOP + Y_BOT) / 2;
		const from = (k: number) => [ox + cardW + 6, CARD_Y[k] + CARD_H[k] / 2] as const;
		const pulse = (at: number, until: number) => (t < at ? 0 : t < until ? 1 : 1 - clamp01((t - until) / 400));
		const [abX, abY] = from(0);
		const [bcX, bcY] = from(1);
		drawArrow(ctx, bcX, bcY, colX(1) - 4, mid + 30, c.amber, pulse(BC_INSERT, BC_INSERT + MOVE + 500), false);
		drawArrow(ctx, abX, abY, colX(0) - 4, mid - 20, c.blue, pulse(AB_INSERT, AB_INSERT + MOVE + 200), false);
		drawArrow(ctx, abX, abY, colX(1) + 4, mid - 30, c.blue, pulse(AB_TRY_B, AB_REJECT) * 0.9, true);

		// 예약 카드
		const rejected = t >= AB_REJECT;
		drawCard(
			ctx,
			c,
			ox,
			CARD_Y[0],
			cardW,
			CARD_H[0],
			L.cards[0],
			[
				{ text: L.ab[0], alpha: fadeIn(t, AB_INSERT + MOVE) },
				{ text: rejected ? L.ab[2] : L.ab[1], alpha: fadeIn(t, AB_TRY_B + 300), color: rejected ? c.red : undefined },
				{ text: L.ab[3], alpha: fadeIn(t, AB_ROLLBACK + 300), color: c.red },
			],
			c.blue,
			c.blueFill,
		);
		drawCard(
			ctx,
			c,
			ox,
			CARD_Y[1],
			cardW,
			CARD_H[1],
			L.cards[1],
			[
				{ text: L.bc[0], alpha: fadeIn(t, BC_INSERT + MOVE) },
				{ text: L.bc[1], alpha: fadeIn(t, BC_COMMIT) },
			],
			c.amber,
			c.amberFill,
		);

		// 하단 캡션
		const caption = L.captions[step];
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		fitCaption(ctx, caption, w);
		ctx.fillStyle = c.text;
		ctx.fillText(caption, w / 2, HEIGHT - 16);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function LinkedRollbackDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

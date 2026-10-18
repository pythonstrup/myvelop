import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawCard, fitCaption } from "./canvas";

// 세션 1이 A 10:00–11:00 을 커밋하지 않고 쥐고 있을 때 세 요청 중 겹치는 하나만 기다리는 장면.
// 요청마다 검사 범위를 점선으로 보여 준다. 걸린 시간은 글의 실측값이다. 시간은 세로축이다.
const CYCLE = 12600;
const HEIGHT = 250;
const STEP_END = [2200, 4200, 6200, 9200, CYCLE];
const Y_TOP = 40; // 10:00
const Y_BOT = 200; // 12:00
const yAt = (hour: number) => Y_TOP + ((Y_BOT - Y_TOP) * (hour - 10)) / 2;
const ROOMS = ["A", "B", "C"];
const REQ = [
	{ room: 1, from: 10, to: 11, at: 2400, title: "B 10:00–11:00", ms: "0.70 ms" },
	{ room: 0, from: 11, to: 12, at: 4400, title: "A 11:00–12:00", ms: "0.64 ms" },
	{ room: 0, from: 10.5, to: 11.5, at: 6400, title: "A 10:30–11:30", ms: "2,442 ms" },
];
const END_AT = 9400; // 세션 1이 끝난다
const CARD_H = 46;

type Labels = { s1: string; pass: string; wait: string; done: string; captions: string[]; aria: string };
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		s1: "세션 1",
		pass: "바로 통과",
		wait: "대기",
		done: "검사 끝",
		captions: [
			"① 세션 1이 A 10:00–11:00을 넣고 커밋을 미룬다",
			"② B 10:00–11:00은 겹치는 행이 없다 → 0.70 ms",
			"③ A 11:00–12:00도 겹치는 행이 없다 → 0.64 ms",
			"④ A 10:30–11:30만 세션 1의 행과 겹쳐 기다린다",
			"⑤ 세션 1이 끝나자 검사를 마친다 → 2,442 ms",
		],
		aria: "세션 1이 회의실 A 10:00–11:00 예약을 넣고 커밋하지 않은 동안 세 요청을 검사하는 과정을 반복 재생하는 애니메이션. B 10:00–11:00은 겹치는 행이 없어 0.70 ms 만에, A 11:00–12:00도 맞닿기만 해서 0.64 ms 만에 검사를 마친다. A 10:30–11:30만 세션 1의 행과 겹쳐 기다리고, 세션 1이 끝난 뒤 2,442 ms 만에 검사를 마친다.",
	},
	en: {
		s1: "Sess. 1",
		pass: "passes",
		wait: "waiting",
		done: "done",
		captions: [
			"① Session 1 inserts A 10:00–11:00 and delays commit",
			"② B 10:00–11:00 overlaps nothing → 0.70 ms",
			"③ A 11:00–12:00 overlaps nothing either → 0.64 ms",
			"④ Only A 10:30–11:30 overlaps session 1's row and waits",
			"⑤ Session 1 ends and the check finishes → 2,442 ms",
		],
		aria: "Looping animation of three requests checked while session 1 holds an uncommitted booking for room A 10:00–11:00. B 10:00–11:00 overlaps nothing and finishes in 0.70 ms, and A 11:00–12:00 only touches it and finishes in 0.64 ms. Only A 10:30–11:30 overlaps session 1's row and waits, finishing in 2,442 ms after session 1 ends.",
	},
};

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pageBg = dark ? "#0d1117" : "#ffffff";
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const gridW = comp * 0.42;
		const gap = 4;
		const colW = (gridW - gap * 2) / 3;
		const gridX = ox + comp - gridW - 34;
		const colX = (i: number) => gridX + i * (colW + gap);
		const cardW = comp - gridW - 34 - 20;
		const step = STEP_END.findIndex((end) => t < end);

		// 회의실 격자
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
		ctx.save();
		ctx.strokeStyle = c.line;
		ctx.setLineDash([2, 3]);
		for (const hour of [10.5, 11, 11.5]) {
			ctx.beginPath();
			ctx.moveTo(gridX, yAt(hour));
			ctx.lineTo(gridX + gridW, yAt(hour));
			ctx.stroke();
		}
		ctx.restore();
		ctx.textAlign = "left";
		ctx.font = `500 10px ${FONT}`;
		ctx.fillStyle = c.sub;
		for (const hour of [10, 11, 12]) ctx.fillText(`${hour}:00`, gridX + gridW + 6, yAt(hour));

		// 세션 1의 커밋 전 행. 세션 1이 끝나면(롤백) 사라진다.
		const s1Alpha = ease(clamp01((t - 200) / 500)) * (1 - clamp01((t - END_AT) / 500));
		if (s1Alpha > 0) {
			ctx.save();
			ctx.globalAlpha = s1Alpha;
			ctx.beginPath();
			ctx.roundRect(colX(0) + 2, yAt(10) + 2, colW - 4, yAt(11) - yAt(10) - 4, 4);
			ctx.fillStyle = c.blueFill;
			ctx.fill();
			ctx.setLineDash([4, 3]);
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.restore();
			ctx.save();
			ctx.globalAlpha = s1Alpha;
			ctx.font = `700 9.5px ${FONT}`;
			ctx.fillStyle = c.blue;
			ctx.textAlign = "center";
			ctx.fillText(L.s1, colX(0) + colW / 2, yAt(10) + 12);
			ctx.restore();
		}

		// 요청마다 검사 범위를 점선으로 그리고, 결과를 카드에 남긴다.
		REQ.forEach((r, k) => {
			const overlaps = k === 2;
			const finishAt = overlaps ? END_AT + 300 : r.at + 600;
			const probe = clamp01((t - r.at) / 300) * (1 - clamp01((t - finishAt - 600) / 400));
			if (probe > 0) {
				const color = overlaps && t < finishAt ? c.amber : c.green;
				ctx.save();
				ctx.globalAlpha = probe;
				ctx.setLineDash([4, 3]);
				ctx.strokeStyle = color;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.roundRect(colX(r.room) + 6, yAt(r.from) + 4, colW - 12, yAt(r.to) - yAt(r.from) - 8, 4);
				ctx.stroke();
				ctx.restore();
				if (overlaps && t < finishAt) {
					ctx.save();
					ctx.globalAlpha = probe * 0.35;
					ctx.fillStyle = c.amber;
					ctx.fillRect(colX(0) + 2, yAt(10.5), colW - 4, yAt(11) - yAt(10.5));
					ctx.restore();
					const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t / 300));
					drawBadge(ctx, colX(0) + colW / 2, yAt(11) + 20, L.wait, pageBg, c.amber, probe * pulse);
				}
			}

			const cy = 34 + k * (CARD_H + 10);
			const color = overlaps ? c.amber : c.green;
			const status = t < r.at ? "" : overlaps && t < finishAt ? `${L.wait}…` : overlaps ? `${L.done} · ${r.ms}` : `${L.pass} · ${r.ms}`;
			ctx.save();
			ctx.globalAlpha = 0.45 + 0.55 * clamp01((t - r.at + 300) / 300);
			drawCard(ctx, c, ox, cy, cardW, CARD_H, r.title, [{ text: status, alpha: status ? 1 : 0, color }], color, overlaps ? c.amberFill : c.greenFill);
			ctx.restore();
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

export default function WaitScopeDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

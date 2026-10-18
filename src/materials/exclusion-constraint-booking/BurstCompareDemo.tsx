import { FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawBars, fitCaption } from "./canvas";

// 같은 칸에 20건을 같은 순간에 넣은 실측 라운드 하나씩을 EXCLUDE(위)와 슬롯(아래)으로 나란히 그린다.
// EXCLUDE 는 교착이 이어진 라운드로 이긴 1건이 19.0초에 들어갔고, 슬롯은 0.08초 안에 모두 끝났다.
const EX_ENDS = [1010, 2012, 3013, 4015, 5015, 6017, 7019, 8019, 9021, 10023, 11024, 12025, 13026, 14027, 15030, 16031, 17032, 18035, 19035];
const EX_WIN = 19035;
const SL_ENDS = [14, 16, 19, 21, 24, 30, 30, 36, 38, 41, 44, 48, 53, 61, 64, 64, 64, 73, 76];
const SL_WIN = 14;
const AXIS_MAX = 20000;
const T0 = 1600;
const SPEED = 2; // 실측 2초를 애니메이션 1초로
const RUN_END = T0 + EX_WIN / SPEED;
const CYCLE = RUN_END + 2800;
const STEP_END = [T0, T0 + 1400, RUN_END, CYCLE];
const HEIGHT = 326;
const PANEL_TOP = [28, 158];
const ROW = 5;
const BAR = 3.5;

type Labels = {
	panels: [string, string];
	elapsed: (s: string) => string;
	sec: string;
	exWin: string;
	slDone: string;
	legend: [string, string, string, string];
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		panels: ["EXCLUDE · 교착이 이어진 라운드", "슬롯 · 같은 조건"],
		elapsed: (s) => `경과 ${s}초`,
		sec: "초",
		exWin: "성공 · 19.0초",
		slDone: "모두 0.08초 안에 끝남",
		legend: ["기다림", "40P01", "거절", "성공"],
		captions: [
			"① 같은 칸에 20건이 같은 순간에 들어온다",
			"② 슬롯은 0.08초 만에 1건이 들어가고 19건이 거절된다",
			"③ EXCLUDE는 교착이 1초씩 이어진다",
			"④ EXCLUDE는 이긴 1건도 19초 뒤에야 들어갔다",
		],
		aria: "같은 회의실과 시간에 20건을 같은 순간에 넣은 실측 라운드 하나씩을 EXCLUDE와 슬롯으로 나란히 보여 주는 반복 애니메이션. 막대는 세션이 기다린 시간이다. 슬롯은 0.014초에 1건이 들어가고 나머지 19건이 0.08초 안에 모두 거절된다. EXCLUDE는 교착이 1초씩 이어져 40P01이 1초에 한 건씩 나고, 이긴 1건도 19.0초에야 들어갔다.",
	},
	en: {
		panels: ["EXCLUDE · a round with chained deadlocks", "Slots · same conditions"],
		elapsed: (s) => `${s} s elapsed`,
		sec: "s",
		exWin: "success · 19.0 s",
		slDone: "all done within 0.08 s",
		legend: ["waiting", "40P01", "rejected", "success"],
		captions: [
			"① 20 inserts hit the same slot at the same moment",
			"② Slots: one gets in, 19 are rejected within 0.08 s",
			"③ EXCLUDE: the deadlocks chain, 1 s apiece",
			"④ EXCLUDE: even the winner got in only after 19 s",
		],
		aria: "Looping animation comparing one measured round each for EXCLUDE and for slots, in which 20 bookings for the same room and time were inserted at the same moment; each bar shows how long a session waited. With slots one insert succeeds at 0.014 s and the other 19 are rejected within 0.08 s. With EXCLUDE the deadlocks chain one per second, producing a 40P01 every second, and even the winner got in only at 19.0 s.",
	},
};

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const chartX = ox + 4;
		const chartW = comp - 70;
		const xAt = (ms: number) => chartX + (chartW * ms) / AXIS_MAX;
		const e = Math.min(EX_WIN, Math.max(0, (t - T0) * SPEED));
		const step = STEP_END.findIndex((end) => t < end);
		const bottom = PANEL_TOP[1] + ROW * 20;

		ctx.textBaseline = "middle";
		ctx.font = `700 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.textAlign = "right";
		ctx.fillText(L.elapsed((e / 1000).toFixed(1)), ox + comp, 12);

		// 눈금은 두 패널에 함께 쓴다
		ctx.font = `500 10px ${FONT}`;
		ctx.textAlign = "center";
		for (const s of [0, 5, 10, 15, 20]) {
			const x = xAt(s * 1000);
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, PANEL_TOP[0] - 4);
			ctx.lineTo(x, bottom + 2);
			ctx.stroke();
			ctx.fillStyle = c.sub;
			ctx.fillText(s === 20 ? `${s}${L.sec}` : `${s}`, x, bottom + 12);
		}

		PANEL_TOP.forEach((top, p) => {
			ctx.font = `600 10.5px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.fillText(L.panels[p], ox, top - 12);
		});
		drawBars(ctx, c, chartX, PANEL_TOP[0], chartW, ROW, BAR, AXIS_MAX, EX_ENDS, EX_WIN, e, c.red);
		drawBars(ctx, c, chartX, PANEL_TOP[1], chartW, ROW, BAR, AXIS_MAX, SL_ENDS, SL_WIN, e, c.sub);

		ctx.font = `700 10.5px ${FONT}`;
		ctx.textAlign = "left";
		if (e >= SL_ENDS[SL_ENDS.length - 1]) {
			ctx.fillStyle = c.text;
			ctx.fillText(L.slDone, xAt(SL_ENDS[SL_ENDS.length - 1]) + 10, PANEL_TOP[1] + ROW * 10);
		}
		if (e >= EX_WIN) {
			ctx.fillStyle = c.green;
			ctx.fillText(L.exWin, xAt(EX_WIN) + 8, PANEL_TOP[0] + ROW * 19 + BAR / 2);
		}

		// 지금 시각
		if (t >= T0 && e < EX_WIN) {
			ctx.save();
			ctx.strokeStyle = c.text;
			ctx.globalAlpha = 0.5;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(xAt(e), PANEL_TOP[0] - 6);
			ctx.lineTo(xAt(e), bottom);
			ctx.stroke();
			ctx.restore();
		}

		// 범례
		ctx.font = `500 10px ${FONT}`;
		ctx.textAlign = "left";
		let lx = ox;
		[c.amber, c.red, c.sub, c.green].forEach((color, i) => {
			ctx.fillStyle = color;
			ctx.fillRect(lx, bottom + 30, 10, 6);
			ctx.fillStyle = c.sub;
			ctx.fillText(L.legend[i], lx + 14, bottom + 33);
			lx += 14 + ctx.measureText(L.legend[i]).width + 14;
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

export default function BurstCompareDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

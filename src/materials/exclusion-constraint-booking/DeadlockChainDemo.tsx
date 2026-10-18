import { FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawBars, fitCaption } from "./canvas";

// 같은 회의실·시간 20건을 같은 순간에 넣은 라운드 하나의 실측. 세션마다 기다린 시간을 막대로 그린다.
// 40P01 이 1초에 한 건씩 나고, 이긴 1건도 마지막 교착이 풀린 19초에야 들어간다.
const ENDS = [1010, 2012, 3013, 4015, 5015, 6017, 7019, 8019, 9021, 10023, 11024, 12025, 13026, 14027, 15030, 16031, 17032, 18035, 19035];
const WIN = 19035;
const AXIS_MAX = 20000;
const T0 = 1600; // 막대가 자라기 시작하는 시각
const SPEED = 2; // 실측 2초를 애니메이션 1초로
const RUN_END = T0 + WIN / SPEED;
const CYCLE = RUN_END + 2800;
const STEP_END = [T0, T0 + 2600 / SPEED, RUN_END, CYCLE];
const HEIGHT = 286;
const TOP = 36;
const ROW = 9;

type Labels = { title: string; elapsed: (s: string) => string; sec: string; win: string; legend: [string, string, string]; captions: string[]; aria: string };
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		title: "세션 20개 · 같은 회의실, 같은 시간",
		elapsed: (s) => `경과 ${s}초`,
		sec: "초",
		win: "성공 · 19.0초",
		legend: ["기다림", "40P01", "성공"],
		captions: [
			"① 20건을 같은 순간에 넣자 모두 기다리기 시작한다",
			"② 1초 뒤 첫 40P01이 나고 나머지는 다시 기다린다",
			"③ 남은 세션끼리 또 고리를 만들어 1초씩 걸린다",
			"④ 이긴 1건도 19초 뒤에야 들어갔다",
		],
		aria: "같은 회의실과 시간의 예약 20건을 같은 순간에 넣은 라운드 하나의 실측을 세션별 막대로 보여 주는 반복 애니메이션. 막대는 세션이 기다린 시간이다. 첫 40P01은 1.0초에 나고 그 뒤로 1초에 한 건씩 이어져 19.0초에 열아홉 번째가 난다. 이긴 1건도 19.0초에야 들어갔다.",
	},
	en: {
		title: "20 sessions · same room, same time",
		elapsed: (s) => `${s} s elapsed`,
		sec: "s",
		win: "success · 19.0 s",
		legend: ["waiting", "40P01", "success"],
		captions: [
			"① 20 inserts start at once and all begin waiting",
			"② After 1 s the first 40P01 fires; the rest wait again",
			"③ The rest form a new cycle each time: 1 s apiece",
			"④ Even the winner got in only after 19 s",
		],
		aria: "Looping animation of one measured round in which 20 bookings for the same room and time were inserted at the same moment, drawn as one bar per session showing how long it waited. The first 40P01 fires at 1.0 s and then one more every second, the nineteenth at 19.0 s. Even the winning insert got in only at 19.0 s.",
	},
};

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const chartX = ox + 4;
		const chartW = comp - 70; // 오른쪽에 끝 표시 자리를 남긴다
		const xAt = (ms: number) => chartX + (chartW * ms) / AXIS_MAX;
		const e = Math.min(WIN, Math.max(0, (t - T0) * SPEED));
		const step = STEP_END.findIndex((end) => t < end);
		const bottom = TOP + ROW * 20;

		ctx.textBaseline = "middle";
		ctx.font = `600 10.5px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.fillText(L.title, ox, 16);
		ctx.font = `700 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.textAlign = "right";
		ctx.fillText(L.elapsed((e / 1000).toFixed(1)), ox + comp, 16);

		// 눈금
		ctx.font = `500 10px ${FONT}`;
		ctx.textAlign = "center";
		for (const s of [0, 5, 10, 15, 20]) {
			const x = xAt(s * 1000);
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, TOP - 4);
			ctx.lineTo(x, bottom + 2);
			ctx.stroke();
			ctx.fillStyle = c.sub;
			ctx.fillText(s === 20 ? `${s}${L.sec}` : `${s}`, x, bottom + 12);
		}

		// 세션별 막대. 가장 최근에 끝난 막대 옆에 40P01, 이긴 막대 옆에 성공을 적는다.
		drawBars(ctx, c, chartX, TOP, chartW, ROW, 6, AXIS_MAX, ENDS, WIN, e, c.red);
		const latest = ENDS.findLastIndex((end) => end <= e);
		ctx.textAlign = "left";
		if (e >= WIN) {
			ctx.font = `700 10.5px ${FONT}`;
			ctx.fillStyle = c.green;
			ctx.fillText(L.win, xAt(WIN) + 8, TOP + ENDS.length * ROW + 3);
		} else if (latest >= 0) {
			ctx.font = `700 10px ${FONT}`;
			ctx.fillStyle = c.red;
			ctx.fillText(L.legend[1], xAt(ENDS[latest]) + 8, TOP + latest * ROW + 3);
		}

		// 지금 시각
		if (t >= T0 && e < WIN) {
			ctx.save();
			ctx.strokeStyle = c.text;
			ctx.globalAlpha = 0.5;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(xAt(e), TOP - 6);
			ctx.lineTo(xAt(e), bottom);
			ctx.stroke();
			ctx.restore();
		}

		// 범례
		ctx.font = `500 10px ${FONT}`;
		ctx.textAlign = "left";
		let lx = ox;
		[c.amber, c.red, c.green].forEach((color, i) => {
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

export default function DeadlockChainDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

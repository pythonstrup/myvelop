import { ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 같은 판단 20개를 다섯 방식으로 끝내는 데 걸린 시간과 이력서 한 장 비용을 줄마다 보여준다(실측 중앙값·범위).
// 가로축은 12초에서 끊는다. 문항마다 차례로 묻는 줄만 축을 넘어가고, 시계를 빨리 감아 54.7초에서 멈춘다.
// 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
type Row = { group: 0 | 1 | 2; sec: number; rangeFrom?: number; jev?: boolean };
const ROWS: Row[] = [
	{ group: 0, sec: 0.19, jev: true },
	{ group: 1, sec: 2.9 },
	{ group: 1, sec: 11.4 },
	{ group: 2, sec: 5.2, rangeFrom: 4.0 }, // 동시 2번: 4.0초와 5.2초
	{ group: 2, sec: 54.7 },
];
const SEQ_SEC = 54.7;
const AXIS_MAX = 12; // 가로축 끝(초)
const TICKS = [0, 3, 6, 9, 12];
const MS_PER_SEC = 450; // 실제 1초를 애니메이션 0.45초로 줄여 보여준다
const START = 600;
const RACE_END = START + AXIS_MAX * MS_PER_SEC;
const SKIP_MS = 1400; // 12초에서 54.7초까지 빨리 감는 구간
const SKIP_END = RACE_END + SKIP_MS;
const CYCLE = SKIP_END + 4200;
const JEV_CAPTION_AT = START + 900;

const TOP = 34;
const ROW_H = 34;
const GROUP_H = 20;
const BAR_H = 10;
const AXIS_H = 22;
const CAPTION_H = 30;
const HEIGHT = TOP + ROWS.length * ROW_H + 2 * GROUP_H + AXIS_H + CAPTION_H;

type Labels = {
	title: string;
	sec: (s: number) => string;
	groups: string[];
	rows: string[];
	results: string[];
	captions: string[];
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		title: "같은 판단 20개를 끝내기까지",
		sec: (s) => `${s}초`,
		groups: ["", "Haiku 5.5 · 한 번에 20개", "Haiku 5.5 · 문항마다 따로 20번"],
		rows: ["Jev · 한 요청에 20개", "생각 안 함", "생각 함", "동시에", "차례로"],
		results: ["0.19초 · $0.000116", "2.9초 · $0.00070", "11.4초 · $0.00165", "4.0~5.2초 · $0.0068~0.0070", "54.7초 · $0.0073"],
		captions: [
			"① 같은 판단 20개를 다섯 방식으로 동시에 보낸다",
			"② Jev는 0.19초 만에 답 20개를 모두 돌려준다",
			"③ 문항마다 차례로 물으면 54.7초가 걸린다",
			"④ 줄 끝의 숫자는 시간과 이력서 한 장의 비용이다",
		],
		aria: "같은 판단 20개를 다섯 방식으로 끝내는 데 걸린 시간과 이력서 한 장의 비용을 줄마다 보여주는 애니메이션. Jev는 한 요청에 묶어 0.19초, $0.000116이다. Haiku 5.5에 한 번에 물으면 생각하지 않을 때 2.9초, $0.00070이고 생각할 때 11.4초, $0.00165다. 문항마다 따로 20번 물으면 동시에 보낼 때 4.0초에서 5.2초, $0.0068에서 $0.0070이고, 차례로 보내면 54.7초, $0.0073이다. 가로축은 12초에서 끊었다.",
	},
	en: {
		title: "Time to finish the same 20 judgments",
		sec: (s) => `${s} s`,
		groups: ["", "Haiku 5.5 · 20 at once", "Haiku 5.5 · 20 separate calls"],
		rows: ["Jev · 20 in one request", "No thinking", "Thinking", "Concurrent", "Sequential"],
		results: ["0.19 s · $0.000116", "2.9 s · $0.00070", "11.4 s · $0.00165", "4.0–5.2 s · $0.0068–0.0070", "54.7 s · $0.0073"],
		captions: [
			"① Send the same 20 judgments five ways at once",
			"② Jev returns all 20 answers in 0.19 s",
			"③ One question at a time takes 54.7 s",
			"④ Each row ends with its time and cost per resume",
		],
		aria: "Animation of the time and cost per resume for the same 20 judgments done five ways. Jev, with all 20 in one request, takes 0.19 s and $0.000116. Asking Haiku 5.5 all at once takes 2.9 s and $0.00070 without thinking, and 11.4 s and $0.00165 with thinking. Asking each question separately takes 4.0 to 5.2 s and $0.0068 to $0.0070 when concurrent, and 54.7 s and $0.0073 when sequential. The time axis is cut at 12 s.",
	},
};
type Lang = keyof typeof LABELS;

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "left") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function elapsedSec(t: number) {
	if (t < START) return 0;
	if (t < RACE_END) return (t - START) / MS_PER_SEC;
	if (t < SKIP_END) return AXIS_MAX + (SEQ_SEC - AXIS_MAX) * ease((t - RACE_END) / SKIP_MS);
	return SEQ_SEC;
}

function captionIndex(t: number) {
	if (t < JEV_CAPTION_AT) return 0;
	if (t < RACE_END) return 1;
	if (t < SKIP_END) return 2;
	return 3;
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const x0 = margin;
		const span = w - 2 * margin;
		const x = (s: number) => x0 + (span * Math.min(s, AXIS_MAX)) / AXIS_MAX;
		const elapsed = elapsedSec(t);

		drawText(ctx, L.title, margin, 14, c.text, `700 12px ${FONT}`);
		drawText(ctx, L.sec(Number(elapsed.toFixed(1))), w - margin, 14, c.sub, `600 11px ${FONT}`, "right");

		let y = TOP;
		let lastGroup = 0;
		ROWS.forEach((row, i) => {
			if (row.group !== lastGroup) {
				drawText(ctx, L.groups[row.group], margin, y + GROUP_H / 2, c.sub, `600 10.5px ${FONT}`);
				y += GROUP_H;
				lastGroup = row.group;
			}
			const color = row.jev ? c.blue : c.amber;
			const labelY = y + 8;
			const barY = y + 17;
			drawText(ctx, L.rows[i], margin, labelY, c.text, `${row.jev ? 700 : 500} 11px ${FONT}`);

			// 막대 자리
			ctx.beginPath();
			ctx.roundRect(x0, barY, span, BAR_H, 4);
			ctx.fillStyle = c.boxFill;
			ctx.fill();

			const cur = Math.min(elapsed, row.sec);
			if (cur > 0) {
				const solidEnd = row.rangeFrom === undefined ? cur : Math.min(cur, row.rangeFrom);
				ctx.beginPath();
				ctx.roundRect(x0, barY, Math.max(3, x(solidEnd) - x0), BAR_H, 4);
				ctx.fillStyle = color;
				ctx.fill();
				// 동시 실행은 두 번이 4.0초와 5.2초에 끝났다. 그 사이를 옅게 칠한다.
				if (row.rangeFrom !== undefined && cur > row.rangeFrom) {
					ctx.beginPath();
					ctx.roundRect(x(row.rangeFrom), barY, x(cur) - x(row.rangeFrom), BAR_H, [0, 4, 4, 0]);
					ctx.fillStyle = c.amberFill;
					ctx.fill();
					ctx.strokeStyle = color;
					ctx.lineWidth = 1;
					ctx.stroke();
				}
			}

			// 축을 넘는 줄에는 끊김 표시를 그린다.
			if (row.sec > AXIS_MAX && elapsed > AXIS_MAX - 0.6) {
				const bx = x0 + span - 16;
				ctx.save();
				ctx.strokeStyle = c.text;
				ctx.lineWidth = 1.5;
				for (const dx of [0, 5]) {
					ctx.beginPath();
					ctx.moveTo(bx + dx - 2, barY + BAR_H + 3);
					ctx.lineTo(bx + dx + 2, barY - 3);
					ctx.stroke();
				}
				ctx.restore();
			}

			if (elapsed >= row.sec) {
				drawText(ctx, L.results[i], w - margin, labelY, row.jev ? c.blue : c.text, `600 10.5px ${FONT}`, "right");
			}
			y += ROW_H;
		});

		// 가로축 눈금. 마지막 눈금 뒤의 물결은 축을 끊었다는 표시다.
		const axisY = y + 8;
		TICKS.forEach((s) => {
			const align: CanvasTextAlign = s === 0 ? "left" : s === AXIS_MAX ? "right" : "center";
			drawText(ctx, s === AXIS_MAX ? `${L.sec(s)} ≈` : L.sec(s), x(s), axisY, c.sub, `500 10.5px ${FONT}`, align);
		});

		drawText(ctx, L.captions[captionIndex(t)], w / 2, HEIGHT - 14, c.text, `500 12px ${FONT}`, "center");
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function JudgmentRaceDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

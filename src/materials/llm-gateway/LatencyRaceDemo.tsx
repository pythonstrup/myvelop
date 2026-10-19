import { clamp01, FONT, palette, useCanvasScene } from "@/materials/shared";

// Edgee가 2026년 8월에 잰 gpt-5.4 첫 토큰 시간(TTFT) 중앙값으로, 일곱 경로의 막대가 동시에 자라다 첫 토큰이 오면 멈춘다.
// 직접 호출만큼은 파랑, 게이트웨이가 더한 시간은 주황으로 칠한다. 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const ROWS = [
	{ name: "direct", ms: 774 },
	{ name: "Edgee", ms: 798 },
	{ name: "Cloudflare", ms: 811 },
	{ name: "TrueFoundry", ms: 869 },
	{ name: "Vercel", ms: 938 },
	{ name: "OpenRouter", ms: 1020 },
	{ name: "Kong", ms: 1718 },
];
const BASE = ROWS[0].ms;
const SCALE_MAX = 1800; // 가로축 끝(ms)
const START = 400; // 출발 전 대기(ms)
const SLOW = 1.6; // 실제 1ms를 애니메이션 1.6ms로 늘려 보여준다
const RACE_END = START + SCALE_MAX * SLOW;
const CYCLE = RACE_END + 4600;

const TOP = 34;
const ROW_H = 24;
const BAR_H = 12;
const HEIGHT = TOP + ROWS.length * ROW_H + 40;

type Labels = { title: string; direct: string; captions: string[]; aria: string };

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		title: "gpt-5.4 첫 토큰까지 (중앙값)",
		direct: "직접 호출",
		captions: ["① 같은 요청을 일곱 경로로 보내 첫 토큰을 기다린다", "② 점선 너머 주황이 게이트웨이가 더한 지연이다"],
		aria: "Edgee가 2026년 8월에 잰 gpt-5.4 첫 토큰 시간 중앙값을 경로별 막대로 보여주는 애니메이션. 막대가 동시에 자라다 첫 토큰이 도착하면 멈춘다. 직접 호출은 774ms이고, 게이트웨이가 더한 지연은 Edgee 24ms, Cloudflare 37ms, TrueFoundry 95ms, Vercel 164ms, OpenRouter 246ms, Kong 944ms다.",
	},
	en: {
		title: "gpt-5.4 time to first token (median)",
		direct: "Direct",
		captions: ["① Send one request seven ways and wait", "② Orange past the dashed line is gateway overhead"],
		aria: "Animation of median gpt-5.4 time to first token by path, measured by Edgee in August 2026. The bars grow together and stop when the first token arrives. Direct calls take 774 ms; the gateways add 24 ms for Edgee, 37 ms for Cloudflare, 95 ms for TrueFoundry, 164 ms for Vercel, 246 ms for OpenRouter, and 944 ms for Kong.",
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

const fmt = (ms: number) => `${Math.round(ms).toLocaleString("en-US")}ms`;

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const labelW = 84;
		const valueW = 52;
		const x0 = margin + labelW;
		const span = w - margin - valueW - x0;
		const x = (ms: number) => x0 + (span * ms) / SCALE_MAX;
		const elapsed = clamp01((t - START) / (RACE_END - START)) * SCALE_MAX;

		drawText(ctx, L.title, margin, 14, c.text, `700 12px ${FONT}`);
		drawText(ctx, fmt(Math.min(elapsed, ROWS.at(-1)!.ms)), w - margin, 14, c.sub, `600 11px ${FONT}`, "right");

		// 직접 호출 기준선
		const bottom = TOP + ROWS.length * ROW_H;
		ctx.save();
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = c.sub;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x(BASE), TOP - 4);
		ctx.lineTo(x(BASE), bottom);
		ctx.stroke();
		ctx.restore();

		ROWS.forEach((row, i) => {
			const cy = TOP + i * ROW_H + ROW_H / 2;
			const isBase = i === 0;
			drawText(ctx, isBase ? L.direct : row.name, margin, cy, c.text, `${isBase ? 700 : 500} 11px ${FONT}`);

			// 막대 자리
			ctx.beginPath();
			ctx.roundRect(x0, cy - BAR_H / 2, span, BAR_H, 4);
			ctx.fillStyle = c.boxFill;
			ctx.fill();

			const cur = Math.min(elapsed, row.ms);
			if (cur <= 0) return;
			// 직접 호출만큼은 파랑, 넘는 부분은 주황. 두 칸 사이에 2px 틈을 둔다.
			const blueEnd = x(Math.min(cur, BASE));
			const over = cur > BASE;
			ctx.beginPath();
			ctx.roundRect(x0, cy - BAR_H / 2, blueEnd - x0 - (over ? 1 : 0), BAR_H, over ? [4, 0, 0, 4] : 4);
			ctx.fillStyle = c.blue;
			ctx.fill();
			if (over) {
				ctx.beginPath();
				ctx.roundRect(blueEnd + 1, cy - BAR_H / 2, Math.max(0, x(cur) - blueEnd - 1), BAR_H, [0, 4, 4, 0]);
				ctx.fillStyle = c.amber;
				ctx.fill();
			}

			// 수치는 기준 점선과 겹치지 않도록 오른쪽 끝 열에 맞춘다.
			if (elapsed >= row.ms) {
				const label = isBase ? fmt(row.ms) : `+${fmt(row.ms - BASE)}`;
				drawText(ctx, label, w - margin, cy + 0.5, isBase ? c.text : c.sub, `600 10.5px ${FONT}`, "right");
			}
		});

		const caption = t < RACE_END ? 0 : 1;
		drawText(ctx, L.captions[caption], w / 2, HEIGHT - 14, c.text, `500 12px ${FONT}`, "center");
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function LatencyRaceDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

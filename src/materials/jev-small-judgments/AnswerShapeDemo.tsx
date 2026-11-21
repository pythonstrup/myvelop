import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 대용량 트래픽 처리 질문을 Haiku에 열 번, Jev에 다섯 번 보낸 실측값이다.
// Haiku는 확률 하나를 글자로 써 내려가고 그 값이 0.05 눈금 위에 쌓인다. Jev는 보기마다 확률을 나눈 막대가 실행마다 조금씩 움직인다.
const HAIKU_P = [0.6, 0.8, 0.6, 0.55, 0.55, 0.85, 0.85, 0.85, 0.75, 0.75];
const JEV_RUNS = [
	[0, 0.15, 0.85],
	[0, 0.11, 0.89],
	[0, 0.13, 0.87],
	[0, 0.14, 0.86],
	[0, 0.18, 0.82],
];
const DEEP = 2; // 보기 순서: 얕음, 보통, 깊음

const START = 400;
const RUN_MS = 850; // Haiku 실행 한 번
const TYPE_MS = 600; // 그중 글자를 쓰는 시간
const HAIKU_END = START + HAIKU_P.length * RUN_MS;
const JEV_RUN_MS = (HAIKU_END - START) / JEV_RUNS.length;
const TWEEN_MS = 400;
const CYCLE = HAIKU_END + 3600;

const AXIS_MIN = 0.5;
const AXIS_MAX = 0.9;
const TICK = 0.05;
const DOT_R = 5;
const DOT_STEP = 11;

const AXIS_Y = 104;
const JEV_TOP = 146;
const BAR_ROW = 24;
const BAR_H = 12;
const HEIGHT = JEV_TOP + 26 + BAR_ROW * 3 + 34;

type Labels = {
	haiku: string;
	jev: string;
	run: (i: number, n: number) => string;
	options: readonly string[];
	labelW: number;
	range: (lo: number, hi: number) => string;
	captions: readonly string[];
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		haiku: "Haiku 5.5 · 확률을 글자로 쓴다",
		jev: "Jev · 보기마다 확률을 나눈다",
		run: (i, n) => `실행 ${i} / ${n}`,
		options: ["얕음", "보통", "깊음"],
		labelW: 40,
		range: (lo, hi) => `${lo.toFixed(2)}~${hi.toFixed(2)}`,
		captions: ["① 같은 질문을 Haiku에 열 번, Jev에 다섯 번 보낸다", "② 글자로 쓴 확률은 흩어지고, 분포는 좁게 모인다"],
		aria: "대용량 트래픽 처리를 얼마나 깊이 다뤘는지 묻는 같은 질문의 답을 비교하는 애니메이션. Haiku 5.5는 열 번 모두 깊음을 골랐지만 글자로 써 넣은 확률은 0.6, 0.8, 0.6, 0.55, 0.55, 0.85, 0.85, 0.85, 0.75, 0.75로 0.55에서 0.85까지 흩어지고 모두 0.05 단위에 놓인다. Jev는 다섯 번 모두 얕음 0, 보통 0.11에서 0.18, 깊음 0.82에서 0.89로 보기마다 확률을 나눠 돌려준다.",
	},
	en: {
		haiku: "Haiku 5.5 · writes one probability as text",
		jev: "Jev · splits probability across options",
		run: (i, n) => `Run ${i} / ${n}`,
		options: ["Shallow", "Moderate", "Deep"],
		labelW: 60,
		range: (lo, hi) => `${lo.toFixed(2)}–${hi.toFixed(2)}`,
		captions: ["① Haiku gets the question ten times, Jev five", "② Written numbers scatter; the distribution holds"],
		aria: "Animation comparing answers to the same question about how deeply the resume handled high-volume traffic. Haiku 5.5 picked Deep all ten times, but the probability it wrote out was 0.6, 0.8, 0.6, 0.55, 0.55, 0.85, 0.85, 0.85, 0.75, 0.75, scattered from 0.55 to 0.85 and always on a multiple of 0.05. Jev returned a probability for each option every time: Shallow 0, Moderate 0.11 to 0.18, and Deep 0.82 to 0.89 over five runs.",
	},
};
type Lang = keyof typeof LABELS;

const MONO = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "left") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

const json = (L: Labels, p: number) => `{"answer": "${L.options[DEEP]}", "p": ${p}}`;

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const m = 8;

		// ── Haiku ──
		const run = Math.min(HAIKU_P.length - 1, Math.max(0, Math.floor((t - START) / RUN_MS)));
		const runT = t - START - run * RUN_MS;
		drawText(ctx, L.haiku, m, 14, c.amber, `700 12px ${FONT}`);
		drawText(ctx, L.run(t < START ? 0 : run + 1, HAIKU_P.length), w - m, 14, c.sub, `600 11px ${FONT}`, "right");

		if (t >= START) {
			const text = json(L, HAIKU_P[run]);
			const shown = t >= HAIKU_END ? text.length : Math.floor(text.length * clamp01(runT / TYPE_MS));
			ctx.font = MONO;
			const typed = text.slice(0, shown);
			drawText(ctx, typed, m, 44, c.text, MONO);
			// 쓰는 동안 깜박이는 커서
			if (t < HAIKU_END && runT < TYPE_MS + 120) {
				const cx = m + ctx.measureText(typed).width + 1;
				ctx.fillStyle = c.amber;
				ctx.fillRect(cx, 37, 1.5, 14);
			}
		}

		const ax0 = m + 10;
		const ax1 = w - m - 10;
		const ax = (p: number) => ax0 + ((ax1 - ax0) * (p - AXIS_MIN)) / (AXIS_MAX - AXIS_MIN);
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(ax0, AXIS_Y);
		ctx.lineTo(ax1, AXIS_Y);
		ctx.stroke();
		for (let i = 0; i <= Math.round((AXIS_MAX - AXIS_MIN) / TICK); i++) {
			const p = AXIS_MIN + i * TICK;
			const major = i % 2 === 0;
			ctx.beginPath();
			ctx.moveTo(ax(p), AXIS_Y);
			ctx.lineTo(ax(p), AXIS_Y + (major ? 6 : 4));
			ctx.stroke();
			if (major) drawText(ctx, p.toFixed(1), ax(p), AXIS_Y + 15, c.sub, `500 10.5px ${FONT}`, "center");
		}

		// 실행이 끝날 때마다 같은 값 위로 점을 쌓는다.
		const stack = new Map<number, number>();
		HAIKU_P.forEach((p, i) => {
			const level = stack.get(p) ?? 0;
			stack.set(p, level + 1);
			const appear = START + i * RUN_MS + TYPE_MS;
			const a = clamp01((t - appear) / 200);
			if (a <= 0) return;
			ctx.globalAlpha = a;
			ctx.beginPath();
			ctx.arc(ax(p), AXIS_Y - DOT_R - 2 - level * DOT_STEP, DOT_R, 0, Math.PI * 2);
			ctx.fillStyle = c.amber;
			ctx.fill();
			ctx.globalAlpha = 1;
		});

		// ── Jev ──
		const jrun = Math.min(JEV_RUNS.length - 1, Math.max(0, Math.floor((t - START) / JEV_RUN_MS)));
		const jT = t - START - jrun * JEV_RUN_MS;
		const prev = jrun === 0 ? [0, 0, 0] : JEV_RUNS[jrun - 1];
		const k = t < START ? 0 : ease(clamp01(jT / TWEEN_MS));
		const cur = JEV_RUNS[jrun].map((v, i) => (t < START ? 0 : lerp(prev[i], v, k)));
		drawText(ctx, L.jev, m, JEV_TOP, c.blue, `700 12px ${FONT}`);
		drawText(ctx, L.run(t < START ? 0 : jrun + 1, JEV_RUNS.length), w - m, JEV_TOP, c.sub, `600 11px ${FONT}`, "right");

		const bx0 = m + L.labelW;
		const bx1 = w - m - 40;
		const bw = bx1 - bx0;
		L.options.forEach((name, i) => {
			const cy = JEV_TOP + 26 + i * BAR_ROW;
			drawText(ctx, name, m, cy, c.text, `${i === DEEP ? 700 : 500} 11px ${FONT}`);
			ctx.beginPath();
			ctx.roundRect(bx0, cy - BAR_H / 2, bw, BAR_H, 4);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			if (cur[i] > 0.002) {
				ctx.beginPath();
				ctx.roundRect(bx0, cy - BAR_H / 2, Math.max(2, bw * cur[i]), BAR_H, 4);
				ctx.fillStyle = c.blue;
				ctx.fill();
			}
			drawText(ctx, cur[i].toFixed(2), w - m, cy, c.text, `600 11px ${FONT}`, "right");
			// 깊음 줄 아래에 지금까지 나온 값을 눈금으로 남겨 흔들림의 폭을 보인다.
			if (i === DEEP && t >= START) {
				ctx.strokeStyle = c.blue;
				ctx.lineWidth = 1.5;
				const seen = JEV_RUNS.slice(0, jrun + 1).map((r) => r[DEEP]);
				for (const v of seen) {
					const xv = bx0 + bw * v;
					ctx.beginPath();
					ctx.moveTo(xv, cy + BAR_H / 2 + 2);
					ctx.lineTo(xv, cy + BAR_H / 2 + 7);
					ctx.stroke();
				}
				if (seen.length > 1) {
					const lo = Math.min(...seen);
					const hi = Math.max(...seen);
					drawText(ctx, L.range(lo, hi), bx0 + (bw * (lo + hi)) / 2, cy + BAR_H / 2 + 17, c.blue, `600 10.5px ${FONT}`, "center");
				}
			}
		});

		drawText(ctx, L.captions[t < HAIKU_END ? 0 : 1], w / 2, HEIGHT - 12, c.text, `500 12px ${FONT}`, "center");
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function AnswerShapeDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

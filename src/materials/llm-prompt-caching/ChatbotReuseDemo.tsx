import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 슬랙 챗봇의 요청 세 개(질문 1, 3분 뒤 질문 2, 이어받기)에서 직전 요청과 같은 부분을 비교한다.
// 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const UNTIL = [2000, 4000, 5800, 8000, 11000];
const CYCLE = 11000;
const HEIGHT = 214;

const BAR_H = 22;
const ROW = [42, 100, 158]; // 질문 1, 질문 2, 이어받기 막대 윗변

// 구간 위치(가로 폭 대비 비율)
const SYS: [number, number] = [0, 0.24];
const VAR: [number, number] = [0.25, 0.58];
const ANS_START = 0.64; // 질문 1·2의 답 칸 시작
const ANS: [number, number] = [0.59, 0.82]; // 이어받기의 '지금까지 쓴 답'
const CONT: [number, number] = [0.83, 1];
const ANS1 = 3; // 질문 1의 답 칸 수
const ANS2 = 5; // 질문 2의 답 칸 수(여기서 끊긴다)

type Labels = {
	captions: string[];
	same: string;
	diff: string;
	rows: string[];
	sys: string;
	variable: string;
	answer: string;
	soFar: string;
	cont: string;
	cut: string;
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		captions: [
			"① 요청은 시스템 프롬프트와 질문 부분으로 나뉜다",
			"② 3분 뒤 질문 2: 시스템 프롬프트만 같다",
			"③ 답이 길면 중간에 끊긴다",
			"④ 이어받기는 직전 호출의 입력이 통째로 같다",
			"⑤ 캐시가 걸릴 수 있는 곳은 이 두 군데다",
		],
		same: "직전 요청과 같음",
		diff: "매번 다름",
		rows: ["질문 1", "질문 2 · 3분 뒤", "이어받기"],
		sys: "시스템 프롬프트",
		variable: "질문 + 사례 + 스레드",
		answer: "답",
		soFar: "지금까지 쓴 답",
		cont: "이어 써라",
		cut: "끊김",
		aria: "슬랙 챗봇의 요청 세 개를 위아래로 놓고 반복 재생하는 애니메이션. 요청은 시스템 프롬프트와 질문·지식 베이스 사례·스레드 맥락으로 이뤄진다. 3분 뒤 온 질문 2는 시스템 프롬프트만 질문 1과 같고 나머지는 매번 다르다. 질문 2의 답이 길어 끊기면 이어받기 요청이 가는데, 이 요청은 시스템 프롬프트와 질문 부분 전체가 직전 호출과 같고, 지금까지 쓴 답과 이어 쓰라는 지시만 새로 붙는다.",
	},
	en: {
		captions: [
			"① A request = system prompt + question part",
			"② 3 min later: only the system prompt matches",
			"③ A long answer gets cut off",
			"④ A continuation repeats the last input whole",
			"⑤ These are the two places a cache can hit",
		],
		same: "Same as the previous request",
		diff: "Different every time",
		rows: ["Question 1", "Question 2 · 3 min later", "Continuation"],
		sys: "System prompt",
		variable: "Question + context",
		answer: "Answer",
		soFar: "Answer so far",
		cont: "Continue",
		cut: "cut off",
		aria: "Looping animation of three Slack chatbot requests, one above the other. A request is a system prompt followed by the question, knowledge base cases, and thread context. Question 2, three minutes later, shares only the system prompt with question 1; the rest differs every time. When question 2's answer is long and gets cut off, a continuation request follows. Its system prompt and question part are identical to the previous call, and only the answer so far and an instruction to continue are new.",
	},
};
type Lang = keyof typeof LABELS;

type Fill = { fill: string; stroke: string };

// 막대 안에 들어가는 만큼만 글자를 줄여 쓰고, 9px로도 안 들어가면 생략한다.
function drawSegment(ctx: CanvasRenderingContext2D, c: Colors, x0: number, x1: number, y: number, style: Fill, label?: string) {
	ctx.beginPath();
	ctx.roundRect(x0, y, x1 - x0, BAR_H, 4);
	ctx.fillStyle = style.fill;
	ctx.fill();
	ctx.strokeStyle = style.stroke;
	ctx.lineWidth = 1;
	ctx.stroke();
	if (!label) return;
	for (const size of [10.5, 10, 9.5, 9]) {
		ctx.font = `500 ${size}px ${FONT}`;
		if (ctx.measureText(label).width <= x1 - x0 - 8) {
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = c.text;
			ctx.fillText(label, (x0 + x1) / 2, y + BAR_H / 2 + 0.5);
			return;
		}
	}
}

function drawCells(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, cellW: number, n: number) {
	for (let i = 0; i < n; i++) {
		ctx.beginPath();
		ctx.roundRect(x + i * (cellW + 2), y + 2, cellW, BAR_H - 4, 3);
		ctx.fillStyle = c.line;
		ctx.fill();
		ctx.strokeStyle = c.sub;
		ctx.lineWidth = 1;
		ctx.stroke();
	}
}

function drawArrow(ctx: CanvasRenderingContext2D, c: Colors, x0: number, x1: number, y: number) {
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(x0, y);
	ctx.lineTo(x1, y);
	ctx.moveTo(x1 - 4, y - 3);
	ctx.lineTo(x1, y);
	ctx.lineTo(x1 - 4, y + 3);
	ctx.stroke();
}

// 두 줄에서 같은 구간을 점선으로 잇는다. 아래 줄 제목을 가리지 않게 제목 위에서 멈춘다.
function drawLink(ctx: CanvasRenderingContext2D, c: Colors, x0: number, x1: number, yTop: number, yBottom: number) {
	ctx.save();
	ctx.strokeStyle = c.green;
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 3]);
	ctx.beginPath();
	ctx.moveTo(x0 + 2, yTop);
	ctx.lineTo(x0 + 2, yBottom);
	ctx.moveTo(x1 - 2, yTop);
	ctx.lineTo(x1 - 2, yBottom);
	ctx.stroke();
	ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D, c: Colors, text: string, x: number, y: number, color = c.text, weight = 600) {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `${weight} 11px ${FONT}`;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const fx = (f: number) => margin + (w - margin * 2) * f;
		const cellW = Math.min(18, (w - margin * 2) * 0.036);
		const step = UNTIL.findIndex((u) => t < u);
		const from = step === 0 ? 0 : UNTIL[step - 1];
		const p = clamp01((t - from) / (UNTIL[step] - from));

		const neutral: Fill = { fill: c.boxFill, stroke: c.boxStroke };
		const same: Fill = { fill: c.greenFill, stroke: c.green };
		const diff: Fill = { fill: c.blueFill, stroke: c.blue };

		// 범례
		ctx.fillStyle = c.greenFill;
		ctx.strokeStyle = c.green;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(fx(0), 7, 10, 10, 2);
		ctx.fill();
		ctx.stroke();
		drawTitle(ctx, c, L.same, fx(0) + 15, 12.5, c.sub, 500);
		ctx.font = `500 11px ${FONT}`;
		const dx = fx(0) + 15 + ctx.measureText(L.same).width + 16;
		ctx.fillStyle = c.blueFill;
		ctx.strokeStyle = c.blue;
		ctx.beginPath();
		ctx.roundRect(dx, 7, 10, 10, 2);
		ctx.fill();
		ctx.stroke();
		drawTitle(ctx, c, L.diff, dx + 15, 12.5, c.sub, 500);

		// 질문 1: ① 구간이 나타나고 짧은 답이 나온다
		drawTitle(ctx, c, L.rows[0], fx(0), ROW[0] - 9);
		drawTitle(ctx, c, L.answer, fx(ANS_START), ROW[0] - 9, c.sub, 500);
		drawSegment(ctx, c, fx(SYS[0]), fx(SYS[1]), ROW[0], neutral, L.sys);
		drawSegment(ctx, c, fx(VAR[0]), fx(VAR[1]), ROW[0], neutral, L.variable);
		drawArrow(ctx, c, fx(VAR[1]) + 4, fx(ANS_START) - 4, ROW[0] + BAR_H / 2);
		drawCells(ctx, c, fx(ANS_START), ROW[0], cellW, step === 0 ? Math.min(ANS1, Math.floor(p * (ANS1 + 1))) : ANS1);

		// 질문 2: ② 시스템 프롬프트만 같고 ③ 긴 답이 끊긴다
		ctx.save();
		ctx.globalAlpha = step < 1 ? 0.3 : step === 1 ? lerp(0.3, 1, clamp01(p / 0.25)) : 1;
		drawTitle(ctx, c, L.rows[1], fx(0), ROW[1] - 9);
		drawSegment(ctx, c, fx(SYS[0]), fx(SYS[1]), ROW[1], step >= 1 ? same : neutral, L.sys);
		drawSegment(ctx, c, fx(VAR[0]), fx(VAR[1]), ROW[1], step >= 1 ? diff : neutral, L.variable);
		drawArrow(ctx, c, fx(VAR[1]) + 4, fx(ANS_START) - 4, ROW[1] + BAR_H / 2);
		const ans2 = step < 2 ? 0 : step === 2 ? Math.min(ANS2, Math.floor(p * (ANS2 + 1))) : ANS2;
		// ④에서 끊긴 답이 이어받기 요청으로 내려가면 질문 2의 답은 흐려진다
		ctx.save();
		if (step >= 3) ctx.globalAlpha *= 0.45;
		drawCells(ctx, c, fx(ANS_START), ROW[1], cellW, ans2);
		ctx.restore();
		if (step >= 2 && (step > 2 || p > 0.75)) {
			ctx.font = `600 10.5px ${FONT}`;
			const half = (ctx.measureText(L.cut).width + 14) / 2;
			const ax = fx(ANS_START) + ANS2 * (cellW + 2) + 4 + half;
			drawBadge(ctx, Math.min(ax, w - margin - half), ROW[1] + BAR_H / 2, L.cut, c.redFill, c.red, 1);
		}
		ctx.restore();
		if (step >= 1) drawLink(ctx, c, fx(SYS[0]), fx(SYS[1]), ROW[0] + BAR_H + 2, ROW[1] - 18);

		// 이어받기: ④ 직전 호출의 입력 전체가 같고, 지금까지 쓴 답과 '이어 써라'만 새로 붙는다
		ctx.save();
		ctx.globalAlpha = step < 3 ? 0.3 : step === 3 ? lerp(0.3, 1, clamp01(p / 0.2)) : 1;
		drawTitle(ctx, c, L.rows[2], fx(0), ROW[2] - 9);
		drawSegment(ctx, c, fx(SYS[0]), fx(SYS[1]), ROW[2], step >= 3 ? same : neutral, L.sys);
		drawSegment(ctx, c, fx(VAR[0]), fx(VAR[1]), ROW[2], step >= 3 ? same : neutral, L.variable);
		const landed = step > 3 || (step === 3 && p >= 0.5);
		drawSegment(ctx, c, fx(ANS[0]), fx(ANS[1]), ROW[2], landed ? diff : neutral, landed ? L.soFar : undefined);
		drawSegment(ctx, c, fx(CONT[0]), fx(CONT[1]), ROW[2], landed ? diff : neutral, landed ? L.cont : undefined);
		ctx.restore();
		if (step >= 3) drawLink(ctx, c, fx(SYS[0]), fx(VAR[1]), ROW[1] + BAR_H + 2, ROW[2] - 18);

		// ④ 앞부분: 질문 2의 끊긴 답이 이어받기의 '지금까지 쓴 답' 자리로 내려간다
		if (step === 3 && !landed) {
			const k = ease(p / 0.5);
			const x = lerp(fx(ANS_START), fx(ANS[0]), k);
			const y = lerp(ROW[1], ROW[2], k);
			drawCells(ctx, c, x, y, cellW, ANS2);
		}

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 16);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function ChatbotReuseDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

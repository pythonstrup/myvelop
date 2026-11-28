import { type Colors, clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";
import type { Lang } from "./data";

// 요청 셋이 응답 캐시, 시맨틱 캐시, 모델을 차례로 지나며 어디서 답이 나오는지 보여준다.
// 저장된 질문은 「환불은 어떻게 하나요?」 등이고 문턱값 0.9는 가정이다. 유사도는 bge-m3로 잰 값이다. 질문은 한국어로 쟀고 영어는 번역이다.
const HOP = 1300; // 한 칸을 지나는 시간(ms)
const HOLD = 1700; // 답이 나온 뒤 멈춰 있는 시간(ms)
const STOPS = [0, 1, 2]; // 요청마다 답이 나오는 칸
const DURATIONS = STOPS.map((stop) => HOP * (stop + 1) + HOLD);
const CYCLE = DURATIONS.reduce((a, b) => a + b, 0);
const HEIGHT = 330;

const STAGE_Y = [
	{ y: 92, h: 36 },
	{ y: 152, h: 36 },
	{ y: 232, h: 54 },
];

const LABELS = {
	ko: {
		requests: [
			{ text: "환불은 어떻게 하나요?", notes: ["글자까지 같다"], caption: "① 글자까지 같은 요청은 응답 캐시에서 끝난다" },
			{ text: "환불하려면 어떻게 해야 하나요?", notes: ["놓침", "유사도 0.959"], caption: "② 글자가 달라도 가까우면 시맨틱 캐시에서 끝난다" },
			{ text: "매장에 주차할 수 있나요?", notes: ["놓침", "놓침 (0.552)", "앞부분 재사용"], caption: "③ 둘 다 놓치면 모델이 새로 답한다" },
		],
		stages: [
			{ name: "응답 캐시", exit: "저장된 답" },
			{ name: "시맨틱 캐시", exit: "가까운 질문의 답" },
			{ name: "모델", exit: "새로 만든 답" },
		],
		promptCaching: "프롬프트 캐싱",
		gateway: "게이트웨이",
		provider: "모델 제공자",
		aria: "요청 세 개가 응답 캐시, 시맨틱 캐시, 모델을 차례로 지나는 애니메이션. 응답 캐시와 시맨틱 캐시는 게이트웨이에 있고, 프롬프트 캐싱은 모델 제공자에 있다. 첫 요청은 저장된 질문과 글자까지 같아 응답 캐시에서 저장된 답을 받는다. 둘째 요청은 응답 캐시를 놓치고, 유사도 0.959로 시맨틱 캐시에 적중해 가까운 질문의 답을 받는다. 셋째 요청은 두 캐시를 모두 놓쳐 모델까지 가고, 모델은 프롬프트 캐시에 남아 있는 입력 앞부분의 계산을 다시 쓰며 새 답을 만든다.",
	},
	en: {
		requests: [
			{ text: "How do I get a refund?", notes: ["Exact same text"], caption: "① An exact match ends at the response cache" },
			{ text: "What do I need to do to get a refund?", notes: ["Miss", "Similarity 0.959"], caption: "② A close question ends at the semantic cache" },
			{ text: "Can I park at the store?", notes: ["Miss", "Miss (0.552)", "Prefix reused"], caption: "③ When both miss, the model answers anew" },
		],
		stages: [
			{ name: "Response cache", exit: "Stored answer" },
			{ name: "Semantic cache", exit: "Closest match" },
			{ name: "Model", exit: "New answer" },
		],
		promptCaching: "Prompt caching",
		gateway: "Gateway",
		provider: "Model provider",
		aria: "Animation of three requests passing through a response cache, a semantic cache, and the model in turn. The response cache and semantic cache sit in the gateway, and prompt caching sits at the model provider. The first request matches a stored question down to the last character, so it gets the stored answer from the response cache. The second request misses the response cache and hits the semantic cache at a similarity of 0.959, so it gets the answer of the closest question. The third request misses both caches and reaches the model, which reuses the computation for the input prefix still in the prompt cache while making a new answer. The questions were measured in Korean and are shown translated.",
	},
};
type Labels = (typeof LABELS)["ko"];

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "center") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(s, x, y);
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string, dashed = false) {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 8);
	ctx.fillStyle = fill;
	ctx.fill();
	if (dashed) ctx.setLineDash([4, 3]);
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.3;
	ctx.stroke();
	ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, c: Colors, x0: number, y0: number, x1: number, y1: number, on: boolean) {
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.strokeStyle = on ? c.blue : c.line;
	ctx.lineWidth = on ? 1.8 : 1.2;
	ctx.stroke();
}

const makeScene = (l: Labels) => (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	let local = t;
	let r = 0;
	while (r < STOPS.length - 1 && local >= DURATIONS[r]) {
		local -= DURATIONS[r];
		r++;
	}
	const req = { ...l.requests[r], stop: STOPS[r] };
	const STAGES = STAGE_Y.map((s, i) => ({ ...s, ...l.stages[i] }));
	const hop = Math.min(req.stop, Math.floor(local / HOP)); // 지금 지나는 칸
	const p = clamp01((local - hop * HOP) / HOP);
	const done = local >= HOP * (req.stop + 1) - HOP * 0.35;

	const W = Math.min(430, w - 12);
	const x0 = (w - W) / 2;
	const bw = W * 0.46;
	const ew = W * 0.37;
	const ex = x0 + W - ew;
	const cx = x0 + bw / 2;

	// 게이트웨이와 모델 제공자 구역
	box(ctx, x0, 62, bw, 138, "transparent", c.line, true);
	text(ctx, l.gateway, x0 + 10, 76, c.sub, `500 11px ${FONT}`, "left");
	box(ctx, x0, 206, bw, 88, "transparent", c.line, true);
	text(ctx, l.provider, x0 + 10, 219, c.sub, `500 11px ${FONT}`, "left");

	// 요청
	ctx.font = `600 12px ${FONT}`;
	const qw = Math.max(ctx.measureText(req.text).width + 24, bw);
	box(ctx, x0, 12, qw, 28, c.blueFill, c.blue);
	text(ctx, req.text, x0 + qw / 2, 26.5, c.text, `600 12px ${FONT}`);

	// 칸 사이의 선
	const tops = [40, STAGES[0].y + STAGES[0].h, STAGES[1].y + STAGES[1].h];
	STAGES.forEach((s, i) => line(ctx, c, cx, tops[i], cx, s.y, i <= req.stop && (i < hop || (i === hop && !done) || (i <= req.stop && done))));

	STAGES.forEach((s, i) => {
		const reached = i < hop || (i === hop && p > 0.5) || (done && i <= req.stop);
		const isStop = i === req.stop;
		const active = reached && isStop && done;
		const exitColor = i === 1 ? c.amber : c.green;
		const exitFill = i === 1 ? c.amberFill : c.greenFill;
		const mid = s.y + s.h / 2;
		line(ctx, c, x0 + bw - 8, mid, ex, mid, active);
		box(ctx, x0 + 8, s.y, bw - 16, s.h, active ? exitFill : c.boxFill, active ? exitColor : reached ? c.blue : c.boxStroke);
		const note = reached ? req.notes[i] : undefined;
		// 모델 칸은 프롬프트 캐싱이라는 이름을 늘 함께 적는다
		const lines = [s.name, ...(i === 2 ? [l.promptCaching] : []), ...(note ? [note] : [])];
		lines.forEach((l, k) => {
			const ly = mid + (k - (lines.length - 1) / 2) * 15 + 0.5;
			text(ctx, l, cx, ly, k === 0 ? c.text : l === note && isStop ? exitColor : c.sub, k === 0 ? `600 12px ${FONT}` : `500 10.5px ${FONT}`);
		});
		box(ctx, ex, mid - 18, ew, 36, active ? exitFill : c.boxFill, active ? exitColor : c.boxStroke);
		text(ctx, s.exit, ex + ew / 2, mid + 0.5, active ? c.text : c.sub, `${active ? 600 : 400} 11.5px ${FONT}`);
	});
	// 움직이는 점
	if (!done) {
		const from = tops[hop];
		const to = STAGES[hop].y;
		ctx.beginPath();
		ctx.arc(cx, lerp(from, to, ease(clamp01(p / 0.5))), 5, 0, Math.PI * 2);
		ctx.fillStyle = c.blue;
		ctx.fill();
	}

	text(ctx, req.caption, w / 2, HEIGHT - 12, c.text, `500 12px ${FONT}`);
};

const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function CachePathDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

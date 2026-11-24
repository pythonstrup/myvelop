import { type Colors, clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 요청 셋이 응답 캐시, 시맨틱 캐시, 모델을 차례로 지나며 어디서 답이 나오는지 보여준다.
// 저장된 질문은 「환불은 어떻게 하나요?」 등이고 문턱값 0.9는 가정이다. 유사도는 bge-m3로 잰 값이다.
const HOP = 1300; // 한 칸을 지나는 시간(ms)
const HOLD = 1700; // 답이 나온 뒤 멈춰 있는 시간(ms)
const REQUESTS = [
	{ text: "환불은 어떻게 하나요?", stop: 0, notes: ["글자까지 같다"], caption: "① 글자까지 같은 요청은 응답 캐시에서 끝난다" },
	{ text: "환불하려면 어떻게 해야 하나요?", stop: 1, notes: ["놓침", "유사도 0.959"], caption: "② 글자가 달라도 가까우면 시맨틱 캐시에서 끝난다" },
	{ text: "매장에 주차할 수 있나요?", stop: 2, notes: ["놓침", "놓침 (0.552)", "앞부분 재사용"], caption: "③ 둘 다 놓치면 모델이 새로 답한다" },
];
const DURATIONS = REQUESTS.map((r) => HOP * (r.stop + 1) + HOLD);
const CYCLE = DURATIONS.reduce((a, b) => a + b, 0);
const HEIGHT = 330;

const STAGES = [
	{ y: 92, h: 36, name: "응답 캐시", exit: "저장된 답" },
	{ y: 152, h: 36, name: "시맨틱 캐시", exit: "가까운 질문의 답" },
	{ y: 232, h: 54, name: "모델", exit: "새로 만든 답" },
];

const ARIA =
	"요청 세 개가 응답 캐시, 시맨틱 캐시, 모델을 차례로 지나는 애니메이션. 응답 캐시와 시맨틱 캐시는 게이트웨이에 있고, 프롬프트 캐싱은 모델 제공자에 있다. 첫 요청은 저장된 질문과 글자까지 같아 응답 캐시에서 저장된 답을 받는다. 둘째 요청은 응답 캐시를 놓치고, 유사도 0.959로 시맨틱 캐시에 적중해 가까운 질문의 답을 받는다. 셋째 요청은 두 캐시를 모두 놓쳐 모델까지 가고, 모델은 프롬프트 캐시에 남아 있는 입력 앞부분의 계산을 다시 쓰며 새 답을 만든다.";

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

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	let local = t;
	let r = 0;
	while (r < REQUESTS.length - 1 && local >= DURATIONS[r]) {
		local -= DURATIONS[r];
		r++;
	}
	const req = REQUESTS[r];
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
	text(ctx, "게이트웨이", x0 + 10, 76, c.sub, `500 11px ${FONT}`, "left");
	box(ctx, x0, 206, bw, 88, "transparent", c.line, true);
	text(ctx, "모델 제공자", x0 + 10, 219, c.sub, `500 11px ${FONT}`, "left");

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
		const lines = [s.name, ...(i === 2 ? ["프롬프트 캐싱"] : []), ...(note ? [note] : [])];
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
}

export default function CachePathDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={ARIA} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";
import type { Lang } from "./lang";

// 대조 학습 한 단계를 반복 재생한다. 정답은 질문 쪽으로 당기고, 오답은 그 오답을 고를 확률에 비례해 밀어낸다.
// 힘은 글의 예시(점수 0.80·0.60·0.50, τ = 0.05)로 계산했다. 정답 (1 − P⁺)/τ ≈ 0.408,
// 오답 P⁻/τ ≈ 0.359 · 0.0486(약 7.4배 차이), 점심 메뉴는 고를 확률이 거의 0이다. 좌표는 설명용으로 정한 값이다.
const UNTIL = [2600, 5200, 8200, 10400, 13200];
const CYCLE = 13200;
const HEIGHT = 360;
const TOP = 8;
const BOTTOM = HEIGHT - 44;
const PAD = 16;
const MOVE = 0.28; // 힘 1이 한 단계에 옮기는 거리(그림 짧은 변 대비)
const ARROW = 0.32; // 힘 1의 화살표 길이(그림 짧은 변 대비)
const EXTRA = 0.8; // ⑤ 에서 더 되풀이하는 만큼

const LABELS = {
	ko: {
		captions: [
			"① 학습 데이터 한 건: 질문, 정답, 오답",
			"② 정답은 질문 쪽으로 당긴다",
			"③ 오답은 밀어내되, 헷갈리는 오답일수록 세게 민다",
			"④ 이미 먼 오답은 거의 움직이지 않는다",
			"⑤ 되풀이하면 정답이 질문 가장 가까이에 남는다",
		],
		query: ["질문", "부가세 언제까지 내야 해?"],
		points: [
			["정답", "부가가치세 확정신고 조문"],
			["헷갈리는 오답", "종합소득세 확정신고 조문"],
			["덜 헷갈리는 오답", "부가가치세 면세 조문"],
			["이미 먼 오답", "점심 메뉴 추천"],
		],
		legend: "P: 그 오답을 고를 확률",
		aria: "대조 학습 한 단계를 반복 재생하는 애니메이션. 가운데에 질문 '부가세 언제까지 내야 해?'가 있고, 정답은 부가가치세 확정신고 조문, 오답은 종합소득세 확정신고 조문, 부가가치세 면세 조문, 점심 메뉴 추천이다. 정답은 질문 쪽으로 당겨진다. 오답은 그 오답을 고를 확률만큼 밀려나서, 고를 확률이 약 0.018인 종합소득세 조문이 약 0.0024인 면세 조문보다 약 7.4배 세게 밀린다. 고를 확률이 거의 0인 점심 메뉴 추천은 거의 움직이지 않는다. 되풀이하면 정답이 질문 가장 가까이에 남는다.",
	},
	en: {
		captions: [
			"① One example: question, answer, wrong answers",
			"② Pull the answer toward the question",
			"③ Push wrong ones away, harder if confusing",
			"④ An already-distant wrong answer barely moves",
			"⑤ Repeat, and the answer ends up closest",
		],
		query: ["Question", "When is VAT due?"],
		points: [
			["Answer", "VAT final return article"],
			["Confusing wrong answer", "Income tax final return article"],
			["Less confusing", "VAT exemption article"],
			["Already far", "Lunch menu ideas"],
		],
		legend: "P: chance of picking that wrong answer",
		aria: "Looping animation of one contrastive learning step. The question 'When is VAT due?' sits in the middle. The answer is the VAT final return article; the wrong answers are the income tax final return article, the VAT exemption article, and lunch menu ideas. The answer is pulled toward the question. Each wrong answer is pushed away in proportion to its chance of being picked, so the income tax article at about 0.018 is pushed about 7.4 times harder than the exemption article at about 0.0024. Lunch menu ideas, with a chance of almost 0, barely move. Repeated, the answer ends up closest to the question.",
	},
} as const satisfies Record<Lang, unknown>;

const QUERY = { x: 0.5, y: 0.5 };
// 순서는 LABELS.points 와 같다. force 가 음수면 질문 쪽으로 당긴다.
const POINTS = [
	{ x: 0.66, y: 0.3, force: -0.408, above: true, prob: "" },
	{ x: 0.26, y: 0.4, force: 0.359, above: true, prob: "P ≈ 0.018" },
	{ x: 0.7, y: 0.74, force: 0.0486, above: false, prob: "P ≈ 0.0024" },
	{ x: 0.12, y: 0.86, force: 0, above: true, prob: "P ≈ 0" },
] as const;

const fade = (t: number, at: number, dur = 400) => clamp01((t - at) / dur);

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number) {
	const half = ctx.measureText(text).width / 2;
	ctx.fillText(text, Math.min(Math.max(x, half + 10), w - half - 10), y);
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, color: string, lw: number) {
	const len = Math.hypot(dx, dy);
	if (len < 1) return;
	const ux = dx / len;
	const uy = dy / len;
	const head = Math.min(8, 4 + lw);
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = lw;
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + dx - ux * head * 0.6, y + dy - uy * head * 0.6);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x + dx, y + dy);
	ctx.lineTo(x + dx - ux * head - uy * head * 0.6, y + dy - uy * head + ux * head * 0.6);
	ctx.lineTo(x + dx - ux * head + uy * head * 0.6, y + dy - uy * head - ux * head * 0.6);
	ctx.closePath();
	ctx.fill();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const step = UNTIL.findIndex((u) => t < u);
		const small = w < 480;
		const at = (p: { x: number; y: number }) => ({
			x: PAD + p.x * (w - PAD * 2),
			y: TOP + p.y * (BOTTOM - TOP),
		});
		const S = Math.min(w - PAD * 2, BOTTOM - TOP);
		const q = at(QUERY);
		const more = ease(fade(t, 10600, 2000)) * EXTRA;
		const pulled = ease(fade(t, 3000, 1600)) + more;
		const pushed = ease(fade(t, 5600, 1800)) + more;
		const colors = [c.green, c.red, c.red, c.sub];

		const pts = POINTS.map((p, i) => {
			const start = at(p);
			const dist = Math.hypot(start.x - q.x, start.y - q.y);
			const ux = (start.x - q.x) / dist;
			const uy = (start.y - q.y) / dist;
			const moved = p.force * MOVE * S * (i === 0 ? pulled : pushed);
			return { ...p, x: start.x + ux * moved, y: start.y + uy * moved, ux, uy };
		});

		// 질문과 각 점을 잇는 옅은 거리선
		ctx.save();
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.setLineDash([3, 4]);
		pts.forEach((p, i) => {
			ctx.globalAlpha = fade(t, 300 + i * 300);
			ctx.beginPath();
			ctx.moveTo(q.x, q.y);
			ctx.lineTo(p.x, p.y);
			ctx.stroke();
		});
		ctx.restore();

		// 힘 화살표: ② 정답, ③ 헷갈리는 오답 둘. ⑤ 에서는 흐려진다.
		const arrowOut = 1 - fade(t, 10400, 600);
		pts.forEach((p, i) => {
			if (p.force === 0) return;
			const a = (i === 0 ? fade(t, 2700) : fade(t, 5300)) * arrowOut;
			if (a <= 0) return;
			const r = 9;
			// 당기는 화살표는 질문 점을 덮지 않게 남은 거리 안에서 멈춘다
			const room = Math.hypot(p.x - q.x, p.y - q.y) - r - 12;
			const len = p.force < 0 ? -Math.min(-p.force * ARROW * S, room) : p.force * ARROW * S;
			ctx.save();
			ctx.globalAlpha = a;
			drawArrow(ctx, p.x + p.ux * (len > 0 ? r : -r), p.y + p.uy * (len > 0 ? r : -r), p.ux * len, p.uy * len, colors[i], 1.2 + Math.abs(p.force) * 6);
			ctx.restore();
		});

		// 점과 두 줄 이름(역할 / 문서)
		const nameFont = `500 ${small ? 11 : 12}px ${FONT}`;
		const roleFont = `600 ${small ? 11 : 12}px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		pts.forEach((p, i) => {
			const a = fade(t, 300 + i * 300);
			if (a <= 0) return;
			ctx.save();
			ctx.globalAlpha = a;
			ctx.beginPath();
			ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
			ctx.fillStyle = colors[i];
			ctx.fill();
			const [role, name] = L.points[i];
			const y1 = p.above ? p.y - 30 : p.y + 18;
			ctx.font = roleFont;
			ctx.fillStyle = colors[i];
			drawLabel(ctx, role, p.x, y1, w);
			ctx.font = nameFont;
			ctx.fillStyle = c.text;
			drawLabel(ctx, name, p.x, y1 + 14, w);
			ctx.restore();
		});

		// ④ 이미 먼 오답 표시, ⑤ 정답 고리
		const farRing = step === 3 ? fade(t, 8200) : 0;
		const winRing = step === 4 ? fade(t, 11200) : 0;
		for (const [i, a, color] of [
			[3, farRing, c.sub],
			[0, winRing, c.green],
		] as const) {
			if (a <= 0) continue;
			ctx.save();
			ctx.globalAlpha = a;
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			if (i === 3) ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.arc(pts[i].x, pts[i].y, 12, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}

		// 질문 점
		ctx.save();
		ctx.beginPath();
		ctx.arc(q.x, q.y, 7, 0, Math.PI * 2);
		ctx.fillStyle = c.amber;
		ctx.fill();
		ctx.strokeStyle = c.amberFill;
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.font = roleFont;
		ctx.fillStyle = c.amber;
		drawLabel(ctx, L.query[0], q.x, q.y + 20, w);
		ctx.font = nameFont;
		ctx.fillStyle = c.text;
		drawLabel(ctx, L.query[1], q.x, q.y + 34, w);
		ctx.restore();

		// 고를 확률 배지: ③ 에서 헷갈리는 오답 둘, ④ 에서 이미 먼 오답
		const badgeOut = 1 - fade(t, 10400, 600);
		const badges = [
			[1, fade(t, 5400), 0, 22],
			[2, fade(t, 5400), 52, 0],
			[3, fade(t, 8300), 52, 0],
		] as const;
		for (const [i, a, ox, oy] of badges) {
			const alpha = a * badgeOut;
			if (alpha <= 0) continue;
			drawBadge(ctx, pts[i].x + ox, pts[i].y + oy, POINTS[i].prob, i === 3 ? c.boxFill : c.redFill, i === 3 ? c.sub : c.red, alpha);
		}
		if (step === 2 || step === 3) {
			ctx.save();
			ctx.globalAlpha = fade(t, 5400) * badgeOut;
			ctx.font = `400 10.5px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.fillText(L.legend, 14, 16);
			ctx.restore();
		}

		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function ContrastiveDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas
				ref={canvasRef}
				role="img"
				aria-label={LABELS[lang].aria}
				style={{ display: "block", width: "100%" }}
			/>
		</div>
	);
}

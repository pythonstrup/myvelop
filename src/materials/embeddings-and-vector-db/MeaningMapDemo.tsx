import { clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";
import type { Lang } from "./lang";

// 조문이 뜻에 따라 평면에 찍혀 있고, 질문이 같은 모델로 점이 되어 들어와 가까운 점부터 고르는 과정을 반복 재생한다.
// 2차원 좌표는 설명을 위해 정한 값이다. 실제 임베딩은 1024차원이다.
const UNTIL = [2600, 4800, 7800, 11000];
const CYCLE = 11000;
const HEIGHT = 340;
const TOP = 8;
const BOTTOM = HEIGHT - 44;
const PAD = 16;

const LABELS = {
	ko: {
		captions: [
			"① 문서를 뜻에 따라 점으로 찍어 둔다",
			"② 질문도 같은 모델로 점이 된다",
			"③ 가까운 점부터 고른다",
			"④ 겹치는 낱말이 없어도 뜻이 가까우면 옆에 있다",
		],
		query: "부가세 언제까지 내야 해?",
		docs: ["부가가치세 확정신고 조문", "부가가치세 면세 조문", "종합소득세 확정신고 조문", "점심 메뉴 추천"],
		first: "1위",
		note: "설명용 2차원 그림 · 실제는 1024차원",
		aria: "임베딩으로 검색하는 과정을 반복 재생하는 애니메이션. 평면에 부가가치세 확정신고 조문, 부가가치세 면세 조문, 종합소득세 확정신고 조문, 점심 메뉴 추천과 이름 없는 문서 다섯 개가 뜻에 따라 점으로 찍혀 있다. 질문 '부가세 언제까지 내야 해?'가 같은 모델로 점이 되어 들어오면 가까운 점부터 선을 긋고, 가장 가까운 부가가치세 확정신고 조문이 1위로 표시된다. 점심 메뉴 추천은 멀리 떨어진 구석에 있다. 설명을 위한 2차원 그림이며 실제 임베딩은 1024차원이다.",
	},
	en: {
		captions: [
			"① Each document is placed by its meaning",
			"② The question becomes a point with the same model",
			"③ Pick the nearest points first",
			"④ Close in meaning, even with no shared words",
		],
		query: "When is VAT due?",
		docs: ["VAT final return article", "VAT exemption article", "Income tax final return article", "Lunch menu ideas"],
		first: "#1",
		note: "2-D sketch · real models use 1,024 dims",
		aria: "Looping animation of embedding search. Documents are placed on a plane by meaning: a VAT final return article, a VAT exemption article, an income tax final return article, lunch menu ideas, and five unnamed documents. The question 'When is VAT due?' becomes a point with the same model, lines are drawn to the nearest points first, and the VAT final return article is marked as the closest. Lunch menu ideas sit far away in a corner. This is a 2-D sketch; real embeddings have 1,024 dimensions.",
	},
} as const satisfies Record<Lang, unknown>;

// 이름 붙은 조문 넷과 이름 없는 문서 다섯. label 은 LABELS.docs 의 번호, above 는 이름을 점 위에 쓸지다.
// 질문과 가장 가까운 점은 어느 화면 폭에서도 0번(부가가치세 확정신고 조문)이 되도록 놓았다.
const DOCS: readonly { x: number; y: number; label?: number; above?: boolean }[] = [
	{ x: 0.66, y: 0.4, label: 0, above: true },
	{ x: 0.74, y: 0.7, label: 1, above: false },
	{ x: 0.3, y: 0.22, label: 2, above: true },
	{ x: 0.12, y: 0.86, label: 3, above: true },
	{ x: 0.92, y: 0.18 },
	{ x: 0.48, y: 0.84 },
	{ x: 0.18, y: 0.56 },
	{ x: 0.88, y: 0.88 },
	{ x: 0.08, y: 0.3 },
];
const QUERY = { x: 0.58, y: 0.5 };

const fade = (t: number, at: number, dur = 400) => clamp01((t - at) / dur);

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number) {
	const half = ctx.measureText(text).width / 2;
	ctx.fillText(text, Math.min(Math.max(x, half + 10), w - half - 10), y);
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const step = UNTIL.findIndex((u) => t < u);
		const at = (p: { x: number; y: number }) => ({
			x: PAD + p.x * (w - PAD * 2),
			y: TOP + p.y * (BOTTOM - TOP),
		});
		const labelFont = `500 ${w < 480 ? 11 : 12}px ${FONT}`;
		const docs = DOCS.map((d) => ({ ...d, ...at(d) }));
		const q = at(QUERY);
		const nearest = docs
			.map((d, i) => ({ i, dist: Math.hypot(d.x - q.x, d.y - q.y) }))
			.sort((a, b) => a.dist - b.dist)
			.slice(0, 3);
		const winner = nearest[0].i;

		// 평면과 안내 글씨
		ctx.beginPath();
		ctx.roundRect(6, 2, w - 12, BOTTOM + 6, 10);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.font = `400 10.5px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		ctx.fillText(L.note, w - 16, 16);

		// ③ 가까운 점부터 선을 긋는다. ④ 에서는 1위 말고는 흐리게 둔다.
		const qIn = ease(fade(t, 2600, 900));
		const qy = lerp(TOP, q.y, qIn);
		nearest.forEach(({ i }, k) => {
			const grow = ease(fade(t, 5000 + k * 800, 500));
			if (grow <= 0) return;
			const d = docs[i];
			ctx.save();
			ctx.globalAlpha = step === 3 && k > 0 ? 0.3 : 0.9;
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = k === 0 ? 2.2 : 1.4;
			ctx.setLineDash(k === 0 ? [] : [4, 3]);
			ctx.beginPath();
			ctx.moveTo(q.x, qy);
			ctx.lineTo(lerp(q.x, d.x, grow), lerp(qy, d.y, grow));
			ctx.stroke();
			ctx.restore();
		});

		// ① 문서 점과 이름
		docs.forEach((d, i) => {
			const a = fade(t, 200 + i * 220);
			if (a <= 0) return;
			const named = d.label !== undefined;
			const won = step === 3 && i === winner;
			ctx.save();
			ctx.globalAlpha = a;
			ctx.beginPath();
			ctx.arc(d.x, d.y, named ? 5.5 : 4, 0, Math.PI * 2);
			ctx.fillStyle = won ? c.green : named ? c.blue : c.sub;
			if (!named) ctx.globalAlpha = a * 0.55;
			ctx.fill();
			if (won) {
				ctx.globalAlpha = fade(t, 7800);
				ctx.beginPath();
				ctx.arc(d.x, d.y, 11, 0, Math.PI * 2);
				ctx.strokeStyle = c.green;
				ctx.lineWidth = 2;
				ctx.stroke();
			}
			if (named && d.label !== undefined) {
				ctx.globalAlpha = a;
				ctx.font = labelFont;
				ctx.fillStyle = won ? c.green : c.text;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				drawLabel(ctx, L.docs[d.label], d.x, d.above ? d.y - 14 : d.y + 16, w);
			}
			ctx.restore();
		});

		// ② 질문 점이 위에서 내려와 자리를 잡는다
		if (qIn > 0) {
			ctx.save();
			ctx.globalAlpha = Math.min(1, qIn * 2);
			ctx.beginPath();
			ctx.arc(q.x, qy, 7, 0, Math.PI * 2);
			ctx.fillStyle = c.amber;
			ctx.fill();
			ctx.strokeStyle = c.amberFill;
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.globalAlpha = fade(t, 3300);
			ctx.font = `600 ${w < 480 ? 11 : 12}px ${FONT}`;
			ctx.fillStyle = c.amber;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			drawLabel(ctx, L.query, q.x, qy + 18, w);
			ctx.restore();
		}

		// ④ 1위 배지
		if (step === 3) {
			const d = docs[winner];
			drawBadge(ctx, d.x + 28, d.y, L.first, c.greenFill, c.green, fade(t, 8000));
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

export default function MeaningMapDemo({ lang = "ko" }: { lang?: Lang }) {
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

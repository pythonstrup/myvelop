import { clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";
import type { Lang } from "./lang";

// HNSW 탐색을 반복 재생한다. 2층 진입점에서 탐욕 탐색으로 한 층씩 내려오고,
// 0층에서는 후보 ef개를 함께 들고 찾은 뒤 그중 가장 가까운 k개를 돌려준다.
// 점 좌표와 1·2층 연결은 설명용 고정값이다. 거리는 가로를 1, 세로를 AY배로 줄인 평면에서 잰다.
const UNTIL = [1800, 3600, 5000, 7600, 10200, 13000];
const CYCLE = 13000;
const HEIGHT = 340;
const AY = 0.4;
const EF = 6;
const K = 3;
const PAD_X = 16;

type Pt = { x: number; y: number };
type Stop = readonly [layer: number, id: string];

const Q: Pt = { x: 0.62, y: 0.55 };
const PTS: Record<string, Pt> = {
	A: { x: 0.1, y: 0.35 },
	B: { x: 0.5, y: 0.6 },
	C: { x: 0.9, y: 0.25 },
	D: { x: 0.25, y: 0.78 },
	E: { x: 0.32, y: 0.18 },
	F: { x: 0.75, y: 0.2 },
	G: { x: 0.66, y: 0.7 },
	I: { x: 0.6, y: 0.42 },
	J: { x: 0.85, y: 0.75 },
	K: { x: 0.64, y: 0.58 },
	L: { x: 0.55, y: 0.5 },
	M: { x: 0.69, y: 0.47 },
	N: { x: 0.58, y: 0.66 },
	O: { x: 0.71, y: 0.63 },
	a1: { x: 0.04, y: 0.72 },
	a2: { x: 0.15, y: 0.12 },
	a3: { x: 0.2, y: 0.55 },
	a4: { x: 0.38, y: 0.88 },
	a5: { x: 0.44, y: 0.38 },
	a6: { x: 0.33, y: 0.6 },
	a7: { x: 0.47, y: 0.1 },
	a8: { x: 0.8, y: 0.88 },
	a9: { x: 0.94, y: 0.55 },
	a10: { x: 0.86, y: 0.08 },
	a11: { x: 0.97, y: 0.9 },
	a12: { x: 0.7, y: 0.12 },
	a13: { x: 0.25, y: 0.32 },
	a14: { x: 0.12, y: 0.9 },
};
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, (a.y - b.y) * AY);

const L2 = ["A", "B", "C"];
const L1 = ["A", "B", "C", "D", "E", "F", "G", "I", "J"];
const L0 = Object.keys(PTS);
const E2: [string, string][] = [
	["A", "B"],
	["B", "C"],
];
const E1: [string, string][] = [
	["A", "D"],
	["A", "E"],
	["D", "B"],
	["E", "B"],
	["E", "F"],
	["B", "G"],
	["G", "I"],
	["G", "J"],
	["I", "F"],
	["F", "C"],
	["C", "J"],
];
// 0층은 점마다 가장 가까운 이웃 셋과 잇는다.
const E0: [string, string][] = (() => {
	const seen = new Set<string>();
	for (const a of L0) {
		const near = L0.filter((b) => b !== a)
			.sort((b1, b2) => dist(PTS[a], PTS[b1]) - dist(PTS[a], PTS[b2]))
			.slice(0, 3);
		for (const b of near) seen.add([a, b].sort().join("|"));
	}
	return [...seen].map((s) => s.split("|") as [string, string]);
})();
const LAYERS = [
	{ ids: L0, edges: E0 },
	{ ids: L1, edges: E1 },
	{ ids: L2, edges: E2 },
];
const CANDS = [...L0].sort((a, b) => dist(PTS[a], Q) - dist(PTS[b], Q)).slice(0, EF);
const TOP = new Set(CANDS.slice(0, K));

// 탐욕 탐색 경로: 2층 A → B, 한 층 내려가 1층 B → G → I, 다시 내려가 0층 I.
const SEGS: { from: Stop; to: Stop; t0: number; t1: number }[] = [
	{ from: [2, "A"], to: [2, "B"], t0: 1800, t1: 2800 },
	{ from: [2, "B"], to: [1, "B"], t0: 3600, t1: 4600 },
	{ from: [1, "B"], to: [1, "G"], t0: 5000, t1: 6000 },
	{ from: [1, "G"], to: [1, "I"], t0: 6200, t1: 7200 },
	{ from: [1, "I"], to: [0, "I"], t0: 7600, t1: 8400 },
];
// 더 가까운 이웃이 없음을 확인하는 순간: 그 점의 이웃을 깜빡인다.
const CHECKS: { layer: number; ids: string[]; t0: number; t1: number }[] = [
	{ layer: 2, ids: ["A", "C"], t0: 2800, t1: 3600 },
	{ layer: 1, ids: ["G", "F"], t0: 7200, t1: 7600 },
];
const CAND_AT = 8400;
const CAND_GAP = 250;

// 층은 위에서부터 2·1·0층 순서로 쌓는다.
const BANDS = [
	{ top: 176, h: 122 },
	{ top: 86, h: 78 },
	{ top: 10, h: 64 },
];

const LABELS = {
	ko: {
		captions: [
			"① 맨 위 층의 진입점에서 출발한다",
			"② 질문에 더 가까운 이웃으로 옮겨 간다",
			"③ 더 가까운 이웃이 없으면 한 층 내려간다",
			"④ 1층에서도 같은 탐색을 되풀이한다",
			"⑤ 0층에서는 후보 ef개를 함께 들고 찾는다",
			"⑥ 그중 가장 가까운 k개를 돌려준다",
		],
		layers: ["0층", "1층", "2층"],
		allPoints: "모든 점",
		query: "질문",
		entry: "진입점",
		aria: "HNSW 탐색을 반복 재생하는 애니메이션. 층 세 개 가운데 점이 가장 적은 2층의 진입점에서 출발해, 질문에 더 가까운 이웃으로 옮겨 가다가 더 가까운 이웃이 없으면 한 층 내려간다. 1층에서도 같은 탐색을 되풀이하고, 모든 점이 있는 0층에서는 후보 여섯 개를 함께 들고 찾은 뒤 그중 가장 가까운 세 개를 돌려준다.",
	},
	en: {
		captions: [
			"① Start at the entry point on the top layer",
			"② Move to a neighbor closer to the query",
			"③ No closer neighbor: go down one layer",
			"④ Repeat the same search on layer 1",
			"⑤ On layer 0, keep ef candidates at once",
			"⑥ Return the k nearest of them",
		],
		layers: ["layer 0", "layer 1", "layer 2"],
		allPoints: "all points",
		query: "query",
		entry: "entry",
		aria: "Looping animation of an HNSW search. It starts at the entry point on layer 2, the layer with the fewest points, and keeps moving to a neighbor closer to the query; when no neighbor is closer, it goes down one layer. The same search repeats on layer 1. On layer 0, which holds every point, it keeps six candidates at once and returns the three nearest.",
	},
} as const;

function drawCaption(ctx: CanvasRenderingContext2D, text: string, w: number, y: number, color: string) {
	let size = 12;
	ctx.font = `500 ${size}px ${FONT}`;
	while (size > 10 && ctx.measureText(text).width > w - 16) {
		size -= 0.5;
		ctx.font = `500 ${size}px ${FONT}`;
	}
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = color;
	ctx.fillText(text, w / 2, y);
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const step = UNTIL.findIndex((u) => t < u);
		const place = (layer: number, p: Pt) => {
			const b = BANDS[layer];
			return { x: PAD_X + p.x * (w - 2 * PAD_X), y: b.top + 18 + p.y * (b.h - 28) };
		};
		const at = ([layer, id]: Stop) => place(layer, PTS[id]);

		// 층 띠와 이름
		BANDS.forEach((b, layer) => {
			ctx.beginPath();
			ctx.roundRect(PAD_X - 8, b.top, w - 2 * PAD_X + 16, b.h, 8);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = c.boxStroke;
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.font = `600 11px ${FONT}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillStyle = c.sub;
			const name = layer === 0 ? `${L.layers[0]} · ${L.allPoints}` : L.layers[layer];
			ctx.fillText(name, PAD_X - 2, b.top + 10);
		});

		// 같은 점을 위아래 층에서 잇는 점선
		ctx.save();
		ctx.setLineDash([2, 3]);
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		for (const [upper, ids] of [
			[1, L1],
			[2, L2],
		] as const) {
			for (const id of ids) {
				const a = at([upper, id]);
				const b = at([upper - 1, id]);
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.stroke();
			}
		}
		ctx.restore();

		// 층마다 이웃 연결과 점
		const candShown = (i: number) => clamp01((t - CAND_AT - i * CAND_GAP) / 200);
		LAYERS.forEach(({ ids, edges }, layer) => {
			for (const [a, b] of edges) {
				const pa = at([layer, a]);
				const pb = at([layer, b]);
				const ia = CANDS.indexOf(a);
				const ib = CANDS.indexOf(b);
				const lit = layer === 0 && ia >= 0 && ib >= 0 ? Math.min(candShown(ia), candShown(ib)) : 0;
				ctx.beginPath();
				ctx.moveTo(pa.x, pa.y);
				ctx.lineTo(pb.x, pb.y);
				ctx.strokeStyle = lit > 0 ? c.blue : c.line;
				ctx.globalAlpha = lit > 0 ? 0.4 + 0.6 * lit : 1;
				ctx.lineWidth = lit > 0 ? 1.5 : 1;
				ctx.stroke();
				ctx.globalAlpha = 1;
			}
			for (const id of ids) {
				const p = at([layer, id]);
				ctx.beginPath();
				ctx.arc(p.x, p.y, layer === 0 ? 3 : 3.5, 0, Math.PI * 2);
				ctx.fillStyle = c.sub;
				ctx.fill();
			}
			// 질문 점은 모든 층에서 같은 자리에 있다.
			const q = place(layer, Q);
			ctx.save();
			ctx.translate(q.x, q.y);
			ctx.rotate(Math.PI / 4);
			ctx.fillStyle = c.amber;
			ctx.fillRect(-4.5, -4.5, 9, 9);
			ctx.restore();
			if (layer === 2) {
				ctx.font = `600 10.5px ${FONT}`;
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ctx.fillStyle = c.amber;
				ctx.fillText(L.query, q.x + 9, q.y + 1);
			}
		});

		// 진입점 표시
		const entry = at([2, "A"]);
		drawBadge(ctx, entry.x + 4, entry.y - 15, L.entry, c.blueFill, c.blue, step === 0 ? 1 : 0.45);

		// 이웃 확인: 더 가까운 이웃이 없다
		for (const ck of CHECKS) {
			if (t < ck.t0 || t >= ck.t1) continue;
			const a = Math.sin(((t - ck.t0) / (ck.t1 - ck.t0)) * Math.PI);
			ctx.save();
			ctx.globalAlpha = a;
			ctx.setLineDash([3, 2]);
			ctx.strokeStyle = c.red;
			ctx.lineWidth = 1.5;
			for (const id of ck.ids) {
				const p = at([ck.layer, id]);
				ctx.beginPath();
				ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.restore();
		}

		// 지나온 길과 현재 위치
		let pos = entry;
		for (const s of SEGS) {
			if (t < s.t0) break;
			const p = ease(clamp01((t - s.t0) / (s.t1 - s.t0)));
			const a = at(s.from);
			const b = at(s.to);
			pos = { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) };
			ctx.save();
			ctx.setLineDash(s.from[0] === s.to[0] ? [] : [4, 3]);
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(pos.x, pos.y);
			ctx.stroke();
			ctx.restore();
		}

		// 0층 후보 ef개, 마지막에 가까운 k개
		const done = step === 5;
		CANDS.forEach((id, i) => {
			const a = candShown(i);
			if (a <= 0) return;
			const p = at([0, id]);
			const top = TOP.has(id);
			ctx.save();
			ctx.globalAlpha = done && !top ? 0.35 : a;
			ctx.beginPath();
			ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
			if (done && top) {
				ctx.fillStyle = c.greenFill;
				ctx.fill();
			}
			ctx.strokeStyle = done ? (top ? c.green : c.sub) : c.blue;
			ctx.lineWidth = 1.8;
			ctx.stroke();
			ctx.restore();
		});
		if (!done) {
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, 5.5, 0, Math.PI * 2);
			ctx.fillStyle = c.blue;
			ctx.fill();
			ctx.strokeStyle = dark ? "#212529" : "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}

		const b0 = BANDS[0];
		if (step === 4) drawBadge(ctx, w - PAD_X - 24, b0.top + 11, `ef = ${EF}`, c.blueFill, c.blue, clamp01((t - CAND_AT) / 300));
		if (done) drawBadge(ctx, w - PAD_X - 24, b0.top + 11, `k = ${K}`, c.greenFill, c.green, 1);

		drawCaption(ctx, L.captions[step], w, HEIGHT - 18, c.text);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function HnswSearchDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

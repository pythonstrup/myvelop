import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// B-tree 조회: 비교 하강(단건), 리프 연결 리스트 스캔(범위), 비용 요약.
const T1 = 3200;
const T2 = 2600;
const T3 = 2600;
const E1 = T1;
const E2 = E1 + T2;
const CYCLE = E2 + T3;
const HEIGHT = 320;

const ROOT = [17, 42, 71];
const LEAVES = [
	[3, 9, 12],
	[21, 25, 33],
	[45, 50, 61],
	[77, 85, 90],
];
const FR = [0.14, 0.38, 0.62, 0.86];

const LABELS = {
	ko: {
		cmpNext: "17 < 50 → 다음",
		cmpChild: "42 ≤ 50 < 71 → 세 번째 자식",
		s1: ["① B-tree 조회: 비교로 한 경로 하강", "① B-tree 조회 50: 루트에서 비교로 자식 하나를 골라 하강 — 위치는 정확히 한 곳"],
		s2: ["② 범위 50~85: 리프를 옆으로 스캔", "② 범위 조회 50~85: 시작점만 찾으면 리프 연결 리스트를 따라 순차 스캔"],
		cost: ["B-tree — 한 경로 × 깊이 3~4", "B-tree — 경로 1개 × 깊이 3~4회, 범위 스캔 강함 (읽기 최적)"],
		path: "루트 → 중간 → 리프",
		s3: ["③ 조회는 항상 깊이만큼 내려간다", "③ 조회 비용은 트리 깊이만큼 — 읽기에 최적화한 대가로 쓰기는 제자리 갱신"],
		aria: "B-tree의 조회 경로 애니메이션. 루트에서 키 비교로 자식 하나를 골라 리프까지 한 경로로 내려가고, 범위 조회는 리프 연결 리스트를 따라 순차 스캔한다. 마지막에 조회 비용을 요약한다.",
	},
	en: {
		cmpNext: "17 < 50 → next",
		cmpChild: "42 ≤ 50 < 71 → third child",
		s1: ["① B-tree lookup: one-path descent", "① B-tree lookup 50: compares at the root pick one child — exactly one location"],
		s2: ["② Range 50–85: scan leaves sideways", "② Range scan 50–85: find the start, then follow the leaf linked list in order"],
		cost: ["B-tree — one path × depth 3–4", "B-tree — 1 path × depth 3–4, strong range scans (read-optimized)"],
		path: "root → inner → leaf",
		s3: ["③ A lookup always walks the depth", "③ Lookup cost = tree depth — optimized for reads, writes update in place"],
		aria: "Animation of B-tree lookup paths. From the root, key compares pick one child and the search descends one path to a leaf; a range scan follows the leaf linked list sequentially. It ends with a lookup cost summary.",
	},
} as const;
type Lang = keyof typeof LABELS;

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const h = HEIGHT;
	const fs = Math.max(10, Math.min(13, w / 50));
	const narrow = w < 480;
	ctx.textBaseline = "middle";
	const slotW = Math.max(18, Math.min(27, w / 28));
	let caption = "";

	const drawPage = (cx: number, y: number, ph: number, keys: number[], hi: number, hiColor: string) => {
		const pw = keys.length * slotW + 8;
		ctx.fillStyle = c.boxFill;
		ctx.beginPath();
		ctx.roundRect(cx - pw / 2, y, pw, ph, 5);
		ctx.fill();
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.stroke();
		keys.forEach((k, i) => {
			const x = cx - pw / 2 + 4 + i * slotW;
			if (hi === i) {
				ctx.fillStyle = hiColor;
				ctx.beginPath();
				ctx.roundRect(x, y + 3, slotW - 2, ph - 6, 3);
				ctx.fill();
			}
			ctx.fillStyle = hi === i ? "#fff" : c.text;
			ctx.font = `600 ${fs}px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(String(k), x + (slotW - 2) / 2, y + ph / 2);
		});
		return pw;
	};

	if (t < E2) {
		const rootY = h * 0.16;
		const rootH = Math.max(24, h * 0.1);
		const leafY = h * 0.55;
		const leafH = Math.max(24, h * 0.1);
		ctx.font = `${fs - 1}px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.fillText("B-tree", 8, h * 0.07);

		const inB = t < E1;
		const p = inB ? clamp01(t / T1) : clamp01((t - E1) / T2);

		// 간선
		LEAVES.forEach((_, i) => {
			const hi = inB && i === 2 && p > 0.45;
			ctx.strokeStyle = hi ? c.blue : c.line;
			ctx.lineWidth = hi ? 2 : 1;
			ctx.beginPath();
			ctx.moveTo(w / 2, rootY + rootH);
			ctx.lineTo(FR[i] * w, leafY);
			ctx.stroke();
		});

		if (inB) {
			// ① 단건 조회 50: 루트 셀을 차례로 비교 → 세 번째 자식 → 리프에서 발견
			const cmp = p < 0.15 ? -1 : p < 0.3 ? 0 : p < 0.45 ? 1 : 2;
			drawPage(w / 2, rootY, rootH, ROOT, cmp >= 0 && p < 0.45 ? cmp : -1, c.blue);
			LEAVES.forEach((lk, i) => {
				const found = i === 2 && p > 0.8;
				drawPage(FR[i] * w, leafY, leafH, lk, found ? 1 : -1, c.green);
			});
			if (p >= 0.15 && p < 0.45) {
				ctx.font = `600 ${fs}px ${FONT}`;
				ctx.fillStyle = c.blue;
				ctx.textAlign = "center";
				ctx.fillText(p < 0.3 ? L.cmpNext : L.cmpChild, w / 2, rootY - 12);
			}
			if (p >= 0.45 && p < 0.8) {
				const q = ease((p - 0.45) / 0.35);
				const tx = lerp(w / 2, FR[2] * w, q);
				const ty = lerp(rootY + rootH + 10, leafY - 12, q);
				ctx.fillStyle = c.blue;
				ctx.beginPath();
				ctx.arc(tx, ty, 6, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#fff";
				ctx.font = `600 ${fs - 2}px ${FONT}`;
				ctx.textAlign = "center";
				ctx.fillText("50", tx, ty);
			}
			caption = narrow ? L.s1[0] : L.s1[1];
		} else {
			// ② 범위 조회 50~85: 리프 연결 리스트 순차 스캔
			drawPage(w / 2, rootY, rootH, ROOT, -1, c.blue);
			const sweep = ease(p);
			LEAVES.forEach((lk, i) => {
				let hi = -1;
				if (i === 2 && sweep > 0.15) hi = 1;
				if (i === 3 && sweep > 0.75) hi = 1;
				drawPage(FR[i] * w, leafY, leafH, lk, hi, c.green);
			});
			// 리프 연결 리스트 화살표
			for (let i = 0; i < 3; i++) {
				const x1 = FR[i] * w + (LEAVES[i].length * slotW + 8) / 2;
				const x2 = FR[i + 1] * w - (LEAVES[i + 1].length * slotW + 8) / 2;
				const on = i === 2 && sweep > 0.5;
				ctx.strokeStyle = on ? c.green : c.line;
				ctx.lineWidth = on ? 2.5 : 1;
				ctx.beginPath();
				ctx.moveTo(x1 + 3, leafY + leafH / 2);
				ctx.lineTo(x2 - 3, leafY + leafH / 2);
				ctx.stroke();
				ctx.fillStyle = on ? c.green : c.line;
				ctx.beginPath();
				ctx.moveTo(x2 - 3, leafY + leafH / 2);
				ctx.lineTo(x2 - 9, leafY + leafH / 2 - 4);
				ctx.lineTo(x2 - 9, leafY + leafH / 2 + 4);
				ctx.closePath();
				ctx.fill();
			}
			caption = narrow ? L.s2[0] : L.s2[1];
		}
	} else {
		// ③ 비용 요약
		const p = ease(clamp01((t - E2) / 900));
		const label = narrow ? L.cost[0] : L.cost[1];
		const y = h * 0.42;
		const r = Math.max(4, w * 0.007);
		const step = Math.min(w * 0.06, 40);
		ctx.font = `600 ${fs}px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(label, w * 0.08, y - r * 4);
		ctx.textBaseline = "middle";
		for (let i = 0; i < 3; i++) {
			if ((i + 1) / 3 > p) break;
			ctx.fillStyle = c.blue;
			ctx.beginPath();
			ctx.arc(w * 0.08 + 8 + i * step, y, r, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.font = `${fs - 1}px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.fillText(L.path, w * 0.08 + 8 + 3 * step, y);
		caption = narrow ? L.s3[0] : L.s3[1];
	}

	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(caption, w / 2, h - 14);
	ctx.textBaseline = "middle";
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function BtreeLookupDemo({ lang = "ko" }: { lang?: Lang }) {
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

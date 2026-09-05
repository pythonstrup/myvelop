import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// LSM 조회: 최신 층부터 훑고, 블룸이 헛걸음을 막고, 발견 즉시 종료. 마지막에 비용 요약.
const T1 = 3400;
const T2 = 2600;
const E1 = T1;
const CYCLE = E1 + T2;
const HEIGHT = 320;

const LABELS = {
	ko: {
		rows: ["memtable (메모리)", "SSTable L0 (최신)", "SSTable L1"],
		results: ["미스", "블룸: 없음 → 스킵", "이진탐색 → 발견"],
		cap1: [
			"① LSM 조회: 최신층부터, 블룸으로 스킵",
			'① LSM 조회 b: "가장 최근에 쓴 곳"부터 층 훑기 — 발견 즉시 종료, 블룸이 헛걸음 차단',
		],
		cost: ["LSM — 층 K개 확인 가능성", "LSM — 최대 층 수만큼 확인 (블룸으로 완화) — 쓰기 최적의 대가"],
		path: "memtable → L0(스킵) → L1",
		cap2: ["② 층이 쌓일수록 조회는 비싸진다", "② 조회 비용은 층 수만큼 — 쓰기에 최적화한 대가를 블룸·컴팩션으로 되산다"],
		aria: "LSM tree의 조회 경로 애니메이션. memtable부터 최신 층 순으로 훑으며 블룸 필터가 키 없는 파일을 건너뛰게 하고, 발견 즉시 멈춘다. 마지막에 조회 비용을 요약한다.",
	},
	en: {
		rows: ["memtable (memory)", "SSTable L0 (newest)", "SSTable L1"],
		results: ["miss", "Bloom: definitely no → skip", "binary search → found"],
		cap1: [
			"① LSM lookup: newest layer first, Bloom skips",
			"① Lookup b: scan layers newest-first — stop on find, Bloom blocks wasted trips",
		],
		cost: ["LSM — up to K layer checks", "LSM — up to one check per layer (eased by Bloom) — the write-optimized price"],
		path: "memtable → L0 (skip) → L1",
		cap2: [
			"② More layers, costlier lookups",
			"② Cost grows per layer — Bloom and compaction buy back the write-optimized price",
		],
		aria: "The lookup path of an LSM tree, as a looping animation. It scans from the memtable down through the newest layers, a Bloom filter lets it skip files that definitely lack the key, and it stops as soon as the key is found. It ends with a summary of the lookup cost.",
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
	let caption = "";

	if (t < E1) {
		// ① LSM 조회: memtable → L0(블룸 스킵) → L1 발견
		const p = clamp01(t / T1);
		ctx.font = `${fs - 1}px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.fillText("LSM tree", 8, h * 0.07);

		const rows = [
			{ label: L.rows[0], y: h * 0.16, keys: ["e", "g"], at: 0.18, result: L.results[0], mem: true },
			{ label: L.rows[1], y: h * 0.4, keys: ["c", "d", "f"], at: 0.45, result: L.results[1], mem: false },
			{ label: L.rows[2], y: h * 0.64, keys: ["a", "b", "h", "k"], at: 0.72, result: L.results[2], mem: false },
		];
		const cell = Math.max(20, Math.min(28, w / 26));
		rows.forEach((r, ri) => {
			ctx.font = `${fs - 1}px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.textBaseline = "alphabetic";
			ctx.fillText(r.label, w * 0.08, r.y - 7);
			ctx.textBaseline = "middle";
			const bw = r.keys.length * cell + 10;
			const skip = ri === 1 && p > r.at + 0.1;
			ctx.globalAlpha = skip ? 0.45 : 1;
			ctx.fillStyle = r.mem ? c.blueFill : c.boxFill;
			ctx.beginPath();
			ctx.roundRect(w * 0.08, r.y, bw, cell + 8, 5);
			ctx.fill();
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1;
			ctx.stroke();
			r.keys.forEach((k, i) => {
				const found = ri === 2 && i === 1 && p > 0.85;
				if (found) {
					ctx.fillStyle = c.green;
					ctx.beginPath();
					ctx.roundRect(w * 0.08 + 5 + i * cell, r.y + 3, cell - 3, cell + 2, 3);
					ctx.fill();
				}
				ctx.fillStyle = found ? "#fff" : c.text;
				ctx.font = `600 ${fs}px ${FONT}`;
				ctx.textAlign = "center";
				ctx.fillText(k, w * 0.08 + 5 + i * cell + (cell - 3) / 2, r.y + (cell + 8) / 2);
			});
			ctx.globalAlpha = 1;
			// 단계 결과 라벨
			if (p > r.at + 0.08) {
				ctx.font = `600 ${fs - 1}px ${FONT}`;
				ctx.textAlign = "left";
				ctx.fillStyle = ri === 2 ? c.green : ri === 1 ? c.sub : c.amber;
				ctx.fillText(r.result, w * 0.08 + bw + 14, r.y + (cell + 8) / 2);
			}
		});
		// 조회 점 "b?" 가 층을 타고 내려감
		const qy =
			p < 0.45
				? lerp(rows[0].y, rows[1].y, ease(clamp01((p - 0.18) / 0.27))) + cell / 2
				: lerp(rows[1].y, rows[2].y, ease(clamp01((p - 0.45) / 0.27))) + cell / 2;
		const qx = w * 0.08 - 22;
		ctx.fillStyle = c.amber;
		ctx.beginPath();
		ctx.arc(qx, qy, 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#fff";
		ctx.font = `600 ${fs - 1}px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillText("b?", qx, qy);
		caption = narrow ? L.cap1[0] : L.cap1[1];
	} else {
		// ② 비용 요약
		const p = ease(clamp01((t - E1) / 900));
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
			const skipped = i === 1; // 블룸으로 스킵된 층
			ctx.fillStyle = skipped ? c.sub : c.green;
			ctx.beginPath();
			ctx.arc(w * 0.08 + 8 + i * step, y, r, 0, Math.PI * 2);
			ctx.fill();
			if (skipped) {
				ctx.strokeStyle = c.sub;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(w * 0.08 + 8 + i * step - r, y - r);
				ctx.lineTo(w * 0.08 + 8 + i * step + r, y + r);
				ctx.stroke();
			}
		}
		ctx.font = `${fs - 1}px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.fillText(L.path, w * 0.08 + 8 + 3 * step, y);
		caption = narrow ? L.cap2[0] : L.cap2[1];
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

export default function LsmLookupDemo({ lang = "ko" }: { lang?: Lang }) {
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

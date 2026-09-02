import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// LSM tree 동작: memtable 쓰기 → flush → 층 쌓임 → 읽기(블룸 스킵) → compaction.
const T1 = 2600;
const T2 = 2200;
const T3 = 2800;
const T4 = 2600;
const T5 = 3200;
const E1 = T1;
const E2 = E1 + T2;
const E3 = E2 + T3;
const E4 = E3 + T4;
const CYCLE = E4 + T5;
const HEIGHT = 340;

const W1 = ["f", "b", "a", "d"]; // 1차 쓰기 → SST1 = [a,b,d,f]
const W2 = ["c", "b′", "d✕", "g"]; // 2차: b 갱신, d 삭제(tombstone)
const SST1 = ["a", "b", "d", "f"];
const SST2 = ["b′", "c", "d✕", "g"];
const MERGED = ["a", "b′", "c", "f", "g"]; // merge: b→b′ 교체, d는 tombstone과 함께 소멸

const LABELS = {
	ko: {
		memory: "메모리",
		disk: "디스크 — SSTable (정렬·불변)",
		wal: "WAL (순차 로그)",
		cap1: ["① 쓰기는 memtable로 — 디스크는 WAL뿐", "① 쓰기는 memtable(메모리 정렬 버퍼)로 — 디스크에는 WAL 순차 append뿐"],
		cap2: ["② 가득 차면 정렬해 SSTable로 flush", "② memtable이 차면 통째로 정렬해 SSTable로 flush — 디스크엔 순차 쓰기 한 번"],
		cap3a: ["③ 갱신 b′·삭제 d✕도 그냥 쓴다", "③ 갱신(b′)·삭제(d✕ tombstone)도 옛 파일을 안 고치고 새로 쓸 뿐"],
		cap3b: ["③ flush 반복 — 층이 쌓인다", "③ flush가 반복되며 층이 쌓인다 — 같은 키의 최신 값은 위층에"],
		found: "→ b′ 발견 (최신층 우선)",
		bloomSkip: "Bloom Filter가 없는 파일은 건너뜀",
		cap4: ["④ 읽기: 위층부터 — 블룸으로 스킵", "④ 읽기는 memtable→최신층 순서 — 파일별 Bloom Filter가 헛걸음을 막는다"],
		compacted: "옛 b 교체 · d는 tombstone과 함께 소멸",
		cap5: ["⑤ compaction = merge 정리", "⑤ compaction: two-pointer merge로 통합·정리 — 우리 일 마감 배치가 정확히 이것"],
		aria: "LSM tree 동작 애니메이션. 쓰기가 메모리의 memtable로 들어가고, 가득 차면 정렬된 불변 SSTable로 flush되고, 갱신과 삭제도 새 파일에 얹히며 층이 쌓이고, 읽기는 블룸 필터의 도움으로 위에서 아래로 훑고, compaction이 파일들을 merge해 옛 값과 tombstone을 정리하는 과정을 보여준다.",
	},
	en: {
		memory: "memory",
		disk: "disk — SSTable (sorted, immutable)",
		wal: "WAL (sequential log)",
		cap1: [
			"① Writes go to memtable — only the WAL on disk",
			"① Writes go to memtable (sorted buffer) — disk gets only sequential WAL appends",
		],
		cap2: [
			"② When full, flush sorted to an SSTable",
			"② A full memtable flushes whole as a sorted SSTable — one sequential disk write",
		],
		cap3a: [
			"③ Update b′, delete d✕ — just more writes",
			"③ Updates (b′), deletes (d✕ tombstone) never touch old files — just new writes",
		],
		cap3b: [
			"③ Repeated flushes — layers stack up",
			"③ Flushes repeat, layers stack — a key's newest value sits in the upper layer",
		],
		found: "→ found b′ (newest layer first)",
		bloomSkip: "Bloom filter skips files without the key",
		cap4: [
			"④ Reads: top layer first — Bloom skips",
			"④ Reads: memtable → newest layer down — per-file Bloom filters stop wasted trips",
		],
		compacted: "old b replaced · d gone with its tombstone",
		cap5: [
			"⑤ compaction = merge cleanup",
			"⑤ compaction: consolidate via two-pointer merge — exactly our end-of-day batch",
		],
		aria: "How an LSM tree works, as a looping animation. Writes go into the in-memory memtable; when it fills up it is flushed as a sorted, immutable SSTable; updates and deletes also land in new files, so layers stack up; reads scan from the top down with the help of Bloom filters; and compaction merges the files, clearing out old values and tombstones.",
	},
} as const;
type Lang = keyof typeof LABELS;

type CellOpts = { bg?: string; w?: number; h?: number; hi?: number; hiColor?: string };

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const h = HEIGHT;
	const fs = Math.max(10, Math.min(13, w / 50));
	const narrow = w < 480;
	ctx.textBaseline = "middle";

	const m = Math.max(14, w * 0.04);
	const cell = Math.max(20, Math.min(30, w / 26));
	const memX = m;
	const memY = h * 0.15;
	const memW = cell * 5 + 12;
	const memH = cell + 12;
	const walX = memX + memW + w * 0.06;
	const walY = memY + memH / 2;
	const sstX = m;
	const sstW = cell * 6 + 12;
	const sstH = cell + 10;
	const sst1Y = h * 0.72;
	const sst2Y = h * 0.55;

	const drawCells = (x: number, y: number, keys: string[], opts: CellOpts = {}) => {
		ctx.fillStyle = opts.bg || c.boxFill;
		if (opts.bg !== "transparent") {
			ctx.beginPath();
			ctx.roundRect(x, y, opts.w || sstW, opts.h || sstH, 5);
			ctx.fill();
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1;
			ctx.stroke();
		}
		keys.forEach((k, i) => {
			const cx = x + 6 + i * cell;
			const dead = k.includes("✕");
			if (opts.hi === i) {
				ctx.fillStyle = opts.hiColor || c.blue;
				ctx.beginPath();
				ctx.roundRect(cx, y + 4, cell - 3, (opts.h || sstH) - 8, 3);
				ctx.fill();
			}
			ctx.fillStyle = opts.hi === i ? "#fff" : dead ? c.sub : c.text;
			ctx.font = `600 ${fs}px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(k, cx + (cell - 3) / 2, y + (opts.h || sstH) / 2);
		});
	};
	const label = (x: number, y: number, text: string) => {
		ctx.font = `${fs - 1}px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(text, x, y);
		ctx.textBaseline = "middle";
	};

	// 고정 프레임: 메모리/디스크 구분선
	ctx.strokeStyle = c.line;
	ctx.setLineDash([4, 4]);
	ctx.beginPath();
	ctx.moveTo(m, h * 0.42);
	ctx.lineTo(w - m, h * 0.42);
	ctx.stroke();
	ctx.setLineDash([]);
	label(m, h * 0.12 - fs, L.memory);
	label(m, h * 0.42 + fs + 4, L.disk);

	let caption = "";
	let memKeys: string[] = [];
	let walLen = 0;
	let ssts: { y: number; k: string[]; hi?: number; hiColor?: string }[] = [];

	if (t < E1) {
		// ① 쓰기: memtable로 append (정렬 상태 유지), WAL 순차 증가
		const p = clamp01(t / (T1 * 0.85));
		const n = Math.min(W1.length, Math.floor(p * W1.length + 0.001));
		memKeys = W1.slice(0, n).sort();
		walLen = n;
		const fp = (p * W1.length) % 1;
		if (n < W1.length) {
			const k = W1[n];
			const tx = lerp(w * 0.5, memX + memW / 2, ease(fp));
			const ty = lerp(h * 0.02, memY + memH / 2, ease(fp));
			ctx.fillStyle = c.blue;
			ctx.beginPath();
			ctx.arc(tx, ty, 8, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.font = `600 ${fs - 1}px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(k, tx, ty);
		}
		caption = narrow ? L.cap1[0] : L.cap1[1];
	} else if (t < E2) {
		// ② flush: memtable 통째 → SSTable1 (순차 쓰기)
		const p = ease(clamp01((t - E1) / (T2 * 0.7)));
		const y = lerp(memY, sst1Y, p);
		drawCells(memX, y, SST1, {});
		walLen = 4;
		ssts = [];
		caption = narrow ? L.cap2[0] : L.cap2[1];
	} else if (t < E3) {
		// ③ 2차 쓰기(갱신 b′·삭제 d✕ 포함) + flush → 층이 쌓임
		const p = clamp01((t - E2) / T3);
		ssts = [{ y: sst1Y, k: SST1 }];
		if (p < 0.55) {
			const n = Math.min(W2.length, Math.floor((p / 0.55) * W2.length));
			memKeys = W2.slice(0, n).sort();
			walLen = n;
			caption = narrow ? L.cap3a[0] : L.cap3a[1];
		} else {
			const q = ease(clamp01((p - 0.55) / 0.35));
			drawCells(sstX, lerp(memY, sst2Y, q), SST2, {});
			walLen = 4;
			caption = narrow ? L.cap3b[0] : L.cap3b[1];
		}
	} else if (t < E4) {
		// ④ 읽기 b: memtable 미스 → SST2에서 b′ 발견 (SST1은 안 봄)
		const p = clamp01((t - E3) / T4);
		ssts = [
			{ y: sst2Y, k: SST2, hi: p > 0.5 ? 0 : -1, hiColor: c.green },
			{ y: sst1Y, k: SST1 },
		];
		const qy =
			p < 0.35
				? lerp(h * 0.02, memY + memH / 2, ease(p / 0.35))
				: p < 0.5
					? lerp(memY + memH / 2, sst2Y + sstH / 2, ease((p - 0.35) / 0.15))
					: sst2Y + sstH / 2;
		const dotX = p < 0.5 ? memX + memW + 24 : sstX + sstW + 20;
		ctx.fillStyle = c.amber;
		ctx.beginPath();
		ctx.arc(dotX, qy, 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#fff";
		ctx.font = `600 ${fs - 1}px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillText("b?", dotX, qy);
		if (p > 0.5) {
			ctx.font = `600 ${fs - 1}px ${FONT}`;
			ctx.fillStyle = c.green;
			ctx.textAlign = "left";
			ctx.fillText(L.found, sstX + sstW + 38, sst2Y + sstH / 2);
			ctx.fillStyle = c.sub;
			ctx.fillText(L.bloomSkip, sstX + sstW + 38, sst1Y + sstH / 2);
		}
		caption = narrow ? L.cap4[0] : L.cap4[1];
	} else {
		// ⑤ compaction: SST1+SST2 → merge, 옛 b·tombstone d 소멸
		const p = ease(clamp01((t - E4) / (T5 * 0.6)));
		if (p < 1) {
			ctx.globalAlpha = 1 - p;
			drawCells(sstX, sst2Y, SST2, {});
			drawCells(sstX, sst1Y, SST1, {});
			ctx.globalAlpha = 1;
		}
		const mergedW = MERGED.length * cell + 12;
		drawCells(sstX, lerp(sst2Y, sst1Y, 0.5), MERGED, { w: mergedW });
		if (p >= 1) {
			ctx.font = `600 ${fs - 1}px ${FONT}`;
			ctx.fillStyle = c.green;
			ctx.textAlign = "left";
			ctx.fillText(L.compacted, sstX + mergedW + 12, lerp(sst2Y, sst1Y, 0.5) + sstH / 2);
		}
		caption = narrow ? L.cap5[0] : L.cap5[1];
	}

	// memtable / WAL (⑤에서는 비움)
	if (t < E4) {
		ctx.strokeStyle = c.line;
		ctx.setLineDash([4, 3]);
		ctx.strokeRect(memX, memY, memW, memH);
		ctx.setLineDash([]);
		label(memX, memY - 6, "memtable");
		if (memKeys.length)
			drawCells(memX + 3, memY + 3, memKeys, { w: memW - 6, h: memH - 6, bg: "transparent" });
		label(walX, memY - 6, L.wal);
		ctx.fillStyle = c.boxFill;
		ctx.fillRect(walX, walY - 5, w - walX - m, 10);
		ctx.fillStyle = c.blue;
		ctx.fillRect(walX, walY - 5, (w - walX - m) * (walLen / 8 + (t >= E2 ? 0.5 : 0)), 10);
	}

	// SSTable 층
	for (const s of ssts) drawCells(sstX, s.y, s.k, { hi: s.hi, hiColor: s.hiColor });
	if (t >= E2 && t < E3 && clamp01((t - E2) / T3) < 0.55) drawCells(sstX, sst1Y, SST1, {});

	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(caption, w / 2, h - 14);
	ctx.textBaseline = "middle";
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function LsmTreeDemo({ lang = "ko" }: { lang?: Lang }) {
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

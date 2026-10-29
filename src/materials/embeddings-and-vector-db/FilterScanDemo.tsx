import { clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";
import type { Lang } from "./lang";

// 근사 색인과 WHERE 를 함께 쓸 때를 반복 재생한다.
// HNSW 가 후보 40개를 모은 뒤 조건을 걸면 10%인 4개만 남는다. 반복 색인 탐색을 켜면 더 훑어 10개를 채운다.
// 어느 칸이 조건에 맞는지와 더 훑은 후보 수(60개)는 10% 비율에 맞춘 설명용 값이다.
const UNTIL = [2000, 4000, 6000, 9500, 12000];
const CYCLE = 12000;
const HEIGHT = 360;
const COLS = 10;
const FIRST = 40;
const TOTAL = 100;
const LIMIT = 10;
const MATCH = new Set([3, 16, 22, 37, 45, 58, 64, 71, 83, 99]);
const GRID_TOP = 52;
const FILTER_AT = 2000;
const MORE_AT = 6200;
const MORE_GAP = 45;

// i번째 칸이 나타나는 시각과 조건이 걸리는 시각
const shownAt = (i: number) => (i < FIRST ? i * 35 : MORE_AT + (i - FIRST) * MORE_GAP);
const filteredAt = (i: number) => (i < FIRST ? FILTER_AT : shownAt(i) + 150);

const LABELS = {
	ko: {
		captions: [
			"① HNSW가 후보 40개를 모은다 (ef_search = 40)",
			"② WHERE 조건은 그 뒤에 건다 · 맞는 행은 10%",
			"③ LIMIT 10인데 4개만 돌아온다",
			"④ 반복 색인 탐색을 켜면 모자란 만큼 더 훑는다",
			"⑤ 10개를 채우면 멈춘다 (상한 hnsw.max_scan_tuples)",
		],
		sql: "WHERE tax_type = '부가가치세'  LIMIT 10",
		scanned: (n: number) => `훑은 후보 ${n}개`,
		rows: "결과",
		cap: "상한 hnsw.max_scan_tuples = 20,000행",
		aria: "pgvector에서 WHERE 조건과 근사 색인을 함께 쓸 때를 반복 재생하는 애니메이션. HNSW가 후보 40개를 모은 뒤 조건을 걸면 맞는 행이 10%인 4개만 남아, LIMIT 10인데 4개만 돌아온다. 반복 색인 탐색을 켜면 후보를 더 훑어 10개를 채우고 멈춘다. 훑는 양의 상한은 hnsw.max_scan_tuples로 정하며 기본값은 20,000이다.",
	},
	en: {
		captions: [
			"① HNSW collects 40 candidates (ef_search = 40)",
			"② WHERE is applied afterward · 10% of rows match",
			"③ LIMIT 10, but only 4 rows come back",
			"④ Iterative index scan keeps scanning for more",
			"⑤ Stops at 10 rows (cap: hnsw.max_scan_tuples)",
		],
		sql: "WHERE tax_type = 'VAT'  LIMIT 10",
		scanned: (n: number) => `scanned ${n} candidates`,
		rows: "rows",
		cap: "cap hnsw.max_scan_tuples = 20,000 tuples",
		aria: "Looping animation of pgvector combining a WHERE condition with an approximate index. HNSW collects 40 candidates and the condition is applied afterward; only 4 of them, 10%, match, so LIMIT 10 returns just 4 rows. With iterative index scans on, it scans more candidates until 10 rows are filled and then stops. hnsw.max_scan_tuples caps how much it scans, 20,000 by default.",
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
		const cell = Math.max(16, Math.min(26, Math.floor((w - 32) / COLS)));
		const left = (w - cell * COLS) / 2;
		const right = left + cell * COLS;

		let scanned = 0;
		let found = 0;
		for (let i = 0; i < TOTAL; i++) {
			if (t >= shownAt(i)) scanned = i + 1;
			if (MATCH.has(i) && t >= filteredAt(i) + 300) found++;
		}

		// 머리줄: 조건과 지금까지 훑은 후보, 돌아온 결과
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		ctx.font = `500 11px ui-monospace, SFMono-Regular, Menlo, monospace`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.sql, left, 16);
		ctx.font = `500 11.5px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(L.scanned(scanned), left, 37);
		if (t >= FILTER_AT + 600) {
			const full = found >= LIMIT;
			drawBadge(ctx, right - 34, 37, `${L.rows} ${found} / ${LIMIT}`, full ? c.greenFill : c.amberFill, full ? c.green : c.amber, 1);
		}

		// 후보 칸. 처음 40개와 더 훑은 칸 사이에 점선을 긋는다.
		for (let i = 0; i < TOTAL; i++) {
			const appear = clamp01((t - shownAt(i)) / 200);
			if (appear <= 0) continue;
			const f = clamp01((t - filteredAt(i)) / 300);
			const match = MATCH.has(i);
			const x = left + (i % COLS) * cell;
			const y = GRID_TOP + Math.floor(i / COLS) * cell;
			ctx.save();
			ctx.globalAlpha = appear * (match ? 1 : 1 - 0.6 * f);
			ctx.beginPath();
			ctx.roundRect(x + 2, y + 2, cell - 4, cell - 4, 4);
			ctx.fillStyle = match && f > 0 ? c.greenFill : c.boxFill;
			ctx.fill();
			ctx.strokeStyle = match && f > 0 ? c.green : c.boxStroke;
			ctx.lineWidth = match && f > 0 ? 1.5 : 1;
			ctx.stroke();
			ctx.restore();
		}
		if (t >= MORE_AT) {
			const y = GRID_TOP + (FIRST / COLS) * cell;
			ctx.save();
			ctx.setLineDash([4, 3]);
			ctx.strokeStyle = c.sub;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(left - 4, y);
			ctx.lineTo(right + 4, y);
			ctx.stroke();
			ctx.restore();
			ctx.font = `500 11px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillStyle = c.sub;
			ctx.fillText(L.cap, w / 2, GRID_TOP + (TOTAL / COLS) * cell + 14);
		}

		drawCaption(ctx, L.captions[step], w, HEIGHT - 18, c.text);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function FilterScanDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

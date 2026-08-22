import { type Colors, clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 실제 Parquet 파일의 물리 배치를 쓰는 순서 그대로 따라간다.
// PAR1 → 덩어리들(열 청크 → 페이지+머리말) → 부가 색인 → 목차 → 길이 → PAR1.
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
const UNTIL = [3200, 6800, 11200, 14800, 18600, 22400];
const CYCLE = 22400;
const HEIGHT = 252;

type Seg = { k: string; g?: number; w: number };
const SEGS: Seg[] = [
	{ k: "magic1", w: 0.045 },
	{ k: "rg", g: 0, w: 0.305 },
	{ k: "rg", g: 1, w: 0.305 },
	{ k: "aux", w: 0.115 },
	{ k: "footer", w: 0.115 },
	{ k: "len", w: 0.03 },
	{ k: "magic2", w: 0.045 },
];
type Ck = "blue" | "amber" | "green";
const CHUNKS: { key: string; ck: Ck; w: number }[] = [
	{ key: "user_id", ck: "blue", w: 0.26 },
	{ key: "name", ck: "amber", w: 0.3 },
	{ key: "status", ck: "green", w: 0.44 },
];
// 확대해 보여줄 청크: 덩어리 1의 status. 머리말 → 페이지 → 머리말 → 페이지.
const ZOOM_G = 0;
const ZOOM_C = 2;
const PAGES: { hdr: boolean; w: number; label?: string }[] = [
	{ hdr: true, w: 0.08 },
	{ hdr: false, w: 0.4, label: "페이지 — 값들" },
	{ hdr: true, w: 0.08 },
	{ hdr: false, w: 0.44, label: "페이지 — 값들" },
];

const LABELS = {
	ko: {
	captions: [
		"① 쓸 때는 앞에서부터 — PAR1 뒤에 행 덩어리를 차례로 쓴다",
		"② 덩어리 안은 열(컬럼 청크)끼리 모아 쓴다",
		"③ 청크 속은 페이지 단위다 — 앞에 머리말(page header)이 붙는다",
		"④ 본문을 다 쓴 뒤, 페이지 색인과 블룸 필터를 꼬리 앞에 모아 쓴다",
		"⑤ 마지막이 목차(footer)다 — 위치와 min/max, 길이, PAR1",
		"⑥ 색인은 중간이 아니라 전부 꼬리 쪽 — 읽기는 꼬리부터다",
	],
	group: (n: number) => `덩어리 ${n}`,
	magic: "PAR1",
	aux: "페이지 색인 · Bloom filter",
	footer: "목차(footer)",
	hdrChip: "머리말",
	hdrNote: "page header: 이 페이지가 몇 바이트인지, 값이 몇 개인지 적은 인라인 정보",
	summary: "색인은 전부 꼬리 쪽 — 읽기는 꼬리부터",
	aria: "실제 Parquet 파일이 물리적으로 어떤 순서로 놓이는지 반복 재생하는 애니메이션. 파일은 매직넘버 PAR1로 시작하고, 행 덩어리(row group)들이 앞에서부터 차례로 쓰인다. 덩어리 안은 user_id, name, status 컬럼 청크끼리 모여 있고, 청크 하나를 확대해 보면 페이지 단위로 나뉘며 페이지마다 앞에 크기와 값 개수를 적은 머리말(page header)이 인라인으로 붙는다. 본문을 다 쓴 뒤에는 페이지 색인과 블룸 필터를 꼬리 앞에 모아 쓰고, 마지막에 전 덩어리의 위치와 min/max를 담은 목차(footer), 길이 4바이트, 매직넘버 PAR1로 끝난다. 색인은 덩어리 사이에 흩어져 있지 않고 전부 꼬리 쪽에 모여 있어 읽기는 꼬리부터 시작한다.",
},
	en: {
		captions: [
			"\u2460 Writing goes front to back \u2014 row groups follow the PAR1 magic",
			"\u2461 Inside a row group, values sit by column chunk",
			"\u2462 Chunks are made of pages \u2014 each starts with a page header",
			"\u2463 After the data, page indexes and Bloom filters gather at the tail",
			"\u2464 Last comes the footer \u2014 offsets, min/max, its length, PAR1",
			"\u2465 Indexes live at the tail, not in between \u2014 reads start there",
		],
		group: (n: number) => `row group ${n}`,
		magic: "PAR1",
		aux: "page index \u00b7 Bloom filter",
		footer: "footer",
		hdrChip: "header",
		hdrNote: "page header: inline info \u2014 how many bytes, how many values",
		summary: "all indexes at the tail \u2014 reads start from the tail",
		aria: "Looping animation of the physical order of a real Parquet file. The file opens with the PAR1 magic number and row groups are written front to back. Inside each row group the user_id, name and status column chunks sit together, and zooming into one chunk shows it split into pages, each preceded by an inline page header recording its size and value count. After the data, page indexes and Bloom filters are written just before the tail, and the file ends with the footer holding every row group's offsets and min/max, a 4-byte length, and PAR1. Indexes are not scattered between row groups; they all gather at the tail, so reads start there.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 14;
const BAR_Y = 64;
const BAR_H = 36;
const BAR_BOTTOM = BAR_Y + BAR_H;
const LABEL_TOP = 52;
const LABEL_BOT = BAR_BOTTOM + 13;
const PANEL_Y = 150;
const PANEL_H = 32;
const BADGE_Y = 160;

const fade = (t: number, at: number, dur = 500) => ease(clamp01((t - at) / dur));
const accent = (c: Colors, ck: Ck) => (ck === "blue" ? c.blue : ck === "amber" ? c.amber : c.green);
const accentFill = (c: Colors, ck: Ck) =>
	ck === "blue" ? c.blueFill : ck === "amber" ? c.amberFill : c.greenFill;

function drawCurve(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	depth: number,
	color: string,
	alpha: number,
	head: boolean,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = head ? 1.8 : 1.2;
	ctx.setLineDash([4, 3]);
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.quadraticCurveTo((x1 + x2) / 2, y1 + depth, x2, y2 + (head ? 8 : 0));
	ctx.stroke();
	if (head) {
		ctx.setLineDash([]);
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(x2 - 4.5, y2 + 8);
		ctx.lineTo(x2 + 4.5, y2 + 8);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
	}
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const usable = w - MARGIN * 2;
	const step = UNTIL.findIndex((u) => t < u);

	const total = SEGS.reduce((a, s) => a + s.w, 0);
	let acc = 0;
	const pos = SEGS.map((s) => {
		const x = MARGIN + (acc / total) * usable;
		acc += s.w;
		return { ...s, x, w: (s.w / total) * usable };
	});
	const rg = pos.filter((s) => s.k === "rg");
	const aux = pos.find((s) => s.k === "aux");
	const footer = pos.find((s) => s.k === "footer");
	const len = pos.find((s) => s.k === "len");
	const magic1 = pos.find((s) => s.k === "magic1");
	const magic2 = pos.find((s) => s.k === "magic2");
	if (!aux || !footer || !len || !magic1 || !magic2) return;

	ctx.textBaseline = "middle";

	// PAR1 시작
	const m1A = fade(t, 200, 350);
	if (m1A > 0) {
		ctx.save();
		ctx.globalAlpha = m1A;
		ctx.beginPath();
		ctx.rect(magic1.x, BAR_Y, magic1.w, BAR_H);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.sub;
		ctx.lineWidth = 1.2;
		ctx.stroke();
		ctx.font = `700 8.5px ${MONO}`;
		ctx.textAlign = "center";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.magic, magic1.x + magic1.w / 2, BAR_Y + BAR_H / 2);
		ctx.restore();
	}

	// 덩어리들 — ①은 통짜, ②부터 열 청크로 갈라진다
	rg.forEach((s, g) => {
		const a = fade(t, 700 + g * 1100, 500);
		if (a <= 0) return;
		ctx.save();
		ctx.globalAlpha = a;
		ctx.beginPath();
		ctx.rect(s.x, BAR_Y, s.w, BAR_H);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.1;
		ctx.stroke();

		const colA = step >= 1 ? fade(t, UNTIL[0] + 300 + g * 500, 450) : 0;
		if (colA > 0) {
			let cx = s.x;
			for (const ch of CHUNKS) {
				const cw = ch.w * s.w;
				ctx.save();
				ctx.globalAlpha = a * colA;
				ctx.beginPath();
				ctx.rect(cx, BAR_Y, cw, BAR_H);
				ctx.fillStyle = accentFill(c, ch.ck);
				ctx.fill();
				ctx.strokeStyle = accent(c, ch.ck);
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.font = `600 9.5px ${FONT}`;
				ctx.textAlign = "center";
				ctx.fillStyle = c.text;
				ctx.fillText(ch.key, cx + cw / 2, BAR_Y + BAR_H / 2);
				ctx.restore();
				cx += cw;
			}
		}
		ctx.font = `600 11px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.group(g + 1), s.x + s.w / 2, LABEL_TOP - 8);
		ctx.restore();
	});

	// ③ 확대: status 청크 속의 페이지와 머리말 (이 장면에서만 보인다)
	const zoomA = step >= 2 ? fade(t, UNTIL[1], 400) * (1 - fade(t, UNTIL[2], 400)) : 0;
	if (zoomA > 0) {
		const zs = rg[ZOOM_G];
		const zx = zs.x + CHUNKS.slice(0, ZOOM_C).reduce((a2, ch) => a2 + ch.w, 0) * zs.w;
		const zw = CHUNKS[ZOOM_C].w * zs.w;
		const px = MARGIN + 30;
		const pw = usable - 60;

		ctx.save();
		ctx.globalAlpha = zoomA * 0.75;
		ctx.setLineDash([4, 3]);
		ctx.strokeStyle = c.sub;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(zx, BAR_BOTTOM);
		ctx.lineTo(px, PANEL_Y);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(zx + zw, BAR_BOTTOM);
		ctx.lineTo(px + pw, PANEL_Y);
		ctx.stroke();
		ctx.restore();

		let ax = px;
		PAGES.forEach((pg, i) => {
			const sw = pg.w * pw;
			const a = zoomA * fade(t, UNTIL[1] + 400 + i * 350, 300);
			if (a > 0) {
				ctx.save();
				ctx.globalAlpha = a;
				ctx.beginPath();
				ctx.rect(ax, PANEL_Y, sw, PANEL_H);
				ctx.fillStyle = pg.hdr ? c.boxFill : c.greenFill;
				ctx.fill();
				ctx.strokeStyle = pg.hdr ? c.sub : c.green;
				ctx.lineWidth = pg.hdr ? 1.4 : 1;
				ctx.stroke();
				ctx.font = `600 9.5px ${FONT}`;
				ctx.textAlign = "center";
				ctx.fillStyle = pg.hdr ? c.sub : c.text;
				ctx.fillText(pg.hdr ? L.hdrChip : (pg.label ?? ""), ax + sw / 2, PANEL_Y + PANEL_H / 2);
				ctx.restore();
				// 머리말은 점선 고리로 한 번 더 짚는다
				if (pg.hdr) {
					ctx.save();
					ctx.globalAlpha = a * fade(t, UNTIL[1] + 1900, 400);
					ctx.setLineDash([3, 2]);
					ctx.strokeStyle = c.red;
					ctx.lineWidth = 1.8;
					ctx.beginPath();
					ctx.roundRect(ax - 1.5, PANEL_Y - 2.5, sw + 3, PANEL_H + 5, 4);
					ctx.stroke();
					ctx.restore();
				}
			}
			ax += sw;
		});
		ctx.save();
		ctx.globalAlpha = zoomA * fade(t, UNTIL[1] + 1900, 400);
		ctx.font = `500 10.5px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.hdrNote, w / 2, PANEL_Y + PANEL_H + 15);
		ctx.restore();
	}

	// ④ 부가 색인 — 본문 뒤, 꼬리 앞
	if (step >= 3) {
		const a = fade(t, UNTIL[2] + 200, 450);
		ctx.save();
		ctx.globalAlpha = a;
		ctx.beginPath();
		ctx.rect(aux.x, BAR_Y, aux.w, BAR_H);
		ctx.fillStyle = c.amberFill;
		ctx.fill();
		ctx.strokeStyle = c.amber;
		ctx.lineWidth = 1.2;
		ctx.stroke();
		ctx.font = `600 10px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillStyle = c.amber;
		ctx.fillText(L.aux, aux.x + aux.w / 2, LABEL_BOT);
		ctx.restore();
	}

	// ⑤ 목차 + 길이 + PAR1 끝
	if (step >= 4) {
		const fa = fade(t, UNTIL[3] + 200, 450);
		ctx.save();
		ctx.globalAlpha = fa;
		ctx.beginPath();
		ctx.rect(footer.x, BAR_Y, footer.w, BAR_H);
		ctx.fillStyle = c.redFill;
		ctx.fill();
		ctx.strokeStyle = c.red;
		ctx.lineWidth = 1.4;
		ctx.stroke();
		ctx.strokeStyle = c.red;
		ctx.lineWidth = 1.1;
		for (let i = 0; i < 3; i++) {
			const y = BAR_Y + 10 + i * 8;
			ctx.beginPath();
			ctx.moveTo(footer.x + 6, y);
			ctx.lineTo(footer.x + footer.w - 6, y);
			ctx.stroke();
		}
		ctx.font = `600 10px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillStyle = c.red;
		ctx.fillText(L.footer, footer.x + footer.w / 2, LABEL_TOP - 8);
		ctx.restore();

		const la = fade(t, UNTIL[3] + 900, 350);
		ctx.save();
		ctx.globalAlpha = la;
		ctx.beginPath();
		ctx.rect(len.x, BAR_Y, len.w, BAR_H);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.sub;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.font = `600 7.5px ${MONO}`;
		ctx.textAlign = "center";
		ctx.fillStyle = c.sub;
		ctx.fillText("len", len.x + len.w / 2, BAR_Y + BAR_H / 2);
		ctx.restore();

		const m2A = fade(t, UNTIL[3] + 1300, 350);
		ctx.save();
		ctx.globalAlpha = m2A;
		ctx.beginPath();
		ctx.rect(magic2.x, BAR_Y, magic2.w, BAR_H);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.sub;
		ctx.lineWidth = 1.2;
		ctx.stroke();
		ctx.font = `700 8.5px ${MONO}`;
		ctx.textAlign = "center";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.magic, magic2.x + magic2.w / 2, BAR_Y + BAR_H / 2);
		ctx.restore();
	}

	// ⑥ 목차가 덩어리들을 가리킨다 — 읽기는 꼬리부터
	if (step >= 5) {
		const fx = footer.x + footer.w / 2;
		drawCurve(ctx, fx, BAR_BOTTOM + 24, rg[0].x + rg[0].w / 2, BAR_BOTTOM + 4, 36, c.red, fade(t, UNTIL[4] + 300, 450), true);
		drawCurve(ctx, fx, BAR_BOTTOM + 24, rg[1].x + rg[1].w / 2, BAR_BOTTOM + 4, 28, c.red, fade(t, UNTIL[4] + 600, 450), true);
		drawBadge(ctx, w / 2, BADGE_Y + 34, L.summary, c.redFill, c.red, fade(t, UNTIL[4] + 1100, 450));
	}

	ctx.textAlign = "center";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function FileLayoutDemo({ lang = "ko" }: { lang?: Lang }) {
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

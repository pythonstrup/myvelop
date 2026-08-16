import { type Colors, clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// Parquet 파일 하나를 열어 놓고 안이 어떤 순서로 놓이는지 따라간다.
// 열로만 모으지 않고 행을 먼저 덩어리(row group)로 자른 뒤 그 안에서 열로 모으고,
// 꼬리에 덩어리마다의 위치와 통계를 적어둔다. 읽는 쪽은 꼬리를 먼저 읽는다.
const UNTIL = [1900, 4100, 6300, 8800, 11800];
const CYCLE = 11800;
const HEIGHT = 248;

const GROUPS = 3;
const FOOTER_W = 0.08;
const GROUP_W = (1 - FOOTER_W) / GROUPS;

type Kind = "plain" | "want" | "heavy";
// 이 그림은 바이트 비중이 아니라 배치를 보여주는 것이라 폭은 읽기 좋게 잡았다.
const FIELDS: { w: number; kind: Kind }[] = [
	{ w: 0.15, kind: "plain" },
	{ w: 0.2, kind: "plain" },
	{ w: 0.15, kind: "want" },
	{ w: 0.5, kind: "heavy" },
];
const WANT = 2;
const WANT_OFFSET = FIELDS.slice(0, WANT).reduce((a, f) => a + f.w, 0);
const HIT = 1; // 꼬리가 가리키는 덩어리

const LABELS = {
	ko: {
		captions: [
			"① 열로만 모으면 파일 하나가 열 넷이다",
			"② 행을 먼저 덩어리로 자른다",
			"③ 덩어리 안에서 다시 열로 모은다",
			"④ 꼬리에 각 덩어리의 위치와 통계가 붙는다",
			"⑤ 꼬리를 먼저 읽고 필요한 자리로 건너뛴다",
		],
		file: "dt=2026-07-29/data.parquet",
		fStatus: "status",
		fVars: "variables",
		group: (n: number) => `덩어리 ${n}`,
		tail: "꼬리",
		hit: `덩어리 ${GROUPS}개 중 1개 · 열 ${FIELDS.length}개 중 1개`,
		aria: "Parquet 파일 하나의 내부 배치를 따라가는 반복 애니메이션. 열로만 모으면 파일 전체가 열 넷으로 이어지지만, Parquet은 먼저 행을 덩어리(row group) 셋으로 자르고 그 덩어리 안에서 다시 열별로 모아 둔다. 파일 꼬리에는 덩어리마다 어느 위치에 있고 열별 최소·최대가 얼마인지가 적힌다. 그래서 읽는 쪽은 꼬리를 먼저 읽고, 조건에 맞는 덩어리 하나와 필요한 열 하나의 자리로 곧장 건너뛴다.",
	},
	en: {
		captions: [
			"① Column-major alone: one file, four columns",
			"② Rows are cut into groups first",
			"③ Inside a group, values regroup by column",
			"④ The footer records each group's offset and stats",
			"⑤ Read the footer first, then jump straight in",
		],
		file: "dt=2026-07-29/data.parquet",
		fStatus: "status",
		fVars: "variables",
		group: (n: number) => `group ${n}`,
		tail: "footer",
		hit: `1 of ${GROUPS} groups · 1 of ${FIELDS.length} columns`,
		aria: "Looping animation walking through the internal layout of a single Parquet file. Column-major alone would lay the whole file out as four long columns, but Parquet first cuts the rows into three row groups and only regroups by column inside each group. The file footer records where each group sits and the per-column minimum and maximum. So a reader loads the footer first and then jumps straight to the one group that matches and the one column it needs.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 12;
const BAR_Y = 72;
const BAR_H = 36;
const BAR_BOTTOM = BAR_Y + BAR_H;

function fillSeg(
	ctx: CanvasRenderingContext2D,
	x: number,
	w: number,
	kind: Kind | "neutral",
	c: Colors,
	alpha: number,
) {
	if (w <= 0 || alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.rect(x, BAR_Y, w, BAR_H);
	ctx.fillStyle = kind === "heavy" ? c.amberFill : kind === "want" ? c.blueFill : c.boxFill;
	ctx.fill();
	ctx.strokeStyle = kind === "heavy" ? c.amber : kind === "want" ? c.blue : c.line;
	ctx.lineWidth = 0.9;
	ctx.stroke();
	ctx.restore();
}

// 꼬리에서 덩어리로 내려가는 안내선. 마지막 단계에서 하나만 남는다.
function drawPointer(
	ctx: CanvasRenderingContext2D,
	fromX: number,
	toX: number,
	depth: number,
	color: string,
	alpha: number,
	head: boolean,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = head ? 1.8 : 1;
	if (!head) ctx.setLineDash([4, 4]);
	ctx.beginPath();
	ctx.moveTo(fromX, BAR_BOTTOM + 2);
	ctx.quadraticCurveTo((fromX + toX) / 2, BAR_BOTTOM + depth, toX, BAR_BOTTOM + 2);
	ctx.stroke();
	if (head) {
		ctx.setLineDash([]);
		ctx.beginPath();
		ctx.moveTo(toX, BAR_BOTTOM + 1);
		ctx.lineTo(toX - 4.5, BAR_BOTTOM + 9);
		ctx.lineTo(toX + 4.5, BAR_BOTTOM + 9);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
	}
	ctx.restore();
}

function drawLegend(
	ctx: CanvasRenderingContext2D,
	rightX: number,
	y: number,
	c: Colors,
	items: { label: string; color: string; fill: string }[],
) {
	ctx.save();
	ctx.font = `600 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	const widths = items.map((it) => 15 + ctx.measureText(it.label).width);
	const total = widths.reduce((a, b) => a + b, 0) + 14 * (items.length - 1);
	let x = rightX - total;
	items.forEach((it, i) => {
		ctx.beginPath();
		ctx.roundRect(x, y - 5, 10, 10, 2);
		ctx.fillStyle = it.fill;
		ctx.fill();
		ctx.strokeStyle = it.color;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.fillStyle = c.sub;
		ctx.fillText(it.label, x + 15, y + 0.5);
		x += widths[i] + 14;
	});
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const usable = w - MARGIN * 2;
		const step = UNTIL.findIndex((u) => t < u);
		const split = step >= 1; // 덩어리로 잘렸는가
		const byColumn = step >= 2; // 덩어리 안이 열로 갈렸는가
		const tailOn = step >= 3;

		const groupX = (g: number) => MARGIN + g * GROUP_W * usable;
		const groupW = GROUP_W * usable;
		const footerX = MARGIN + (1 - FOOTER_W) * usable;
		const footerW = FOOTER_W * usable;

		// 파일 이름과 색 범례
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(L.file, MARGIN, 20);
		drawLegend(ctx, w - MARGIN, 20, c, [
			{ label: L.fStatus, color: c.blue, fill: c.blueFill },
			{ label: L.fVars, color: c.amber, fill: c.amberFill },
		]);

		if (!split) {
			// ① 파일 전체가 열 넷으로 이어진 상태
			let x = MARGIN;
			for (const f of FIELDS) {
				fillSeg(ctx, x, f.w * usable, f.kind, c, 1);
				x += f.w * usable;
			}
		} else {
			for (let g = 0; g < GROUPS; g++) {
				if (byColumn) {
					let x = groupX(g);
					for (const f of FIELDS) {
						fillSeg(ctx, x, f.w * groupW, f.kind, c, 1);
						x += f.w * groupW;
					}
				} else {
					fillSeg(ctx, groupX(g), groupW, "neutral", c, 1);
				}
				// 덩어리 경계
				ctx.save();
				ctx.beginPath();
				ctx.moveTo(groupX(g) + groupW, BAR_Y);
				ctx.lineTo(groupX(g) + groupW, BAR_BOTTOM);
				ctx.strokeStyle = c.sub;
				ctx.lineWidth = 1.8;
				ctx.stroke();
				ctx.restore();

				ctx.textAlign = "center";
				ctx.font = `600 11px ${FONT}`;
				ctx.fillStyle = c.sub;
				ctx.fillText(L.group(g + 1), groupX(g) + groupW / 2, 60);
			}

			// 꼬리
			fillSeg(ctx, footerX, footerW, "neutral", c, 1);
			if (tailOn) {
				ctx.save();
				ctx.globalAlpha = 0.45 * ease(clamp01((t - UNTIL[2]) / 500));
				ctx.fillStyle = c.line;
				ctx.fillRect(footerX, BAR_Y, footerW, BAR_H);
				ctx.restore();
				// 덩어리마다 한 줄씩 적힌다는 뜻의 눈금
				ctx.save();
				ctx.globalAlpha = ease(clamp01((t - UNTIL[2]) / 500));
				ctx.strokeStyle = c.sub;
				ctx.lineWidth = 1.4;
				for (let g = 0; g < GROUPS; g++) {
					const y = BAR_Y + 10 + g * 6;
					ctx.beginPath();
					ctx.moveTo(footerX + 5, y);
					ctx.lineTo(footerX + footerW - 5, y);
					ctx.stroke();
				}
				ctx.restore();
				ctx.textAlign = "center";
				ctx.font = `600 11px ${FONT}`;
				ctx.fillStyle = c.sub;
				ctx.fillText(L.tail, footerX + footerW / 2, 60);
			}
		}

		// 바깥 테두리
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(MARGIN, BAR_Y, usable, BAR_H, 5);
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.4;
		ctx.stroke();
		ctx.restore();

		// ④ 꼬리가 덩어리마다를 가리킨다 → ⑤ 하나만 남는다
		if (tailOn) {
			const fx = footerX + footerW / 2;
			const pick = ease(clamp01((t - UNTIL[3]) / 600));
			for (let g = 0; g < GROUPS; g++) {
				const chosen = g === HIT;
				const base = ease(clamp01((t - UNTIL[2] - 200) / 600));
				const alpha = step >= 4 ? (chosen ? 1 : base * (1 - pick)) : base;
				drawPointer(
					ctx,
					fx,
					groupX(g) + groupW / 2,
					20 + g * 12,
					chosen && step >= 4 ? c.green : c.sub,
					alpha,
					chosen && step >= 4,
				);
			}
		}

		// ⑤ 고른 덩어리의 열 하나만 읽는다
		if (step >= 4) {
			const p = ease(clamp01((t - UNTIL[3] - 300) / 600));
			const cx = groupX(HIT) + WANT_OFFSET * groupW;
			const cw = FIELDS[WANT].w * groupW;
			ctx.save();
			ctx.globalAlpha = p * 0.3;
			ctx.fillStyle = c.green;
			ctx.fillRect(cx, BAR_Y, cw, BAR_H);
			ctx.globalAlpha = p;
			ctx.beginPath();
			ctx.roundRect(cx, BAR_Y - 1.5, cw, BAR_H + 3, 3);
			ctx.strokeStyle = c.green;
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();
			drawBadge(ctx, w / 2, 172, L.hit, c.greenFill, c.green, p);
		}

		ctx.textAlign = "center";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 20);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function ParquetLayoutDemo({ lang = "ko" }: { lang?: Lang }) {
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

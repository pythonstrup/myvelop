import { type Colors, clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// S3에 놓인 Parquet 파일 하나를 통째로 내려받지 않고 바이트 범위만 골라 받는 과정.
// 꼬리를 먼저 받아 자리를 알아낸 뒤 필요한 열이 든 구간만 덩어리마다 다시 요청한다.
// 위아래 두 막대는 같은 축척이라 아래가 비어 있는 만큼이 안 받은 몫이다.
const UNTIL = [1800, 4000, 6400, 9200, 11800];
const CYCLE = 11800;
const HEIGHT = 262;

const GROUPS = 3;
// 실제 꼬리는 파일의 1%도 안 되지만 그러면 안 보여서 조금 두껍게 그린다.
// 그래서 받은 양 배지도 꼬리를 퍼센트에 섞지 않고 따로 적는다.
const FOOTER_W = 0.02;
const BODY_W = 1 - FOOTER_W;
const GROUP_W = BODY_W / GROUPS;

type Kind = "plain" | "want" | "heavy";
// 폭이 곧 바이트 비중이다. 앞의 열 지향 그림과 같은 비율을 쓴다.
const FIELDS: { w: number; kind: Kind }[] = [
	{ w: 0.08, kind: "plain" },
	{ w: 0.13, kind: "plain" },
	{ w: 0.09, kind: "want" },
	{ w: 0.7, kind: "heavy" },
];
const WANT = 2;
const WANT_OFFSET = FIELDS.slice(0, WANT).reduce((a, f) => a + f.w, 0);
const WANT_W = FIELDS[WANT].w;
const GOT_PCT = Math.round(WANT_W * 100);
const REQUESTS = GROUPS + 1;

const LABELS = {
	ko: {
		captions: [
			"① S3에는 하루치가 파일 하나로 있다",
			"② 엔진은 꼬리부터 범위 요청으로 받는다",
			"③ 꼬리가 status 열의 자리를 알려준다",
			"④ 그 자리만 덩어리마다 다시 요청한다",
			"⑤ 통째로 받지 않아서 이만큼만 넘어온다",
		],
		file: "dt=2026-07-29/data.parquet",
		fStatus: "status",
		fVars: "variables",
		laneA: "S3에 놓인 파일",
		laneB: "실제로 넘어온 바이트",
		tail: "꼬리",
		got: `받은 양 ${GOT_PCT}% + 꼬리 · 요청 ${REQUESTS}번`,
		aria: "S3에 놓인 Parquet 파일 하나를 조회할 때 실제로 어떤 바이트가 넘어오는지 반복 재생하는 애니메이션. 위 막대는 S3에 있는 파일 전체이고 아래 막대는 엔진이 받은 바이트를 같은 축척으로 그린 것이다. 엔진은 파일을 통째로 내려받지 않는다. 먼저 파일 꼬리를 범위 요청으로 받아 어느 덩어리의 어느 자리에 status 열이 있는지 읽고, 그 구간만 덩어리마다 다시 범위 요청으로 받는다. 그래서 파일에서 가장 무거운 variables 열은 한 바이트도 넘어오지 않고, 요청 네 번에 꼬리와 status 열 9%만 전송된다.",
	},
	en: {
		captions: [
			"① One day sits in S3 as a single file",
			"② The engine fetches the footer by range",
			"③ The footer says where the status column is",
			"④ Only those spans are requested, one per group",
			"⑤ Nothing else crosses the wire",
		],
		file: "dt=2026-07-29/data.parquet",
		fStatus: "status",
		fVars: "variables",
		laneA: "the file in S3",
		laneB: "bytes actually transferred",
		tail: "footer",
		got: `${GOT_PCT}% + footer · ${REQUESTS} requests`,
		aria: "Looping animation of which bytes actually cross the wire when a single Parquet file in S3 is queried. The top bar is the whole file as stored; the bottom bar draws the bytes the engine received at the same scale. The engine never downloads the file. It first fetches the footer with a ranged request to learn which row group holds the status column and where, then issues one ranged request per row group for just that span. The heaviest column, variables, is never transferred at all, so four requests move the footer plus the 9% that status occupies.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 12;
const BAR_H = 30;
const SRC_Y = 66;
const SRC_BOTTOM = SRC_Y + BAR_H;
const GOT_Y = 150;
// 아래 막대의 라벨은 막대 밑에 둔다. 위에 두면 내려오는 화살표가 글자를 관통한다.
const GOT_BOTTOM = GOT_Y + BAR_H;

const fade = (t: number, at: number, dur = 500) => ease(clamp01((t - at) / dur));

function fillSeg(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	kind: Kind | "neutral",
	c: Colors,
) {
	ctx.beginPath();
	ctx.rect(x, y, w, BAR_H);
	ctx.fillStyle = kind === "heavy" ? c.amberFill : kind === "want" ? c.blueFill : c.boxFill;
	ctx.fill();
	ctx.strokeStyle = kind === "heavy" ? c.amber : kind === "want" ? c.blue : c.line;
	ctx.lineWidth = 0.9;
	ctx.stroke();
}

// 받아온 조각. 원래 있던 x 자리 그대로 아래 막대에 놓아 어디서 왔는지 보이게 한다.
function drawGot(ctx: CanvasRenderingContext2D, x: number, w: number, c: Colors, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.rect(x, GOT_Y, w, BAR_H);
	ctx.fillStyle = c.greenFill;
	ctx.fill();
	ctx.strokeStyle = c.green;
	ctx.lineWidth = 1.4;
	ctx.stroke();
	ctx.restore();
}

// 요청 하나가 내려오는 자리를 짧은 화살표로 짚는다.
function drawRequest(ctx: CanvasRenderingContext2D, cx: number, c: Colors, alpha: number) {
	if (alpha <= 0) return;
	const top = SRC_BOTTOM + 8;
	const tip = GOT_Y - 8;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = c.green;
	ctx.lineWidth = 1.4;
	ctx.beginPath();
	ctx.moveTo(cx, top);
	ctx.lineTo(cx, tip - 5);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(cx, tip);
	ctx.lineTo(cx - 4, tip - 6);
	ctx.lineTo(cx + 4, tip - 6);
	ctx.closePath();
	ctx.fillStyle = c.green;
	ctx.fill();
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

		const groupW = GROUP_W * usable;
		const groupX = (g: number) => MARGIN + g * groupW;
		const wantX = (g: number) => groupX(g) + WANT_OFFSET * groupW;
		const wantW = WANT_W * groupW;
		const footerX = MARGIN + BODY_W * usable;
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

		// 위: S3에 놓인 파일 전체
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.laneA, MARGIN, SRC_Y - 14);
		for (let g = 0; g < GROUPS; g++) {
			let x = groupX(g);
			for (const f of FIELDS) {
				fillSeg(ctx, x, SRC_Y, f.w * groupW, f.kind, c);
				x += f.w * groupW;
			}
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(groupX(g) + groupW, SRC_Y);
			ctx.lineTo(groupX(g) + groupW, SRC_BOTTOM);
			ctx.strokeStyle = c.sub;
			ctx.lineWidth = 1.6;
			ctx.stroke();
			ctx.restore();
		}
		fillSeg(ctx, footerX, SRC_Y, footerW, "neutral", c);
		ctx.textAlign = "right";
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(L.tail, w - MARGIN, SRC_Y - 14);

		// ③ 꼬리가 짚어준 자리를 파일 위에 표시한다
		if (step >= 2) {
			ctx.save();
			ctx.globalAlpha = fade(t, UNTIL[1], 400);
			ctx.setLineDash([3, 3]);
			ctx.strokeStyle = c.green;
			ctx.lineWidth = 1.6;
			for (let g = 0; g < GROUPS; g++) {
				ctx.beginPath();
				ctx.rect(wantX(g) - 1, SRC_Y - 2, wantW + 2, BAR_H + 4);
				ctx.stroke();
			}
			ctx.restore();
		}

		// 아래: 같은 축척으로 그린, 실제로 넘어온 바이트
		ctx.textAlign = "left";
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.laneB, MARGIN, GOT_BOTTOM + 14);
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(MARGIN, GOT_Y, usable, BAR_H, 4);
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.2;
		ctx.stroke();
		ctx.restore();

		// ② 꼬리부터 받는다
		if (step >= 1) {
			const a = fade(t, UNTIL[0]);
			drawGot(ctx, footerX, footerW, c, a);
			drawRequest(ctx, footerX + footerW / 2, c, a);
		}

		// ④ 필요한 열이 든 구간만 덩어리마다 받는다
		if (step >= 3) {
			for (let g = 0; g < GROUPS; g++) {
				const a = fade(t, UNTIL[2] + g * 260, 420);
				drawGot(ctx, wantX(g), wantW, c, a);
				drawRequest(ctx, wantX(g) + wantW / 2, c, a);
			}
		}

		if (step >= 4) {
			drawBadge(ctx, w / 2, GOT_BOTTOM + 36, L.got, c.greenFill, c.green, fade(t, UNTIL[3], 400));
		}

		ctx.textAlign = "center";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function RangeReadDemo({ lang = "ko" }: { lang?: Lang }) {
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

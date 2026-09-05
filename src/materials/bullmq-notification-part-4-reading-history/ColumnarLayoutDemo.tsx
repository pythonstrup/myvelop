import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 같은 레코드 넷을 물리적 바이트 순서 그대로 두 방향으로 늘어놓는다.
// 세그먼트 열여섯 개는 양쪽이 똑같고 순서만 다르다.
// 행 지향은 status 가 레코드마다 흩어져 전부 읽어야 하고,
// 열 지향은 같은 필드가 모여 있어 status 블록 하나만 읽으면 끝난다.
const UNTIL = [2000, 4200, 6800, 9400, 11800];
const CYCLE = 11800;
const HEIGHT = 252;

const RECORDS = 4;
type Kind = "plain" | "want" | "heavy";

// 필드별 바이트 비중. variables 가 압도적으로 크고 status 는 얇다.
const FIELDS: { key: string; w: number; kind: Kind }[] = [
	{ key: "user_id", w: 0.08, kind: "plain" },
	{ key: "phone", w: 0.13, kind: "plain" },
	{ key: "status", w: 0.09, kind: "want" },
	{ key: "variables", w: 0.7, kind: "heavy" },
];
const WANT = 2;
const WANT_OFFSET = FIELDS.slice(0, WANT).reduce((a, f) => a + f.w, 0);
const WANT_W = FIELDS[WANT].w;
const DICT_RATIO = 0.3; // 사전 인코딩 뒤 남는 몫(예시)

type Seg = { w: number; kind: Kind; groupEnd: boolean };
const ROW_SEGS: Seg[] = [];
for (let r = 0; r < RECORDS; r++) {
	FIELDS.forEach((f, i) => {
		ROW_SEGS.push({ w: f.w / RECORDS, kind: f.kind, groupEnd: i === FIELDS.length - 1 });
	});
}
const COL_SEGS: Seg[] = [];
for (const f of FIELDS) {
	for (let r = 0; r < RECORDS; r++) {
		COL_SEGS.push({ w: f.w / RECORDS, kind: f.kind, groupEnd: r === RECORDS - 1 });
	}
}

const LABELS = {
	ko: {
		captions: [
			"① 같은 레코드 넷을 두 방향으로 늘어놓는다",
			"② 필요한 건 status 하나다",
			"③ 행 지향은 값이 흩어져 전부 읽는다",
			"④ 열 지향은 status 블록만 읽는다",
			"⑤ 같은 값이 이웃해 있어 압축까지 먹는다",
		],
		query: "status = 'FAILED'",
		laneA: "행 지향 · 한 수신자의 모든 필드가 붙는다",
		laneB: "열 지향 · 같은 필드끼리 모인다",
		fStatus: "status",
		fVars: "variables",
		readAll: "읽은 양 100%",
		readCol: (n: number) => `읽은 양 ${n}%`,
		dict: "사전 인코딩",
		aria: "같은 레코드 넷의 바이트를 두 가지 순서로 늘어놓고 같은 조회를 거는 애니메이션. 필드는 user_id, phone, status, variables 넷이고 variables가 전체 바이트의 대부분을 차지한다. 행 지향은 수신자 한 명의 네 필드가 통째로 붙어 반복되므로 status 값이 파일 전체에 흩어지고, 저장소는 블록 단위로 읽기 때문에 조회에 쓰이지 않는 variables까지 전부 끌려와 100%를 읽는다. 열 지향은 같은 필드끼리 모여 있어 status 블록 하나만 읽으면 되고 읽는 양이 9%로 줄어든다. 나아가 같은 값이 이웃해 있어 사전 인코딩이 걸리므로 그 블록조차 더 작아진다.",
	},
	en: {
		captions: [
			"① The same four records, laid out two ways",
			"② All the query needs is status",
			"③ Row-major scatters it — everything is read",
			"④ Column-major reads only the status block",
			"⑤ Neighbouring values compress, too",
		],
		query: "status = 'FAILED'",
		laneA: "row-major · one recipient's fields stay together",
		laneB: "column-major · same field, side by side",
		fStatus: "status",
		fVars: "variables",
		readAll: "100% read",
		readCol: (n: number) => `${n}% read`,
		dict: "dictionary encoded",
		aria: "Looping animation laying the bytes of the same four records out in two physical orders and running the same query over both. The fields are user_id, phone, status and variables, and variables dominates the byte count. In row-major order all four fields of one recipient sit together and repeat, so status values are scattered across the file; because storage reads in blocks, the unused variables column is dragged along and 100% of the bytes are read. In column-major order the same field sits contiguously, so only the status block is read and the volume drops to 9%. Neighbouring values also compress, so dictionary encoding shrinks even that block.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 12;
const TAPE_H = 28;
const LANE_A_Y = 62;
const LANE_B_Y = 152;

function drawTape(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	segs: Seg[],
	c: Colors,
	wantOn: boolean,
) {
	ctx.save();
	let cx = x;
	for (const s of segs) {
		const sw = s.w * w;
		const heavy = s.kind === "heavy";
		const want = s.kind === "want" && wantOn;
		ctx.beginPath();
		ctx.rect(cx, y, sw, TAPE_H);
		ctx.fillStyle = heavy ? c.amberFill : want ? c.blueFill : c.boxFill;
		ctx.fill();
		ctx.strokeStyle = heavy ? c.amber : want ? c.blue : c.line;
		ctx.lineWidth = 0.8;
		ctx.stroke();
		cx += sw;
		// 레코드(행 지향) 또는 필드(열 지향)가 끝나는 자리를 굵게 끊는다.
		if (s.groupEnd) {
			ctx.beginPath();
			ctx.moveTo(cx, y);
			ctx.lineTo(cx, y + TAPE_H);
			ctx.strokeStyle = c.sub;
			ctx.lineWidth = 1.6;
			ctx.stroke();
		}
	}
	ctx.beginPath();
	ctx.roundRect(x, y, w, TAPE_H, 4);
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1.4;
	ctx.stroke();
	ctx.restore();
}

// 읽어간 구간을 테이프 위에 덮어 보인다.
function drawRead(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	color: string,
	alpha: number,
) {
	if (w <= 0 || alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha * 0.26;
	ctx.fillStyle = color;
	ctx.fillRect(x, y, w, TAPE_H);
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(x, y - 1, w, TAPE_H + 2, 4);
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.stroke();
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

		// 조회 조건과 색 범례
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = step >= 1 ? c.blue : c.sub;
		ctx.fillText(L.query, MARGIN, 18);
		drawLegend(ctx, w - MARGIN, 18, c, [
			{ label: L.fStatus, color: c.blue, fill: c.blueFill },
			{ label: L.fVars, color: c.amber, fill: c.amberFill },
		]);

		// 두 레인 제목과 테이프
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.laneA, MARGIN, LANE_A_Y - 14);
		ctx.fillText(L.laneB, MARGIN, LANE_B_Y - 14);
		drawTape(ctx, MARGIN, LANE_A_Y, usable, ROW_SEGS, c, step >= 1);
		drawTape(ctx, MARGIN, LANE_B_Y, usable, COL_SEGS, c, step >= 1);

		// ③ 행 지향은 왼쪽부터 끝까지 훑는다
		if (step >= 2) {
			const p = ease(clamp01((t - UNTIL[1]) / 900));
			drawRead(ctx, MARGIN, LANE_A_Y, usable * p, c.red, 1);
			drawBadge(
				ctx,
				MARGIN + usable / 2,
				LANE_A_Y + TAPE_H + 17,
				L.readAll,
				c.redFill,
				c.red,
				clamp01((t - UNTIL[1] - 700) / 400),
			);
		}

		// ④ 열 지향은 status 블록만, ⑤ 사전 인코딩으로 그마저 줄어든다
		if (step >= 3) {
			const dict = step >= 4 ? ease(clamp01((t - UNTIL[3]) / 700)) : 0;
			const blockX = MARGIN + WANT_OFFSET * usable;
			const blockW = WANT_W * usable;
			if (dict > 0) {
				ctx.save();
				ctx.globalAlpha = 0.7;
				ctx.setLineDash([3, 3]);
				ctx.beginPath();
				ctx.roundRect(blockX, LANE_B_Y - 1, blockW, TAPE_H + 2, 4);
				ctx.strokeStyle = c.sub;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.restore();
			}
			drawRead(
				ctx,
				blockX,
				LANE_B_Y,
				blockW * lerp(1, DICT_RATIO, dict),
				c.green,
				ease(clamp01((t - UNTIL[2]) / 600)),
			);
			drawBadge(
				ctx,
				MARGIN + usable / 2,
				LANE_B_Y + TAPE_H + 17,
				step >= 4 ? L.dict : L.readCol(Math.round(WANT_W * 100)),
				c.greenFill,
				c.green,
				clamp01((t - UNTIL[2] - 400) / 400),
			);
		}

		ctx.textAlign = "center";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 20);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function ColumnarLayoutDemo({ lang = "ko" }: { lang?: Lang }) {
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

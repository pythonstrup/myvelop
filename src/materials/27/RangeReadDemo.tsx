import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// HTTP Range: 파일 = 주소가 붙은 바이트의 줄. Range 헤더에 주소를 적으면
// 서버가 206 Partial Content로 그 구간만 잘라 보낸다.
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
const UNTIL = [3000, 6800, 9800, 13800, 17800, 20800];
const CYCLE = 20800;
const HEIGHT = 300;

const TOTAL = 1000;
const SPAN = [600, 800]; // 받고 싶은 구간: 주소 600 ~ 799 (200바이트)

const LABELS = {
	ko: {
	captions: [
		"① 파일은 바이트가 한 줄로 늘어선 것이고, 바이트마다 주소가 있다",
		"② 그냥 GET을 보내면 1,000바이트 전부가 내려온다",
		"③ 그런데 필요한 건 주소 600~799의 200바이트뿐이다",
		"④ Range 헤더에 바이트 주소를 적어서 보낸다",
		"⑤ 서버는 206 Partial Content로 딱 그 구간만 잘라 보낸다",
		"⑥ 주소만 알면 조각만 받는다 — S3가 이 헤더를 그대로 지원한다",
	],
	laneA: "서버의 파일 data.bin — 1,000바이트",
	laneB: "클라이언트가 받은 바이트",
	spanLabel: "600–799",
	gotAll: "전송 1,000바이트 · 100%",
	gotSpan: "전송 200바이트 · 20%",
	reqPlain: "GET /data.bin",
	respPlain: "→ 200 OK (1,000바이트 전부)",
	reqRange: "Range: bytes=600-799",
	respRange1: "→ 206 Partial Content",
	respRange2: "Content-Range: bytes 600-799/1000",
	aria: "HTTP Range 요청의 원리를 반복 재생하는 애니메이션. 서버에 있는 1,000바이트 파일을 바이트가 한 줄로 늘어선 막대로 그리고, 아래에 0부터 1,000까지 주소 눈금을 붙였다. 그냥 GET을 보내면 1,000바이트 전부가 내려온다. 필요한 것이 주소 600에서 799까지의 200바이트뿐이라면, 요청에 Range: bytes=600-799 헤더를 붙여 바이트 주소로 구간을 지정한다. 서버는 206 Partial Content 상태 코드와 Content-Range 헤더로 딱 그 구간만 잘라 보낸다. 전송량은 전체의 20%인 200바이트다. S3가 이 헤더를 그대로 지원해서 조회 엔진이 파일 꼬리나 필요한 열만 집어올 수 있다.",
},
	en: {
		captions: [
			"\u2460 A file is a line of bytes, each with an address",
			"\u2461 A plain GET pulls down all 1,000 bytes",
			"\u2462 But only bytes 600\u2013799 are needed \u2014 200 bytes",
			"\u2463 Put the byte range in a Range header",
			"\u2464 The server returns 206 Partial Content, just that slice",
			"\u2465 Know the address, fetch the slice \u2014 S3 supports this as is",
		],
		laneA: "the file on the server, data.bin \u2014 1,000 bytes",
		laneB: "bytes the client received",
		spanLabel: "600\u2013799",
		gotAll: "1,000 bytes sent \u00b7 100%",
		gotSpan: "200 bytes sent \u00b7 20%",
		reqPlain: "GET /data.bin",
		respPlain: "\u2192 200 OK (all 1,000 bytes)",
		reqRange: "Range: bytes=600-799",
		respRange1: "\u2192 206 Partial Content",
		respRange2: "Content-Range: bytes 600-799/1000",
		aria: "Looping animation of how an HTTP Range request works. A 1,000-byte file on the server is drawn as a bar of bytes with an address ruler from 0 to 1,000. A plain GET pulls down all 1,000 bytes. When only addresses 600 to 799 are needed, the request carries a Range: bytes=600-799 header, and the server answers 206 Partial Content with a Content-Range header, sending exactly that slice \u2014 200 bytes, 20% of the file. S3 supports this header as is, which is how query engines fetch just a Parquet file's footer or the columns they need.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 14;
const BAR_H = 30;
const FILE_Y = 52;
const FILE_BOTTOM = FILE_Y + BAR_H;
const RULER_Y = FILE_BOTTOM + 16;
const CARD_TOP = 122;
const LINE_H = 17;
const CLIENT_Y = 208;
const CLIENT_BOTTOM = CLIENT_Y + BAR_H;
const BADGE_Y = CLIENT_BOTTOM + 20;
const ARROW_FRAC = 0.72; // 전송 화살표를 카드 오른쪽 빈 공간에 둔다

const fade = (t: number, at: number, dur = 500) => ease(clamp01((t - at) / dur));

function drawArrowDown(
	ctx: CanvasRenderingContext2D,
	x: number,
	y1: number,
	y2: number,
	color: string,
	alpha: number,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.6;
	ctx.beginPath();
	ctx.moveTo(x, y1);
	ctx.lineTo(x, y2 - 7);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x, y2);
	ctx.lineTo(x - 4.5, y2 - 7);
	ctx.lineTo(x + 4.5, y2 - 7);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
}

type CardLine = { text: string; color: string; alpha: number };

// HTTP 요청/응답 카드. 줄마다 색과 등장 시각을 따로 준다.
function drawCard(
	ctx: CanvasRenderingContext2D,
	x: number,
	top: number,
	lines: CardLine[],
	c: ReturnType<typeof palette>,
	alpha: number,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.font = `600 11px ${MONO}`;
	const wMax = Math.max(...lines.map((l) => ctx.measureText(l.text).width));
	const cw = wMax + 24;
	const ch = lines.length * LINE_H + 14;
	ctx.beginPath();
	ctx.roundRect(x, top, cw, ch, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1.1;
	ctx.stroke();
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	lines.forEach((l, i) => {
		ctx.save();
		ctx.globalAlpha = alpha * l.alpha;
		ctx.fillStyle = l.color;
		ctx.fillText(l.text, x + 12, top + 14 + i * LINE_H);
		ctx.restore();
	});
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const usable = w - MARGIN * 2;
	const ax = (addr: number) => MARGIN + (addr / TOTAL) * usable; // 바이트 주소 → x 좌표
	const step = UNTIL.findIndex((u) => t < u);

	// 위: 서버의 파일
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	ctx.font = `600 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.laneA, MARGIN, FILE_Y - 16);
	ctx.beginPath();
	ctx.roundRect(MARGIN, FILE_Y, usable, BAR_H, 4);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1.1;
	ctx.stroke();

	// 주소 눈금자 — Range의 핵심인 바이트 주소
	ctx.font = `500 10px ${MONO}`;
	ctx.fillStyle = c.sub;
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.textAlign = "center";
	for (let a = 0; a <= TOTAL; a += 200) {
		ctx.beginPath();
		ctx.moveTo(ax(a), FILE_BOTTOM);
		ctx.lineTo(ax(a), FILE_BOTTOM + 5);
		ctx.stroke();
		ctx.fillText(String(a), ax(a), RULER_Y);
	}

	// ③부터: 필요한 구간을 파일 위에 표시
	if (step >= 2) {
		const a = fade(t, UNTIL[1], 400);
		ctx.save();
		ctx.globalAlpha = a;
		ctx.beginPath();
		ctx.rect(ax(SPAN[0]), FILE_Y, ax(SPAN[1]) - ax(SPAN[0]), BAR_H);
		ctx.fillStyle = c.blueFill;
		ctx.fill();
		ctx.setLineDash([4, 3]);
		ctx.strokeStyle = c.blue;
		ctx.lineWidth = 1.6;
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.font = `700 11px ${MONO}`;
		ctx.fillStyle = c.blue;
		ctx.textAlign = "center";
		ctx.fillText(L.spanLabel, (ax(SPAN[0]) + ax(SPAN[1])) / 2, FILE_Y + BAR_H / 2);
		ctx.restore();
	}

	// 아래: 클라이언트가 받은 바이트 (같은 축척)
	ctx.textAlign = "left";
	ctx.font = `600 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.laneB, MARGIN, CLIENT_BOTTOM + 16);
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(MARGIN, CLIENT_Y, usable, BAR_H, 4);
	ctx.setLineDash([4, 4]);
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1.2;
	ctx.stroke();
	ctx.restore();

	// ② 그냥 GET — 전부 내려온다 (③에서 지운다)
	if (step >= 1) {
		const a = fade(t, UNTIL[0] + 900, 600) * (1 - fade(t, UNTIL[1], 400));
		if (a > 0) {
			drawArrowDown(ctx, ax(TOTAL * ARROW_FRAC), FILE_BOTTOM + 22, CLIENT_Y - 6, c.green, a);
			ctx.save();
			ctx.globalAlpha = a;
			ctx.beginPath();
			ctx.roundRect(MARGIN, CLIENT_Y, usable, BAR_H, 4);
			ctx.fillStyle = c.greenFill;
			ctx.fill();
			ctx.strokeStyle = c.green;
			ctx.lineWidth = 1.4;
			ctx.stroke();
			ctx.restore();
			drawBadge(ctx, w / 2, BADGE_Y, L.gotAll, c.boxFill, c.sub, a);
		}
	}

	// ⑤ Range 응답 — 그 구간만 내려온다
	if (step >= 4) {
		const a = fade(t, UNTIL[3] + 700, 600);
		drawArrowDown(ctx, (ax(SPAN[0]) + ax(SPAN[1])) / 2, FILE_BOTTOM + 22, CLIENT_Y - 6, c.green, a);
		ctx.save();
		ctx.globalAlpha = a;
		ctx.beginPath();
		ctx.rect(ax(SPAN[0]), CLIENT_Y, ax(SPAN[1]) - ax(SPAN[0]), BAR_H);
		ctx.fillStyle = c.greenFill;
		ctx.fill();
		ctx.strokeStyle = c.green;
		ctx.lineWidth = 1.4;
		ctx.stroke();
		ctx.font = `700 11px ${MONO}`;
		ctx.fillStyle = c.green;
		ctx.textAlign = "center";
		ctx.fillText(L.spanLabel, (ax(SPAN[0]) + ax(SPAN[1])) / 2, CLIENT_Y + BAR_H / 2);
		ctx.restore();
		drawBadge(ctx, w / 2, BADGE_Y, L.gotSpan, c.greenFill, c.green, a);
	}

	// HTTP 카드 — 단계에 맞는 요청/응답 헤더를 보여준다
	let lines: CardLine[] | null = null;
	if (step === 1) {
		lines = [
			{ text: L.reqPlain, color: c.text, alpha: 1 },
			{ text: L.respPlain, color: c.sub, alpha: fade(t, UNTIL[0] + 700, 400) },
		];
	} else if (step >= 3) {
		lines = [
			{ text: L.reqPlain, color: c.text, alpha: 1 },
			{ text: L.reqRange, color: c.blue, alpha: fade(t, UNTIL[2] + 500, 400) },
		];
		if (step >= 4) {
			lines.push(
				{ text: L.respRange1, color: c.green, alpha: fade(t, UNTIL[3] + 200, 400) },
				{ text: L.respRange2, color: c.green, alpha: fade(t, UNTIL[3] + 500, 400) },
			);
		}
	}
	if (lines) drawCard(ctx, MARGIN, CARD_TOP, lines, c, fade(t, step === 1 ? UNTIL[0] : UNTIL[2], 300));

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

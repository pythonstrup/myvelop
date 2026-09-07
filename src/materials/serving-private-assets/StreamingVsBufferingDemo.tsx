import { type Colors, drawBadge, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 버퍼링과 스트리밍을 나란히 재생하는 데모. 매 사이클 같은 장면을 보여주는 결정적 애니메이션이다.
const UNTIL = [1200, 3600, 6000, 7600, 9000];
const CYCLE = 9000;
const HEIGHT = 236;
const FILL_DONE = 6000; // 버퍼링이 200MB를 다 받는 시각
const SEND_END = 7600; // 버퍼링이 브라우저로 다 보낸 시각
const STREAM_START = 500; // 스트리밍이 브라우저로 흘리기 시작하는 시각

const LABELS = {
	ko: {
		captions: [
			"① 두 방식 모두 S3에서 첫 청크를 받는다",
			"② 스트리밍은 곧바로 브라우저로 흘리고, 버퍼링은 서버에 쌓는다",
			"③ 스트리밍은 이미 재생 중이고, 버퍼링은 아직 쌓고 있다",
			"④ 200MB를 다 받은 버퍼링이 그제야 한 번에 내보낸다",
			"⑤ 첫 바이트까지 스트리밍 23ms, 버퍼링 5,154ms",
		],
		laneBuffer: "버퍼링",
		laneStream: "스트리밍",
		server: "앱 서버",
		browser: "브라우저",
		stacking: "쌓는 중",
		stacked: "200MB",
		stackedDone: "200MB 다 받음",
		chunkOnly: "청크만 지나감",
		waiting: "대기",
		playing: "재생 중",
		firstByteStream: "첫 바이트 23ms",
		firstByteBuffer: "첫 바이트 5,154ms",
		aria: "버퍼링과 스트리밍을 위아래로 나란히 놓고 반복 재생하는 애니메이션. 버퍼링은 S3에서 받은 200MB를 앱 서버에 전부 쌓은 뒤에야 브라우저로 한 번에 보내서 첫 바이트까지 5,154밀리초가 걸리고, 스트리밍은 받은 청크를 곧바로 흘려보내 23밀리초 만에 재생이 시작된다.",
	},
	en: {
		captions: [
			"① Both receive the first chunk from S3",
			"② Streaming forwards it, buffering stacks it up",
			"③ Streaming is playing, buffering is still stacking",
			"④ Buffering sends only once all 200MB has arrived",
			"⑤ First byte: streaming 23ms, buffering 5,154ms",
		],
		laneBuffer: "Buffering",
		laneStream: "Streaming",
		server: "App server",
		browser: "Browser",
		stacking: "stacking",
		stacked: "200MB",
		stackedDone: "200MB received",
		chunkOnly: "chunks only",
		waiting: "waiting",
		playing: "playing",
		firstByteStream: "first byte 23ms",
		firstByteBuffer: "first byte 5,154ms",
		aria: "Animation replaying buffering and streaming one above the other. Buffering stacks all 200MB from S3 on the app server before sending it to the browser at once, so the first byte takes 5,154 milliseconds, while streaming forwards each chunk as it arrives and playback starts in 23 milliseconds.",
	},
} as const;
type Lang = keyof typeof LABELS;

function drawBox(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	w: number,
	h: number,
	title: string,
	sub: string,
	c: Colors,
	stroke = c.boxStroke,
) {
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 12px ${FONT}`;
	ctx.fillText(title, cx, cy - 7);
	ctx.fillStyle = c.sub;
	ctx.font = `400 10px ${FONT}`;
	ctx.fillText(sub, cx, cy + 9);
}

// xA에서 xB로 끊임없이 흘러가는 청크. period마다 한 칸씩 진행한다.
function drawChunks(
	ctx: CanvasRenderingContext2D,
	xA: number,
	xB: number,
	y: number,
	t: number,
	color: string,
	count: number,
	period: number,
) {
	for (let i = 0; i < count; i++) {
		const phase = (t / period + i / count) % 1;
		ctx.beginPath();
		ctx.roundRect(lerp(xA, xB, phase) - 4, y - 4, 8, 8, 2);
		ctx.fillStyle = color;
		ctx.fill();
	}
}

function drawGauge(
	ctx: CanvasRenderingContext2D,
	cx: number,
	y: number,
	w: number,
	ratio: number,
	c: Colors,
	color: string,
) {
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, y, w, 4, 2);
	ctx.fillStyle = c.boxStroke;
	ctx.fill();
	if (ratio <= 0) return;
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, y, w * ratio, 4, 2);
	ctx.fillStyle = color;
	ctx.fill();
}

// 좁은 화면에서 배지가 캔버스 밖으로 밀리지 않게 중심을 안쪽으로 당긴다.
function badgeX(ctx: CanvasRenderingContext2D, label: string, cx: number, w: number) {
	ctx.font = `600 10.5px ${FONT}`;
	const half = (ctx.measureText(label).width + 14) / 2;
	return Math.min(cx, w - 6 - half);
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const boxW = Math.min(116, (w - margin * 2) / 3 - 22);
		const boxH = 44;
		const cyBuf = 62;
		const cyStream = 152;

		const s3X = margin + boxW / 2;
		const srvX = w / 2;
		const brwX = w - margin - boxW / 2;
		const lA = s3X + boxW / 2 + 6;
		const lB = srvX - boxW / 2 - 6;
		const rA = srvX + boxW / 2 + 6;
		const rB = brwX - boxW / 2 - 6;

		const step = UNTIL.findIndex((u) => t < u);
		const fillRatio = Math.min(1, t / FILL_DONE);
		const sending = t >= FILL_DONE && t < SEND_END;
		const delivered = t >= SEND_END;
		const streaming = t >= STREAM_START;

		// 두 레인의 연결선
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		for (const cy of [cyBuf, cyStream]) {
			ctx.moveTo(lA, cy);
			ctx.lineTo(lB, cy);
			ctx.moveTo(rA, cy);
			ctx.lineTo(rB, cy);
		}
		ctx.stroke();

		// 레인 이름
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(L.laneBuffer, margin, cyBuf - boxH / 2 - 12);
		ctx.fillText(L.laneStream, margin, cyStream - boxH / 2 - 12);

		// 버퍼링 레인 — S3에서 서버로는 계속 들어오지만 서버에서 브라우저로는 안 나간다
		if (!delivered) drawChunks(ctx, lA, lB, cyBuf, t, c.amber, 4, 1400);
		if (sending) {
			const p = (t - FILL_DONE) / (SEND_END - FILL_DONE);
			const x = lerp(rA, rB, p);
			ctx.beginPath();
			ctx.roundRect(x - 15, cyBuf - 8, 30, 16, 4);
			ctx.fillStyle = c.amberFill;
			ctx.fill();
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 1;
			ctx.stroke();
		}

		// 스트리밍 레인 — 양쪽 구간에 청크가 동시에 흐른다
		drawChunks(ctx, lA, lB, cyStream, t, c.blue, 4, 1400);
		if (streaming) drawChunks(ctx, rA, rB, cyStream, t - STREAM_START, c.blue, 4, 1400);

		drawBox(ctx, s3X, cyBuf, boxW, boxH, "S3", L.stacked, c);
		drawBox(
			ctx,
			srvX,
			cyBuf,
			boxW,
			boxH,
			L.server,
			fillRatio >= 1 ? L.stackedDone : `${Math.round(fillRatio * 200)}MB ${L.stacking}`,
			c,
			c.amber,
		);
		drawBox(ctx, brwX, cyBuf, boxW, boxH, L.browser, delivered ? L.playing : L.waiting, c);
		drawGauge(ctx, srvX, cyBuf + boxH / 2 + 7, boxW, delivered ? 1 : fillRatio, c, c.amber);

		drawBox(ctx, s3X, cyStream, boxW, boxH, "S3", L.stacked, c);
		drawBox(ctx, srvX, cyStream, boxW, boxH, L.server, L.chunkOnly, c, c.blue);
		drawBox(
			ctx,
			brwX,
			cyStream,
			boxW,
			boxH,
			L.browser,
			streaming ? L.playing : L.waiting,
			c,
			streaming ? c.green : c.boxStroke,
		);
		drawGauge(ctx, srvX, cyStream + boxH / 2 + 7, boxW, 0.06, c, c.blue);

		// 첫 바이트가 닿은 순간부터 배지를 띄운다
		if (delivered) {
			const bx = badgeX(ctx, L.firstByteBuffer, brwX, w);
			drawBadge(ctx, bx, cyBuf - boxH / 2 - 13, L.firstByteBuffer, c.amberFill, c.amber, 1);
		}
		if (streaming) {
			const sx = badgeX(ctx, L.firstByteStream, brwX, w);
			drawBadge(ctx, sx, cyStream - boxH / 2 - 13, L.firstByteStream, c.greenFill, c.green, 1);
		}

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 22);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function StreamingVsBufferingDemo({ lang = "ko" }: { lang?: Lang }) {
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

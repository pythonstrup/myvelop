import { clamp01, FONT, palette, useCanvasScene } from "@/materials/shared";
import { BINARIZED_LINES, pixelGrid } from "./binarizedLines";

// RNN이 칸을 차례로 읽으며 기억(은닉 상태 h)을 다음 칸으로 넘기는 과정을 반복 재생한다. 왼쪽부터 한 번 읽은 뒤, 양방향으로 뒤에서 앞으로도 한 번 더 읽는다.
// 칸은 CtcDecodeDemo와 같이 "계약을"(0~63열)을 8열씩 나눈 것이고, 칸마다 고른 글자도 같은 설명용 값이다.
// 화살표 위 막대 넷은 기억을 그림으로 보인 것이다. 칸을 위아래 네 띠로 나눠 검은 픽셀 비율을 앞 칸의 기억과 섞은 값으로, 실제 은닉 상태의 값은 아니다.
const GRID = pixelGrid(BINARIZED_LINES.ko, 0, 63);
const TOKENS = ["계", "계", "-", "약", "약", "-", "을", "을"];
const N = TOKENS.length;
const SLICE = GRID.w / N;
const BANDS = 4;

const MEMORY = (() => {
	const out: number[][] = [];
	let m = Array<number>(BANDS).fill(0);
	for (let col = 0; col < N; col++) {
		const f = Array<number>(BANDS).fill(0);
		for (let y = 0; y < GRID.h; y++)
			for (let x = col * SLICE; x < (col + 1) * SLICE; x++) if (GRID.at(x, y)) f[Math.floor((y * BANDS) / GRID.h)] += 1 / 16;
		m = m.map((v, k) => Math.min(1, 0.55 * v + 0.6 * f[k]));
		out.push(m);
	}
	return out;
})();

const FWD = 650;
const BWD = 420;
const FWD_END = N * FWD;
const BWD_START = FWD_END + 700;
const BWD_END = BWD_START + N * BWD;
const CYCLE = BWD_END + 2200;
const HEIGHT = 330;
const TOKEN_Y = 34;
const TOKEN_H = 28;
const RNN_Y = 108;
const RNN_H = 34;
const IMG_Y = 186;
const ARIA =
	"RNN이 줄 이미지를 여덟 칸으로 나눠 왼쪽부터 차례로 읽는 애니메이션. 칸마다 같은 RNN이 이번 칸의 특징과 앞 칸에서 넘어온 기억 h를 함께 보고 글자를 고른다. 계, 계, 빈칸, 약, 약, 빈칸, 을, 을을 고른 뒤, 양방향 RNN처럼 오른쪽에서 왼쪽으로도 한 번 더 읽어 뒤쪽 맥락까지 함께 쓴다.";

function caption(t: number, fw: number) {
	if (t < FWD_END) return `칸 ${fw + 1}: 이번 칸과 앞 칸까지의 기억(h)을 함께 보고 고른다`;
	if (t < BWD_START) return "모든 칸이 같은 가중치의 RNN을 거친다";
	if (t < BWD_END) return "양방향: 뒤에서 앞으로도 한 번 더 읽는다";
	return "칸마다 앞과 뒤의 맥락을 함께 써서 글자를 고른다";
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
	const a = Math.atan2(y2 - y1, x2 - x1);
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2 - 5 * Math.cos(a), y2 - 5 * Math.sin(a));
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x2, y2);
	ctx.lineTo(x2 - 8 * Math.cos(a - 0.45), y2 - 8 * Math.sin(a - 0.45));
	ctx.lineTo(x2 - 8 * Math.cos(a + 0.45), y2 - 8 * Math.sin(a + 0.45));
	ctx.closePath();
	ctx.fill();
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const pitch = Math.min(84, (w - 24) / N);
	const boxW = pitch * 0.72;
	const left = (w - pitch * N) / 2;
	const cx = (i: number) => left + pitch * (i + 0.5);
	const fw = Math.min(N, Math.floor(t / FWD));
	const bw = t >= BWD_START ? Math.min(N, Math.floor((t - BWD_START) / BWD)) : 0;
	const active = t < FWD_END ? fw : t >= BWD_START && t < BWD_END ? N - 1 - bw : -1;
	const sc = Math.min(3, (boxW - 8) / SLICE);

	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	ctx.font = `500 11px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText("칸마다 고른 글자", left, TOKEN_Y - 8);

	for (let i = 0; i < N; i++) {
		const x = cx(i);
		const read = i < fw;
		const on = i === active;

		// 칸 이미지
		ctx.beginPath();
		ctx.roundRect(x - boxW / 2, IMG_Y, boxW, GRID.h * sc + 12, 6);
		ctx.fillStyle = on ? c.blueFill : c.boxFill;
		ctx.fill();
		ctx.strokeStyle = on ? c.blue : c.boxStroke;
		ctx.lineWidth = on ? 2 : 1;
		ctx.stroke();
		ctx.fillStyle = c.text;
		const ix = x - (SLICE * sc) / 2;
		for (let y = 0; y < GRID.h; y++)
			for (let k = 0; k < SLICE; k++)
				if (GRID.at(i * SLICE + k, y)) ctx.fillRect(ix + k * sc, IMG_Y + 6 + y * sc, sc - 0.4, sc - 0.4);
		ctx.font = `500 11px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillStyle = c.sub;
		ctx.fillText(`칸 ${i + 1}`, x, IMG_Y + GRID.h * sc + 30);

		// 칸 → RNN
		arrow(ctx, x, IMG_Y - 2, x, RNN_Y + RNN_H + 2, read || on ? c.blue : c.line, 1.5);

		// RNN 상자
		ctx.beginPath();
		ctx.roundRect(x - boxW / 2, RNN_Y, boxW, RNN_H, 8);
		ctx.fillStyle = read || on ? c.blue : c.boxFill;
		ctx.fill();
		ctx.strokeStyle = read || on ? c.blue : c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.fillStyle = read || on ? (dark ? "#1b1e22" : "#fff") : c.sub;
		ctx.font = `700 ${pitch < 50 ? 10 : 12}px ${FONT}`;
		ctx.textBaseline = "middle";
		ctx.fillText("RNN", x, RNN_Y + RNN_H / 2 + 1);
		ctx.textBaseline = "alphabetic";

		// 앞 칸 → 다음 칸으로 넘기는 기억 h
		if (i < N - 1) {
			const y = RNN_Y + 11;
			arrow(ctx, x + boxW / 2, y, cx(i + 1) - boxW / 2, y, i < fw ? c.blue : c.line, 1.5);
			if (i < fw) {
				const gap = pitch - boxW;
				const bar = Math.min(5, (gap - 10) / BANDS);
				MEMORY[i].forEach((v, k) => {
					ctx.globalAlpha = 0.2 + 0.8 * v;
					ctx.fillStyle = c.blue;
					ctx.fillRect(x + boxW / 2 + 4 + k * (bar + 1), y + 5, bar, 9);
				});
				ctx.globalAlpha = 1;
			}
		}
		// 양방향: 뒤 칸 → 앞 칸
		if (i > 0 && t >= BWD_START && i >= N - bw) {
			const y = RNN_Y + RNN_H - 8;
			arrow(ctx, x - boxW / 2, y, cx(i - 1) + boxW / 2, y, c.amber, 1.5);
		}

		// RNN → 고른 글자
		if (read) {
			arrow(ctx, x, RNN_Y - 2, x, TOKEN_Y + TOKEN_H + 4, c.blue, 1.5);
			const blank = TOKENS[i] === "-";
			ctx.globalAlpha = clamp01((t - (i + 1) * FWD) / 250);
			ctx.beginPath();
			ctx.roundRect(x - boxW / 2 + 4, TOKEN_Y, boxW - 8, TOKEN_H, 5);
			ctx.fillStyle = blank ? c.boxFill : c.blueFill;
			ctx.fill();
			ctx.strokeStyle = blank ? c.boxStroke : c.blue;
			ctx.lineWidth = 1.2;
			ctx.stroke();
			ctx.fillStyle = blank ? c.sub : c.text;
			ctx.font = `600 14px ${FONT}`;
			ctx.textBaseline = "middle";
			ctx.fillText(TOKENS[i], x, TOKEN_Y + TOKEN_H / 2 + 1);
			ctx.textBaseline = "alphabetic";
			ctx.globalAlpha = 1;
		}
	}

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(caption(t, fw), w / 2, HEIGHT - 16);
}

export default function RnnMemoryDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={ARIA} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

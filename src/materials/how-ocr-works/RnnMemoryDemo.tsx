import { clamp01, FONT, palette, useCanvasScene } from "@/materials/shared";
import { BINARIZED_LINES, pixelGrid } from "./binarizedLines";

// RNN이 칸을 차례로 읽으며 기억(은닉 상태 h)을 다음 칸으로 넘기는 과정을 반복 재생한다. 왼쪽부터 한 번 읽은 뒤, 양방향으로 뒤에서 앞으로도 한 번 더 읽는다.
// 칸은 CtcDecodeDemo와 같이 "계약을"(0~63열)을 8칸, "agree"(159~224열)를 9칸으로 나눈 것이고, 칸마다 고른 글자도 같은 설명용 값이다.
// 화살표 위 막대 넷은 기억을 그림으로 보인 것이다. 칸을 위아래 네 띠로 나눠 검은 픽셀 비율을 앞 칸의 기억과 섞은 값으로, 실제 은닉 상태의 값은 아니다.
const LINES = {
	ko: { grid: pixelGrid(BINARIZED_LINES.ko, 0, 63), tokens: ["계", "계", "-", "약", "약", "-", "을", "을"] },
	en: { grid: pixelGrid(BINARIZED_LINES.en, 159, 224), tokens: ["a", "a", "g", "-", "r", "e", "e", "-", "e"] },
};
const BANDS = 4;

const LABELS = {
	ko: {
		picked: "칸마다 고른 글자",
		cell: (i: number) => `칸 ${i}`,
		reading: (i: number) => `칸 ${i}: 이번 칸과 앞 칸까지의 기억(h)을 함께 보고 고른다`,
		shared: "모든 칸이 가중치가 같은 RNN을 거친다",
		backward: "양방향: 뒤에서 앞으로도 한 번 더 읽는다",
		both: "칸마다 앞과 뒤의 맥락을 함께 써서 글자를 고른다",
		aria: "RNN이 줄 이미지를 여덟 칸으로 나눠 왼쪽부터 차례로 읽는 애니메이션. 칸마다 같은 RNN이 이번 칸의 특징과 앞 칸에서 넘어온 기억 h를 함께 보고 글자를 고른다. 계, 계, 빈칸, 약, 약, 빈칸, 을, 을을 고른 뒤, 양방향 RNN처럼 오른쪽에서 왼쪽으로도 한 번 더 읽어 뒤쪽 맥락까지 함께 쓴다.",
	},
	en: {
		picked: "picked per column",
		cell: (i: number) => `col ${i}`,
		reading: (i: number) => `Column ${i}: reads this column with the memory h`,
		shared: "Every column goes through the same RNN weights",
		backward: "Bidirectional: a second pass from right to left",
		both: "Each column picks with context from both sides",
		aria: "Animation of an RNN reading a line image split into nine columns, from left to right. At each column the same RNN looks at that column's features together with the memory h passed from the previous column and picks a letter. After picking a, a, g, blank, r, e, e, blank, e, it reads once more from right to left, as a bidirectional RNN does, so each column can also use the context that follows.",
	},
} as const;
type Lang = keyof typeof LABELS;

const FWD = 650;
const BWD = 420;
const HEIGHT = 330;
const TOKEN_Y = 34;
const TOKEN_H = 28;
const RNN_Y = 108;
const RNN_H = 34;
const IMG_Y = 186;
const timingOf = (n: number) => {
	const fwdEnd = n * FWD;
	const bwdStart = fwdEnd + 700;
	const bwdEnd = bwdStart + n * BWD;
	return { fwdEnd, bwdStart, bwdEnd, cycle: bwdEnd + 2200 };
};

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

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	const { grid, tokens } = LINES[lang];
	const n = tokens.length;
	// 칸 경계. 폭이 칸 수로 나눠떨어지지 않으면 반올림해 7열과 8열 칸이 섞인다
	const edges = Array.from({ length: n + 1 }, (_, i) => Math.round((i * grid.w) / n));
	const widest = Math.max(...edges.slice(1).map((e, i) => e - edges[i]));
	const { fwdEnd, bwdStart, bwdEnd } = timingOf(n);

	const memory = (() => {
		const out: number[][] = [];
		let m = Array<number>(BANDS).fill(0);
		for (let col = 0; col < n; col++) {
			const f = Array<number>(BANDS).fill(0);
			for (let y = 0; y < grid.h; y++)
				for (let x = edges[col]; x < edges[col + 1]; x++) if (grid.at(x, y)) f[Math.floor((y * BANDS) / grid.h)] += 1 / 16;
			m = m.map((v, k) => Math.min(1, 0.55 * v + 0.6 * f[k]));
			out.push(m);
		}
		return out;
	})();

	const caption = (t: number, fw: number) => {
		if (t < fwdEnd) return L.reading(fw + 1);
		if (t < bwdStart) return L.shared;
		if (t < bwdEnd) return L.backward;
		return L.both;
	};

	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pitch = Math.min(84, (w - 24) / n);
		const boxW = pitch * 0.72;
		const left = (w - pitch * n) / 2;
		const cx = (i: number) => left + pitch * (i + 0.5);
		const fw = Math.min(n, Math.floor(t / FWD));
		const bw = t >= bwdStart ? Math.min(n, Math.floor((t - bwdStart) / BWD)) : 0;
		const active = t < fwdEnd ? fw : t >= bwdStart && t < bwdEnd ? n - 1 - bw : -1;
		const sc = Math.min(3, (boxW - 8) / widest);

		ctx.textBaseline = "alphabetic";
		ctx.textAlign = "left";
		ctx.font = `500 11px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(L.picked, left, TOKEN_Y - 8);

		for (let i = 0; i < n; i++) {
			const x = cx(i);
			const read = i < fw;
			const on = i === active;
			const sliceW = edges[i + 1] - edges[i];

			// 칸 이미지
			ctx.beginPath();
			ctx.roundRect(x - boxW / 2, IMG_Y, boxW, grid.h * sc + 12, 6);
			ctx.fillStyle = on ? c.blueFill : c.boxFill;
			ctx.fill();
			ctx.strokeStyle = on ? c.blue : c.boxStroke;
			ctx.lineWidth = on ? 2 : 1;
			ctx.stroke();
			ctx.fillStyle = c.text;
			const ix = x - (sliceW * sc) / 2;
			for (let y = 0; y < grid.h; y++)
				for (let k = 0; k < sliceW; k++)
					if (grid.at(edges[i] + k, y)) ctx.fillRect(ix + k * sc, IMG_Y + 6 + y * sc, sc - 0.4, sc - 0.4);
			ctx.font = `500 11px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillStyle = c.sub;
			ctx.fillText(L.cell(i + 1), x, IMG_Y + grid.h * sc + 30);

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
			if (i < n - 1) {
				const y = RNN_Y + 11;
				arrow(ctx, x + boxW / 2, y, cx(i + 1) - boxW / 2, y, i < fw ? c.blue : c.line, 1.5);
				if (i < fw) {
					const gap = pitch - boxW;
					const bar = Math.min(5, (gap - 10) / BANDS);
					memory[i].forEach((v, k) => {
						ctx.globalAlpha = 0.2 + 0.8 * v;
						ctx.fillStyle = c.blue;
						ctx.fillRect(x + boxW / 2 + 4 + k * (bar + 1), y + 5, bar, 9);
					});
					ctx.globalAlpha = 1;
				}
			}
			// 양방향: 뒤 칸 → 앞 칸
			if (i > 0 && t >= bwdStart && i >= n - bw) {
				const y = RNN_Y + RNN_H - 8;
				arrow(ctx, x - boxW / 2, y, cx(i - 1) + boxW / 2, y, c.amber, 1.5);
			}

			// RNN → 고른 글자
			if (read) {
				arrow(ctx, x, RNN_Y - 2, x, TOKEN_Y + TOKEN_H + 4, c.blue, 1.5);
				const blank = tokens[i] === "-";
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
				ctx.fillText(tokens[i], x, TOKEN_Y + TOKEN_H / 2 + 1);
				ctx.textBaseline = "alphabetic";
				ctx.globalAlpha = 1;
			}
		}

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(caption(t, fw), w / 2, HEIGHT - 16);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function RnnMemoryDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, timingOf(LINES[lang].tokens.length).cycle, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

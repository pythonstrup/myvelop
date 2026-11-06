import { FONT, palette, useCanvasScene } from "@/materials/shared";
import { BINARIZED_LINES, pixelGrid } from "./binarizedLines";

// 합성곱(convolution)을 반복 재생한다. 3×3 필터를 줄 이미지 위로 한 칸씩 옮기며, 겹친 픽셀과 필터 값을 곱해 더한 값을 특징 지도에 칠한다.
// 줄 이미지는 CtcDecodeDemo와 같은 실측 픽셀("계약을" 0~63열, "agree" 159~224열)이다. 필터 값은 설명용으로 정한 것이고, 실제 CNN은 학습으로 정한다.
const GRIDS = {
	ko: pixelGrid(BINARIZED_LINES.ko, 0, 63),
	en: pixelGrid(BINARIZED_LINES.en, 159, 224),
};
const KERNELS = [
	[
		[-1, 2, -1],
		[-1, 2, -1],
		[-1, 2, -1],
	],
	[
		[-1, -1, -1],
		[2, 2, 2],
		[-1, -1, -1],
	],
] as const;

const LABELS = {
	ko: {
		filters: [
			{
				name: "세로획 필터",
				desc: ["세로로 곧게 선 획에 크게 반응한다", "ㅣ, ㅖ의 세로획이 밝게 남는다"],
				done: "세로획 필터: 세로로 선 획만 밝게 남았다",
			},
			{
				name: "가로획 필터",
				desc: ["가로로 누운 획에 크게 반응한다", "ㅡ, ㄹ의 가로획이 밝게 남는다"],
				done: "가로획 필터: 가로로 누운 획만 밝게 남았다",
			},
		],
		sweep: "필터를 한 칸씩 옮기며 겹친 픽셀과 곱해 더한다",
		input: "입력 · 이진화한 줄 이미지",
		output: "출력 · 특징 지도 (곱해 더한 값이 클수록 진하다)",
		aria: "합성곱을 보여 주는 애니메이션. 이진화한 '계약을' 줄 이미지 위로 3×3 필터를 왼쪽부터 한 칸씩 옮기며, 겹친 픽셀과 필터 값을 곱해 더한 값을 아래 특징 지도에 칠한다. 가운데 세로줄이 +2이고 양옆이 −1인 세로획 필터는 세로획을, 가운데 가로줄이 +2인 가로획 필터는 가로획을 밝게 남긴다.",
	},
	en: {
		filters: [
			{
				name: "Vertical-stroke filter",
				desc: ["Responds strongly to upright strokes", "The stems of a, g, and r stay bright"],
				done: "Only the upright strokes remain bright",
			},
			{
				name: "Horizontal-stroke filter",
				desc: ["Responds strongly to flat strokes", "The bars of the e's stay bright"],
				done: "Only the flat strokes remain bright",
			},
		],
		sweep: "Slide one pixel, multiply the overlap, and sum",
		input: "Input · binarized line image",
		output: "Output · feature map (darker = larger sum)",
		aria: "Animation of a convolution. A 3×3 filter slides from left to right over the binarized line image 'agree', one pixel at a time, and the sum of the overlapping pixels multiplied by the filter values is painted onto the feature map below. The vertical-stroke filter, +2 in the middle column and −1 on either side, leaves the upright strokes bright; the horizontal-stroke filter, +2 in the middle row, leaves the flat strokes bright.",
	},
} as const;
type Lang = keyof typeof LABELS;

const PER_COL = 45;
const HEIGHT = 448;
const S_MAX = 6;
const KC = 18;
const IN_TOP = 108;
const phaseOf = (lang: Lang) => GRIDS[lang].w * PER_COL + 2400;
const CYCLES = { ko: phaseOf("ko") * KERNELS.length, en: phaseOf("en") * KERNELS.length };

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	const grid = GRIDS[lang];
	const phase = phaseOf(lang);

	// 필터를 (x, y)에 겹쳐 곱해 더한 값. 음수는 0으로 자르고 최댓값 6으로 나눠 0~1로 맞춘다.
	const response = (k: (typeof KERNELS)[number], x: number, y: number) => {
		let sum = 0;
		for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) sum += k[j + 1][i + 1] * grid.at(x + i, y + j);
		return Math.max(0, sum) / 6;
	};

	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const fi = t < phase ? 0 : 1;
		const local = t - fi * phase;
		const done = Math.min(grid.w, Math.floor(local / PER_COL));
		const sweeping = done < grid.w;
		const f = L.filters[fi];
		const k = KERNELS[fi];

		const s = Math.min(S_MAX, (w - 24) / grid.w);
		const mapW = grid.w * s;
		const mapH = grid.h * s;
		const left = (w - mapW) / 2;
		const outTop = IN_TOP + mapH + 34;
		const cell = Math.max(1, s - 1);

		// 필터: 이름, 3×3 값, 설명
		ctx.textBaseline = "alphabetic";
		ctx.textAlign = "left";
		ctx.font = `700 13px ${FONT}`;
		ctx.fillStyle = c.blue;
		ctx.fillText(f.name, left, 14);
		k.forEach((row, j) =>
			row.forEach((v, i) => {
				const x = left + i * KC;
				const y = 22 + j * KC;
				ctx.fillStyle = v > 0 ? c.blue : c.boxFill;
				ctx.fillRect(x, y, KC - 2, KC - 2);
				ctx.fillStyle = v > 0 ? (dark ? "#1b1e22" : "#fff") : c.sub;
				ctx.font = `600 10px ${FONT}`;
				ctx.textAlign = "center";
				ctx.fillText(v > 0 ? "+2" : "−1", x + (KC - 2) / 2, y + 12);
			}),
		);
		ctx.textAlign = "left";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.sub;
		f.desc.forEach((line, l) => ctx.fillText(line, left + 3 * KC + 14, 38 + l * 20));

		// 입력: 이진화한 줄 이미지
		ctx.font = `500 11px ${FONT}`;
		ctx.fillText(L.input, left, IN_TOP - 8);
		ctx.fillText(L.output, left, outTop - 8);
		ctx.fillStyle = c.boxFill;
		ctx.fillRect(left, IN_TOP, mapW, mapH);
		ctx.fillRect(left, outTop, mapW, mapH);
		ctx.fillStyle = c.text;
		for (let y = 0; y < grid.h; y++)
			for (let x = 0; x < grid.w; x++) if (grid.at(x, y)) ctx.fillRect(left + x * s, IN_TOP + y * s, cell, cell);

		// 출력: 지금까지 훑은 열만 칠한다
		ctx.fillStyle = c.blue;
		for (let x = 0; x < done; x++)
			for (let y = 0; y < grid.h; y++) {
				const v = response(k, x, y);
				if (v <= 0) continue;
				ctx.globalAlpha = Math.min(1, v * 1.4);
				ctx.fillRect(left + x * s, outTop + y * s, cell, cell);
			}
		ctx.globalAlpha = 1;

		if (sweeping) {
			// 필터가 덮은 세 열과, 그 열 안에서 내려가는 3×3 자리
			const bx = left + (done - 1) * s;
			const row = Math.floor(((local % PER_COL) / PER_COL) * grid.h);
			ctx.fillStyle = c.blueFill;
			ctx.globalAlpha = 0.7;
			ctx.fillRect(bx, IN_TOP, 3 * s, mapH);
			ctx.globalAlpha = 1;
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 1;
			ctx.strokeRect(bx, IN_TOP, 3 * s, mapH);
			ctx.lineWidth = 2;
			ctx.strokeRect(bx, IN_TOP + (row - 1) * s, 3 * s, 3 * s);
			ctx.lineWidth = 1;
			ctx.strokeRect(left + done * s, outTop, s, mapH);
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(bx + 1.5 * s, IN_TOP + mapH);
			ctx.lineTo(left + done * s + s / 2, outTop);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(sweeping ? L.sweep : f.done, w / 2, HEIGHT - 16);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function ConvolutionDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLES[lang], SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

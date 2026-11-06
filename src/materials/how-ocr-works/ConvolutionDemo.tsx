import { FONT, palette, useCanvasScene } from "@/materials/shared";
import { BINARIZED_LINES, pixelGrid } from "./binarizedLines";

// 합성곱(convolution)을 반복 재생한다. 3×3 필터를 줄 이미지 위로 한 칸씩 옮기며, 겹친 픽셀과 필터 값을 곱해 더한 값을 특징 지도에 칠한다.
// 줄 이미지는 CtcDecodeDemo와 같은 "계약을"(0~63열) 실측 픽셀이다. 필터 값은 설명용으로 정한 것이고, 실제 CNN은 학습으로 정한다.
const GRID = pixelGrid(BINARIZED_LINES.ko, 0, 63);
const FILTERS = [
	{
		name: "세로획 필터",
		k: [
			[-1, 2, -1],
			[-1, 2, -1],
			[-1, 2, -1],
		],
		desc: ["세로로 곧게 선 획에 크게 반응한다", "ㅣ, ㅖ의 세로획이 밝게 남는다"],
		done: "세로획 필터: 세로로 선 획만 밝게 남았다",
	},
	{
		name: "가로획 필터",
		k: [
			[-1, -1, -1],
			[2, 2, 2],
			[-1, -1, -1],
		],
		desc: ["가로로 누운 획에 크게 반응한다", "ㅡ, ㄹ의 가로획이 밝게 남는다"],
		done: "가로획 필터: 가로로 누운 획만 밝게 남았다",
	},
] as const;
const SWEEP_LABEL = "필터를 한 칸씩 옮기며 겹친 픽셀과 곱해 더한다";
const ARIA =
	"합성곱을 보여 주는 애니메이션. 이진화한 '계약을' 줄 이미지 위로 3×3 필터를 왼쪽부터 한 칸씩 옮기며, 겹친 픽셀과 필터 값을 곱해 더한 값을 아래 특징 지도에 칠한다. 가운데 세로줄이 +2이고 양옆이 −1인 세로획 필터는 세로획을, 가운데 가로줄이 +2인 가로획 필터는 가로획을 밝게 남긴다.";

const PER_COL = 45;
const SWEEP = GRID.w * PER_COL;
const PHASE = SWEEP + 2400;
const CYCLE = PHASE * FILTERS.length;
const HEIGHT = 448;
const S_MAX = 6;
const KC = 18;
const IN_TOP = 108;

// 필터를 (x, y)에 겹쳐 곱해 더한 값. 음수는 0으로 자르고 최댓값 6으로 나눠 0~1로 맞춘다.
function response(k: readonly (readonly number[])[], x: number, y: number) {
	let sum = 0;
	for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) sum += k[j + 1][i + 1] * GRID.at(x + i, y + j);
	return Math.max(0, sum) / 6;
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const fi = t < PHASE ? 0 : 1;
	const local = t - fi * PHASE;
	const done = Math.min(GRID.w, Math.floor(local / PER_COL));
	const sweeping = done < GRID.w;
	const f = FILTERS[fi];

	const s = Math.min(S_MAX, (w - 24) / GRID.w);
	const mapW = GRID.w * s;
	const mapH = GRID.h * s;
	const left = (w - mapW) / 2;
	const outTop = IN_TOP + mapH + 34;
	const cell = Math.max(1, s - 1);

	// 필터: 이름, 3×3 값, 설명
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "left";
	ctx.font = `700 13px ${FONT}`;
	ctx.fillStyle = c.blue;
	ctx.fillText(f.name, left, 14);
	f.k.forEach((row, j) =>
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
	ctx.fillText("입력 · 이진화한 줄 이미지", left, IN_TOP - 8);
	ctx.fillText("출력 · 특징 지도 (곱해 더한 값이 클수록 진하다)", left, outTop - 8);
	ctx.fillStyle = c.boxFill;
	ctx.fillRect(left, IN_TOP, mapW, mapH);
	ctx.fillRect(left, outTop, mapW, mapH);
	ctx.fillStyle = c.text;
	for (let y = 0; y < GRID.h; y++)
		for (let x = 0; x < GRID.w; x++) if (GRID.at(x, y)) ctx.fillRect(left + x * s, IN_TOP + y * s, cell, cell);

	// 출력: 지금까지 훑은 열만 칠한다
	ctx.fillStyle = c.blue;
	for (let x = 0; x < done; x++)
		for (let y = 0; y < GRID.h; y++) {
			const v = response(f.k, x, y);
			if (v <= 0) continue;
			ctx.globalAlpha = Math.min(1, v * 1.4);
			ctx.fillRect(left + x * s, outTop + y * s, cell, cell);
		}
	ctx.globalAlpha = 1;

	if (sweeping) {
		// 필터가 덮은 세 열과, 그 열 안에서 내려가는 3×3 자리
		const bx = left + (done - 1) * s;
		const row = Math.floor(((local % PER_COL) / PER_COL) * GRID.h);
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
	ctx.fillText(sweeping ? SWEEP_LABEL : f.done, w / 2, HEIGHT - 16);
}

export default function ConvolutionDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={ARIA} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

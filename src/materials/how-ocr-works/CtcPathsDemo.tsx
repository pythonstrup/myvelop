import { FONT, palette, useCanvasScene } from "@/materials/shared";

// CTC가 학습할 때 정답에 닿는 정렬 경로를 모두 더하는 과정을 반복 재생한다.
// 세로축은 정답 "계약을" 사이사이와 앞뒤에 빈칸을 끼운 7줄, 가로축은 칸 8개다. 경로는 한 칸에 한 줄씩 지나며, 같은 줄에 머물거나 한 줄 내려가거나, 서로 다른 글자 사이의 빈칸은 건너뛸 수 있다.
// 경로 다섯 개는 그런 경로의 예이고, 경로 확률은 설명용으로 정한 값이다. 8칸에서 "계약을"이 되는 경로는 모두 462개다(전수 조사로 셈).
const ROWS = ["-", "계", "-", "약", "-", "을", "-"];
const COLS = 8;
const PATHS = [
	[1, 1, 2, 3, 3, 4, 5, 5],
	[1, 2, 2, 3, 4, 4, 5, 5],
	[0, 1, 3, 3, 3, 4, 5, 6],
	[1, 1, 1, 3, 4, 5, 5, 6],
	[0, 0, 1, 2, 3, 5, 6, 6],
];
const PROBS = ["0.12", "0.07", "0.05", "0.04", "0.02"];
const TOTAL_PATHS = 462;
const ARIA = `CTC 학습을 보여 주는 애니메이션. 세로축에 정답 '계약을'과 그 사이사이 빈칸 7줄, 가로축에 칸 8개를 놓고, 합치고 지웠을 때 '계약을'이 되는 정렬 경로를 하나씩 그린다. 예를 들어 계 계 빈칸 약 약 빈칸 을 을, 계 빈칸 빈칸 약 빈칸 빈칸 을 을이 모두 '계약을'이 된다. 경로마다 확률을 구해 모두 더한 값이 모델이 '계약을'로 읽을 확률이고, 8칸에서 이런 경로는 모두 ${TOTAL_PATHS}개다.`;

const STEP = 210;
const PATH_MS = COLS * STEP + 1300;
const CYCLE = PATHS.length * PATH_MS + 1400;
const HEIGHT = 332;
const TOP = 34;
const DY = 27;

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const labelW = 44;
	const dx = Math.min(64, (w - 24 - labelW) / COLS);
	const left = (w - labelW - dx * COLS) / 2 + labelW + dx / 2;
	const cx = (k: number) => left + k * dx;
	const cy = (r: number) => TOP + r * DY;
	const k = Math.min(PATHS.length - 1, Math.floor(t / PATH_MS));
	const ending = t >= PATHS.length * PATH_MS;
	const local = t - k * PATH_MS;
	const steps = ending ? COLS : Math.min(COLS, Math.floor(local / STEP) + 1);
	const path = PATHS[k];

	// 축 이름
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";
	ctx.font = `500 11px ${FONT}`;
	ctx.fillStyle = c.sub;
	for (let i = 0; i < COLS; i++) ctx.fillText(`칸${i + 1}`, cx(i), TOP - 20);
	ROWS.forEach((r, i) => {
		ctx.font = `${r === "-" ? 500 : 700} 14px ${FONT}`;
		ctx.fillStyle = r === "-" ? c.sub : c.text;
		ctx.fillText(r, cx(0) - dx / 2 - labelW / 2, cy(i));
	});

	// 이미 더한 경로는 옅게 남긴다
	const drawPath = (p: number[], n: number, color: string, alpha: number, width: number) => {
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.beginPath();
		for (let i = 0; i < n; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, cx(i), cy(p[i]));
		ctx.stroke();
		ctx.globalAlpha = 1;
	};
	for (let j = 0; j < (ending ? PATHS.length : k); j++) drawPath(PATHS[j], COLS, c.blue, 0.22, 3);

	// 격자 점
	for (let i = 0; i < COLS; i++)
		for (let r = 0; r < ROWS.length; r++) {
			const on = !ending && i < steps && path[i] === r;
			ctx.beginPath();
			ctx.arc(cx(i), cy(r), on ? 6.5 : 4.5, 0, Math.PI * 2);
			ctx.fillStyle = on ? c.blue : c.line;
			ctx.fill();
		}
	if (!ending) drawPath(path, steps, c.blue, 1, 3.5);

	// 지금 경로가 읽는 글자와, 지금까지 더한 확률
	const textX = cx(0) - dx / 2 - labelW + 4;
	const seqY = cy(ROWS.length - 1) + 34;
	ctx.textAlign = "left";
	ctx.font = `600 13px ${FONT}`;
	ctx.fillStyle = c.text;
	if (!ending) {
		const seq = path.slice(0, steps).map((r) => ROWS[r]).join(" ");
		ctx.fillText(`경로 ${k + 1}:  ${seq}${steps === COLS ? "  →  계약을" : ""}`, textX, seqY);
	} else ctx.fillText(`"계약을"이 되는 경로는 모두 ${TOTAL_PATHS}개`, textX, seqY);
	const added = ending ? PATHS.length : steps === COLS ? k + 1 : k;
	if (added > 0) {
		ctx.font = `500 ${w < 400 ? 11 : 12.5}px ${FONT}`;
		ctx.fillStyle = c.blue;
		ctx.fillText(`P(계약을) = ${PROBS.slice(0, added).join(" + ")} + …`, textX, seqY + 24);
	}

	ctx.textAlign = "center";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText("모든 경로의 확률을 더한 값을 키우도록 학습한다", w / 2, HEIGHT - 16);
}

export default function CtcPathsDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={ARIA} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

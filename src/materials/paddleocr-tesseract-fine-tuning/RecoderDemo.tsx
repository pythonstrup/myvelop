import { clamp01, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// Tesseract recoder가 "주민"을 읽는 과정을 반복 재생한다.
// 칸마다 자모 코드(또는 빈칸)를 고르고, 빔 탐색이 말이 되는 경로만 여러 개 들고 가다가,
// 초성·중성·종성 세 코드를 한 글자로 합치고 사전에 있는 단어가 되는 경로를 더 믿는다.
// 칸마다 고른 코드와 후보 경로는 설명용으로 정한 값이다.
const UNTIL = [1500, 4500, 8500, 10500, 13500];
const CYCLE = 13500;
const HEIGHT = 372;
const N = 10;
const BLANK = "-";
const NONE = "∅";

// 두 글자가 칸 다섯 개씩을 차지하고, 글자 사이의 빈 칸은 빈칸(-)을 고른다
const TOP1 = [BLANK, "ㅈ", "ㅜ", NONE, BLANK, BLANK, "ㅁ", "ㅣ", "ㄴ", BLANK];
// 2순위 후보
const TOP2: Record<number, string> = { 1: "ㅊ", 2: BLANK, 3: BLANK };
const PATHS = [
	{ picks: TOP1, word: "주민", dict: true },
	{ picks: [BLANK, "ㅊ", ...TOP1.slice(2)], word: "추민", dict: false },
	// 중성 없이 초성 두 개가 이어지는 경로. ㅁ이 붙는 칸에서 버린다
	{ picks: [BLANK, "ㅈ", BLANK, BLANK, BLANK, BLANK, "ㅁ", "ㅣ", "ㄴ", BLANK], word: null, dropAt: 6, dict: false },
];

const LABELS = {
	captions: [
		"① 줄 이미지를 좁은 세로 칸으로 나눈다",
		"② 칸마다 자모 코드 하나나 빈칸을 고른다",
		"③ 말이 되는 경로만 여러 개 들고 간다",
		"④ 초성·중성·종성 세 코드를 한 글자로 합친다",
		"⑤ 사전에 있는 단어가 되는 경로를 더 믿는다",
	],
	rows: ["줄 이미지", "칸마다 고른 코드", "빔 탐색이 들고 가는 경로"],
	legend: "- 빈칸 · ∅ 받침 없음 · 흐린 칸은 2순위",
	drop: "초성 다음 초성",
	inDict: "사전에 있음",
	notInDict: "사전에 없음",
	aria: "Tesseract가 '주민'을 읽는 과정을 반복 재생하는 애니메이션. 줄 이미지를 세로 칸 열 개로 나누고, 칸마다 빈칸, ㅈ, ㅜ, 받침 없음, 빈칸, 빈칸, ㅁ, ㅣ, ㄴ, 빈칸처럼 자모 코드나 빈칸을 고른다. ㅈ을 고른 칸에는 2순위로 ㅊ도 후보에 있다. 빔 탐색은 ㅈ ㅜ 받침없음 ㅁ ㅣ ㄴ과 ㅊ ㅜ 받침없음 ㅁ ㅣ ㄴ 같은 경로를 함께 들고 가고, 초성 다음에 초성이 오는 경로는 버린다. 세 코드씩 묶어 '주민'과 '추민'을 만든 뒤, 사전에 있는 '주민'을 더 믿어 결과로 고른다. 코드와 경로는 설명용으로 정한 값이다.",
};

const fade = (t: number, at: number, dur = 300) => clamp01((t - at) / dur);

// CTC 규칙: 같은 코드가 이어지면 합치고 빈칸을 지운다
function collapse(picks: readonly string[]) {
	const out: string[] = [];
	let prev = "";
	for (const p of picks) {
		if (p !== prev && p !== BLANK) out.push(p);
		prev = p;
	}
	return out;
}

function chip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, fill: string, stroke: string, color: string, size: number) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 5);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.2;
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.font = `600 ${size}px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const L = LABELS;
	const step = UNTIL.findIndex((u) => t < u);

	const imgW = Math.min(w - 32, 320);
	const left = (w - imgW) / 2;
	const col = imgW / N;
	const colX = (i: number) => left + i * col;
	const IMG_TOP = 24;
	const IMG_H = 80;
	const ROW1 = IMG_TOP + IMG_H + 34;
	const ROW2 = ROW1 + 72;
	const CHIP_H = 24;
	const PATH_GAP = 34;
	const fontSize = Math.min(14, col * 0.5);

	// 행 이름
	ctx.font = `500 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = c.sub;
	ctx.fillText(L.rows[0], left, IMG_TOP - 8);
	if (t >= UNTIL[0]) ctx.fillText(L.rows[1], left, ROW1 - 8);
	ctx.globalAlpha = fade(t, UNTIL[1]);
	ctx.fillText(L.rows[2], left, ROW2 - 8);
	ctx.globalAlpha = 1;

	// ②·③ 지금 보는 칸을 줄 이미지 위에 표시한다
	const scan = (from: number, until: number) => Math.min(N - 1, Math.floor(((t - from) / (until - from)) * N));
	const current = step === 1 ? scan(UNTIL[0], UNTIL[1]) : step === 2 ? scan(UNTIL[1], UNTIL[2] - 400) : -1;
	if (current >= 0) {
		ctx.fillStyle = c.blueFill;
		ctx.fillRect(colX(current), IMG_TOP - 3, col, IMG_H + 6);
	}

	// 줄 이미지
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1;
	ctx.strokeRect(left, IMG_TOP, imgW, IMG_H);
	// 글자마다 칸 다섯 개의 가운데에 그린다
	ctx.fillStyle = c.text;
	ctx.font = `700 ${Math.min(IMG_H * 0.8, col * 2.4)}px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	["주", "민"].forEach((ch, k) => ctx.fillText(ch, colX(2.5 + k * 5), IMG_TOP + IMG_H / 2 + 3));

	// 칸 경계
	ctx.save();
	ctx.globalAlpha = fade(t, 300, 600);
	ctx.strokeStyle = c.blue;
	ctx.setLineDash([3, 3]);
	for (let i = 1; i < N; i++) {
		ctx.beginPath();
		ctx.moveTo(colX(i), IMG_TOP - 3);
		ctx.lineTo(colX(i), IMG_TOP + IMG_H + 3);
		ctx.stroke();
	}
	ctx.restore();

	// ② 칸마다 1순위 코드와, 있으면 흐린 2순위 코드
	const per = (UNTIL[1] - UNTIL[0]) / N;
	const dimPicks = step >= 2 ? 0.55 : 1;
	TOP1.forEach((code, i) => {
		const a = fade(t, UNTIL[0] + i * per + per * 0.3, 200) * dimPicks;
		if (a <= 0) return;
		ctx.globalAlpha = a;
		const blank = code === BLANK;
		chip(ctx, colX(i) + 2, ROW1, col - 4, CHIP_H, code, blank ? c.boxFill : c.blueFill, blank ? c.boxStroke : c.blue, blank ? c.sub : c.text, fontSize);
		const alt = TOP2[i];
		if (alt) {
			ctx.globalAlpha = a * 0.55;
			chip(ctx, colX(i) + 4, ROW1 + CHIP_H + 4, col - 8, CHIP_H - 6, alt, c.boxFill, c.boxStroke, c.sub, fontSize - 2);
		}
		ctx.globalAlpha = 1;
	});
	ctx.globalAlpha = fade(t, UNTIL[0] + 400, 400) * dimPicks;
	ctx.font = `500 10.5px ${FONT}`;
	ctx.textAlign = "right";
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = c.sub;
	ctx.fillText(L.legend, left + imgW, ROW1 - 8);
	ctx.globalAlpha = 1;

	// ③ 경로마다 지금까지 읽은 코드를 CTC 규칙으로 정리해 늘어놓는다
	const chipW = Math.min(26, col - 2);
	const scanned = step < 2 ? -1 : step === 2 ? current : N - 1;
	PATHS.forEach((path, p) => {
		const y = ROW2 + p * PATH_GAP;
		const appear = fade(t, UNTIL[1] + p * 150, 300);
		if (appear <= 0) return;
		const dropped = path.dropAt !== undefined && scanned >= path.dropAt;
		const upto = dropped ? (path.dropAt ?? 0) : scanned;
		const codes = collapse(path.picks.slice(0, upto + 1));
		// ⑤ 사전에 없는 경로는 흐리게
		const settle = fade(t, UNTIL[3] + 200, 500);
		const dim = dropped ? 0.4 : !path.dict && path.word ? 1 - 0.55 * settle : 1;
		ctx.globalAlpha = appear * dim;
		codes.forEach((code, k) => {
			chip(ctx, left + k * (chipW + 3), y, chipW, CHIP_H, code, c.amberFill, c.amber, c.text, fontSize);
		});
		ctx.globalAlpha = 1;

		if (dropped) {
			const k = ease(fade(t, UNTIL[1] + (path.dropAt ?? 0) * ((UNTIL[2] - 400 - UNTIL[1]) / N), 400));
			const x2 = left + codes.length * (chipW + 3) - 3;
			ctx.save();
			ctx.strokeStyle = c.red;
			ctx.lineWidth = 1.6;
			ctx.beginPath();
			ctx.moveTo(left - 4, y + CHIP_H / 2);
			ctx.lineTo(left - 4 + (x2 - left + 8) * k, y + CHIP_H / 2);
			ctx.stroke();
			ctx.globalAlpha = k;
			ctx.fillStyle = c.red;
			ctx.font = `500 11px ${FONT}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(L.drop, x2 + 10, y + CHIP_H / 2 + 1);
			ctx.restore();
		}

		// ④ 세 코드씩 묶어 글자로 합친다
		if (path.word && step >= 3) {
			const groupA = fade(t, UNTIL[2], 400);
			ctx.save();
			ctx.globalAlpha = groupA * dim;
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 1.2;
			for (let g = 0; g < 2; g++) {
				const gx = left + g * 3 * (chipW + 3);
				const gw = 3 * (chipW + 3) - 3;
				ctx.beginPath();
				ctx.moveTo(gx + 2, y + CHIP_H + 3);
				ctx.lineTo(gx + 2, y + CHIP_H + 6);
				ctx.lineTo(gx + gw - 2, y + CHIP_H + 6);
				ctx.lineTo(gx + gw - 2, y + CHIP_H + 3);
				ctx.stroke();
			}
			const wordX = left + 6 * (chipW + 3) + 8;
			const wordA = fade(t, UNTIL[2] + 500, 500);
			ctx.globalAlpha = wordA * dim;
			ctx.fillStyle = c.sub;
			ctx.font = `500 13px ${FONT}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText("→", wordX, y + CHIP_H / 2 + 1);
			ctx.fillStyle = c.text;
			ctx.font = `700 16px ${FONT}`;
			ctx.fillText(path.word, wordX + 16, y + CHIP_H / 2 + 1);

			// ⑤ 사전 확인
			if (settle > 0) {
				const badgeX = wordX + 16 + ctx.measureText(path.word).width + 8;
				ctx.globalAlpha = settle;
				const label = path.dict ? L.inDict : L.notInDict;
				ctx.font = `600 10.5px ${FONT}`;
				const bw = ctx.measureText(label).width + 14;
				ctx.beginPath();
				ctx.roundRect(badgeX, y + 3, bw, CHIP_H - 6, 9);
				ctx.fillStyle = path.dict ? c.greenFill : c.boxFill;
				ctx.fill();
				ctx.strokeStyle = path.dict ? c.green : c.boxStroke;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.fillStyle = path.dict ? c.green : c.sub;
				ctx.textAlign = "center";
				ctx.fillText(label, badgeX + bw / 2, y + CHIP_H / 2 + 1);
				if (path.dict) {
					// 고른 경로를 초록 테두리로 묶는다
					ctx.strokeStyle = c.green;
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.roundRect(left - 6, y - 5, badgeX + bw + 6 - (left - 6), CHIP_H + 10, 7);
					ctx.stroke();
				}
			}
			ctx.restore();
		}
	});

	// 하단 캡션
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
}

export default function RecoderDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS.aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

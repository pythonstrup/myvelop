import { clamp01, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 저장된 모델 열 개 가운데 하나를 고를 때 1등의 검증 점수가 부풀려지는 과정을 반복 재생한다.
// 검증 점수는 실제 실력에 운을 더한 값이라, 1등은 운이 가장 좋았던 모델이 되기 쉽다.
// 고른 모델을 시험 세트로 다시 재면 운이 빠진 만큼 점수가 내려간다. 점수는 설명을 위해 정한 값이다.
const STEPS = [
	{ until: 2000, caption: "① 학습 중에 모델 10개를 저장했다" },
	{ until: 6000, caption: "② 검증 세트로 모델마다 점수를 잰다" },
	{ until: 8500, caption: "③ 검증 점수가 가장 높은 7번을 고른다" },
	{ until: 11500, caption: "④ 고른 7번을 시험 세트로 다시 잰다" },
	{ until: 16500, caption: "⑤ 7번의 검증 점수에는 운 4점이 섞여 있었다" },
];
const CYCLE = 16500;
const HEIGHT = 340;

// 모델마다 숨은 실력과 검증 세트에서 얻은 운. 검증 점수 = 실력 + 운.
// 실력 1등은 6번(72점)이지만 운이 나빠 70점에 그치고, 운이 4점 좋았던 7번(실력 70점)이 74점으로 1등이 된다.
const SKILL = [58, 63, 66, 68, 70, 72, 70, 71, 71, 70];
const LUCK = [1, -1, 2, -2, -1, -2, 4, 1, -1, 2];
const VAL = SKILL.map((s, i) => s + LUCK[i]);
const PICK = VAL.indexOf(Math.max(...VAL));
const TEST = 70; // 고른 모델의 시험 세트 점수
const MIN = 50;
const MAX = 80;
const GRID = [50, 60, 70, 80];

const LABELS = {
	formula: "검증 점수 = 실력 + 운",
	note: "점수는 설명을 위해 정한 값이다",
	val: "검증 세트",
	test: "시험 세트",
	gap: `−${VAL[PICK] - TEST}점`,
	legend: "가로선은 실제 실력이다. 실력 1등은 6번이다.",
	aria: "저장된 모델 10개 가운데 하나를 고르는 과정을 반복 재생하는 애니메이션. 모델마다 검증 세트 점수를 재는데, 검증 점수는 실제 실력에 운이 더해진 값이다. 검증 점수가 74점으로 가장 높은 7번을 고른다. 고른 7번을 시험 세트로 다시 재면 70점이 나와 검증 점수보다 4점 낮다. 마지막에 숨어 있던 실제 실력을 가로선으로 보여 준다. 7번의 실력은 70점이고 검증 점수에는 운 4점이 섞여 있었다. 실력이 가장 높은 모델은 72점인 6번이었지만 운이 나빠 검증 점수가 70점에 그쳐 뽑히지 않았다. 점수는 설명을 위해 정한 값이다.",
};

const fade = (t: number, at: number, dur = 300) => clamp01((t - at) / dur);

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const L = LABELS;
	const step = STEPS.findIndex((s) => t < s.until);
	const at = (i: number) => (i === 0 ? 0 : STEPS[i - 1].until);

	// 가로 배치: 왼쪽 눈금, 검증 막대 10개, 오른쪽 시험 세트 칸
	const W = Math.min(w, 520);
	const x0 = (w - W) / 2;
	const plotL = x0 + 26;
	const valW = (W - 26) * 0.68;
	const slot = valW / 10;
	const barW = Math.min(slot * 0.62, 22);
	const barX = (i: number) => plotL + slot * (i + 0.5);
	const divX = plotL + valW + 6;
	const testX = divX + (x0 + W - divX) * 0.36;
	const testW = Math.max(barW, 20);

	// 세로 배치
	const TOP = 70;
	const BASE = 250;
	const yOf = (v: number) => BASE - ((v - MIN) / (MAX - MIN)) * (BASE - TOP);
	const CHIP_Y = BASE + 8;
	const CHIP_H = 20;
	const chipW = Math.min(slot - 4, 24);

	// 맨 위: 식과 안내
	ctx.textBaseline = "alphabetic";
	ctx.globalAlpha = fade(t, at(1), 400);
	ctx.font = `600 12.5px ${FONT}`;
	ctx.textAlign = "left";
	ctx.fillStyle = c.text;
	ctx.fillText(L.formula, x0 + 4, 18);
	ctx.globalAlpha = 1;
	ctx.font = `500 10.5px ${FONT}`;
	ctx.textAlign = "right";
	ctx.fillStyle = c.sub;
	ctx.fillText(L.note, x0 + W - 4, 18);

	// 머리글
	ctx.font = `600 11.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "left";
	ctx.fillText(L.val, plotL, 50);
	ctx.globalAlpha = 0.4 + 0.6 * fade(t, at(3), 400);
	ctx.textAlign = "center";
	ctx.fillText(L.test, testX, 50);
	ctx.globalAlpha = 1;

	// 눈금
	ctx.font = `500 10.5px ${FONT}`;
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";
	for (const g of GRID) {
		const y = yOf(g);
		ctx.fillStyle = c.sub;
		ctx.fillText(String(g), plotL - 6, y);
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.globalAlpha = g === MIN ? 1 : 0.6;
		ctx.beginPath();
		ctx.moveTo(plotL, y);
		ctx.lineTo(x0 + W, y);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
	// 검증 쪽과 시험 쪽 경계
	ctx.save();
	ctx.strokeStyle = c.boxStroke;
	ctx.setLineDash([3, 3]);
	ctx.beginPath();
	ctx.moveTo(divX, 38);
	ctx.lineTo(divX, CHIP_Y + CHIP_H);
	ctx.stroke();
	ctx.restore();

	const picked = fade(t, at(2), 500);
	const reveal = fade(t, at(4), 500);

	// ② 검증 점수 막대가 차례로 오른다
	VAL.forEach((v, i) => {
		const grow = ease(fade(t, at(1) + 200 + i * 250, 500));
		if (grow <= 0) return;
		const top = yOf(MIN + (v - MIN) * grow);
		const isPick = i === PICK;
		ctx.globalAlpha = isPick ? 1 : 1 - 0.5 * picked;
		ctx.fillStyle = isPick && picked > 0 ? c.amberFill : c.blueFill;
		ctx.strokeStyle = isPick && picked > 0 ? c.amber : c.blue;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.rect(barX(i) - barW / 2, top, barW, BASE - top);
		ctx.fill();
		ctx.stroke();
		// ⑤ 고른 모델은 실력까지를 진하게, 그 위의 운을 연하게 남긴다
		if (isPick && reveal > 0) {
			ctx.globalAlpha = reveal * 0.55;
			ctx.fillStyle = c.amber;
			ctx.fillRect(barX(i) - barW / 2, yOf(SKILL[i]), barW, BASE - yOf(SKILL[i]));
		}
		ctx.globalAlpha = 1;
	});

	// ③ 1등의 점수
	if (picked > 0) {
		ctx.globalAlpha = picked;
		ctx.fillStyle = c.amber;
		ctx.font = `700 13px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(String(VAL[PICK]), barX(PICK), yOf(VAL[PICK]) - 6);
		ctx.globalAlpha = 1;
	}

	// ④ 고른 모델을 시험 세트 칸으로 옮겨 다시 잰다
	const move = ease(fade(t, at(3), 600));
	const testGrow = ease(fade(t, at(3) + 700, 600));
	if (testGrow > 0) {
		const top = yOf(MIN + (TEST - MIN) * testGrow);
		ctx.fillStyle = c.greenFill;
		ctx.strokeStyle = c.green;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.rect(testX - testW / 2, top, testW, BASE - top);
		ctx.fill();
		ctx.stroke();
		ctx.globalAlpha = fade(t, at(3) + 1300, 300);
		ctx.fillStyle = c.green;
		ctx.font = `700 13px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(String(TEST), testX, top - 6);
		ctx.globalAlpha = 1;
	}

	// 검증 1등 점수 높이를 시험 칸까지 이어 비교한다
	const ref = fade(t, at(3) + 1700, 400);
	if (ref > 0) {
		const y = yOf(VAL[PICK]);
		ctx.save();
		ctx.globalAlpha = ref;
		ctx.strokeStyle = c.amber;
		ctx.lineWidth = 1.2;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(barX(PICK) + barW / 2 + 2, y);
		ctx.lineTo(testX + testW / 2 + 10, y);
		ctx.stroke();
		ctx.restore();
	}

	// ⑤ 차이와 숨어 있던 실력
	if (reveal > 0) {
		const yA = yOf(VAL[PICK]);
		const yB = yOf(TEST);
		const bx = testX + testW / 2 + 10;
		ctx.save();
		ctx.globalAlpha = reveal;
		ctx.strokeStyle = c.red;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(bx - 4, yA);
		ctx.lineTo(bx, yA);
		ctx.lineTo(bx, yB);
		ctx.lineTo(bx - 4, yB);
		ctx.stroke();
		ctx.fillStyle = c.red;
		ctx.font = `700 12.5px ${FONT}`;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(L.gap, bx + 5, (yA + yB) / 2);

		ctx.strokeStyle = c.text;
		ctx.lineWidth = 2;
		SKILL.forEach((s, i) => {
			ctx.beginPath();
			ctx.moveTo(barX(i) - barW / 2 - 3, yOf(s));
			ctx.lineTo(barX(i) + barW / 2 + 3, yOf(s));
			ctx.stroke();
		});

		// 범례
		const ly = CHIP_Y + CHIP_H + 22;
		ctx.beginPath();
		ctx.moveTo(plotL, ly);
		ctx.lineTo(plotL + 14, ly);
		ctx.stroke();
		ctx.fillStyle = c.sub;
		ctx.font = `500 11px ${FONT}`;
		ctx.fillText(L.legend, plotL + 20, ly + 1);
		ctx.restore();
	}

	// ① 저장된 모델 번호표
	const chip = (cx: number, n: number, highlight: boolean, alpha: number) => {
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.roundRect(cx - chipW / 2, CHIP_Y, chipW, CHIP_H, 5);
		ctx.fillStyle = highlight ? c.amberFill : c.boxFill;
		ctx.fill();
		ctx.strokeStyle = highlight ? c.amber : c.boxStroke;
		ctx.lineWidth = 1.2;
		ctx.stroke();
		ctx.fillStyle = highlight ? c.amber : c.text;
		ctx.font = `600 11px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(String(n), cx, CHIP_Y + CHIP_H / 2 + 1);
		ctx.globalAlpha = 1;
	};
	for (let i = 0; i < 10; i++) {
		const a = fade(t, 200 + i * 130, 250);
		if (a > 0) chip(barX(i), i + 1, i === PICK && picked > 0, a);
	}
	if (move > 0) chip(barX(PICK) + (testX - barX(PICK)) * move, PICK + 1, true, 1);

	// 하단 캡션
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(STEPS[step].caption, w / 2, HEIGHT - 16);
}

export default function SelectionBiasDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS.aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

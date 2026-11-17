import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 손글씨 0 세 개를 CTC로 읽는 두 경우를 나란히 반복 재생한다.
// 간격이 고르면 0 사이마다 빈칸(-)이 끼어 "000"이 되고, 앞의 0 두 개가 붙으면 그 사이의 빈칸을 놓쳐
// 같은 글자 합치기 규칙이 서로 다른 0 두 개를 하나로 합친다. 칸마다 고른 글자는 설명용으로 정한 값이다.
const UNTIL = [1500, 5000, 7000, 9500, 13000];
const CYCLE = 13000;
const HEIGHT = 452;
const BLANK = "-";
const N = 7;
const ROW_H = 26;

// zeros: 0의 가운데 위치(칸 단위)와 기울기. bad: 서로 다른 0이 합쳐지는 묶음의 첫 칸
const CASES = [
	{
		zeros: [
			[1.0, -0.12],
			[3.5, 0.08],
			[6.0, -0.05],
		],
		tokens: ["0", "0", BLANK, "0", BLANK, "0", "0"],
		bad: -1,
	},
	{
		zeros: [
			[1.0, -0.1],
			[1.95, 0.12],
			[4.9, -0.06],
		],
		tokens: ["0", "0", "0", BLANK, "0", "0", BLANK],
		bad: 0,
	},
] as const;

const LABELS = {
	captions: [
		"① 손글씨 0 세 개를 좁은 세로 칸으로 나눈다",
		"② 칸마다 0 또는 빈칸(-)을 고른다",
		"③ 같은 글자가 연달아 나오면 하나로 합친다",
		"④ 빈칸을 지운다",
		"⑤ 실제 금액 줄에서도 끝의 000이 00이 됐다",
	],
	cases: ["간격이 고를 때", "간격이 고르지 않을 때"],
	rows: ["칸마다 고른 글자", "같은 글자 합치기", "빈칸 지우기"],
	merged: "서로 다른 0 두 개가 합쳐졌다",
	results: ["맞게 읽음", "0 하나가 사라짐"],
	// 학습 전 PaddleOCR이 test_hand 줄을 실제로 이렇게 읽었다. 이 데모가 설명하는 것은 끝 묶음(가운데 칸)뿐이라 그 칸만 강조한다.
	amount: [
		["56,200,", "000", "원"],
		["56,00,", "00", "원"],
	],
	aria: "CTC가 손글씨 0 세 개를 읽는 두 경우를 반복 재생하는 애니메이션. 간격이 고르면 일곱 칸이 0, 0, 빈칸, 0, 빈칸, 0, 0을 고르고, 같은 글자를 합치면 0, 빈칸, 0, 빈칸, 0이 되어 빈칸을 지우면 '000'이 된다. 간격이 고르지 않아 앞의 0 두 개가 붙어 있으면 그 사이에 빈칸을 고르는 칸이 없어 0, 0, 0, 빈칸, 0, 0, 빈칸을 고른다. 합치면 서로 다른 0 두 개가 하나로 합쳐져 0, 빈칸, 0, 빈칸이 되고, 빈칸을 지우면 '00'만 남는다. 실제 금액 줄에서는 56,200,000원이 56,00,00원으로 읽혔고, 끝의 000이 00이 된 것이 이 경우다. 칸마다 고른 글자는 설명을 위해 정한 값이다.",
};

const fade = (t: number, at: number, dur = 300) => clamp01((t - at) / dur);

// 연달아 같은 토큰을 한 묶음으로: [토큰, 첫 칸, 마지막 칸]
function runsOf(tokens: readonly string[]) {
	const runs: [string, number, number][] = [];
	tokens.forEach((tok, i) => {
		const last = runs.at(-1);
		if (last && last[0] === tok) last[2] = i;
		else runs.push([tok, i, i]);
	});
	return runs;
}

function drawToken(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, tok: string, alpha: number, c: ReturnType<typeof palette>, bad: boolean) {
	if (alpha <= 0) return;
	const blank = tok === BLANK;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(x + 2, y, width - 4, ROW_H, 5);
	ctx.fillStyle = bad ? c.redFill : blank ? c.boxFill : c.blueFill;
	ctx.fill();
	ctx.strokeStyle = bad ? c.red : blank ? c.boxStroke : c.blue;
	ctx.lineWidth = 1.2;
	ctx.stroke();
	ctx.fillStyle = blank ? c.sub : c.text;
	ctx.font = `600 14px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(tok, x + width / 2, y + ROW_H / 2 + 1);
	ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, align: CanvasTextAlign = "left", weight = 500) {
	ctx.font = `${weight} 11px ${FONT}`;
	ctx.textAlign = align;
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function drawCase(ctx: CanvasRenderingContext2D, w: number, t: number, c: ReturnType<typeof palette>, k: number, top: number) {
	const L = LABELS;
	const kase = CASES[k];
	const step = UNTIL.findIndex((u) => t < u);
	const col = Math.min(36, (w - 24) / N);
	const rowW = col * N;
	const left = (w - rowW) / 2;
	const colX = (i: number) => left + i * col;
	const imgTop = top + 22;
	const imgH = 40;
	const row1 = imgTop + imgH + 28;
	const row2 = row1 + ROW_H + 30;
	const runs = runsOf(kase.tokens);

	ctx.font = `600 12px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = c.text;
	ctx.fillText(L.cases[k], left, top + 12);

	// ② 지금 읽는 칸 강조
	const per = (UNTIL[1] - UNTIL[0]) / N;
	if (step === 1) {
		const i = Math.min(N - 1, Math.floor((t - UNTIL[0]) / per));
		ctx.fillStyle = c.blueFill;
		ctx.fillRect(colX(i), imgTop - 3, col, imgH + 6);
	}

	// 손글씨 0: 끝이 살짝 겹치게 그린 타원
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1;
	ctx.strokeRect(left, imgTop, rowW, imgH);
	ctx.strokeStyle = c.text;
	ctx.lineWidth = 2.6;
	ctx.lineCap = "round";
	for (const [at, tilt] of kase.zeros) {
		ctx.beginPath();
		ctx.ellipse(colX(at), imgTop + imgH / 2, col * 0.42, imgH * 0.33, tilt, -1.9, -1.9 + Math.PI * 2 + 0.35);
		ctx.stroke();
	}
	ctx.lineCap = "butt";

	// 칸 경계
	ctx.save();
	ctx.globalAlpha = fade(t, 300, 600);
	ctx.strokeStyle = c.blue;
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 3]);
	for (let i = 0; i <= N; i++) {
		ctx.beginPath();
		ctx.moveTo(colX(i), imgTop - 3);
		ctx.lineTo(colX(i), imgTop + imgH + 3);
		ctx.stroke();
	}
	ctx.restore();

	// ② 칸마다 고른 글자. ③부터는 아래 줄로 시선이 가도록 흐리게 둔다
	if (t >= UNTIL[0]) label(ctx, L.rows[0], left, row1 - 8, c.sub);
	kase.tokens.forEach((tok, i) => {
		const a = fade(t, UNTIL[0] + i * per + per * 0.4, 200) * (step >= 2 ? 0.45 : 1);
		drawToken(ctx, colX(i), row1, col, tok, a, c, false);
	});

	// ③ 같은 글자 묶음을 하나로. 서로 다른 0을 합친 묶음은 빨갛게
	const mergeA = fade(t, UNTIL[1] + 150, 450);
	ctx.globalAlpha = mergeA;
	label(ctx, step >= 3 ? L.rows[2] : L.rows[1], left, row2 - 8, c.sub);
	if (kase.bad >= 0) label(ctx, L.merged, left + rowW, row2 - 8, c.red, "right", 600);
	ctx.globalAlpha = 1;
	const strike = fade(t, UNTIL[2] + 150, 400);
	// 지운 빈칸이 사라진 뒤 0을 모은다
	const gather = ease(fade(t, UNTIL[2] + 800, 800));
	runs.forEach(([tok, a, b]) => {
		const x = colX(a);
		const width = (b - a + 1) * col;
		const bad = a === kase.bad;
		// 합친 묶음 괄호는 ③에서만 보이고, 빈칸을 지우기 시작하면 사라진다
		if (mergeA > 0 && strike < 1 && b > a) {
			ctx.save();
			ctx.globalAlpha = mergeA * (1 - strike);
			ctx.strokeStyle = bad ? c.red : c.blue;
			ctx.lineWidth = bad ? 1.6 : 1.2;
			ctx.beginPath();
			ctx.moveTo(x + 4, row1 + ROW_H + 4);
			ctx.lineTo(x + 4, row1 + ROW_H + 8);
			ctx.lineTo(x + width - 4, row1 + ROW_H + 8);
			ctx.lineTo(x + width - 4, row1 + ROW_H + 4);
			ctx.stroke();
			ctx.restore();
		}
		if (tok !== BLANK) return;
		// ④ 지워지는 빈칸에 취소선
		drawToken(ctx, x, row2, width, tok, mergeA * (1 - 0.65 * strike) * (1 - gather), c, false);
		if (strike > 0 && gather < 1) {
			ctx.save();
			ctx.globalAlpha = 1 - gather;
			ctx.strokeStyle = c.red;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(x + 6, row2 + ROW_H / 2);
			ctx.lineTo(lerp(x + 6, x + width - 6, ease(strike)), row2 + ROW_H / 2);
			ctx.stroke();
			ctx.restore();
		}
	});

	// ④ 빈칸을 뺀 0만 가운데로 모아 문자열로 붙인다
	const letters = runs.filter(([tok]) => tok !== BLANK);
	ctx.font = `700 17px ${FONT}`;
	const advance = ctx.measureText("0").width;
	const total = advance * letters.length;
	letters.forEach(([tok, a, b], i) => {
		const from = colX(a) + ((b - a + 1) * col) / 2;
		const to = w / 2 - total / 2 + advance * (i + 0.5);
		const x = lerp(from, to, gather);
		const width = lerp((b - a + 1) * col, advance + 8, gather);
		if (gather < 1) drawToken(ctx, x - width / 2, row2, width, tok, mergeA * (1 - gather), c, a === kase.bad);
		if (gather > 0) {
			ctx.save();
			ctx.globalAlpha = gather;
			ctx.font = `700 17px ${FONT}`;
			ctx.fillStyle = c.text;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(tok, x, row2 + ROW_H / 2 + 1);
			ctx.restore();
		}
	});
	if (gather > 0) {
		// 맞게 읽었으면 초록, 0을 잃었으면 빨강 상자와 배지
		const ok = kase.bad < 0;
		const boxR = w / 2 + total / 2 + 12;
		ctx.save();
		ctx.globalAlpha = gather;
		ctx.beginPath();
		ctx.roundRect(w / 2 - total / 2 - 12, row2 - 2, total + 24, ROW_H + 4, 6);
		ctx.fillStyle = ok ? c.greenFill : c.redFill;
		ctx.globalCompositeOperation = "destination-over";
		ctx.fill();
		ctx.globalCompositeOperation = "source-over";
		ctx.strokeStyle = ok ? c.green : c.red;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.globalAlpha = fade(t, UNTIL[2] + 1600, 400);
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = ok ? c.green : c.red;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(`${ok ? "✓" : "✗"} ${L.results[k]}`, boxR + 10, row2 + ROW_H / 2 + 1);
		ctx.restore();
	}
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const L = LABELS;
	const step = UNTIL.findIndex((u) => t < u);

	drawCase(ctx, w, t, c, 0, 4);
	drawCase(ctx, w, t, c, 1, 196);

	// ⑤ 실제 금액 줄: 정답 → 읽은 결과
	const a = fade(t, UNTIL[3] + 200, 500);
	if (a > 0) {
		const y = 398;
		ctx.save();
		ctx.globalAlpha = a;
		ctx.font = `700 15px ${FONT}`;
		const [truth, read] = L.amount;
		const arrow = "  →  ";
		const width = (parts: readonly string[]) => ctx.measureText(parts.join("")).width;
		const wt = width(truth);
		const wa = ctx.measureText(arrow).width;
		const wr = width(read);
		let x = w / 2 - (wt + wa + wr) / 2;
		ctx.beginPath();
		ctx.roundRect(x - 14, y - 16, wt + wa + wr + 28, 32, 6);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		// 끝 묶음만 진하게, 나머지는 흐리게 그린다
		const drawParts = (parts: readonly string[], focus: string) => {
			parts.forEach((part, i) => {
				ctx.fillStyle = i === 1 ? focus : c.sub;
				ctx.fillText(part, x, y + 1);
				x += ctx.measureText(part).width;
			});
		};
		drawParts(truth, c.text);
		ctx.fillStyle = c.sub;
		ctx.fillText(arrow, x, y + 1);
		x += wa;
		drawParts(read, c.red);
		ctx.restore();
	}

	// 하단 캡션
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
}

export default function CtcZeroMergeDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS.aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

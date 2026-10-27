import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";
import { BINARIZED_LINES } from "./binarizedLines";

// CRNN + CTC가 줄 하나를 읽는 과정을 반복 재생한다.
// 줄 이미지를 같은 폭의 세로 칸으로 나누고, 칸마다 고른 글자(또는 빈칸)를 CTC 규칙 두 개로 정리해 문자열을 만든다.
// 줄 이미지는 ProjectionProfileDiagram과 같은 실측 픽셀에서 한 단어만 잘라 쓴다. 칸마다 고른 글자는 설명용으로 정한 값이다.
const UNTIL = [1500, 5000, 7000, 9000, 11500];
const CYCLE = 11500;
const HEIGHT = 344;
const BLANK = "-";

const LINES = {
	// "계약을" = 0~63열, "agree" = 159~224열
	ko: { ...BINARIZED_LINES.ko, from: 0, to: 63, tokens: ["계", "계", BLANK, "약", "약", BLANK, "을", "을"] },
	en: { ...BINARIZED_LINES.en, from: 159, to: 224, tokens: ["a", "a", "g", BLANK, "r", "e", "e", BLANK, "e"] },
} as const;

const LABELS = {
	ko: {
		captions: [
			"① 줄 이미지를 좁은 세로 칸으로 나눈다",
			"② 칸마다 글자 하나 또는 빈칸(-)을 고른다",
			"③ 같은 글자가 연달아 나오면 하나로 합친다",
			"④ 빈칸을 지운다",
			"⑤ 글자 경계를 몰라도 단어를 읽어 냈다",
		],
		rows: ["줄 이미지", "칸마다 고른 글자", "같은 글자 합치기", "빈칸 지우기"],
		aria: "CTC가 줄 이미지에서 잘라 낸 단어 하나를 읽는 과정을 반복 재생하는 애니메이션. '계약을' 이미지를 여덟 개의 세로 칸으로 나누고, 칸마다 계, 계, 빈칸, 약, 약, 빈칸, 을, 을을 고른다. 연달아 나온 같은 글자를 합치면 계, 빈칸, 약, 빈칸, 을이 되고, 빈칸을 지우면 '계약을'이 된다.",
	},
	en: {
		captions: [
			"① Split the line image into narrow columns",
			"② Each column picks a letter or a blank (-)",
			"③ Merge runs of the same letter",
			"④ Drop the blanks",
			"⑤ The word is read without knowing letter edges",
		],
		rows: ["line image", "picked per column", "merge repeats", "drop blanks"],
		aria: "Looping animation of CTC reading one word cropped from a line image. The image 'agree' is split into nine columns, which pick a, a, g, blank, r, e, e, blank, e. Merging repeated letters gives a, g, blank, r, e, blank, e, and dropping the blanks gives 'agree' — the blank kept the two e's apart.",
	},
} as const;
type Lang = keyof typeof LABELS;

const IMG_TOP = 26;
const ROW_H = 28;
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

function drawToken(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	tok: string,
	alpha: number,
	c: ReturnType<typeof palette>,
	fontSize: number,
) {
	if (alpha <= 0) return;
	const blank = tok === BLANK;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(x + 2, y, width - 4, ROW_H, 5);
	ctx.fillStyle = blank ? c.boxFill : c.blueFill;
	ctx.fill();
	ctx.strokeStyle = blank ? c.boxStroke : c.blue;
	ctx.lineWidth = 1.2;
	ctx.stroke();
	ctx.fillStyle = blank ? c.sub : c.text;
	ctx.font = `600 ${fontSize}px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(tok, x + width / 2, y + ROW_H / 2 + 1);
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	const line = LINES[lang];
	const n = line.tokens.length;
	const cropCols = line.to - line.from + 1;
	const runs = runsOf(line.tokens);
	const letters = runs.filter(([tok]) => tok !== BLANK);
	// Path2D는 브라우저에만 있으니 첫 프레임에서 만든다
	let pixels: Path2D | null = null;

	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		pixels ??= new Path2D(line.pixels);
		const step = UNTIL.findIndex((u) => t < u);

		// 줄 이미지 비율을 지키며 칸 폭이 너무 넓어지지 않게 배율을 정한다
		const scale = Math.min(4, (w - 24) / cropCols);
		const rowW = cropCols * scale;
		const left = (w - rowW) / 2;
		const slice = rowW / n;
		const imgH = line.h * scale;
		const row1 = IMG_TOP + imgH + 30;
		const row2 = row1 + ROW_H + 36;
		const row3 = row2 + ROW_H + 36;
		const fontSize = Math.min(15, slice * 0.6);
		const sliceX = (i: number) => left + i * slice;

		// 행 이름
		ctx.font = `500 11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.rows[0], left, IMG_TOP - 8);
		if (t >= UNTIL[0]) ctx.fillText(L.rows[1], left, row1 - 8);
		ctx.globalAlpha = fade(t, UNTIL[1]);
		ctx.fillText(L.rows[2], left, row2 - 8);
		ctx.globalAlpha = fade(t, UNTIL[2]);
		ctx.fillText(L.rows[3], left, row3 - 8);
		ctx.globalAlpha = 1;

		// ② 지금 읽는 칸 강조. 픽셀이 가리지 않도록 줄 이미지보다 먼저 깐다
		const per = (UNTIL[1] - UNTIL[0]) / n;
		if (step === 1) {
			const i = Math.min(n - 1, Math.floor((t - UNTIL[0]) / per));
			ctx.fillStyle = c.blueFill;
			ctx.fillRect(sliceX(i), IMG_TOP - 3, slice, imgH + 6);
		}

		// 줄 이미지: 실측 픽셀에서 한 단어만 잘라 그린다
		ctx.save();
		ctx.beginPath();
		ctx.rect(left, IMG_TOP, rowW, imgH);
		ctx.clip();
		ctx.translate(left - line.from * scale, IMG_TOP);
		ctx.scale(scale, scale);
		ctx.fillStyle = c.text;
		ctx.fill(pixels);
		ctx.restore();

		// 칸 경계
		ctx.save();
		ctx.globalAlpha = fade(t, 300, 600);
		ctx.strokeStyle = c.blue;
		ctx.lineWidth = 1;
		ctx.setLineDash([3, 3]);
		for (let i = 0; i <= n; i++) {
			ctx.beginPath();
			ctx.moveTo(sliceX(i), IMG_TOP - 3);
			ctx.lineTo(sliceX(i), IMG_TOP + imgH + 3);
			ctx.stroke();
		}
		ctx.restore();

		// ② 왼쪽부터 칸을 훑으며 글자를 고른다
		line.tokens.forEach((tok, i) => {
			const at = UNTIL[0] + i * per + per * 0.4;
			// ③부터는 시선이 아래 줄로 가도록 칸별 결과를 흐리게 둔다
			const dim = step >= 2 ? 0.45 : 1;
			drawToken(ctx, sliceX(i), row1, slice, tok, fade(t, at, 200) * dim, c, fontSize);
		});

		// ③ 같은 글자 묶음을 하나로: 묶음이 걸친 칸 전체 폭으로 그린다
		const mergeA = fade(t, UNTIL[1] + 150, 450);
		runs.forEach(([tok, a, b]) => {
			const x = sliceX(a);
			const width = (b - a + 1) * slice;
			if (mergeA > 0 && b > a) {
				// 묶음 표시
				ctx.save();
				ctx.globalAlpha = mergeA;
				ctx.strokeStyle = c.blue;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(x + 4, row1 + ROW_H + 4);
				ctx.lineTo(x + 4, row1 + ROW_H + 8);
				ctx.lineTo(x + width - 4, row1 + ROW_H + 8);
				ctx.lineTo(x + width - 4, row1 + ROW_H + 4);
				ctx.stroke();
				ctx.restore();
			}
			const dropped = tok === BLANK ? 1 - 0.65 * fade(t, UNTIL[2] + 150, 400) : 1;
			drawToken(ctx, x, row2, width, tok, mergeA * dropped, c, fontSize);
			if (tok === BLANK && t >= UNTIL[2] + 150) {
				// ④ 지워지는 빈칸에 취소선
				const k = ease(fade(t, UNTIL[2] + 150, 400));
				ctx.save();
				ctx.strokeStyle = c.red;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(x + 6, row2 + ROW_H / 2);
				ctx.lineTo(lerp(x + 6, x + width - 6, k), row2 + ROW_H / 2);
				ctx.stroke();
				ctx.restore();
			}
		});

		// ④ 빈칸을 뺀 글자만 남기고, ⑤ 가운데로 모아 한 단어로 붙인다
		const keepA = fade(t, UNTIL[2] + 450, 400);
		const gather = ease(fade(t, UNTIL[3] + 200, 800));
		ctx.font = `700 ${fontSize + 3}px ${FONT}`;
		const advance = letters.map(([tok]) => ctx.measureText(tok).width);
		const total = advance.reduce((s, a) => s + a, 0);
		let cursor = w / 2 - total / 2;
		letters.forEach(([tok, a, b], i) => {
			const from = sliceX(a) + ((b - a + 1) * slice) / 2;
			const to = cursor + advance[i] / 2;
			cursor += advance[i];
			const x = lerp(from, to, gather);
			const width = lerp((b - a + 1) * slice, advance[i] + 8, gather);
			if (gather < 1) drawToken(ctx, x - width / 2, row3, width, tok, keepA * (1 - gather), c, fontSize);
			if (gather > 0) {
				ctx.save();
				ctx.globalAlpha = gather;
				ctx.fillStyle = c.text;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(tok, x, row3 + ROW_H / 2 + 1);
				ctx.restore();
			}
		});
		if (gather > 0) {
			// 완성된 문자열을 초록 상자로 묶는다
			ctx.save();
			ctx.globalAlpha = gather;
			ctx.beginPath();
			ctx.roundRect(w / 2 - total / 2 - 12, row3 - 2, total + 24, ROW_H + 4, 6);
			ctx.fillStyle = c.greenFill;
			ctx.globalCompositeOperation = "destination-over";
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";
			ctx.strokeStyle = c.green;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.restore();
		}

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function CtcDecodeDemo({ lang = "ko" }: { lang?: Lang }) {
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

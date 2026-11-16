import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";
import { documentOf, expand, type Lang, type Rect, shrink } from "./detectGeometry";

// DBNet 방식 검출이 확률 지도를 상자로 바꾸는 과정을 반복 재생한다.
// 글자 픽셀은 binarizedLines.ts의 실측값이다. 확률 지도는 모델 출력이 아니라, 줄인 정답 영역을 흐리게 그린 설명용 그림이다.
const UNTIL = [1600, 4400, 6400, 8800, 11200, 14400];
const CYCLE = 14400;
const HEIGHT = 262;
const PANEL_TOP = 30;
const MAP_BG = "#0f1115";

const LABELS = {
	ko: {
		captions: [
			"① 줄 간격이 좁은 두 줄짜리 이미지",
			"② 픽셀마다 글자 영역일 확률을 매긴다",
			"③ 기준값보다 높은 픽셀만 남긴다",
			"④ 붙어 있는 픽셀을 덩어리로 묶는다",
			"⑤ 줄여서 배운 만큼 다시 넓힌다",
			"⑥ 상자마다 꼭짓점 네 개를 돌려준다",
		],
		panels: ["입력 이미지", "확률 지도", "기준값으로 자른 지도", "덩어리마다 다른 색", "넓힌 상자", "검출 결과"],
		target: 4,
		targetWord: "계약을",
		aria: "DBNet 방식의 검출 후처리를 반복 재생하는 애니메이션. 줄 간격이 좁은 두 줄짜리 이미지 '갑과 을은 다음과 같이 / 계약을 체결한다'에서 모델이 픽셀마다 글자 영역일 확률을 매기면 단어마다 안쪽으로 줄어든 밝은 영역이 생긴다. 기준값보다 높은 픽셀만 남기고, 붙어 있는 픽셀을 덩어리로 묶으면 단어 여섯 개가 따로 묶인다. 덩어리를 줄였던 만큼 넓히면 단어를 감싸는 상자가 되고, 상자마다 꼭짓점 네 개의 좌표를 돌려준다.",
	},
	en: {
		captions: [
			"① An image with two tightly spaced lines",
			"② Score each pixel for being inside text",
			"③ Keep only pixels above the threshold",
			"④ Group touching pixels into blobs",
			"⑤ Grow each blob back by the shrink amount",
			"⑥ Return four corners per box",
		],
		panels: ["input image", "probability map", "thresholded map", "one color per blob", "grown boxes", "detection result"],
		target: 2,
		targetWord: "agree",
		aria: "Looping animation of DBNet-style detection post-processing. For the tightly spaced two-line image 'Both parties agree / to the following terms', the model scores each pixel for being inside text, which lights up a shrunken region inside each word. Keeping pixels above a threshold and grouping touching pixels gives seven separate blobs, one per word. Growing each blob back by the shrink amount gives a box around each word, and each box is returned as four corner coordinates.",
	},
} as const;

const fade = (t: number, at: number, dur = 400) => clamp01((t - at) / dur);

// 시그모이드: 줄인 정답 영역 안쪽은 1에 가깝고 테두리를 벗어나면 빠르게 0으로 떨어진다
function heatMap(width: number, height: number, regions: Rect[]) {
	const R = 2;
	const canvas = document.createElement("canvas");
	canvas.width = width * R;
	canvas.height = height * R;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	const img = ctx.createImageData(canvas.width, canvas.height);
	for (let py = 0; py < canvas.height; py++) {
		for (let px = 0; px < canvas.width; px++) {
			const x = (px + 0.5) / R;
			const y = (py + 0.5) / R;
			let p = 0;
			for (const r of regions) {
				const dx = Math.max(r.x0 - x, 0, x - r.x1);
				const dy = Math.max(r.y0 - y, 0, y - r.y1);
				const inside = Math.min(x - r.x0, r.x1 - x, y - r.y0, r.y1 - y);
				const sd = dx || dy ? Math.hypot(dx, dy) : -inside;
				p = Math.max(p, 1 / (1 + Math.exp(sd / 1.4)));
			}
			const i = (py * canvas.width + px) * 4;
			img.data.set([255, 255, 255, Math.round(p * 255)], i);
		}
	}
	ctx.putImageData(img, 0, 0);
	return canvas;
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	const doc = documentOf(lang);
	const shrunk = doc.words.map(shrink);
	const grown = shrunk.map(expand);
	// 가까이 붙은 단어끼리는 다른 색이 되도록 앞에서부터 남는 색을 고른다
	const near = (a: Rect, b: Rect) => a.x0 - 12 < b.x1 && b.x0 - 12 < a.x1 && a.y0 - 12 < b.y1 && b.y0 - 12 < a.y1;
	const hues: number[] = [];
	for (const r of doc.words) {
		const used = new Set(hues.filter((_, j) => near(doc.words[j], r)));
		hues.push([0, 1, 2, 3].find((k) => !used.has(k)) ?? 0);
	}
	// Path2D와 캔버스는 브라우저에만 있으니 첫 프레임에서 만든다
	let lines: Path2D[] | null = null;
	let heat: HTMLCanvasElement | null = null;

	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		lines ??= doc.lines.map((line) => new Path2D(line.pixels));
		heat ??= heatMap(doc.width, doc.height, shrunk);
		const step = UNTIL.findIndex((u) => t < u);
		const colors = [c.blue, c.amber, c.green, c.red];

		const scale = Math.min(2.6, (w - 24) / doc.width);
		const pw = doc.width * scale;
		const ph = doc.height * scale;
		const left = (w - pw) / 2;
		const X = (x: number) => left + x * scale;
		const Y = (y: number) => PANEL_TOP + y * scale;
		const rect = (r: Rect) => [X(r.x0), Y(r.y0), (r.x1 - r.x0) * scale, (r.y1 - r.y0) * scale] as const;

		// ②~④는 확률 지도라 어두운 판, ⑤부터 다시 입력 이미지 위에 그린다
		const darkness = fade(t, UNTIL[0], 600) * (1 - fade(t, UNTIL[3], 600));

		ctx.font = `500 11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.panels[step], left, PANEL_TOP - 8);

		ctx.save();
		ctx.beginPath();
		ctx.roundRect(left, PANEL_TOP, pw, ph, 6);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.clip();
		ctx.globalAlpha = darkness;
		ctx.fillStyle = MAP_BG;
		ctx.fillRect(left, PANEL_TOP, pw, ph);

		// ② 확률 지도, ③에서 또렷한 이진 지도로 넘어간다
		ctx.globalAlpha = fade(t, UNTIL[0] + 300, 1400) * (1 - fade(t, UNTIL[1], 500));
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(heat, left, PANEL_TOP, pw, ph);

		// ③ 이진 지도 → ④ 덩어리마다 색 → ⑤ 줄였던 만큼 넓힌 상자
		const per = (UNTIL[3] - UNTIL[2] - 600) / shrunk.length;
		const growK = ease(fade(t, UNTIL[3] + 500, 1300));
		shrunk.forEach((r, i) => {
			const binA = fade(t, UNTIL[1], 500);
			if (binA <= 0) return;
			const colorA = fade(t, UNTIL[2] + i * per, 300);
			const box = {
				x0: lerp(r.x0, grown[i].x0, growK),
				y0: lerp(r.y0, grown[i].y0, growK),
				x1: lerp(r.x1, grown[i].x1, growK),
				y1: lerp(r.y1, grown[i].y1, growK),
			};
			const color = colors[hues[i]];
			ctx.globalAlpha = binA * (1 - colorA);
			ctx.fillStyle = "#fff";
			ctx.fillRect(...rect(box));
			// 어두운 판에서는 진하게, 밝은 판으로 돌아오면 옅게 칠한다
			ctx.globalAlpha = colorA * lerp(0.9, 0.22, 1 - darkness);
			ctx.fillStyle = color;
			ctx.fillRect(...rect(box));
			if (t >= UNTIL[3]) {
				ctx.globalAlpha = fade(t, UNTIL[3], 600);
				ctx.strokeStyle = color;
				ctx.lineWidth = 1.5;
				ctx.strokeRect(...rect(box));
			}
		});

		// 글자는 어두운 판에서 흐린 흰색으로 남겨 어느 단어의 영역인지 보이게 한다
		ctx.translate(left, PANEL_TOP);
		ctx.scale(scale, scale);
		const paths = lines;
		doc.lines.forEach((line, i) => {
			ctx.save();
			ctx.translate(line.x, line.y);
			ctx.globalAlpha = 1 - darkness;
			ctx.fillStyle = c.text;
			ctx.fill(paths[i]);
			ctx.globalAlpha = darkness * 0.25;
			ctx.fillStyle = "#fff";
			ctx.fill(paths[i]);
			ctx.restore();
		});
		ctx.restore();

		// ⑥ 꼭짓점 네 개
		const cornerA = fade(t, UNTIL[4], 500);
		if (cornerA > 0) {
			grown.forEach((g, i) => {
				const strong = i === L.target;
				ctx.globalAlpha = cornerA * (strong ? 1 : 0.5);
				ctx.fillStyle = colors[hues[i]];
				for (const [x, y] of [
					[g.x0, g.y0],
					[g.x1, g.y0],
					[g.x1, g.y1],
					[g.x0, g.y1],
				]) {
					ctx.beginPath();
					ctx.arc(X(x), Y(y), strong ? 3.5 : 2.5, 0, Math.PI * 2);
					ctx.fill();
				}
			});
			const g = grown[L.target];
			const pts = [
				[g.x0, g.y0],
				[g.x1, g.y0],
				[g.x1, g.y1],
				[g.x0, g.y1],
			]
				.map(([x, y]) => `(${Math.round(x)}, ${Math.round(y)})`)
				.join(" ");
			ctx.globalAlpha = fade(t, UNTIL[4] + 400, 500);
			ctx.fillStyle = c.text;
			ctx.font = `500 12px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(`${L.targetWord}: ${pts}`, w / 2, PANEL_TOP + ph + 28);
			ctx.globalAlpha = 1;
		}

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function DbDetectDemo({ lang = "ko" }: { lang?: Lang }) {
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

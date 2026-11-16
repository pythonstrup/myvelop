import { FONT, palette, useCanvasScene } from "@/materials/shared";

// CTC가 학습할 때 정답에 닿는 정렬 경로를 모두 더하는 과정을 반복 재생한다.
// 세로축은 정답 사이사이와 앞뒤에 빈칸을 끼운 줄("계약을"은 7줄, "agree"는 11줄), 가로축은 CtcDecodeDemo와 같은 칸 수(8칸, 9칸)다.
// 경로는 한 칸에 한 줄씩 지나며, 같은 줄에 머물거나 한 줄 내려가거나, 서로 다른 글자 사이의 빈칸은 건너뛸 수 있다. "agree"의 두 e 사이 빈칸은 건너뛸 수 없다.
// 경로 다섯 개는 그런 경로의 예이고, 경로 확률은 설명용으로 정한 값이다. 경로 수는 전수 조사로 셌다(8칸 "계약을" 462개, 9칸 "agree" 286개).
const LINES = {
	ko: {
		word: "계약을",
		rows: ["-", "계", "-", "약", "-", "을", "-"],
		paths: [
			[1, 1, 2, 3, 3, 4, 5, 5],
			[1, 2, 2, 3, 4, 4, 5, 5],
			[0, 1, 3, 3, 3, 4, 5, 6],
			[1, 1, 1, 3, 4, 5, 5, 6],
			[0, 0, 1, 2, 3, 5, 6, 6],
		],
		total: 462,
		dy: 27,
		height: 332,
	},
	en: {
		word: "agree",
		rows: ["-", "a", "-", "g", "-", "r", "-", "e", "-", "e", "-"],
		paths: [
			[1, 1, 3, 4, 5, 7, 7, 8, 9],
			[0, 1, 3, 3, 5, 7, 8, 9, 10],
			[1, 2, 3, 5, 5, 7, 8, 9, 9],
			[1, 1, 1, 3, 5, 7, 8, 8, 9],
			[0, 0, 1, 3, 4, 5, 7, 8, 9],
		],
		total: 286,
		dy: 22,
		height: 386,
	},
};
const PROBS = ["0.12", "0.07", "0.05", "0.04", "0.02"];

const LABELS = {
	ko: {
		col: (i: number) => `칸${i}`,
		path: (k: number, seq: string, full: boolean) => `경로 ${k}:  ${seq}${full ? "  →  계약을" : ""}`,
		total: `"계약을"이 되는 경로는 모두 ${LINES.ko.total}개`,
		caption: "모든 경로의 확률을 더한 값을 키우도록 학습한다",
		aria: `CTC 학습을 보여 주는 애니메이션. 세로축에 정답 '계약을'과 그 사이사이 빈칸 7줄, 가로축에 칸 8개를 놓고, 합치고 지웠을 때 '계약을'이 되는 정렬 경로를 하나씩 그린다. 예를 들어 계 계 빈칸 약 약 빈칸 을 을, 계 빈칸 빈칸 약 빈칸 빈칸 을 을이 모두 '계약을'이 된다. 경로마다 확률을 구해 모두 더한 값이 모델이 '계약을'로 읽을 확률이고, 8칸에서 이런 경로는 모두 ${LINES.ko.total}개다.`,
	},
	en: {
		col: (i: number) => `c${i}`,
		path: (k: number, seq: string, full: boolean) => `Path ${k}:  ${seq}${full ? "  →  agree" : ""}`,
		total: `${LINES.en.total} paths lead to "agree"`,
		caption: "Training raises the sum of all path probabilities",
		aria: `Animation of CTC training. The vertical axis lists the answer 'agree' with blanks before, between, and after its letters, 11 rows in all, and the horizontal axis has 9 columns. The animation draws, one by one, alignment paths that become 'agree' once repeats are merged and blanks dropped. For example, a a g blank r e e blank e and blank a g g r e blank e blank both become 'agree'. The blank between the two e's cannot be skipped. Summing the probability of every such path gives the probability that the model reads 'agree', and with 9 columns there are ${LINES.en.total} such paths.`,
	},
} as const;
type Lang = keyof typeof LABELS;

const STEP = 210;
const TOP = 34;
const timingOf = (cols: number) => {
	const pathMs = cols * STEP + 1300;
	return { pathMs, cycle: PROBS.length * pathMs + 1400 };
};

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	const { rows, paths, dy, height } = LINES[lang];
	const cols = paths[0].length;
	const { pathMs } = timingOf(cols);

	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const labelW = 44;
		const dx = Math.min(64, (w - 24 - labelW) / cols);
		const left = (w - labelW - dx * cols) / 2 + labelW + dx / 2;
		const cx = (k: number) => left + k * dx;
		const cy = (r: number) => TOP + r * dy;
		const k = Math.min(paths.length - 1, Math.floor(t / pathMs));
		const ending = t >= paths.length * pathMs;
		const local = t - k * pathMs;
		const steps = ending ? cols : Math.min(cols, Math.floor(local / STEP) + 1);
		const path = paths[k];
		const dot = Math.min(6.5, dy / 4);

		// 축 이름
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.font = `500 11px ${FONT}`;
		ctx.fillStyle = c.sub;
		for (let i = 0; i < cols; i++) ctx.fillText(L.col(i + 1), cx(i), TOP - 20);
		rows.forEach((r, i) => {
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
		for (let j = 0; j < (ending ? paths.length : k); j++) drawPath(paths[j], cols, c.blue, 0.22, 3);

		// 격자 점
		for (let i = 0; i < cols; i++)
			for (let r = 0; r < rows.length; r++) {
				const on = !ending && i < steps && path[i] === r;
				ctx.beginPath();
				ctx.arc(cx(i), cy(r), on ? dot : dot - 2, 0, Math.PI * 2);
				ctx.fillStyle = on ? c.blue : c.line;
				ctx.fill();
			}
		if (!ending) drawPath(path, steps, c.blue, 1, 3.5);

		// 지금 경로가 읽는 글자와, 지금까지 더한 확률
		const textX = cx(0) - dx / 2 - labelW + 4;
		const seqY = cy(rows.length - 1) + 34;
		ctx.textAlign = "left";
		ctx.font = `600 13px ${FONT}`;
		ctx.fillStyle = c.text;
		if (!ending) {
			const seq = path
				.slice(0, steps)
				.map((r) => rows[r])
				.join(" ");
			ctx.fillText(L.path(k + 1, seq, steps === cols), textX, seqY);
		} else ctx.fillText(L.total, textX, seqY);
		const added = ending ? paths.length : steps === cols ? k + 1 : k;
		if (added > 0) {
			ctx.font = `500 ${w < 400 ? 11 : 12.5}px ${FONT}`;
			ctx.fillStyle = c.blue;
			ctx.fillText(`P(${LINES[lang].word}) = ${PROBS.slice(0, added).join(" + ")} + …`, textX, seqY + 24);
		}

		ctx.textAlign = "center";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.caption, w / 2, height - 16);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function CtcPathsDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(LINES[lang].height, timingOf(LINES[lang].paths[0].length).cycle, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

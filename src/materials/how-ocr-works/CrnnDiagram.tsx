import { BINARIZED_LINES, cropLine } from "./binarizedLines";

// CRNN이 줄 이미지 한 장을 칸별 글자 확률로 바꾸는 과정. 정적 SVG — SSR로만 렌더링한다.
// 줄 이미지와 칸 나누기는 CtcDecodeDemo와 같다. 특징 묶음의 진하기는 칸의 띠마다 센 검은 칸 비율이고, 확률은 설명용으로 정한 값이다.
const DATA = {
	ko: {
		...BINARIZED_LINES.ko,
		from: 0,
		to: 63,
		rows: ["계", "약", "을", "-"],
		// 칸마다 [계, 약, 을, -]의 확률. 나머지는 목록의 다른 글자 몫이다
		probs: [
			[0.86, 0.02, 0.01, 0.08],
			[0.62, 0.03, 0.01, 0.31],
			[0.04, 0.03, 0.01, 0.9],
			[0.03, 0.81, 0.02, 0.09],
			[0.01, 0.55, 0.02, 0.4],
			[0.01, 0.02, 0.03, 0.92],
			[0.01, 0.02, 0.77, 0.15],
			[0.01, 0.01, 0.58, 0.36],
		],
	},
	en: {
		...BINARIZED_LINES.en,
		from: 159,
		to: 224,
		rows: ["a", "g", "r", "e", "-"],
		probs: [
			[0.88, 0.01, 0.01, 0.03, 0.05],
			[0.57, 0.02, 0.01, 0.01, 0.38],
			[0.03, 0.83, 0.01, 0.01, 0.09],
			[0.01, 0.03, 0.02, 0.01, 0.91],
			[0.01, 0.01, 0.79, 0.02, 0.15],
			[0.02, 0.01, 0.03, 0.84, 0.08],
			[0.01, 0.01, 0.01, 0.61, 0.33],
			[0.01, 0.01, 0.01, 0.07, 0.89],
			[0.02, 0.01, 0.01, 0.86, 0.07],
		],
	},
} as const;

const LABELS = {
	ko: {
		step1: "① 상자를 펴서 높이를 맞춘다",
		step2: "② CNN — 세로 칸마다 특징 묶음 하나",
		step2Note: ["진할수록", "그 띠에 획이 많다"],
		step3: "③ RNN — 양쪽으로 읽어 맥락을 더한다",
		forward: "왼쪽부터",
		backward: "오른쪽부터",
		step4: "④ 칸마다 글자별 확률",
		step4Note: ["진할수록 확률이 높다", "나머지 글자는 생략"],
		summary: "칸마다 가장 높은 것",
		aria: "CRNN이 '계약을' 줄 이미지를 칸별 글자 확률로 바꾸는 과정. ① 기울어진 검출 상자를 펴서 똑바른 줄 이미지로 만들고 높이를 맞춘다. ② CNN이 줄 이미지를 여덟 개의 세로 칸으로 나눠 칸마다 특징 묶음을 하나씩 뽑는다. ③ RNN이 칸을 왼쪽부터, 그리고 오른쪽부터 한 번씩 읽어 칸마다 앞뒤 맥락을 더한다. ④ 칸마다 계, 약, 을, 빈칸의 확률이 나오고, 가장 높은 것을 고르면 계 계 빈칸 약 약 빈칸 을 을이 된다.",
	},
	en: {
		step1: "① Straighten the box and fix the height",
		step2: "② CNN — one feature set per column",
		step2Note: ["darker = more", "strokes in that band"],
		step3: "③ RNN — read both ways for context",
		forward: "left to right",
		backward: "right to left",
		step4: "④ Per-column letter probabilities",
		step4Note: ["darker = more likely", "other letters omitted"],
		summary: "highest per column",
		aria: "How CRNN turns the line image 'agree' into per-column letter probabilities. 1: the tilted detection box is straightened into an upright line image with a fixed height. 2: a CNN splits the image into nine vertical columns and extracts one feature set per column. 3: an RNN reads the columns once from the left and once from the right, adding context from both sides to each column. 4: each column gets probabilities for a, g, r, e and blank, and picking the highest gives a a g blank r e e blank e.",
	},
} as const;
type Lang = keyof typeof LABELS;

const LEFT = 20;
const STRIP_X = 48;
const S = 4; // ②~④의 줄 이미지 배율
const SMALL = 1.6; // ①의 줄 이미지 배율
const BANDS = 5;
const CELL_H = 18;
const argmax = (p: readonly number[]) => p.indexOf(Math.max(...p));

export default function CrnnDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const line = DATA[lang];
	const width = line.to - line.from + 1;
	const n = line.probs.length;
	const { d, runs } = cropLine(line.pixels, line.from, line.to);
	const sliceW = (width * S) / n;
	const sliceX = (i: number) => STRIP_X + i * sliceW;
	const noteX = STRIP_X + width * S + 14;

	// ② 칸마다, 위에서부터 BANDS개 띠로 나눠 검은 칸 비율을 센다
	const bandH = line.h / BANDS;
	const features = Array.from({ length: n }, (_, i) => {
		const a = (i * width) / n;
		const b = ((i + 1) * width) / n;
		return Array.from({ length: BANDS }, (_, k) => {
			const ink = runs
				.filter(([, y]) => y >= k * bandH && y < (k + 1) * bandH)
				.reduce((sum, [x0, , x1]) => sum + Math.max(0, Math.min(x1 + 1, b) - Math.max(x0, a)), 0);
			return ink / ((b - a) * bandH);
		});
	});
	const maxFeature = Math.max(...features.flat());

	const y1 = 18;
	const y2 = 124;
	const stripTop = y2 + 14;
	const stripH = line.h * S;
	const featTop = stripTop + stripH + 12;
	const y3 = featTop + BANDS * 13 + 32;
	const fwdY = y3 + 22;
	const bwdY = fwdY + 24;
	const y4 = bwdY + 40;
	const matrixTop = y4 + 12;
	const summaryY = matrixTop + line.rows.length * CELL_H + 26;
	const picked = line.probs.map((p) => line.rows[argmax(p)]);

	const title = (y: number, text: string) => (
		<text x={LEFT} y={y} fontSize="15" fontWeight="600" fill="var(--foreground)">
			{text}
		</text>
	);
	const notes = (y: number, lines: readonly string[]) =>
		lines.map((text, i) => (
			<text key={text} x={noteX} y={y + i * 16} fontSize="12" fill="var(--muted-foreground)">
				{text}
			</text>
		));
	const arrow = (x: number, y: number, dir: 1 | -1) => (
		<path d={`M${x} ${y} l${-6 * dir} -4 v8 z`} fill="rgb(var(--gray))" />
	);

	// ① 기울어진 상자와 편 상자
	const smallW = width * SMALL;
	const smallH = line.h * SMALL;
	const tiltX = STRIP_X + 10;
	const tiltY = 44;
	const flatX = STRIP_X + smallW + 110;

	return (
		<svg
			viewBox={`0 0 460 ${summaryY + 12}`}
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			{title(y1, t.step1)}
			<g transform={`rotate(-7 ${tiltX + smallW / 2} ${tiltY + smallH / 2})`}>
				<rect x={tiltX - 4} y={tiltY - 4} width={smallW + 8} height={smallH + 8} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />
				<path d={d} transform={`translate(${tiltX} ${tiltY}) scale(${SMALL})`} fill="var(--foreground)" />
			</g>
			<line x1={tiltX + smallW + 30} y1={tiltY + smallH / 2} x2={flatX - 26} y2={tiltY + smallH / 2} stroke="rgb(var(--gray))" strokeWidth="1.5" />
			{arrow(flatX - 20, tiltY + smallH / 2, 1)}
			<rect x={flatX - 4} y={tiltY - 4} width={smallW + 8} height={smallH + 8} fill="none" stroke="var(--accent)" />
			<path d={d} transform={`translate(${flatX} ${tiltY}) scale(${SMALL})`} fill="var(--foreground)" />

			{title(y2, t.step2)}
			<path d={d} transform={`translate(${STRIP_X} ${stripTop}) scale(${S})`} fill="var(--foreground)" />
			{Array.from({ length: n + 1 }, (_, i) => (
				<line key={i} x1={sliceX(i)} y1={stripTop - 4} x2={sliceX(i)} y2={stripTop + stripH + 4} stroke="var(--accent)" strokeDasharray="3 3" />
			))}
			{features.map((bands, i) =>
				bands.map((v, k) => (
					<rect
						key={`${i}-${k}`}
						x={sliceX(i) + 5}
						y={featTop + k * 13}
						width={sliceW - 10}
						height="11"
						rx="2"
						fill="var(--accent)"
						fillOpacity={0.08 + (0.85 * v) / maxFeature}
					/>
				)),
			)}
			{notes(featTop + 22, t.step2Note)}

			{title(y3, t.step3)}
			{Array.from({ length: n }, (_, i) => {
				const cx = sliceX(i) + sliceW / 2;
				return (
					<g key={i}>
						<circle cx={cx} cy={fwdY} r="4" fill="var(--accent)" />
						<circle cx={cx} cy={bwdY} r="4" fill="var(--accent)" />
						{i < n - 1 && (
							<>
								<line x1={cx + 6} y1={fwdY} x2={cx + sliceW - 8} y2={fwdY} stroke="rgb(var(--gray))" strokeWidth="1.5" />
								{arrow(cx + sliceW - 6, fwdY, 1)}
								<line x1={cx + 8} y1={bwdY} x2={cx + sliceW - 6} y2={bwdY} stroke="rgb(var(--gray))" strokeWidth="1.5" />
								{arrow(cx + 6, bwdY, -1)}
							</>
						)}
					</g>
				);
			})}
			<text x={noteX} y={fwdY + 4} fontSize="12" fill="var(--muted-foreground)">
				{t.forward}
			</text>
			<text x={noteX} y={bwdY + 4} fontSize="12" fill="var(--muted-foreground)">
				{t.backward}
			</text>

			{title(y4, t.step4)}
			{line.rows.map((row, r) => (
				<text key={row} x={STRIP_X - 10} y={matrixTop + r * CELL_H + 13} textAnchor="end" fontSize="13" fill="var(--foreground)">
					{row}
				</text>
			))}
			{line.probs.map((p, i) => {
				const best = argmax(p);
				return p.map((v, r) => (
					<g key={`${i}-${r}`}>
						<rect
							x={sliceX(i) + 1}
							y={matrixTop + r * CELL_H + 1}
							width={sliceW - 2}
							height={CELL_H - 2}
							rx="2"
							fill="var(--accent)"
							fillOpacity={0.06 + 0.8 * v}
						/>
						{r === best && (
							<text
								x={sliceX(i) + sliceW / 2}
								y={matrixTop + r * CELL_H + 13}
								textAnchor="middle"
								fontSize="10.5"
								fontWeight="600"
								fill="var(--background)"
							>
								{v.toFixed(2)}
							</text>
						)}
					</g>
				));
			})}
			{notes(matrixTop + 13, t.step4Note)}

			<text x={LEFT} y={summaryY} fontSize="13" fontWeight="600" fill="var(--foreground)">
				{`${t.summary}: ${picked.join(" ")}`}
			</text>
		</svg>
	);
}

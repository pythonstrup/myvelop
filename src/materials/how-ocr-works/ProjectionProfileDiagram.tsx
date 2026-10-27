import { BINARIZED_LINES } from "./binarizedLines";

// 투영 프로파일 요약도. 이진화한 한 줄과, 세로 한 줄마다 센 검은 칸 수를 같은 열 좌표에 맞춰 위아래로 그린다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LINES = {
	ko: {
		...BINARIZED_LINES.ko,
		// 글자마다 그 글자에 속하는 조각(0으로 끊긴 구간)의 번호
		chars: [["계", [0, 1]], ["약", [2]], ["을", [3]], ["체", [4, 5]], ["결", [6]], ["한", [7]], ["다", [8, 9]]],
	},
	en: {
		...BINARIZED_LINES.en,
		chars: [..."Bothpartiesagree"].map((ch, i) => [ch, [i]]),
	},
} as const satisfies Record<string, { w: number; h: number; pixels: string; cols: string; chars: readonly (readonly [string, readonly number[]])[] }>;

const LABELS = {
	ko: {
		step1: "① 이진화한 한 줄",
		step1Note: "검은 칸 = 글자 픽셀",
		step2: "② 세로 한 줄마다 센 검은 칸 수",
		step2Note: "띠 = 0인 곳, 여기서 자른다",
		summary: (chars: number, pieces: number) => `글자 ${chars}개 → 조각 ${pieces}개`,
		split: "한 글자가 두 조각으로",
		aria: "투영 프로파일. 이진화한 '계약을 체결한다' 한 줄 아래에, 세로 한 줄마다 센 검은 픽셀 수를 막대로 그렸다. 막대가 0으로 떨어지는 곳에서 자르면 일곱 글자가 열 조각으로 나뉜다. 다는 자음과 모음 사이에서, 계와 체는 모음의 두 세로획 사이에서 잘려 한 글자가 두 조각으로 쪼개진다.",
	},
	en: {
		step1: "① One binarized line",
		step1Note: "dark cell = text pixel",
		step2: "② Dark cells counted per column",
		step2Note: "band = zero, cut here",
		summary: (chars: number, pieces: number) => `${chars} letters → ${pieces} pieces`,
		split: "one letter, two pieces",
		aria: "A projection profile. Below the binarized line 'Both parties agree', bars show the number of dark pixels in each column. Cutting wherever a bar drops to zero separates the line into sixteen pieces, one per letter.",
	},
} as const;
type Lang = keyof typeof LABELS;

const LEFT = 20;
const WIDTH = 420;
const GRID_TOP = 38;
const BAR_H = 64;

export default function ProjectionProfileDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const line = LINES[lang];
	const cols = line.cols.split(",").map(Number);
	const max = Math.max(...cols);
	const cell = WIDTH / line.w;

	// 0이 아닌 열이 이어진 구간이 조각, 0인 열이 이어진 구간이 자르는 자리다
	const pieces: [number, number][] = [];
	const gaps: [number, number][] = [];
	cols.forEach((count, x) => {
		const list = count > 0 ? pieces : gaps;
		const last = list.at(-1);
		if (last && last[1] === x - 1) last[1] = x;
		else list.push([x, x]);
	});

	const gridH = line.h * cell;
	const step2Y = GRID_TOP + gridH + 30;
	const barTop = step2Y + 12;
	const barBottom = barTop + BAR_H;
	const bracketY = barBottom + 8;
	const charY = barBottom + 32;
	const summaryY = charY + 30;
	const colX = (x: number) => LEFT + x * cell;

	const splitPieces = new Set(line.chars.flatMap(([, ids]) => (ids.length > 1 ? ids : [])));
	// 띠 위에 놓이는 ② 라벨은 배경색 테두리로 띠를 끊어 읽히게 한다
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 6,
		strokeLinejoin: "round",
	} as const;
	const bars = cols.map((count, x) => (count ? `M${x} 0h1v${count}h-1z` : "")).join("");

	return (
		<svg
			viewBox={`0 0 460 ${summaryY + 12}`}
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<text x={LEFT} y="22" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.step1}
			</text>
			<text x={LEFT + WIDTH} y="22" textAnchor="end" fontSize="12.5" fill="var(--muted-foreground)">
				{t.step1Note}
			</text>

			{/* 자르는 자리는 격자부터 막대까지 한 띠로 이어 위아래가 같은 열임을 보인다 */}
			{gaps.map(([a, b]) => (
				<rect key={a} x={colX(a)} y={GRID_TOP - 4} width={(b - a + 1) * cell} height={barBottom - GRID_TOP + 4} fill="var(--accent)" fillOpacity="0.14" />
			))}

			<path d={line.pixels} transform={`translate(${LEFT} ${GRID_TOP}) scale(${cell})`} fill="var(--foreground)" />

			<text x={LEFT} y={step2Y} fontSize="15" fontWeight="600" fill="var(--foreground)" {...halo}>
				{t.step2}
			</text>
			<text x={LEFT + WIDTH} y={step2Y} textAnchor="end" fontSize="12.5" fill="var(--accent)" {...halo}>
				{t.step2Note}
			</text>
			<path d={bars} transform={`translate(${LEFT} ${barBottom}) scale(${cell} ${-BAR_H / max})`} fill="rgb(var(--gray))" />
			<line x1={LEFT} y1={barBottom} x2={LEFT + WIDTH} y2={barBottom} stroke="rgb(var(--gray))" strokeOpacity="0.6" />

			{pieces.map(([a, b], i) => {
				const x1 = colX(a) + 0.5;
				const x2 = colX(b + 1) - 0.5;
				return (
					<path
						key={a}
						d={`M${x1} ${bracketY} v5 H${x2} v-5`}
						fill="none"
						stroke={splitPieces.has(i) ? "var(--destructive)" : "var(--accent)"}
						strokeWidth="1.5"
					/>
				);
			})}
			{line.chars.map(([ch, ids], i) => {
				const a = pieces[ids[0]][0];
				const b = pieces[ids[ids.length - 1]][1];
				return (
					<text
						key={i}
						x={(colX(a) + colX(b + 1)) / 2}
						y={charY}
						textAnchor="middle"
						fontSize={lang === "ko" ? 14 : 11}
						fontWeight={ids.length > 1 ? 700 : 400}
						fill={ids.length > 1 ? "var(--destructive)" : "var(--foreground)"}
					>
						{ch}
					</text>
				);
			})}

			<text x={LEFT} y={summaryY} fontSize="13" fontWeight="600" fill="var(--foreground)">
				{t.summary(line.chars.length, pieces.length)}
			</text>
			{splitPieces.size > 0 && (
				<g>
					<rect x={LEFT + WIDTH - 124} y={summaryY - 10} width="10" height="10" rx="2" fill="var(--destructive)" />
					<text x={LEFT + WIDTH} y={summaryY} textAnchor="end" fontSize="12.5" fill="var(--destructive)">
						{t.split}
					</text>
				</g>
			)}
		</svg>
	);
}

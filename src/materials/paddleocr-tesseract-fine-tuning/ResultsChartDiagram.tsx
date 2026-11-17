// test_hand 결과 표를 옮긴 가로 막대그래프. 지표마다 엔진 둘, 엔진마다 옅은 막대(학습 전)와 진한 막대(학습 후)를 위아래로 둔다.
// 학습 후에 떨어진 값은 줄어든 만큼을 빨간 점선 칸으로 남기고 숫자도 빨갛게 쓴다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
type Pair = { before: number; after: number };
type Metric = { name: string; paddle: Pair; tess: Pair };

const METRICS: Metric[] = [
	{ name: "정규식으로 주민등록번호가 잡힘", paddle: { before: 24.1, after: 41.7 }, tess: { before: 24.1, after: 33.8 } },
	{ name: "주민등록번호 13자리를 맞게 읽음", paddle: { before: 26.0, after: 46.9 }, tess: { before: 28.4, after: 39.6 } },
	{ name: "라벨이 잡힘", paddle: { before: 78.7, after: 99.4 }, tess: { before: 67.8, after: 62.6 } },
	{ name: "줄 일치", paddle: { before: 27.7, after: 62.8 }, tess: { before: 29.2, after: 34.3 } },
];

const LABELS = {
	title: "test_hand 3,000줄 · 학습에 쓰지 않은 손글씨 글꼴 3종",
	paddle: "PaddleOCR",
	tess: "Tesseract",
	before: "학습 전",
	after: "학습 후",
	aria: "test_hand 3,000줄의 학습 전후 결과 막대그래프. 학습에 쓰지 않은 손글씨 글꼴 3종으로 그린 줄이다. 정규식으로 주민등록번호가 잡힌 비율은 PaddleOCR이 24.1%에서 41.7%로, Tesseract가 24.1%에서 33.8%로 올랐다. 주민등록번호 13자리를 맞게 읽은 비율은 PaddleOCR이 26.0%에서 46.9%로, Tesseract가 28.4%에서 39.6%로 올랐다. 라벨이 잡힌 비율은 PaddleOCR이 78.7%에서 99.4%로 올랐지만 Tesseract는 67.8%에서 62.6%로 떨어졌다. 줄 일치는 PaddleOCR이 27.7%에서 62.8%로, Tesseract가 29.2%에서 34.3%로 올랐다.",
};

const X0 = 96;
const X1 = 416;
const BAR_H = 10;
const GY0 = 58;
const PITCH = 82;
const TICKS = [0, 25, 50, 75, 100];
const FAINT = 0.3;
const PADDLE_COLOR = "var(--accent)";
const TESS_COLOR = "var(--foreground)";
const BOTTOM = GY0 + (METRICS.length - 1) * PITCH + 70;

const xOf = (v: number) => X0 + (v / 100) * (X1 - X0);
const pct = (v: number) => `${v.toFixed(1)}%`;

// 엔진 한 줄: 위는 학습 전, 아래는 학습 후
function EngineBars({ y, label, color, pair }: { y: number; label: string; color: string; pair: Pair }) {
	const drop = pair.after < pair.before;
	return (
		<g>
			<text x={X0 - 8} y={y + 15} textAnchor="end" fontSize="11.5" fontWeight="600" fill={color}>
				{label}
			</text>
			{/* 옅은 막대 뒤로 눈금선이 비치지 않게 배경색을 먼저 깐다 */}
			<rect x={X0} y={y} width={xOf(pair.before) - X0} height={BAR_H} rx="1.5" fill="var(--background)" />
			<rect x={X0} y={y} width={xOf(pair.before) - X0} height={BAR_H} rx="1.5" fill={color} fillOpacity={FAINT} />
			<text x={xOf(pair.before) + 4} y={y + 9} fontSize="11" fill="var(--muted-foreground)">
				{pct(pair.before)}
			</text>
			<rect x={X0} y={y + BAR_H + 2} width={xOf(pair.after) - X0} height={BAR_H} rx="1.5" fill={color} />
			{drop && (
				<rect
					x={xOf(pair.after)}
					y={y + BAR_H + 2.5}
					width={xOf(pair.before) - xOf(pair.after)}
					height={BAR_H - 1}
					fill="var(--destructive)"
					fillOpacity="0.12"
					stroke="var(--destructive)"
					strokeWidth="1"
					strokeDasharray="3 2"
				/>
			)}
			<text x={xOf(Math.max(pair.before, pair.after)) + 4} y={y + BAR_H + 11} fontSize="11" fontWeight="700" fill={drop ? "var(--destructive)" : "var(--foreground)"}>
				{pct(pair.after)}
				{drop && ` ▼${(pair.before - pair.after).toFixed(1)}`}
			</text>
		</g>
	);
}

// 범례 칸: 두 엔진 색을 나란히
const Swatch = ({ x, opacity }: { x: number; opacity: number }) => (
	<g>
		<rect x={x} y="31" width="10" height="10" rx="1.5" fill={PADDLE_COLOR} fillOpacity={opacity} />
		<rect x={x + 12} y="31" width="10" height="10" rx="1.5" fill={TESS_COLOR} fillOpacity={opacity} />
	</g>
);

export default function ResultsChartDiagram() {
	const t = LABELS;

	return (
		<svg viewBox={`0 0 480 ${BOTTOM + 26}`} role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<text x="20" y="18" fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
				{t.title}
			</text>
			<Swatch x={20} opacity={FAINT} />
			<text x="48" y="40" fontSize="11" fill="var(--muted-foreground)">
				{t.before}
			</text>
			<Swatch x={104} opacity={1} />
			<text x="132" y="40" fontSize="11" fill="var(--muted-foreground)">
				{t.after}
			</text>

			{METRICS.map((m, i) => {
				const gy = GY0 + i * PITCH;
				return (
					<g key={m.name}>
						<text x="20" y={gy + 12} fontSize="12.5" fontWeight="600" fill="var(--foreground)">
							{m.name}
						</text>
						{TICKS.map((v) => (
							<line key={v} x1={xOf(v)} y1={gy + 18} x2={xOf(v)} y2={gy + 70} stroke="rgb(var(--gray))" strokeOpacity={v === 0 ? 0.7 : 0.2} />
						))}
						<EngineBars y={gy + 20} label={t.paddle} color={PADDLE_COLOR} pair={m.paddle} />
						<EngineBars y={gy + 48} label={t.tess} color={TESS_COLOR} pair={m.tess} />
					</g>
				);
			})}

			{TICKS.map((v) => (
				<text key={v} x={xOf(v)} y={BOTTOM + 16} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
					{v}%
				</text>
			))}
		</svg>
	);
}

// 실험 전체를 한 장으로 줄인 개요도. 같은 합성 데이터로 두 엔진을 따로 학습시키고, 같은 채점 코드로 test_hand를 채점한다.
// 맨 아래 숫자는 주민등록번호가 가림 정규식에 걸린 비율의 학습 전 → 학습 후다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	data: "합성 줄 이미지 4만 7천 줄",
	splits: [
		["train", "40,000"],
		["val", "2,000"],
		["test_hand", "3,000"],
		["test_print", "2,000"],
	],
	handNote: "학습에서 뺀 손글씨 글꼴 3종",
	paddle: ["PaddleOCR", "korean_PP-OCRv5_mobile_rec", "Kaggle GPU T4 1장", "20바퀴 · 5시간 40분"],
	tess: ["Tesseract", "tessdata_best kor", "CPU 4코어", "3바퀴 · 5시간 31분"],
	scoring: ["같은 채점 코드", "test_hand · 주민등록번호가 가림 정규식에 걸린 비율"],
	paddleResult: ["24.1%", "41.7%"],
	tessResult: ["24.1%", "33.8%"],
	beforeAfter: "학습 전 → 학습 후",
	aria: "실험 전체 개요. 합성 줄 이미지 4만 7천 줄을 train 4만 줄, val 2,000줄, test_hand 3,000줄, test_print 2,000줄로 나눴고, test_hand는 학습에서 뺀 손글씨 글꼴 3종으로 그렸다. 같은 데이터로 PaddleOCR은 korean_PP-OCRv5_mobile_rec에서 출발해 Kaggle GPU T4 1장으로 20바퀴를 5시간 40분 동안 학습했고, Tesseract는 tessdata_best의 kor에서 출발해 CPU 4코어로 3바퀴를 5시간 31분 동안 학습했다. 두 모델을 같은 채점 코드로 채점하자 test_hand에서 주민등록번호가 가림 정규식에 걸린 비율은 PaddleOCR이 24.1%에서 41.7%로, Tesseract가 24.1%에서 33.8%로 올랐다.",
};

const LEFT = 124;
const RIGHT = 356;
const LANE_W = 208;
const CHIP_W = 104;
const CHIP_GAP = 8;
const CHIP_X0 = 20;
const HAND = 2;

const chipX = (i: number) => CHIP_X0 + i * (CHIP_W + CHIP_GAP);

const Down = ({ x, y1, y2 }: { x: number; y1: number; y2: number }) => (
	<line x1={x} y1={y1} x2={x} y2={y2 - 2} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#eo-arrow)" />
);

function Lane({ cx, y, lines }: { cx: number; y: number; lines: string[] }) {
	const [title, model, device, run] = lines;
	return (
		<g>
			<rect x={cx - LANE_W / 2} y={y} width={LANE_W} height="88" rx="6" fill="var(--secondary)" stroke="var(--foreground)" strokeOpacity="0.35" strokeWidth="1.2" />
			<text x={cx} y={y + 22} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--foreground)">
				{title}
			</text>
			<text x={cx} y={y + 42} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--foreground)">
				{model}
			</text>
			<text x={cx} y={y + 60} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{device}
			</text>
			<text x={cx} y={y + 77} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{run}
			</text>
		</g>
	);
}

function Result({ cx, y, values, color }: { cx: number; y: number; values: string[]; color: string }) {
	const [before, after] = values;
	return (
		<g>
			<rect x={cx - LANE_W / 2} y={y} width={LANE_W} height="56" rx="6" fill="none" stroke={color} strokeWidth="1.5" />
			<text x={cx} y={y + 30} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--foreground)">
				<tspan fill="var(--muted-foreground)" fontWeight="500">
					{before}
				</tspan>
				<tspan fill="var(--muted-foreground)" fontWeight="500" dx="6">
					→
				</tspan>
				<tspan fill={color} dx="6">
					{after}
				</tspan>
			</text>
			<text x={cx} y={y + 47} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{LABELS.beforeAfter}
			</text>
		</g>
	);
}

export default function ExperimentOverviewDiagram() {
	const t = LABELS;

	return (
		<svg viewBox="0 0 480 362" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<marker id="eo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			{/* 데이터: 네 묶음. test_hand만 강조한다 */}
			<text x="240" y="20" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--foreground)">
				{t.data}
			</text>
			{t.splits.map(([name, count], i) => {
				const hand = i === HAND;
				const x = chipX(i);
				return (
					<g key={name}>
						<rect
							x={x}
							y="32"
							width={CHIP_W}
							height="42"
							rx="6"
							fill={hand ? "var(--accent)" : "var(--background)"}
							fillOpacity={hand ? 0.12 : 1}
							stroke={hand ? "var(--accent)" : "rgb(var(--gray))"}
							strokeOpacity={hand ? 1 : 0.6}
							strokeWidth={hand ? 1.6 : 1.2}
						/>
						<text x={x + CHIP_W / 2} y="49" textAnchor="middle" fontSize="11.5" fontWeight="600" fill={hand ? "var(--accent)" : "var(--muted-foreground)"}>
							{name}
						</text>
						<text x={x + CHIP_W / 2} y="66" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="var(--foreground)">
							{count}
						</text>
					</g>
				);
			})}
			<text x={chipX(HAND) + CHIP_W / 2} y="90" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)">
				{t.handNote}
			</text>

			{/* 같은 데이터가 두 엔진으로 */}
			<path d={`M 240 96 V 104 H ${LEFT} V 122`} fill="none" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#eo-arrow)" />
			<path d={`M 240 104 H ${RIGHT} V 122`} fill="none" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#eo-arrow)" />

			<Lane cx={LEFT} y={124} lines={t.paddle} />
			<Lane cx={RIGHT} y={124} lines={t.tess} />

			<Down x={LEFT} y1={212} y2={232} />
			<Down x={RIGHT} y1={212} y2={232} />

			{/* 채점은 한 코드로 */}
			<rect x="20" y="232" width="440" height="46" rx="6" fill="var(--secondary)" stroke="var(--foreground)" strokeOpacity="0.35" strokeWidth="1.2" />
			<text x="240" y="252" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="var(--foreground)">
				{t.scoring[0]}
			</text>
			<text x="240" y="269" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{t.scoring[1]}
			</text>

			<Down x={LEFT} y1={278} y2={298} />
			<Down x={RIGHT} y1={278} y2={298} />

			<Result cx={LEFT} y={298} values={t.paddleResult} color="var(--accent)" />
			<Result cx={RIGHT} y={298} values={t.tessResult} color="var(--foreground)" />
		</svg>
	);
}

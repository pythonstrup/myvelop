// 학습 후 주민등록번호 13자리 지표를 val과 test_hand 사이에 이은 기울기 그래프. 학습에 쓴 글꼴에서 앞서던 Tesseract가
// 처음 보는 글꼴에서는 PaddleOCR보다 낮아져 두 선이 엇갈린다. 세로축은 30~100%다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const SERIES = [
	{ name: "PaddleOCR", val: 73.5, test: 46.9, color: "var(--accent)" },
	{ name: "Tesseract", val: 88.4, test: 39.6, color: "var(--foreground)" },
];

const LABELS = {
	title: "학습 후 · 주민등록번호 13자리를 맞게 읽은 비율",
	val: ["val", "학습에 쓴 글꼴"],
	test: ["test_hand", "처음 보는 글꼴"],
	valLead: "Tesseract가 앞선다",
	testLead: "PaddleOCR이 앞선다",
	aria: "학습 후 주민등록번호 13자리를 맞게 읽은 비율을 두 세트 사이에 이은 기울기 그래프. 학습에 쓴 글꼴로 그린 val에서는 Tesseract가 88.4%, PaddleOCR이 73.5%로 Tesseract가 앞선다. 처음 보는 글꼴로 그린 test_hand에서는 PaddleOCR이 46.9%, Tesseract가 39.6%로 순서가 뒤집혀 두 선이 엇갈린다.",
};

const X_L = 150;
const X_R = 330;
const Y_TOP = 86;
const Y_BOT = 286;
const V_LO = 30;
const V_HI = 100;

const yOf = (v: number) => Y_TOP + ((V_HI - v) / (V_HI - V_LO)) * (Y_BOT - Y_TOP);
const pct = (v: number) => `${v.toFixed(1)}%`;

function AxisHead({ x, lines }: { x: number; lines: string[] }) {
	return (
		<g>
			<text x={x} y="50" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--foreground)">
				{lines[0]}
			</text>
			<text x={x} y="67" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{lines[1]}
			</text>
		</g>
	);
}

export default function ValVsTestDiagram() {
	const t = LABELS;
	const [paddle, tess] = SERIES;

	return (
		<svg viewBox="0 0 480 334" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<text x="20" y="18" fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
				{t.title}
			</text>
			<AxisHead x={X_L} lines={t.val} />
			<AxisHead x={X_R} lines={t.test} />

			{/* 세로축 두 개. 30%에서 잘랐음을 왼쪽 축 끝에 적는다 */}
			{[X_L, X_R].map((x) => (
				<line key={x} x1={x} y1={Y_TOP} x2={x} y2={Y_BOT} stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			))}
			<text x={X_L - 8} y={Y_TOP + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
				{V_HI}%
			</text>
			<text x={X_L - 8} y={Y_BOT + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
				{V_LO}%
			</text>

			{SERIES.map((s) => (
				<g key={s.name}>
					<line x1={X_L} y1={yOf(s.val)} x2={X_R} y2={yOf(s.test)} stroke={s.color} strokeWidth="3" strokeLinecap="round" />
					<circle cx={X_L} cy={yOf(s.val)} r="5.5" fill={s.color} stroke="var(--background)" strokeWidth="1.5" />
					<circle cx={X_R} cy={yOf(s.test)} r="5.5" fill={s.color} stroke="var(--background)" strokeWidth="1.5" />
					<text x={X_L - 14} y={yOf(s.val) + 4.5} textAnchor="end" fontSize="13" fontWeight="700" fill={s.color}>
						{s.name}
						<tspan dx="6" fill="var(--foreground)">
							{pct(s.val)}
						</tspan>
					</text>
					<text x={X_R + 14} y={yOf(s.test) + 4.5} fontSize="13" fontWeight="700" fill="var(--foreground)">
						{pct(s.test)}
						<tspan dx="6" fill={s.color}>
							{s.name}
						</tspan>
					</text>
				</g>
			))}

			{/* 축마다 앞선 쪽 */}
			<text x={X_L} y={Y_BOT + 32} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={tess.color}>
				{t.valLead}
			</text>
			<text x={X_R} y={Y_BOT + 32} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={paddle.color}>
				{t.testLead}
			</text>
		</svg>
	);
}

// 채점 지표 네 개가 같은 정답 줄을 어떻게 다르게 판정하는지 보여 주는 표.
// 정답 "주민번호 246728-2160927"을 네 가지로 읽었다고 치고, 줄마다 지표 넷의 통과 여부를 표시한다.
// 판정은 채점 코드의 정의를 그대로 따른다. 읽은 결과는 설명용으로 정한 예다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	truth: "정답",
	readHeader: "읽은 결과",
	metrics: [
		["", "줄 일치"],
		["주민번호", "13자리"],
		["정규식으로", "잡힘"],
		["라벨", "잡힘"],
	],
	footer: "빨간색은 정답과 다르게 읽은 곳이다. 읽은 결과는 설명을 위해 정한 예다.",
	aria: "정답 줄 '주민번호 246728-2160927'을 네 가지로 읽었을 때 지표 네 개의 판정. 첫째, 정답과 똑같이 읽으면 줄 일치, 주민등록번호 13자리, 정규식으로 잡힘, 라벨 잡힘이 모두 통과한다. 둘째, '주민'을 '주인'으로 읽으면 줄 일치와 라벨 잡힘은 실패하지만 숫자 13자리와 정규식은 통과해 숫자는 가려진다. 셋째, 하이픈을 공백으로 읽으면 13자리와 라벨은 통과하지만 공백은 구분자가 아니라서 정규식에 걸리지 않아, 숫자를 다 읽었는데도 가려지지 않는다. 넷째, 숫자 0을 영문 O로 읽으면 줄 일치, 13자리, 정규식이 모두 실패하지만 라벨은 잡혀 옆 칸을 통째로 가릴 수 있다. 읽은 결과는 설명을 위해 정한 예다.",
};

// 읽은 결과: 라벨, 앞 6자리, 구분자, 뒤 7자리로 나눠 그린다. bad는 정답과 다른 글자의 위치다.
const READS = [
	{ label: ["주민번호"], front: "246728", sep: "-", back: ["2160927"], marks: [true, true, true, true], note: "네 지표를 모두 통과한다" },
	{ label: ["주", "인", "번호"], front: "246728", sep: "-", back: ["2160927"], marks: [false, true, true, false], note: "라벨은 놓쳤지만 숫자는 가려진다" },
	{ label: ["주민번호"], front: "246728", sep: " ", back: ["2160927"], marks: [false, true, false, true], note: "숫자를 다 읽었지만 가려지지 않는다" },
	{ label: ["주민번호"], front: "246728", sep: "-", back: ["216", "O", "927"], marks: [false, false, false, true], note: "라벨이 잡혀 옆 칸을 통째로 가릴 수 있다" },
];

const IDX_X = 22;
const STR_X = 44;
const SEP_X = 153;
const COLS = [272, 330, 388, 446];
const ROW_TOP = 88;
const ROW_H = 54;

// 가운데 칸(인덱스 1)이 틀린 글자다
function Parts({ parts }: { parts: string[] }) {
	return parts.map((p, i) =>
		i === 1 ? (
			<tspan key={i} fill="var(--destructive)" fontWeight="700" textDecoration="underline">
				{p}
			</tspan>
		) : (
			<tspan key={i}>{p}</tspan>
		),
	);
}

function Line({ y, read }: { y: number; read: (typeof READS)[number] }) {
	return (
		<g fontSize="14" fontWeight="500" fill="var(--foreground)">
			<text x={STR_X} y={y}>
				<Parts parts={read.label} />
			</text>
			<text x={SEP_X - 4} y={y} textAnchor="end">
				{read.front}
			</text>
			{read.sep === " " ? (
				// 공백으로 읽힌 자리. 글자가 없으니 빈자리를 표시한다
				<path d={`M ${SEP_X - 4} ${y - 6} v 6 h 8 v -6`} fill="none" stroke="var(--destructive)" strokeWidth="1.6" />
			) : (
				<text x={SEP_X} y={y} textAnchor="middle">
					{read.sep}
				</text>
			)}
			<text x={SEP_X + 4} y={y}>
				<Parts parts={read.back} />
			</text>
		</g>
	);
}

function Mark({ cx, cy, ok }: { cx: number; cy: number; ok: boolean }) {
	const color = ok ? "var(--accent)" : "var(--destructive)";
	return (
		<g transform={`translate(${cx} ${cy})`}>
			<rect x="-12" y="-12" width="24" height="24" rx="5" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.5" />
			<path d={ok ? "M -5.5 0.5 L -1.5 4.5 L 5.5 -4" : "M -4.5 -4.5 L 4.5 4.5 M 4.5 -4.5 L -4.5 4.5"} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
		</g>
	);
}

export default function MetricsDiagram() {
	const t = LABELS;
	const bottom = ROW_TOP + READS.length * ROW_H;

	return (
		<svg viewBox={`0 0 480 ${bottom + 36}`} role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			{/* 정답 줄 */}
			<rect x="6" y="6" width="468" height="38" rx="6" fill="var(--secondary)" />
			<text x={IDX_X} y="30" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--muted-foreground)">
				{t.truth}
			</text>
			<Line y={30} read={READS[0]} />

			{/* 열 이름 */}
			<text x={STR_X} y="76" fontSize="11.5" fill="var(--muted-foreground)">
				{t.readHeader}
			</text>
			{t.metrics.map(([a, b], i) => (
				<text key={b} x={COLS[i]} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--foreground)">
					<tspan x={COLS[i]} y="62">
						{a}
					</tspan>
					<tspan x={COLS[i]} y="76">
						{b}
					</tspan>
				</text>
			))}

			{/* 읽은 결과 네 줄 */}
			{READS.map((read, i) => {
				const y = ROW_TOP + i * ROW_H;
				return (
					<g key={read.note}>
						<line x1="6" y1={y} x2="474" y2={y} stroke="rgb(var(--gray))" strokeOpacity="0.3" />
						<text x={IDX_X} y={y + 24} textAnchor="middle" fontSize="14" fill="var(--muted-foreground)">
							{"①②③④"[i]}
						</text>
						<Line y={y + 24} read={read} />
						<text x={STR_X} y={y + 43} fontSize="11" fill="var(--muted-foreground)">
							{read.note}
						</text>
						{read.marks.map((ok, k) => (
							<Mark key={COLS[k]} cx={COLS[k]} cy={y + ROW_H / 2} ok={ok} />
						))}
					</g>
				);
			})}
			<line x1="6" y1={bottom} x2="474" y2={bottom} stroke="rgb(var(--gray))" strokeOpacity="0.3" />

			<text x="240" y={bottom + 24} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{t.footer}
			</text>
		</svg>
	);
}

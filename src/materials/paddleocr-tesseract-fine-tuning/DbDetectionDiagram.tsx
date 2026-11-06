import type { ReactNode, SVGProps } from "react";

// DB 검출 요약도. 정답 영역을 안쪽으로 줄이고, 학습할 때는 확률 지도 P·기준값 지도 T·이진 지도 B를 함께 배우며,
// 읽을 때는 P만 0.3으로 잘라 다시 넓힌다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
// 정답을 줄이는 거리는 PP-OCRv5 설정값 r = 0.4로 직접 계산한다. 지도의 번짐과, 다시 넓힌 상자가 원래 줄에 맞는 모습은 설명용 표현이다.
// 실제로는 P가 줄인 영역보다 넓게 번지므로 0.3으로 자른 영역을 unclip 1.5로 넓히면 원래 줄과 비슷한 상자가 된다.
type Box = { x: number; y: number; w: number; h: number };

const R = 0.4;
// 줄이는 거리 D = A(1 − r²) / L
const shrink = (b: Box): Box => {
	const d = (b.w * b.h * (1 - R * R)) / (2 * (b.w + b.h));
	return { x: b.x + d, y: b.y + d, w: b.w - 2 * d, h: b.h - 2 * d };
};
// 다시 넓힌 상자: 원래 줄 영역에 여백을 조금 둔다
const pad = (b: Box, m = 1.5): Box => ({ x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m });

// 위아래로 4px만 떨어진 두 줄. 글자는 본문의 학습 데이터 예시에서 가져왔다.
const LINES = [
	{ text: "임차인 홍길동", box: { x: 10, y: 16, w: 84, h: 20 } },
	{ text: "금 3,500,000원", box: { x: 10, y: 40, w: 104, h: 20 } },
];

const PW = 136;
const PH = 76;
const COLS = [20, 172, 324];

const LABELS = {
	rows: ["정답 만들기", "학습할 때", "읽을 때"],
	readNote: "T와 B는 쓰지 않는다",
	input: ["줄 이미지", "위아래로 붙은 두 줄"],
	target: ["정답: 줄인 영역", "r = 0.4"],
	shrinkFormula: ["줄이는 거리", "D = A(1 − r²) / L", "A는 넓이, L은 둘레"],
	p: ["확률 지도 P", "글자일 확률"],
	t: ["기준값 지도 T", "테두리 근처가 높다"],
	b: ["이진 지도 B", "P와 T로 계산한다"],
	read: [
		["① 확률 지도 P", "모델은 P만 낸다"],
		["② 0.3보다 큰 곳", "평균 0.6 미만은 버린다"],
		["③ 다시 넓힌 상자", "unclip 1.5"],
	],
	aria: "DB 검출 요약도. 위아래로 붙은 두 줄 '임차인 홍길동'과 '금 3,500,000원'의 정답 영역을 r = 0.4로 안쪽으로 줄여 두 줄이 서로 떨어지게 한다. 학습할 때 모델은 글자일 확률을 담은 확률 지도 P와 글자 테두리 근처가 높은 기준값 지도 T를 내고, 둘로 계산한 이진 지도 B를 정답과 견준다. 읽을 때는 P만 내고, 0.3보다 큰 곳을 영역으로 잡아 1.5 비율로 다시 넓힌 상자를 돌려준다.",
};

const ROW_TOP = [20, 164, 308];
const HEIGHT = 440;

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const outline = {
	fill: "none",
	stroke: "rgb(var(--gray))",
	strokeWidth: 0.8,
	strokeDasharray: "2 2",
	opacity: 0.7,
} as const;

function Panel({ x, y, id, paper = false, children }: { x: number; y: number; id: string; paper?: boolean; children: ReactNode }) {
	return (
		<g transform={`translate(${x} ${y})`}>
			<clipPath id={`db-clip-${id}`}>
				<rect width={PW} height={PH} rx="4" />
			</clipPath>
			<rect width={PW} height={PH} rx="4" fill={paper ? "var(--background)" : "var(--secondary)"} stroke="rgb(var(--gray))" strokeOpacity={paper ? 0.6 : 0.25} />
			<g clipPath={`url(#db-clip-${id})`}>{children}</g>
		</g>
	);
}

function Caption({ x, y, title, note }: { x: number; y: number; title: string; note: string }) {
	return (
		<g>
			<text x={x + PW / 2} y={y + PH + 17} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				{title}
			</text>
			<text x={x + PW / 2} y={y + PH + 32} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{note}
			</text>
		</g>
	);
}

const Rect = ({ b, ...rest }: { b: Box } & SVGProps<SVGRectElement>) => <rect x={b.x} y={b.y} width={b.w} height={b.h} {...rest} />;

function TextLines() {
	return LINES.map(({ text, box }) => (
		<text key={text} x={box.x + 3} y={box.y + 15} fontSize="14" fontWeight="500" fill="var(--foreground)" textLength={box.w - 6} lengthAdjust="spacingAndGlyphs">
			{text}
		</text>
	));
}

const Outlines = () => LINES.map(({ text, box }) => <Rect key={text} b={box} {...outline} />);

// 글자 안쪽이 가장 높고 바깥으로 갈수록 옅어지는 확률 지도
const PMap = () =>
	LINES.map(({ text, box }) => (
		<g key={text} filter="url(#db-soft)">
			<Rect b={box} fill="var(--accent)" opacity="0.22" />
			<Rect b={shrink(box)} fill="var(--accent)" opacity="0.95" />
		</g>
	));

// 글자 테두리를 따라 높은 기준값 지도
const TMap = () =>
	LINES.map(({ text, box }) => (
		<g key={text} filter="url(#db-edge)">
			<Rect b={box} fill="var(--foreground)" opacity="0.08" />
			<Rect b={box} fill="none" stroke="var(--foreground)" strokeWidth="5" opacity="0.6" />
		</g>
	));

const Shrunk = ({ opacity = 1 }: { opacity?: number }) => LINES.map(({ text, box }) => <Rect key={text} b={shrink(box)} fill="var(--accent)" opacity={opacity} />);

function Arrow({ x, y }: { x: number; y: number }) {
	return <path d={`M ${x} ${y - 5} L ${x + 6} ${y} L ${x} ${y + 5}`} fill="none" stroke="rgb(var(--gray))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />;
}

export default function DbDetectionDiagram() {
	const t = LABELS;
	const top = ROW_TOP.map((y) => y + 12);
	const mid = (row: number) => top[row] + PH / 2;

	return (
		<svg viewBox={`0 0 480 ${HEIGHT}`} role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<filter id="db-soft" x="-20%" y="-60%" width="140%" height="220%">
					<feGaussianBlur stdDeviation="2.4" />
				</filter>
				<filter id="db-edge" x="-20%" y="-60%" width="140%" height="220%">
					<feGaussianBlur stdDeviation="1.6" />
				</filter>
			</defs>

			{t.rows.map((row, i) => (
				<text key={row} x={COLS[0]} y={ROW_TOP[i]} fontSize="14" fontWeight="700" fill="var(--foreground)">
					{row}
				</text>
			))}

			{/* 정답 만들기: 줄 이미지와, 안쪽으로 줄인 정답 영역 */}
			<Panel x={COLS[0]} y={top[0]} id="input" paper>
				<TextLines />
			</Panel>
			<Caption x={COLS[0]} y={top[0]} title={t.input[0]} note={t.input[1]} />
			<Arrow x={COLS[0] + PW + 5} y={mid(0)} />
			<Panel x={COLS[1]} y={top[0]} id="target">
				<Outlines />
				<Shrunk />
			</Panel>
			<Caption x={COLS[1]} y={top[0]} title={t.target[0]} note={t.target[1]} />
			<g transform={`translate(${COLS[2] + 10} ${top[0] + 22})`}>
				<text fontSize="11.5" fill="var(--muted-foreground)">
					{t.shrinkFormula[0]}
				</text>
				<text y="21" fontSize="13" fontFamily={mono} fill="var(--foreground)">
					{t.shrinkFormula[1]}
				</text>
				<text y="40" fontSize="11" fill="var(--muted-foreground)">
					{t.shrinkFormula[2]}
				</text>
			</g>

			{/* 학습할 때: P와 T로 B를 계산한다 */}
			<text x={460} y={ROW_TOP[1]} textAnchor="end" fontSize="12.5" fontFamily={mono} fill="var(--accent)">
				B = 1 / (1 + e<tspan dy="-5" fontSize="9.5">−50(P − T)</tspan>
				<tspan dy="5">)</tspan>
			</text>
			<Panel x={COLS[0]} y={top[1]} id="p">
				<Outlines />
				<PMap />
			</Panel>
			<Caption x={COLS[0]} y={top[1]} title={t.p[0]} note={t.p[1]} />
			<Panel x={COLS[1]} y={top[1]} id="t">
				<TMap />
			</Panel>
			<Caption x={COLS[1]} y={top[1]} title={t.t[0]} note={t.t[1]} />
			<Arrow x={COLS[1] + PW + 5} y={mid(1)} />
			<Panel x={COLS[2]} y={top[1]} id="b">
				<Outlines />
				<Shrunk />
			</Panel>
			<Caption x={COLS[2]} y={top[1]} title={t.b[0]} note={t.b[1]} />

			{/* 읽을 때: P만 0.3으로 잘라 영역을 얻고, 다시 넓혀 상자로 돌려준다 */}
			<text x={460} y={ROW_TOP[2]} textAnchor="end" fontSize="12.5" fill="var(--muted-foreground)">
				{t.readNote}
			</text>
			<Panel x={COLS[0]} y={top[2]} id="read-p">
				<Outlines />
				<PMap />
			</Panel>
			<Arrow x={COLS[0] + PW + 5} y={mid(2)} />
			<Panel x={COLS[1]} y={top[2]} id="read-cut">
				<Outlines />
				{LINES.map(({ text, box }) => (
					<Rect key={text} b={shrink(box)} fill="var(--accent)" fillOpacity="0.25" stroke="var(--accent)" strokeWidth="1.2" />
				))}
			</Panel>
			<Arrow x={COLS[1] + PW + 5} y={mid(2)} />
			<Panel x={COLS[2]} y={top[2]} id="read-box" paper>
				<TextLines />
				{LINES.map(({ text, box }) => (
					<Rect key={text} b={pad(box)} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" rx="2" />
				))}
			</Panel>
			{t.read.map(([title, note], i) => (
				<Caption key={title} x={COLS[i]} y={top[2]} title={title} note={note} />
			))}
		</svg>
	);
}

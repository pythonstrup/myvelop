import type { ReactNode } from "react";

// SVTR_LCNet 구조도. CNN이 낸 특징이 CTC 갈래와 NRTR 갈래로 나뉘고, NRTR 갈래는 학습 때만 붙는다.
// CTC 갈래 입력은 기울기를 끊어 두어 CNN은 NRTR 갈래의 신호로만 배운다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	input: ["줄 이미지", "48 × 320, 컬러"],
	cnn: ["PP-LCNetV3", "가벼운 CNN"],
	cnnNote: ["높이를 한 칸으로", "줄인다"],
	feature: "특징 40칸",
	stop: ["기울기 차단", "CTC 신호는 CNN까지 안 간다"],
	trainOnly: "학습 때만",
	svtr: ["SVTR 블록 2층", "자기 주의로 40칸을 함께 본다"],
	ctc: ["CTC", "칸마다 11,945자와 빈칸 중 하나"],
	ctcOut: "임차인 홍길동",
	nrtr: ["NRTR 디코더", "트랜스포머 디코더"],
	nrtrOut: "임 → 차 → 인 → …",
	nrtrNote: "앞 글자를 보며 하나씩",
	teach: "CNN은 이 신호로만 배운다",
	legend: ["읽을 때도 쓴다", "학습 때만 붙는다", "학습 신호"],
	aria: "SVTR_LCNet 구조. 높이 48, 폭 320으로 맞춘 줄 이미지 '임차인 홍길동'이 가벼운 CNN인 PP-LCNetV3를 지나 가로 40칸의 특징이 된다. 특징은 두 갈래로 나뉜다. 한 갈래는 기울기를 끊은 채 SVTR 블록 2층과 CTC를 지나 칸마다 글자 11,945개와 빈칸 중 하나를 골라 문자열을 낸다. 다른 갈래는 학습 때만 붙는 NRTR 디코더로, 앞 글자를 보며 다음 글자를 하나씩 맞힌다. CNN까지 내려가는 학습 신호는 NRTR 갈래의 것뿐이다. 학습이 끝나면 NRTR 갈래는 떼어 낸다.",
};

const CENTER = 240;
const LEFT = 120;
const RIGHT = 360;
const BOX_W = 180;

function Node({ cx, y, h = 36, dashed = false, title, note, children }: { cx: number; y: number; h?: number; dashed?: boolean; title?: string; note?: string; children?: ReactNode }) {
	return (
		<g>
			<rect
				x={cx - BOX_W / 2}
				y={y}
				width={BOX_W}
				height={h}
				rx="6"
				fill={dashed ? "none" : "var(--secondary)"}
				stroke={dashed ? "rgb(var(--gray))" : "var(--foreground)"}
				strokeOpacity={dashed ? 1 : 0.35}
				strokeWidth="1.2"
				strokeDasharray={dashed ? "5 4" : undefined}
			/>
			{title && (
				<text x={cx} y={y + (note ? 15 : h / 2 + 5)} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
					{title}
				</text>
			)}
			{note && (
				<text x={cx} y={y + 29} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
					{note}
				</text>
			)}
			{children}
		</g>
	);
}

const Down = ({ x, y1, y2 }: { x: number; y1: number; y2: number }) => (
	<line x1={x} y1={y1} x2={x} y2={y2 - 2} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#sv-arrow)" />
);

export default function SvtrLcnetDiagram() {
	const t = LABELS;
	const featureLeft = CENTER - 100;

	return (
		<svg viewBox="0 0 480 356" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<marker id="sv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
				<marker id="sv-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent)" />
				</marker>
			</defs>

			{/* 줄 이미지 → CNN → 특징 40칸. 설명은 왼쪽에 둔다 */}
			<rect x={CENTER - 100} y="8" width="200" height="34" rx="3" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity="0.6" />
			<text x={CENTER} y="31" textAnchor="middle" fontSize="16" fontWeight="500" fill="var(--foreground)">
				{t.ctcOut}
			</text>
			<text x={CENTER - 110} y="22" textAnchor="end" fontSize="12" fontWeight="600" fill="var(--foreground)">
				{t.input[0]}
			</text>
			<text x={CENTER - 110} y="37" textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)">
				{t.input[1]}
			</text>
			<Down x={CENTER} y1={42} y2={60} />

			<Node cx={CENTER} y={60} title={t.cnn[0]} note={t.cnn[1]} />
			<text x={CENTER - 100} y="74" textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)" dx="-10">
				{t.cnnNote[0]}
			</text>
			<text x={CENTER - 100} y="88" textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)" dx="-10">
				{t.cnnNote[1]}
			</text>
			<Down x={CENTER} y1={96} y2={112} />

			{Array.from({ length: 40 }, (_, i) => (
				<rect key={i} x={featureLeft + i * 5} y="112" width="5" height="14" fill="var(--accent)" fillOpacity={0.25 + 0.5 * ((i * 7) % 5) / 4} stroke="var(--background)" strokeWidth="0.6" />
			))}
			<text x={CENTER - 110} y="123" textAnchor="end" fontSize="12" fontWeight="600" fill="var(--foreground)">
				{t.feature}
			</text>

			{/* 두 갈래로 나뉜다 */}
			<path d={`M ${CENTER} 126 V 138 H ${LEFT} V 166`} fill="none" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#sv-arrow)" />
			<path d={`M ${CENTER} 138 H ${RIGHT} V 166`} fill="none" stroke="rgb(var(--gray))" strokeWidth="1.5" strokeDasharray="5 4" markerEnd="url(#sv-arrow)" />

			{/* CTC 갈래 입구의 기울기 차단 */}
			<g transform={`translate(${LEFT} 152)`}>
				<rect x="-9" y="-3" width="18" height="6" rx="1.5" fill="var(--background)" stroke="var(--accent)" strokeWidth="1.5" />
				<line x1="-6" y1="0" x2="6" y2="0" stroke="var(--accent)" strokeWidth="1.5" />
			</g>
			<text x={LEFT + 14} y="152" fontSize="11" fontWeight="600" fill="var(--accent)">
				{t.stop[0]}
			</text>
			<text x={LEFT + 14} y="165" fontSize="10.5" fill="var(--muted-foreground)">
				{t.stop[1]}
			</text>
			<text x={RIGHT + 8} y="158" fontSize="11" fontWeight="600" fill="var(--muted-foreground)">
				{t.trainOnly}
			</text>

			{/* CTC 갈래: 실제로 읽을 때 쓰는 모델 */}
			<Node cx={LEFT} y={172} title={t.svtr[0]} note={t.svtr[1]} />
			<Down x={LEFT} y1={208} y2={224} />
			<Node cx={LEFT} y={224} title={t.ctc[0]} note={t.ctc[1]} />
			<Down x={LEFT} y1={260} y2={276} />
			<rect x={LEFT - 70} y="276" width="140" height="28" rx="6" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1.2" />
			<text x={LEFT} y="295" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				"{t.ctcOut}"
			</text>

			{/* NRTR 갈래: 학습 때만 붙고, 이 갈래의 신호만 CNN까지 내려간다 */}
			<Node cx={RIGHT} y={172} dashed title={t.nrtr[0]} note={t.nrtr[1]} />
			<Down x={RIGHT} y1={208} y2={224} />
			<Node cx={RIGHT} y={224} dashed>
				<text x={RIGHT} y={240} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--muted-foreground)">
					{t.nrtrOut}
				</text>
				<text x={RIGHT} y={253} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
					{t.nrtrNote}
				</text>
			</Node>
			<path d={`M ${RIGHT + BOX_W / 2} 190 H ${RIGHT + BOX_W / 2 + 14} V 78 H ${CENTER + BOX_W / 2 + 4}`} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="2 3" markerEnd="url(#sv-arrow-accent)" />
			<text x={RIGHT + BOX_W / 2 + 6} y="70" textAnchor="end" fontSize="11" fill="var(--accent)">
				{t.teach}
			</text>

			{/* 범례 */}
			<g transform="translate(40 330)" fontSize="11" fill="var(--muted-foreground)">
				<rect x="0" y="-9" width="22" height="12" rx="3" fill="var(--secondary)" stroke="var(--foreground)" strokeOpacity="0.35" />
				<text x="28" y="1">
					{t.legend[0]}
				</text>
				<rect x="132" y="-9" width="22" height="12" rx="3" fill="none" stroke="rgb(var(--gray))" strokeDasharray="4 3" />
				<text x="160" y="1">
					{t.legend[1]}
				</text>
				<line x1="272" y1="-3" x2="300" y2="-3" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="2 3" markerEnd="url(#sv-arrow-accent)" />
				<text x="308" y="1">
					{t.legend[2]}
				</text>
			</g>
		</svg>
	);
}

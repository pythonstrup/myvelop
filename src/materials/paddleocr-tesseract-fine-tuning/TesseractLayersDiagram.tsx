import type { ReactNode } from "react";

// Tesseract kor 모델의 층 구성도. 위 줄은 높이 48을 1로 접는 층, 아래 줄은 가로로 읽는 LSTM과 출력 층이다.
// 모양의 높이·폭 비율은 실제 텐서 모양(48 → 16 → 1, W → W/3)을 따른다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	rowA: "높이를 접는다  48 → 16 → 1",
	rowB: "가로로 읽는다",
	inputText: "주민등록",
	layers: [
		["1,48,0,1", "흑백 48 × W"],
		["C3,3 Ft16", "48 × W × 16"],
		["Mp3,3", "16 × W/3 × 16"],
		["TxyLfys64", "1 × W/3 × 64"],
		["Lfx96", "W/3 × 96"],
		["RxLrx96", "W/3 × 96"],
		["Lfx512", "W/3 × 512"],
		["Fc150", "칸마다 150개 확률"],
	],
	weights: "가중치 84%",
	aria: "Tesseract 한국어 kor 모델의 층 구성. 높이 48인 흑백 줄 이미지가 3×3 합성곱을 지나 특징 16개가 되고, 3×3 최대 풀링으로 높이와 폭이 3분의 1로 줄어든다. 세로 방향 LSTM이 열마다 위에서 아래로 훑어 높이를 1로 접는다. 그 뒤 왼쪽에서 오른쪽으로 읽는 LSTM 96, 오른쪽에서 왼쪽으로 읽는 LSTM 96, 다시 왼쪽에서 오른쪽으로 읽는 LSTM 512를 지나, 칸마다 출력 150개의 확률을 낸다. 가중치의 84%가 마지막 LSTM 512 한 층에 몰려 있다.",
};

const CELL_W = 104;
const COLS = [20, 132, 244, 356];
const cx = (i: number) => COLS[i] + CELL_W / 2;
const ROW_A = 34;
const ROW_B = 184;
const SKETCH_H = 72;
// 텐서 모양을 그림 크기로: 높이 48 → 54px, 폭 W → 84px
const hOf = (rows: number) => Math.max(3, (rows / 48) * 54);
const W_FULL = 84;
const W_THIRD = 28;
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

function Labels({ i, top }: { i: number; top: number }) {
	const [code, shape] = LABELS.layers[i];
	return (
		<g>
			<text x={cx(i % 4)} y={top + SKETCH_H + 16} textAnchor="middle" fontSize="11.5" fontFamily={mono} fontWeight="600" fill="var(--foreground)">
				{code}
			</text>
			<text x={cx(i % 4)} y={top + SKETCH_H + 31} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
				{shape}
			</text>
		</g>
	);
}

// 채널이 여럿인 텐서는 뒤로 겹친 판 세 장으로 그린다
function Stack({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children?: ReactNode }) {
	return (
		<g>
			{[2, 1, 0].map((k) => (
				<rect key={k} x={x + k * 4} y={y - k * 4} width={w} height={h} rx="1.5" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.7" strokeWidth="0.9" />
			))}
			{children}
		</g>
	);
}

// 가로로 읽는 층: W/3칸을 한 줄로 늘어놓고 읽는 방향을 화살표로 표시한다
function Strip({ i, dir, thick = 12 }: { i: number; dir: "right" | "left" | null; thick?: number }) {
	const x = cx(i) - W_FULL / 2;
	const y = ROW_B + SKETCH_H / 2 - thick / 2 + 6;
	const n = 12;
	const arrowY = y - 9;
	return (
		<g>
			{Array.from({ length: n }, (_, k) => (
				<rect key={k} x={x + (k * W_FULL) / n} y={y} width={W_FULL / n} height={thick} fill="var(--accent)" fillOpacity={0.18 + 0.06 * (k % 3)} stroke="var(--background)" strokeWidth="0.8" />
			))}
			{dir && (
				<line
					x1={dir === "right" ? x + 4 : x + W_FULL - 4}
					y1={arrowY}
					x2={dir === "right" ? x + W_FULL - 4 : x + 4}
					y2={arrowY}
					stroke="var(--accent)"
					strokeWidth="1.5"
					markerEnd="url(#tl-arrow-accent)"
				/>
			)}
		</g>
	);
}

const Chevron = ({ x, y }: { x: number; y: number }) => (
	<path d={`M ${x - 2} ${y - 4} L ${x + 2} ${y} L ${x - 2} ${y + 4}`} fill="none" stroke="rgb(var(--gray))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
);

export default function TesseractLayersDiagram() {
	const t = LABELS;
	const midA = ROW_A + SKETCH_H / 2 + 6;
	const midB = ROW_B + SKETCH_H / 2 + 6;
	const poolH = hOf(16);

	return (
		<svg viewBox="0 0 480 300" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<marker id="tl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
				<marker id="tl-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent)" />
				</marker>
			</defs>

			<text x="20" y="18" fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
				{t.rowA}
			</text>

			{/* ① 입력: 높이 48로 맞춘 흑백 줄 이미지 */}
			<rect x={cx(0) - W_FULL / 2} y={midA - hOf(48) / 2} width={W_FULL} height={hOf(48)} rx="2" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity="0.7" />
			<text x={cx(0)} y={midA + 7} textAnchor="middle" fontSize="19" fontWeight="600" fill="var(--foreground)" textLength={W_FULL - 12} lengthAdjust="spacingAndGlyphs">
				{t.inputText}
			</text>
			<Labels i={0} top={ROW_A} />
			<Chevron x={COLS[1] - 4} y={midA} />

			{/* ② 합성곱: 높이·폭은 그대로, 특징 16개 */}
			<Stack x={cx(1) - W_FULL / 2 - 4} y={midA - hOf(48) / 2 + 4} w={W_FULL} h={hOf(48)}>
				<rect x={cx(1) - W_FULL / 2 + 6} y={midA - hOf(48) / 2 + 10} width="9" height="9" fill="var(--accent)" fillOpacity="0.5" stroke="var(--accent)" />
			</Stack>
			<Labels i={1} top={ROW_A} />
			<Chevron x={COLS[2] - 4} y={midA} />

			{/* ③ 풀링: 높이와 폭이 3분의 1 */}
			<Stack x={cx(2) - W_THIRD / 2 - 4} y={midA - poolH / 2 + 4} w={W_THIRD} h={poolH} />
			<Labels i={2} top={ROW_A} />
			<Chevron x={COLS[3] - 4} y={midA} />

			{/* ④ 세로 LSTM: 열마다 위에서 아래로 훑어 높이를 1로 접는다 */}
			<rect x={cx(3) - W_THIRD / 2} y={ROW_A + 8} width={W_THIRD} height={poolH} rx="1.5" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.7" strokeWidth="0.9" />
			{[0, 1, 2].map((k) => {
				const x = cx(3) - W_THIRD / 2 + 5 + k * 9;
				return <line key={k} x1={x} y1={ROW_A + 11} x2={x} y2={ROW_A + 8 + poolH + 18} stroke="var(--accent)" strokeWidth="1.3" markerEnd="url(#tl-arrow-accent)" />;
			})}
			<rect x={cx(3) - W_THIRD / 2} y={ROW_A + 8 + poolH + 24} width={W_THIRD} height="4" fill="var(--accent)" />
			<Labels i={3} top={ROW_A} />

			{/* 위 줄 끝에서 아래 줄 처음으로 */}
			<path
				d={`M ${cx(3)} ${ROW_A + SKETCH_H + 40} V ${ROW_B - 14} H ${cx(0)} V ${ROW_B + 10}`}
				fill="none"
				stroke="rgb(var(--gray))"
				strokeWidth="1.5"
				markerEnd="url(#tl-arrow)"
			/>
			<text x="20" y={ROW_B - 22} fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
				{t.rowB}
			</text>

			{/* ⑤–⑦ 가로 LSTM 세 층, ⑧ 칸마다 확률 150개 */}
			<Strip i={0} dir="right" />
			<Labels i={4} top={ROW_B} />
			<Chevron x={COLS[1] - 4} y={midB} />
			<Strip i={1} dir="left" />
			<Labels i={5} top={ROW_B} />
			<Chevron x={COLS[2] - 4} y={midB} />
			<Strip i={2} dir="right" thick={20} />
			<rect x={cx(2) - 34} y={ROW_B + SKETCH_H / 2 + 22} width="68" height="16" rx="8" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1" />
			<text x={cx(2)} y={ROW_B + SKETCH_H / 2 + 34} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--accent)">
				{t.weights}
			</text>
			<Labels i={6} top={ROW_B} />
			<Chevron x={COLS[3] - 4} y={midB} />
			<Strip i={3} dir={null} />
			{/* 한 칸이 내는 150개 확률을 막대 몇 개로 줄여 그린다 */}
			{[5, 9, 3, 14, 6, 2, 8].map((h, k) => {
				const x = cx(3) - W_FULL / 2 + (W_FULL / 12) * 5 - 6 + k * 3;
				const base = ROW_B + SKETCH_H / 2 - 6 + 6;
				return <rect key={k} x={x} y={base - h - 3} width="2" height={h} fill="var(--accent)" fillOpacity={h === 14 ? 1 : 0.5} />;
			})}
			<Labels i={7} top={ROW_B} />
		</svg>
	);
}

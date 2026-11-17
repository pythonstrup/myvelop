// 합성 데이터의 글꼴 22종이 네 묶음에 어떻게 나뉘었는지 보여 주는 표 그림.
// 열은 글꼴(손글씨 12종·손글씨 3종·인쇄체 7종), 행은 묶음이고, 칠한 칸은 그 글꼴로 그린 줄이 들어 있다는 뜻이다.
// 손글씨 3종 열은 test_hand에만 칠해져 있어서 학습과 고르기에 한 번도 쓰이지 않았다는 것이 한눈에 보인다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	hand: "손글씨 15종",
	print: "인쇄체 7종",
	cols: ["12종", "3종", "7종"],
	head: ["묶음", "하는 일"],
	rows: [
		{ name: "train", count: "40,000줄", role: "가중치를 고친다", note: "", cells: ["70%", "", "30%"] },
		{ name: "val", count: "2,000줄", role: "가장 좋은 저장 시점을 고른다", note: "train과 같은 글꼴을 쓴다", cells: ["", "", ""] },
		{ name: "test_hand", count: "3,000줄", role: "처음 보는 글씨로 실력을 잰다", note: "고르기가 끝난 뒤에만 읽었다", cells: ["", "", ""] },
		{ name: "test_print", count: "2,000줄", role: "일반 글자를 잊지 않았는지 본다", note: "글꼴이 train과 겹쳐 참고로만 본다", cells: ["", "", ""] },
	],
	footer: "칠한 칸은 그 글꼴로 그린 줄이 들어 있다는 뜻이다.",
	aria: "합성 데이터의 글꼴 22종이 네 묶음에 나뉜 모습. 손글씨 15종 가운데 12종과 인쇄체 7종으로 train 40,000줄을 그렸고, 손글씨가 70%, 인쇄체가 30%다. train은 가중치를 고치는 데 쓴다. val 2,000줄은 train과 같은 글꼴로 그렸고, 가장 좋은 저장 시점을 고르는 데 쓴다. test_hand 3,000줄은 학습에서 뺀 손글씨 3종으로만 그렸다. train과 val에는 이 3종이 한 줄도 없어서, 처음 보는 글씨로 실력을 재는 묶음이 된다. test_hand는 고르기가 끝난 뒤에만 읽었다. test_print 2,000줄은 인쇄체 7종으로 그렸고, 일반 글자를 잊지 않았는지 보는 데 쓴다. 인쇄체 글꼴이 train과 겹치므로 test_print 점수는 참고로만 본다.",
};

// 묶음마다 어느 글꼴 열을 쓰는지(손글씨 12종, 손글씨 3종, 인쇄체 7종)
const USES = [
	[true, false, true],
	[true, false, true],
	[false, true, false],
	[false, false, true],
];

const NAME_X = 16;
const COL_X = [112, 168, 224];
const CELL_W = 50;
const ROLE_X = 290;
const ROW_H = 50;
const ROW_Y = [56, 112, 182, 238]; // 학습 쪽 두 묶음과 시험 쪽 두 묶음 사이를 띄운다
const HAND = 2; // test_hand 행
const PRINT = 3; // test_print 행

function Row({ i }: { i: number }) {
	const row = LABELS.rows[i];
	const y = ROW_Y[i];
	const hand = i === HAND;
	const print = i === PRINT;
	const roleY = row.note ? y + 22 : y + 30;

	return (
		<g>
			<rect
				x="6"
				y={y}
				width="468"
				height={ROW_H}
				rx="8"
				fill={hand ? "var(--accent)" : print ? "none" : "var(--secondary)"}
				fillOpacity={hand ? 0.08 : print ? undefined : 0.45}
				stroke={hand ? "var(--accent)" : print ? "rgb(var(--gray))" : "none"}
				strokeWidth={hand ? 1.6 : 1.2}
				strokeDasharray={print ? "5 4" : undefined}
			/>
			<text x={NAME_X} y={y + 22} fontSize="14" fontWeight="700" fill={hand ? "var(--accent)" : "var(--foreground)"}>
				{row.name}
			</text>
			<text x={NAME_X} y={y + 39} fontSize="11.5" fill="var(--muted-foreground)">
				{row.count}
			</text>

			{COL_X.map((x, c) => {
				const used = USES[i][c];
				const cellY = y + 9;
				return (
					<g key={x}>
						<rect
							x={x}
							y={cellY}
							width={CELL_W}
							height={ROW_H - 18}
							rx="4"
							fill={used ? (hand ? "var(--accent)" : "rgb(var(--gray))") : "none"}
							fillOpacity={used ? (hand ? 0.75 : 0.38) : undefined}
							stroke="rgb(var(--gray))"
							strokeOpacity={used ? 0 : 0.45}
							strokeDasharray={used ? undefined : "3 3"}
						/>
						{row.cells[c] && (
							<text x={x + CELL_W / 2} y={cellY + 21} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
								{row.cells[c]}
							</text>
						)}
					</g>
				);
			})}

			<text x={ROLE_X} y={roleY} fontSize="12.5" fontWeight={hand ? 700 : 500} fill={hand ? "var(--accent)" : "var(--foreground)"}>
				{row.role}
			</text>
			{row.note && (
				<text x={print ? ROLE_X + 15 : ROLE_X} y={y + 39} fontSize="11" fill="var(--muted-foreground)">
					{row.note}
				</text>
			)}
			{print && (
				<g transform={`translate(${ROLE_X + 5} ${y + 35})`}>
					<path d="M 0 -6 L 5.5 4 L -5.5 4 Z" fill="none" stroke="rgb(var(--gray))" strokeWidth="1.2" strokeLinejoin="round" />
					<line x1="0" y1="-2.5" x2="0" y2="0.5" stroke="rgb(var(--gray))" strokeWidth="1.2" />
					<circle cx="0" cy="2.4" r="0.7" fill="rgb(var(--gray))" />
				</g>
			)}
		</g>
	);
}

export default function DataSplitDiagram() {
	const t = LABELS;
	const handL = COL_X[0];
	const handR = COL_X[1] + CELL_W;
	const printL = COL_X[2];
	const printR = COL_X[2] + CELL_W;

	return (
		<svg viewBox="0 0 480 322" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			{/* 글꼴 머리: 손글씨 15종은 12종과 3종으로 갈린다 */}
			<g fontSize="12" fontWeight="600" fill="var(--foreground)" textAnchor="middle">
				<text x={(handL + handR) / 2} y="16">
					{t.hand}
				</text>
				<text x={(printL + printR) / 2} y="16">
					{t.print}
				</text>
			</g>
			<g fill="none" stroke="rgb(var(--gray))" strokeWidth="1.2">
				<path d={`M ${handL + 2} 28 V 23 H ${handR - 2} V 28`} />
				<path d={`M ${printL + 2} 28 V 23 H ${printR - 2} V 28`} />
			</g>
			{t.cols.map((label, c) => (
				<text key={label} x={COL_X[c] + CELL_W / 2} y="44" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={c === 1 ? "var(--accent)" : "var(--foreground)"}>
					{label}
				</text>
			))}
			<text x={NAME_X} y="44" fontSize="11" fill="var(--muted-foreground)">
				{t.head[0]}
			</text>
			<text x={ROLE_X} y="44" fontSize="11" fill="var(--muted-foreground)">
				{t.head[1]}
			</text>

			{t.rows.map((row, i) => (
				<Row key={row.name} i={i} />
			))}

			<text x="240" y="312" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{t.footer}
			</text>
		</svg>
	);
}

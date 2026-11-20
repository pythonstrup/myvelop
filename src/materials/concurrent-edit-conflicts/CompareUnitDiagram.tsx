// 비교 단위 — B가 설명만 고쳐 저장할 때, 행 단위와 칸 단위 요청이 무엇을 보내고 서버가 무엇을 확인하는지.
import { textWidth } from "./admin";

const CARD_W = 324;
const CARD_H = 278;
const GAP = 16;
const H = CARD_H + 16;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const BORDER = { stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;

interface Unit {
	title: string;
	body: { text: string; mark?: boolean }[];
	check: string;
	result: { label: string; fill: string; note: string };
}

const UNITS: Unit[] = [
	{
		title: "행 단위로 비교",
		body: [
			{ text: "{" },
			{ text: '  "version": 7,', mark: true },
			{ text: '  "price": 39000,' },
			{ text: '  "stock": 120, …' },
			{ text: '  "description": "…손세탁 권장"' },
			{ text: "}" },
		],
		check: "행 버전: 읽은 7, 최신 8",
		result: {
			label: "거절",
			fill: "var(--destructive)",
			note: "설명은 아무도 안 바꿨는데도",
		},
	},
	{
		title: "칸 단위로 비교",
		body: [
			{ text: "{" },
			{ text: '  "changes": {' },
			{ text: '    "description": "…손세탁 권장" },' },
			{ text: '  "seen": {', mark: true },
			{ text: '    "description": "…100% 셔츠" }', mark: true },
			{ text: "}" },
		],
		check: "설명 칸: 읽은 값과 최신 값이 같음",
		result: {
			label: "저장",
			fill: "var(--accent)",
			note: "A가 내린 가격도 그대로 남는다",
		},
	},
];

function UnitCard({ unit, i }: { unit: Unit; i: number }) {
	const chipW = textWidth(unit.result.label, 12) + 20;
	return (
		<g transform={`translate(${8 + i * (CARD_W + GAP)} 8)`}>
			<rect
				width={CARD_W}
				height={CARD_H}
				rx="12"
				fill="var(--background)"
				{...BORDER}
			/>
			<text
				x="18"
				y="32"
				fontSize="14"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{unit.title}
			</text>
			<text x="18" y="58" fontSize="10.5" fill="var(--muted-foreground)">
				B가 보내는 요청 본문
			</text>
			<rect
				x="18"
				y="66"
				width={CARD_W - 36}
				height={unit.body.length * 17 + 16}
				rx="8"
				fill="var(--secondary)"
				fillOpacity="0.6"
			/>
			{unit.body.map((line, j) => {
				const y = 86 + j * 17;
				return (
					<g key={line.text}>
						{line.mark && (
							<rect
								x="22"
								y={y - 12}
								width={CARD_W - 44}
								height="16"
								rx="3"
								fill="var(--accent)"
								fillOpacity="0.14"
							/>
						)}
						<text
							x="28"
							y={y}
							fontSize="11"
							fontFamily={MONO}
							fill="var(--foreground)"
							style={{ whiteSpace: "pre" }}
						>
							{line.text}
						</text>
					</g>
				);
			})}
			<text x="18" y="206" fontSize="10.5" fill="var(--muted-foreground)">
				서버가 확인하는 것
			</text>
			<text x="18" y="226" fontSize="12.5" fill="var(--foreground)">
				{unit.check}
			</text>
			<rect
				x="18"
				y="240"
				width={chipW}
				height="24"
				rx="12"
				fill={unit.result.fill}
			/>
			<text
				x={18 + chipW / 2}
				y="256"
				textAnchor="middle"
				fontSize="12"
				fontWeight="700"
				fill="var(--background)"
			>
				{unit.result.label}
			</text>
			<text
				x={28 + chipW}
				y="256"
				fontSize="11.5"
				fill="var(--muted-foreground)"
			>
				{unit.result.note}
			</text>
		</g>
	);
}

export default function CompareUnitDiagram() {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${H}`}
				role="img"
				aria-label="B가 상품 설명만 고쳐 저장할 때 비교 단위에 따라 달라지는 요청과 결과. 왼쪽 행 단위 비교에서는 B가 버전 7과 함께 가격, 재고, 설명까지 행 전체를 보낸다. 서버는 읽은 버전이 7, 최신 버전이 8이라 설명은 아무도 안 바꿨는데도 저장을 거절한다. 오른쪽 칸 단위 비교에서는 B가 바꾼 설명 값과 그 칸을 읽었을 때의 값만 보낸다. 서버는 설명 칸의 읽은 값과 최신 값이 같으니 저장하고, A가 내린 가격도 그대로 남는다."
				style={{
					display: "block",
					minWidth: 560,
					maxWidth: 680,
					margin: "0 auto",
				}}
			>
				{UNITS.map((unit, i) => (
					<UnitCard key={unit.title} unit={unit} i={i} />
				))}
			</svg>
		</div>
	);
}

// 상품 표에 적용하기 — 처음 장의 저장을 칸마다 정한 방법으로 다시 처리하면, 묻는 창 없이 모든 수정이 남는다.
import { textWidth } from "./admin";

const HEAD_H = 40;
const ROW_H = 54;
const COLS = [
	{ x: 28, label: "칸" },
	{ x: 104, label: "B가 본 값" },
	{ x: 224, label: "최신 값" },
	{ x: 344, label: "B가 보낸 것" },
	{ x: 452, label: "처리" },
	{ x: 568, label: "남는 값" },
];

interface Cell {
	text: string;
	note?: string;
	muted?: boolean;
}

const ROWS: {
	field: string;
	seen: Cell;
	current: Cell;
	mine: Cell;
	how: string;
	result: string;
}[] = [
	{
		field: "가격",
		seen: { text: "39,000원" },
		current: { text: "29,000원", note: "A가 내림" },
		mine: { text: "안 바꿈", muted: true },
		how: "최신 값 유지",
		result: "29,000원",
	},
	{
		field: "재고",
		seen: { text: "120" },
		current: { text: "117", note: "주문 3건" },
		mine: { text: "+30", note: "입고" },
		how: "증감 연산",
		result: "147",
	},
	{
		field: "태그",
		seen: { text: "여름, 신상" },
		current: { text: "여름, 신상, 세일", note: "A가 세일 추가" },
		mine: { text: "신상 빼기" },
		how: "항목 병합",
		result: "여름, 세일",
	},
	{
		field: "상품 설명",
		seen: { text: "원래 설명" },
		current: { text: "원래 설명" },
		mine: { text: "세탁 방법 추가" },
		how: "내 값 저장",
		result: "세탁 방법 추가",
	},
];

const CHECKS = [
	{ rule: "판매 중이면 재고가 있어야 한다", value: "재고 147" },
	{ rule: "태그는 5개까지", value: "2개" },
];

const BODY_TOP = 8 + HEAD_H;
const CHECK_TOP = BODY_TOP + ROW_H * ROWS.length;
const CHECK_H = 70;
const H = CHECK_TOP + CHECK_H + 44;

function CellText({
	x,
	cy,
	cell,
	bold = false,
}: {
	x: number;
	cy: number;
	cell: Cell;
	bold?: boolean;
}) {
	return (
		<g>
			<text
				x={x}
				y={cell.note ? cy - 2 : cy + 4.5}
				fontSize="13"
				fontWeight={bold ? 700 : 400}
				fill={cell.muted ? "var(--muted-foreground)" : "var(--foreground)"}
			>
				{cell.text}
			</text>
			{cell.note && (
				<text x={x} y={cy + 14} fontSize="10.5" fill="var(--muted-foreground)">
					{cell.note}
				</text>
			)}
		</g>
	);
}

function PassChip({ x, cy }: { x: number; cy: number }) {
	const w = textWidth("통과", 11.5) + 18;
	return (
		<g>
			<rect
				x={x}
				y={cy - 11}
				width={w}
				height="22"
				rx="11"
				fill="var(--accent)"
			/>
			<text
				x={x + w / 2}
				y={cy + 4}
				textAnchor="middle"
				fontSize="11.5"
				fontWeight="700"
				fill="var(--background)"
			>
				통과
			</text>
		</g>
	);
}

export default function SaveByFieldDiagram() {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${H}`}
				role="img"
				aria-label="B의 저장 하나를 칸마다 정한 방법으로 처리하는 표. 가격은 B가 본 39,000원을 A가 29,000원으로 내렸고 B는 바꾸지 않아 최신 값 29,000원을 유지한다. 재고는 B가 본 120이 주문 3건으로 117이 됐고, B가 입고 30을 증감으로 보내 147이 된다. 태그는 B가 본 여름과 신상에 A가 세일을 더했고, B가 신상을 빼서 항목 병합으로 여름과 세일이 남는다. 상품 설명은 B만 세탁 방법을 덧붙여 B의 값을 저장한다. 합친 행은 판매 중이면 재고가 있어야 한다는 규칙과 태그는 5개까지라는 규칙을 모두 통과한다. 충돌 창 없이 A의 두 수정, 주문 세 건, B의 세 수정이 모두 남는다."
				style={{
					display: "block",
					minWidth: 560,
					maxWidth: 680,
					margin: "0 auto",
				}}
			>
				<rect
					x="8"
					y="8"
					width="664"
					height={H - 16}
					rx="12"
					fill="var(--background)"
					stroke="rgb(var(--gray))"
					strokeOpacity="0.45"
				/>
				<path
					d={`M 8 ${BODY_TOP} V 20 A 12 12 0 0 1 20 8 H 660 A 12 12 0 0 1 672 20 V ${BODY_TOP} Z`}
					fill="var(--secondary)"
					fillOpacity="0.7"
				/>
				<rect
					x={COLS[5].x - 12}
					y={BODY_TOP}
					width={672 - COLS[5].x + 12 - 12}
					height={ROW_H * ROWS.length}
					fill="var(--accent)"
					fillOpacity="0.07"
				/>
				{COLS.map((c) => (
					<text
						key={c.label}
						x={c.x}
						y={8 + 25}
						fontSize="12"
						fontWeight="600"
						fill="var(--muted-foreground)"
					>
						{c.label}
					</text>
				))}
				{ROWS.map((row, i) => {
					const top = BODY_TOP + i * ROW_H;
					const cy = top + ROW_H / 2;
					const chipW = textWidth(row.how, 12) + 22;
					return (
						<g key={row.field}>
							{i > 0 && (
								<line
									x1="20"
									y1={top}
									x2="660"
									y2={top}
									stroke="rgb(var(--gray))"
									strokeOpacity="0.25"
								/>
							)}
							<text
								x={COLS[0].x}
								y={cy + 4.5}
								fontSize="12.5"
								fontWeight="600"
								fill="var(--foreground)"
							>
								{row.field}
							</text>
							<CellText x={COLS[1].x} cy={cy} cell={row.seen} />
							<CellText x={COLS[2].x} cy={cy} cell={row.current} />
							<CellText x={COLS[3].x} cy={cy} cell={row.mine} />
							<rect
								x={COLS[4].x}
								y={cy - 13}
								width={chipW}
								height="26"
								rx="6"
								fill="var(--background)"
								stroke="var(--foreground)"
								strokeWidth="1.5"
							/>
							<text
								x={COLS[4].x + chipW / 2}
								y={cy + 4.5}
								textAnchor="middle"
								fontSize="12"
								fontWeight="700"
								fill="var(--foreground)"
							>
								{row.how}
							</text>
							<CellText
								x={COLS[5].x}
								cy={cy}
								cell={{ text: row.result }}
								bold
							/>
						</g>
					);
				})}
				<line
					x1="20"
					y1={CHECK_TOP}
					x2="660"
					y2={CHECK_TOP}
					stroke="rgb(var(--gray))"
					strokeOpacity="0.45"
				/>
				<text
					x={COLS[0].x}
					y={CHECK_TOP + 24}
					fontSize="10.5"
					fill="var(--muted-foreground)"
				>
					합친 행 검사
				</text>
				{CHECKS.map((c, i) => {
					const cy = CHECK_TOP + 46;
					const x = COLS[0].x + i * 316;
					const ruleW = textWidth(c.rule, 12.5);
					const valueW = textWidth(c.value, 12);
					return (
						<g key={c.rule}>
							<text x={x} y={cy + 4.5} fontSize="12.5" fill="var(--foreground)">
								{c.rule}
							</text>
							<text
								x={x + ruleW + 10}
								y={cy + 4.5}
								fontSize="12"
								fill="var(--muted-foreground)"
							>
								{c.value}
							</text>
							<PassChip x={x + ruleW + valueW + 20} cy={cy} />
						</g>
					);
				})}
				<line
					x1="20"
					y1={H - 46}
					x2="660"
					y2={H - 46}
					stroke="rgb(var(--gray))"
					strokeOpacity="0.25"
				/>
				<text
					x="24"
					y={H - 26}
					fontSize="12.5"
					fontWeight="600"
					fill="var(--foreground)"
				>
					충돌 창 없이 A의 두 수정, 주문 세 건, B의 세 수정이 모두 남는다
				</text>
			</svg>
		</div>
	);
}

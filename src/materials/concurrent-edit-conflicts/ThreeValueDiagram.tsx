// 세 값으로 충돌 판정 — 가격 칸 하나에서 읽은 값·최신 값·보낸 값의 조합에 따라 판정이 갈린다. 같은 값은 같은 색이다.
import { textWidth } from "./admin";

const ROW_H = 54;
const HEAD_H = 40;
const H = 8 + HEAD_H + ROW_H * 4 + 8;
const COLS = [
	{ x: 28, label: "읽은 값" },
	{ x: 140, label: "최신 값" },
	{ x: 252, label: "보낸 값" },
	{ x: 380, label: "판정" },
];

// 값마다 색을 고정해, 어느 값끼리 같은지 색으로 보이게 한다.
const TONE: Record<string, { fill: string; text: string }> = {
	"39,000": { fill: "var(--secondary)", text: "var(--foreground)" },
	"29,000": { fill: "var(--accent)", text: "var(--background)" },
	"35,000": { fill: "var(--foreground)", text: "var(--background)" },
};

const ROWS = [
	{
		values: ["39,000", "39,000", "29,000"],
		verdict: "내 값 저장",
		note: "아무도 안 바꿨다",
		conflict: false,
	},
	{
		values: ["39,000", "29,000", "39,000"],
		verdict: "최신 값 유지",
		note: "나는 이 칸을 안 바꿨다",
		conflict: false,
	},
	{
		values: ["39,000", "29,000", "29,000"],
		verdict: "충돌 아님",
		note: "둘이 같은 값으로 바꿨다",
		conflict: false,
	},
	{
		values: ["39,000", "29,000", "35,000"],
		verdict: "충돌",
		note: "서로 다르게 바꿨다",
		conflict: true,
	},
];

function ValueChip({ x, cy, value }: { x: number; cy: number; value: string }) {
	const tone = TONE[value];
	return (
		<g>
			<rect x={x} y={cy - 14} width="92" height="28" rx="14" fill={tone.fill} />
			<text
				x={x + 46}
				y={cy + 4.5}
				textAnchor="middle"
				fontSize="12.5"
				fontWeight="600"
				fill={tone.text}
			>
				{value}원
			</text>
		</g>
	);
}

export default function ThreeValueDiagram() {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${H}`}
				role="img"
				aria-label="가격 칸 하나의 세 값 판정표. 첫째, 읽은 값 39,000원, 최신 값 39,000원, 보낸 값 29,000원이면 아무도 안 바꿨으니 내 값을 저장한다. 둘째, 읽은 값 39,000원, 최신 값 29,000원, 보낸 값 39,000원이면 나는 이 칸을 안 바꿨으니 최신 값을 유지한다. 셋째, 읽은 값 39,000원, 최신 값 29,000원, 보낸 값 29,000원이면 둘이 같은 값으로 바꿨으니 충돌이 아니다. 넷째, 읽은 값 39,000원, 최신 값 29,000원, 보낸 값 35,000원이면 서로 다르게 바꿨으니 충돌이다."
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
					d={`M 8 ${8 + HEAD_H} V 20 A 12 12 0 0 1 20 8 H 660 A 12 12 0 0 1 672 20 V ${8 + HEAD_H} Z`}
					fill="var(--secondary)"
					fillOpacity="0.7"
				/>
				{COLS.map((c) => (
					<text
						key={c.label}
						x={c.label === "판정" ? c.x : c.x + 46}
						y={8 + 25}
						textAnchor={c.label === "판정" ? "start" : "middle"}
						fontSize="12"
						fontWeight="600"
						fill="var(--muted-foreground)"
					>
						{c.label}
					</text>
				))}
				{ROWS.map((row, i) => {
					const top = 8 + HEAD_H + i * ROW_H;
					const cy = top + ROW_H / 2;
					const chipW = textWidth(row.verdict, 12.5) + 24;
					return (
						<g key={row.verdict}>
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
							{row.values.map((v, j) => (
								<ValueChip
									key={COLS[j].label}
									x={COLS[j].x}
									cy={cy}
									value={v}
								/>
							))}
							<rect
								x={COLS[3].x}
								y={cy - 14}
								width={chipW}
								height="28"
								rx="6"
								fill={row.conflict ? "var(--destructive)" : "var(--background)"}
								stroke={
									row.conflict ? "var(--destructive)" : "var(--foreground)"
								}
								strokeWidth="1.5"
							/>
							<text
								x={COLS[3].x + chipW / 2}
								y={cy + 4.5}
								textAnchor="middle"
								fontSize="12.5"
								fontWeight="700"
								fill={row.conflict ? "var(--background)" : "var(--foreground)"}
							>
								{row.verdict}
							</text>
							<text
								x={COLS[3].x + chipW + 12}
								y={cy + 4.5}
								fontSize="12"
								fill="var(--muted-foreground)"
							>
								{row.note}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

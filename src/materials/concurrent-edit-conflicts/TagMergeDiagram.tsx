// 목록 값 병합 — 태그마다 읽은 값·최신 값·보낸 값에 있는지를 놓고 4장의 세 값 판정을 한다.
import { textWidth } from "./admin";

const ROW_H = 50;
const HEAD_H = 40;
const FOOT_H = 54;
const H = 8 + HEAD_H + ROW_H * 3 + FOOT_H + 8;
const CHIP_W = 64;
const VALUE_COLS = [
	{ cx: 160, label: "B가 읽은 값" },
	{ cx: 256, label: "최신 값" },
	{ cx: 352, label: "B가 보낸 값" },
];
const VERDICT_X = 416;

const ROWS = [
	{
		tag: "여름",
		has: [true, true, true],
		verdict: "내 값 저장",
		note: "아무도 안 바꿨다",
	},
	{
		tag: "신상",
		has: [true, true, false],
		verdict: "내 값 저장",
		note: "B가 뺐다",
	},
	{
		tag: "세일",
		has: [false, true, false],
		verdict: "최신 값 유지",
		note: "B는 안 건드렸다",
	},
];
const RESULT = ["여름", "세일"];

// 있음은 채운 칩, 없음은 점선 칩.
function HasChip({ cx, cy, has }: { cx: number; cy: number; has: boolean }) {
	return (
		<g>
			<rect
				x={cx - CHIP_W / 2}
				y={cy - 13}
				width={CHIP_W}
				height="26"
				rx="13"
				fill={has ? "var(--secondary)" : "none"}
				stroke={has ? "none" : "var(--muted-foreground)"}
				strokeDasharray={has ? undefined : "3 3"}
			/>
			<text
				x={cx}
				y={cy + 4.5}
				textAnchor="middle"
				fontSize="12"
				fontWeight={has ? 600 : 400}
				fill={has ? "var(--foreground)" : "var(--muted-foreground)"}
			>
				{has ? "있음" : "없음"}
			</text>
		</g>
	);
}

export default function TagMergeDiagram() {
	const footTop = 8 + HEAD_H + ROW_H * 3;
	const footCy = footTop + FOOT_H / 2;
	const resultX = 28 + textWidth("합친 결과", 13) + 16;
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${H}`}
				role="img"
				aria-label="태그마다 세 값 판정을 한 표. 여름은 B가 읽은 값, 최신 값, B가 보낸 값에 모두 있어 아무도 안 바꿨으니 내 값을 저장하고 남는다. 신상은 읽은 값과 최신 값에는 있고 B가 보낸 값에는 없다. B가 뺐으니 내 값을 저장해 빠진다. 세일은 읽은 값과 보낸 값에는 없고 최신 값에만 있다. B는 안 건드렸으니 최신 값을 유지해 남는다. 합친 결과는 여름과 세일이다."
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
				<text
					x="28"
					y="33"
					fontSize="12"
					fontWeight="600"
					fill="var(--muted-foreground)"
				>
					태그
				</text>
				{VALUE_COLS.map((c) => (
					<text
						key={c.label}
						x={c.cx}
						y="33"
						textAnchor="middle"
						fontSize="12"
						fontWeight="600"
						fill="var(--muted-foreground)"
					>
						{c.label}
					</text>
				))}
				<text
					x={VERDICT_X}
					y="33"
					fontSize="12"
					fontWeight="600"
					fill="var(--muted-foreground)"
				>
					판정
				</text>

				{ROWS.map((row, i) => {
					const top = 8 + HEAD_H + i * ROW_H;
					const cy = top + ROW_H / 2;
					const chipW = textWidth(row.verdict, 12.5) + 24;
					return (
						<g key={row.tag}>
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
								x="28"
								y={cy + 5}
								fontSize="13.5"
								fontWeight="700"
								fill="var(--foreground)"
							>
								{row.tag}
							</text>
							{row.has.map((has, j) => (
								<HasChip
									key={VALUE_COLS[j].label}
									cx={VALUE_COLS[j].cx}
									cy={cy}
									has={has}
								/>
							))}
							<rect
								x={VERDICT_X}
								y={cy - 13}
								width={chipW}
								height="26"
								rx="6"
								fill="var(--background)"
								stroke="var(--foreground)"
								strokeWidth="1.5"
							/>
							<text
								x={VERDICT_X + chipW / 2}
								y={cy + 4.5}
								textAnchor="middle"
								fontSize="12.5"
								fontWeight="700"
								fill="var(--foreground)"
							>
								{row.verdict}
							</text>
							<text
								x={VERDICT_X + chipW + 12}
								y={cy + 4.5}
								fontSize="12"
								fill="var(--muted-foreground)"
							>
								{row.note}
							</text>
						</g>
					);
				})}

				<line
					x1="20"
					y1={footTop}
					x2="660"
					y2={footTop}
					stroke="rgb(var(--gray))"
					strokeOpacity="0.45"
				/>
				<text
					x="28"
					y={footCy + 5}
					fontSize="13"
					fontWeight="700"
					fill="var(--foreground)"
				>
					합친 결과
				</text>
				{RESULT.map((tag, i) => (
					<g key={tag}>
						<rect
							x={resultX + i * (CHIP_W + 8)}
							y={footCy - 13}
							width={CHIP_W}
							height="26"
							rx="13"
							fill="var(--accent)"
						/>
						<text
							x={resultX + i * (CHIP_W + 8) + CHIP_W / 2}
							y={footCy + 4.5}
							textAnchor="middle"
							fontSize="12.5"
							fontWeight="700"
							fill="var(--background)"
						>
							{tag}
						</text>
					</g>
				))}
				<text
					x={resultX + RESULT.length * (CHIP_W + 8) + 6}
					y={footCy + 4.5}
					fontSize="12"
					fill="var(--muted-foreground)"
				>
					A가 더한 세일과 B가 뺀 신상이 모두 반영된다
				</text>
			</svg>
		</div>
	);
}

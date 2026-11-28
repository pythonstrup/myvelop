// 충돌 알림과 의도적 덮어쓰기 — 충돌 창에 보여 줄 것, 그리고 덮어쓰기가 판정을 건너뛰면 안 되는 이유.
// A가 한 일은 강조색, B가 한 일은 진한 색이다(PageHeader 의 A·B 색과 같다).
import {
	CellOutline,
	Dimmer,
	Figure,
	LINEN,
	PageHeader,
	ProductRow,
	ROWS_TOP,
	TableHead,
	textWidth,
} from "./admin";

const B_ROW = {
	...LINEN,
	price: "35,000원",
	desc: ["통기성 좋은 린넨 100% 셔츠.", "찬물 손세탁 권장"],
};
const ROW_H = 58;

function ValueChip({
	x,
	cy,
	text,
	fill,
}: {
	x: number;
	cy: number;
	text: string;
	fill: string;
}) {
	const w = textWidth(text, 12.5) + 20;
	return (
		<g>
			<rect x={x} y={cy - 12} width={w} height="24" rx="12" fill={fill} />
			<text
				x={x + w / 2}
				y={cy + 4.5}
				textAnchor="middle"
				fontSize="12.5"
				fontWeight="700"
				fill="var(--background)"
			>
				{text}
			</text>
		</g>
	);
}

// 1. 충돌 창 — 부딪힌 칸의 세 값을 나란히 보여 주고, 충돌 없는 칸은 함께 저장한다고 알린다.
const DIALOG = { x: 160, y: 62, w: 360, h: 252 };
const VALUE_ROWS = [
	{ label: "내가 처음 본 값", value: "39,000원", fill: null },
	{ label: "A님이 2분 전 저장한 값", value: "29,000원", fill: "var(--accent)" },
	{ label: "내가 입력한 값", value: "35,000원", fill: "var(--foreground)" },
];
const FRAME_H = DIALOG.y + DIALOG.h + 16;

export function ConflictDialogDiagram() {
	const { x, y, w, h } = DIALOG;
	const buttons = ["A님 값 따르기", "내 값으로 저장"].map((label) => ({
		label,
		bw: textWidth(label, 12) + 28,
	}));
	const bx1 = x + w - 20 - buttons[1].bw;
	const bx0 = bx1 - 8 - buttons[0].bw;
	return (
		<Figure
			frameH={FRAME_H}
			label="B의 화면에 뜬 충돌 창. 제목은 '가격이 충돌했습니다'이고, 편집하는 동안 A님이 가격을 바꿨다고 알린다. 내가 처음 본 값 39,000원, A님이 2분 전 저장한 값 29,000원, 내가 입력한 값 35,000원이 나란히 보인다. 아래에는 상품 설명은 충돌이 없어 함께 저장된다는 안내가 있고, 'A님 값 따르기'와 '내 값으로 저장' 버튼이 같은 무게로 놓여 있다."
		>
			<PageHeader count={1} />
			<TableHead />
			<ProductRow row={B_ROW} top={ROWS_TOP} h={ROW_H} />
			<CellOutline
				col="price"
				top={ROWS_TOP}
				h={ROW_H}
				color="var(--foreground)"
				tag="B 편집 중"
			/>
			<Dimmer frameH={FRAME_H} />

			<rect
				x={x}
				y={y}
				width={w}
				height={h}
				rx="10"
				fill="var(--background)"
				stroke="rgb(var(--gray))"
				strokeOpacity="0.45"
			/>
			<text
				x={x + 20}
				y={y + 32}
				fontSize="14"
				fontWeight="700"
				fill="var(--foreground)"
			>
				가격이 충돌했습니다
			</text>
			<text x={x + 20} y={y + 56} fontSize="12.5" fill="var(--foreground)">
				편집하는 동안 A님이 가격을 바꿨습니다.
			</text>
			{VALUE_ROWS.map((row, i) => {
				const top = y + 72 + i * 32;
				const cy = top + 16;
				return (
					<g key={row.label}>
						<line
							x1={x + 20}
							y1={top}
							x2={x + w - 20}
							y2={top}
							stroke="rgb(var(--gray))"
							strokeOpacity="0.25"
						/>
						<text
							x={x + 20}
							y={cy + 4.5}
							fontSize="12.5"
							fill="var(--muted-foreground)"
						>
							{row.label}
						</text>
						{row.fill ? (
							<ValueChip x={x + 210} cy={cy} text={row.value} fill={row.fill} />
						) : (
							<text
								x={x + 220}
								y={cy + 4.5}
								fontSize="12.5"
								fill="var(--muted-foreground)"
							>
								{row.value}
							</text>
						)}
					</g>
				);
			})}
			<line
				x1={x + 20}
				y1={y + 168}
				x2={x + w - 20}
				y2={y + 168}
				stroke="rgb(var(--gray))"
				strokeOpacity="0.25"
			/>
			<text
				x={x + 20}
				y={y + 192}
				fontSize="11.5"
				fill="var(--muted-foreground)"
			>
				상품 설명은 충돌이 없어 함께 저장됩니다.
			</text>
			{[bx0, bx1].map((bx, i) => (
				<g key={buttons[i].label}>
					<rect
						x={bx}
						y={y + h - 46}
						width={buttons[i].bw}
						height="30"
						rx="6"
						fill="var(--secondary)"
					/>
					<text
						x={bx + buttons[i].bw / 2}
						y={y + h - 27}
						textAnchor="middle"
						fontSize="12"
						fontWeight="600"
						fill="var(--foreground)"
					>
						{buttons[i].label}
					</text>
				</g>
			))}
		</Figure>
	);
}

// 2. 덮어쓰기 — 창을 띄운 뒤 C가 저장했을 때, 판정을 건너뛰면 C의 수정이 사라지고 본 값을 바꿔 보내면 다시 묻는다.
const STEPS = [
	"B가 충돌 창에서 최신 값 29,000원을 본다",
	"그사이 C가 가격을 25,000원으로 저장한다",
	"B가 내 값으로 저장을 누른다",
];
const PANELS = [
	{
		x: 24,
		title: "판정을 건너뛰면",
		send: "가격 35,000원, 판정 생략",
		server: "검사 없이 35,000원을 쓴다",
		result: "C의 25,000원이 사라진다",
		fill: "var(--destructive)",
	},
	{
		x: 348,
		title: "본 값을 바꿔 보내면",
		send: "본 값 29,000원, 내 값 35,000원",
		server: "최신 값 25,000원이 본 값과 다르다",
		result: "다시 충돌 창을 띄운다",
		fill: "var(--accent)",
	},
];
const PANEL_TOP = 128;
const PANEL_W = 308;
const PANEL_H = 150;
const OVERWRITE_H = PANEL_TOP + PANEL_H + 22;

export function OverwriteDiagram() {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${OVERWRITE_H}`}
				role="img"
				aria-label="덮어쓰기를 보내는 두 방법의 비교. B가 충돌 창에서 최신 값 29,000원을 보는 사이 C가 가격을 25,000원으로 저장하고, 그 뒤 B가 내 값으로 저장을 누른다. 판정을 건너뛰는 방법은 검사 없이 35,000원을 써서 C의 25,000원이 사라진다. 본 값을 29,000원으로 바꿔 보내는 방법은 최신 값 25,000원이 본 값과 달라 다시 충돌 창을 띄운다."
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
					height={OVERWRITE_H - 16}
					rx="12"
					fill="var(--background)"
					stroke="rgb(var(--gray))"
					strokeOpacity="0.45"
				/>
				<text x="24" y="34" fontSize="10.5" fill="var(--muted-foreground)">
					순서
				</text>
				{STEPS.map((step, i) => {
					const cy = 54 + i * 24;
					return (
						<g key={step}>
							<circle cx="36" cy={cy} r="9" fill="var(--secondary)" />
							<text
								x="36"
								y={cy + 4}
								textAnchor="middle"
								fontSize="10.5"
								fontWeight="700"
								fill="var(--foreground)"
							>
								{i + 1}
							</text>
							<text
								x="54"
								y={cy + 4.5}
								fontSize="12.5"
								fill="var(--foreground)"
							>
								{step}
							</text>
						</g>
					);
				})}
				{PANELS.map((p) => {
					const resultW = textWidth(p.result, 12.5) + 24;
					return (
						<g key={p.title}>
							<rect
								x={p.x}
								y={PANEL_TOP}
								width={PANEL_W}
								height={PANEL_H}
								rx="10"
								fill="none"
								stroke="rgb(var(--gray))"
								strokeOpacity="0.35"
							/>
							<text
								x={p.x + 16}
								y={PANEL_TOP + 28}
								fontSize="13"
								fontWeight="700"
								fill="var(--foreground)"
							>
								{p.title}
							</text>
							<text
								x={p.x + 16}
								y={PANEL_TOP + 58}
								fontSize="11"
								fill="var(--muted-foreground)"
							>
								보내는 것
							</text>
							<text
								x={p.x + 84}
								y={PANEL_TOP + 58}
								fontSize="12.5"
								fill="var(--foreground)"
							>
								{p.send}
							</text>
							<text
								x={p.x + 16}
								y={PANEL_TOP + 84}
								fontSize="11"
								fill="var(--muted-foreground)"
							>
								서버
							</text>
							<text
								x={p.x + 84}
								y={PANEL_TOP + 84}
								fontSize="12.5"
								fill="var(--foreground)"
							>
								{p.server}
							</text>
							<rect
								x={p.x + 16}
								y={PANEL_TOP + 104}
								width={resultW}
								height="28"
								rx="14"
								fill={p.fill}
							/>
							<text
								x={p.x + 16 + resultW / 2}
								y={PANEL_TOP + 122.5}
								textAnchor="middle"
								fontSize="12.5"
								fontWeight="700"
								fill="var(--background)"
							>
								{p.result}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

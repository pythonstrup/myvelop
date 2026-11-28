// 실시간 화면의 한계 — B의 화면이 서버보다 뒤처지는 네 가지 경우를 카드 네 장으로 보여 준다.
import type { ReactNode } from "react";
import { textWidth } from "./admin";

const CARD_W = 324;
const ROW1_H = 240;
const ROW2_H = 172;
const GAP = 16;
const H = 8 + ROW1_H + GAP + ROW2_H + 8;
const BORDER = { stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;

function Card({
	i,
	title,
	caption,
	children,
}: {
	i: number;
	title: string;
	caption: string;
	children: ReactNode;
}) {
	const h = i < 2 ? ROW1_H : ROW2_H;
	const x = 8 + (i % 2) * (CARD_W + GAP);
	const y = i < 2 ? 8 : 8 + ROW1_H + GAP;
	return (
		<g transform={`translate(${x} ${y})`}>
			<rect
				width={CARD_W}
				height={h}
				rx="12"
				fill="var(--background)"
				{...BORDER}
			/>
			<circle cx="28" cy="28" r="10" fill="var(--secondary)" />
			<text
				x="28"
				y="32"
				textAnchor="middle"
				fontSize="11"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{i + 1}
			</text>
			<text
				x="46"
				y="32.5"
				fontSize="13.5"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{title}
			</text>
			{children}
			<text x="18" y={h - 16} fontSize="11.5" fill="var(--muted-foreground)">
				{caption}
			</text>
		</g>
	);
}

// 이름표가 위에 붙은 값 칸.
function Cell({
	x,
	y,
	label,
	value,
}: {
	x: number;
	y: number;
	label: string;
	value: string;
}) {
	return (
		<g>
			<text x={x} y={y - 6} fontSize="10.5" fill="var(--muted-foreground)">
				{label}
			</text>
			<rect
				x={x}
				y={y}
				width="104"
				height="36"
				rx="6"
				fill="none"
				{...BORDER}
			/>
			<text x={x + 12} y={y + 23} fontSize="13" fill="var(--foreground)">
				{value}
			</text>
		</g>
	);
}

// 편집 중인 칸 — 굵은 테두리와 왼쪽 위 이름표.
function EditingCell({
	tag,
	value,
	color,
}: {
	tag: string;
	value: string;
	color: string;
}) {
	return (
		<g>
			<rect
				x="18"
				y="80"
				width="120"
				height="36"
				rx="6"
				fill="none"
				stroke={color}
				strokeWidth="2"
			/>
			<rect
				x="19"
				y="72"
				width={textWidth(tag, 10.5) + 12}
				height="16"
				rx="3"
				fill={color}
			/>
			<text
				x="25"
				y="84"
				fontSize="10.5"
				fontWeight="600"
				fill="var(--background)"
			>
				{tag}
			</text>
			<text x="30" y="103" fontSize="13" fill="var(--foreground)">
				{value}
			</text>
		</g>
	);
}

// 카드 1의 시간 순서 그림 — 세로선 둘(서버, B의 화면) 사이로 메시지가 엇갈린다.
const S = 86;
const B = 270;
const lineY = (x: number, x1: number, y1: number, x2: number, y2: number) =>
	y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
const deg = (x1: number, y1: number, x2: number, y2: number) =>
	(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
const SEND = { x1: S, y1: 116, x2: B, y2: 184 }; // A의 변경이 B의 화면으로 가는 길
const SAVE = { x1: B, y1: 128, x2: S, y2: 150 }; // B의 저장이 서버로 가는 길

function Arrow({
	x1,
	y1,
	x2,
	y2,
	color,
	dashed = false,
}: {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	color: string;
	dashed?: boolean;
}) {
	const a = Math.atan2(y2 - y1, x2 - x1);
	const wing = (s: number) =>
		`${x2 - 8 * Math.cos(a + s)} ${y2 - 8 * Math.sin(a + s)}`;
	return (
		<g stroke={color} strokeWidth="1.5" fill="none">
			<line
				x1={x1}
				y1={y1}
				x2={x2}
				y2={y2}
				strokeDasharray={dashed ? "4 4" : undefined}
			/>
			<path d={`M ${wing(0.45)} L ${x2} ${y2} L ${wing(-0.45)}`} />
		</g>
	);
}

// 선을 따라 기울어진 이름표. cx 는 선 위의 가로 위치.
function LineLabel({
	cx,
	x1,
	y1,
	x2,
	y2,
	text,
	color,
}: {
	cx: number;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	text: string;
	color: string;
}) {
	const cy = lineY(cx, x1, y1, x2, y2);
	const angle = x2 > x1 ? deg(x1, y1, x2, y2) : deg(x2, y2, x1, y1);
	return (
		<text
			x={cx}
			y={cy - 5}
			textAnchor="middle"
			fontSize="10.5"
			fontWeight="600"
			fill={color}
			transform={`rotate(${angle} ${cx} ${cy})`}
		>
			{text}
		</text>
	);
}

// 세로선 위에 놓이는 값.
function Val({
	x,
	y,
	text,
	color = "var(--foreground)",
	stroke,
}: {
	x: number;
	y: number;
	text: string;
	color?: string;
	stroke?: string;
}) {
	const w = textWidth(text, 11) + 16;
	return (
		<g>
			<rect
				x={x - w / 2}
				y={y}
				width={w}
				height="20"
				rx="5"
				fill="var(--background)"
				stroke={stroke ?? "rgb(var(--gray))"}
				strokeOpacity={stroke ? 1 : 0.45}
				strokeWidth={stroke ? 1.5 : 1}
			/>
			<text x={x} y={y + 14} textAnchor="middle" fontSize="11" fill={color}>
				{text}
			</text>
		</g>
	);
}

function CrossedMessages() {
	return (
		<g>
			{[
				{ x: S, label: "서버" },
				{ x: B, label: "B의 화면" },
			].map((l) => {
				const w = textWidth(l.label, 11) + 20;
				return (
					<g key={l.label}>
						<line
							x1={l.x}
							y1="64"
							x2={l.x}
							y2="206"
							stroke="rgb(var(--gray))"
							strokeOpacity="0.35"
							strokeDasharray="3 3"
						/>
						<rect
							x={l.x - w / 2}
							y="44"
							width={w}
							height="20"
							rx="10"
							fill="var(--secondary)"
						/>
						<text
							x={l.x}
							y="58"
							textAnchor="middle"
							fontSize="11"
							fontWeight="600"
							fill="var(--foreground)"
						>
							{l.label}
						</text>
					</g>
				);
			})}

			<Arrow x1={18} y1={82} x2={S} y2={82} color="var(--accent)" />
			<text
				x="50"
				y="76"
				textAnchor="middle"
				fontSize="10.5"
				fontWeight="600"
				fill="var(--accent)"
			>
				A 저장
			</text>
			<Val x={S} y={92} text="29,000원" />
			<Val x={B} y={72} text="39,000원" />

			<Arrow {...SEND} color="var(--accent)" dashed />
			<LineLabel cx={228} {...SEND} text="변경 전달 중" color="var(--accent)" />
			<Arrow {...SAVE} color="var(--foreground)" />
			<LineLabel
				cx={222}
				{...SAVE}
				text="B 저장 (39,000원)"
				color="var(--foreground)"
			/>

			<Val
				x={S}
				y={156}
				text="39,000원"
				color="var(--destructive)"
				stroke="var(--destructive)"
			/>
			<text
				x={S}
				y="192"
				textAnchor="middle"
				fontSize="10.5"
				fontWeight="700"
				fill="var(--destructive)"
			>
				A의 수정이 지워짐
			</text>
			<Val x={B} y={188} text="29,000원" color="var(--muted-foreground)" />
			<text
				x={B - 40}
				y="202"
				textAnchor="end"
				fontSize="10.5"
				fill="var(--muted-foreground)"
			>
				이제야 도착
			</text>
		</g>
	);
}

export default function ScreenLagDiagram() {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${H}`}
				role="img"
				aria-label="B의 화면이 서버보다 뒤처지는 네 가지 경우. 첫째, A가 가격을 29,000원으로 저장해 서버 값이 바뀌지만, 그 변경이 B의 화면으로 가는 사이에 B가 화면에 남아 있던 39,000원으로 저장한다. 두 메시지가 엇갈려 서버 가격은 39,000원으로 되돌아가 A의 수정이 지워지고, B의 화면에는 그 뒤에야 29,000원이 도착한다. 둘째, 실시간 연결이 끊겨 다시 연결하는 동안 B의 화면은 39,000원에 머문다. 셋째, B가 가격 칸에 35,000원을 입력하는 중에 'A님이 가격을 바꿨습니다'라는 알림이 뜬다. 넷째, A가 30초 전에 탭을 닫았는데도 가격 칸에 'A 편집 중' 표시가 남아 있다."
				style={{
					display: "block",
					minWidth: 560,
					maxWidth: 680,
					margin: "0 auto",
				}}
			>
				<Card
					i={0}
					title="A의 변경이 아직 닿기 전"
					caption="B의 화면에 닿기 전에 저장하면 옛 값이 실려 간다"
				>
					<CrossedMessages />
				</Card>

				<Card
					i={1}
					title="연결이 끊긴 동안"
					caption="끊긴 동안의 변경은 따로 챙겨 보내야 온다"
				>
					<g transform="translate(0 34)">
						<rect
							x="18"
							y="48"
							width="288"
							height="26"
							rx="6"
							fill="var(--secondary)"
						/>
						<circle cx="32" cy="61" r="4" fill="var(--muted-foreground)" />
						<text x="44" y="65.5" fontSize="11.5" fill="var(--foreground)">
							실시간 연결이 끊겼습니다 · 다시 연결하는 중
						</text>
						<Cell x={18} y={104} label="B의 화면" value="39,000원" />
						<text
							x="136"
							y="127"
							fontSize="11.5"
							fill="var(--muted-foreground)"
						>
							서버는 이미 29,000원
						</text>
					</g>
				</Card>

				<Card
					i={2}
					title="고치는 중인 칸"
					caption="덮으면 입력이 사라지고, 두면 모른 채 저장한다"
				>
					<EditingCell
						tag="B 입력 중"
						value="35,000"
						color="var(--foreground)"
					/>
					<line
						x1={33 + textWidth("35,000", 13)}
						y1="89"
						x2={33 + textWidth("35,000", 13)}
						y2="108"
						stroke="var(--foreground)"
						strokeWidth="1.5"
					/>
					<rect
						x="150"
						y="83"
						width="156"
						height="30"
						rx="8"
						fill="var(--foreground)"
					/>
					<text x="162" y="102.5" fontSize="11" fill="var(--background)">
						A님이 가격을 바꿨습니다
					</text>
				</Card>

				<Card
					i={3}
					title="남아 있는 편집 중 표시"
					caption="만료 시간이 지나야 표시가 사라진다"
				>
					<EditingCell tag="A 편집 중" value="39,000원" color="var(--accent)" />
					<text x="154" y="94" fontSize="11.5" fill="var(--muted-foreground)">
						실제로는 A가
					</text>
					<text x="154" y="111" fontSize="11.5" fill="var(--muted-foreground)">
						30초 전에 탭을 닫았다
					</text>
				</Card>
			</svg>
		</div>
	);
}

// 목록 병합이 내주는 것 세 가지 — 합친 결과로 화면 다시 그리기, 합친 결과의 규칙 위반, 지키지 못하는 순서.
// A가 한 일은 강조색, B가 한 일은 진한 색이다(PageHeader 의 A·B 색과 같다).
import type { ReactNode } from "react";
import { textWidth } from "./admin";

type Tone = "base" | "a" | "b";
const TONE = {
	base: { fill: "var(--secondary)", color: "var(--foreground)" },
	a: { fill: "var(--accent)", color: "var(--background)" },
	b: { fill: "var(--foreground)", color: "var(--background)" },
} as const;
interface Tag {
	text: string;
	tone?: Tone;
}

const CHIP_H = 26;
const chipW = (text: string) => textWidth(text, 12) + 24;

function TagList({ x, cy, tags }: { x: number; cy: number; tags: Tag[] }) {
	const xs = tags.map((_, i) =>
		tags.slice(0, i).reduce((sum, t) => sum + chipW(t.text) + 6, x),
	);
	return (
		<g>
			{tags.map((t, i) => {
				const tone = TONE[t.tone ?? "base"];
				return (
					<g key={t.text}>
						<rect
							x={xs[i]}
							y={cy - CHIP_H / 2}
							width={chipW(t.text)}
							height={CHIP_H}
							rx={CHIP_H / 2}
							fill={tone.fill}
						/>
						<text
							x={xs[i] + chipW(t.text) / 2}
							y={cy + 4.5}
							textAnchor="middle"
							fontSize="12"
							fontWeight="600"
							fill={tone.color}
						>
							{t.text}
						</text>
					</g>
				);
			})}
		</g>
	);
}

function Card({
	h,
	label,
	children,
}: {
	h: number;
	label: string;
	children: ReactNode;
}) {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${h}`}
				role="img"
				aria-label={label}
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
					height={h - 16}
					rx="12"
					fill="var(--background)"
					stroke="rgb(var(--gray))"
					strokeOpacity="0.45"
				/>
				{children}
			</svg>
		</div>
	);
}

// 표 그림의 머리 띠. 높이 40.
function HeadBand({
	cols,
}: {
	cols: { x: number; label: string; middle?: boolean }[];
}) {
	return (
		<g>
			<path
				d="M 8 48 V 20 A 12 12 0 0 1 20 8 H 660 A 12 12 0 0 1 672 20 V 48 Z"
				fill="var(--secondary)"
				fillOpacity="0.7"
			/>
			{cols.map((c) => (
				<text
					key={c.label}
					x={c.x}
					y="33"
					textAnchor={c.middle ? "middle" : "start"}
					fontSize="12"
					fontWeight="600"
					fill="var(--muted-foreground)"
				>
					{c.label}
				</text>
			))}
		</g>
	);
}

function RowLine({ y, strong = false }: { y: number; strong?: boolean }) {
	return (
		<line
			x1="20"
			y1={y}
			x2="660"
			y2={y}
			stroke="rgb(var(--gray))"
			strokeOpacity={strong ? 0.45 : 0.25}
		/>
	);
}

function RowLabel({
	y,
	text,
	strong = false,
}: {
	y: number;
	text: string;
	strong?: boolean;
}) {
	return (
		<text
			x="28"
			y={y}
			fontSize="13"
			fontWeight={strong ? 700 : 600}
			fill="var(--foreground)"
		>
			{text}
		</text>
	);
}

// 1. 저장한 값과 남는 값이 다르다.
function Panel({
	x,
	w,
	title,
	children,
}: {
	x: number;
	w: number;
	title: string;
	children: ReactNode;
}) {
	return (
		<g>
			<rect
				x={x}
				y="28"
				width={w}
				height="128"
				rx="10"
				fill="none"
				stroke="rgb(var(--gray))"
				strokeOpacity="0.35"
			/>
			<text
				x={x + 16}
				y="50"
				fontSize="12"
				fontWeight="600"
				fill="var(--muted-foreground)"
			>
				{title}
			</text>
			{children}
		</g>
	);
}

function Arrow({
	x1,
	x2,
	y,
	label,
}: {
	x1: number;
	x2: number;
	y: number;
	label: string;
}) {
	return (
		<g>
			<text
				x={(x1 + x2) / 2}
				y={y - 9}
				textAnchor="middle"
				fontSize="11"
				fill="var(--muted-foreground)"
			>
				{label}
			</text>
			<line
				x1={x1}
				y1={y}
				x2={x2 - 6}
				y2={y}
				stroke="var(--muted-foreground)"
				strokeWidth="1.5"
			/>
			<path
				d={`M ${x2 - 8} ${y - 4} L ${x2} ${y} L ${x2 - 8} ${y + 4} Z`}
				fill="var(--muted-foreground)"
			/>
		</g>
	);
}

export function MergedResultDiagram() {
	return (
		<Card
			h={176}
			label="B가 신상을 빼고 여름만 보내면, 서버에는 A가 더한 세일까지 합친 여름과 세일이 남는다. 서버가 합친 결과를 응답으로 돌려주면 B의 화면은 응답으로 다시 그려 서버와 같은 여름과 세일을 보여 준다. 응답을 반영하지 않고 그대로 두면 B의 화면에는 여름만 남아 세일이 빠져 보인다."
		>
			<Panel x={24} w={136} title="B가 보낸 값">
				<TagList x={40} cy={88} tags={[{ text: "여름" }]} />
				<text x="40" y="140" fontSize="11.5" fill="var(--muted-foreground)">
					신상을 뺐다
				</text>
			</Panel>
			<Arrow x1={164} x2={208} y={88} label="저장" />
			<Panel x={212} w={176} title="서버에 남은 값">
				<TagList
					x={228}
					cy={88}
					tags={[{ text: "여름" }, { text: "세일", tone: "a" }]}
				/>
				<text x="228" y="140" fontSize="11.5" fill="var(--muted-foreground)">
					A가 더한 세일도 남는다
				</text>
			</Panel>
			<Arrow x1={392} x2={436} y={88} label="응답" />
			<Panel x={440} w={216} title="B의 화면">
				<text x="456" y="69" fontSize="11" fill="var(--muted-foreground)">
					응답으로 다시 그리면
				</text>
				<TagList
					x={456}
					cy={88}
					tags={[{ text: "여름" }, { text: "세일", tone: "a" }]}
				/>
				<text
					x="568"
					y="92.5"
					fontSize="11.5"
					fontWeight="600"
					fill="var(--accent)"
				>
					서버와 같다
				</text>
				<text x="456" y="117" fontSize="11" fill="var(--muted-foreground)">
					그대로 두면
				</text>
				<TagList x={456} cy={136} tags={[{ text: "여름" }]} />
				<text
					x="514"
					y="140.5"
					fontSize="11.5"
					fontWeight="600"
					fill="var(--destructive)"
				>
					세일이 빠져 보인다
				</text>
			</Panel>
		</Card>
	);
}

// 2. 합친 결과가 규칙을 어길 수 있다.
const BASE_TAGS: Tag[] = [
	{ text: "여름" },
	{ text: "신상" },
	{ text: "린넨" },
	{ text: "베이직" },
];
const RULE_ROWS = [
	{ label: "읽은 값", tags: BASE_TAGS, verdict: "4개" },
	{
		label: "A의 저장",
		tags: [...BASE_TAGS, { text: "세일", tone: "a" as const }],
		verdict: "5개 통과",
	},
	{
		label: "B의 저장",
		tags: [...BASE_TAGS, { text: "무료배송", tone: "b" as const }],
		verdict: "5개 통과",
	},
];
const RULE_ROW_H = 46;
const VERDICT_X = 512;

export function MergedRuleDiagram() {
	const footTop = 48 + RULE_ROWS.length * RULE_ROW_H;
	const footCy = footTop + 27;
	const failW = textWidth("6개 규칙 위반", 12.5) + 24;
	return (
		<Card
			h={footTop + 54 + 8}
			label="태그를 5개까지만 달 수 있는 상품에서 두 사람이 읽은 태그는 여름, 신상, 린넨, 베이직 4개다. A는 세일을 더해 5개로 저장하고 규칙 검사를 통과한다. B는 무료배송을 더해 5개로 저장하고 역시 통과한다. 두 저장을 합친 결과는 세일과 무료배송이 모두 붙은 6개라 규칙을 어긴다."
		>
			<HeadBand
				cols={[
					{ x: 140, label: "태그" },
					{ x: VERDICT_X, label: "규칙 검사: 5개까지" },
				]}
			/>
			{RULE_ROWS.map((row, i) => {
				const top = 48 + i * RULE_ROW_H;
				const cy = top + RULE_ROW_H / 2;
				const okW = textWidth(row.verdict, 12.5) + 24;
				return (
					<g key={row.label}>
						{i > 0 && <RowLine y={top} />}
						<RowLabel y={cy + 5} text={row.label} />
						<TagList x={140} cy={cy} tags={row.tags} />
						{i === 0 ? (
							<text
								x={VERDICT_X}
								y={cy + 4.5}
								fontSize="12.5"
								fill="var(--muted-foreground)"
							>
								{row.verdict}
							</text>
						) : (
							<g>
								<rect
									x={VERDICT_X}
									y={cy - 13}
									width={okW}
									height="26"
									rx="6"
									fill="var(--background)"
									stroke="var(--foreground)"
									strokeWidth="1.5"
								/>
								<text
									x={VERDICT_X + okW / 2}
									y={cy + 4.5}
									textAnchor="middle"
									fontSize="12.5"
									fontWeight="700"
									fill="var(--foreground)"
								>
									{row.verdict}
								</text>
							</g>
						)}
					</g>
				);
			})}
			<RowLine y={footTop} strong />
			<RowLabel y={footCy + 5} text="합친 결과" strong />
			<TagList
				x={140}
				cy={footCy}
				tags={[
					...BASE_TAGS,
					{ text: "세일", tone: "a" },
					{ text: "무료배송", tone: "b" },
				]}
			/>
			<rect
				x={VERDICT_X}
				y={footCy - 13}
				width={failW}
				height="26"
				rx="6"
				fill="var(--destructive)"
			/>
			<text
				x={VERDICT_X + failW / 2}
				y={footCy + 4.5}
				textAnchor="middle"
				fontSize="12.5"
				fontWeight="700"
				fill="var(--background)"
			>
				6개 규칙 위반
			</text>
		</Card>
	);
}

// 3. 순서는 지키지 못한다.
const SLOT_CX = [196, 276, 356];
const TILE_W = 64;
const ORDER_ROW_H = 50;
const NOTE_X = 412;
const ORDER_ROWS: { label: string; tiles: Tag[]; note: string }[] = [
	{
		label: "읽은 순서",
		tiles: [{ text: "앞면" }, { text: "뒷면" }, { text: "착용" }],
		note: "",
	},
	{
		label: "A가 바꾼 순서",
		tiles: [{ text: "착용", tone: "a" }, { text: "앞면" }, { text: "뒷면" }],
		note: "착용 사진을 대표로 올렸다",
	},
	{
		label: "B가 바꾼 순서",
		tiles: [{ text: "앞면" }, { text: "착용", tone: "b" }, { text: "뒷면" }],
		note: "착용 사진을 둘째로 올렸다",
	},
];

function Tile({ cx, cy, tile }: { cx: number; cy: number; tile: Tag | null }) {
	if (!tile) {
		return (
			<g>
				<rect
					x={cx - TILE_W / 2}
					y={cy - 17}
					width={TILE_W}
					height="34"
					rx="6"
					fill="none"
					stroke="var(--muted-foreground)"
					strokeDasharray="3 3"
				/>
				<text
					x={cx}
					y={cy + 5}
					textAnchor="middle"
					fontSize="14"
					fontWeight="700"
					fill="var(--muted-foreground)"
				>
					?
				</text>
			</g>
		);
	}
	const tone = TONE[tile.tone ?? "base"];
	return (
		<g>
			<rect
				x={cx - TILE_W / 2}
				y={cy - 17}
				width={TILE_W}
				height="34"
				rx="6"
				fill={tone.fill}
			/>
			<text
				x={cx}
				y={cy + 4.5}
				textAnchor="middle"
				fontSize="12"
				fontWeight="600"
				fill={tone.color}
			>
				{tile.text}
			</text>
		</g>
	);
}

export function ListOrderDiagram() {
	const footTop = 48 + ORDER_ROWS.length * ORDER_ROW_H;
	const footCy = footTop + 27;
	return (
		<Card
			h={footTop + 54 + 8}
			label="대표 이미지 순서를 두 사람이 함께 고친 표. 읽은 순서는 앞면, 뒷면, 착용 사진이다. A는 착용 사진을 첫째인 대표 자리로 올려 착용, 앞면, 뒷면으로 바꾼다. B는 착용 사진을 둘째로 올려 앞면, 착용, 뒷면으로 바꾼다. 합친 결과는 셋째가 뒷면인 것만 정해지고, 착용 사진이 첫째인지 둘째인지는 정할 수 없다."
		>
			<HeadBand
				cols={[
					{ x: 28, label: "대표 이미지 순서" },
					{ x: SLOT_CX[0], label: "첫째 · 대표", middle: true },
					{ x: SLOT_CX[1], label: "둘째", middle: true },
					{ x: SLOT_CX[2], label: "셋째", middle: true },
				]}
			/>
			{ORDER_ROWS.map((row, i) => {
				const top = 48 + i * ORDER_ROW_H;
				const cy = top + ORDER_ROW_H / 2;
				return (
					<g key={row.label}>
						{i > 0 && <RowLine y={top} />}
						<RowLabel y={cy + 5} text={row.label} />
						{row.tiles.map((tile, j) => (
							<Tile key={tile.text} cx={SLOT_CX[j]} cy={cy} tile={tile} />
						))}
						<text
							x={NOTE_X}
							y={cy + 4.5}
							fontSize="12"
							fill="var(--muted-foreground)"
						>
							{row.note}
						</text>
					</g>
				);
			})}
			<RowLine y={footTop} strong />
			<RowLabel y={footCy + 5} text="합친 결과" strong />
			<Tile cx={SLOT_CX[0]} cy={footCy} tile={null} />
			<Tile cx={SLOT_CX[1]} cy={footCy} tile={null} />
			<Tile cx={SLOT_CX[2]} cy={footCy} tile={{ text: "뒷면" }} />
			<text
				x={NOTE_X}
				y={footCy + 4.5}
				fontSize="12.5"
				fontWeight="600"
				fill="var(--foreground)"
			>
				착용 사진은 첫째인가 둘째인가
			</text>
		</Card>
	);
}

// 상품 표 그림들이 함께 쓰는 관리자 화면 조각. 모두 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
import type { ReactNode } from "react";

export const COLS = [
	{ key: "name", label: "상품명", x: 24, w: 124 },
	{ key: "price", label: "가격", x: 148, w: 96 },
	{ key: "stock", label: "재고", x: 244, w: 52 },
	{ key: "status", label: "판매 상태", x: 296, w: 76 },
	{ key: "tags", label: "태그", x: 372, w: 108 },
	{ key: "desc", label: "상품 설명", x: 480, w: 176 },
] as const;
export type ColKey = (typeof COLS)[number]["key"];
export const colOf = (key: ColKey) =>
	COLS.find((c) => c.key === key) ?? COLS[0];

export const LEFT = 24;
export const WIDTH = 632;
export const HEAD_TOP = 96;
export const HEAD_H = 28;
export const ROWS_TOP = HEAD_TOP + HEAD_H;
export const ROW_H = 46;
export const LINE = {
	stroke: "rgb(var(--gray))",
	strokeOpacity: 0.25,
} as const;

// 칩·버튼 폭을 잡기 위한 어림 글자 폭 — 한글은 1em, 공백은 0.3em, 나머지는 0.6em.
export const textWidth = (s: string, size: number) =>
	[...s].reduce(
		(w, c) =>
			w + (/[가-힣]/.test(c) ? size : c === " " ? size * 0.3 : size * 0.6),
		0,
	);

export interface ProductRowData {
	name: string;
	price: string;
	stock: string;
	onSale: boolean;
	tags: string[];
	desc: string[];
}

export const LINEN: ProductRowData = {
	name: "베이직 린넨 셔츠",
	price: "39,000원",
	stock: "120",
	onSale: true,
	tags: ["여름", "신상"],
	desc: ["통기성 좋은 린넨 100% 셔츠"],
};

export function Chip({
	x,
	cy,
	text,
	fill,
	color,
	h = 20,
}: {
	x: number;
	cy: number;
	text: string;
	fill: string;
	color: string;
	h?: number;
}) {
	return (
		<g>
			<rect
				x={x}
				y={cy - h / 2}
				width={textWidth(text, 11) + 16}
				height={h}
				rx={h / 2}
				fill={fill}
			/>
			<text x={x + 8} y={cy + 4} fontSize="11" fill={color}>
				{text}
			</text>
		</g>
	);
}

// 브라우저 창 틀. frameH 는 창 높이, 그림 높이는 frameH + 16.
export function Figure({
	frameH,
	label,
	children,
}: {
	frameH: number;
	label: string;
	children: ReactNode;
}) {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${frameH + 16}`}
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
					height={frameH}
					rx="12"
					fill="var(--background)"
				/>
				<path
					d="M 8 44 V 20 A 12 12 0 0 1 20 8 H 660 A 12 12 0 0 1 672 20 V 44 Z"
					fill="var(--secondary)"
				/>
				<line x1="8" y1="44" x2="672" y2="44" {...LINE} />
				{[28, 44, 60].map((cx) => (
					<circle
						key={cx}
						cx={cx}
						cy="26"
						r="5"
						fill="rgb(var(--gray))"
						fillOpacity="0.5"
					/>
				))}
				<rect
					x="84"
					y="16"
					width="300"
					height="20"
					rx="10"
					fill="var(--background)"
				/>
				<text x="100" y="30" fontSize="11.5" fill="var(--muted-foreground)">
					admin.example.com/products
				</text>
				{children}
				<rect
					x="8"
					y="8"
					width="664"
					height={frameH}
					rx="12"
					fill="none"
					stroke="rgb(var(--gray))"
					strokeOpacity="0.45"
				/>
			</svg>
		</div>
	);
}

// 페이지 제목과 「2명이 보는 중」 표시.
export function PageHeader({ count }: { count: number }) {
	return (
		<g>
			<text
				x={LEFT}
				y="78"
				fontSize="17"
				fontWeight="700"
				fill="var(--foreground)"
			>
				상품
			</text>
			<text x={LEFT + 44} y="78" fontSize="12" fill="var(--muted-foreground)">
				{count}개
			</text>
			<text
				x="592"
				y="77"
				textAnchor="end"
				fontSize="11.5"
				fill="var(--muted-foreground)"
			>
				2명이 보는 중
			</text>
			<circle cx="612" cy="73" r="11" fill="var(--accent)" />
			<circle
				cx="634"
				cy="73"
				r="11"
				fill="var(--foreground)"
				stroke="var(--background)"
				strokeWidth="2"
			/>
			<text
				x="612"
				y="77"
				textAnchor="middle"
				fontSize="11"
				fontWeight="700"
				fill="var(--background)"
			>
				A
			</text>
			<text
				x="634"
				y="77"
				textAnchor="middle"
				fontSize="11"
				fontWeight="700"
				fill="var(--background)"
			>
				B
			</text>
		</g>
	);
}

export function TableHead() {
	return (
		<g>
			<rect
				x={LEFT}
				y={HEAD_TOP}
				width={WIDTH}
				height={HEAD_H}
				rx="4"
				fill="var(--secondary)"
				fillOpacity="0.7"
			/>
			{COLS.map((c) => (
				<text
					key={c.key}
					x={c.x + 12}
					y={HEAD_TOP + 17}
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

export function ProductRow({
	row,
	top,
	h = ROW_H,
	highlight = false,
}: {
	row: ProductRowData;
	top: number;
	h?: number;
	highlight?: boolean;
}) {
	const cy = top + h / 2;
	const base = cy + 4.5;
	const descTop = base - ((row.desc.length - 1) * 16) / 2;
	return (
		<g>
			{highlight && (
				<rect
					x={LEFT}
					y={top}
					width={WIDTH}
					height={h}
					fill="var(--accent)"
					fillOpacity="0.06"
				/>
			)}
			<line x1={LEFT} y1={top + h} x2={LEFT + WIDTH} y2={top + h} {...LINE} />
			<text
				x={colOf("name").x + 12}
				y={base}
				fontSize="13"
				fontWeight="500"
				fill="var(--foreground)"
			>
				{row.name}
			</text>
			<text
				x={colOf("price").x + 12}
				y={base}
				fontSize="13"
				fill="var(--foreground)"
			>
				{row.price}
			</text>
			<text
				x={colOf("stock").x + 12}
				y={base}
				fontSize="13"
				fill={
					row.stock === "0" ? "var(--muted-foreground)" : "var(--foreground)"
				}
			>
				{row.stock}
			</text>
			{row.onSale ? (
				<Chip
					x={colOf("status").x + 10}
					cy={cy}
					text="판매 중"
					fill="var(--accent)"
					color="var(--background)"
					h={22}
				/>
			) : (
				<Chip
					x={colOf("status").x + 10}
					cy={cy}
					text="품절"
					fill="var(--secondary)"
					color="var(--muted-foreground)"
					h={22}
				/>
			)}
			{row.tags.map((tag, j) => (
				<Chip
					key={tag}
					x={colOf("tags").x + 10 + j * 42}
					cy={cy}
					text={tag}
					fill="var(--secondary)"
					color="var(--foreground)"
				/>
			))}
			{row.desc.map((line, j) => (
				<text
					key={line}
					x={colOf("desc").x + 12}
					y={descTop + j * 16}
					fontSize="12"
					fill="var(--foreground)"
				>
					{line}
				</text>
			))}
		</g>
	);
}

// 칸 테두리와, 표 머리와 칸 경계에 걸친 이름표.
export function CellOutline({
	col,
	top,
	h = ROW_H,
	color,
	tag,
}: {
	col: ColKey;
	top: number;
	h?: number;
	color: string;
	tag?: string;
}) {
	const c = colOf(col);
	return (
		<g>
			<rect
				x={c.x + 1}
				y={top + 1}
				width={c.w - 2}
				height={h - 2}
				rx="3"
				fill="none"
				stroke={color}
				strokeWidth="2"
			/>
			{tag && (
				<>
					<rect
						x={c.x + 1}
						y={top - 7}
						width={textWidth(tag, 10.5) + 12}
						height="16"
						rx="3"
						fill={color}
					/>
					<text
						x={c.x + 7}
						y={top + 5}
						fontSize="10.5"
						fontWeight="600"
						fill="var(--background)"
					>
						{tag}
					</text>
				</>
			)}
		</g>
	);
}

// 창 내용 위를 흐리게 덮는 막 — 대화상자 뒤에 깐다.
export function Dimmer({ frameH }: { frameH: number }) {
	return (
		<rect
			x="9"
			y="45"
			width="662"
			height={frameH - 38}
			fill="var(--background)"
			fillOpacity="0.65"
		/>
	);
}

export function Dialog({
	x,
	y,
	w,
	title,
	lines,
	note,
	buttons,
}: {
	x: number;
	y: number;
	w: number;
	title: string;
	lines: string[];
	note?: string;
	buttons: { label: string; primary?: boolean }[];
}) {
	const h = 56 + lines.length * 20 + (note ? 20 : 0) + 50;
	let bx = x + w - 20;
	const placed = [...buttons].reverse().map((b) => {
		const bw = textWidth(b.label, 12) + 28;
		bx -= bw;
		const at = bx;
		bx -= 8;
		return { ...b, at, bw };
	});
	return (
		<g>
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
				{title}
			</text>
			{lines.map((line, i) => (
				<text
					key={line}
					x={x + 20}
					y={y + 58 + i * 20}
					fontSize="12.5"
					fill="var(--foreground)"
				>
					{line}
				</text>
			))}
			{note && (
				<text
					x={x + 20}
					y={y + 58 + lines.length * 20}
					fontSize="11.5"
					fill="var(--muted-foreground)"
				>
					{note}
				</text>
			)}
			{placed.map((b) => (
				<g key={b.label}>
					<rect
						x={b.at}
						y={y + h - 46}
						width={b.bw}
						height="30"
						rx="6"
						fill={b.primary ? "var(--accent)" : "var(--secondary)"}
					/>
					<text
						x={b.at + b.bw / 2}
						y={y + h - 27}
						textAnchor="middle"
						fontSize="12"
						fontWeight="600"
						fill={b.primary ? "var(--background)" : "var(--foreground)"}
					>
						{b.label}
					</text>
				</g>
			))}
		</g>
	);
}

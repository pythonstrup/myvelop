// OT와 CRDT — 상품 설명을 글자 단위로 합칠 때 위치가 어긋나는 문제와 뜻까지는 합치지 못하는 한계. 움직이는 그림(CrdtDemos)이 글자 조각을 함께 쓴다.
// A가 넣은 글자는 강조색, B가 넣은 글자는 진한 색, 처음 글은 옅은 색이다.
import type { ReactNode } from "react";
import { textWidth } from "./admin";

export type Who = "base" | "a" | "b";
export interface Ch {
	id: string;
	c: string;
	who: Who;
	gone?: boolean;
	top?: string;
	bottom?: string;
	ring?: boolean;
}

const BOX_W = 18;
const STEP = 20;
const BOX_H = 26;
const STRIP_X = 30;
export const FILL: Record<Who, string> = {
	base: "var(--secondary)",
	a: "var(--accent)",
	b: "var(--foreground)",
};
export const INK: Record<Who, string> = {
	base: "var(--foreground)",
	a: "var(--background)",
	b: "var(--background)",
};

// 글자마다 번호를 붙인다. 처음 글은 S1부터, A가 넣은 글자는 A1부터, B가 넣은 글자는 B1부터.
export const seq = (s: string, prefix: string, who: Who, start = 1): Ch[] =>
	[...s].map((c, i) => ({ id: `${prefix}${start + i}`, c, who }));

export const BASE = seq("통기성 좋은 린넨 100% 셔츠", "S", "base");
export const A_INS = seq("얇고 ", "A", "a");
export const B_INS = seq(". 찬물 손세탁 권장", "B", "b");
const MERGED = [...A_INS, ...BASE, ...B_INS];

const mark = (list: Ch[], id: string, extra: Partial<Ch>): Ch[] =>
	list.map((ch) => (ch.id === id ? { ...ch, ...extra } : ch));

function Strip({ x, y, list }: { x: number; y: number; list: Ch[] }) {
	return (
		<g>
			{list.map((ch, i) => {
				const bx = x + i * STEP;
				const cx = bx + BOX_W / 2;
				return (
					<g key={ch.id}>
						{ch.top && (
							<text
								x={cx}
								y={y - 6}
								textAnchor="middle"
								fontSize="9"
								fill="var(--muted-foreground)"
							>
								{ch.top}
							</text>
						)}
						{ch.ring && (
							<rect
								x={bx - 2.5}
								y={y - 2.5}
								width={BOX_W + 5}
								height={BOX_H + 5}
								rx="5"
								fill="none"
								stroke="var(--foreground)"
								strokeWidth="1.5"
							/>
						)}
						<rect
							x={bx}
							y={y}
							width={BOX_W}
							height={BOX_H}
							rx="3"
							fill={ch.gone ? "none" : FILL[ch.who]}
							stroke={ch.gone ? "var(--muted-foreground)" : "none"}
							strokeDasharray={ch.gone ? "2 2" : undefined}
						/>
						<text
							x={cx}
							y={y + 17.5}
							textAnchor="middle"
							fontSize="12"
							fontWeight={ch.who === "base" ? 500 : 700}
							fill={ch.gone ? "var(--muted-foreground)" : INK[ch.who]}
						>
							{ch.c}
						</text>
						{ch.gone && (
							<line
								x1={bx + 3}
								y1={y + BOX_H / 2}
								x2={bx + BOX_W - 3}
								y2={y + BOX_H / 2}
								stroke="var(--muted-foreground)"
							/>
						)}
						{ch.bottom && (
							<text
								x={cx}
								y={y + BOX_H + 12}
								textAnchor="middle"
								fontSize="9"
								fontWeight={ch.ring ? 700 : 400}
								fill={ch.ring ? "var(--foreground)" : "var(--muted-foreground)"}
							>
								{ch.bottom}
							</text>
						)}
					</g>
				);
			})}
		</g>
	);
}

function Frame({
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

export function SectionLabel({ y, text }: { y: number; text: string }) {
	return (
		<text
			x={STRIP_X}
			y={y}
			fontSize="12.5"
			fontWeight="700"
			fill="var(--foreground)"
		>
			{text}
		</text>
	);
}

export function Note({ y, text }: { y: number; text: string }) {
	return (
		<text
			x={650}
			y={y}
			textAnchor="end"
			fontSize="11.5"
			fill="var(--muted-foreground)"
		>
			{text}
		</text>
	);
}

// 연산 한 줄. 누가 했는지는 색 네모로, 내용은 본문 색 글자로.
function OpLine({ y, who, text }: { y: number; who: Who; text: string }) {
	return (
		<g>
			<rect
				x={STRIP_X}
				y={y - 9}
				width="10"
				height="10"
				rx="2"
				fill={FILL[who]}
			/>
			<text x={STRIP_X + 18} y={y} fontSize="12.5" fill="var(--foreground)">
				{text}
			</text>
		</g>
	);
}

function ResultChip({
	x,
	y,
	text,
	fill,
	anchor = "start",
}: {
	x: number;
	y: number;
	text: string;
	fill: string;
	anchor?: "start" | "end";
}) {
	const w = textWidth(text, 12) + 24;
	const rx = anchor === "end" ? x - w : x;
	return (
		<g>
			<rect x={rx} y={y} width={w} height="26" rx="13" fill={fill} />
			<text
				x={rx + w / 2}
				y={y + 17.5}
				textAnchor="middle"
				fontSize="12"
				fontWeight="700"
				fill="var(--background)"
			>
				{text}
			</text>
		</g>
	);
}

export function Divider({ y }: { y: number }) {
	return (
		<line
			x1="20"
			y1={y}
			x2="660"
			y2={y}
			stroke="rgb(var(--gray))"
			strokeOpacity="0.25"
		/>
	);
}

// 1. 위치로 보낸 연산 — 먼저 적용된 연산이 자리를 밀면, 위치를 그대로 쓴 연산은 엉뚱한 곳에 들어간다.
const POS_H = 352;

export function PositionOpDiagram() {
	const base = BASE.map((ch, i) => ({ ...ch, top: String(i) }));
	const wrong = mark(
		[...A_INS, ...BASE.slice(0, 14), ...B_INS, ...BASE.slice(14)],
		"B1",
		{ top: "17" },
	);
	const right = mark(MERGED, "B1", { top: "20" });
	const endX = STRIP_X + BASE.length * STEP - 1;
	return (
		<Frame
			h={POS_H}
			label="위치로 보낸 연산이 어긋나는 과정. 처음 글 '통기성 좋은 린넨 100% 셔츠'는 0번부터 16번까지 17글자다. A는 0번 자리에 '얇고 '를 넣고, B는 17번 자리, 곧 글 끝에 '. 찬물 손세탁 권장'을 넣는다. A의 연산을 적용한 뒤 B의 연산을 그대로 적용하면 '얇고 통기성 좋은 린넨 100%. 찬물 손세탁 권장 셔츠'가 되어 세탁 방법이 셔츠 앞에 끼어든다. B의 자리를 A가 넣은 3글자만큼 밀어 20번에 넣으면 '얇고 통기성 좋은 린넨 100% 셔츠. 찬물 손세탁 권장'이 된다."
		>
			<SectionLabel y={36} text="처음 글" />
			<Strip x={STRIP_X} y={60} list={base} />
			<line
				x1={endX}
				y1={56}
				x2={endX}
				y2={90}
				stroke="var(--foreground)"
				strokeWidth="2"
			/>
			<text x={endX + 6} y={78} fontSize="11.5" fill="var(--muted-foreground)">
				17번 자리 · 글 끝
			</text>
			<OpLine y={118} who="a" text="A · 0번 자리에 「얇고 」 3글자를 넣는다" />
			<OpLine
				y={140}
				who="b"
				text="B · 17번 자리에 「. 찬물 손세탁 권장」을 넣는다"
			/>
			<Divider y={160} />
			<SectionLabel y={188} text="A의 연산 뒤에 B의 연산을 그대로 적용하면" />
			<ResultChip
				x={650}
				y={170}
				anchor="end"
				text="세탁 방법이 「셔츠」 앞에 끼어든다"
				fill="var(--destructive)"
			/>
			<Strip x={STRIP_X} y={214} list={wrong} />
			<Divider y={256} />
			<SectionLabel y={284} text="B의 자리를 A가 넣은 3글자만큼 밀면 17 → 20" />
			<ResultChip
				x={650}
				y={266}
				anchor="end"
				text="두 사람의 뜻대로 합쳐진다"
				fill="var(--accent)"
			/>
			<Strip x={STRIP_X} y={310} list={right} />
		</Frame>
	);
}

// 2. 뜻까지는 합치지 못한다 — 같은 숫자를 서로 다르게 고치면 글자 단위 병합은 두 숫자를 이어 붙인다.
const FRAG = BASE.slice(7);
const gone = (ids: string[]) =>
	FRAG.map((ch) => (ids.includes(ch.id) ? { ...ch, gone: true } : ch));
const DIGITS = ["S11", "S12", "S13"];
const A_NUM = seq("70", "A", "a");
const B_NUM = seq("95", "B", "b");
// 지운 100 은 자리만 남고, 새 숫자는 그 뒤에 들어간다.
const withNew = (list: Ch[], ins: Ch[]) => [
	...list.slice(0, 6),
	...ins,
	...list.slice(6),
];
const MEANING_ROWS = [
	{ label: "A", list: withNew(gone(DIGITS), A_NUM) },
	{ label: "B", list: withNew(gone(DIGITS), B_NUM) },
	{
		label: "결과",
		list: [...FRAG.slice(0, 3), ...A_NUM, ...B_NUM, ...FRAG.slice(6)],
	},
];
const JUDGE_ROWS = [
	{ label: "B가 읽은 값", value: "린넨 100% 셔츠", who: "base" as Who },
	{ label: "최신 값", value: "린넨 70% 셔츠", who: "a" as Who },
	{ label: "B가 보낸 값", value: "린넨 95% 셔츠", who: "b" as Who },
];
const M_TOP = 52;
const M_PANEL_W = 308;
const M_PANEL_H = 206;
const MEANING_H = M_TOP + M_PANEL_H + 22;

function Panel({ x, title }: { x: number; title: string }) {
	return (
		<g>
			<rect
				x={x}
				y={M_TOP}
				width={M_PANEL_W}
				height={M_PANEL_H}
				rx="10"
				fill="none"
				stroke="rgb(var(--gray))"
				strokeOpacity="0.35"
			/>
			<text
				x={x + 16}
				y={M_TOP + 28}
				fontSize="13"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{title}
			</text>
		</g>
	);
}

export function MeaningMergeDiagram() {
	const lx = 24;
	const rx = 348;
	return (
		<Frame
			h={MEANING_H}
			label="뜻까지는 합치지 못하는 경우. 처음 글의 '린넨 100% 셔츠'를 A는 70%로, B는 95%로 고친다. 글자 단위로 합치면 A와 B가 함께 지운 100은 지워지고 A가 넣은 70과 B가 넣은 95가 모두 남아 '린넨 7095% 셔츠'가 된다. 묻지 않고 틀린 값이 된다. 칸 단위로 판정하면 B가 읽은 값 '린넨 100% 셔츠', 최신 값 '린넨 70% 셔츠', B가 보낸 값 '린넨 95% 셔츠'가 모두 달라 충돌로 보고 사용자에게 묻는다."
		>
			<text x={lx} y={34} fontSize="12" fill="var(--muted-foreground)">
				처음 글의 「린넨 100% 셔츠」를 A는 70%로, B는 95%로 고친다
			</text>

			<Panel x={lx} title="글자 단위로 합치면" />
			{MEANING_ROWS.map((row, i) => {
				const y = M_TOP + 46 + i * 36;
				return (
					<g key={row.label}>
						<text
							x={lx + 16}
							y={y + 17.5}
							fontSize="11.5"
							fill="var(--muted-foreground)"
						>
							{row.label}
						</text>
						<Strip x={lx + 52} y={y} list={row.list} />
					</g>
				);
			})}
			<ResultChip
				x={lx + 16}
				y={M_TOP + 160}
				text="묻지 않고 7095%가 된다"
				fill="var(--destructive)"
			/>

			<Panel x={rx} title="칸 단위로 판정하면" />
			{JUDGE_ROWS.map((row, i) => {
				const cy = M_TOP + 59 + i * 36;
				return (
					<g key={row.label}>
						<text
							x={rx + 16}
							y={cy + 4}
							fontSize="11.5"
							fill="var(--muted-foreground)"
						>
							{row.label}
						</text>
						<rect
							x={rx + 100}
							y={cy - 5}
							width="10"
							height="10"
							rx="2"
							fill={FILL[row.who]}
						/>
						<text
							x={rx + 118}
							y={cy + 4.5}
							fontSize="12.5"
							fill="var(--foreground)"
						>
							{row.value}
						</text>
					</g>
				);
			})}
			<ResultChip
				x={rx + 16}
				y={M_TOP + 160}
				text="세 값이 달라 사용자에게 묻는다"
				fill="var(--accent)"
			/>
		</Frame>
	);
}

// CRDT가 두는 것 — 글자마다 하나씩 있는 기록과 그 기록을 이은 목록 — 과 기록을 주고받아 끼우는 과정.
// 색은 TextMerge 그림과 같다. A가 한 일은 강조색, B가 한 일은 진한 색, 처음 글은 옅은 색이다.
import { textWidth } from "./admin";
import { FadeIn, Move, StepFrame, useSteps } from "./StepFigure";
import {
	A_INS,
	B_INS,
	BASE,
	type Ch,
	Divider,
	FILL,
	INK,
	Note,
	SectionLabel,
	seq,
} from "./TextMerge";

interface BoxSize {
	w: number;
	h: number;
	step: number;
	font: number;
	label: number;
}
const SMALL: BoxSize = { w: 18, h: 26, step: 20, font: 12, label: 9 };
const LARGE: BoxSize = { w: 26, h: 32, step: 30, font: 14, label: 10 };

function CharBox({
	ch,
	size,
	gone,
	ring,
	top,
}: {
	ch: Ch;
	size: BoxSize;
	gone: boolean;
	ring: boolean;
	top?: string;
}) {
	const { w, h, font, label } = size;
	return (
		<g>
			{top && (
				<text
					x={w / 2}
					y="-7"
					textAnchor="middle"
					fontSize={label}
					fontWeight="700"
					fill="var(--foreground)"
				>
					{top}
				</text>
			)}
			{ring && (
				<rect
					x="-2.5"
					y="-2.5"
					width={w + 5}
					height={h + 5}
					rx="5"
					fill="none"
					stroke="var(--foreground)"
					strokeWidth="1.5"
				/>
			)}
			<rect
				width={w}
				height={h}
				rx="3"
				fill={gone ? "none" : FILL[ch.who]}
				stroke={gone ? "var(--muted-foreground)" : "none"}
				strokeDasharray={gone ? "2 2" : undefined}
			/>
			<text
				x={w / 2}
				y={h / 2 + font * 0.38}
				textAnchor="middle"
				fontSize={font}
				fontWeight={ch.who === "base" ? 500 : 700}
				fill={gone ? "var(--muted-foreground)" : INK[ch.who]}
			>
				{ch.c}
			</text>
			{gone && (
				<line
					x1="3"
					y1={h / 2}
					x2={w - 3}
					y2={h / 2}
					stroke="var(--muted-foreground)"
				/>
			)}
			<text
				x={w / 2}
				y={h + label + 3}
				textAnchor="middle"
				fontSize={label}
				fontWeight={ring ? 700 : 400}
				fill={ring ? "var(--foreground)" : "var(--muted-foreground)"}
			>
				{ch.id}
			</text>
		</g>
	);
}

interface ScreenMark {
	ring: string[];
	top?: Record<string, string>;
	note?: string;
	gone?: string[];
}

// 아직 없는 기록은 처음 나타날 단계의 자리에 숨겨 두어, 나타날 때 옆으로 미끄러지지 않게 한다.
function nextIndex(lists: Ch[][], step: number, id: string) {
	for (let k = 1; k <= lists.length; k++) {
		const i = lists[(step + k) % lists.length].findIndex((c) => c.id === id);
		if (i >= 0) return i;
	}
	throw new Error(`${id} 기록이 어느 단계에도 없다`);
}

function LiveStrip({
	x,
	y,
	size,
	lists,
	step,
	mark,
}: {
	x: number;
	y: number;
	size: BoxSize;
	lists: Ch[][];
	step: number;
	mark: ScreenMark;
}) {
	const all = lists[lists.length - 1];
	return (
		<g>
			{all.map((ch) => {
				const now = lists[step].findIndex((c) => c.id === ch.id);
				const slot = now >= 0 ? now : nextIndex(lists, step, ch.id);
				return (
					<Move
						key={ch.id}
						x={x + slot * size.step}
						y={y + (now >= 0 ? 0 : -12)}
						show={now >= 0}
					>
						<CharBox
							ch={ch}
							size={size}
							gone={mark.gone?.includes(ch.id) ?? false}
							ring={mark.ring.includes(ch.id)}
							top={mark.top?.[ch.id]}
						/>
					</Move>
				);
			})}
		</g>
	);
}

type Field = "left" | "right" | "gone";
interface Rec {
	ch: Ch;
	left: string;
	right: string;
	gone: boolean;
}
interface CardSpec {
	title: string;
	rec: Rec;
	hot?: Field[];
}

const CARD_W = 150;
const CARD_H = 100;
const CARD_X = [30, 196];

// 기록 한 개를 펼친 모양. 글자 칸 옆에 번호, 왼쪽, 오른쪽, 지움 네 칸을 적는다.
function RecordCard({ x, y, spec }: { x: number; y: number; spec: CardSpec }) {
	const { rec, hot = [] } = spec;
	const rows: { key: Field | "id"; label: string; value: string }[] = [
		{ key: "id", label: "번호", value: rec.ch.id },
		{ key: "left", label: "왼쪽", value: rec.left },
		{ key: "right", label: "오른쪽", value: rec.right },
		{ key: "gone", label: "지움", value: rec.gone ? "예" : "아니오" },
	];
	const blank = rec.ch.c === " ";
	return (
		<g>
			{spec.title && (
				<text
					x={x}
					y={y}
					fontSize="11.5"
					fontWeight="600"
					fill="var(--muted-foreground)"
				>
					{spec.title}
				</text>
			)}
			<rect
				x={x}
				y={y + 10}
				width={CARD_W}
				height={CARD_H}
				rx="8"
				fill="var(--background)"
				stroke="rgb(var(--gray))"
				strokeOpacity="0.45"
			/>
			<rect
				x={x + 12}
				y={y + 38}
				width="34"
				height="44"
				rx="4"
				fill={rec.gone ? "none" : FILL[rec.ch.who]}
				stroke={rec.gone ? "var(--muted-foreground)" : "none"}
				strokeDasharray={rec.gone ? "3 2" : undefined}
			/>
			<text
				x={x + 29}
				y={y + (blank ? 64 : 67)}
				textAnchor="middle"
				fontSize={blank ? 10 : 18}
				fontWeight="700"
				fill={rec.gone ? "var(--muted-foreground)" : INK[rec.ch.who]}
			>
				{blank ? "빈칸" : rec.ch.c}
			</text>
			{rec.gone && (
				<line
					x1={x + 17}
					y1={y + 60}
					x2={x + 41}
					y2={y + 60}
					stroke="var(--muted-foreground)"
				/>
			)}
			{rows.map((row, i) => {
				const cy = y + 33 + i * 21;
				const isHot = row.key !== "id" && hot.includes(row.key);
				return (
					<g key={row.key}>
						<text
							x={x + 58}
							y={cy}
							fontSize="10.5"
							fill="var(--muted-foreground)"
						>
							{row.label}
						</text>
						<text
							x={x + 100}
							y={cy}
							fontSize="11.5"
							fontWeight="700"
							fill={isHot ? "var(--accent)" : "var(--foreground)"}
						>
							{row.value}
						</text>
						{isHot && (
							<line
								x1={x + 100}
								y1={cy + 3.5}
								x2={x + 100 + textWidth(row.value, 11.5)}
								y2={cy + 3.5}
								stroke="var(--accent)"
								strokeWidth="1.5"
							/>
						)}
					</g>
				);
			})}
		</g>
	);
}

const LEGEND = [
	["번호", "누가 몇 번째로 넣은 글자인가"],
	["왼쪽·오른쪽", "넣을 때 양옆에 있던 글자의 번호"],
	["지움", "지운 글자인가"],
	["처음·끝", "글의 맨 앞과 맨 뒤"],
];

function Legend({ y }: { y: number }) {
	return (
		<g>
			{LEGEND.map(([label, text], i) => (
				<g key={label}>
					<text
						x="372"
						y={y + i * 22}
						fontSize="11"
						fontWeight="700"
						fill="var(--foreground)"
					>
						{label}
					</text>
					<text
						x="444"
						y={y + i * 22}
						fontSize="11"
						fill="var(--muted-foreground)"
					>
						{text}
					</text>
				</g>
			))}
		</g>
	);
}

function Cards({
	step,
	y,
	cards,
}: {
	step: number;
	y: number;
	cards: CardSpec[];
}) {
	return (
		<FadeIn key={step}>
			{cards.map((card, i) => (
				<RecordCard key={card.rec.ch.id} x={CARD_X[i]} y={y} spec={card} />
			))}
		</FadeIn>
	);
}

interface CrdtStep {
	a: ScreenMark;
	b: ScreenMark;
	cards: CardSpec[];
}

// 1. 기록과 번호로 끼우기 — A는 맨 앞에, B는 끝에 넣고, 서로 받은 기록을 양옆 번호로 찾아 끼운다.
const at = (list: Ch[], id: string) => {
	const ch = list.find((c) => c.id === id);
	if (!ch) throw new Error(`${id} 기록이 없다`);
	return ch;
};
const REC = {
	S17: { ch: at(BASE, "S17"), left: "S16", right: "끝", gone: false },
	A1: { ch: at(A_INS, "A1"), left: "처음", right: "S1", gone: false },
	A2: { ch: at(A_INS, "A2"), left: "A1", right: "S1", gone: false },
	B1: { ch: at(B_INS, "B1"), left: "S17", right: "끝", gone: false },
	B2: { ch: at(B_INS, "B2"), left: "B1", right: "끝", gone: false },
} satisfies Record<string, Rec>;

const MERGED = [...A_INS, ...BASE, ...B_INS];
const REC_LISTS_A = [
	BASE,
	[...A_INS, ...BASE],
	[...A_INS, ...BASE],
	[...A_INS, ...BASE],
	MERGED,
	MERGED,
];
const REC_LISTS_B = [
	BASE,
	BASE,
	[...BASE, ...B_INS],
	[...BASE, ...B_INS],
	[...BASE, ...B_INS],
	MERGED,
];
const REC_STEPS: CrdtStep[] = [
	{
		a: { ring: ["S17"] },
		b: { ring: ["S17"] },
		cards: [{ title: "처음 글의 마지막 기록", rec: REC.S17 }],
	},
	{
		a: {
			ring: ["S1"],
			top: { S17: "19번 자리" },
			note: "자리는 밀려도 번호는 그대로다",
		},
		b: { ring: [] },
		cards: [
			{ title: "A가 새로 만든 기록", rec: REC.A1, hot: ["left", "right"] },
			{ title: "", rec: REC.A2 },
		],
	},
	{
		a: { ring: [] },
		b: { ring: ["S17"] },
		cards: [
			{ title: "B가 새로 만든 기록", rec: REC.B1, hot: ["left", "right"] },
			{ title: "", rec: REC.B2 },
		],
	},
	{
		a: { ring: [], note: "B1~B11을 받는다" },
		b: { ring: [], note: "A1~A3을 받는다" },
		cards: [
			{ title: "B의 화면으로 가는 기록", rec: REC.A1 },
			{ title: "A의 화면으로 가는 기록", rec: REC.B1 },
		],
	},
	{
		a: {
			ring: ["S17"],
			top: { S17: "19번 자리" },
			note: "S17을 번호로 찾아 바로 뒤에 잇는다",
		},
		b: { ring: [] },
		cards: [{ title: "A의 화면이 받은 기록", rec: REC.B1, hot: ["left"] }],
	},
	{
		a: { ring: [] },
		b: { ring: ["S1"], note: "처음과 S1 사이에 넣는다" },
		cards: [
			{ title: "B의 화면이 받은 기록", rec: REC.A1, hot: ["left", "right"] },
		],
	},
];
const REC_CAPTIONS = [
	"처음 글의 글자 17개는 각각 기록 하나다. 기록에는 번호와 글자, 넣을 때 왼쪽과 오른쪽에 있던 글자의 번호, 지움 표시가 들어 있다. 글은 이 기록들을 순서대로 이은 목록이다.",
	"A가 맨 앞에 「얇고 」를 친다. 새 기록 A1~A3이 생기고, A1에는 처음과 S1 사이에 넣었다고 적는다. A의 화면에서 S17은 16번에서 19번 자리로 밀렸지만 번호는 그대로다.",
	"같은 순간 B는 끝에 「. 찬물 손세탁 권장」을 친다. 새 기록 B1~B11이 생기고, B1에는 S17과 끝 사이에 넣었다고 적는다.",
	"두 화면은 새로 만든 기록을 그대로 주고받는다. 기록에는 자리 숫자가 없고 양옆 글자의 번호만 있다.",
	"A의 화면은 B1의 왼쪽인 S17을 번호로 찾는다. S17은 19번 자리에 있지만 자리를 세지 않으니 상관없다. 바로 뒤에 B1~B11을 잇는다.",
	"B의 화면은 A1~A3을 처음과 S1 사이에 넣는다. 두 화면의 기록이 같은 순서로 놓여 같은 글이 된다.",
];
const REC_H = 352;

export function CrdtRecordDemo() {
	const s = useSteps(REC_CAPTIONS.length);
	const t = s.step;
	const st = REC_STEPS[t];
	return (
		<StepFrame
			h={REC_H}
			captions={REC_CAPTIONS}
			s={s}
			label="CRDT가 글자마다 두는 기록을 단계별로 보여 주는 움직이는 그림. 위에는 A의 화면과 B의 화면이 글자 칸과 번호로 놓이고, 아래에는 기록 한 개를 펼쳐 번호, 왼쪽, 오른쪽, 지움 칸을 보여 준다. 처음 글의 마지막 기록 S17은 왼쪽이 S16, 오른쪽이 끝이다. A가 맨 앞에 넣은 A1은 왼쪽이 처음, 오른쪽이 S1이고, B가 끝에 넣은 B1은 왼쪽이 S17, 오른쪽이 끝이다. 두 화면은 기록을 그대로 주고받는다. A의 화면은 19번 자리로 밀린 S17을 번호로 찾아 그 뒤에 B1부터 B11까지 잇고, B의 화면은 A1부터 A3까지를 처음과 S1 사이에 넣는다. 두 화면의 기록이 같은 순서가 된다."
		>
			<SectionLabel y={34} text="A의 화면" />
			{st.a.note && (
				<FadeIn key={`a${t}`}>
					<Note y={34} text={st.a.note} />
				</FadeIn>
			)}
			<LiveStrip
				x={30}
				y={50}
				size={SMALL}
				lists={REC_LISTS_A}
				step={t}
				mark={st.a}
			/>
			<SectionLabel y={124} text="B의 화면" />
			{st.b.note && (
				<FadeIn key={`b${t}`}>
					<Note y={124} text={st.b.note} />
				</FadeIn>
			)}
			<LiveStrip
				x={30}
				y={140}
				size={SMALL}
				lists={REC_LISTS_B}
				step={t}
				mark={st.b}
			/>
			<Divider y={198} />
			<Cards step={t} y={222} cards={st.cards} />
			<Legend y={246} />
		</StepFrame>
	);
}

// 2. 지움과 같은 자리 — 두 사람이 「100」을 함께 지우고 다른 숫자를 넣으면, 양옆이 같은 기록 둘을 규칙으로 줄 세운다.
const FRAG = BASE.slice(7);
const A_NUM = seq("70", "A", "a", 4);
const B_NUM = seq("95", "B", "b", 12);
const DIGITS = ["S11", "S12", "S13"];
// 지운 기록은 목록에 남으니 새 숫자는 S13과 S14 사이에 들어간다.
const withDigits = (ins: Ch[]) => [
	...FRAG.slice(0, 6),
	...ins,
	...FRAG.slice(6),
];
const TIE_LISTS_A = [
	FRAG,
	FRAG,
	withDigits(A_NUM),
	withDigits(A_NUM),
	withDigits([...A_NUM, ...B_NUM]),
];
const TIE_LISTS_B = [
	FRAG,
	FRAG,
	FRAG,
	withDigits(B_NUM),
	withDigits([...A_NUM, ...B_NUM]),
];
const S11 = at(BASE, "S11");
const TIE_REC = {
	S11: { ch: S11, left: "S10", right: "끝", gone: false },
	S11gone: { ch: S11, left: "S10", right: "끝", gone: true },
	A4: { ch: at(A_NUM, "A4"), left: "S13", right: "S14", gone: false },
	A5: { ch: at(A_NUM, "A5"), left: "A4", right: "S14", gone: false },
	B12: { ch: at(B_NUM, "B12"), left: "S13", right: "S14", gone: false },
	B13: { ch: at(B_NUM, "B13"), left: "B12", right: "S14", gone: false },
} satisfies Record<string, Rec>;
const NEIGHBORS = ["S13", "S14"];
const TIE_STEPS: (CrdtStep & { readA: string; readB: string })[] = [
	{
		a: { ring: ["S11"] },
		b: { ring: ["S11"] },
		cards: [{ title: "지우기 전의 S11", rec: TIE_REC.S11 }],
		readA: "린넨 100% 셔츠",
		readB: "린넨 100% 셔츠",
	},
	{
		a: { ring: ["S11"], gone: DIGITS },
		b: { ring: [] },
		cards: [
			{ title: "A가 지운 뒤의 S11", rec: TIE_REC.S11gone, hot: ["gone"] },
		],
		readA: "린넨 % 셔츠",
		readB: "린넨 100% 셔츠",
	},
	{
		a: { ring: NEIGHBORS, gone: DIGITS },
		b: { ring: [] },
		cards: [
			{ title: "A가 새로 만든 기록", rec: TIE_REC.A4, hot: ["left", "right"] },
			{ title: "", rec: TIE_REC.A5 },
		],
		readA: "린넨 70% 셔츠",
		readB: "린넨 100% 셔츠",
	},
	{
		a: { ring: [], gone: DIGITS },
		b: { ring: NEIGHBORS, gone: DIGITS },
		cards: [
			{ title: "B가 새로 만든 기록", rec: TIE_REC.B12, hot: ["left", "right"] },
			{ title: "", rec: TIE_REC.B13 },
		],
		readA: "린넨 70% 셔츠",
		readB: "린넨 95% 셔츠",
	},
	{
		a: { ring: NEIGHBORS, gone: DIGITS },
		b: { ring: NEIGHBORS, gone: DIGITS },
		cards: [
			{ title: "양옆이 같은 두 기록", rec: TIE_REC.A4, hot: ["left", "right"] },
			{ title: "", rec: TIE_REC.B12, hot: ["left", "right"] },
		],
		readA: "린넨 7095% 셔츠",
		readB: "린넨 7095% 셔츠",
	},
];
const TIE_CAPTIONS = [
	"「린넨 100% 셔츠」 부분의 기록이다. 처음 글은 앞에서부터 차례로 쳤으니, 넣을 때 오른쪽은 늘 끝이었다.",
	"A가 「100」을 지운다. 기록 S11~S13은 목록에 그대로 두고 지움 칸만 예로 바꾼다. 새 번호도 쓰지 않는다. 읽을 때는 지운 기록을 건너뛰어 「린넨 % 셔츠」가 된다.",
	"A가 「70」을 친다. A는 앞에서 A1~A3을 썼으니 새 번호는 A4부터다. 지운 기록도 목록에 남아 있어서 A4의 왼쪽은 S13, 오른쪽은 S14다.",
	"같은 순간 B도 「100」을 지우고 「95」를 친다. B의 새 번호는 B12부터이고, B12의 양옆도 S13과 S14다.",
	"기록을 주고받으면 S13과 S14 사이에 들어갈 기록이 둘이다. 양옆이 같으니 번호를 비교하는 규칙으로 순서를 정한다. 이 그림에서는 A를 앞에 둔다. 두 화면 모두 「린넨 7095% 셔츠」가 되고, 지운 기록 세 개는 그대로 남는다.",
];
const TIE_H = 362;

function ReadLine({ y, text }: { y: number; text: string }) {
	return (
		<g>
			<text x="476" y={y} fontSize="11" fill="var(--muted-foreground)">
				읽으면
			</text>
			<text
				x="520"
				y={y}
				fontSize="12.5"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{text}
			</text>
		</g>
	);
}

export function CrdtTieDemo() {
	const s = useSteps(TIE_CAPTIONS.length);
	const t = s.step;
	const st = TIE_STEPS[t];
	return (
		<StepFrame
			h={TIE_H}
			captions={TIE_CAPTIONS}
			s={s}
			label="CRDT에서 지우기와 같은 자리 넣기를 단계별로 보여 주는 움직이는 그림. '린넨 100% 셔츠' 부분의 기록 S8부터 S17까지가 A의 화면과 B의 화면에 놓인다. A가 100을 지우면 기록 S11부터 S13까지는 목록에 남고 지움 칸만 예가 된다. A가 70을 치면 새 기록 A4와 A5가 생기고 A4의 양옆은 S13과 S14다. 같은 순간 B도 100을 지우고 95를 쳐서 기록 B12와 B13이 생기고, B12의 양옆도 S13과 S14다. 기록을 주고받으면 양옆이 같은 두 기록을 번호 규칙으로 줄 세워 A를 앞에 두고, 두 화면 모두 '린넨 7095% 셔츠'가 된다. 지운 기록 세 개는 그대로 남는다."
		>
			<SectionLabel y={34} text="A의 화면" />
			<LiveStrip
				x={30}
				y={50}
				size={LARGE}
				lists={TIE_LISTS_A}
				step={t}
				mark={st.a}
			/>
			<ReadLine y={70} text={st.readA} />
			<SectionLabel y={128} text="B의 화면" />
			<LiveStrip
				x={30}
				y={144}
				size={LARGE}
				lists={TIE_LISTS_B}
				step={t}
				mark={st.b}
			/>
			<ReadLine y={164} text={st.readB} />
			<Divider y={208} />
			<Cards step={t} y={232} cards={st.cards} />
			<Legend y={256} />
		</StepFrame>
	);
}

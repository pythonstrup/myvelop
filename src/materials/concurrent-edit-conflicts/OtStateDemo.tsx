// OT가 두는 것 — 서버의 연산 기록과 버전, 화면의 확인 대기 연산 — 과 연산이 오가며 위치가 고쳐지는 과정.
// 색은 TextMerge 그림과 같다. A가 한 일은 강조색, B가 한 일은 진한 색, 처음 글은 옅은 색이다.
import type { ReactNode } from "react";
import { textWidth } from "./admin";
import { FadeIn, Move, StepFrame, useSteps } from "./StepFigure";

function LaneNote({ x, y, text }: { x: number; y: number; text: string }) {
	return (
		<FadeIn>
			<text
				x={x}
				y={y}
				textAnchor="end"
				fontSize="11.5"
				fontWeight="600"
				fill="var(--accent)"
			>
				{text}
			</text>
		</FadeIn>
	);
}

type Seg = "a" | "base" | "b";
type Tone = "a" | "b" | "ack";

const SEG_TEXT: Record<Seg, string> = {
	a: "얇고 ",
	base: "통기성 좋은 린넨 100% 셔츠",
	b: ". 찬물 손세탁 권장",
};
const ALL_SEGS: Seg[] = ["a", "base", "b"];

// 낫표는 한 글자 폭이라 한글처럼 센다.
const pillWidth = (text: string) =>
	textWidth(text.replace(/[「」]/g, "가"), 11.5) + 22;

function Pill({
	text,
	tone,
	ring = false,
}: {
	text: string;
	tone: Tone;
	ring?: boolean;
}) {
	const w = pillWidth(text);
	const fill =
		tone === "a"
			? "var(--accent)"
			: tone === "b"
				? "var(--foreground)"
				: "var(--secondary)";
	return (
		<g>
			{ring && (
				<rect
					x="-3.5"
					y="-14.5"
					width={w + 7}
					height="29"
					rx="14.5"
					fill="none"
					stroke="var(--accent)"
					strokeWidth="2"
				/>
			)}
			<rect y="-11" width={w} height="22" rx="11" fill={fill} />
			<text
				x={w / 2}
				y="4"
				textAnchor="middle"
				fontSize="11.5"
				fontWeight="600"
				fill={tone === "ack" ? "var(--foreground)" : "var(--background)"}
				style={{ whiteSpace: "pre" }}
			>
				{text}
			</text>
		</g>
	);
}

function DocText({ x, y, segs }: { x: number; y: number; segs: Seg[] }) {
	return (
		<text x={x} y={y} fontSize="13" style={{ whiteSpace: "pre" }}>
			{segs.map((seg) => (
				<tspan
					key={seg}
					fill={
						seg === "a"
							? "var(--accent)"
							: seg === "b"
								? "var(--foreground)"
								: "var(--muted-foreground)"
					}
					fontWeight={seg === "base" ? 400 : 700}
				>
					{SEG_TEXT[seg]}
				</tspan>
			))}
		</text>
	);
}

function VersionChip({
	right,
	cy,
	ver,
	bump,
}: {
	right: number;
	cy: number;
	ver: number;
	bump: boolean;
}) {
	const text = `버전 ${ver}`;
	const w = textWidth(text, 12) + 22;
	return (
		<g>
			<rect
				x={right - w}
				y={cy - 12}
				width={w}
				height="24"
				rx="12"
				fill={bump ? "var(--accent)" : "var(--secondary)"}
				style={{ transition: "fill 0.4s ease" }}
			/>
			<text
				x={right - w / 2}
				y={cy + 4.5}
				textAnchor="middle"
				fontSize="12"
				fontWeight="700"
				fill={bump ? "var(--background)" : "var(--foreground)"}
			>
				{text}
			</text>
		</g>
	);
}

const LANE_H = 96;
const VAL_X = 112;
const LANE_RIGHT = 644;

function Lane({
	top,
	name,
	ver,
	bump,
	segs,
	rowLabel,
	children,
}: {
	top: number;
	name: string;
	ver: number;
	bump: boolean;
	segs: Seg[];
	rowLabel: string;
	children: ReactNode;
}) {
	return (
		<g>
			<rect
				x="20"
				y={top}
				width="640"
				height={LANE_H}
				rx="10"
				fill="none"
				stroke="rgb(var(--gray))"
				strokeOpacity="0.35"
			/>
			<text
				x="36"
				y={top + 27}
				fontSize="13"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{name}
			</text>
			<VersionChip right={LANE_RIGHT} cy={top + 22} ver={ver} bump={bump} />
			<text x="36" y={top + 55} fontSize="11.5" fill="var(--muted-foreground)">
				글
			</text>
			<DocText x={VAL_X} y={top + 55} segs={segs} />
			<text x="36" y={top + 80} fontSize="11.5" fill="var(--muted-foreground)">
				{rowLabel}
			</text>
			{children}
		</g>
	);
}

function Empty({ y, show, text }: { y: number; show: boolean; text: string }) {
	return (
		<Move x={VAL_X} y={y} show={show}>
			<text y="4" fontSize="11.5" fill="var(--muted-foreground)">
				{text}
			</text>
		</Move>
	);
}

const A_TOP = 20;
const S_TOP = 168;
const B_TOP = 316;
const GUTTER = [142, 290];
const OT_H = B_TOP + LANE_H + 16;

const E1 = "1 · A · 0번에 「얇고 」 넣기";
const E2 = "2 · B · 20번에 「. 찬물 손세탁 권장」 넣기";
const ACK1 = "기록 1 확인";
const SEND1 = "기록 1 · 0번에 「얇고 」 넣기";
const B_AT17 = "17번에 「. 찬물 손세탁 권장」 넣기";
const B_AT20 = "20번에 「. 찬물 손세탁 권장」 넣기";

// 오가는 연산. from 단계에 보낸 쪽에서 나와 둘 사이에 머물고, to 단계에 받는 쪽으로 들어간다.
interface Msg {
	id: string;
	gutter: 0 | 1;
	dir: "down" | "up";
	x: number;
	from: number;
	to: number;
	tone: Tone;
	text: (step: number) => string;
}
const MSGS: Msg[] = [
	{
		id: "a-send",
		gutter: 0,
		dir: "down",
		x: VAL_X,
		from: 1,
		to: 2,
		tone: "a",
		text: () => "버전 0 · 0번에 「얇고 」 넣기",
	},
	{
		id: "b-send",
		gutter: 1,
		dir: "up",
		x: VAL_X,
		from: 1,
		to: 4,
		tone: "b",
		text: (s) => (s >= 3 ? `버전 1 · ${B_AT20}` : `버전 0 · ${B_AT17}`),
	},
	{
		id: "a-ack",
		gutter: 0,
		dir: "up",
		x: VAL_X,
		from: 5,
		to: 6,
		tone: "ack",
		text: () => ACK1,
	},
	{
		id: "a-recv",
		gutter: 0,
		dir: "up",
		x: VAL_X + pillWidth(ACK1) + 26,
		from: 5,
		to: 6,
		tone: "b",
		text: () => "기록 2 · 20번에 「. 찬물 손세탁 권장」 넣기",
	},
	{
		id: "b-recv",
		gutter: 1,
		dir: "down",
		x: VAL_X,
		from: 5,
		to: 7,
		tone: "a",
		text: () => SEND1,
	},
	{
		id: "b-ack",
		gutter: 1,
		dir: "down",
		x: VAL_X + pillWidth(SEND1) + 26,
		from: 5,
		to: 8,
		tone: "ack",
		text: () => "기록 2 확인",
	},
];

const docA = (s: number): Seg[] =>
	s < 1 ? ["base"] : s < 6 ? ["a", "base"] : ALL_SEGS;
const docS = (s: number): Seg[] =>
	s < 2 ? ["base"] : s < 4 ? ["a", "base"] : ALL_SEGS;
const docB = (s: number): Seg[] =>
	s < 1 ? ["base"] : s < 7 ? ["base", "b"] : ALL_SEGS;
const verA = (s: number) => (s < 6 ? 0 : 2);
const verS = (s: number) => (s < 2 ? 0 : s < 4 ? 1 : 2);
const verB = (s: number) => (s < 7 ? 0 : s < 8 ? 1 : 2);
const bumped = (ver: (s: number) => number, s: number) =>
	s > 0 && ver(s) !== ver(s - 1);

const OT_CAPTIONS = [
	"처음에는 A의 화면, 서버, B의 화면이 같은 글을 갖고 모두 버전 0이다. 서버의 연산 기록은 비어 있다.",
	"A는 0번 자리에 「얇고 」를, B는 17번 자리에 세탁 방법을 넣는다. 둘 다 자기 화면에 바로 적용하고, 마지막으로 받은 버전 0을 실어 서버로 보낸다. 보낸 연산은 확인받을 때까지 확인 대기에 둔다.",
	"A의 연산이 먼저 도착한다. 실어 온 버전 0이 서버의 버전과 같으니 그대로 적용하고 기록 1로 쌓는다. 서버는 버전 1이 된다.",
	"B의 연산은 버전 0에서 만든 것이라 기록 1을 모른다. 서버는 기록 1이 0번 자리에 3글자를 넣은 것을 보고, B의 자리를 17에서 20으로 고친다.",
	"고친 연산을 적용하고 기록 2로 쌓는다. 서버는 버전 2가 된다.",
	"서버가 결과를 나눠 준다. A에게는 기록 1의 확인과 기록 2의 연산을, B에게는 기록 1의 연산과 기록 2의 확인을 보낸다.",
	"A는 확인을 받아 대기 연산을 지우고, 기록 2를 그대로 적용한다. 서버가 이미 위치를 고쳐 보냈기 때문이다. A는 버전 2가 된다.",
	"B에게는 아직 확인받지 못한 연산이 있다. 그래서 받은 기록 1과 내 대기 연산을 서로에 맞춰 고친다. 받은 0번은 내 17번보다 앞이라 그대로 적용하고, 내 대기 연산은 20번이 된다. 서버의 기록 2와 같은 모양이다.",
	"B가 기록 2의 확인을 받아 대기 연산을 지운다. 세 곳 모두 버전 2이고 글이 같다.",
];

function GutterArrow({ dir }: { dir: "down" | "up" }) {
	return (
		<path
			d={
				dir === "down"
					? "M -17 -4 L -7 -4 L -12 4 Z"
					: "M -17 4 L -7 4 L -12 -4 Z"
			}
			fill="var(--muted-foreground)"
		/>
	);
}

export function OtStateDemo() {
	const s = useSteps(OT_CAPTIONS.length);
	const t = s.step;
	const aPending = t >= 1 && t <= 5;
	const bPending = t >= 1 && t <= 7;
	const bSendText = MSGS[1].text(t);
	return (
		<StepFrame
			h={OT_H}
			captions={OT_CAPTIONS}
			s={s}
			label="OT가 두는 것과 주고받는 것을 단계별로 보여 주는 움직이는 그림. A의 화면, 서버, B의 화면이 위에서 아래로 놓이고, 각자 글과 버전을 둔다. 서버는 연산 기록을, 화면은 확인 대기 연산을 둔다. A는 0번 자리에 '얇고 '를, B는 17번 자리에 세탁 방법을 넣고 둘 다 버전 0을 실어 보낸다. 서버는 A의 연산을 그대로 기록 1로 쌓고, B의 연산은 기록 1에 맞춰 17을 20으로 고쳐 기록 2로 쌓는다. A는 기록 2를 그대로 적용하고, B는 받은 기록 1을 그대로 적용하면서 자기 대기 연산을 20번으로 고친다. 마지막에 세 곳 모두 버전 2이고 글이 같다."
		>
			<Lane
				top={A_TOP}
				name="A의 화면"
				ver={verA(t)}
				bump={bumped(verA, t)}
				segs={docA(t)}
				rowLabel="확인 대기"
			>
				<Move x={VAL_X} y={A_TOP + 76} show={aPending}>
					<Pill text="0번에 「얇고 」 넣기" tone="a" />
				</Move>
				<Empty y={A_TOP + 76} show={!aPending} text="없음" />
				{t === 6 && (
					<LaneNote
						key="a6"
						x={LANE_RIGHT}
						y={A_TOP + 80}
						text="받은 기록 2를 그대로 적용한다"
					/>
				)}
			</Lane>

			<Lane
				top={S_TOP}
				name="서버"
				ver={verS(t)}
				bump={bumped(verS, t)}
				segs={docS(t)}
				rowLabel="기록"
			>
				<Move x={VAL_X} y={S_TOP + 76} show={t >= 2}>
					<Pill text={E1} tone="a" ring={t === 3} />
				</Move>
				<Move x={VAL_X + pillWidth(E1) + 10} y={S_TOP + 76} show={t >= 4}>
					<Pill text={E2} tone="b" />
				</Move>
				<Empty y={S_TOP + 76} show={t < 2} text="비어 있음" />
				{t === 2 && (
					<LaneNote
						key="s2"
						x={LANE_RIGHT}
						y={S_TOP + 80}
						text="실어 온 버전 0이 서버와 같아 그대로 쌓는다"
					/>
				)}
			</Lane>

			<Lane
				top={B_TOP}
				name="B의 화면"
				ver={verB(t)}
				bump={bumped(verB, t)}
				segs={docB(t)}
				rowLabel="확인 대기"
			>
				<Move x={VAL_X} y={B_TOP + 76} show={bPending}>
					<Pill text={t === 7 ? B_AT20 : B_AT17} tone="b" ring={t === 7} />
				</Move>
				<Empty y={B_TOP + 76} show={!bPending} text="없음" />
				{t === 7 && (
					<LaneNote
						key="b7"
						x={LANE_RIGHT}
						y={B_TOP + 80}
						text="받은 0번은 그대로, 내 대기는 17 → 20"
					/>
				)}
				{t === 8 && (
					<LaneNote
						key="b8"
						x={LANE_RIGHT}
						y={B_TOP + 80}
						text="확인을 받아 대기를 비운다"
					/>
				)}
			</Lane>

			{MSGS.map((m) => {
				const off = m.dir === "down" ? 34 : -34;
				const phase = t < m.from ? -1 : t < m.to ? 0 : 1;
				return (
					<Move
						key={m.id}
						x={m.x}
						y={GUTTER[m.gutter] + phase * off}
						show={phase === 0}
					>
						<GutterArrow dir={m.dir} />
						<Pill text={m.text(t)} tone={m.tone} />
					</Move>
				);
			})}
			{t === 3 && (
				<FadeIn key="t3">
					<text
						x={VAL_X + pillWidth(bSendText) + 14}
						y={GUTTER[1] + 4.5}
						fontSize="12"
						fontWeight="700"
						fill="var(--accent)"
					>
						기록 1에 맞춰 17 → 20
					</text>
				</FadeIn>
			)}
		</StepFrame>
	);
}

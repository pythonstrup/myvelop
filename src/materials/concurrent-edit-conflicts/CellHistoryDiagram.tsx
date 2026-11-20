// Last-Write-Wins — A와 B가 같은 가격 칸을 차례로 저장하면 둘 다 성공하지만, 마지막 값만 남고 A의 값은 셀 기록에만 남는다.
import type { ReactNode } from "react";
import { textWidth } from "./admin";

const PANEL_W = 200;
const PANEL_H = 228;
const GAP = 32;
const H = PANEL_H + 16;
const BORDER = { stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const xOf = (i: number) => 8 + i * (PANEL_W + GAP);

function Panel({
	i,
	title,
	screen,
	note,
	children,
}: {
	i: number;
	title: string;
	screen: string;
	note?: string;
	children: ReactNode;
}) {
	return (
		<g transform={`translate(${xOf(i)} 8)`}>
			<rect
				width={PANEL_W}
				height={PANEL_H}
				rx="12"
				fill="var(--background)"
				{...BORDER}
			/>
			<circle cx="26" cy="27" r="10" fill="var(--secondary)" />
			<text
				x="26"
				y="31"
				textAnchor="middle"
				fontSize="11"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{i + 1}
			</text>
			<text
				x="44"
				y="31.5"
				fontSize="13.5"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{title}
			</text>
			<text x="16" y="58" fontSize="10.5" fill="var(--muted-foreground)">
				{screen}
			</text>
			{note && (
				<text
					x={PANEL_W - 16}
					y="58"
					textAnchor="end"
					fontSize="10.5"
					fill="var(--muted-foreground)"
				>
					{note}
				</text>
			)}
			{children}
		</g>
	);
}

function PriceCell({ value, color }: { value: string; color: string }) {
	return (
		<g>
			<rect
				x="16"
				y="66"
				width={PANEL_W - 32}
				height="40"
				rx="6"
				fill="none"
				stroke={color}
				strokeWidth="2"
			/>
			<text x="28" y="91" fontSize="11" fill="var(--muted-foreground)">
				가격
			</text>
			<text
				x={PANEL_W - 28}
				y="92"
				textAnchor="end"
				fontSize="14"
				fontWeight="700"
				fill="var(--foreground)"
			>
				{value}
			</text>
		</g>
	);
}

function SavedToast() {
	return (
		<g>
			<rect
				x="16"
				y="118"
				width={PANEL_W - 32}
				height="30"
				rx="8"
				fill="var(--foreground)"
			/>
			<circle cx="34" cy="133" r="7" fill="var(--accent)" />
			<path
				d="M 30.5 133 l 2.5 2.5 l 4.5 -5"
				fill="none"
				stroke="var(--background)"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<text x="48" y="137" fontSize="11.5" fill="var(--background)">
				저장했습니다
			</text>
		</g>
	);
}

function Caption({ lines }: { lines: string[] }) {
	return (
		<g>
			{lines.map((line, j) => (
				<text
					key={line}
					x="16"
					y={190 + j * 18}
					fontSize="11.5"
					fill="var(--muted-foreground)"
				>
					{line}
				</text>
			))}
		</g>
	);
}

const HISTORY = [
	{ value: "35,000원", who: "B · 최신 값", tone: "current" },
	{ value: "29,000원", who: "A · 덮임", tone: "lost" },
	{ value: "39,000원", who: "처음 값", tone: "old" },
] as const;

function History() {
	return (
		<g>
			<text x="16" y="124" fontSize="10.5" fill="var(--muted-foreground)">
				셀 기록
			</text>
			<rect
				x="16"
				y="130"
				width={PANEL_W - 32}
				height="66"
				rx="8"
				fill="none"
				{...BORDER}
			/>
			{HISTORY.map((h, j) => {
				const y = 148 + j * 20;
				return (
					<g key={h.value}>
						{j > 0 && (
							<line
								x1="24"
								y1={y - 14}
								x2={PANEL_W - 24}
								y2={y - 14}
								stroke="rgb(var(--gray))"
								strokeOpacity="0.25"
							/>
						)}
						<text
							x="28"
							y={y}
							fontSize="12"
							fontWeight={h.tone === "current" ? "700" : "400"}
							fill={
								h.tone === "current"
									? "var(--foreground)"
									: "var(--muted-foreground)"
							}
						>
							{h.value}
						</text>
						{h.tone === "lost" && (
							<line
								x1="27"
								y1={y - 4}
								x2={24 + textWidth(h.value, 12)}
								y2={y - 4}
								stroke="var(--muted-foreground)"
								strokeWidth="1.2"
							/>
						)}
						<text
							x={PANEL_W - 28}
							y={y}
							textAnchor="end"
							fontSize="11"
							fontWeight={h.tone === "lost" ? "700" : "400"}
							fill={
								h.tone === "lost"
									? "var(--destructive)"
									: "var(--muted-foreground)"
							}
						>
							{h.who}
						</text>
					</g>
				);
			})}
		</g>
	);
}

function StepArrow({ i, label }: { i: number; label: string }) {
	const x1 = xOf(i) + PANEL_W + 5;
	const x2 = xOf(i + 1) - 5;
	const y = 94;
	return (
		<g>
			<text
				x={(x1 + x2) / 2}
				y={y - 8}
				textAnchor="middle"
				fontSize="10"
				fill="var(--muted-foreground)"
			>
				{label}
			</text>
			<line
				x1={x1}
				y1={y}
				x2={x2}
				y2={y}
				stroke="var(--muted-foreground)"
				strokeWidth="1.5"
			/>
			<path
				d={`M ${x2 - 6} ${y - 4} L ${x2} ${y} L ${x2 - 6} ${y + 4}`}
				fill="none"
				stroke="var(--muted-foreground)"
				strokeWidth="1.5"
			/>
		</g>
	);
}

export default function CellHistoryDiagram() {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${H}`}
				role="img"
				aria-label="Last-Write-Wins 방식에서 같은 가격 칸을 차례로 저장하는 과정. 1. A의 화면에서 A가 처음 값 39,000원을 29,000원으로 내려 저장하고 '저장했습니다' 알림을 받는다. 2. 4초 뒤 39,000원을 보고 있던 B가 할인 소식을 모른 채 35,000원으로 저장하고, 역시 '저장했습니다' 알림을 받는다. 3. 서버에는 마지막에 저장된 B의 35,000원만 남는다. 셀 기록에는 35,000원(B, 최신 값), 29,000원(A, 덮임), 39,000원(처음 값)이 쌓여 있고, A는 자기 값이 덮인 줄 모른다."
				style={{
					display: "block",
					minWidth: 560,
					maxWidth: 680,
					margin: "0 auto",
				}}
			>
				<Panel i={0} title="A가 저장" screen="A의 화면" note="처음 39,000원">
					<PriceCell value="29,000원" color="var(--accent)" />
					<SavedToast />
					<Caption lines={["할인가로 내리고", "저장에 성공한다"]} />
				</Panel>
				<StepArrow i={0} label="4초 뒤" />
				<Panel
					i={1}
					title="B가 저장"
					screen="B의 화면"
					note="B가 본 값 39,000원"
				>
					<PriceCell value="35,000원" color="var(--foreground)" />
					<SavedToast />
					<Caption lines={["할인 소식을 모른 채", "35,000원으로 저장한다"]} />
				</Panel>
				<StepArrow i={1} label="결과" />
				<Panel i={2} title="B의 값만 남음" screen="서버">
					<PriceCell value="35,000원" color="var(--foreground)" />
					<History />
					<text
						x="16"
						y="214"
						fontSize="11.5"
						fontWeight="600"
						fill="var(--foreground)"
					>
						A는 덮인 줄 모른다
					</text>
				</Panel>
			</svg>
		</div>
	);
}

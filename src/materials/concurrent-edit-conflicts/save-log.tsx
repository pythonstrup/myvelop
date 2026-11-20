// 비교 단위 그림 둘이 함께 쓰는 틀 — 위에는 상품 행, 아래에는 저장 순서와 판정.
import type { ReactNode } from "react";
import {
	type ColKey,
	colOf,
	ProductRow,
	type ProductRowData,
	ROWS_TOP,
	TableHead,
	textWidth,
} from "./admin";

export interface SaveAttempt {
	who: string;
	action: string;
	check: string;
	ok: boolean;
	note?: string;
}

const SHIFT = 72; // admin 표 머리(y 96)를 그림 위쪽(y 24)으로 올린다.
const ATTEMPT_H = 34;

// 칸 위쪽 경계에 붙는 사람 표시. nth 는 같은 칸에 둘 이상일 때 왼쪽으로 민다.
export function WhoBadge({
	col,
	who,
	nth = 0,
}: {
	col: ColKey;
	who: string;
	nth?: number;
}) {
	const c = colOf(col);
	const cx = c.x + c.w - 12 - nth * 22;
	return (
		<g>
			<circle
				cx={cx}
				cy={ROWS_TOP + 1}
				r="9"
				fill="var(--foreground)"
				stroke="var(--background)"
				strokeWidth="2"
			/>
			<text
				x={cx}
				y={ROWS_TOP + 5}
				textAnchor="middle"
				fontSize="10"
				fontWeight="700"
				fill="var(--background)"
			>
				{who}
			</text>
		</g>
	);
}

export function SaveLogFigure({
	label,
	row,
	rowH,
	overlay,
	attempts,
	caption,
}: {
	label: string;
	row: ProductRowData;
	rowH: number;
	overlay: ReactNode;
	attempts: SaveAttempt[];
	caption: string;
}) {
	const logTop = ROWS_TOP - SHIFT + rowH + 26;
	const h = logTop + 18 + attempts.length * ATTEMPT_H + 34;
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
				<g transform={`translate(0 -${SHIFT})`}>
					<TableHead />
					<ProductRow row={row} top={ROWS_TOP} h={rowH} />
					{overlay}
				</g>
				<text x="24" y={logTop} fontSize="10.5" fill="var(--muted-foreground)">
					저장 순서
				</text>
				{attempts.map((a, i) => {
					const cy = logTop + 22 + i * ATTEMPT_H;
					const verdict = a.ok ? "저장" : "거절";
					const chipW = textWidth(verdict, 12) + 20;
					return (
						<g key={`${a.who}-${a.action}`}>
							{i > 0 && (
								<line
									x1="24"
									y1={cy - ATTEMPT_H / 2}
									x2="656"
									y2={cy - ATTEMPT_H / 2}
									stroke="rgb(var(--gray))"
									strokeOpacity="0.2"
								/>
							)}
							<circle cx="36" cy={cy} r="10" fill="var(--secondary)" />
							<text
								x="36"
								y={cy + 4}
								textAnchor="middle"
								fontSize="10.5"
								fontWeight="700"
								fill="var(--foreground)"
							>
								{a.who}
							</text>
							<text
								x="56"
								y={cy + 4.5}
								fontSize="12.5"
								fill="var(--foreground)"
							>
								{a.action}
							</text>
							<text
								x="236"
								y={cy + 4.5}
								fontSize="12"
								fill="var(--muted-foreground)"
							>
								{a.check}
							</text>
							<rect
								x="480"
								y={cy - 12}
								width={chipW}
								height="24"
								rx="12"
								fill={a.ok ? "var(--accent)" : "var(--destructive)"}
							/>
							<text
								x={480 + chipW / 2}
								y={cy + 4.5}
								textAnchor="middle"
								fontSize="12"
								fontWeight="700"
								fill="var(--background)"
							>
								{verdict}
							</text>
							{a.note && (
								<text
									x={490 + chipW}
									y={cy + 4.5}
									fontSize="11.5"
									fill="var(--muted-foreground)"
								>
									{a.note}
								</text>
							)}
						</g>
					);
				})}
				<text
					x="24"
					y={h - 26}
					fontSize="12.5"
					fontWeight="600"
					fill="var(--foreground)"
				>
					{caption}
				</text>
			</svg>
		</div>
	);
}

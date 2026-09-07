// 문제가 시작되는 화면. 실제 소재 대신 카드 그리드의 형태만 옮긴 정적 SVG다.
const LABELS = {
	ko: {
		aria: "카드 그리드 화면의 형태를 옮긴 그림. 썸네일 카드가 한 화면에 여러 줄로 깔려 있고, 그중 일부는 영상이라 재생 버튼과 30MB에서 200MB 사이의 용량 표시가 붙어 있다. 아래로 카드가 더 이어진다.",
	},
	en: {
		aria: "A sketch of the card grid screen. Thumbnail cards fill several rows, and some of them are videos with a play button and a size label between 30MB and 200MB. More cards continue below.",
	},
} as const;
type Lang = keyof typeof LABELS;

const CARD_W = 92;
const GAP = 9;
const MARGIN = 12;
const THUMB_H = 62;
const ROWS = [30, 142, 254] as const;

// 카드마다 영상 여부와 용량. 실제 데이터가 아니라 형태를 보여주기 위한 값이다.
const CARDS = [
	["180MB", "", "64MB", "", "120MB"],
	["", "31MB", "", "156MB", "92MB"],
	["", "", "", "", ""],
] as const;

export default function AssetGridDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];

	const card = (col: number, top: number, size: string) => {
		const x = MARGIN + col * (CARD_W + GAP);
		const isVideo = size !== "";
		const cx = x + CARD_W / 2;
		const cy = top + THUMB_H / 2;
		return (
			<g key={`${top}-${col}`}>
				<rect
					x={x}
					y={top}
					width={CARD_W}
					height={THUMB_H}
					rx="8"
					fill="var(--secondary)"
					stroke="rgb(var(--gray))"
					strokeOpacity="0.35"
				/>
				{isVideo ? (
					<>
						<circle cx={cx} cy={cy} r="12" fill="var(--background, #fff)" fillOpacity="0.85" stroke="var(--accent)" strokeOpacity="0.7" />
						<path d={`M ${cx - 4} ${cy - 6} L ${cx + 7} ${cy} L ${cx - 4} ${cy + 6} z`} fill="var(--accent)" />
						<rect x={x + CARD_W - 50} y={top + 6} width="44" height="16" rx="8" fill="var(--accent)" fillOpacity="0.12" />
						<text
							x={x + CARD_W - 28}
							y={top + 17}
							textAnchor="middle"
							fontSize="10"
							fontWeight="600"
							fill="var(--accent)"
						>
							{size}
						</text>
					</>
				) : null}
				<rect x={x} y={top + THUMB_H + 8} width={CARD_W} height="5" rx="2.5" fill="rgb(var(--gray))" fillOpacity="0.28" />
				<rect x={x} y={top + THUMB_H + 18} width={CARD_W * 0.62} height="5" rx="2.5" fill="rgb(var(--gray))" fillOpacity="0.18" />
			</g>
		);
	};

	return (
		<svg
			viewBox="0 0 520 286"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}
		>
			<defs>
				<linearGradient id="ag-fade" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="var(--background, #fff)" stopOpacity="0" />
					<stop offset="1" stopColor="var(--background, #fff)" stopOpacity="1" />
				</linearGradient>
			</defs>

			{ROWS.map((top, row) => CARDS[row].map((size, col) => card(col, top, size)))}

			<rect x="0" y="238" width="520" height="48" fill="url(#ag-fade)" />
		</svg>
	);
}

import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// DORA 「ROI of AI-assisted Software Development」의 피한 비용 식을 그린 정적 그림.
// 위는 순절약시간을 구하는 폭포형 막대이고, 아래는 그 값을 넣는 식이다.
// 한 사람이 주에 4시간을 아끼고 불안정을 수습하는 데 1시간을 쓴다는 값은 모양을 보이려고 가정한 값이다. 돈은 숫자 없이 기호로만 둔다.
const W = 720;
const H = 304;
const BASE = 190; // 0시간의 높이
const PER_HOUR = 34;
const BAR_W = 84;
const SAVED = 4;
const FIX = 1;
const OP_W = 30;
const BOX_H = 34;
const BOX_Y = 248;
const yOf = (h: number) => BASE - h * PER_HOUR;
// ponytail: 글자 폭 어림은 figure.tsx 의 textWidth 와 같다(한글 1em, 영숫자 0.6em).
const textWidth = (s: string, size: number) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? size * 0.6 : size), 0);
const TERMS = [
	{ label: "인원", tone: "box" },
	{ label: "1인당 총인건비", tone: "box" },
	{ label: "1인당 순절약시간", tone: "green" },
	{ label: "피한 비용", tone: "result" },
] as const;
const OPS = ["×", "×", "="];
const widths = TERMS.map((t) => textWidth(t.label, 14) + 28);
const total = widths.reduce((a, b) => a + b, 0) + OPS.length * OP_W;
const lefts = widths.map((_, i) => (W - total) / 2 + widths.slice(0, i).reduce((a, b) => a + b, 0) + i * OP_W);
const NET_X = lefts[2] + widths[2] / 2; // 순절약시간 막대를 식의 같은 칸 위에 둔다
const BARS = [
	{ cx: NET_X - 300, top: SAVED, bottom: 0, tone: "blue", value: `주 ${SAVED}시간`, label: "1인당 아낀 시간" },
	{ cx: NET_X - 150, top: SAVED, bottom: SAVED - FIX, tone: "red", value: `${FIX}시간을 뺀다`, label: "불안정을 수습한 시간" },
	{ cx: NET_X, top: SAVED - FIX, bottom: 0, tone: "green", value: `주 ${SAVED - FIX}시간`, label: "1인당 순절약시간" },
] as const;
const ARIA =
	"DORA의 피한 비용 식. 한 사람이 주에 4시간을 아끼고 AI 때문에 늘어난 불안정을 수습하는 데 1시간을 쓴다고 가정하면 순절약시간은 주 3시간이다. 피한 비용은 인원, 1인당 총인건비, 1인당 순절약시간을 곱해 구한다.";

export default function AvoidedCostFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<line x1={BARS[0].cx - BAR_W} y1={BASE} x2={NET_X + BAR_W} y2={BASE} className="fg-axis" strokeWidth={1.5} />

			{/* 막대 사이를 잇는 점선 */}
			<line x1={BARS[0].cx + BAR_W / 2} y1={yOf(SAVED)} x2={BARS[1].cx - BAR_W / 2} y2={yOf(SAVED)} className="fg-sub-line" strokeWidth={1} strokeDasharray="4 3" />
			<line x1={BARS[1].cx + BAR_W / 2} y1={yOf(SAVED - FIX)} x2={BARS[2].cx - BAR_W / 2} y2={yOf(SAVED - FIX)} className="fg-sub-line" strokeWidth={1} strokeDasharray="4 3" />

			{BARS.map((b) => (
				<g key={b.label}>
					<rect x={b.cx - BAR_W / 2} y={yOf(b.top)} width={BAR_W} height={(b.top - b.bottom) * PER_HOUR} rx={4} className={`fg-${b.tone}-fill fg-${b.tone}`} strokeWidth={1.5} />
					<text x={b.cx} y={yOf(b.top) - 10} textAnchor="middle" className={`fg-${b.tone}-ink`} fontSize={14} fontWeight={700}>
						{b.value}
					</text>
					<text x={b.cx} y={BASE + 20} textAnchor="middle" className="fg-text" fontSize={13}>
						{b.label}
					</text>
				</g>
			))}

			{/* 순절약시간이 식의 한 칸으로 들어간다 */}
			<line x1={NET_X} y1={BASE + 28} x2={NET_X} y2={BOX_Y - 8} className="fg-green" strokeWidth={1.5} strokeDasharray="4 3" />
			<path d={`M ${NET_X - 5} ${BOX_Y - 9} L ${NET_X} ${BOX_Y - 2} L ${NET_X + 5} ${BOX_Y - 9} Z`} className="fg-green-ink" />

			{TERMS.map((t, i) => (
				<g key={t.label}>
					<rect
						x={lefts[i]}
						y={BOX_Y}
						width={widths[i]}
						height={BOX_H}
						rx={8}
						className={t.tone === "green" ? "fg-green-fill fg-green" : "fg-box"}
						strokeWidth={t.tone === "box" ? 1 : 1.5}
					/>
					<text
						x={lefts[i] + widths[i] / 2}
						y={BOX_Y + 22}
						textAnchor="middle"
						className={t.tone === "green" ? "fg-green-ink" : "fg-text"}
						fontSize={14}
						fontWeight={t.tone === "box" ? 400 : 700}
					>
						{t.label}
					</text>
					{i < OPS.length && (
						<text x={lefts[i] + widths[i] + OP_W / 2} y={BOX_Y + 23} textAnchor="middle" className="fg-sub" fontSize={15} fontWeight={700}>
							{OPS[i]}
						</text>
					)}
				</g>
			))}
		</svg>
	);
}

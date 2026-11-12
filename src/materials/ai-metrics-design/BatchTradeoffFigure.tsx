import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// 요청 하나를 혼자 처리할 때와 4개를 묶어 처리할 때, 같은 시간 동안 토큰이 나오는 모습을 비교하는 그림.
// 묶으면 한 단계가 1에서 1.5로 길어진다는 값은 모양을 보이려고 가정한 값이다.
// 시간선이 왼쪽에서 오른쪽으로 지나가며 단계가 끝날 때마다 토큰이 나타난다. 움직임 줄이기 설정에서는 다 나온 모습으로 멈춘다.
const W = 720;
const H = 348;
const X0 = 196;
const UNIT = 82; // 시간 1의 폭
const SPAN = 6; // 그림에 담는 시간
const XEND = X0 + UNIT * SPAN;
const LOOP = 7.5; // 초. 6초 동안 흐르고 1.5초 멈춘다
const ROW_H = 24;
const ROW_GAP = 4;
const LANES = [
	{ name: "한가할 때", sub: "요청 1개를 혼자 처리", step: 1, rows: 1, top: 40 },
	{ name: "바쁠 때", sub: "요청 4개를 묶어 처리", step: 1.5, rows: 4, top: 150 },
] as const;

const xOf = (t: number) => X0 + t * UNIT;
const pct = (t: number) => Number(((t / LOOP) * 100).toFixed(2));
const key = (t: number) => `bt-t${Math.round(t * 10)}`;
const stepEnds = (step: number) => Array.from({ length: SPAN / step }, (_, i) => (i + 1) * step);
const times = [...new Set(LANES.flatMap((l) => stepEnds(l.step)))];

const ANIM = `
	.bt-cursor { animation: bt-cursor ${LOOP}s linear infinite; }
	@keyframes bt-cursor { 0% { transform: translateX(0); } ${pct(SPAN)}%, 100% { transform: translateX(${SPAN * UNIT}px); } }
	${times.map((t) => `@keyframes ${key(t)} { 0%, ${(pct(t) - 0.1).toFixed(2)}% { opacity: 0; } ${pct(t)}%, 100% { opacity: 1; } }`).join("\n\t")}
	@media (prefers-reduced-motion: reduce) { .bt-tok { animation: none !important; } .bt-cursor { display: none; } }
`;
const ARIA =
	"요청 하나를 혼자 처리할 때와 4개를 묶어 처리할 때를 같은 시간으로 비교한 그림. 혼자 처리하면 한 단계에 토큰 하나가 나와 같은 시간에 토큰 6개가 나온다. 4개를 묶으면 한 단계가 1.5배로 길어져 요청마다 토큰이 늦게 나오지만, 한 단계에 토큰 4개가 나와 같은 시간에 16개가 나온다.";

function Bracket({ x1, x2, y }: { x1: number; x2: number; y: number }) {
	return (
		<g className="fg-amber" strokeWidth={1.5}>
			<line x1={x1} y1={y} x2={x2} y2={y} />
			<line x1={x1} y1={y - 6} x2={x1} y2={y + 6} />
			<line x1={x2} y1={y - 6} x2={x2} y2={y + 6} />
		</g>
	);
}

export default function BatchTradeoffFigure() {
	const bottoms = LANES.map((l) => l.top + l.rows * (ROW_H + ROW_GAP) - ROW_GAP);
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE + ANIM}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<line x1={24} y1={130} x2={W - 24} y2={130} className="fg-frame" />

			{LANES.map((l, i) => (
				<g key={l.name}>
					<text x={24} y={l.top + 16} className="fg-text" fontSize={15} fontWeight={700}>
						{l.name}
					</text>
					<text x={24} y={l.top + 36} className="fg-sub" fontSize={12.5}>
						{l.sub}
					</text>
					<text x={24} y={l.top + 58} className="fg-blue-ink" fontSize={13} fontWeight={700}>
						같은 시간에 토큰 {stepEnds(l.step).length * l.rows}개
					</text>
					{/* 한 단계가 끝나면 묶인 요청마다 토큰이 하나씩 동시에 나온다 */}
					{stepEnds(l.step).map((t) =>
						Array.from({ length: l.rows }, (_, r) => (
							<rect
								key={`${t}-${r}`}
								x={xOf(t - l.step) + 3}
								y={l.top + r * (ROW_H + ROW_GAP)}
								width={l.step * UNIT - 6}
								height={ROW_H}
								rx={5}
								className="bt-tok fg-blue-fill fg-blue"
								strokeWidth={1.5}
								style={{ animation: `${key(t)} ${LOOP}s linear infinite` }}
							/>
						)),
					)}
					<Bracket x1={xOf(l.step)} x2={xOf(2 * l.step)} y={bottoms[i] + 14} />
				</g>
			))}

			{/* 시간축과 지나가는 시간선. 이름표가 선을 덮도록 이름표보다 먼저 그린다 */}
			<line x1={X0} y1={318} x2={XEND + 12} y2={318} className="fg-axis" strokeWidth={1.5} />
			<path d={`M ${XEND + 12} 313 L ${XEND + 20} 318 L ${XEND + 12} 323 Z`} className="fg-head" />
			<text x={XEND + 20} y={338} textAnchor="end" className="fg-sub" fontSize={13}>
				시간
			</text>
			<line x1={X0} y1={32} x2={X0} y2={262} className="bt-cursor fg-sub-line" strokeWidth={1.5} />

			{LANES.map((l, i) => (
				<Pill key={l.name} cx={xOf(1.5 * l.step)} cy={bottoms[i] + 38} label="토큰당 시간" tone="amber" maxX={W} />
			))}
		</svg>
	);
}

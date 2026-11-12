import { FIG_STYLE, type Tone } from "@/materials/monitoring-design/figure";

// HEART 논문의 목표, 신호, 지표 세 단계를 본문의 주문 서비스 예로 채운 정적 그림. 가정값은 없다.
const W = 720;
const H = 220;
const BOX_W = 200;
const BOX_Y = 28;
const BOX_H = 164;
const XS = [24, 260, 496];
const STEPS: readonly { name: string; ask: string; lines: readonly string[]; note?: string; tone: Tone }[] = [
	{ name: "목표", ask: "무엇을 이루려 하나", lines: ["주문을 쉽게", "끝내게 한다"], tone: "blue" },
	{ name: "신호", ask: "행동에 무엇이 드러나나", lines: ["주문을 시작했다가", "끝내지 못하고 떠난다"], note: "성공보다 실패가 찾기 쉽다", tone: "amber" },
	{ name: "지표", ask: "대시보드에서 볼 숫자", lines: ["시작한 주문 가운데", "끝난 주문의 비율"], tone: "green" },
];
const ARIA =
	"목표, 신호, 지표 세 단계를 주문 서비스 예로 채운 그림. 목표는 주문을 쉽게 끝내게 하는 것이고, 신호는 주문을 시작했다가 끝내지 못하고 떠나는 행동이다. 이 경우 성공보다 실패가 찾기 쉽다. 지표는 시작한 주문 가운데 끝난 주문의 비율이다.";

export default function GoalSignalMetricFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{STEPS.map((s, i) => {
				const x = XS[i];
				const cx = x + BOX_W / 2;
				return (
					<g key={s.name}>
						<rect x={x} y={BOX_Y} width={BOX_W} height={BOX_H} rx={10} className="fg-box" />
						<rect x={x} y={BOX_Y} width={BOX_W} height={5} rx={2} className={`fg-${s.tone}-ink`} />
						<text x={cx} y={BOX_Y + 34} textAnchor="middle" className={`fg-${s.tone}-ink`} fontSize={15} fontWeight={700}>
							{i + 1}. {s.name}
						</text>
						<text x={cx} y={BOX_Y + 56} textAnchor="middle" className="fg-sub" fontSize={12.5}>
							{s.ask}
						</text>
						<line x1={x + 16} y1={BOX_Y + 72} x2={x + BOX_W - 16} y2={BOX_Y + 72} className="fg-axis" />
						{s.lines.map((l, k) => (
							<text key={l} x={cx} y={BOX_Y + 100 + k * 22} textAnchor="middle" className="fg-text" fontSize={14} fontWeight={600}>
								{l}
							</text>
						))}
						{s.note ? (
							<text x={cx} y={BOX_Y + 150} textAnchor="middle" className={`fg-${s.tone}-ink`} fontSize={12.5}>
								{s.note}
							</text>
						) : null}
						{i < STEPS.length - 1 ? (
							<g>
								<line x1={x + BOX_W + 8} y1={BOX_Y + BOX_H / 2} x2={XS[i + 1] - 14} y2={BOX_Y + BOX_H / 2} className="fg-arrow" strokeWidth={2} />
								<path d={`M ${XS[i + 1] - 16} ${BOX_Y + BOX_H / 2 - 6} L ${XS[i + 1] - 6} ${BOX_Y + BOX_H / 2} L ${XS[i + 1] - 16} ${BOX_Y + BOX_H / 2 + 6} Z`} className="fg-head" />
							</g>
						) : null}
					</g>
				);
			})}
		</svg>
	);
}

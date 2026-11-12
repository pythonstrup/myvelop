import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// DX가 권하는 활용, 영향, 비용의 세 축에 이 장의 지표를 나눠 담은 정적 그림.
// 어느 지표를 어느 축에 두는지는 글쓴이의 해석이다. 아래 띠는 DX의 경고다.
const W = 720;
const PAD = 24;
const GAP = 16;
const COL_W = (W - PAD * 2 - GAP * 2) / 3;
const COL_TOP = 20;
const COL_H = 178;
const ITEM_H = 34;
const COLS = [
	{ name: "활용", sub: "얼마나 쓰는가", tone: "blue", items: ["사용자 수", "에이전트에 맡긴 일"] },
	{ name: "영향", sub: "일이 나아졌는가", tone: "green", items: ["실제로 잰 시간", "배포 성과"] },
	{ name: "비용", sub: "얼마나 드는가", tone: "amber", items: ["성공한 결과당 비용"] },
] as const;
const BAND_Y = COL_TOP + COL_H + 16;
const BAND_H = 40;
const H = BAND_Y + BAND_H + 20;
const ARIA =
	"조직의 AI 대시보드를 활용, 영향, 비용 세 축으로 나눈 그림. 활용에는 사용자 수와 에이전트에 맡긴 일을, 영향에는 실제로 잰 시간과 배포 성과를, 비용에는 성공한 결과당 비용을 둔다. 이 배치는 글쓴이의 해석이다. DX는 이 지표를 위에서 내려온 사용 지시의 근거나 개인 평가에 쓰지 말라고 경고한다.";

export default function ThreeAxesFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{COLS.map((c, i) => {
				const x = PAD + i * (COL_W + GAP);
				return (
					<g key={c.name}>
						<rect x={x} y={COL_TOP} width={COL_W} height={COL_H} rx={10} className="fg-box" />
						<rect x={x} y={COL_TOP} width={COL_W} height={6} rx={3} className={`fg-${c.tone}-ink`} />
						<text x={x + COL_W / 2} y={COL_TOP + 36} textAnchor="middle" className={`fg-${c.tone}-ink`} fontSize={15} fontWeight={700}>
							{c.name}
						</text>
						<text x={x + COL_W / 2} y={COL_TOP + 56} textAnchor="middle" className="fg-sub" fontSize={12.5}>
							{c.sub}
						</text>
						{c.items.map((item, j) => {
							const y = COL_TOP + 74 + j * (ITEM_H + 10);
							return (
								<g key={item}>
									<rect x={x + 16} y={y} width={COL_W - 32} height={ITEM_H} rx={8} className={`fg-${c.tone}-fill fg-${c.tone}`} strokeWidth={1.5} />
									<text x={x + COL_W / 2} y={y + 22} textAnchor="middle" className="fg-text" fontSize={14}>
										{item}
									</text>
								</g>
							);
						})}
					</g>
				);
			})}
			<rect x={PAD} y={BAND_Y} width={W - PAD * 2} height={BAND_H} rx={8} className="fg-red-fill fg-red" strokeWidth={1.5} />
			<text x={W / 2} y={BAND_Y + 25} textAnchor="middle" fontSize={14}>
				<tspan className="fg-red-ink" fontWeight={700}>
					DX의 경고
				</tspan>
				<tspan className="fg-text" dx={10}>
					위에서 내려온 사용 지시의 근거나 개인 평가에 쓰지 않는다
				</tspan>
			</text>
		</svg>
	);
}

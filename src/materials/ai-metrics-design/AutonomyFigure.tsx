import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// Anthropic이 코딩 에이전트 사용자에게서 잰 두 비율을 숙련도에 따라 나란히 놓은 정적 그림.
// 두 묶음은 비교하는 사용자 집단이 다르다. 자동 승인은 처음 쓰는 사용자와 750세션쯤 쓴 사용자,
// 끼어든 비율은 세션 10번쯤 쓴 사용자와 숙련된 사용자다. 「40% 넘게」는 막대를 40%까지 그리고 점선으로 이었다.
const W = 720;
const LABEL_X = 226; // 행 이름의 오른쪽 끝
const BAR_X = 242;
const PER = 8; // 1%당 px
const ROW = 32;
const GROUPS = [
	{
		title: "모든 실행을 자동 승인한 세션의 비율",
		top: 22,
		rows: [
			{ label: "처음 쓰는 사용자", pct: 20, more: false, text: "약 20%", tone: "gray" },
			{ label: "750세션쯤 쓴 사용자", pct: 40, more: true, text: "40% 넘게", tone: "blue" },
		],
	},
	{
		title: "사람이 끼어든 턴의 비율",
		top: 128,
		rows: [
			{ label: "세션 10번쯤 쓴 사용자", pct: 5, more: false, text: "5%", tone: "gray" },
			{ label: "숙련된 사용자", pct: 9, more: false, text: "9%", tone: "blue" },
		],
	},
] as const;
const H = 266;
const ARIA =
	"코딩 에이전트 사용자의 숙련도에 따른 두 비율. 모든 실행을 자동 승인한 세션의 비율은 처음 쓰는 사용자가 약 20%, 750세션쯤 쓴 사용자가 40% 넘게였다. 사람이 끼어든 턴의 비율은 세션 10번쯤 쓴 사용자가 5%, 숙련된 사용자가 9%였다. 두 비율 모두 숙련된 쪽이 높다.";

export default function AutonomyFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{GROUPS.map((g) => (
				<g key={g.title}>
					<text x={24} y={g.top + 16} className="fg-text" fontSize={14} fontWeight={700}>
						{g.title}
					</text>
					<line x1={BAR_X} y1={g.top + 28} x2={BAR_X} y2={g.top + 28 + g.rows.length * ROW} className="fg-axis" strokeWidth={1.5} />
					{g.rows.map((r, i) => {
						const y = g.top + 28 + i * ROW + ROW / 2;
						const end = BAR_X + r.pct * PER;
						const textX = end + (r.more ? 40 : 10);
						return (
							<g key={r.label}>
								<text x={LABEL_X} y={y + 5} textAnchor="end" className="fg-text" fontSize={13.5}>
									{r.label}
								</text>
								<rect x={BAR_X} y={y - 11} width={r.pct * PER} height={22} rx={4} className={`fg-${r.tone}-fill fg-${r.tone}`} strokeWidth={1.5} />
								{r.more && <line x1={end + 4} y1={y} x2={end + 30} y2={y} className={`fg-${r.tone}`} strokeWidth={2} strokeDasharray="4 3" />}
								<text x={textX} y={y + 5} className={`fg-${r.tone}-ink`} fontSize={14} fontWeight={700}>
									{r.text}
								</text>
							</g>
						);
					})}
				</g>
			))}
			<text x={W / 2} y={H - 18} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				두 비율 모두 숙련된 사용자 쪽이 높다
			</text>
		</svg>
	);
}

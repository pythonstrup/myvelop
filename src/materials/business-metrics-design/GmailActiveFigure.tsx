import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// Gmail 사례의 두 지표를 사용자 다섯 명의 일주일 기록으로 견주는 정적 그림.
// 누가 어느 날 들어왔는지는 가정이다. 다섯 명 모두 7일 활성이지만 5일 이상 들어온 사람은 두 명이다.
const W = 720;
const H = 316;
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const USERS = [
	{ name: "사용자 A", visits: [1, 1, 1, 1, 1, 1, 1] },
	{ name: "사용자 B", visits: [1, 1, 1, 1, 1, 0, 0] },
	{ name: "사용자 C", visits: [1, 0, 1, 0, 0, 1, 0] },
	{ name: "사용자 D", visits: [0, 1, 0, 0, 1, 0, 0] },
	{ name: "사용자 E", visits: [0, 0, 0, 1, 0, 0, 0] },
] as const;
const GX = 132; // 첫 날 칸의 왼쪽
const CW = 44;
const CH = 28;
const GAP = 6;
const TOP = 68;
const ROW = CH + 8;
const COL_DAYS = GX + DAYS.length * (CW + GAP) + 14;
const COL_ACTIVE = 566;
const COL_FIVE = 664;
const ARIA =
	"사용자 다섯 명이 지난주에 들어온 날을 칸으로 그린 그림. 다섯 명 모두 한 번 이상 들어와서 7일 활성 사용자는 5명이다. 그 가운데 5일 이상 들어온 사람은 날마다 들어온 A와 평일마다 들어온 B 두 명뿐이라, Gmail 팀이 고른 지표로는 40%다.";

function Check({ x, y }: { x: number; y: number }) {
	return <polyline points={`${x - 7},${y} ${x - 2},${y + 5} ${x + 8},${y - 6}`} fill="none" className="fg-green" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />;
}

function Dash({ x, y }: { x: number; y: number }) {
	return <line x1={x - 6} y1={y} x2={x + 6} y2={y} className="fg-gray" strokeWidth={2} strokeLinecap="round" />;
}

export default function GmailActiveFigure() {
	const fiveCount = USERS.filter((u) => u.visits.reduce<number>((a, b) => a + b, 0) >= 5).length;
	const lineY = TOP + USERS.length * ROW + 4;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 머리줄 */}
			<text x={GX} y={30} className="fg-sub" fontSize={12.5}>
				지난주에 들어온 날
			</text>
			{DAYS.map((d, i) => (
				<text key={d} x={GX + i * (CW + GAP) + CW / 2} y={56} textAnchor="middle" className="fg-sub" fontSize={12.5}>
					{d}
				</text>
			))}
			<text x={COL_DAYS} y={56} className="fg-sub" fontSize={12.5}>
				일수
			</text>
			<text x={COL_ACTIVE} y={34} textAnchor="middle" className="fg-text" fontSize={14} fontWeight={700}>
				7일 활성
			</text>
			<text x={COL_ACTIVE} y={54} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				한 번이라도
			</text>
			<text x={COL_FIVE} y={34} textAnchor="middle" className="fg-blue-ink" fontSize={14} fontWeight={700}>
				5일 이상
			</text>
			<text x={COL_FIVE} y={54} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				Gmail의 지표
			</text>

			{USERS.map((u, r) => {
				const y = TOP + r * ROW;
				const days = u.visits.reduce<number>((a, b) => a + b, 0);
				return (
					<g key={u.name}>
						<text x={24} y={y + CH / 2 + 5} className="fg-text" fontSize={13.5}>
							{u.name}
						</text>
						{u.visits.map((v, i) => (
							<g key={DAYS[i]}>
								<rect x={GX + i * (CW + GAP)} y={y} width={CW} height={CH} rx={5} className={v ? "fg-blue-fill fg-blue" : "fg-gray-fill fg-gray"} strokeWidth={v ? 1.5 : 1} />
								{v ? <circle cx={GX + i * (CW + GAP) + CW / 2} cy={y + CH / 2} r={5} className="fg-blue-ink" /> : null}
							</g>
						))}
						<text x={COL_DAYS} y={y + CH / 2 + 5} className="fg-sub" fontSize={13}>
							{days}일
						</text>
						<Check x={COL_ACTIVE} y={y + CH / 2} />
						{days >= 5 ? <Check x={COL_FIVE} y={y + CH / 2} /> : <Dash x={COL_FIVE} y={y + CH / 2} />}
					</g>
				);
			})}

			<line x1={COL_ACTIVE - 44} y1={lineY} x2={COL_FIVE + 50} y2={lineY} className="fg-axis" />
			<text x={COL_ACTIVE} y={lineY + 24} textAnchor="middle" className="fg-text" fontSize={14} fontWeight={700}>
				{USERS.length}명
			</text>
			<text x={COL_FIVE} y={lineY + 24} textAnchor="middle" className="fg-blue-ink" fontSize={14} fontWeight={700}>
				{fiveCount}명
			</text>
			<text x={COL_FIVE} y={lineY + 44} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				활성의 {Math.round((fiveCount / USERS.length) * 100)}%
			</text>
		</svg>
	);
}

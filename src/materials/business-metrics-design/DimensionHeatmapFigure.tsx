import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// 전체 지표의 작은 하락을 국가 × 기기로 쪼개 어디서 떨어졌는지 찾는 정적 그림(LinkedIn ThirdEye의 예를 본뜸).
// 칸의 변화율과 전체 −3%는 모양을 보이려고 정한 가정값이다. 미국은 본문의 예에서 왔고, 나머지 나라는 예시로 고른 것이다.
const W = 720;
const H = 330;
const DEVICES = ["데스크톱", "모바일 웹", "앱"] as const;
const ROWS = [
	{ country: "미국", deltas: [-11, -14, -12] },
	{ country: "인도", deltas: [1, -1, 0] },
	{ country: "브라질", deltas: [-2, 1, 2] },
	{ country: "영국", deltas: [0, -1, 1] },
] as const;
const STRONG = -10; // 이보다 크게 떨어진 칸을 진하게 칠한다
const CX = 150; // 첫 칸의 왼쪽
const CW = 128;
const CH = 34;
const GAP = 8;
const RY = 124; // 첫 줄의 위
const RIGHT = CX + DEVICES.length * CW + (DEVICES.length - 1) * GAP;
const ARIA =
	"전체 조회 수가 기준선보다 3% 떨어진 것을 국가와 기기로 쪼갠 히트맵. 인도, 브라질, 영국의 칸은 기준선과 2% 안팎으로 비슷하고, 미국 줄만 데스크톱 11%, 모바일 웹 14%, 앱 12%씩 떨어져 진하게 드러난다.";

const fmt = (d: number) => (d > 0 ? `+${d}%` : d < 0 ? `−${-d}%` : "0%");

export default function DimensionHeatmapFigure() {
	const mid = (CX + RIGHT) / 2;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 전체 지표 */}
			<text x={24} y={45} className="fg-text" fontSize={15} fontWeight={700}>
				전체 조회 수
			</text>
			<Pill cx={190} cy={40} label="기준선보다 −3%" tone="amber" maxX={W} />
			<text x={274} y={45} className="fg-sub" fontSize={12.5}>
				작은 변화라 어디서 떨어졌는지는 보이지 않는다
			</text>

			{/* 쪼개기 */}
			<line x1={mid} y1={60} x2={mid} y2={82} className="fg-arrow" strokeWidth={1.5} />
			<path d={`M ${mid - 5} ${82} L ${mid} ${89} L ${mid + 5} ${82} Z`} className="fg-head" />
			<text x={mid + 14} y={79} className="fg-sub" fontSize={12.5}>
				국가 × 기기로 쪼갠다
			</text>

			{/* 히트맵 */}
			{DEVICES.map((d, j) => (
				<text key={d} x={CX + j * (CW + GAP) + CW / 2} y={RY - 10} textAnchor="middle" className="fg-sub" fontSize={12.5}>
					{d}
				</text>
			))}
			{ROWS.map((r, i) => {
				const y = RY + i * (CH + GAP);
				return (
					<g key={r.country}>
						<text x={24} y={y + 22} className="fg-text" fontSize={14}>
							{r.country}
						</text>
						{r.deltas.map((d, j) => {
							const strong = d <= STRONG;
							return (
								<g key={DEVICES[j]}>
									<rect x={CX + j * (CW + GAP)} y={y} width={CW} height={CH} rx={6} className={strong ? "fg-red-fill fg-red" : "fg-gray-fill fg-gray"} strokeWidth={strong ? 1.5 : 1} />
									<text x={CX + j * (CW + GAP) + CW / 2} y={y + 22} textAnchor="middle" className={strong ? "fg-red-ink" : "fg-text"} fontSize={14} fontWeight={strong ? 700 : 400}>
										{fmt(d)}
									</text>
								</g>
							);
						})}
					</g>
				);
			})}

			{/* 미국 줄 강조 */}
			<rect x={CX - 6} y={RY - 4} width={RIGHT - CX + 12} height={CH + 8} rx={9} fill="none" className="fg-red" strokeWidth={1.5} />
			<text x={RIGHT + 20} y={RY + 13} className="fg-red-ink" fontSize={13.5} fontWeight={700}>
				미국 줄만
			</text>
			<text x={RIGHT + 20} y={RY + 31} className="fg-red-ink" fontSize={13.5} fontWeight={700}>
				크게 떨어졌다
			</text>

			<text x={CX} y={H - 18} className="fg-sub" fontSize={12.5}>
				칸의 숫자는 여러 주의 기준선과 비교한 변화율이다
			</text>
		</svg>
	);
}

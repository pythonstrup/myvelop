import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// DORA 2024 보고서에서 AI 도입이 25% 늘 때 추정된 변화를 0을 가운데 둔 양방향 막대로 그린 정적 그림.
// 위 묶음은 개발 과정, 아래 묶음은 배포의 지표다. 오른쪽이 좋아짐, 왼쪽이 나빠짐이다.
const W = 720;
const LABEL_X = 196; // 행 이름의 오른쪽 끝
const ZERO = 420;
const PER = 22; // 1%p 당 px
const ROW = 38;
const GROUPS = [
	{
		name: "개발 과정",
		rows: [
			{ label: "문서 품질", pct: 7.5 },
			{ label: "코드 품질", pct: 3.4 },
			{ label: "코드 리뷰 속도", pct: 3.1 },
		],
	},
	{
		name: "배포",
		rows: [
			{ label: "배포 처리량", pct: -1.5 },
			{ label: "배포 안정성", pct: -7.2 },
		],
	},
] as const;
const TOP = 46;
const GROUP_GAP = 30;
// 묶음 이름 한 줄 + 행들을 차례로 쌓는다
const layout = GROUPS.map((g, gi) => {
	const before = GROUPS.slice(0, gi).reduce((y, p) => y + GROUP_GAP + p.rows.length * ROW, 0);
	return { ...g, headY: TOP + before, rowY: (ri: number) => TOP + before + 12 + ri * ROW + ROW / 2 };
});
const last = layout[layout.length - 1];
const AXIS_Y = last.rowY(last.rows.length - 1) + ROW / 2 + 4;
const H = AXIS_Y + 34;
const fmt = (p: number) => `${p > 0 ? "+" : "−"}${Math.abs(p)}%`;
const ARIA =
	"DORA 2024 보고서의 추정. AI 도입이 25% 늘 때 개발 과정에서는 문서 품질이 7.5%, 코드 품질이 3.4%, 코드 리뷰 속도가 3.1% 좋아진다. 같은 조건에서 배포 처리량은 1.5%, 배포 안정성은 7.2% 떨어진다.";

export default function Dora2024Figure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<text x={24} y={28} className="fg-sub" fontSize={13}>
				AI 도입이 25% 늘 때 추정한 변화
			</text>
			<line x1={ZERO} y1={TOP - 6} x2={ZERO} y2={AXIS_Y} className="fg-axis" strokeWidth={1.5} />
			{layout.map((g) => (
				<g key={g.name}>
					<text x={24} y={g.headY + 6} className="fg-text" fontSize={14} fontWeight={700}>
						{g.name}
					</text>
					{g.rows.map((r, ri) => {
						const y = g.rowY(ri);
						const end = ZERO + r.pct * PER;
						const tone = r.pct > 0 ? "blue" : "red";
						return (
							<g key={r.label}>
								<text x={LABEL_X} y={y + 5} textAnchor="end" className="fg-text" fontSize={14}>
									{r.label}
								</text>
								<rect x={Math.min(ZERO, end)} y={y - 11} width={Math.abs(r.pct) * PER} height={22} rx={4} className={`fg-${tone}-fill fg-${tone}`} strokeWidth={1.5} />
								<text x={r.pct > 0 ? end + 8 : end - 8} y={y + 5} textAnchor={r.pct > 0 ? "start" : "end"} className={`fg-${tone}-ink`} fontSize={14} fontWeight={700}>
									{fmt(r.pct)}
								</text>
							</g>
						);
					})}
				</g>
			))}
			<text x={ZERO - 14} y={AXIS_Y + 20} textAnchor="end" className="fg-sub" fontSize={12.5}>
				← 나빠짐
			</text>
			<text x={ZERO} y={AXIS_Y + 20} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				0
			</text>
			<text x={ZERO + 14} y={AXIS_Y + 20} className="fg-sub" fontSize={12.5}>
				좋아짐 →
			</text>
		</svg>
	);
}

import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// 여러 AI 기능이 같은 지표 이름과 같은 속성으로 내보내면 패널 하나에서 모델별로 모아 볼 수 있다는 그림.
// 기능 셋(요약, 검색, 상담)과 막대 길이는 모양을 보이려고 가정한 값이다.
// 속성 이름은 본문 표의 규약 속성이고, 호출한 기능은 규약에 없어 직접 붙인다.
const W = 720;
const H = 272;
const FEATURES = ["요약 기능", "검색 기능", "상담 기능"] as const;
const FEAT_X = 24;
const FEAT_W = 128;
const FEAT_H = 40;
const featY = (i: number) => 56 + i * 60;
const CARD_X = 208;
const CARD_W = 260;
const ATTRS = ["gen_ai.operation.name", "gen_ai.provider.name", "gen_ai.request.model"] as const;
const PANEL_X = 522;
const PANEL_W = 174;
const PANELS = [
	{ title: "모델별 지연", tone: "blue", y: 40, bars: [70, 46, 92] },
	{ title: "모델별 비용", tone: "green", y: 144, bars: [40, 84, 58] },
] as const;
const ARIA =
	"요약, 검색, 상담 세 기능이 지연 히스토그램과 토큰 카운터를 같은 이름으로 내보내고 gen_ai.operation.name, gen_ai.provider.name, gen_ai.request.model 같은 같은 속성을 붙인다. 그러면 패널 하나에서 모델별 지연과 비용을 모아 볼 수 있다. 호출한 기능을 나타내는 속성은 규약에 없어 직접 붙인다.";

function Arrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
	return (
		<g>
			<line x1={x1} y1={y} x2={x2 - 7} y2={y} className="fg-arrow" strokeWidth={1.5} />
			<path d={`M ${x2 - 8} ${y - 5} L ${x2} ${y} L ${x2 - 8} ${y + 5} Z`} className="fg-head" />
		</g>
	);
}

export default function ConventionFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 왼쪽: 지표를 내보내는 기능들 */}
			<text x={FEAT_X + FEAT_W / 2} y={42} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				AI 기능
			</text>
			{FEATURES.map((f, i) => (
				<g key={f}>
					<rect x={FEAT_X} y={featY(i)} width={FEAT_W} height={FEAT_H} rx={8} className="fg-box" />
					<text x={FEAT_X + FEAT_W / 2} y={featY(i) + 25} textAnchor="middle" className="fg-text" fontSize={13.5}>
						{f}
					</text>
					<Arrow x1={FEAT_X + FEAT_W} x2={CARD_X} y={featY(i) + FEAT_H / 2} />
				</g>
			))}

			{/* 가운데: 모두가 따르는 이름과 속성 */}
			<rect x={CARD_X} y={24} width={CARD_W} height={224} rx={10} className="fg-blue-fill fg-blue" strokeWidth={1.5} />
			<text x={CARD_X + 18} y={48} className="fg-sub" fontSize={12.5}>
				같은 이름
			</text>
			<text x={CARD_X + 18} y={70} className="fg-blue-ink" fontSize={14} fontWeight={700}>
				지연 히스토그램
			</text>
			<text x={CARD_X + 18} y={92} className="fg-blue-ink" fontSize={14} fontWeight={700}>
				토큰 카운터
			</text>
			<line x1={CARD_X + 12} y1={106} x2={CARD_X + CARD_W - 12} y2={106} className="fg-blue" strokeWidth={1} />
			<text x={CARD_X + 18} y={126} className="fg-sub" fontSize={12.5}>
				같은 속성
			</text>
			{ATTRS.map((a, i) => (
				<text key={a} x={CARD_X + 18} y={148 + i * 20} className="fg-text" fontSize={13}>
					{a}
				</text>
			))}
			<rect x={CARD_X + 12} y={198} width={CARD_W - 24} height={42} rx={6} className="fg-bg" />
			<rect x={CARD_X + 12} y={198} width={CARD_W - 24} height={42} rx={6} className="fg-amber-fill fg-amber" strokeWidth={1.5} strokeDasharray="4 3" />
			<text x={CARD_X + 24} y={215} className="fg-amber-ink" fontSize={13} fontWeight={700}>
				호출한 기능
			</text>
			<text x={CARD_X + 24} y={233} className="fg-sub" fontSize={12.5}>
				규약에 없어 직접 붙인다
			</text>

			{/* 오른쪽: 패널 하나에 모델별로 모인다 */}
			<Arrow x1={CARD_X + CARD_W} x2={PANEL_X} y={136} />
			<text x={PANEL_X + PANEL_W / 2} y={30} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				패널 하나에 모은다
			</text>
			{PANELS.map((p) => (
				<g key={p.title}>
					<rect x={PANEL_X} y={p.y} width={PANEL_W} height={88} rx={8} className="fg-box" />
					<text x={PANEL_X + 14} y={p.y + 22} className="fg-text" fontSize={13} fontWeight={700}>
						{p.title}
					</text>
					{p.bars.map((b, i) => (
						<g key={i}>
							<text x={PANEL_X + 14} y={p.y + 44 + i * 16} className="fg-sub" fontSize={12.5}>
								모델 {i + 1}
							</text>
							<rect x={PANEL_X + 66} y={p.y + 35 + i * 16} width={b} height={10} rx={2} className={`fg-${p.tone}-fill fg-${p.tone}`} strokeWidth={1} />
						</g>
					))}
				</g>
			))}
		</svg>
	);
}

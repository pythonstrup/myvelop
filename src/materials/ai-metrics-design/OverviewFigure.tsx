import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// 이 글의 구조도. 네 층을 위에서부터 쌓고, 비용과 품질 사이에 규약을 얇은 띠로, 바깥을 도입 효과로 감싼다.
// 오른쪽의 지표는 각 장에서 다루는 것 가운데 몇 개를 고른 것이다. 숫자는 없다.
const W = 720;
const H = 326;
const IN_X = 48;
const IN_W = 624;
const LAYERS = [
	{ name: "시스템", q: "빨리 응답하는가", m: "첫 토큰까지 시간, 토큰당 시간", y: 66 },
	{ name: "비용", q: "얼마나 드는가", m: "토큰 카운터, 성공한 결과당 비용", y: 116 },
	{ name: "품질", q: "답이 맞는가", m: "판정 모델의 채점, pass^k", y: 202 },
	{ name: "사용자 가치", q: "받아들이는가", m: "사용 단계, 수락률, 유지율", y: 252 },
] as const;
const LAYER_H = 42;
const BAND_Y = 166;
const BAND_H = 28;
const ARIA =
	"이 글의 구조. 시스템, 비용, 품질, 사용자 가치 네 층을 차례로 쌓고, 비용과 품질 사이에 지표를 기능마다 같은 이름으로 내보내는 규약이 있다. 네 층 바깥을 조직이 AI를 들여 일이 나아졌는가를 묻는 도입 효과가 감싼다.";

export default function OverviewFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 바깥: 도입 효과 */}
			<rect x={28} y={16} width={W - 56} height={H - 32} rx={10} className="fg-green-fill fg-green" strokeWidth={1.5} />
			<text x={IN_X} y={46} className="fg-green-ink" fontSize={15} fontWeight={700}>
				도입 효과
			</text>
			<text x={IN_X + 84} y={46} className="fg-sub" fontSize={13}>
				조직이 AI를 들여 일이 나아졌는가
			</text>
			<text x={IN_X + IN_W} y={46} textAnchor="end" className="fg-sub" fontSize={12.5}>
				실제로 잰 시간, 배포 성과, 피한 비용
			</text>

			{/* 네 층. 어두운 테마의 반투명 바탕이 겹쳐 보이지 않게 페이지 바탕색을 먼저 깐다 */}
			{LAYERS.map((l) => (
				<g key={l.name}>
					<rect x={IN_X} y={l.y} width={IN_W} height={LAYER_H} rx={8} className="fg-bg" />
					<rect x={IN_X} y={l.y} width={IN_W} height={LAYER_H} rx={8} className="fg-blue-fill fg-blue" strokeWidth={1.5} />
					<text x={IN_X + 18} y={l.y + 26} className="fg-blue-ink" fontSize={15} fontWeight={700}>
						{l.name}
					</text>
					<text x={IN_X + 124} y={l.y + 26} className="fg-text" fontSize={14}>
						{l.q}
					</text>
					<text x={IN_X + IN_W - 16} y={l.y + 26} textAnchor="end" className="fg-sub" fontSize={12.5}>
						{l.m}
					</text>
				</g>
			))}

			{/* 비용과 품질 사이의 규약 띠 */}
			<rect x={IN_X} y={BAND_Y} width={IN_W} height={BAND_H} rx={6} className="fg-bg" />
			<rect x={IN_X} y={BAND_Y} width={IN_W} height={BAND_H} rx={6} className="fg-amber-fill fg-amber" strokeWidth={1.5} />
			<text x={IN_X + 18} y={BAND_Y + 19} className="fg-amber-ink" fontSize={13.5} fontWeight={700}>
				규약
			</text>
			<text x={IN_X + 124} y={BAND_Y + 19} className="fg-text" fontSize={13}>
				지표를 기능마다 같은 이름으로 내보낸다
			</text>
		</svg>
	);
}

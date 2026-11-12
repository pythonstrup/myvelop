import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// Amazon WBR의 6-12 그래프를 흉내 낸 정적 그림. 왼쪽은 최근 6주, 오른쪽은 지난 12개월이고,
// 흐린 선은 1년 전 같은 지표다. 값은 모양을 보이려고 지어낸 것이다.
const W = 720;
const H = 250;
const TOP = 64;
const BASE = 200;
const LEFT = { x0: 32, x1: 250 };
const RIGHT = { x0: 300, x1: 696 };
const WEEKS = [0.52, 0.56, 0.53, 0.6, 0.62, 0.58];
const WEEKS_LAST_YEAR = [0.44, 0.46, 0.45, 0.49, 0.48, 0.5];
const MONTHS = [0.36, 0.38, 0.41, 0.4, 0.45, 0.47, 0.5, 0.49, 0.53, 0.55, 0.57, 0.58];
const MONTHS_LAST_YEAR = [0.3, 0.31, 0.33, 0.33, 0.36, 0.38, 0.39, 0.4, 0.42, 0.44, 0.45, 0.47];
const ARIA =
	"6-12 그래프 예시. 왼쪽 그래프는 최근 6주의 주별 값을, 오른쪽 그래프는 지난 12개월의 월별 값을 그린다. 두 그래프 모두 뒤에 흐린 선으로 1년 전 같은 지표를 겹쳐 그려, 올해 값이 작년보다 꾸준히 높다는 것을 보여 준다.";

const pts = (ys: readonly number[], x0: number, x1: number) =>
	ys.map((y, i) => `${(x0 + (i / (ys.length - 1)) * (x1 - x0)).toFixed(1)},${(BASE - y * (BASE - TOP) * 1.4).toFixed(1)}`).join(" ");

function Panel({ x0, x1, title, now, past, from, to }: { x0: number; x1: number; title: string; now: readonly number[]; past: readonly number[]; from: string; to: string }) {
	return (
		<g>
			<text x={x0} y={46} className="fg-text" fontSize={15} fontWeight={700}>
				{title}
			</text>
			<line x1={x0} y1={BASE + 0.5} x2={x1} y2={BASE + 0.5} className="fg-axis" />
			<polyline points={pts(past, x0, x1)} fill="none" className="fg-gray" strokeWidth={2.5} opacity={0.7} />
			<polyline points={pts(now, x0, x1)} fill="none" className="fg-blue" strokeWidth={2.5} strokeLinejoin="round" />
			{now.map((y, i) => (
				<circle key={i} cx={x0 + (i / (now.length - 1)) * (x1 - x0)} cy={BASE - y * (BASE - TOP) * 1.4} r={3} className="fg-blue-ink" />
			))}
			<text x={x0} y={BASE + 20} className="fg-sub" fontSize={12}>
				{from}
			</text>
			<text x={x1} y={BASE + 20} textAnchor="end" className="fg-sub" fontSize={12}>
				{to}
			</text>
		</g>
	);
}

export default function SixTwelveFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<Panel x0={LEFT.x0} x1={LEFT.x1} title="최근 6주" now={WEEKS} past={WEEKS_LAST_YEAR} from="6주 전" to="이번 주" />
			<Panel x0={RIGHT.x0} x1={RIGHT.x1} title="지난 12개월" now={MONTHS} past={MONTHS_LAST_YEAR} from="12개월 전" to="이번 달" />
			{/* 범례 */}
			<line x1={W - 190} y1={22} x2={W - 172} y2={22} className="fg-blue" strokeWidth={2.5} />
			<text x={W - 166} y={26} className="fg-sub" fontSize={12}>
				올해
			</text>
			<line x1={W - 120} y1={22} x2={W - 102} y2={22} className="fg-gray" strokeWidth={2.5} opacity={0.7} />
			<text x={W - 96} y={26} className="fg-sub" fontSize={12}>
				1년 전
			</text>
		</svg>
	);
}

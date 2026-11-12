import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// METR의 2025년 초 실험에서 나온 세 숫자를 한 축에 놓은 정적 그림.
// 가로축은 AI를 쓸 수 있을 때 이슈를 끝내는 데 걸린 시간의 변화다. 왼쪽이 빨라짐, 오른쪽이 느려짐이다.
const W = 720;
const ROW = 44;
const TOP = 20;
const LABEL_X = 170; // 행 이름의 오른쪽 끝
const ZERO = 460;
const PER = 7.5; // 1%당 px
const ROWS = [
	{ label: "시작 전 예상", pct: -24, text: "24% 빠르게", tone: "blue" },
	{ label: "끝난 뒤 느낌", pct: -20, text: "20% 빠르게", tone: "blue" },
	{ label: "실제로 걸린 시간", pct: 19, text: "19% 더 걸림", tone: "red" },
] as const;
const AXIS_Y = TOP + ROWS.length * ROW + 6;
const H = AXIS_Y + 32;
const yOf = (i: number) => TOP + i * ROW + ROW / 2;
const ARIA =
	"METR 실험의 세 숫자. 개발자들은 시작 전에 AI가 24% 빠르게 해 줄 것이라고 예상했고, 끝난 뒤에도 20% 빨라졌다고 느꼈지만, 실제로는 이슈를 끝내는 데 19% 더 걸렸다.";

export default function MetrGapFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<line x1={ZERO} y1={TOP} x2={ZERO} y2={AXIS_Y} className="fg-axis" strokeWidth={1.5} />
			{ROWS.map((r, i) => {
				const end = ZERO + r.pct * PER;
				return (
					<g key={r.label}>
						<text x={LABEL_X} y={yOf(i) + 5} textAnchor="end" className="fg-text" fontSize={14}>
							{r.label}
						</text>
						<rect x={Math.min(ZERO, end)} y={yOf(i) - 12} width={Math.abs(r.pct) * PER} height={24} rx={4} className={`fg-${r.tone}-fill fg-${r.tone}`} strokeWidth={1.5} />
						<text x={r.pct < 0 ? end - 8 : end + 8} y={yOf(i) + 5} textAnchor={r.pct < 0 ? "end" : "start"} className={`fg-${r.tone}-ink`} fontSize={14} fontWeight={700}>
							{r.text}
						</text>
					</g>
				);
			})}
			<text x={ZERO - 14} y={AXIS_Y + 18} textAnchor="end" className="fg-sub" fontSize={12}>
				← 빨라짐
			</text>
			<text x={ZERO} y={AXIS_Y + 18} textAnchor="middle" className="fg-sub" fontSize={12}>
				0
			</text>
			<text x={ZERO + 14} y={AXIS_Y + 18} className="fg-sub" fontSize={12}>
				느려짐 →
			</text>
		</svg>
	);
}

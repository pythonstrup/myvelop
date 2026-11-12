import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// Klarna가 AI 상담의 성과를 말한 세 시점을 시간선에 놓은 정적 그림.
// 시점 사이 간격은 실제 기간에 비례하지 않는다. 숫자는 모두 본문에 인용한 자료의 값이다.
// 맨 아래 화살표는 성과를 말하는 단위가 상담 건수에서 회사 전체의 효율로 옮겨 갔다는 글쓴이의 해석이다.
const W = 720;
const H = 244;
const COL_W = 210;
const COL_X = [24, 255, 486]; // 카드 왼쪽 끝
const AXIS_Y = 48;
const CARD_Y = 66;
const CARD_H = 112;
const EVENTS = [
	{ date: "2024년 2월", title: "AI 상담원 성과 발표", tone: "blue", lines: ["첫 달 상담 채팅의 3분의 2", "230만 건 처리", "정규직 700명분의 일"] },
	{ date: "2025년 5월", title: "품질 하락 인정", tone: "red", lines: ["비용을 지나치게 앞세워", "품질이 낮아졌다고 인정", "사람 상담원 다시 채용"] },
	{ date: "2026년 2월", title: "2025년 4분기 실적 자료", tone: "green", lines: ["직원 1인당 매출 124만 달러", "2022년의 3.6배", "인원은 49% 감소"] },
] as const;
const cxOf = (i: number) => COL_X[i] + COL_W / 2;
const ARIA =
	"Klarna의 세 시점. 2024년 2월에는 AI 상담원이 첫 달에 상담 채팅의 3분의 2인 230만 건을 처리했고 정규직 700명분의 일이라고 발표했다. 2025년 5월에는 CEO가 비용을 지나치게 앞세워 품질이 낮아졌다고 인정했고 사람 상담원을 다시 뽑기 시작했다. 2026년 2월 2025년 4분기 실적 자료에서는 직원 1인당 매출이 124만 달러로 2022년의 3.6배가 됐고 인원은 49% 줄었다. 성과를 말하는 단위가 상담 건수에서 회사 전체의 효율로 옮겨 갔다.";

export default function KlarnaTimelineFigure() {
	const left = cxOf(0) + 50;
	const right = cxOf(2) - 76;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<line x1={cxOf(0)} y1={AXIS_Y} x2={cxOf(2)} y2={AXIS_Y} className="fg-axis" strokeWidth={2} />

			{EVENTS.map((e, i) => (
				<g key={e.date}>
					<text x={cxOf(i)} y={30} textAnchor="middle" className="fg-text" fontSize={14} fontWeight={700}>
						{e.date}
					</text>
					<circle cx={cxOf(i)} cy={AXIS_Y} r={6} className={`fg-${e.tone}-fill fg-${e.tone}`} strokeWidth={2} />
					<rect x={COL_X[i]} y={CARD_Y} width={COL_W} height={CARD_H} rx={8} className="fg-box" />
					<text x={COL_X[i] + 12} y={CARD_Y + 26} className={`fg-${e.tone}-ink`} fontSize={14} fontWeight={700}>
						{e.title}
					</text>
					{e.lines.map((line, j) => (
						<text key={line} x={COL_X[i] + 12} y={CARD_Y + 52 + j * 22} className="fg-text" fontSize={13}>
							{line}
						</text>
					))}
				</g>
			))}

			{/* 성과를 말하는 단위가 옮겨 간 방향 */}
			<line x1={left} y1={214} x2={right - 8} y2={214} className="fg-arrow" strokeWidth={1.5} />
			<path d={`M ${right - 8} 209 L ${right} 214 L ${right - 8} 219 Z`} className="fg-head" />
			<text x={(left + right) / 2} y={206} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				성과를 말하는 단위
			</text>
			<Pill cx={cxOf(0)} cy={214} label="상담 건수" tone="blue" maxX={W} />
			<Pill cx={cxOf(2)} cy={214} label="회사 전체의 효율" tone="green" maxX={W} />
		</svg>
	);
}

import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// 항공권 예약 에이전트를 한 번 돌린 결과를 에이전트가 한 말과 일이 끝난 뒤의 DB 상태로 각각 채점해 견주는 정적 그림.
// 에이전트가 예약을 마쳤다고 말했지만 예약 테이블에 새 행이 없다는 상황은 설명을 위해 정한 것이다.
const W = 720;
const H = 214;
const LEFT_CX = 192;
const RIGHT_CX = 528;
const TABLE_X = 404;
const TABLE_W = 248;
const COLS = ["번호", "승객", "항공편"];
const ARIA =
	"항공권 예약 에이전트를 한 번 돌린 결과를 두 가지로 채점한 그림. 에이전트가 예약을 마쳤다고 말했으므로 말로 채점하면 합격이다. 하지만 일이 끝난 뒤 DB의 예약 테이블에 새로 생긴 예약이 없으므로 상태로 채점하면 불합격이다.";

export default function OutcomeGradingFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<text x={W / 2} y={30} textAnchor="middle" className="fg-sub" fontSize={13}>
				항공권 예약 에이전트를 한 번 돌린 결과
			</text>
			<line x1={W / 2} y1={46} x2={W / 2} y2={H - 16} className="fg-frame" strokeWidth={1.5} />

			{/* 왼쪽: 에이전트가 한 말 */}
			<text x={LEFT_CX} y={66} textAnchor="middle" className="fg-text" fontSize={15} fontWeight={700}>
				에이전트가 한 말
			</text>
			<rect x={LEFT_CX - 110} y={86} width={220} height={44} rx={20} className="fg-box" strokeWidth={1.5} />
			<text x={LEFT_CX} y={113} textAnchor="middle" className="fg-text" fontSize={15}>
				예약을 마쳤습니다.
			</text>

			{/* 오른쪽: 일이 끝난 뒤의 DB 상태 */}
			<text x={RIGHT_CX} y={66} textAnchor="middle" className="fg-text" fontSize={15} fontWeight={700}>
				일이 끝난 뒤의 DB 상태
			</text>
			<rect x={TABLE_X} y={80} width={TABLE_W} height={68} rx={8} className="fg-box" strokeWidth={1.5} />
			<rect x={TABLE_X} y={80} width={TABLE_W} height={28} rx={8} className="fg-gray-fill fg-gray" strokeWidth={1.5} />
			{COLS.map((c, i) => (
				<text key={c} x={TABLE_X + (TABLE_W / COLS.length) * (i + 0.5)} y={99} textAnchor="middle" className="fg-sub" fontSize={12.5}>
					{c}
				</text>
			))}
			<text x={RIGHT_CX} y={134} textAnchor="middle" className="fg-red-ink" fontSize={14} fontWeight={700}>
				새로 생긴 예약 없음
			</text>

			<Pill cx={LEFT_CX} cy={182} label="말로 채점하면 합격" tone="green" maxX={W} />
			<Pill cx={RIGHT_CX} cy={182} label="상태로 채점하면 불합격" tone="red" maxX={W} />
		</svg>
	);
}

import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// 주문 서비스의 출력 지표와 입력 지표 후보를 나무로 잇는 정적 그림. 지표 이름은 본문의 예 그대로다.
// 후보에서 출력으로 가는 선은 점선과 물음표로 그려, 이어지는지 아직 모른다는 것을 보인다.
// 가드레일 칸은 자리만 보이고 구체 지표는 적지 않는다.
const W = 720;
const H = 304;
const OUT = { x: 97, y: 40, w: 300, h: 64 };
const IN_Y = 192;
const IN_W = 140;
const IN_H = 54;
const INPUTS = [
	{ x: 24, lines: ["주문 화면의", "응답 시간"], dashed: false },
	{ x: 177, lines: ["품절 상품의", "비율"], dashed: false },
	{ x: 330, lines: ["다른 후보"], dashed: true },
] as const;
const GUARD = { x: 504, y: 40, w: 192, h: 64 };
const ARIA =
	"주문 서비스의 지표를 나무로 그린 그림. 위에는 출력 지표인 주문 완료 비율과 주문 수가 있고, 아래에는 팀이 움직일 수 있는 입력 지표 후보인 주문 화면의 응답 시간, 품절 상품의 비율, 그리고 다른 후보가 있다. 후보와 출력 사이는 물음표가 붙은 점선으로, 어느 입력이 출력을 움직이는지는 매주 지켜보며 가려낸다. 오른쪽에는 나빠지면 안 되는 가드레일 지표의 자리가 있고 다음 절에서 다룬다.";

export default function MetricTreeFigure() {
	const outCx = OUT.x + OUT.w / 2;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 후보에서 출력으로 가는 점선. 이어지는지는 아직 모른다 */}
			{INPUTS.map((n, i) => {
				const x1 = n.x + IN_W / 2;
				const x2 = outCx + (i - 1) * 60;
				const mx = (x1 + x2) / 2;
				const my = (IN_Y + OUT.y + OUT.h) / 2;
				return (
					<g key={n.lines[0]}>
						<line x1={x1} y1={IN_Y} x2={x2} y2={OUT.y + OUT.h} className="fg-arrow" strokeWidth={1.5} strokeDasharray="5 4" />
						<circle cx={mx} cy={my} r={11} className="fg-bg" />
						<circle cx={mx} cy={my} r={11} className="fg-amber-fill fg-amber" strokeWidth={1.5} />
						<text x={mx} y={my + 5} textAnchor="middle" className="fg-amber-ink" fontSize={14} fontWeight={700}>
							?
						</text>
					</g>
				);
			})}

			{/* 출력 지표 */}
			<rect x={OUT.x} y={OUT.y} width={OUT.w} height={OUT.h} rx={10} className="fg-blue-fill fg-blue" strokeWidth={1.5} />
			<text x={outCx} y={OUT.y + 24} textAnchor="middle" className="fg-blue-ink" fontSize={12.5} fontWeight={700}>
				출력 지표
			</text>
			<text x={outCx} y={OUT.y + 47} textAnchor="middle" className="fg-text" fontSize={15} fontWeight={700}>
				주문 완료 비율, 주문 수
			</text>

			{/* 입력 지표 후보 */}
			{INPUTS.map((n) => (
				<g key={n.lines[0]}>
					<rect
						x={n.x}
						y={IN_Y}
						width={IN_W}
						height={IN_H}
						rx={8}
						className={n.dashed ? "fg-gray-fill fg-gray" : "fg-green-fill fg-green"}
						strokeWidth={1.5}
						strokeDasharray={n.dashed ? "5 4" : undefined}
					/>
					{n.lines.map((l, k) => (
						<text
							key={l}
							x={n.x + IN_W / 2}
							y={IN_Y + IN_H / 2 + 5 + (k - (n.lines.length - 1) / 2) * 18}
							textAnchor="middle"
							className={n.dashed ? "fg-sub" : "fg-text"}
							fontSize={13.5}
							fontWeight={n.dashed ? 400 : 600}
						>
							{l}
						</text>
					))}
				</g>
			))}
			<text x={24} y={IN_Y + IN_H + 28} className="fg-green-ink" fontSize={13.5} fontWeight={700}>
				입력 지표 후보
			</text>
			<text x={124} y={IN_Y + IN_H + 28} className="fg-sub" fontSize={12.5}>
				팀이 움직일 수 있다. 무엇이 출력을 움직이는지는 매주 지켜보며 가려낸다.
			</text>

			{/* 가드레일 자리 */}
			<line x1={487} y1={28} x2={487} y2={IN_Y + IN_H} className="fg-axis" strokeDasharray="3 4" />
			<rect x={GUARD.x} y={GUARD.y} width={GUARD.w} height={GUARD.h} rx={10} className="fg-box fg-red" strokeWidth={1.5} strokeDasharray="5 4" />
			<text x={GUARD.x + GUARD.w / 2} y={GUARD.y + 26} textAnchor="middle" className="fg-red-ink" fontSize={14} fontWeight={700}>
				가드레일 지표
			</text>
			<text x={GUARD.x + GUARD.w / 2} y={GUARD.y + 47} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				나빠지면 안 되는 지표
			</text>
			<text x={GUARD.x + GUARD.w / 2} y={GUARD.y + GUARD.h + 22} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				다음 절에서 본다
			</text>
		</svg>
	);
}

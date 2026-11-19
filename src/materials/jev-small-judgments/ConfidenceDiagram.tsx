import { SVG_STYLE } from "./colors";

// choice 확신도는 1순위 확률이 1/3(보기 셋을 고르게 나눈 값)에서 1까지 가는 길의 어디쯤인지다.
// 두 줄 모두 이력서 실험 첫 요청의 실측값이다. 정적 SVG로 SSR에서만 렌더링한다.
const X0 = 24;
const X1 = 376;
const EVEN = 1 / 3;
const BAR_H = 14;
const ROW_TOP = [52, 132]; // 줄마다 제목 글자의 기준선
const BAR_GAP = 12; // 제목 기준선에서 막대 윗변까지
const TICK_GAP = 15; // 막대 아랫변에서 눈금 글자 기준선까지

const x = (p: number) => X0 + (X1 - X0) * p;

const LABELS = {
	ko: {
		formula: "확신도 = (1순위 확률 − 1/3) ÷ (1 − 1/3)",
		rows: [
			{ name: "데이터베이스 설계 · 1순위 얕음", p: 0.81, conf: 0.72 },
			{ name: "장애 대응 · 1순위 깊음", p: 0.55, conf: 0.33 },
		],
		conf: "확신도",
		even: "고르게 나눈 값",
		note: "파란 막대가 1/3에서 1까지 1순위가 간 거리다",
		aria: "choice 확신도 계산을 보여주는 그림. 보기가 셋이면 고르게 나눈 값은 1/3이고, 확신도는 1순위 확률이 1/3에서 1까지 가는 길의 어디쯤인지다. 데이터베이스 설계 질문은 1순위 얕음이 0.81이라 확신도가 0.72이고, 장애 대응 질문은 1순위 깊음이 0.55라 확신도가 0.33이다.",
	},
	en: {
		formula: "confidence = (top probability − 1/3) ÷ (1 − 1/3)",
		rows: [
			{ name: "Database design · top: Shallow", p: 0.81, conf: 0.72 },
			{ name: "Incident response · top: Deep", p: 0.55, conf: 0.33 },
		],
		conf: "confidence",
		even: "even split",
		note: "Blue is how far the top choice got from 1/3 toward 1",
		aria: "Diagram of how choice confidence is computed. With three options an even split gives 1/3 each, and confidence is where the top probability sits on the way from 1/3 to 1. For database design the top choice, Shallow, is 0.81, so confidence is 0.72. For incident response the top choice, Deep, is 0.55, so confidence is 0.33.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function ConfidenceDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const fg = "var(--foreground)";
	return (
		<svg viewBox="0 0 400 214" role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<text x={X0} y={22} fontSize="12.5" fontWeight="600" fill={fg}>
				{L.formula}
			</text>

			{L.rows.map((row, i) => {
				const top = ROW_TOP[i];
				const barY = top + BAR_GAP;
				const tickY = barY + BAR_H + TICK_GAP;
				return (
					<g key={row.name}>
						<text x={X0} y={top} fontSize="12" fill={fg}>
							{row.name}
						</text>
						<text x={X1} y={top} fontSize="12" fontWeight="700" textAnchor="end" className="jv-blue">
							{`${L.conf} ${row.conf.toFixed(2)}`}
						</text>

						{/* 0~1/3은 고르게 나눈 몫, 1/3~1은 1순위가 갈 수 있는 길, 그중 간 만큼을 진하게 칠한다 */}
						<rect x={x(0)} y={barY} width={x(EVEN) - x(0)} height={BAR_H} rx="4" className="jv-box jv-box-line" strokeWidth="1" />
						<rect x={x(EVEN)} y={barY} width={x(1) - x(EVEN)} height={BAR_H} rx="4" className="jv-blue-soft" />
						<rect x={x(EVEN)} y={barY} width={x(row.p) - x(EVEN)} height={BAR_H} rx="4" className="jv-blue" />
						<line x1={x(EVEN)} x2={x(EVEN)} y1={barY - 4} y2={barY + BAR_H + 4} stroke={muted} strokeDasharray="3 3" strokeWidth="1" />

						<text x={x(0)} y={tickY} fontSize="11" fill={muted}>
							0
						</text>
						<text x={x(EVEN)} y={tickY} fontSize="11" textAnchor="middle" fill={muted}>
							1/3
						</text>
						<text x={x(row.p)} y={tickY} fontSize="11.5" fontWeight="700" textAnchor="middle" className="jv-blue">
							{row.p.toFixed(2)}
						</text>
						<text x={x(1)} y={tickY} fontSize="11" textAnchor="end" fill={muted}>
							1
						</text>
						{i === 0 && (
							<text x={x(EVEN)} y={tickY + 14} fontSize="11" textAnchor="middle" fill={muted}>
								{L.even}
							</text>
						)}
					</g>
				);
			})}

			<text x={200} y={204} fontSize="11.5" textAnchor="middle" fill={muted}>
				{L.note}
			</text>
		</svg>
	);
}

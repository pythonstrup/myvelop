import { SVG_STYLE } from "./colors";

// score 답의 위치는 단계 하나가 아니라 단계 번호에 확률을 곱해 더한 값이다.
// scope 질문 첫 요청의 실측값이다. 정적 SVG로 SSR에서만 렌더링한다.
const PROBS = [0.14, 0.73, 0.13];
const POSITION = 0.99; // 0 × 0.14 + 1 × 0.73 + 2 × 0.13
const CONFIDENCE = 0.59;
const X_LEVEL = [80, 200, 320]; // 단계 0·1·2의 가로 자리
const Y_BASE = 176; // 막대 바닥
const PLOT_H = 110; // 확률 1의 막대 높이
const BAR_W = 46;
const LABEL_LIFT = 6; // 막대 윗변에서 확률 글자 기준선까지
const LABEL_H = 13; // 확률 글자 높이: 위치 점선이 이 칸을 비켜 간다
const NEAREST = Math.round(POSITION); // 위치 점선이 지나가는 막대

const xPos = (s: number) => X_LEVEL[0] + ((X_LEVEL[2] - X_LEVEL[0]) * s) / 2;

const LABELS = {
	ko: {
		title: "scope · 주도한 일의 범위",
		conf: "확신도",
		position: "위치",
		pillW: 76,
		levels: [["혼자 맡은 기능"], ["팀 단위 과제"], ["여러 팀에 걸친 과제"]],
		aria: "scope 질문에 Jev가 돌려준 단계별 확률과 위치를 보여주는 그림. 단계 0 혼자 맡은 기능이 0.14, 단계 1 팀 단위 과제가 0.73, 단계 2 여러 팀에 걸친 과제가 0.13이다. 단계 번호에 확률을 곱해 더한 위치는 0 × 0.14 + 1 × 0.73 + 2 × 0.13 = 0.99로 팀 단위 과제 한가운데이고, 확신도는 0.59다.",
	},
	en: {
		title: "scope · how far the work led reaches",
		conf: "confidence",
		position: "position",
		pillW: 100,
		levels: [
			["A feature", "owned alone"],
			["A team-level", "project"],
			["A project spanning", "several teams"],
		],
		aria: "Diagram of the probabilities and position Jev returned for the scope question. Level 0, a feature owned alone, is 0.14. Level 1, a team-level project, is 0.73. Level 2, a project spanning several teams, is 0.13. Each level number times its probability, added up, gives 0 × 0.14 + 1 × 0.73 + 2 × 0.13 = 0.99, the middle of a team-level project. Confidence is 0.59.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function ScorePositionDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const fg = "var(--foreground)";
	const markerTop = Y_BASE - PLOT_H - 2;
	const labelBase = Y_BASE - PLOT_H * PROBS[NEAREST] - LABEL_LIFT;
	return (
		<svg viewBox="0 0 400 272" role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<text x={20} y={20} fontSize="12.5" fontWeight="600" fill={fg}>
				{L.title}
			</text>
			<text x={380} y={20} fontSize="12" fontWeight="700" textAnchor="end" className="jv-blue">
				{`${L.conf} ${CONFIDENCE.toFixed(2)}`}
			</text>

			{/* 단계별 확률 막대 */}
			{PROBS.map((p, i) => {
				const h = PLOT_H * p;
				return (
					<g key={X_LEVEL[i]}>
						<rect
							x={X_LEVEL[i] - BAR_W / 2}
							y={Y_BASE - h}
							width={BAR_W}
							height={h}
							rx="4"
							className="jv-blue-soft jv-blue-line"
							strokeWidth="1.5"
						/>
						<text x={X_LEVEL[i]} y={Y_BASE - h - LABEL_LIFT} fontSize="11.5" fontWeight="600" textAnchor="middle" fill={fg}>
							{p.toFixed(2)}
						</text>
					</g>
				);
			})}

			{/* 가중 위치 표시 */}
			{[
				[markerTop, labelBase - LABEL_H],
				[labelBase + 3, Y_BASE + 6],
			].map(([y1, y2]) => (
				<line key={y1} x1={xPos(POSITION)} x2={xPos(POSITION)} y1={y1} y2={y2} stroke={fg} strokeWidth="1.5" strokeDasharray="4 3" />
			))}
			<rect x={xPos(POSITION) - L.pillW / 2} y={markerTop - 22} width={L.pillW} height={20} rx="10" className="jv-blue" />
			<text x={xPos(POSITION)} y={markerTop - 8} fontSize="11.5" fontWeight="700" textAnchor="middle" fill="var(--background)">
				{`${L.position} ${POSITION.toFixed(2)}`}
			</text>

			{/* 가로축과 단계 이름 */}
			<line x1={30} x2={370} y1={Y_BASE} y2={Y_BASE} stroke="var(--border)" strokeWidth="1.5" />
			{X_LEVEL.map((lx, i) => (
				<g key={lx}>
					<text x={lx} y={Y_BASE + 16} fontSize="11" fontWeight="600" textAnchor="middle" fill={muted}>
						{i}
					</text>
					{L.levels[i].map((line, j) => (
						<text key={line} x={lx} y={Y_BASE + 32 + j * 14} fontSize="11" textAnchor="middle" fill={fg}>
							{line}
						</text>
					))}
				</g>
			))}

			<text x={200} y={Y_BASE + 82} fontSize="12" textAnchor="middle" fill={fg}>
				{`0 × ${PROBS[0]} + 1 × ${PROBS[1]} + 2 × ${PROBS[2]} = ${POSITION}`}
			</text>
		</svg>
	);
}

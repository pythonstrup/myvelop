import { SVG_STYLE } from "./colors";

// noul·choice·score가 돌려주는 답의 모양을 카드 세 장으로 보인다. 정적 SVG로 SSR에서만 렌더링한다.
// 값은 글의 예시 질문 셋(stack_kafka·must_db·scope)에 Jev 1.14가 실제로 돌려준 답이다(측정 run 0).
const NOUL = 0.53;
const CHOICE = [0.81, 0.17, 0.02];
const CHOICE_CONF = 0.72;
const SCORE = [0.14, 0.73, 0.13];
const SCORE_POS = 0.99;
const SCORE_CONF = 0.59;

const LABELS = {
	ko: {
		types: [
			{ name: "noul", desc: "예일 확률 하나", ask: "Kafka를 실무에서 쓴 경험이 적혀 있는가" },
			{ name: "choice", desc: "보기별 확률과 확신도", ask: "데이터베이스 설계를 얼마나 깊이 다뤘나" },
			{ name: "score", desc: "가중 위치, 단계별 확률, 확신도", ask: "주도한 일의 범위는 어디까지인가" },
		],
		options: ["얕음", "보통", "깊음"],
		levels: ["혼자 맡은 기능", "팀 단위 과제", "여러 팀에 걸친 과제"],
		choiceFoot: `고른 보기 얕음 · 확신도 ${CHOICE_CONF}`,
		scoreFoot: `▲ 가중 위치 ${SCORE_POS} · 확신도 ${SCORE_CONF}`,
		aria: `질문 세 종류가 돌려주는 답의 모양을 보여 주는 그림. noul은 예일 확률 하나를 돌려주며, Kafka를 실무에서 쓴 경험이 적혀 있는지 묻자 ${NOUL}이 나왔다. choice는 보기별 확률과 확신도를 돌려주며, 데이터베이스 설계 깊이를 묻자 얕음 ${CHOICE[0]}, 보통 ${CHOICE[1]}, 깊음 ${CHOICE[2]}에 확신도 ${CHOICE_CONF}였다. score는 단계별 확률과 그 확률로 가중한 위치, 확신도를 돌려주며, 주도한 일의 범위를 묻자 혼자 맡은 기능 ${SCORE[0]}, 팀 단위 과제 ${SCORE[1]}, 여러 팀에 걸친 과제 ${SCORE[2]}로 위치 ${SCORE_POS}, 확신도 ${SCORE_CONF}였다.`,
	},
	en: {
		types: [
			{ name: "noul", desc: "One probability of yes", ask: "Does the resume describe using Kafka?" },
			{ name: "choice", desc: "Probability per option, confidence", ask: "How deeply was database design handled?" },
			{ name: "score", desc: "Position, per-level probability, confidence", ask: "How far does the scope of work reach?" },
		],
		options: ["Shallow", "Moderate", "Deep"],
		levels: ["Solo feature", "Team project", "Several teams"],
		choiceFoot: `Chosen: Shallow · confidence ${CHOICE_CONF}`,
		scoreFoot: `▲ Position ${SCORE_POS} · confidence ${SCORE_CONF}`,
		aria: `Diagram of the answer shape each question type returns. A noul returns one probability of yes: asked whether the resume describes using Kafka in real work, it returned ${NOUL}. A choice returns a probability per option and a confidence: asked how deeply database design was handled, it returned Shallow ${CHOICE[0]}, Moderate ${CHOICE[1]}, Deep ${CHOICE[2]}, with confidence ${CHOICE_CONF}. A score returns a probability per level, the position weighted by those probabilities, and a confidence: asked how far the scope of work reached, it returned ${SCORE[0]} for a solo feature, ${SCORE[1]} for a team project, and ${SCORE[2]} for several teams, a position of ${SCORE_POS} and confidence ${SCORE_CONF}.`,
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 420;
const PAD = 6;
const CARD_X = PAD;
const CARD_W = W - PAD * 2;
const CARD_GAP = 12;
const IN_X = CARD_X + 16; // 카드 안 왼쪽 여백
const IN_R = CARD_X + CARD_W - 16; // 카드 안 오른쪽 끝
const NOUL_H = 96;
const CHOICE_H = 140;
const SCORE_H = 172;
const NOUL_Y = PAD;
const CHOICE_Y = NOUL_Y + NOUL_H + CARD_GAP;
const SCORE_Y = CHOICE_Y + CHOICE_H + CARD_GAP;
const HEIGHT = SCORE_Y + SCORE_H + PAD;

// noul 눈금
const AX_X0 = IN_X + 14;
const AX_X1 = IN_R - 14;
const noulX = (p: number) => AX_X0 + (AX_X1 - AX_X0) * p;

// choice 막대
const BAR_X = IN_X + 70;
const BAR_W = IN_R - 44 - BAR_X;
const BAR_H = 10;

// score 기둥
const COL_W = 44;
const COL_MAX = 52; // 확률 1일 때 기둥 높이
const scoreX = (pos: number) => IN_X + 62 + ((IN_R - 62 - (IN_X + 62)) * pos) / 2;

export default function QuestionTypesDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const fg = "var(--foreground)";
	const card = (y: number, h: number) => (
		<rect x={CARD_X} y={y} width={CARD_W} height={h} rx={10} className="jv-box jv-box-line" strokeWidth={1} />
	);
	const head = (y: number, i: number) => (
		<>
			<text x={IN_X} y={y + 22} fontSize="14" fontWeight="700" className="jv-blue">
				{L.types[i].name}
			</text>
			<text x={IN_X + 58} y={y + 22} fontSize="12" fill={fg}>
				{L.types[i].desc}
			</text>
			<text x={IN_X} y={y + 40} fontSize="11" fill={muted}>
				{L.types[i].ask}
			</text>
		</>
	);

	// noul
	const nAxisY = NOUL_Y + 70;
	// choice
	const cRow = (k: number) => CHOICE_Y + 60 + k * 18;
	// score
	const sBase = SCORE_Y + 112;

	return (
		<svg viewBox={`0 0 ${W} ${HEIGHT}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>

			{/* noul: 0~1 위의 점 하나 */}
			{card(NOUL_Y, NOUL_H)}
			{head(NOUL_Y, 0)}
			<line x1={AX_X0} x2={AX_X1} y1={nAxisY} y2={nAxisY} stroke="rgb(var(--gray))" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
			{[0, 0.5, 1].map((v) => (
				<g key={v}>
					<line x1={noulX(v)} x2={noulX(v)} y1={nAxisY - 4} y2={nAxisY + 4} stroke="rgb(var(--gray))" strokeOpacity="0.6" />
					<text x={noulX(v)} y={nAxisY + 17} fontSize="11" textAnchor="middle" fill={muted}>
						{v}
					</text>
				</g>
			))}
			<circle cx={noulX(NOUL)} cy={nAxisY} r={6} className="jv-blue" stroke="var(--background)" strokeWidth="2" />
			<text x={noulX(NOUL)} y={nAxisY - 11} fontSize="12" fontWeight="700" textAnchor="middle" className="jv-blue">
				{NOUL}
			</text>

			{/* choice: 보기별 확률 막대 */}
			{card(CHOICE_Y, CHOICE_H)}
			{head(CHOICE_Y, 1)}
			{CHOICE.map((p, k) => (
				<g key={L.options[k]}>
					<text x={IN_X} y={cRow(k) + 4} fontSize="11.5" fontWeight={k === 0 ? 700 : 400} fill={k === 0 ? fg : muted}>
						{L.options[k]}
					</text>
					<rect x={BAR_X} y={cRow(k) - BAR_H / 2} width={BAR_W} height={BAR_H} rx={3} fill="var(--background)" />
					<rect x={BAR_X} y={cRow(k) - BAR_H / 2} width={Math.max(2, BAR_W * p)} height={BAR_H} rx={3} className={k === 0 ? "jv-blue" : "jv-blue-soft"} />
					<text x={IN_R} y={cRow(k) + 4} fontSize="11.5" fontWeight={k === 0 ? 700 : 400} textAnchor="end" fill={k === 0 ? fg : muted}>
						{p}
					</text>
				</g>
			))}
			<text x={IN_X} y={CHOICE_Y + CHOICE_H - 12} fontSize="12" fontWeight="600" fill={fg}>
				{L.choiceFoot}
			</text>

			{/* score: 단계별 기둥과 가중 위치 */}
			{card(SCORE_Y, SCORE_H)}
			{head(SCORE_Y, 2)}
			<line x1={scoreX(0) - COL_W} x2={scoreX(2) + COL_W} y1={sBase} y2={sBase} stroke="rgb(var(--gray))" strokeOpacity="0.6" />
			{SCORE.map((p, k) => {
				const h = COL_MAX * p;
				return (
					<g key={L.levels[k]}>
						<rect x={scoreX(k) - COL_W / 2} y={sBase - h} width={COL_W} height={h} rx={2} className={k === 1 ? "jv-blue" : "jv-blue-soft"} />
						<text x={scoreX(k)} y={sBase - h - 5} fontSize="11.5" fontWeight={k === 1 ? 700 : 400} textAnchor="middle" fill={k === 1 ? fg : muted}>
							{p}
						</text>
						<text x={scoreX(k)} y={sBase + 28} fontSize="11" textAnchor="middle" fill={muted}>
							{`${k} · ${L.levels[k]}`}
						</text>
					</g>
				);
			})}
			{/* 가중 위치 표시: 기준선 아래에서 위를 가리키는 삼각형 */}
			<path d={`M${scoreX(SCORE_POS)} ${sBase + 2}l-6 10h12z`} fill={fg} />
			<text x={IN_X} y={SCORE_Y + SCORE_H - 12} fontSize="12" fontWeight="600" fill={fg}>
				{L.scoreFoot}
			</text>
		</svg>
	);
}

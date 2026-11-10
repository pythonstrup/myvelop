import { SVG_STYLE } from "./colors";

// 판단이 비쌀 때의 넓은 질문 하나와, 판단이 쌀 때 쪼갠 좁은 질문 20개를 위아래로 비교한다. 정적 SVG로 SSR에서만 렌더링한다.
// 아래 묶음은 이력서 실험의 질문 20개 그대로다(1 + 4 + 3 + 6 + 1 + 4 + 1).
const GROUPS = [
	{ type: "noul", n: 1 },
	{ type: "choice", n: 4 },
	{ type: "choice", n: 3 },
	{ type: "score", n: 6 },
	{ type: "score", n: 1 },
	{ type: "noul", n: 4 },
	{ type: "noul", n: 1 },
] as const;

const W = 400;
const ROW_TOP = 182;
const ROW_H = 24;
const SQ = 12;
const SQ_GAP = 4;
const ROWS_END = ROW_TOP + GROUPS.length * ROW_H;
const CODE_Y = ROWS_END + 24;
const HEIGHT = CODE_Y + 66;

const LABELS = {
	ko: {
		broadHead: "판단이 비쌀 때 · 넓은 질문 하나",
		broad: "이 사람은 몇 점인가",
		hidden: ["요건을 채웠나", "일을 얼마나 주도했나", "경험이 구체적으로 적혔나"],
		one: "점수 하나",
		oneNote: ["어느 판단이 틀렸는지", "알 수 없다"],
		splitHead: "판단이 쌀 때 · 좁은 질문 20개",
		groups: ["직무 관련성", "필수 요건", "우대 조건", "이력의 면", "기록", "기술 스택", "기록"],
		labelW: 84,
		code: "코드가 답을 합쳐 읽는 순서를 만든다",
		cost: "20개를 한 요청에 묻는 데 $0.000116",
		aria: "넓은 질문 하나와 좁은 질문 20개를 비교한 그림. 판단이 비쌀 때는 이 사람은 몇 점인가 하나만 묻는데, 그 안에 요건을 채웠나, 일을 얼마나 주도했나, 경험이 구체적으로 적혔나 같은 판단이 숨어 있어 점수 하나가 이상해도 어느 판단이 틀렸는지 알 수 없다. 판단이 쌀 때는 직무 관련성 noul 1개, 필수 요건 choice 4개, 우대 조건 choice 3개, 이력의 면 score 6개, 기록 score 1개, 기술 스택 noul 4개, 기록 noul 1개로 모두 20개를 묻고, 코드가 답을 합쳐 읽는 순서를 만든다. 20개를 한 요청에 묻는 데 $0.000116이 들었다.",
	},
	en: {
		broadHead: "When judgment is expensive · one broad question",
		broad: "What score does this person get?",
		hidden: ["Are the requirements met?", "How much of the work did they lead?", "Is the experience written concretely?"],
		one: "One score",
		oneNote: ["No way to tell which", "judgment failed"],
		splitHead: "When judgment is cheap · 20 narrow questions",
		groups: ["Job relevance", "Required skills", "Preferred qualifications", "Career facets", "Writing", "Tech stack", "Writing"],
		labelW: 150,
		code: "Code combines the answers into a reading order",
		cost: "All 20 in one request cost $0.000116",
		aria: "Diagram comparing one broad question with 20 narrow ones. When judgment is expensive, you ask only what score this person gets, and that hides judgments such as whether the requirements are met, how much of the work they led, and whether the experience is written concretely, so when the score looks wrong you cannot tell which judgment failed. When judgment is cheap, you ask 20 questions: 1 noul on job relevance, 4 choice on required skills, 3 choice on preferred qualifications, 6 score on career facets, 1 score and 1 noul on writing, and 4 noul on the tech stack, and code combines the answers into a reading order. Asking all 20 in one request cost $0.000116.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function SplitQuestionsDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const head = { fontSize: 12, fontWeight: 700, fill: muted } as const;
	const tagX = 8 + L.labelW;
	const sqX = tagX + 46;
	return (
		<svg viewBox={`0 0 ${W} ${HEIGHT}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>

			{/* 넓은 질문 하나 */}
			<text x={8} y={16} {...head}>
				{L.broadHead}
			</text>
			<rect x={8} y={28} width={262} height={106} rx={8} className="jv-box jv-box-line" strokeWidth={1.2} />
			<text x={139} y={48} fontSize="13" fontWeight="700" textAnchor="middle" fill="var(--foreground)">
				{L.broad}
			</text>
			{L.hidden.map((h, i) => (
				<g key={h}>
					<rect x={20} y={58 + i * 24} width={238} height={19} rx={4} fill="none" stroke={muted} strokeOpacity={0.7} strokeDasharray="3 3" />
					<text x={139} y={71.5 + i * 24} fontSize="11.5" textAnchor="middle" fill={muted}>
						{h}
					</text>
				</g>
			))}
			<line x1={272} x2={290} y1={81} y2={81} stroke={muted} strokeWidth={1.5} />
			<path d="M290 77 L296 81 L290 85 Z" fill={muted} />
			<rect x={298} y={58} width={94} height={46} rx={8} className="jv-box jv-box-line" strokeWidth={1.2} />
			<text x={345} y={85} fontSize="13" fontWeight="700" textAnchor="middle" fill="var(--foreground)">
				{L.one}
			</text>
			<text x={345} y={120} fontSize="11" textAnchor="middle" fill={muted}>
				<tspan x={345}>{L.oneNote[0]}</tspan>
				<tspan x={345} dy={14}>
					{L.oneNote[1]}
				</tspan>
			</text>

			{/* 좁은 질문 20개 */}
			<text x={8} y={166} {...head}>
				{L.splitHead}
			</text>
			{GROUPS.map((g, i) => {
				const cy = ROW_TOP + i * ROW_H + ROW_H / 2;
				return (
					<g key={`${L.groups[i]}-${g.type}`}>
						<text x={8} y={cy + 4} fontSize="12" fill="var(--foreground)">
							{L.groups[i]}
						</text>
						<text x={tagX} y={cy + 4} fontSize="11" fill={muted}>
							{g.type}
						</text>
						{Array.from({ length: g.n }, (_, k) => (
							<rect key={k} x={sqX + k * (SQ + SQ_GAP)} y={cy - SQ / 2} width={SQ} height={SQ} rx={2} className="jv-blue" />
						))}
					</g>
				);
			})}
			<line x1={W / 2} x2={W / 2} y1={ROWS_END + 2} y2={CODE_Y - 7} stroke={muted} strokeWidth={1.5} />
			<path d={`M${W / 2 - 4} ${CODE_Y - 8} L${W / 2} ${CODE_Y - 2} L${W / 2 + 4} ${CODE_Y - 8} Z`} fill={muted} />
			<rect x={40} y={CODE_Y} width={W - 80} height={30} rx={8} fill="none" stroke="var(--foreground)" strokeOpacity={0.6} strokeWidth={1.2} />
			<text x={W / 2} y={CODE_Y + 19.5} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--foreground)">
				{L.code}
			</text>
			<text x={W / 2} y={CODE_Y + 54} fontSize="11.5" textAnchor="middle" fill={muted}>
				{L.cost}
			</text>
		</svg>
	);
}

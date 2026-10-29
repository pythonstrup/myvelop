import { SVG_STYLE } from "./colors";

// 9절의 판단 흐름. 위에서부터 Jev에 맡기지 않을 일을 차례로 걸러 내고, 남는 반복 판단을 Jev가 맡는다.
// 주황 = 생성 모델, 파랑 = Jev, 회색 = 코드·사람. 정적 SVG로 SSR에서만 렌더링한다.
type Handler = "code" | "gen" | "jev";
type Row = { task: string; ex: string; who: string; handler: Handler; note?: string };

const LABELS: Record<"ko" | "en", { head: string; otherwise: string; rows: Row[]; aria: string }> = {
	ko: {
		head: "위에서부터 차례로 걸러 본다",
		otherwise: "아니면",
		rows: [
			{ task: "계산하는 일", ex: "합산, 숫자·날짜 비교, 개수 세기", who: "코드", handler: "code" },
			{ task: "글을 써야 하는 일", ex: "요약, 답장, 판단의 이유", who: "생성 모델", handler: "gen" },
			{ task: "값을 새로 뽑아내는 일", ex: "경력 기간 같은 값", who: "코드나 생성 모델", handler: "code", note: "후보 중 고르기는 Jev" },
			{ task: "되돌리기 어려운 결정", ex: "이력서를 떨어뜨리는 일", who: "사람이나 큰 모델", handler: "code", note: "넘길지 정하는 건 Jev" },
			{ task: "글이 아닌 입력", ex: "이미지, 음성", who: "먼저 글로 바꾼다", handler: "code", note: "다른 모델로" },
			{ task: "남은 반복 판단", ex: "예/아니오, 보기, 단계", who: "Jev", handler: "jev" },
		],
		aria: "Jev를 언제 쓸지 위에서부터 차례로 걸러 보는 판단 흐름. 계산하는 일은 코드가 맡는다. 글을 써야 하는 일은 생성 모델이 맡는다. 값을 새로 뽑아내는 일은 코드나 생성 모델이 맡고, 후보 가운데 고르는 일은 Jev가 한다. 되돌리기 어려운 결정은 사람이나 큰 모델이 하고, Jev는 넘길지만 정한다. 글이 아닌 입력은 다른 모델로 먼저 글로 바꾼다. 여기까지 걸러지지 않고 남은 예/아니오, 보기, 단계의 반복 판단은 Jev가 맡는다.",
	},
	en: {
		head: "Check from the top down",
		otherwise: "if not",
		rows: [
			{ task: "Calculating", ex: "sums, comparisons, counts", who: "Code", handler: "code" },
			{ task: "Writing", ex: "summaries, replies, reasons", who: "Generative model", handler: "gen" },
			{ task: "Extracting new values", ex: "e.g. years of experience", who: "Code or generative model", handler: "code", note: "Jev picks among candidates" },
			{ task: "Hard-to-undo decisions", ex: "e.g. rejecting a resume", who: "Person or large model", handler: "code", note: "Jev only decides the handoff" },
			{ task: "Input that is not text", ex: "images, audio", who: "Turn it into text first", handler: "code", note: "with another model" },
			{ task: "Repeated judgments", ex: "yes or no, an option, a level", who: "Jev", handler: "jev" },
		],
		aria: "Decision flow for when to use Jev, checked from the top down. Calculating goes to code. Writing goes to a generative model. Extracting new values goes to code or a generative model, and Jev can pick among the candidates. Hard-to-undo decisions go to a person or a large model, and Jev only decides whether to hand them off. Input that is not text is first turned into text with another model. The repeated judgments left over, yes or no, an option, or a level, go to Jev.",
	},
};
type Lang = keyof typeof LABELS;

const W = 400;
const TOP = 32;
const ROW_H = 46;
const ROW_STEP = 62;
const LEFT_X = 8;
const LEFT_W = 182;
const RIGHT_X = 210;
const RIGHT_W = W - 8 - RIGHT_X;
const ARROW_X = 26;
const rowY = (i: number) => TOP + i * ROW_STEP;
const CHIP_CLASS: Record<Handler, string> = {
	code: "jv-box jv-box-line",
	gen: "jv-amber-soft jv-amber-line",
	jev: "jv-blue-soft jv-blue-line",
};
const WHO_CLASS: Record<Handler, string | undefined> = { code: undefined, gen: "jv-amber", jev: "jv-blue" };

export default function WhenToUseDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const fg = "var(--foreground)";
	const muted = "var(--muted-foreground)";
	const height = rowY(L.rows.length - 1) + ROW_H + 8;

	return (
		<svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<defs>
				<marker id="jv-wu-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
					<path d="M0,0 L8,4 L0,8 z" fill={muted} />
				</marker>
			</defs>
			<text x={LEFT_X} y={18} fontSize="13" fontWeight="700" fill={fg}>
				{L.head}
			</text>

			{L.rows.map((row, i) => {
				const y = rowY(i);
				const mid = y + ROW_H / 2;
				const last = i === L.rows.length - 1;
				const whoClass = WHO_CLASS[row.handler];
				return (
					<g key={row.task}>
						<rect x={LEFT_X} y={y} width={LEFT_W} height={ROW_H} rx={8} className="jv-box jv-box-line" strokeWidth={1.2} />
						<text x={LEFT_X + 10} y={y + 19} fontSize="12.5" fontWeight="700" fill={fg}>
							{row.task}
						</text>
						<text x={LEFT_X + 10} y={y + 36} fontSize="11" fill={muted}>
							{row.ex}
						</text>
						<line x1={LEFT_X + LEFT_W} x2={RIGHT_X - 2} y1={mid} y2={mid} stroke={muted} strokeWidth={1.3} markerEnd="url(#jv-wu-arrow)" />
						<rect x={RIGHT_X} y={y} width={RIGHT_W} height={ROW_H} rx={8} className={CHIP_CLASS[row.handler]} strokeWidth={last ? 1.8 : 1.2} />
						<text
							x={RIGHT_X + RIGHT_W / 2}
							y={row.note ? y + 20 : mid + 4.5}
							fontSize={last ? 14 : 12}
							fontWeight="700"
							textAnchor="middle"
							className={whoClass}
							fill={whoClass ? undefined : fg}
						>
							{row.who}
						</text>
						{row.note && (
							<text x={RIGHT_X + RIGHT_W / 2} y={y + 37} fontSize="11" textAnchor="middle" className={row.note.includes("Jev") ? "jv-blue" : undefined} fill={row.note.includes("Jev") ? undefined : muted}>
								{row.note}
							</text>
						)}
						{!last && (
							<g>
								<line x1={ARROW_X} x2={ARROW_X} y1={y + ROW_H} y2={rowY(i + 1) - 1} stroke={muted} strokeWidth={1.2} markerEnd="url(#jv-wu-arrow)" />
								<text x={ARROW_X + 8} y={y + ROW_H + 12} fontSize="11" fill={muted}>
									{L.otherwise}
								</text>
							</g>
						)}
					</g>
				);
			})}
		</svg>
	);
}

import { SVG_STYLE } from "./colors";

// 이력서 판독기가 읽는 순서를 매기는 규칙. 파랑은 Jev가 판단한 값, 회색은 코드의 규칙이다.
// 필수 요건 깊이 × 가중치와 우대 조건을 더한 합과 따로, 「얕음이 확실하면 뒤로」 관문을 둔다.
// 가중치는 정한 값이 없어서 기호(w₁…w₄, b)로 둔다. 정적 SVG로 SSR에서만 렌더링한다.
const LABELS = {
	ko: {
		legendJev: "Jev가 판단한 값",
		legendCode: "코드의 규칙",
		mustHead: "필수 요건마다 깊이를 숫자로 바꿔 가중치를 곱한다",
		depthMap: "얕음 0, 보통 1, 깊음 2",
		must: ["API 설계", "대용량 트래픽 처리", "데이터베이스 설계", "장애 대응"],
		depth: "깊이",
		prefHead: "우대 조건마다",
		prefName: "우대 조건 3개",
		pref: ["충족", "모름"],
		sum: "가중 합",
		gate: ["필수 요건 하나라도 ", "얕음이 확실하면", "합계와 상관없이 뒤로 보낸다"],
		order: "읽는 순서",
		gateNote: "가중 합에 섞으면 모자란 항목을 다른 항목이 메운다",
		memo: ["Jev의 답은 확률까지 그대로 저장해 둔다.", "가중치를 바꿔도 Jev를 다시 부르지 않고 계산만 새로 한다."],
		aria: "이력서 판독기가 읽는 순서를 매기는 규칙을 그린 그림. 필수 요건 네 가지인 API 설계, 대용량 트래픽 처리, 데이터베이스 설계, 장애 대응은 Jev가 판단한 깊이를 얕음 0, 보통 1, 깊음 2로 바꾸고 요건마다 가중치 w1부터 w4를 곱한다. 우대 조건 세 가지는 충족이면 b만큼 조금 더하고 모름이면 0을 더한다. 이 값들을 가중 합으로 모아 읽는 순서를 정한다. 이와 따로, 필수 요건 하나라도 얕음이 확실하면 합계와 상관없이 뒤로 보내는 관문을 둔다. 가중 합에 섞으면 모자란 항목을 다른 항목이 메우기 때문이다. Jev의 답은 확률까지 저장해 두어, 가중치를 바꿔도 Jev를 다시 부르지 않고 계산만 새로 한다.",
	},
	en: {
		legendJev: "Judged by Jev",
		legendCode: "Rule in code",
		mustHead: "Each required skill: depth as a number, times a weight",
		depthMap: "Shallow 0, Moderate 1, Deep 2",
		must: ["API design", "High-volume traffic", "Database design", "Incident response"],
		depth: "depth",
		prefHead: "Each preferred qualification",
		prefName: "3 qualifications",
		pref: ["Met", "Unknown"],
		sum: "Weighted sum",
		gate: ["Any required skill ", "confidently Shallow", "goes to the back, whatever the sum"],
		order: "Reading order",
		gateNote: "Inside the sum, other items would cover the shortfall",
		memo: ["Store Jev's answers with their probabilities.", "Change a weight and only the math reruns, with no new Jev calls."],
		aria: "Diagram of the rules a resume reader uses to set the reading order. For the four required skills, API design, high-volume traffic, database design, and incident response, the depth Jev judged becomes Shallow 0, Moderate 1, or Deep 2 and is multiplied by a weight, w1 to w4. For the three preferred qualifications, Met adds a little, b, and Unknown adds 0. These values go into a weighted sum that sets the reading order. Separately, a gate sends a resume to the back, whatever the sum, if any required skill is confidently Shallow, because inside the sum other items would cover the shortfall. Jev's answers are stored with their probabilities, so changing a weight only reruns the math with no new Jev calls.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 400;
const NAME_X = 8;
const CHIP_X = 146;
const CHIP_W = 62;
const TIMES_X = 218;
const WEIGHT_X = 228;
const WEIGHT_W = 40;
const SUM_X = 300;
const SUM_W = W - 8 - SUM_X;
const ROW_H = 24;
const ROW_STEP = 30;
const MUST_TOP = 68;
const PREF_HEAD = MUST_TOP + 4 * ROW_STEP + 12;
const PREF_TOP = PREF_HEAD + 10;
const SUM_TOP = MUST_TOP;
const SUM_BOTTOM = PREF_TOP + 2 * ROW_STEP - (ROW_STEP - ROW_H);
const GATE_Y = SUM_BOTTOM + 28;
const GATE_H = 54;
const GATE_W = WEIGHT_X + WEIGHT_W - NAME_X;
const ORDER_H = 36;
const ORDER_Y = GATE_Y + (GATE_H - ORDER_H) / 2;
const NOTE_Y = GATE_Y + GATE_H + 18;
const RULE_Y = NOTE_Y + 16;
const MEMO_Y = RULE_Y + 20;
const HEIGHT = MEMO_Y + 26;
const WEIGHTS = ["w₁", "w₂", "w₃", "w₄"];
const PREF_WEIGHTS = ["+b", "0"];

export default function ScoringRulesDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const fg = "var(--foreground)";
	const muted = "var(--muted-foreground)";
	const jevChip = { className: "jv-blue-soft jv-blue-line", strokeWidth: 1.2, rx: 6 } as const;
	const codeChip = { className: "jv-box jv-box-line", strokeWidth: 1.2, rx: 6 } as const;
	const wire = { stroke: muted, strokeOpacity: 0.6, strokeWidth: 1.2 } as const;
	const chipText = { fontSize: 12, textAnchor: "middle" } as const;

	const row = (top: number, i: number, name: string, chip: string, weight: string) => {
		const y = top + i * ROW_STEP;
		const mid = y + ROW_H / 2;
		return (
			<g key={`${top}-${i}`}>
				<text x={NAME_X} y={mid + 4} fontSize="12" fill={fg}>
					{name}
				</text>
				<rect x={CHIP_X} y={y} width={CHIP_W} height={ROW_H} {...jevChip} />
				<text x={CHIP_X + CHIP_W / 2} y={mid + 4} {...chipText} className="jv-blue">
					{chip}
				</text>
				<text x={TIMES_X} y={mid + 4} {...chipText} fill={muted}>
					{weight.startsWith("w") ? "×" : ""}
				</text>
				<rect x={WEIGHT_X} y={y} width={WEIGHT_W} height={ROW_H} {...codeChip} />
				<text x={WEIGHT_X + WEIGHT_W / 2} y={mid + 4} {...chipText} fill={fg}>
					{weight}
				</text>
				<line x1={WEIGHT_X + WEIGHT_W} x2={SUM_X} y1={mid} y2={mid} {...wire} />
			</g>
		);
	};

	return (
		<svg viewBox={`0 0 ${W} ${HEIGHT}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<defs>
				<marker id="jv-sr-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M0,0 L8,4 L0,8 z" fill={muted} />
				</marker>
			</defs>

			{/* 범례 */}
			<rect x={8} y={5} width={12} height={12} {...jevChip} rx={3} />
			<text x={26} y={15} fontSize="12" fill={fg}>
				{L.legendJev}
			</text>
			<rect x={160} y={5} width={12} height={12} {...codeChip} rx={3} />
			<text x={178} y={15} fontSize="12" fill={fg}>
				{L.legendCode}
			</text>

			{/* 필수 요건 */}
			<text x={NAME_X} y={42} fontSize="12.5" fontWeight="700" fill={fg}>
				{L.mustHead}
			</text>
			<text x={NAME_X} y={58} fontSize="11.5" fill={muted}>
				{L.depthMap}
			</text>
			{L.must.map((name, i) => row(MUST_TOP, i, name, L.depth, WEIGHTS[i]))}

			{/* 우대 조건 */}
			<text x={NAME_X} y={PREF_HEAD} fontSize="12.5" fontWeight="700" fill={fg}>
				{L.prefHead}
			</text>
			{L.pref.map((chip, i) => row(PREF_TOP, i, i === 0 ? L.prefName : "", chip, PREF_WEIGHTS[i]))}

			{/* 가중 합 */}
			<rect x={SUM_X} y={SUM_TOP} width={SUM_W} height={SUM_BOTTOM - SUM_TOP} {...codeChip} rx={10} />
			<text x={SUM_X + SUM_W / 2} y={(SUM_TOP + SUM_BOTTOM) / 2 - 6} fontSize="20" textAnchor="middle" fill={fg}>
				Σ
			</text>
			<text x={SUM_X + SUM_W / 2} y={(SUM_TOP + SUM_BOTTOM) / 2 + 16} fontSize="12.5" fontWeight="600" textAnchor="middle" fill={fg}>
				{L.sum}
			</text>
			<line x1={SUM_X + SUM_W / 2} x2={SUM_X + SUM_W / 2} y1={SUM_BOTTOM} y2={ORDER_Y - 1} {...wire} strokeOpacity={1} markerEnd="url(#jv-sr-arrow)" />

			{/* 관문: 가중 합과 따로 적용한다 */}
			<rect x={NAME_X} y={GATE_Y} width={GATE_W} height={GATE_H} {...codeChip} strokeWidth={1.8} rx={8} />
			<text x={NAME_X + 10} y={GATE_Y + 22} fontSize="11.5" fill={fg}>
				{L.gate[0]}
				<tspan className="jv-blue" fontWeight="700">
					{L.gate[1]}
				</tspan>
			</text>
			<text x={NAME_X + 10} y={GATE_Y + 41} fontSize="11.5" fontWeight="600" fill={fg}>
				{L.gate[2]}
			</text>
			<line x1={NAME_X + GATE_W} x2={SUM_X - 1} y1={GATE_Y + GATE_H / 2} y2={GATE_Y + GATE_H / 2} {...wire} strokeOpacity={1} markerEnd="url(#jv-sr-arrow)" />
			<rect x={SUM_X} y={ORDER_Y} width={SUM_W} height={ORDER_H} {...codeChip} rx={8} />
			<text x={SUM_X + SUM_W / 2} y={ORDER_Y + ORDER_H / 2 + 4} fontSize="12.5" fontWeight="700" textAnchor="middle" fill={fg}>
				{L.order}
			</text>
			<text x={NAME_X} y={NOTE_Y} fontSize="11.5" fill={muted}>
				{L.gateNote}
			</text>

			{/* 저장 메모 */}
			<line x1={8} x2={W - 8} y1={RULE_Y} y2={RULE_Y} stroke="var(--border)" strokeWidth="1" />
			{L.memo.map((line, i) => (
				<text key={line} x={NAME_X} y={MEMO_Y + i * 16} fontSize="11.5" fill={muted}>
					{line}
				</text>
			))}
		</svg>
	);
}

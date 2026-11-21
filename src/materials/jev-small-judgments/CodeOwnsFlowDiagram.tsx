import { SVG_STYLE } from "./colors";

// 흐름은 코드가 갖고 Jev는 흐릿한 판단 한 칸만 채운다는 것을 두 줄기로 보인다. 정적 SVG로 SSR에서만 렌더링한다.
// 왼쪽 줄기(코드)에서 내려오던 흐름이 셋째 칸에서만 오른쪽(Jev)으로 건너갔다가 다시 코드로 돌아온다.
const LABELS = {
	ko: {
		code: "코드가 맡는다",
		jev: "Jev가 맡는다",
		steps: [
			{ title: "입력 정리", sub: "state를 칸으로 나눈다" },
			{ title: "규칙으로 거르기", sub: "코드로 가릴 수 있는 것" },
			{ title: "흐릿한 판단 하나", sub: "확률을 돌려준다" },
			{ title: "문턱과 분기", sub: "확률로 구간을 나눈다" },
			{ title: "실행", sub: "태그, 순서, 넘기기" },
		],
		aria: "흐름은 코드가 맡고 Jev는 판단 한 칸만 채운다는 것을 보여 주는 그림. 코드가 입력을 정리하고 규칙으로 거른 뒤, 흐릿한 판단 하나만 Jev에 넘긴다. Jev가 확률을 돌려주면 다시 코드가 문턱과 분기로 구간을 나누고, 태그를 붙이거나 순서를 매기거나 사람에게 넘기는 실행까지 맡는다.",
	},
	en: {
		code: "Code owns",
		jev: "Jev owns",
		steps: [
			{ title: "Prepare input", sub: "Split state into fields" },
			{ title: "Filter by rules", sub: "What code can decide" },
			{ title: "One fuzzy judgment", sub: "Returns probabilities" },
			{ title: "Thresholds, branches", sub: "Bands from probabilities" },
			{ title: "Act", sub: "Tag, order, hand off" },
		],
		aria: "Diagram showing that code owns the flow and Jev fills in a single judgment. Code prepares the input and filters by rules, then hands only one fuzzy judgment to Jev. When Jev returns probabilities, code takes over again, splitting them into bands with thresholds and branches and acting on them by tagging, ordering, or handing off to a person.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 400;
const PAD = 8;
const LANE_TOP = 8;
const HEAD_H = 28;
const CODE_X = PAD;
const CODE_W = 222;
const JEV_X = CODE_X + CODE_W + 12;
const JEV_W = W - PAD - JEV_X;
const BOX_INSET = 12;
const BOX_H = 40;
const ROW_GAP = 16;
const FIRST_ROW = LANE_TOP + HEAD_H + 10;
const JEV_STEP = 2; // 셋째 칸만 Jev 줄기에 놓는다
const rowY = (i: number) => FIRST_ROW + i * (BOX_H + ROW_GAP);
const LANE_BOTTOM = rowY(4) + BOX_H + 12;
const HEIGHT = LANE_BOTTOM + PAD;

const CODE_BOX_X = CODE_X + BOX_INSET;
const CODE_BOX_W = CODE_W - BOX_INSET * 2;
const JEV_BOX_X = JEV_X + 6;
const JEV_BOX_W = JEV_W - 12;
const CODE_MID = CODE_BOX_X + CODE_BOX_W / 2;
const JEV_MID = JEV_BOX_X + JEV_BOX_W / 2;
const ARROW_ID = "jv-cof-arrow";

export default function CodeOwnsFlowDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const wire = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, fill: "none", markerEnd: `url(#${ARROW_ID})` } as const;
	const top = (i: number) => rowY(i);
	const bottom = (i: number) => rowY(i) + BOX_H;
	const mid = (i: number) => rowY(i) + BOX_H / 2;
	return (
		<svg viewBox={`0 0 ${W} ${HEIGHT}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<defs>
				<marker id={ARROW_ID} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M0 0L10 5L0 10z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			{/* 두 줄기 */}
			<rect x={CODE_X} y={LANE_TOP} width={CODE_W} height={LANE_BOTTOM - LANE_TOP} rx={10} className="jv-box jv-box-line" strokeWidth={1} />
			<rect x={JEV_X} y={LANE_TOP} width={JEV_W} height={LANE_BOTTOM - LANE_TOP} rx={10} className="jv-blue-soft" />
			<text x={CODE_X + CODE_W / 2} y={LANE_TOP + 19} fontSize="12.5" fontWeight="700" textAnchor="middle" fill="var(--foreground)">
				{L.code}
			</text>
			<text x={JEV_X + JEV_W / 2} y={LANE_TOP + 19} fontSize="12.5" fontWeight="700" textAnchor="middle" className="jv-blue">
				{L.jev}
			</text>

			{/* 화살표: 코드 줄기를 내려오다 셋째 칸에서만 Jev로 건너갔다 돌아온다 */}
			<line x1={CODE_MID} x2={CODE_MID} y1={bottom(0)} y2={top(1) - 1} {...wire} />
			<path d={`M${CODE_BOX_X + CODE_BOX_W} ${mid(1)} H${JEV_MID} V${top(JEV_STEP) - 1}`} {...wire} />
			<path d={`M${JEV_MID} ${bottom(JEV_STEP)} V${mid(3)} H${CODE_BOX_X + CODE_BOX_W + 1}`} {...wire} />
			<line x1={CODE_MID} x2={CODE_MID} y1={bottom(3)} y2={top(4) - 1} {...wire} />

			{L.steps.map((step, i) => {
				const isJev = i === JEV_STEP;
				const x = isJev ? JEV_BOX_X : CODE_BOX_X;
				const w = isJev ? JEV_BOX_W : CODE_BOX_W;
				return (
					<g key={step.title}>
						<rect
							x={x}
							y={top(i)}
							width={w}
							height={BOX_H}
							rx={8}
							fill="var(--background)"
							className={isJev ? "jv-blue-line" : undefined}
							stroke={isJev ? undefined : "rgb(var(--gray))"}
							strokeOpacity={isJev ? 1 : 0.5}
							strokeWidth={isJev ? 1.8 : 1.2}
						/>
						<text x={x + w / 2} y={top(i) + 17} fontSize="12.5" fontWeight="600" textAnchor="middle" fill="var(--foreground)">
							{step.title}
						</text>
						<text x={x + w / 2} y={top(i) + 32} fontSize="11" textAnchor="middle" fill="var(--muted-foreground)">
							{step.sub}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

// 설계 B의 job 트리. 맨 위의 리포트 job 밑에 계획 job과 세대별 발송 job이 붙고,
// 계획 job은 세대마다 그룹 생성 자식을 기다리며, 발송 job은 청크 담기 자식을 기다린다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		reportSub: "리포트 · 마지막에 한 번",
		planSub: "세대를 나눈다",
		sendSubs: ["1세대 · 1만 건", "2세대 · 1만 건", "3세대 · 5천 건"],
		createSub: "세대당 하나 × 3",
		stageSubs: ["청크 × 10", "청크 × 10", "청크 × 5"],
		attach: "계획 job이 opts.parent로 붙인다",
		wait: "waiting-children",
		flow: "FlowProducer로 세대마다 한 번에 넣는다",
		caption: ["선은 자식에서 부모로 이어진다.", "부모는 끝나지 않은 자식이 없을 때 실행된다."],
		aria: "설계 B의 job 트리. 맨 위의 batch.report 아래에 계획 job인 batch.plan과 세대별 group.send 셋이 자식으로 붙는다. 계획 job은 세대마다 group.create 자식을 waiting-children으로 기다려 그룹 id를 받고, 세대마다 group.send를 부모로, 청크를 담는 group.stage를 자식으로 한 flow를 FlowProducer로 넣어 리포트 job 밑에 붙인다. 1세대와 2세대는 청크 10개, 3세대는 청크 5개다. 부모는 끝나지 않은 자식이 없을 때 실행된다.",
	},
	en: {
		reportSub: "report · runs once at the end",
		planSub: "splits the batch",
		sendSubs: ["gen 1 · 10,000", "gen 2 · 10,000", "gen 3 · 5,000"],
		createSub: "one per gen × 3",
		stageSubs: ["chunks × 10", "chunks × 10", "chunks × 5"],
		attach: "the plan job attaches each via opts.parent",
		wait: "waiting-children",
		flow: "added per generation by FlowProducer",
		caption: ["Lines run from child to parent.", "A parent runs once none of its children is left unfinished."],
		aria: "Design B's job tree. Under batch.report at the top sit the plan job batch.plan and one group.send per generation. For each generation the plan job waits on a group.create child through waiting-children to get the group id, then adds a flow with group.send as the parent and group.stage chunk jobs as children through FlowProducer, attached under the report job. Generations 1 and 2 have 10 chunks, generation 3 has 5. A parent runs once none of its children is left unfinished.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 470;
const COL_W = 108;
const GAP = 6;
const X0 = 10;
const colX = (i: number) => X0 + i * (COL_W + GAP);
const colC = (i: number) => colX(i) + COL_W / 2;

const REPORT = { x: 135, y: 12, w: 200, h: 48 };
const ROW2 = { y: 112, h: 48 };
const ROW3 = { y: 214, h: 44 };
const H = 316;

export default function PlanFlowDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const mono = 'ui-monospace, "SF Mono", Menlo, monospace';
	const box = {
		fill: "var(--secondary)",
		stroke: "rgb(var(--gray))",
		strokeOpacity: 0.45,
	} as const;
	const writer = {
		fill: "var(--secondary)",
		stroke: "var(--accent)",
		strokeOpacity: 0.75,
	} as const;
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 7,
		strokeLinejoin: "round",
	} as const;
	const edge = {
		stroke: "rgb(var(--gray))",
		strokeOpacity: 0.7,
		strokeWidth: 1.4,
		markerEnd: "url(#pf-arrow)",
	} as const;
	const reportC = REPORT.x + REPORT.w / 2;

	const node = (x: number, y: number, w: number, h: number, title: string, sub: string, style: typeof box | typeof writer, titleSize = 13) => (
		<g>
			<rect x={x} y={y} width={w} height={h} rx="8" {...style} />
			<text x={x + w / 2} y={y + h / 2 - 3} textAnchor="middle" fontSize={titleSize} fontWeight="700" fontFamily={mono} fill="var(--foreground)">
				{title}
			</text>
			<text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{sub}
			</text>
		</g>
	);

	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: W, margin: "2rem auto" }}>
			<defs>
				<marker id="pf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			{/* 2행 → 리포트: 계획 job과 세대별 발송 job이 리포트 job의 자식이다. */}
			{[0, 1, 2, 3].map((i) => (
				<line key={i} x1={colC(i)} y1={ROW2.y} x2={reportC + (i - 1.5) * 34} y2={REPORT.y + REPORT.h + 2} {...edge} />
			))}
			<text x={colC(2)} y="90" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)" {...halo}>
				{T.attach}
			</text>

			{/* 3행 → 2행: 그룹 생성은 계획 job의, 청크 담기는 발송 job의 자식이다. */}
			{[0, 1, 2, 3].map((i) => (
				<line key={i} x1={colC(i)} y1={ROW3.y - 4} x2={colC(i)} y2={ROW2.y + ROW2.h + 2} {...edge} />
			))}
			<text x={colC(0)} y="191" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)" {...halo}>
				{T.wait}
			</text>
			<text x={(colC(1) + colC(3)) / 2} y="191" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)" {...halo}>
				{T.flow}
			</text>

			{node(REPORT.x, REPORT.y, REPORT.w, REPORT.h, "batch.report", T.reportSub, writer)}
			{node(colX(0), ROW2.y, COL_W, ROW2.h, "batch.plan", T.planSub, writer)}
			{[1, 2, 3].map((i) => (
				<g key={i}>{node(colX(i), ROW2.y, COL_W, ROW2.h, "group.send", T.sendSubs[i - 1], box)}</g>
			))}

			{/* 3행: 여러 개를 겹친 카드로 보여 준다. */}
			{[0, 1, 2, 3].map((i) => (
				<g key={i}>
					<rect x={colX(i) + 6} y={ROW3.y + 6} width={COL_W - 6} height={ROW3.h} rx="8" {...box} />
					<rect x={colX(i) + 3} y={ROW3.y + 3} width={COL_W - 6} height={ROW3.h} rx="8" {...box} />
					{node(colX(i), ROW3.y, COL_W - 6, ROW3.h, i === 0 ? "group.create" : "group.stage", i === 0 ? T.createSub : T.stageSubs[i - 1], box, 12)}
				</g>
			))}

			<text x={W / 2} y={H - 26} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{T.caption[0]}
			</text>
			<text x={W / 2} y={H - 9} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{T.caption[1]}
			</text>
		</svg>
	);
}

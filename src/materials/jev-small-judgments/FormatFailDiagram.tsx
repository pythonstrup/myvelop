import { SVG_STYLE } from "./colors";

// 문항마다 따로 물은 Haiku 3번과 Jev 5번의 답을 질문 20칸 격자로 보여준다. 정적 SVG로 SSR에서만 렌더링한다.
// 빨간 칸은 질문 이름을 키로 쓰라는 지시를 어기고 키 없이 답한 호출이다. 칸 순서는 글의 질문 표 순서다.
const QUESTIONS = [
	"relevant",
	"must_api",
	"must_traffic",
	"must_db",
	"must_incident",
	"pref_lead",
	"pref_domain",
	"pref_k8s",
	"scope",
	"depth",
	"impact",
	"scale",
	"growth",
	"helping",
	"specific",
	"stack_kotlin",
	"stack_spring",
	"stack_kafka",
	"stack_aws",
	"own_role",
];
const HAIKU_FAILED = [
	["depth", "helping", "must_api", "must_traffic", "own_role", "pref_k8s", "pref_lead", "stack_aws", "stack_kafka", "stack_kotlin", "stack_spring"],
	["must_incident", "must_traffic", "pref_k8s", "pref_lead", "scale", "stack_aws", "stack_kafka"],
	["depth", "growth", "must_api", "must_db", "must_traffic", "pref_k8s", "pref_lead", "scale", "stack_aws", "stack_kafka", "stack_kotlin"],
];
// 묶음마다 첫 칸 위치와 칸 수. 한 칸짜리 묶음(직무 관련성, 본인 역할)은 이름을 달지 않는다.
const GROUPS = [
	{ from: 1, size: 4 },
	{ from: 5, size: 3 },
	{ from: 8, size: 7 },
	{ from: 15, size: 4 },
];

const GRID_X = 82;
const CELL = 12;
const PITCH = 14;
const ROW_PITCH = 17;
const COUNT_X = 394;
const Y_HAIKU_HEAD = 44;
const Y_HAIKU = 52;
const Y_JEV_HEAD = Y_HAIKU + 3 * ROW_PITCH + 18;
const Y_JEV = Y_JEV_HEAD + 8;
const Y_GROUP = Y_JEV + CELL + 12;
const cellX = (i: number) => GRID_X + i * PITCH;

const LABELS = {
	ko: {
		legend: ["키 없이 답했다", "정해진 모양으로 답했다"],
		legendX: 150,
		haikuHead: "Haiku 5.5 · 문항마다 따로 20번",
		jevHead: "Jev · 한 요청에 20개",
		haikuRows: ["차례로", "동시에 1", "동시에 2"],
		jevRow: "5번 모두",
		groups: ["필수 요건", "우대", "이력의 면·기록", "기술 스택"],
		aria: "문항마다 따로 물은 Haiku 3번과 Jev 5번의 답을 질문 20칸 격자로 나타낸 그림. 질문 이름을 키로 쓰라고 지시했지만 Haiku는 차례로 보낸 실행에서 11칸, 동시에 보낸 두 실행에서 7칸과 11칸이 키 없이 답했다. must_traffic, pref_k8s, pref_lead, stack_aws, stack_kafka는 세 번 모두 키가 없었다. Jev는 다섯 번 모두 20칸이 정해진 모양으로 왔다.",
	},
	en: {
		legend: ["Answered without the key", "Answered in the fixed shape"],
		legendX: 182,
		haikuHead: "Haiku 5.5 · 20 separate calls",
		jevHead: "Jev · 20 in one request",
		haikuRows: ["Sequential", "Concurrent 1", "Concurrent 2"],
		jevRow: "All 5 runs",
		groups: ["Required", "Pref.", "Career facets", "Stack"],
		aria: "Grid of 20 question cells for 3 Haiku runs that asked each question separately and 5 Jev runs. The prompt said to use the question name as the key, yet Haiku answered without the key in 11 cells in the sequential run and in 7 and 11 cells in the two concurrent runs. must_traffic, pref_k8s, pref_lead, stack_aws, and stack_kafka lacked the key in all three. Jev returned all 20 cells in the fixed shape in every one of five runs.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function FormatFailDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const fg = "var(--foreground)";
	const row = (y: number, failed: readonly string[], label: string) => (
		<g key={label}>
			<text x={8} y={y + CELL - 2} fontSize="11" fill={fg}>
				{label}
			</text>
			{QUESTIONS.map((q, i) => (
				<rect
					key={q}
					x={cellX(i)}
					y={y}
					width={CELL}
					height={CELL}
					rx={2}
					className={failed.includes(q) ? "jv-red" : "jv-green-soft"}
				/>
			))}
			<text x={COUNT_X} y={y + CELL - 2} fontSize="11" fontWeight="600" textAnchor="end" fill={failed.length ? fg : muted}>
				{`${failed.length}/20`}
			</text>
		</g>
	);
	return (
		<svg viewBox="0 0 400 186" role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>

			{/* 범례 */}
			<rect x={8} y={8} width={CELL} height={CELL} rx={2} className="jv-red" />
			<text x={26} y={18} fontSize="11.5" fill={fg}>
				{L.legend[0]}
			</text>
			<rect x={L.legendX} y={8} width={CELL} height={CELL} rx={2} className="jv-green-soft" />
			<text x={L.legendX + 18} y={18} fontSize="11.5" fill={fg}>
				{L.legend[1]}
			</text>

			<text x={8} y={Y_HAIKU_HEAD} fontSize="11" fontWeight="600" fill={muted}>
				{L.haikuHead}
			</text>
			{HAIKU_FAILED.map((failed, i) => row(Y_HAIKU + i * ROW_PITCH, failed, L.haikuRows[i]))}

			<text x={8} y={Y_JEV_HEAD} fontSize="11" fontWeight="600" fill={muted}>
				{L.jevHead}
			</text>
			{row(Y_JEV, [], L.jevRow)}

			{/* 묶음 이름 */}
			{GROUPS.map((g, i) => {
				const left = cellX(g.from);
				const right = cellX(g.from + g.size - 1) + CELL;
				return (
					<g key={g.from}>
						<line x1={left} x2={right} y1={Y_GROUP} y2={Y_GROUP} stroke={muted} strokeWidth="1" />
						<text x={(left + right) / 2} y={Y_GROUP + 14} fontSize="11" textAnchor="middle" fill={muted}>
							{L.groups[i]}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

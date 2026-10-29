import type { Lang } from "./lang";

// 임베딩 검색의 네 단계. 위 줄은 문서를 넣을 때, 아래 줄은 질문이 올 때다.
// 임베딩 모델(뜻을 안다)과 벡터 DB(거리만 잰다)를 테두리 색으로 가른다. 정적 SVG — SSR로만 렌더링한다.
const LABELS = {
	ko: {
		row1: "넣을 때 · 문서마다 한 번",
		row2: "물을 때 · 질문마다",
		row1Boxes: [
			["문서", "조문"],
			["임베딩 모델", "① 벡터로 바꾼다"],
			["벡터", "숫자 1024개"],
			["벡터 DB", "② 저장한다"],
		],
		row2Boxes: [
			["질문", "사용자가 쓴 문장"],
			["임베딩 모델", "③ 벡터로 바꾼다"],
			["벡터", "숫자 1024개"],
			["벡터 DB", "④ 가까운 k개"],
		],
		sameModel: "같은 모델",
		sameStore: "같은 저장소",
		legendModel: "뜻을 아는 쪽 · 임베딩 모델",
		legendDb: "거리만 재는 쪽 · 벡터 DB",
		aria: "임베딩 검색의 네 단계. 문서를 넣을 때는 임베딩 모델이 문서를 숫자 1024개짜리 벡터로 바꾸고(1단계) 벡터 DB가 저장한다(2단계). 질문이 올 때마다 같은 임베딩 모델이 질문을 벡터로 바꾸고(3단계) 같은 벡터 DB가 가장 가까운 문서 k개를 찾는다(4단계). 뜻을 아는 쪽은 임베딩 모델이고, 벡터 DB는 거리만 잰다.",
	},
	en: {
		row1: "Indexing · once per document",
		row2: "Querying · every question",
		row1Boxes: [
			["Document", "an article"],
			["Embedding model", "① to a vector"],
			["Vector", "1,024 numbers"],
			["Vector DB", "② stores it"],
		],
		row2Boxes: [
			["Question", "the user's text"],
			["Embedding model", "③ to a vector"],
			["Vector", "1,024 numbers"],
			["Vector DB", "④ k nearest"],
		],
		sameModel: "same model",
		sameStore: "same store",
		legendModel: "knows meaning · embedding model",
		legendDb: "only measures distance · vector DB",
		aria: "The four steps of embedding search. When a document is added, the embedding model turns it into a vector of 1,024 numbers (step 1) and the vector DB stores it (step 2). For every question, the same embedding model turns the question into a vector (step 3) and the same vector DB finds the k nearest documents (step 4). Only the embedding model knows meaning; the vector DB only measures distance.",
	},
} as const satisfies Record<Lang, unknown>;

const BOX_W = 94;
const BOX_H = 54;
const XS = [8, 124, 240, 356];
const ROW1_Y = 34;
const ROW2_Y = 150;

type Kind = "data" | "model" | "db";
const KINDS: readonly Kind[] = ["data", "model", "data", "db"];

const STYLE = {
	data: { stroke: "var(--border)", dash: undefined, sub: "var(--muted-foreground)" },
	model: { stroke: "var(--accent)", dash: undefined, sub: "var(--accent)" },
	db: { stroke: "var(--foreground)", dash: "5 3", sub: "var(--foreground)" },
} as const;

function Row({ y, boxes }: { y: number; boxes: readonly (readonly [string, string])[] }) {
	return (
		<g>
			{boxes.map(([title, sub], i) => {
				const s = STYLE[KINDS[i]];
				const x = XS[i];
				return (
					<g key={title + sub}>
						<rect
							x={x}
							y={y}
							width={BOX_W}
							height={BOX_H}
							rx="6"
							fill="var(--secondary)"
							stroke={s.stroke}
							strokeWidth={KINDS[i] === "data" ? 1 : 1.8}
							strokeDasharray={s.dash}
						/>
						<text x={x + BOX_W / 2} y={y + 23} textAnchor="middle" fontSize={title.length > 12 ? 10 : title.length > 9 ? 11 : 13} fontWeight="600" fill="var(--foreground)">
							{title}
						</text>
						<text x={x + BOX_W / 2} y={y + 41} textAnchor="middle" fontSize="11" fill={s.sub}>
							{sub}
						</text>
						{i < boxes.length - 1 && (
							<line
								x1={x + BOX_W + 3}
								y1={y + BOX_H / 2}
								x2={XS[i + 1] - 4}
								y2={y + BOX_H / 2}
								stroke="rgb(var(--gray))"
								strokeWidth="1.5"
								markerEnd="url(#sp-arrow)"
							/>
						)}
					</g>
				);
			})}
		</g>
	);
}

export default function SearchPipelineDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 6,
		strokeLinejoin: "round",
	} as const;
	const link = (x: number, label: string) => (
		<g>
			<line
				x1={x}
				y1={ROW1_Y + BOX_H + 4}
				x2={x}
				y2={ROW2_Y - 4}
				stroke="rgb(var(--gray))"
				strokeWidth="1.2"
				strokeDasharray="3 3"
			/>
			<text x={x} y={(ROW1_Y + BOX_H + ROW2_Y) / 2 + 4} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" {...halo}>
				{label}
			</text>
		</g>
	);

	return (
		<svg
			viewBox="0 0 460 278"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<defs>
				<marker id="sp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<text x={XS[0]} y="22" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{t.row1}
			</text>
			<Row y={ROW1_Y} boxes={t.row1Boxes} />

			{/* 두 줄의 모델과 저장소는 같은 것이다 */}
			{link(XS[1] + BOX_W / 2, t.sameModel)}
			{link(XS[3] + BOX_W / 2, t.sameStore)}

			<text x={XS[0]} y={ROW2_Y - 12} fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{t.row2}
			</text>
			<Row y={ROW2_Y} boxes={t.row2Boxes} />

			<rect x="12" y="232" width="18" height="12" rx="3" fill="var(--secondary)" stroke="var(--accent)" strokeWidth="1.8" />
			<text x="38" y="242" fontSize="12" fill="var(--foreground)">
				{t.legendModel}
			</text>
			<rect x="12" y="254" width="18" height="12" rx="3" fill="var(--secondary)" stroke="var(--foreground)" strokeWidth="1.8" strokeDasharray="5 3" />
			<text x="38" y="264" fontSize="12" fill="var(--foreground)">
				{t.legendDb}
			</text>
		</svg>
	);
}

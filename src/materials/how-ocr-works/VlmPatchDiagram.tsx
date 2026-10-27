import { CARD_H, ContractCard, contractItems, type Lang, shift, textWidth } from "./FictionalContract";

// VLM이 이미지를 읽는 순서. 가린 계약서를 격자 조각으로 자르고, 조각마다 토큰이 되어 질문 토큰과 함께 LLM에 들어가면, LLM이 답을 한 토큰씩 글로 쓴다.
// 첫 그림(검출 상자 → 좌표)과 나란히 보도록 같은 계약서를 쓴다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		step1: "① 이미지를 조각으로 자른다",
		step1Out: "조각 하나 = 토큰 하나",
		edge: "조각마다 벡터로 바꾼다",
		step2: "② 이미지 토큰과 질문을 함께 읽는다",
		prompt: ["계약서", "항목을", "JSON으로"],
		llm: "LLM — 다음 토큰을 하나씩 이어 쓴다",
		step3: "③ 결과는 글이다",
		step3Out: "상자 좌표도, 단어별 신뢰도도 없다",
		output: ['{"title":', '"용역', '계약서",', '"name":', '"홍길동",', "…"],
		aria: "VLM이 이미지를 읽는 순서. 민감정보를 가린 가상의 용역 계약서 위에 격자를 그어 작은 조각으로 자르고, 조각마다 벡터로 바꿔 이미지 토큰을 만든다. 이미지 토큰과 질문 토큰을 함께 LLM에 넣으면 LLM이 다음 토큰을 하나씩 이어 써서 JSON 글을 만든다. 결과에는 상자 좌표도 단어별 신뢰도도 없다.",
	},
	en: {
		step1: "① Cut the image into patches",
		step1Out: "one patch = one token",
		edge: "turn each patch into a vector",
		step2: "② Read image tokens with the question",
		prompt: ["extract", "fields", "as JSON"],
		llm: "LLM — writes the next token, one at a time",
		step3: "③ The result is text",
		step3Out: "no boxes, no per-word confidence",
		output: ['{"title":', '"Service', 'Agreement",', '"name":', "…"],
		aria: "How a VLM reads an image. A grid cuts the masked fictional service agreement into small patches, and each patch becomes a vector, an image token. The image tokens go into the LLM together with the question tokens, and the LLM writes a JSON answer one token at a time. The result carries no box coordinates and no per-word confidence.",
	},
} as const satisfies Record<Lang, unknown>;

const CARD_TOP = 38;
const PATCH = 19;
const IMAGE_TOKENS = 9;
const CHIP_H = 24;
const CHIP_FONT = 12;

export default function VlmPatchDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const sensitive = contractItems(lang).filter((it) => it.sensitive);
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 8,
		strokeLinejoin: "round",
	} as const;
	const chip = { rx: 4, fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.6 } as const;
	const chipW = (s: string) => textWidth(s, CHIP_FONT) + 12;

	const cardBottom = CARD_TOP + CARD_H;
	const step2Y = cardBottom + 64;
	const tokensY = step2Y + 12;
	const llmY = tokensY + CHIP_H + 30;
	const step3Y = llmY + 32 + 34;
	const outY = step3Y + 12;

	// ② 이미지 토큰(네모) 뒤에 질문 토큰(글자 칩)을 붙인다
	const promptChips: { s: string; x: number; w: number }[] = [];
	let cursor = 40 + IMAGE_TOKENS * 20 + 22;
	for (const s of t.prompt) {
		const w = chipW(s);
		promptChips.push({ s, x: cursor, w });
		cursor += w + 6;
	}
	const outputChips: { s: string; x: number; w: number }[] = [];
	cursor = 40;
	for (const s of t.output) {
		const w = chipW(s);
		outputChips.push({ s, x: cursor, w });
		cursor += w + 6;
	}

	return (
		<svg
			viewBox={`0 0 460 ${outY + CHIP_H + 10}`}
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<defs>
				<marker id="vp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
				<clipPath id="vp-card">
					<rect x="40" y={CARD_TOP} width="380" height={CARD_H} rx="8" />
				</clipPath>
			</defs>

			<text x="40" y="24" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.step1}
			</text>
			<text x="420" y="24" textAnchor="end" fontSize="12.5" fill="var(--accent)">
				{t.step1Out}
			</text>
			{/* VLM에 넘어가는 것은 가린 계약서다 */}
			<ContractCard lang={lang} top={CARD_TOP} hidden={sensitive.map((it) => it.key)}>
				{sensitive.map((it) => (
					<rect key={it.key} {...shift(it.box, CARD_TOP)} rx="2" fill="var(--foreground)" />
				))}
				<g clipPath="url(#vp-card)" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="0.75">
					{Array.from({ length: Math.ceil(380 / PATCH) - 1 }, (_, i) => (
						<line key={`v${i}`} x1={40 + PATCH * (i + 1)} y1={CARD_TOP} x2={40 + PATCH * (i + 1)} y2={cardBottom} />
					))}
					{Array.from({ length: Math.ceil(CARD_H / PATCH) - 1 }, (_, i) => (
						<line key={`h${i}`} x1="40" y1={CARD_TOP + PATCH * (i + 1)} x2="420" y2={CARD_TOP + PATCH * (i + 1)} />
					))}
				</g>
			</ContractCard>

			<line x1="230" y1={cardBottom} x2="230" y2={step2Y - 22} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#vp-arrow)" />
			<text x="230" y={cardBottom + 24} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)" {...halo}>
				{t.edge}
			</text>

			<text x="40" y={step2Y} fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.step2}
			</text>
			{Array.from({ length: IMAGE_TOKENS }, (_, i) => (
				<rect key={i} x={40 + i * 20} y={tokensY + 4} width="16" height="16" rx="3" fill="var(--accent)" fillOpacity="0.2" stroke="var(--accent)" strokeOpacity="0.7" />
			))}
			<text x={40 + IMAGE_TOKENS * 20 + 2} y={tokensY + 17} fontSize="13" fill="var(--muted-foreground)">
				…
			</text>
			{promptChips.map(({ s, x, w }) => (
				<g key={s}>
					<rect x={x} y={tokensY} width={w} height={CHIP_H} {...chip} />
					<text x={x + w / 2} y={tokensY + 16} textAnchor="middle" fontSize={CHIP_FONT} fill="var(--foreground)">
						{s}
					</text>
				</g>
			))}

			<line x1="230" y1={tokensY + CHIP_H + 4} x2="230" y2={llmY - 4} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#vp-arrow)" />
			<rect x="40" y={llmY} width="380" height="32" rx="8" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.7" />
			<text x="230" y={llmY + 21} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--accent)">
				{t.llm}
			</text>
			<line x1="230" y1={llmY + 32} x2="230" y2={step3Y - 22} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#vp-arrow)" />

			<text x="40" y={step3Y} fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.step3}
			</text>
			<text x="420" y={step3Y} textAnchor="end" fontSize="12.5" fill="var(--destructive)">
				{t.step3Out}
			</text>
			{/* 답은 왼쪽부터 한 토큰씩 쓰인다: 뒤로 갈수록 옅게 */}
			{outputChips.map(({ s, x, w }, i) => (
				<g key={s} opacity={1 - (i / outputChips.length) * 0.5}>
					<rect x={x} y={outY} width={w} height={CHIP_H} {...chip} />
					<text x={x + w / 2} y={outY + 16} textAnchor="middle" fontSize={CHIP_FONT} fill="var(--foreground)">
						{s}
					</text>
				</g>
			))}
		</svg>
	);
}

import { CONTRACT, ContractCard, contractItems, type Lang, shift } from "./FictionalContract";

// OCR의 두 단계 요약도. 위는 검출(상자 = 좌표), 아래는 인식(조각 → 문자열 + 신뢰도). 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		step1: "① 검출",
		step1Out: "결과: 상자의 좌표",
		edge: "상자만큼 잘라 넘긴다",
		step2: "② 인식",
		step2Out: "결과: 문자열 + 신뢰도",
		aria: "OCR의 두 단계. 검출 단계에서는 가상의 용역 계약서 이미지에서 제목, 성명, 주민등록번호, 사업자등록번호, 본문 글자가 있는 곳마다 상자를 치고 그 좌표만 돌려준다. 인식 단계에서는 상자만큼 잘라낸 조각을 받아 용역 계약서, 주민등록번호, 000000-0000000 같은 문자열과 0.99, 0.97 같은 신뢰도를 돌려준다.",
	},
	en: {
		step1: "① Detection",
		step1Out: "output: box coordinates",
		edge: "crop each box and pass it on",
		step2: "② Recognition",
		step2Out: "output: string + confidence",
		aria: "The two stages of OCR. Detection draws a box wherever text appears on a fictional service agreement — the title, name, resident number, business number, and body text — and returns only the coordinates. Recognition takes each cropped box and returns a string such as Service Agreement, Resident No., or 000000-0000000 along with a confidence such as 0.99 or 0.97.",
	},
} as const satisfies Record<Lang, unknown>;

const CARD_TOP = 38;

export default function DetectRecognizeDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const doc = CONTRACT[lang];
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 8,
		strokeLinejoin: "round",
	} as const;
	const detect = {
		fill: "none",
		stroke: "var(--accent)",
		strokeWidth: 1.5,
		strokeDasharray: "4 3",
		rx: 3,
	} as const;

	const items = contractItems(lang);
	const titleBox = shift(items[0].box, CARD_TOP);
	const crops = [
		{ text: doc.title, conf: "0.99" },
		{ text: doc.rows[1][0], conf: "0.99" },
		{ text: doc.rows[1][1], conf: "0.97" },
	];

	return (
		<svg
			viewBox="0 0 460 452"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<defs>
				<marker id="dr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<text x="40" y="24" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.step1}
			</text>
			<text x="420" y="24" textAnchor="end" fontSize="12.5" fill="var(--accent)">
				{t.step1Out}
			</text>

			{/* 가상 계약서 한 장: 글자마다 검출 상자를 친다 */}
			<ContractCard lang={lang} top={CARD_TOP}>
				{items.map((it) => (
					<rect key={it.key} {...shift(it.box, CARD_TOP)} {...detect} />
				))}
				<text x={titleBox.x - 4} y={titleBox.y - 4} textAnchor="end" fontSize="10" fill="var(--accent)">
					(x₁, y₁)
				</text>
				<text x={titleBox.x + titleBox.width + 4} y={titleBox.y + titleBox.height + 10} fontSize="10" fill="var(--accent)">
					(x₂, y₂)
				</text>
			</ContractCard>

			<line x1="230" y1="236" x2="230" y2="290" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#dr-arrow)" />
			<text x="230" y="267" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)" {...halo}>
				{t.edge}
			</text>

			<text x="40" y="318" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.step2}
			</text>
			<text x="420" y="318" textAnchor="end" fontSize="12.5" fill="var(--accent)">
				{t.step2Out}
			</text>

			{/* 왼쪽은 잘라낸 이미지 조각, 오른쪽은 인식기가 돌려준 문자열과 신뢰도다 */}
			{crops.map(({ text, conf }, i) => {
				const top = 334 + i * 40;
				return (
					<g key={text}>
						<rect x="40" y={top} width="160" height="30" rx="3" fill="var(--secondary)" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" />
						<text x="120" y={top + 20} textAnchor="middle" fontSize="13" fontWeight={i === 0 ? 700 : 400} fill="var(--foreground)">
							{text}
						</text>
						<line x1="206" y1={top + 15} x2="236" y2={top + 15} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#dr-arrow)" />
						<text x="244" y={top + 20} fontSize="13" fill="var(--foreground)">
							"{text}"
						</text>
						<text x="420" y={top + 20} textAnchor="end" fontSize="12.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--muted-foreground)">
							{conf}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

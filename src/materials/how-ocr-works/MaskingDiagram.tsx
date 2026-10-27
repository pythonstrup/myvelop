import { ContractCard, contractItems, type Lang, shift } from "./FictionalContract";

// 마스킹 전후 요약도. 첫 그림과 같은 가상 계약서에서 주민등록번호와 사업자등록번호 값의 검출 상자를 찾고, 그 상자만큼 덮는다.
// 덮개는 글자 색(--foreground)을 쓴다. 다크 테마에서는 계약서 그림 전체가 반전되므로 덮개도 밝게 보인다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		step1: "① 가리기 전",
		step1Out: "형식과 라벨로 찾은 값",
		edge: "boundingPoly만큼 덮는다",
		step2: "② 가린 뒤",
		step2Out: "이 이미지를 VLM에 넘긴다",
		aria: "마스킹 전후. 가리기 전에는 가상의 용역 계약서에서 주민등록번호와 사업자등록번호 값에 빨간 상자가 쳐져 있다. 그 상자의 좌표만큼 덮으면, 가린 뒤의 계약서에는 두 번호 자리가 사각형으로 덮이고 나머지 글자는 그대로 남는다. 이 이미지를 VLM에 넘긴다.",
	},
	en: {
		step1: "① Before masking",
		step1Out: "values found by format and label",
		edge: "cover each boundingPoly",
		step2: "② After masking",
		step2Out: "this image goes to the VLM",
		aria: "Before and after masking. Before, red boxes mark the resident number and business number values on a fictional service agreement. Covering those boxes leaves the two numbers hidden under solid rectangles while the rest of the text stays. This image is what goes to the VLM.",
	},
} as const satisfies Record<Lang, unknown>;

const TOP_BEFORE = 38;
const TOP_AFTER = 332;

export default function MaskingDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const sensitive = contractItems(lang).filter((it) => it.sensitive);
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 8,
		strokeLinejoin: "round",
	} as const;

	return (
		<svg
			viewBox="0 0 460 540"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<defs>
				<marker id="mk-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<text x="40" y="24" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.step1}
			</text>
			<text x="420" y="24" textAnchor="end" fontSize="12.5" fill="var(--destructive)">
				{t.step1Out}
			</text>
			<ContractCard lang={lang} top={TOP_BEFORE}>
				{sensitive.map((it) => (
					<rect key={it.key} {...shift(it.box, TOP_BEFORE)} rx="3" fill="var(--destructive)" fillOpacity="0.1" stroke="var(--destructive)" strokeWidth="1.5" />
				))}
			</ContractCard>

			<line x1="230" y1={TOP_BEFORE + 198} x2="230" y2={TOP_AFTER - 42} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#mk-arrow)" />
			<text x="230" y={TOP_BEFORE + 229} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)" {...halo}>
				{t.edge}
			</text>

			<text x="40" y={TOP_AFTER - 14} fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.step2}
			</text>
			<text x="420" y={TOP_AFTER - 14} textAnchor="end" fontSize="12.5" fill="var(--accent)">
				{t.step2Out}
			</text>
			{/* 가린 자리의 글자는 아예 그리지 않는다. 덮개만 남는다 */}
			<ContractCard lang={lang} top={TOP_AFTER} hidden={sensitive.map((it) => it.key)}>
				{sensitive.map((it) => (
					<rect key={it.key} {...shift(it.box, TOP_AFTER)} rx="2" fill="var(--foreground)" />
				))}
			</ContractCard>
		</svg>
	);
}

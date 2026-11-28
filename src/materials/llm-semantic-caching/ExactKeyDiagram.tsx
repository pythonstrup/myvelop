import type { Lang } from "./data";

// 뜻이 같은 두 질문이 해시를 거치면 전혀 다른 키가 되어, 두 번째 질문이 응답 캐시를 놓치는 모습을 보여주는 정적 그림.
// 해시는 질문 글자만 SHA-256으로 계산한 값의 앞 여덟 자리다. 영어 그림은 영어 질문을 해시한 값이다.
const LABELS = {
	ko: {
		aria: "뜻이 같은 두 질문이 응답 캐시에서 다른 칸으로 가는 그림. 먼저 온 질문 「환불은 어떻게 하나요?」는 SHA-256으로 해시하면 c526bf69로 시작하고, 이 키로 답이 저장되어 있다. 나중에 온 질문 「환불하려면 어떻게 해야 하나요?」는 1a70a3c2로 시작하는 전혀 다른 키가 되어, 저장된 답을 찾지 못하고 모델을 다시 부른다.",
		rows: [
			{ when: "먼저 온 질문", q: "환불은 어떻게 하나요?", key: "c526bf69…", result: "답이 저장되어 있다" },
			{ when: "나중에 온 질문", q: "환불하려면 어떻게 해야 하나요?", key: "1a70a3c2…", result: "비어 있다. 모델을 다시 부른다" },
		],
		hash: "해시",
		footer: "뜻은 같은데 키에는 닮은 데가 없다",
		qWidth: 226,
		qSize: 13,
	},
	en: {
		aria: "Two questions with the same meaning landing in different slots of a response cache. The first question, \"How do I get a refund?\", hashes with SHA-256 to a key starting with 60fd55b8, and an answer is stored under that key. The later question, \"What do I need to do to get a refund?\", hashes to a completely different key starting with 2c59c942, finds no stored answer, and calls the model again.",
		rows: [
			{ when: "First question", q: "How do I get a refund?", key: "60fd55b8…", result: "An answer is stored" },
			{ when: "Later question", q: "What do I need to do to get a refund?", key: "2c59c942…", result: "Empty. The model is called again" },
		],
		hash: "hash",
		footer: "Same meaning, but nothing alike in the keys",
		qWidth: 246,
		qSize: 12.5,
	},
};
const ROW_Y = [14, 118];

export default function ExactKeyDiagram({ lang = "ko" }: { lang?: Lang }) {
	const l = LABELS[lang];
	const arrowX = l.qWidth + 12;
	return (
		<svg viewBox="0 0 400 216" role="img" aria-label={l.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<marker id="exact-key-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			{l.rows.map((r, i) => {
				const y = ROW_Y[i];
				const hit = i === 0;
				return (
					<g key={r.key}>
						<text x="8" y={y + 4} fontSize="11.5" fill="var(--muted-foreground)">
							{r.when}
						</text>
						<rect x="8" y={y + 12} width={l.qWidth} height="32" rx="8" fill="var(--secondary)" />
						<text x={8 + l.qWidth / 2} y={y + 32.5} textAnchor="middle" fontSize={l.qSize} fill="var(--foreground)">
							{r.q}
						</text>
						<line x1={arrowX} y1={y + 28} x2="290" y2={y + 28} stroke="rgb(var(--gray))" strokeWidth="1.4" markerEnd="url(#exact-key-arrow)" />
						<text x={(arrowX + 290) / 2} y={y + 21} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
							{l.hash}
						</text>
						<rect
							x="294"
							y={y + 12}
							width="98"
							height="32"
							rx="8"
							fill={hit ? "var(--accent)" : "none"}
							fillOpacity={hit ? 0.12 : 1}
							stroke={hit ? "var(--accent)" : "rgb(var(--gray))"}
							strokeDasharray={hit ? undefined : "4 3"}
							strokeWidth="1.4"
						/>
						<text x="343" y={y + 32.5} textAnchor="middle" fontSize="13" fontFamily="var(--font-mono, monospace)" fill="var(--foreground)">
							{r.key}
						</text>
						<text x="392" y={y + 62} textAnchor="end" fontSize="11.5" fill={hit ? "var(--accent)" : "var(--muted-foreground)"}>
							{r.result}
						</text>
					</g>
				);
			})}
			<text x="200" y="208" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{l.footer}
			</text>
		</svg>
	);
}

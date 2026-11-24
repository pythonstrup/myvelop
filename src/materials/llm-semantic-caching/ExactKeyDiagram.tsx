// 뜻이 같은 두 질문이 해시를 거치면 전혀 다른 키가 되어, 두 번째 질문이 응답 캐시를 놓치는 모습을 보여주는 정적 그림.
// 해시는 질문 글자만 SHA-256으로 계산한 값의 앞 여덟 자리다.
const ARIA =
	"뜻이 같은 두 질문이 응답 캐시에서 다른 칸으로 가는 그림. 먼저 온 질문 「환불은 어떻게 하나요?」는 SHA-256으로 해시하면 c526bf69로 시작하고, 이 키로 답이 저장되어 있다. 나중에 온 질문 「환불하려면 어떻게 해야 하나요?」는 1a70a3c2로 시작하는 전혀 다른 키가 되어, 저장된 답을 찾지 못하고 모델을 다시 부른다.";

const ROWS = [
	{ y: 14, when: "먼저 온 질문", q: "환불은 어떻게 하나요?", key: "c526bf69…", result: "답이 저장되어 있다", hit: true },
	{ y: 118, when: "나중에 온 질문", q: "환불하려면 어떻게 해야 하나요?", key: "1a70a3c2…", result: "비어 있다. 모델을 다시 부른다", hit: false },
];

export default function ExactKeyDiagram() {
	return (
		<svg viewBox="0 0 400 216" role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<marker id="exact-key-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			{ROWS.map((r) => (
				<g key={r.key}>
					<text x="8" y={r.y + 4} fontSize="11.5" fill="var(--muted-foreground)">
						{r.when}
					</text>
					<rect x="8" y={r.y + 12} width="226" height="32" rx="8" fill="var(--secondary)" />
					<text x="121" y={r.y + 32.5} textAnchor="middle" fontSize="13" fill="var(--foreground)">
						{r.q}
					</text>
					<line x1="238" y1={r.y + 28} x2="290" y2={r.y + 28} stroke="rgb(var(--gray))" strokeWidth="1.4" markerEnd="url(#exact-key-arrow)" />
					<text x="262" y={r.y + 21} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
						해시
					</text>
					<rect
						x="294"
						y={r.y + 12}
						width="98"
						height="32"
						rx="8"
						fill={r.hit ? "var(--accent)" : "none"}
						fillOpacity={r.hit ? 0.12 : 1}
						stroke={r.hit ? "var(--accent)" : "rgb(var(--gray))"}
						strokeDasharray={r.hit ? undefined : "4 3"}
						strokeWidth="1.4"
					/>
					<text x="343" y={r.y + 32.5} textAnchor="middle" fontSize="13" fontFamily="var(--font-mono, monospace)" fill="var(--foreground)">
						{r.key}
					</text>
					<text x="392" y={r.y + 62} textAnchor="end" fontSize="11.5" fill={r.hit ? "var(--accent)" : "var(--muted-foreground)"}>
						{r.result}
					</text>
				</g>
			))}
			<text x="200" y="208" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				뜻은 같은데 키에는 닮은 데가 없다
			</text>
		</svg>
	);
}

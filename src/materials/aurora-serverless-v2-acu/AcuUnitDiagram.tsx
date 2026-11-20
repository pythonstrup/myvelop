// 1 ACU가 무엇을 묶은 단위인지, 4 ACU가 그것을 넷 쌓은 것임을 보여주는 정적 그림.
const ARIA =
	"1 ACU는 메모리 약 2GiB와 그에 맞는 CPU, 네트워크를 하나로 묶은 단위다. 이 묶음 넷을 쌓으면 4 ACU가 되고, 메모리 약 8GiB짜리 서버와 비슷하다.";

export default function AcuUnitDiagram() {
	const part = { fill: "var(--background)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
	const unit = { fill: "var(--secondary)", stroke: "var(--accent)", strokeOpacity: 0.7 } as const;
	return (
		<svg viewBox="0 0 480 240" role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<marker id="acu-unit-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<text x="110" y="24" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--accent)">
				1 ACU
			</text>
			<rect x="30" y="38" width="160" height="152" rx="10" {...unit} />
			<rect x="42" y="50" width="136" height="58" rx="6" {...part} />
			<text x="110" y="84" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--foreground)">
				메모리 약 2GiB
			</text>
			<rect x="42" y="116" width="136" height="30" rx="6" {...part} />
			<text x="110" y="136" textAnchor="middle" fontSize="13" fill="var(--foreground)">
				그만큼의 CPU
			</text>
			<rect x="42" y="152" width="136" height="30" rx="6" {...part} />
			<text x="110" y="172" textAnchor="middle" fontSize="13" fill="var(--foreground)">
				그만큼의 네트워크
			</text>
			<text x="110" y="214" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				메모리를 기준으로 센다
			</text>

			<line x1="204" y1="114" x2="266" y2="114" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#acu-unit-arrow)" />
			<text x="235" y="104" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				넷을 쌓으면
			</text>

			<text x="370" y="24" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--accent)">
				4 ACU
			</text>
			{[0, 1, 2, 3].map((i) => (
				<g key={i}>
					<rect x="290" y={38 + i * 38.5} width="160" height="33" rx="6" {...unit} />
					<text x="370" y={59 + i * 38.5} textAnchor="middle" fontSize="12.5" fill="var(--foreground)">
						1 ACU · 메모리 약 2GiB
					</text>
				</g>
			))}
			<text x="370" y="214" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				메모리 약 8GiB짜리 서버와 비슷하다
			</text>
		</svg>
	);
}

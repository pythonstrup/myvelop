// 클러스터 단위 값이 인스턴스들의 평균이라 최대에 닿은 writer가 가려지는 것을 보여주는 정적 그림.
const ARIA =
	"막대 세 개를 견준 그림. writer는 최대 20 ACU에 닿아 있고 reader는 2 ACU에 머문다. 클러스터 단위 값은 둘의 평균인 11 ACU로 나와서, writer가 최대에 닿았다는 사실이 보이지 않는다.";

// 0~20 ACU를 높이 160으로 그린다.
const BASE = 210;
const h = (acu: number) => acu * 8;

export default function ClusterAverageDiagram() {
	const bars = [
		{ cx: 90, acu: 20, name: "writer", note: "Role=WRITER로 읽는 값", accent: true },
		{ cx: 240, acu: 2, name: "reader", note: "", accent: false },
		{ cx: 390, acu: 11, name: "클러스터 단위 값", note: "(20 + 2) ÷ 2", accent: false },
	] as const;
	return (
		<svg viewBox="0 0 480 262" role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<line x1="30" y1={BASE - h(20)} x2="460" y2={BASE - h(20)} stroke="rgb(var(--gray))" strokeDasharray="5 4" />
			<text x="460" y={BASE - h(20) - 8} textAnchor="end" fontSize="12" fill="var(--muted-foreground)">
				최대 20 ACU
			</text>
			<line x1="30" y1={BASE} x2="460" y2={BASE} stroke="rgb(var(--gray))" strokeOpacity="0.6" />

			{bars.map((b) => (
				<g key={b.name}>
					<rect
						x={b.cx - 36}
						y={BASE - h(b.acu)}
						width="72"
						height={h(b.acu)}
						rx="4"
						fill={b.accent ? "var(--accent)" : "var(--secondary)"}
						fillOpacity={b.accent ? 0.25 : 1}
						stroke={b.accent ? "var(--accent)" : "rgb(var(--gray))"}
						strokeOpacity={b.accent ? 0.9 : 0.6}
						strokeDasharray={b.name === "reader" || b.accent ? undefined : "4 3"}
					/>
					<text
						x={b.cx}
						y={b.accent ? BASE - h(b.acu) + 22 : BASE - h(b.acu) - 8}
						textAnchor="middle"
						fontSize="14"
						fontWeight="700"
						fill={b.accent ? "var(--accent)" : "var(--foreground)"}
					>
						{b.acu} ACU
					</text>
					<text x={b.cx} y={BASE + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
						{b.name}
					</text>
					{b.note && (
						<text x={b.cx} y={BASE + 42} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
							{b.note}
						</text>
					)}
				</g>
			))}
			<text x="390" y={BASE - h(11) - 30} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				최댓값에 닿은 writer가 가려진다
			</text>
		</svg>
	);
}

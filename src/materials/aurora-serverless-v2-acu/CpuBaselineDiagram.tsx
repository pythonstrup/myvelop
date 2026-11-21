// CPUUtilization과 FreeableMemory가 지금 용량이 아니라 최대 ACU를 기준으로 계산되는 것을 보여주는 정적 그림.
const ARIA =
	"최대를 20 ACU로 정한 클러스터의 인스턴스가 지금 4 ACU에서 일하는 상황. 4 ACU 몫의 CPU를 다 써도 CPUUtilization은 최대 20 ACU의 CPU를 기준으로 계산되어 20%로 나온다. FreeableMemory도 최대 20 ACU, 약 40GiB를 기준으로 계산되어, 지금 쓰는 약 8GiB가 꽉 차도 아직 받지 않은 약 32GiB가 남은 메모리로 나온다.";

// 20 ACU를 폭 440으로 그린다.
const X0 = 20;
const FULL = 440;
const PART = (FULL * 4) / 20;

export default function CpuBaselineDiagram() {
	const track = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.5 } as const;
	const used = { fill: "var(--accent)", fillOpacity: 0.3, stroke: "var(--accent)" } as const;
	return (
		<svg viewBox="0 0 480 300" role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<pattern id="cpu-baseline-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<line x1="0" y1="0" x2="0" y2="8" stroke="rgb(var(--gray))" strokeOpacity="0.45" strokeWidth="2" />
				</pattern>
			</defs>

			<text x={X0} y="22" fontSize="15" fontWeight="700" fill="var(--foreground)">
				CPUUtilization
			</text>
			<text x={X0} y="46" fontSize="12.5" fill="var(--muted-foreground)">
				지표가 쓰는 기준: 최대 20 ACU에서 쓸 수 있는 CPU
			</text>
			<rect x={X0} y="54" width={FULL} height="24" rx="4" {...track} />
			<rect x={X0} y="54" width={PART} height="24" rx="4" {...used} />
			<text x={X0 + PART + 10} y="71" fontSize="14" fontWeight="700" fill="var(--accent)">
				20%
			</text>
			<text x={X0} y="104" fontSize="12.5" fill="var(--muted-foreground)">
				지금 용량 4 ACU를 기준으로 보면
			</text>
			<rect x={X0} y="112" width={PART} height="24" rx="4" {...used} />
			<text x={X0 + PART + 10} y="129" fontSize="14" fontWeight="700" fill="var(--accent)">
				100%
			</text>

			<text x={X0} y="180" fontSize="15" fontWeight="700" fill="var(--foreground)">
				FreeableMemory
			</text>
			<text x={X0} y="204" fontSize="12.5" fill="var(--muted-foreground)">
				지표가 쓰는 기준: 최대 20 ACU, 메모리 약 40GiB
			</text>
			<rect x={X0} y="212" width={FULL} height="28" rx="4" {...track} />
			<rect x={X0 + PART} y="212" width={FULL - PART} height="28" rx="4" fill="url(#cpu-baseline-hatch)" />
			<rect x={X0} y="212" width={PART} height="28" rx="4" {...used} />
			<text x={X0 + PART / 2} y="231" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--accent)">
				약 8GiB 사용
			</text>
			<text
				x={X0 + PART + (FULL - PART) / 2}
				y="231"
				textAnchor="middle"
				fontSize="12.5"
				fontWeight="600"
				fill="var(--foreground)"
				style={{ paintOrder: "stroke", stroke: "var(--secondary)", strokeWidth: 6, strokeLinejoin: "round" }}
			>
				아직 받지 않은 약 32GiB도 남은 메모리로 센다
			</text>
			<text x={X0} y="268" fontSize="12.5" fill="var(--muted-foreground)">
				지금 메모리가 꽉 차도 FreeableMemory는 약 32GiB로 나온다
			</text>
		</svg>
	);
}

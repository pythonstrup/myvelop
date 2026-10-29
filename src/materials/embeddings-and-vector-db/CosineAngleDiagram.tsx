import type { Lang } from "./lang";

// 「가까움은 방향으로 잰다」의 벡터 a·b·d 를 평면에 그린다. a·b 는 길이 1이라 단위원 위에 끝나고,
// d 는 b 와 방향이 같고 길이만 2배다. 정적 SVG — SSR로만 렌더링한다.
const LABELS = {
	ko: {
		unit: "길이 1인 원",
		dLen: "‖d‖ = 2",
		rows: [
			["(0.6, 0.8)", '질문 "부가세 언제까지 내야 해?"'],
			["(0.8, 0.6)", "부가가치세 확정신고 조문"],
			["(1.6, 1.2)", "b와 방향은 같고 길이만 2배"],
		],
		note: "cos θ = 0.96 · d를 길이 2로 나누면 b가 된다",
		aria: "벡터 세 개를 평면에 그린 그림. 질문 a는 (0.6, 0.8), 부가가치세 확정신고 조문 b는 (0.8, 0.6)이고 둘 다 길이가 1이라 단위원 위에서 끝난다. 두 화살표 사이 각도 θ의 코사인은 0.96이다. d는 (1.6, 1.2)로 b와 같은 방향이고 길이만 2배라, 길이 2로 나누어 정규화하면 b와 같아진다.",
	},
	en: {
		unit: "unit circle",
		dLen: "‖d‖ = 2",
		rows: [
			["(0.6, 0.8)", 'question "When is VAT due?"'],
			["(0.8, 0.6)", "VAT final return article"],
			["(1.6, 1.2)", "same direction as b, twice as long"],
		],
		note: "cos θ = 0.96 · d divided by its length 2 is b",
		aria: "Three vectors on a plane. The question a is (0.6, 0.8) and the VAT final return article b is (0.8, 0.6); both have length 1, so they end on the unit circle. The cosine of the angle θ between them is 0.96. d is (1.6, 1.2): it points the same way as b and is twice as long, so normalizing it by its length 2 gives b.",
	},
} as const satisfies Record<Lang, unknown>;

// 원점 (100, 290), 1 = 125px
const O = { x: 100, y: 290 };
const S = 125;
const pt = (x: number, y: number) => ({ x: O.x + x * S, y: O.y - y * S });
const A = pt(0.6, 0.8);
const B = pt(0.8, 0.6);
const D = pt(1.6, 1.2);

export default function CosineAngleDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 6,
		strokeLinejoin: "round",
	} as const;
	const names = ["a", "b", "d"] as const;
	const colors = ["var(--accent)", "var(--foreground)", "rgb(var(--gray))"] as const;
	// 각도 θ 를 나타내는 호: b 방향에서 a 방향으로 반지름 45
	const arcB = pt(0.8 * 0.36, 0.6 * 0.36);
	const arcA = pt(0.6 * 0.36, 0.8 * 0.36);
	const thetaAt = pt(0.4, 0.4);

	return (
		<svg
			viewBox="0 0 460 420"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<defs>
				{colors.map((c, i) => (
					<marker
						key={names[i]}
						id={`ca-arrow-${names[i]}`}
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="7"
						markerHeight="7"
						orient="auto-start-reverse"
					>
						<path d="M 0 1 L 9 5 L 0 9 z" fill={c} />
					</marker>
				))}
			</defs>

			{/* 축과 눈금 */}
			<line x1={O.x} y1={O.y} x2={O.x + 2.1 * S} y2={O.y} stroke="var(--border)" strokeWidth="1" />
			<line x1={O.x} y1={O.y} x2={O.x} y2={O.y - 1.32 * S} stroke="var(--border)" strokeWidth="1" />
			<text x={O.x + S} y={O.y + 16} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				1
			</text>
			<text x={O.x + 2 * S} y={O.y + 16} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				2
			</text>

			{/* 단위원 4분의 1 */}
			<path
				d={`M ${O.x + S} ${O.y} A ${S} ${S} 0 0 0 ${O.x} ${O.y - S}`}
				fill="none"
				stroke="rgb(var(--gray))"
				strokeWidth="1"
				strokeDasharray="3 3"
			/>
			<text x={O.x + 20} y={O.y - S - 10} fontSize="12" fill="var(--muted-foreground)" {...halo}>
				{t.unit}
			</text>

			{/* d 를 먼저 그리고 b 를 위에 겹친다: 같은 방향이다 */}
			<line x1={O.x} y1={O.y} x2={D.x} y2={D.y} stroke={colors[2]} strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#ca-arrow-d)" />
			<line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={colors[1]} strokeWidth="2.2" markerEnd="url(#ca-arrow-b)" />
			<line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke={colors[0]} strokeWidth="2.2" markerEnd="url(#ca-arrow-a)" />

			<path
				d={`M ${arcB.x} ${arcB.y} A 45 45 0 0 0 ${arcA.x} ${arcA.y}`}
				fill="none"
				stroke="var(--accent)"
				strokeWidth="1.2"
			/>
			<text x={thetaAt.x + 4} y={thetaAt.y + 6} fontSize="13" fontStyle="italic" fill="var(--accent)" {...halo}>
				θ
			</text>

			<text x={A.x - 8} y={A.y - 4} textAnchor="end" fontSize="15" fontWeight="700" fill={colors[0]} {...halo}>
				a
			</text>
			<text x={B.x + 8} y={B.y + 10} fontSize="15" fontWeight="700" fill={colors[1]} {...halo}>
				b
			</text>
			<text x={D.x + 6} y={D.y - 4} fontSize="15" fontWeight="700" fill="var(--muted-foreground)" {...halo}>
				d
			</text>
			<text x={O.x + 1.4 * S + 6} y={O.y - 1.05 * S + 22} fontSize="12" fill="var(--muted-foreground)" {...halo}>
				{t.dLen}
			</text>

			{/* 범례: 벡터 값과 뜻 */}
			{t.rows.map(([coord, desc], i) => {
				const y = 338 + i * 22;
				return (
					<g key={coord}>
						<text x="32" y={y} fontSize="14" fontWeight="700" fill={i === 2 ? "var(--muted-foreground)" : colors[i]}>
							{names[i]}
						</text>
						<text x="52" y={y} fontSize="12.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--foreground)">
							{coord}
						</text>
						<text x="148" y={y} fontSize="12.5" fill="var(--muted-foreground)">
							{desc}
						</text>
					</g>
				);
			})}
			<text x="32" y="406" fontSize="12.5" fill="var(--foreground)">
				{t.note}
			</text>
		</svg>
	);
}

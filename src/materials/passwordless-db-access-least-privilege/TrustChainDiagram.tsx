// IRSA 신뢰 사슬 요약도. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title1: "네임스페이스 + ServiceAccount 이름",
		sub1: "쿠버네티스가 보증",
		edge1: "클러스터 키로 서명된 JWT",
		title2: "OIDC provider",
		sub2: "IAM이 신뢰하도록 등록",
		edge2: "JWKS로 서명 검증 + sub/aud 조건 대조",
		title3: "IAM role",
		sub3: "권한이 붙어 있는 곳",
		aria: "IRSA 신뢰 사슬: 쿠버네티스가 보증하는 네임스페이스와 ServiceAccount 이름이 클러스터 키로 서명된 JWT가 되고, IAM에 등록된 OIDC provider가 JWKS로 서명을 검증하고 sub·aud 조건을 대조한 뒤 권한이 붙어 있는 IAM role로 이어진다.",
	},
	en: {
		title1: "Namespace + ServiceAccount name",
		sub1: "vouched for by Kubernetes",
		edge1: "JWT signed with the cluster key",
		title2: "OIDC provider",
		sub2: "registered as trusted with IAM",
		edge2: "JWKS signature check + sub/aud match",
		title3: "IAM role",
		sub3: "where permissions attach",
		aria: "The IRSA chain of trust: the namespace and ServiceAccount name, vouched for by Kubernetes, become a JWT signed with the cluster key; the OIDC provider registered with IAM verifies the signature via JWKS and matches the sub and aud conditions; the chain ends at the IAM role, where permissions attach.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function TrustChainDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const box = {
		fill: "var(--secondary)",
		stroke: "rgb(var(--gray))",
		strokeOpacity: 0.45,
	} as const;
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 8,
		strokeLinejoin: "round",
	} as const;
	return (
		<svg
			viewBox="0 0 460 340"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<style>{`
				.tc-flow { stroke-dasharray: 5 5; animation: tc-dash 1s linear infinite; }
				@keyframes tc-dash { to { stroke-dashoffset: -10; } }
				@media (prefers-reduced-motion: reduce) { .tc-flow { animation: none; } }
			`}</style>
			<defs>
				<marker id="tc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<rect x="60" y="8" width="340" height="64" rx="10" {...box} />
			<text x="230" y="34" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.title1}
			</text>
			<text x="230" y="56" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{t.sub1}
			</text>

			<line className="tc-flow" x1="230" y1="72" x2="230" y2="130" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#tc-arrow)" />
			<text x="230" y="106" textAnchor="middle" fontSize="13" fill="var(--muted-foreground)" {...halo}>
				{t.edge1}
			</text>

			<rect x="60" y="136" width="340" height="64" rx="10" {...box} />
			<text x="230" y="162" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{t.title2}
			</text>
			<text x="230" y="184" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{t.sub2}
			</text>

			<line className="tc-flow" x1="230" y1="200" x2="230" y2="258" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#tc-arrow)" />
			<text x="230" y="234" textAnchor="middle" fontSize="13" fill="var(--muted-foreground)" {...halo}>
				{t.edge2}
			</text>

			<rect x="60" y="264" width="340" height="64" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.7" />
			<text x="230" y="290" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--accent)">
				{t.title3}
			</text>
			<text x="230" y="312" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{t.sub3}
			</text>
		</svg>
	);
}

// OAC와 WAF에서 접근이 갈리는 지점. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		inside: "사무실 · VPN",
		insideSub: "허용 대역",
		outside: "바깥 인터넷",
		outsideSub: "그 외 전부",
		waf: "WAF",
		wafSub: "IP 확인",
		cf: "CloudFront",
		cfSub: "캐시",
		s3: "S3",
		s3Sub: "원본",
		pass: "통과",
		block: "차단",
		note: "OAC가 버킷을 CloudFront에게만 열어두므로 S3 주소를 알아도 직접 못 읽는다.",
		note2: "확인하는 것이 사람이 아니라 IP라서, 로그에 남는 것도 사람이 아니라 IP다.",
		aria: "OAC와 WAF가 접근을 확인하는 구조도. 사무실과 VPN의 허용 대역에서 온 요청은 WAF를 통과해 CloudFront를 거쳐 S3 원본에 닿지만, 바깥 인터넷에서 온 요청은 WAF에서 차단된다. OAC가 버킷을 CloudFront에게만 열어두어 S3 주소를 알아도 직접 읽을 수 없다.",
	},
} as const;
type Lang = keyof typeof LABELS;

const BOX_H = 46;

export default function NetworkGateDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const plain = {
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

	const box = (x: number, y: number, w: number, title: string, sub: string, accent = false) => (
		<>
			<rect
				x={x}
				y={y}
				width={w}
				height={BOX_H}
				rx="10"
				{...(accent
					? { fill: "var(--secondary)", stroke: "var(--accent)", strokeOpacity: 0.75, strokeWidth: 1.6 }
					: plain)}
			/>
			<text
				x={x + w / 2}
				y={y + 22}
				textAnchor="middle"
				fontSize="14"
				fontWeight="600"
				fill={accent ? "var(--accent)" : "var(--foreground)"}
			>
				{title}
			</text>
			<text
				x={x + w / 2}
				y={y + 38}
				textAnchor="middle"
				fontSize="11.5"
				fill="var(--muted-foreground)"
			>
				{sub}
			</text>
		</>
	);

	return (
		<svg
			viewBox="0 0 520 232"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}
		>
			<defs>
				<marker
					id="ng-arrow"
					viewBox="0 0 10 10"
					refX="8"
					refY="5"
					markerWidth="7"
					markerHeight="7"
					orient="auto-start-reverse"
				>
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			{box(8, 24, 118, t.inside, t.insideSub)}
			{box(8, 118, 118, t.outside, t.outsideSub)}
			{box(176, 71, 96, t.waf, t.wafSub, true)}
			{box(312, 71, 124, t.cf, t.cfSub)}
			{box(456, 71, 56, t.s3, t.s3Sub)}

			<line x1="126" y1="47" x2="172" y2="85" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#ng-arrow)" />
			<text x="140" y="56" fontSize="12" fill="var(--muted-foreground)" {...halo}>
				{t.pass}
			</text>

			<line
				x1="126"
				y1="141"
				x2="152"
				y2="119"
				stroke="var(--destructive)"
				strokeWidth="1.5"
				strokeDasharray="5 4"
			/>
			<g stroke="var(--destructive)" strokeWidth="2" strokeLinecap="round">
				<line x1="155" y1="104" x2="167" y2="116" />
				<line x1="167" y1="104" x2="155" y2="116" />
			</g>
			<text x="154" y="150" textAnchor="middle" fontSize="12" fill="var(--destructive)" {...halo}>
				{t.block}
			</text>

			<line x1="272" y1="94" x2="308" y2="94" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#ng-arrow)" />
			<line x1="436" y1="94" x2="452" y2="94" stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#ng-arrow)" />

			<text x="8" y="200" fontSize="12" fill="var(--muted-foreground)">
				{t.note}
			</text>
			<text x="8" y="220" fontSize="12" fill="var(--muted-foreground)">
				{t.note2}
			</text>
		</svg>
	);
}

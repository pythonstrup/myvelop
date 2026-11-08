// VPC 한 장 그림. 정적 SVG라 client 디렉티브 없이 SSR로만 렌더링하고, 화살표의 흐름만 CSS로 움직인다.
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const GRAY = "rgb(var(--gray))";
const AZS = [
	{ id: "a", pub: "10.0.0.0/24", pri: "10.0.10.0/24", dx: 0, end: false },
	{ id: "b", pub: "10.0.1.0/24", pri: "10.0.11.0/24", dx: 226, end: true },
] as const;
const LABELS = {
	ko: {
		internet: "인터넷",
		az: "가용 영역",
		pub: "퍼블릭 서브넷",
		nat: "NAT 게이트웨이",
		pri: "프라이빗 서브넷",
		node: "노드 EC2",
		nodeSub: "ENI 여러 장 · Pod IP",
		s3Route: "S3 주소",
		igw: "인터넷 게이트웨이",
		s3Endpoint: "S3 게이트웨이 엔드포인트",
		aria: "VPC 10.0.0.0/16 안에 가용 영역 a와 b가 있고, 영역마다 위에는 NAT 게이트웨이가 있는 퍼블릭 서브넷, 아래에는 노드가 있는 프라이빗 서브넷이 있다. 노드는 0.0.0.0/0 줄을 따라 같은 영역의 NAT 게이트웨이로 가고, 인터넷 게이트웨이를 지나 인터넷으로 나간다. S3로 가는 패킷은 S3 주소 줄을 따라 S3 게이트웨이 엔드포인트로 바로 간다.",
	},
	en: {
		internet: "Internet",
		az: "Availability Zone",
		pub: "Public subnet",
		nat: "NAT gateway",
		pri: "Private subnet",
		node: "EC2 node",
		nodeSub: "Multiple ENIs · Pod IPs",
		s3Route: "S3 addresses",
		igw: "Internet gateway",
		s3Endpoint: "S3 gateway endpoint",
		aria: "Inside VPC 10.0.0.0/16 are Availability Zones a and b. Each zone has a public subnet with a NAT gateway above and a private subnet with a node below. The node follows the 0.0.0.0/0 route to the NAT gateway in the same zone, then goes through the internet gateway to the internet. Packets headed for S3 follow the S3 address route straight to the S3 gateway endpoint.",
	},
};
type Lang = keyof typeof LABELS;

export default function VpcOverviewDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const title = { fontSize: 13, fontWeight: 600, fill: "var(--foreground)", textAnchor: "middle" } as const;
	const sub = { fontSize: 11.5, fill: "var(--muted-foreground)" } as const;
	const halo = (bg: string) => ({ paintOrder: "stroke", stroke: bg, strokeWidth: 6, strokeLinejoin: "round" }) as const;
	return (
		<svg
			viewBox="0 0 480 600"
			role="img"
			aria-label={L.aria}
			style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}
		>
			<style>{`
				.vo-flow { stroke-dasharray: 6 5; animation: vo-dash 1.2s linear infinite; }
				@keyframes vo-dash { to { stroke-dashoffset: -11; } }
				@media (prefers-reduced-motion: reduce) { .vo-flow { animation: none; } }
			`}</style>
			<defs>
				<marker id="vo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill={GRAY} />
				</marker>
				<marker id="vo-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent)" />
				</marker>
			</defs>

			<rect x="180" y="8" width="120" height="36" rx="10" fill="var(--secondary)" stroke={GRAY} strokeOpacity="0.45" />
			<text x="240" y="31" {...title}>
				{L.internet}
			</text>

			<rect x="8" y="86" width="464" height="434" rx="14" fill="none" stroke={GRAY} strokeOpacity="0.6" strokeWidth="1.5" />
			<text x="20" y="114" fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
				VPC <tspan fontFamily={MONO}>10.0.0.0/16</tspan>
			</text>

			{AZS.map((az) => {
				const lx = az.end ? 448 : 42;
				const anchor = az.end ? "end" : "start";
				const cx = 127 + az.dx;
				return (
					<g key={az.id}>
						<rect x={20 + az.dx} y="128" width="214" height="372" rx="12" fill="none" stroke={GRAY} strokeOpacity="0.5" strokeDasharray="5 4" />
						<text x={az.end ? 448 : 32} y="148" textAnchor={anchor} fontSize="12" fontWeight="600" fill="var(--muted-foreground)">
							{L.az} {az.id}
						</text>

						<rect x={32 + az.dx} y="160" width="190" height="100" rx="10" fill="var(--secondary)" />
						<text x={lx} y="178" textAnchor={anchor} fontSize="11.5" fontWeight="600" fill="var(--foreground)">
							{L.pub}
						</text>
						<text x={lx} y="194" textAnchor={anchor} fontFamily={MONO} {...sub}>
							{az.pub}
						</text>
						<rect x={cx - 55} y="208" width="110" height="40" rx="8" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.7" />
						<text x={cx} y="233" {...title} fontSize="12.5">
							{L.nat}
						</text>

						<rect x={32 + az.dx} y="282" width="190" height="206" rx="10" fill="var(--secondary)" />
						<text x={lx} y="300" textAnchor={anchor} fontSize="11.5" fontWeight="600" fill="var(--foreground)">
							{L.pri}
						</text>
						<text x={lx} y="316" textAnchor={anchor} fontFamily={MONO} {...sub}>
							{az.pri}
						</text>
						<rect x={cx - 75} y="334" width="150" height="70" rx="10" fill="var(--background)" stroke={GRAY} strokeOpacity="0.6" />
						<text x={cx} y="364" {...title} fontSize="13.5">
							{L.node}
						</text>
						<text x={cx} y="384" textAnchor="middle" {...sub}>
							{L.nodeSub}
						</text>

						<line className="vo-flow" x1={cx} y1="334" x2={cx} y2="252" stroke={GRAY} strokeWidth="1.5" markerEnd="url(#vo-arrow)" />
						<text x={cx} y="275" textAnchor="middle" fontFamily={MONO} {...sub} {...halo("var(--background)")}>
							0.0.0.0/0
						</text>
						<line className="vo-flow" x1={cx} y1="208" x2={az.end ? 278 : 202} y2="106" stroke={GRAY} strokeWidth="1.5" markerEnd="url(#vo-arrow)" />

						<line className="vo-flow" x1={cx} y1="404" x2={az.end ? 278 : 202} y2="500" stroke="var(--accent)" strokeWidth="1.5" markerEnd="url(#vo-arrow-accent)" />
						<text x={az.end ? 318 : 162} y="456" textAnchor="middle" fontSize="11.5" fill="var(--accent)" {...halo("var(--secondary)")}>
							{L.s3Route}
						</text>
					</g>
				);
			})}

			<rect x="165" y="70" width="150" height="32" rx="8" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.7" />
			<text x="240" y="91" {...title} fontSize="12.5">
				{L.igw}
			</text>
			<line className="vo-flow" x1="240" y1="70" x2="240" y2="48" stroke={GRAY} strokeWidth="1.5" markerEnd="url(#vo-arrow)" />

			<rect x="150" y="504" width="180" height="32" rx="8" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.7" />
			<text x="240" y="525" {...title} fontSize="12.5">
				{L.s3Endpoint}
			</text>
			<line className="vo-flow" x1="240" y1="536" x2="240" y2="554" stroke="var(--accent)" strokeWidth="1.5" markerEnd="url(#vo-arrow-accent)" />
			<rect x="200" y="556" width="80" height="36" rx="10" fill="var(--secondary)" stroke={GRAY} strokeOpacity="0.45" />
			<text x="240" y="579" {...title}>
				S3
			</text>
		</svg>
	);
}

// CloudFront signed URL에서 캐시가 동작하는 지점과 키의 위치. 정적 SVG — SSR로만 렌더링한다.
const LABELS = {
	ko: {
		row1: "첫 요청",
		row2: "두 번째부터",
		row3: "키는 어디에 있나",
		browser: "브라우저",
		cf: "CloudFront",
		s3: "S3",
		origin: "원본",
		verify: "서명 검증",
		miss: "캐시 미스",
		hit: "캐시 적중",
		app: "앱 서버",
		privateKey: "개인키로 서명",
		publicKey: "공개키로 검증",
		note: "두 번째 요청은 엣지에서 끝난다. 원본까지 가지 않는다는 점이 앞의 두 방법과 다르다.",
		aria: "CloudFront signed URL의 캐시와 키 구조. 첫 요청은 브라우저에서 CloudFront를 거쳐 S3 원본까지 가지만, 두 번째 요청부터는 CloudFront가 캐시된 사본을 내주고 원본까지 가지 않는다. 서명에 쓰는 개인키는 앱 서버가 들고 있고, 검증에 쓰는 공개키는 CloudFront에 등록되어 있다.",
	},
	en: {
		row1: "First request",
		row2: "From the second on",
		row3: "Where the keys live",
		browser: "Browser",
		cf: "CloudFront",
		s3: "S3",
		origin: "origin",
		verify: "verify",
		miss: "cache miss",
		hit: "cache hit",
		app: "App server",
		privateKey: "private key signs",
		publicKey: "public key verifies",
		note: "The second request ends at the edge, unlike the first two.",
		aria: "Cache and key layout of a CloudFront signed URL. The first request goes from the browser through CloudFront to the S3 origin, but from the second request on CloudFront serves the cached copy and does not reach the origin. The private key used for signing is held by the app server, and the public key used for verification is registered in CloudFront.",
	},
} as const;
type Lang = keyof typeof LABELS;

const COL = { a: 8, b: 190, c: 416 } as const;
const W = { a: 96, b: 140, c: 96 } as const;
const ROWS = [8, 110, 212] as const;
const BOX_H = 46;

export default function CdnCacheDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const plain = {
		fill: "var(--secondary)",
		stroke: "rgb(var(--gray))",
		strokeOpacity: 0.45,
	} as const;

	const box = (
		x: number,
		w: number,
		top: number,
		title: string,
		sub: string,
		accent = false,
		faded = false,
	) => (
		<g opacity={faded ? 0.4 : 1}>
			<rect
				x={x}
				y={top + 24}
				width={w}
				height={BOX_H}
				rx="10"
				{...(accent
					? { fill: "var(--secondary)", stroke: "var(--accent)", strokeOpacity: 0.75, strokeWidth: 1.6 }
					: plain)}
				strokeDasharray={faded ? "5 4" : undefined}
			/>
			<text
				x={x + w / 2}
				y={top + 46}
				textAnchor="middle"
				fontSize="14"
				fontWeight="600"
				fill={accent ? "var(--accent)" : "var(--foreground)"}
			>
				{title}
			</text>
			<text
				x={x + w / 2}
				y={top + 62}
				textAnchor="middle"
				fontSize="11.5"
				fill="var(--muted-foreground)"
			>
				{sub}
			</text>
		</g>
	);

	const arrow = (x1: number, x2: number, top: number, dashed = false) => (
		<line
			x1={x1}
			y1={top + 47}
			x2={x2}
			y2={top + 47}
			stroke="rgb(var(--gray))"
			strokeWidth="1.5"
			strokeDasharray={dashed ? "5 4" : undefined}
			markerEnd="url(#cc-arrow)"
		/>
	);

	const rowTitle = (top: number, text: string) => (
		<text x="8" y={top + 14} fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
			{text}
		</text>
	);

	return (
		<svg
			viewBox="0 0 520 320"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}
		>
			<defs>
				<marker
					id="cc-arrow"
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

			{rowTitle(ROWS[0], t.row1)}
			{box(COL.a, W.a, ROWS[0], t.browser, "")}
			{arrow(COL.a + W.a, COL.b, ROWS[0])}
			{box(COL.b, W.b, ROWS[0], t.cf, `${t.verify} · ${t.miss}`, true)}
			{arrow(COL.b + W.b, COL.c, ROWS[0])}
			{box(COL.c, W.c, ROWS[0], t.s3, t.origin)}

			{rowTitle(ROWS[1], t.row2)}
			{box(COL.a, W.a, ROWS[1], t.browser, "")}
			{arrow(COL.a + W.a, COL.b, ROWS[1])}
			{box(COL.b, W.b, ROWS[1], t.cf, `${t.verify} · ${t.hit}`, true)}
			{box(COL.c, W.c, ROWS[1], t.s3, t.origin, false, true)}

			{rowTitle(ROWS[2], t.row3)}
			{box(COL.a, W.b, ROWS[2], t.app, t.privateKey)}
			{arrow(COL.a + W.b, COL.b, ROWS[2], true)}
			{box(COL.b, W.b, ROWS[2], t.cf, t.publicKey, true)}

			<text x="8" y="310" fontSize="12" fill="var(--muted-foreground)">
				{t.note}
			</text>
		</svg>
	);
}

// 확인하는 곳별로 파일이 지나는 경로 비교도. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		browser: "브라우저",
		origin: "S3",
		originSub: "원본",
		lane1: "서버 프록시",
		lane1Box: "앱 서버",
		lane1Sub: "세션 확인",
		lane2: "presigned URL",
		lane2Sub: "서명 검증",
		lane3: "CloudFront signed URL",
		lane3Box: "CloudFront",
		lane3Sub: "서명 검증 · 캐시",
		lane4: "OAC와 WAF",
		lane4Box: "WAF",
		lane4Sub: "IP 확인",
		lane4Box2: "CloudFront",
		lane4Sub2: "캐시",
		legend: "화살표는 파일이 지나는 경로이고, 강조된 상자가 접근을 확인한다.",
		aria: "확인하는 곳별 파일 경로 비교. 서버 프록시는 브라우저에서 앱 서버를 거쳐 S3로 이어지고 앱 서버가 세션을 확인한다. presigned URL은 브라우저가 S3를 직접 부르고 S3가 서명을 검증한다. CloudFront signed URL은 브라우저에서 CloudFront를 거쳐 S3로 이어지고 CloudFront가 서명을 검증하며 캐시한다. OAC와 WAF는 브라우저에서 WAF와 CloudFront를 거쳐 S3로 이어지고 WAF가 IP를 확인한다.",
	},
	en: {
		browser: "Browser",
		origin: "S3",
		originSub: "origin",
		lane1: "Server proxy",
		lane1Box: "App server",
		lane1Sub: "session check",
		lane2: "presigned URL",
		lane2Sub: "signature check",
		lane3: "CloudFront signed URL",
		lane3Box: "CloudFront",
		lane3Sub: "signature · cache",
		lane4: "OAC and WAF",
		lane4Box: "WAF",
		lane4Sub: "IP check",
		lane4Box2: "CloudFront",
		lane4Sub2: "cache",
		legend: "Arrows are the file's path; the highlighted box checks access.",
		aria: "File paths compared by where access is checked. The server proxy goes from the browser through the app server to S3, and the app server checks the session. The presigned URL has the browser call S3 directly, and S3 checks the signature. The CloudFront signed URL goes from the browser through CloudFront to S3, and CloudFront checks the signature and caches. OAC and WAF go from the browser through WAF and CloudFront to S3, and WAF checks the IP.",
	},
} as const;
type Lang = keyof typeof LABELS;

const LANE_TOPS = [8, 106, 204, 302] as const;
const BOX_H = 46;
const SLOT = { a: 8, b: 120, c: 266, d: 412 } as const;
const W = { a: 78, mid: 112, d: 96 } as const;

export default function JudgePathDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const plain = {
		fill: "var(--secondary)",
		stroke: "rgb(var(--gray))",
		strokeOpacity: 0.45,
	} as const;
	const judge = {
		fill: "var(--secondary)",
		stroke: "var(--accent)",
		strokeOpacity: 0.75,
		strokeWidth: 1.6,
	} as const;

	const box = (
		x: number,
		w: number,
		top: number,
		title: string,
		sub: string,
		isJudge: boolean,
	) => (
		<>
			<rect x={x} y={top + 26} width={w} height={BOX_H} rx="10" {...(isJudge ? judge : plain)} />
			<text
				x={x + w / 2}
				y={top + 48}
				textAnchor="middle"
				fontSize="14"
				fontWeight="600"
				fill={isJudge ? "var(--accent)" : "var(--foreground)"}
			>
				{title}
			</text>
			<text x={x + w / 2} y={top + 64} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{sub}
			</text>
		</>
	);

	const arrow = (x1: number, x2: number, top: number) => (
		<line
			x1={x1}
			y1={top + 49}
			x2={x2}
			y2={top + 49}
			stroke="rgb(var(--gray))"
			strokeWidth="1.5"
			markerEnd="url(#jp-arrow)"
		/>
	);

	const laneTitle = (top: number, text: string) => (
		<text x="8" y={top + 16} fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
			{text}
		</text>
	);

	return (
		<svg
			viewBox="0 0 520 424"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}
		>
			<defs>
				<marker
					id="jp-arrow"
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

			{laneTitle(LANE_TOPS[0], t.lane1)}
			{box(SLOT.a, W.a, LANE_TOPS[0], t.browser, "", false)}
			{arrow(SLOT.a + W.a, SLOT.b, LANE_TOPS[0])}
			{box(SLOT.b, W.mid, LANE_TOPS[0], t.lane1Box, t.lane1Sub, true)}
			{arrow(SLOT.b + W.mid, SLOT.d, LANE_TOPS[0])}
			{box(SLOT.d, W.d, LANE_TOPS[0], t.origin, t.originSub, false)}

			{laneTitle(LANE_TOPS[1], t.lane2)}
			{box(SLOT.a, W.a, LANE_TOPS[1], t.browser, "", false)}
			{arrow(SLOT.a + W.a, SLOT.d, LANE_TOPS[1])}
			{box(SLOT.d, W.d, LANE_TOPS[1], t.origin, t.lane2Sub, true)}

			{laneTitle(LANE_TOPS[2], t.lane3)}
			{box(SLOT.a, W.a, LANE_TOPS[2], t.browser, "", false)}
			{arrow(SLOT.a + W.a, SLOT.b, LANE_TOPS[2])}
			{box(SLOT.b, W.mid, LANE_TOPS[2], t.lane3Box, t.lane3Sub, true)}
			{arrow(SLOT.b + W.mid, SLOT.d, LANE_TOPS[2])}
			{box(SLOT.d, W.d, LANE_TOPS[2], t.origin, t.originSub, false)}

			{laneTitle(LANE_TOPS[3], t.lane4)}
			{box(SLOT.a, W.a, LANE_TOPS[3], t.browser, "", false)}
			{arrow(SLOT.a + W.a, SLOT.b, LANE_TOPS[3])}
			{box(SLOT.b, W.mid, LANE_TOPS[3], t.lane4Box, t.lane4Sub, true)}
			{arrow(SLOT.b + W.mid, SLOT.c, LANE_TOPS[3])}
			{box(SLOT.c, W.mid, LANE_TOPS[3], t.lane4Box2, t.lane4Sub2, false)}
			{arrow(SLOT.c + W.mid, SLOT.d, LANE_TOPS[3])}
			{box(SLOT.d, W.d, LANE_TOPS[3], t.origin, t.originSub, false)}

			<text x="8" y="416" fontSize="12" fill="var(--muted-foreground)">
				{t.legend}
			</text>
		</svg>
	);
}

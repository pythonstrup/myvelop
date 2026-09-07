// presigned URL의 발급·검증·만료 순서도. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		browser: "브라우저",
		app: "앱 서버",
		s3: "S3",
		step1: "① 이 파일 주세요",
		step2: "② 서명된 URL (15분)",
		step3: "③ 서명된 URL로 직접 호출",
		step4: "④ 서명·만료 검증 후 파일",
		step5: "⑤ 15분 뒤 Range 요청은 거절",
		note: "③·④에 앱 서버가 없다. 파일은 브라우저와 S3 사이에서만 오간다.",
		aria: "presigned URL의 순서도. 브라우저가 앱 서버에 파일을 요청하면 앱 서버가 15분짜리 서명된 URL을 돌려주고, 브라우저는 그 URL로 S3를 직접 호출하며, S3가 서명과 만료를 검증한 뒤 파일을 준다. 15분이 지난 뒤의 Range 요청은 거절된다. 파일이 오가는 세 번째와 네 번째 단계에는 앱 서버가 등장하지 않는다.",
	},
	en: {
		browser: "Browser",
		app: "App server",
		s3: "S3",
		step1: "① Give me this file",
		step2: "② Signed URL (15 min)",
		step3: "③ Calls S3 with that URL",
		step4: "④ Verifies, returns the file",
		step5: "⑤ Range after 15 min: refused",
		note: "No app server in ③ and ④. The file moves only between the browser and S3.",
		aria: "Sequence of a presigned URL. The browser asks the app server for a file, the app server returns a signed URL valid for 15 minutes, the browser calls S3 directly with it, and S3 verifies the signature and expiry before returning the file. A Range request after 15 minutes is refused. The app server does not appear in the third and fourth steps where the file moves.",
	},
} as const;
type Lang = keyof typeof LABELS;

const LANES = { browser: 70, app: 260, s3: 450 } as const;
const HEAD_W = 124;
const HEAD_Y = 8;
const HEAD_H = 40;

export default function PresignedFlowDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 8,
		strokeLinejoin: "round",
	} as const;

	const head = (cx: number, title: string) => (
		<>
			<rect
				x={cx - HEAD_W / 2}
				y={HEAD_Y}
				width={HEAD_W}
				height={HEAD_H}
				rx="10"
				fill="var(--secondary)"
				stroke="rgb(var(--gray))"
				strokeOpacity="0.45"
			/>
			<text
				x={cx}
				y={HEAD_Y + HEAD_H / 2 + 5}
				textAnchor="middle"
				fontSize="14"
				fontWeight="600"
				fill="var(--foreground)"
			>
				{title}
			</text>
		</>
	);

	const msg = (from: number, to: number, y: number, label: string, denied = false) => {
		const dir = to > from ? -1 : 1;
		const color = denied ? "var(--destructive)" : "rgb(var(--gray))";
		return (
			<>
				<line
					x1={from}
					y1={y}
					x2={denied ? to - 56 : to + dir * 4}
					y2={y}
					stroke={color}
					strokeWidth="1.5"
					strokeDasharray={denied ? "5 4" : undefined}
					markerEnd={denied ? undefined : "url(#pf-arrow)"}
				/>
				{denied ? (
					<g stroke="var(--destructive)" strokeWidth="2" strokeLinecap="round">
						<line x1={to - 50} y1={y - 6} x2={to - 38} y2={y + 6} />
						<line x1={to - 38} y1={y - 6} x2={to - 50} y2={y + 6} />
					</g>
				) : null}
				<text
					x={(from + to) / 2}
					y={y - 9}
					textAnchor="middle"
					fontSize="12.5"
					fill={denied ? "var(--destructive)" : "var(--muted-foreground)"}
					{...halo}
				>
					{label}
				</text>
			</>
		);
	};

	return (
		<svg
			viewBox="0 0 520 300"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 520, margin: "2rem auto" }}
		>
			<defs>
				<marker
					id="pf-arrow"
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

			{head(LANES.browser, t.browser)}
			{head(LANES.app, t.app)}
			{head(LANES.s3, t.s3)}

			{[LANES.browser, LANES.app, LANES.s3].map((x) => (
				<line
					key={x}
					x1={x}
					y1={HEAD_Y + HEAD_H}
					x2={x}
					y2="262"
					stroke="rgb(var(--gray))"
					strokeOpacity="0.35"
					strokeWidth="1"
					strokeDasharray="4 4"
				/>
			))}

			{msg(LANES.browser, LANES.app, 82, t.step1)}
			{msg(LANES.app, LANES.browser, 124, t.step2)}
			{msg(LANES.browser, LANES.s3, 168, t.step3)}
			{msg(LANES.s3, LANES.browser, 210, t.step4)}
			{msg(LANES.browser, LANES.s3, 254, t.step5, true)}

			<text x="8" y="288" fontSize="12" fill="var(--muted-foreground)">
				{t.note}
			</text>
		</svg>
	);
}

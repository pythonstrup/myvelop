// 발송 서버를 API로 부를 때 카운터가 어디에 있는지를 세 장면으로 나눈 그림.
// 모듈 절과 같은 가정: 세 곳이 5초에 120건을 보내려 하고, 외부 API 한도는 100건이다.
// ① 발송 서버 한 대 ② 로드밸런서 뒤 두 대(카운터가 갈린다) ③ 로드밸런서에서 유량 제어.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		titles: ["① 발송 서버가 한 대일 때", "② 발송 서버를 두 대로 늘렸을 때", "③ 로드밸런서에서 유량을 제어할 때"],
		callers: ["API 서버", "어드민", "배치"],
		http: "HTTP",
		lb: ["로드밸런서"],
		lbLimit: "5초에 100건",
		server: "발송 서버",
		servers: ["발송 서버 1", "발송 서버 2"],
		logic: "발송 로직",
		counter: (n: number) => `카운터 ${n}/100`,
		received: (n: number) => `받은 요청 ${n}건`,
		ok: "한도 안",
		api: "외부 API",
		sent: (n: number) => `${n}건 / 5초`,
		rejected: "429 거절 20건",
		bounced: ["넘친 20건은", "거절된다"],
		notes: [
			["외부 API를 부르는 곳도, 카운터도 발송 서버 하나뿐이다", "발송 로직을 고치면 발송 서버만 다시 배포한다"],
			["로드밸런서가 나눠 보내면 카운터도 발송 서버마다 갈린다", "합치면 다시 한도를 넘는다"],
			["카운터는 다시 한곳에 모였지만, 넘친 요청은 쌓이지 않는다", "재시도와 실패 보상은 부르는 쪽이 각자 맡는다"],
		],
		aria: [
			"발송 서버가 한 대일 때: API 서버, 어드민, 배치가 HTTP로 발송 서버를 부르고, 발송 로직과 카운터를 가진 발송 서버만 외부 API를 부른다. 카운터가 하나라 외부 API에는 5초에 100건만 가서 한도 안이다.",
			"발송 서버를 두 대로 늘렸을 때: API 서버, 어드민, 배치의 요청 120건을 로드밸런서가 두 발송 서버에 60건씩 나눠 보낸다. 두 발송 서버가 카운터를 따로 세어 저마다 한도 안이지만, 외부 API에는 합쳐서 120건이 가서 20건이 429로 거절된다.",
			"로드밸런서에서 유량을 제어할 때: 로드밸런서가 5초에 100건까지만 넘겨 두 발송 서버가 50건씩 받고, 외부 API에는 100건이 가서 한도 안이다. 넘친 20건은 로드밸런서에서 거절되어 쌓이지 않으므로, 재시도와 실패 보상은 부르는 쪽이 각자 맡아야 한다.",
		],
	},
	en: {
		titles: ["① One send server", "② Two send servers", "③ Rate limiting at the load balancer"],
		callers: ["API server", "admin", "batch"],
		http: "HTTP",
		lb: ["load", "balancer"],
		lbLimit: "100 per 5 s",
		server: "send server",
		servers: ["send server 1", "send server 2"],
		logic: "send logic",
		counter: (n: number) => `counter ${n}/100`,
		received: (n: number) => `received ${n}`,
		ok: "within limit",
		api: "external API",
		sent: (n: number) => `${n} / 5 s`,
		rejected: "429: 20 rejected",
		bounced: ["the extra 20", "are rejected"],
		notes: [
			["only the send server calls the external API and counts", "changing the send logic redeploys only the send server"],
			["when the load balancer splits traffic, so do the counters", "together they break the limit again"],
			["the count is in one place again, but excess requests are not kept", "each caller owns its retries and failure handling"],
		],
		aria: [
			"One send server: the API server, admin, and batch call the send server over HTTP, and only the send server, which holds the send logic and the counter, calls the external API. With one counter, only 100 messages per 5 seconds reach the external API, within the limit.",
			"Two send servers: a load balancer splits the 120 requests from the API server, admin, and batch into 60 for each send server. Each send server counts on its own and stays under the limit, but the external API receives 120 in total and rejects 20 with 429.",
			"Rate limiting at the load balancer: the load balancer passes only 100 requests per 5 seconds, 50 to each send server, so the external API receives 100, within the limit. The extra 20 are rejected at the load balancer and not kept, so each caller has to own its retries and failure handling.",
		],
	},
} as const;
type Lang = keyof typeof LABELS;
type Scene = 1 | 2 | 3;

const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const inner = { fill: "var(--background)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const HEIGHTS = { 1: 272, 2: 290, 3: 290 } as const;

function ApiBox({ x, y, w, title, value, status, bad }: { x: number; y: number; w: number; title: string; value: string; status: string; bad: boolean }) {
	const tone = bad ? "var(--destructive)" : "var(--accent)";
	const cx = x + w / 2;
	return (
		<g>
			<rect x={x} y={y} width={w} height={92} rx="10" fill="var(--secondary)" stroke={tone} strokeOpacity="0.8" strokeWidth="1.6" />
			<text x={cx} y={y + 28} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--foreground)">
				{title}
			</text>
			<text x={cx} y={y + 52} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={bad ? tone : "var(--foreground)"}>
				{value}
			</text>
			<text x={cx} y={y + 74} textAnchor="middle" fontSize="12" fontWeight="600" fill={tone}>
				{status}
			</text>
		</g>
	);
}

export default function SendServerDiagram({ scene, lang = "ko" }: { scene: Scene; lang?: Lang }) {
	const T = LABELS[lang];
	const H = HEIGHTS[scene];
	// 한 페이지에 세 장면이 함께 들어가므로 marker id를 장면마다 따로 둔다.
	const arrowId = `ss-arrow-${scene}`;
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: `url(#${arrowId})` } as const;
	const notes = T.notes[scene - 1];
	const noteY = H - 42;
	const callerW = scene === 1 ? 112 : 100;
	const callerYs = [40, 100, 160];
	const limited = scene === 3;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria[scene - 1]} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<defs>
				<marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.titles[scene - 1]}
			</text>
			<text x={scene === 1 ? 142 : 116} y="34" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
				{T.http}
			</text>

			{/* 부르는 쪽 셋 */}
			{T.callers.map((name, i) => (
				<g key={name}>
					<rect x="8" y={callerYs[i]} width={callerW} height="44" rx="10" {...box} />
					<text x={8 + callerW / 2} y={callerYs[i] + 27} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--foreground)">
						{name}
					</text>
				</g>
			))}

			{scene === 1 && (
				<g>
					{callerYs.map((y, i) => (
						<line key={y} {...line} x1="120" y1={y + 22} x2="162" y2={124 + (i - 1) * 24} />
					))}
					<rect x="166" y="72" width="146" height="104" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
					<text x="239" y="97" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
						{T.server}
					</text>
					<rect x="180" y="108" width="118" height="26" rx="6" {...inner} />
					<text x="239" y="125.5" textAnchor="middle" fontSize="12.5" fill="var(--foreground)">
						{T.logic}
					</text>
					<text x="239" y="158" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--accent)">
						{T.counter(100)}
					</text>
					<line {...line} x1="312" y1="124" x2="334" y2="124" />
					<ApiBox x={338} y={78} w={112} title={T.api} value={T.sent(100)} status={T.ok} bad={false} />
				</g>
			)}

			{scene !== 1 && (
				<g>
					{/* 부르는 쪽 → 로드밸런서 */}
					{callerYs.map((y, i) => (
						<line key={y} {...line} x1="108" y1={y + 22} x2="122" y2={122 + (i - 1) * 18} />
					))}
					{/* 로드밸런서. ③에서는 여기서 유량을 센다. */}
					<rect
						x="124"
						y={limited ? 82 : 92}
						width="84"
						height={limited ? 80 : 60}
						rx="10"
						fill="var(--secondary)"
						stroke={limited ? "var(--accent)" : "rgb(var(--gray))"}
						strokeOpacity={limited ? 0.8 : 0.45}
						strokeWidth={limited ? 1.6 : 1}
					/>
					<text x="166" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
						{T.lb.map((part, i) => (
							<tspan key={part} x="166" y={(limited ? 112 : 126) + (i - (T.lb.length - 1) / 2) * 15}>
								{part}
							</tspan>
						))}
					</text>
					{limited && (
						<text x="166" y="146" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--accent)">
							{T.lbLimit}
						</text>
					)}
					{limited && (
						<text x="166" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--destructive)">
							<tspan x="166" y="182">
								{T.bounced[0]}
							</tspan>
							<tspan x="166" y="198">
								{T.bounced[1]}
							</tspan>
						</text>
					)}

					{/* 로드밸런서 → 발송 서버 1·2 → 외부 API */}
					{[36, 132].map((y, i) => (
						<g key={y}>
							<line {...line} x1="208" y1={122 + (i === 0 ? -10 : 10)} x2="224" y2={y + 42} />
							<rect x="226" y={y} width="124" height="84" rx="10" {...box} />
							<text x="288" y={y + 22} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
								{T.servers[i]}
							</text>
							<rect x="236" y={y + 32} width="104" height="24" rx="6" {...inner} />
							<text x="288" y={y + 48.5} textAnchor="middle" fontSize="11.5" fill="var(--foreground)">
								{limited ? T.received(50) : T.counter(60)}
							</text>
							{!limited && (
								<text x="288" y={y + 73} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--accent)">
									{T.ok}
								</text>
							)}
							<line {...line} x1="350" y1={y + 42} x2="364" y2={126 + (i === 0 ? -14 : 14)} />
						</g>
					))}
					<ApiBox
						x={366}
						y={80}
						w={90}
						title={T.api}
						value={T.sent(limited ? 100 : 120)}
						status={limited ? T.ok : T.rejected}
						bad={!limited}
					/>
				</g>
			)}

			<text x="230" y={noteY} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{notes[0]}
			</text>
			<text x="230" y={noteY + 24} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{notes[1]}
			</text>
		</svg>
	);
}

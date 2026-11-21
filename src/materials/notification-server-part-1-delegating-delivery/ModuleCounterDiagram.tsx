// 공유 모듈 방식에서 카운터가 어디에 있느냐에 따라 한도가 지켜지는지를 세 장면으로 나눈 그림.
// 세 장면 모두 5초에 보내려는 양은 120건, 외부 API의 한도는 100건이라고 가정한다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		titles: ["① 서버가 한 대일 때", "② 서버가 셋일 때", "③ 카운터를 Redis로 뺐을 때"],
		one: "모놀리식 서비스",
		oneSub: "서버 한 대",
		module: "발송 모듈",
		oneCounter: "카운터 하나 · 5초에 100건까지",
		api: "외부 API",
		sent: (n: number) => `${n}건 / 5초`,
		ok: "한도 안",
		oneNote: "남은 20건은 카운터가 다음 5초로 미룬다",
		names: ["API 서버", "어드민", "배치"],
		pill: (n: number) => `발송 모듈 · 카운터 ${n}/100`,
		rejected: "429 거절 20건",
		twoNote: "카운터가 서버마다 따로 있어 합친 양을 아는 곳이 없다",
		redis: "Redis 카운터",
		redisSub: "셋이 함께 센다",
		redisCount: "100 / 100건",
		threeNote: "셋이 같은 카운터를 보지만, 공유 저장소가 하나 생겼다",
		half: "거의 큐를 만들어 쓰는 거나 다름없다",
		aria: [
			"서버가 한 대일 때: 모놀리식 서비스가 서버 한 대로 떠 있고, 발송 모듈의 카운터 하나가 5초에 100건까지만 외부 API로 보낸다. 보내려던 120건 가운데 남은 20건은 다음 5초로 미룬다.",
			"서버가 셋일 때: API 서버, 어드민, 배치가 저마다 발송 모듈을 품고 카운터도 따로 센다. 각자 40건, 20건, 60건으로 한도 안이지만, 외부 API에는 합쳐서 120건이 가서 20건이 429로 거절된다.",
			"카운터를 Redis로 뺐을 때: 세 서버의 발송 모듈이 보내기 전에 Redis의 공유 카운터를 확인해 외부 API에는 5초에 100건만 간다. 한도는 지키지만 공유 저장소가 하나 생겨, 거의 큐를 만들어 쓰는 거나 다름없다.",
		],
	},
	en: {
		titles: ["① One server", "② Three servers", "③ The counter moves to Redis"],
		one: "monolithic service",
		oneSub: "a single server",
		module: "send module",
		oneCounter: "one counter · up to 100 per 5 s",
		api: "external API",
		sent: (n: number) => `${n} / 5 s`,
		ok: "within the limit",
		oneNote: "the counter holds the other 20 for the next 5 seconds",
		names: ["API server", "admin", "batch"],
		pill: (n: number) => `send module · counter ${n}/100`,
		rejected: "429: 20 rejected",
		twoNote: "each server counts on its own, so nobody sees the total",
		redis: "Redis counter",
		redisSub: "shared by all three",
		redisCount: "100 / 100",
		threeNote: "all three read one counter, through a new shared store",
		half: "that is close to building your own queue",
		aria: [
			"One server: a monolithic service runs on a single server, and the send module's single counter lets only 100 messages per 5 seconds through to the external API. Of the 120 to send, the remaining 20 wait for the next 5 seconds.",
			"Three servers: the API server, admin, and batch each carry the send module and count on their own. Each stays under the limit at 40, 20, and 60, but the external API receives 120 in total and rejects 20 with 429.",
			"The counter moves to Redis: before sending, each server's send module checks a shared counter in Redis, so only 100 per 5 seconds reach the external API. The limit holds, but a shared store has appeared, which is close to building your own queue.",
		],
	},
} as const;
type Lang = keyof typeof LABELS;
type Scene = 1 | 2 | 3;

const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const inner = { fill: "var(--background)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const HEIGHTS = { 1: 204, 2: 306, 3: 312 } as const;

function Arrowhead({ id }: { id: string }) {
	return (
		<defs>
			<marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
				<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
			</marker>
		</defs>
	);
}

function ApiBox({ x, y, w, h, title, value, status, bad }: { x: number; y: number; w: number; h: number; title: string; value: string; status: string; bad: boolean }) {
	const tone = bad ? "var(--destructive)" : "var(--accent)";
	const cx = x + w / 2;
	return (
		<g>
			<rect x={x} y={y} width={w} height={h} rx="10" fill="var(--secondary)" stroke={tone} strokeOpacity="0.8" strokeWidth="1.6" />
			<text x={cx} y={y + 28} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--foreground)">
				{title}
			</text>
			<text x={cx} y={y + 52} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={bad ? tone : "var(--foreground)"}>
				{value}
			</text>
			<text x={cx} y={y + 74} textAnchor="middle" fontSize="12.5" fontWeight="600" fill={tone}>
				{status}
			</text>
		</g>
	);
}

export default function ModuleCounterDiagram({ scene, lang = "ko" }: { scene: Scene; lang?: Lang }) {
	const T = LABELS[lang];
	const H = HEIGHTS[scene];
	// 한 페이지에 세 장면이 함께 들어가므로 marker id를 장면마다 따로 둔다.
	const arrowId = `mc-arrow-${scene}`;
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: `url(#${arrowId})` } as const;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria[scene - 1]} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<Arrowhead id={arrowId} />
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.titles[scene - 1]}
			</text>

			{scene === 1 && (
				<g>
					<rect x="8" y="34" width="262" height="136" rx="10" {...box} />
					<text x="139" y="60" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
						{T.one}
					</text>
					<text x="139" y="80" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
						{T.oneSub}
					</text>
					<rect x="24" y="94" width="230" height="58" rx="8" {...inner} />
					<text x="139" y="117" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
						{T.module}
					</text>
					<text x="139" y="138" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--accent)">
						{T.oneCounter}
					</text>
					<line {...line} x1="270" y1="102" x2="320" y2="102" />
					<ApiBox x={324} y={56} w={128} h={92} title={T.api} value={T.sent(100)} status={T.ok} bad={false} />
					<text x="230" y="196" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
						{T.oneNote}
					</text>
				</g>
			)}

			{scene === 2 && (
				<g>
					{[40, 20, 60].map((n, i) => {
						const y = 34 + i * 82;
						return (
							<g key={n}>
								<rect x="8" y={y} width="228" height="70" rx="10" {...box} />
								<text x="22" y={y + 24} fontSize="14" fontWeight="600" fill="var(--foreground)">
									{T.names[i]}
								</text>
								<text x="224" y={y + 24} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--accent)">
									{T.ok}
								</text>
								<rect x="20" y={y + 34} width="204" height="26" rx="6" {...inner} />
								<text x="122" y={y + 51.5} textAnchor="middle" fontSize="12" fill="var(--foreground)">
									{T.pill(n)}
								</text>
								<line {...line} x1="236" y1={y + 35} x2="320" y2={154 + (i - 1) * 22} />
							</g>
						);
					})}
					<ApiBox x={324} y={108} w={128} h={92} title={T.api} value={T.sent(120)} status={T.rejected} bad />
					<text x="230" y="298" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
						{T.twoNote}
					</text>
				</g>
			)}

			{scene === 3 && (
				<g>
					{[0, 1, 2].map((i) => {
						const y = 34 + i * 78;
						return (
							<g key={i}>
								<rect x="8" y={y} width="180" height="64" rx="10" {...box} />
								<text x="20" y={y + 23} fontSize="14" fontWeight="600" fill="var(--foreground)">
									{T.names[i]}
								</text>
								<rect x="18" y={y + 32} width="160" height="24" rx="6" {...inner} />
								<text x="98" y={y + 48.5} textAnchor="middle" fontSize="12" fill="var(--foreground)">
									{T.module}
								</text>
								<line {...line} x1="188" y1={y + 32} x2="214" y2={150 + (i - 1) * 18} />
							</g>
						);
					})}
					<rect x="216" y="108" width="106" height="84" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
					<text x="269" y="134" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
						{T.redis}
					</text>
					<text x="269" y="154" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
						{T.redisSub}
					</text>
					<text x="269" y="176" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
						{T.redisCount}
					</text>
					<line {...line} x1="322" y1="150" x2="336" y2="150" />
					<ApiBox x={340} y={104} w={112} h={92} title={T.api} value={T.sent(100)} status={T.ok} bad={false} />
					<text x="230" y="276" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
						{T.threeNote}
					</text>
					<text x="230" y="300" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
						{T.half}
					</text>
				</g>
			)}
		</svg>
	);
}

// 메시지 큐에 맡길 때 한꺼번에 몰린 요청이 어떻게 흘러가는지 보여 주는 그림.
// 앞 절과 같은 가정: 세 곳이 5초에 120건을 넣고, 외부 API 한도는 5초에 100건이다.
// 로드밸런서에서는 거절되던 20건이 큐에서는 다음 5초를 기다린다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "메시지 큐에 맡길 때",
		callers: ["API 서버", "어드민", "배치"],
		put: (n: number) => `${n}건 넣음`,
		queue: "큐",
		stacked: "쌓인 요청 120건",
		now: ["이번 5초", "100건"],
		later: "다음 5초 · 20건",
		worker: ["발송 워커"],
		pace: "5초에 100건",
		api: ["외부 API"],
		sent: "100건 / 5초",
		ok: "한도 안",
		notes: ["로드밸런서라면 거절됐을 20건이 큐에서 다음 5초를 기다린다", "부르는 쪽은 넣자마자 돌아오고, 한도는 워커가 지킨다"],
		aria: "메시지 큐에 맡길 때: API 서버, 어드민, 배치가 5초 동안 40건, 20건, 60건을 큐에 넣고 바로 돌아온다. 큐에 쌓인 120건 가운데 발송 워커가 5초에 100건만 꺼내 외부 API로 보내므로 한도 안이다. 남은 20건은 거절되지 않고 큐에서 기다렸다가 다음 5초에 나간다.",
	},
	en: {
		title: "Handing off to a message queue",
		callers: ["API server", "admin", "batch"],
		put: (n: number) => `${n} queued`,
		queue: "queue",
		stacked: "120 waiting",
		now: ["this 5 s", "100"],
		later: "next 5 s · 20",
		worker: ["send", "worker"],
		pace: "100 per 5 s",
		api: ["external", "API"],
		sent: "100 / 5 s",
		ok: "within limit",
		notes: ["the 20 a load balancer would reject wait for the next 5 s", "callers return at once; the worker keeps the limit"],
		aria: "Handing off to a message queue: the API server, admin, and batch enqueue 40, 20, and 60 messages in 5 seconds and return right away. Of the 120 in the queue, the send worker takes only 100 per 5 seconds to the external API, within the limit. The other 20 are not rejected; they wait in the queue and go out in the next 5 seconds.",
	},
} as const;
type Lang = keyof typeof LABELS;

const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const H = 318;

// 한 줄 또는 두 줄 라벨을 가운데에 놓는다.
function Lines({ x, cy, lines, size, weight, fill, gap = 16 }: { x: number; cy: number; lines: readonly string[]; size: number; weight?: number; fill: string; gap?: number }) {
	return (
		<text x={x} textAnchor="middle" fontSize={size} fontWeight={weight} fill={fill}>
			{lines.map((s, i) => (
				<tspan key={s} x={x} y={cy + size * 0.36 + (i - (lines.length - 1) / 2) * gap}>
					{s}
				</tspan>
			))}
		</text>
	);
}

export default function QueueBufferDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: "url(#qb-arrow)" } as const;
	const noteY = H - 42;
	const two = T.worker.length > 1;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<defs>
				<marker id="qb-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>

			{/* 부르는 쪽 셋: 넣고 바로 돌아온다 */}
			{[40, 20, 60].map((n, i) => {
				const cy = 88 + i * 68;
				return (
					<g key={n}>
						<rect x="8" y={cy - 26} width="92" height="52" rx="10" {...box} />
						<text x="54" y={cy - 3} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
							{T.callers[i]}
						</text>
						<text x="54" y={cy + 15} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
							{T.put(n)}
						</text>
						<line {...line} x1="100" y1={cy} x2="128" y2={128 + i * 28} />
					</g>
				);
			})}

			{/* 큐: 이번 5초에 나갈 100건과 다음 5초를 기다리는 20건 */}
			<rect x="130" y="34" width="120" height="222" rx="10" {...box} />
			<text x="190" y="56" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--foreground)">
				{T.queue}
			</text>
			<text x="190" y="76" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{T.stacked}
			</text>
			<rect x="146" y="90" width="88" height="125" rx="6" fill="var(--accent)" fillOpacity="0.14" stroke="var(--accent)" strokeOpacity="0.8" />
			<Lines x={190} cy={152} lines={T.now} size={12.5} weight={700} fill="var(--accent)" gap={18} />
			<rect x="146" y="219" width="88" height="25" rx="6" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity="0.6" strokeDasharray="4 3" />
			<text x="190" y="235.5" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--muted-foreground)">
				{T.later}
			</text>

			{/* 큐 → 발송 워커 → 외부 API */}
			<line {...line} x1="234" y1="152" x2="268" y2="152" />
			<rect x="270" y="122" width="82" height="60" rx="10" {...box} />
			<Lines x={311} cy={two ? 145 : 144} lines={T.worker} size={13} weight={600} fill="var(--foreground)" gap={15} />
			<text x="311" y={two ? 174 : 168} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)">
				{T.pace}
			</text>
			<line {...line} x1="352" y1="152" x2="370" y2="152" />
			<rect x="372" y="106" width="80" height="92" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
			<Lines x={412} cy={T.api.length > 1 ? 130 : 134} lines={T.api} size={13.5} weight={600} fill="var(--foreground)" gap={15} />
			<text x="412" y="164" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--foreground)">
				{T.sent}
			</text>
			<text x="412" y="184" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--accent)">
				{T.ok}
			</text>

			<text x="230" y={noteY} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.notes[0]}
			</text>
			<text x="230" y={noteY + 24} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{T.notes[1]}
			</text>
		</svg>
	);
}

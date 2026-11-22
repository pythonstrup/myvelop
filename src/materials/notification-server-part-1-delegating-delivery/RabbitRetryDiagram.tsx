// RabbitMQ에서 간격을 두고 다시 시도하려면 대기 큐와 dead-letter를 엮는다.
// 워커가 거절한 메시지는 dead-letter로 대기 큐에 가고, TTL 30초가 지나면 dead-letter로 발송 큐에 돌아온다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "30초 뒤에 다시 시도하려면",
		queue: "발송 큐",
		worker: "발송 워커",
		api: "외부 API",
		apiSub: "잠깐 멈춤",
		fail: "실패",
		wait: "재시도 대기 큐",
		waitSub: "TTL 30초 · 읽는 워커 없음",
		tag: "직접 엮는다",
		tagW: 72,
		reject: ["거절하면", "dead-letter로 옮긴다"],
		back: ["30초가 지나면", "dead-letter로 돌아온다"],
		notes: ["거절한 메시지는 곧바로 돌아오므로, 간격은 대기 큐의 TTL로 만든다", "큐 하나, TTL 하나, dead-letter 설정 둘을 직접 엮어야 한다"],
		aria: "RabbitMQ에서 30초 뒤에 다시 시도하는 구성. 발송 큐의 메시지를 발송 워커가 꺼내 외부 API로 보내지만, 외부 API가 잠깐 멈춰 실패한다. 워커가 메시지를 거절하면 dead-letter로 재시도 대기 큐에 옮겨진다. 대기 큐에는 TTL 30초가 걸려 있고 읽는 워커가 없어서, 30초가 지나면 메시지가 다시 dead-letter로 발송 큐에 돌아온다. 큐 하나, TTL 하나, dead-letter 설정 둘을 직접 엮어야 한다.",
	},
	en: {
		title: "Retrying after 30 seconds",
		queue: "send queue",
		worker: "send worker",
		api: "external API",
		apiSub: "briefly down",
		fail: "fails",
		wait: "retry wait queue",
		waitSub: "TTL 30 s · no consumers",
		tag: "wired by hand",
		tagW: 84,
		reject: ["on reject,", "dead-letter here"],
		back: ["after 30 s,", "dead-letter back"],
		notes: ["a reject returns at once; the wait queue's TTL adds the delay", "one extra queue, a TTL, and two dead-letter settings"],
		aria: "Retrying after 30 seconds in RabbitMQ. The send worker takes a message from the send queue and calls the external API, which is briefly down, so the call fails. When the worker rejects the message, it is dead-lettered to a retry wait queue. That queue has a 30-second TTL and no consumers, so after 30 seconds the message is dead-lettered back to the send queue. One extra queue, a TTL, and two dead-letter settings have to be wired by hand.",
	},
} as const;
type Lang = keyof typeof LABELS;

const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const H = 330;

export default function RabbitRetryDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: "url(#rr-arrow)" } as const;
	const label = { fontSize: 11, fill: "var(--muted-foreground)" } as const;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<defs>
				<marker id="rr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>

			{/* 발송 큐 → 발송 워커 → 외부 API(실패) */}
			<rect x="8" y="44" width="124" height="56" rx="10" {...box} />
			<text x="70" y="77" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{T.queue}
			</text>
			<line {...line} x1="132" y1="72" x2="164" y2="72" />
			<rect x="166" y="44" width="116" height="56" rx="10" {...box} />
			<text x="224" y="77" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{T.worker}
			</text>
			<line {...line} x1="282" y1="72" x2="314" y2="72" />
			<text x="298" y="62" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--destructive)">
				{T.fail}
			</text>
			<rect x="316" y="44" width="136" height="56" rx="10" fill="var(--secondary)" stroke="var(--destructive)" strokeOpacity="0.8" strokeWidth="1.6" />
			<text x="384" y="68" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{T.api}
			</text>
			<text x="384" y="87" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--destructive)">
				{T.apiSub}
			</text>

			{/* 거절 → 재시도 대기 큐 */}
			<line {...line} x1="224" y1="100" x2="224" y2="194" />
			<text {...label}>
				{T.reject.map((s, i) => (
					<tspan key={s} x="232" y={138 + i * 15}>
						{s}
					</tspan>
				))}
			</text>
			<rect x="150" y="196" width="230" height="62" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
			<text x="265" y="222" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{T.wait}
			</text>
			<text x="265" y="242" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{T.waitSub}
			</text>
			<rect x={380 - T.tagW - 6} y="187" width={T.tagW} height="18" rx="9" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.8" />
			<text x={380 - T.tagW / 2 - 6} y="200" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)">
				{T.tag}
			</text>

			{/* TTL이 지나면 → 발송 큐 */}
			<path d="M 150 227 H 70 V 102" fill="none" {...line} />
			<text {...label}>
				{T.back.map((s, i) => (
					<tspan key={s} x="78" y={138 + i * 15}>
						{s}
					</tspan>
				))}
			</text>

			<text x="230" y={H - 42} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.notes[0]}
			</text>
			<text x="230" y={H - 18} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{T.notes[1]}
			</text>
		</svg>
	);
}

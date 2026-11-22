// 트랜잭셔널 아웃박스의 두 구성. 흔히 소개되는 "아웃박스 + 브로커"는 큐 역할을 하는 것이 둘이고,
// 워커가 아웃박스 테이블을 바로 읽으면 하나다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		heads: ["아웃박스 + 브로커", "아웃박스만"],
		subs: ["흔히 소개되는 구성", "이 글의 구성"],
		tx: "가입 트랜잭션",
		txSub: "회원 + 발송 요청",
		outbox: "아웃박스 테이블",
		relay: "릴레이",
		relaySub: "행을 읽어 브로커로 옮긴다",
		broker: "메시지 브로커",
		brokerSub: "Kafka · RabbitMQ",
		worker: "발송 워커",
		direct: "워커가 테이블에서 바로 꺼낸다",
		tags: ["큐 ①", "큐 ②", "큐"],
		notes: ["큐 둘, 옮기는 프로세스 하나", "큐 하나"],
		aria: "트랜잭셔널 아웃박스의 두 구성을 비교한 그림. 왼쪽의 흔히 소개되는 구성은 가입 트랜잭션이 회원과 발송 요청을 아웃박스 테이블에 함께 적고, 릴레이가 그 행을 Kafka나 RabbitMQ 같은 메시지 브로커로 옮긴 뒤 발송 워커가 꺼낸다. 큐 역할을 하는 것이 아웃박스 테이블과 브로커 둘이다. 오른쪽 이 글의 구성은 발송 워커가 아웃박스 테이블에서 바로 꺼내므로 큐가 하나다.",
	},
	en: {
		heads: ["Outbox + broker", "Outbox only"],
		subs: ["the usual setup", "this post's setup"],
		tx: "sign-up transaction",
		txSub: "user + send request",
		outbox: "outbox table",
		relay: "relay",
		relaySub: "moves rows to the broker",
		broker: "message broker",
		brokerSub: "Kafka · RabbitMQ",
		worker: "send worker",
		direct: "the worker reads the table directly",
		tags: ["queue 1", "queue 2", "queue"],
		notes: ["two queues and a relay", "one queue"],
		aria: "Diagram comparing two transactional outbox setups. On the left, the usual setup: the sign-up transaction writes the user and the send request to the outbox table together, a relay moves those rows to a message broker such as Kafka or RabbitMQ, and the send worker takes them from there. Both the outbox table and the broker act as queues. On the right, this post's setup: the send worker reads the outbox table directly, so there is one queue.",
	},
} as const;
type Lang = keyof typeof LABELS;

const BOX_W = 184;
const BOX_H = 48;
const COLS = [118, 342];
const ROWS = [92, 172, 252, 332, 412];

export default function OutboxBrokerDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 8,
		strokeLinejoin: "round",
	} as const;
	const node = (cx: number, cy: number, title: string, sub?: string, tag?: string) => (
		<g>
			<rect
				x={cx - BOX_W / 2}
				y={cy - BOX_H / 2}
				width={BOX_W}
				height={BOX_H}
				rx="10"
				fill="var(--secondary)"
				stroke={tag ? "var(--accent)" : "rgb(var(--gray))"}
				strokeOpacity={tag ? 0.8 : 0.45}
				strokeWidth={tag ? 1.6 : 1}
			/>
			<text x={cx} y={sub ? cy - 3 : cy + 5} textAnchor="middle" fontSize="14" fontWeight="600" fill={tag ? "var(--accent)" : "var(--foreground)"}>
				{title}
			</text>
			{sub && (
				<text x={cx} y={cy + 15} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
					{sub}
				</text>
			)}
			{tag && (
				<g>
					<rect x={cx + BOX_W / 2 - 50} y={cy - BOX_H / 2 - 9} width="46" height="18" rx="9" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.8" />
					<text x={cx + BOX_W / 2 - 27} y={cy - BOX_H / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)">
						{tag}
					</text>
				</g>
			)}
		</g>
	);
	const arrow = (cx: number, y1: number, y2: number) => (
		<line x1={cx} y1={y1} x2={cx} y2={y2} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#ob-arrow)" />
	);
	const [left, right] = COLS;
	return (
		<svg viewBox="0 0 460 480" role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}>
			<defs>
				<marker id="ob-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			{COLS.map((cx, i) => (
				<g key={cx}>
					<text x={cx} y="22" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--foreground)">
						{T.heads[i]}
					</text>
					<text x={cx} y="42" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
						{T.subs[i]}
					</text>
				</g>
			))}
			<line x1="230" y1="10" x2="230" y2="470" stroke="rgb(var(--gray))" strokeOpacity="0.25" strokeDasharray="4 4" />

			{/* 왼쪽: 아웃박스 → 릴레이 → 브로커 → 워커 */}
			{node(left, ROWS[0], T.tx, T.txSub)}
			{arrow(left, ROWS[0] + BOX_H / 2, ROWS[1] - BOX_H / 2 - 12)}
			{node(left, ROWS[1], T.outbox, undefined, T.tags[0])}
			{arrow(left, ROWS[1] + BOX_H / 2, ROWS[2] - BOX_H / 2 - 2)}
			{node(left, ROWS[2], T.relay, T.relaySub)}
			{arrow(left, ROWS[2] + BOX_H / 2, ROWS[3] - BOX_H / 2 - 12)}
			{node(left, ROWS[3], T.broker, T.brokerSub, T.tags[1])}
			{arrow(left, ROWS[3] + BOX_H / 2, ROWS[4] - BOX_H / 2 - 2)}
			{node(left, ROWS[4], T.worker)}

			{/* 오른쪽: 아웃박스 → 워커 */}
			{node(right, ROWS[0], T.tx, T.txSub)}
			{arrow(right, ROWS[0] + BOX_H / 2, ROWS[1] - BOX_H / 2 - 12)}
			{node(right, ROWS[1], T.outbox, undefined, T.tags[2])}
			{arrow(right, ROWS[1] + BOX_H / 2, ROWS[4] - BOX_H / 2 - 2)}
			<text x={right} y={(ROWS[2] + ROWS[3]) / 2 + 4} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)" {...halo}>
				{T.direct}
			</text>
			{node(right, ROWS[4], T.worker)}

			{COLS.map((cx, i) => (
				<text key={cx} x={cx} y="466" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--accent)">
					{T.notes[i]}
				</text>
			))}
		</svg>
	);
}

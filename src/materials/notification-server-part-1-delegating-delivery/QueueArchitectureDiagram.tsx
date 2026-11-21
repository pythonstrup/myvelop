// 큐 후보 다섯(DB 테이블, Redis 작업 큐, SQS, RabbitMQ, Kafka)의 아키텍처도.
// 요청한 쪽 → 큐 → 발송 워커 → 외부 API 흐름 위에, 직접 만들거나 따로 붙이는 부품을 점선으로 그린다.
// 맨 아래 두 줄은 얻는 것과 내주는 것이다. 가정: 워커 두 대, 외부 API 한도 5초에 100건, 3일 뒤 재안내.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
type Kind = "db" | "redis" | "sqs" | "rabbitmq" | "kafka";
type Pair = readonly [string, string];

const COMMON = {
	ko: {
		callers: ["요청한 쪽", "API 서버 · 어드민 · 배치"] as Pair,
		workers: "발송 워커 두 대",
		api: ["외부 API", "한도 안"] as Pair,
		counter: ["한도 카운터", "워커끼리 5초에 100건"] as Pair,
		build: "직접 만든다",
		wire: "직접 엮는다",
		check: "확인",
		send: "발송",
		take: "꺼냄",
		publish: "발행",
		gain: "얻는 것",
		give: "내주는 것",
		pillW: [56, 66],
		tagW: { build: 70, wire: 70 },
	},
	en: {
		callers: ["callers", "API server · admin · batch"] as Pair,
		workers: "two send workers",
		api: ["external API", "within limit"] as Pair,
		counter: ["limit counter", "100 per 5 s, shared"] as Pair,
		build: "you build it",
		wire: "wired by hand",
		check: "check",
		send: "send",
		take: "take",
		publish: "publish",
		gain: "gain",
		give: "cost",
		pillW: [46, 46],
		tagW: { build: 78, wire: 84 },
	},
} as const;

const KINDS = {
	ko: {
		db: {
			title: "DB 테이블을 큐로 쓰면",
			toDb: "가입과 한 트랜잭션",
			db: "운영 DB",
			members: "회원 테이블",
			jobs: ["발송 요청 테이블", "보낼 시각 · 우선순위 · 상태 열"] as Pair,
			jobsTag: "큐 역할",
			cleanup: ["정리 작업", "완료 행을 지운다"] as Pair,
			del: "삭제",
			workersSub: "1초마다 SKIP LOCKED로 조회",
			poll: "조회",
			trade: ["새로 운영할 것이 없고, 가입과 한 트랜잭션으로 묶인다", "조회 부하가 운영 DB로 가고, 한도와 정리는 직접 만든다"] as Pair,
			aria: "DB 테이블을 큐로 쓰는 아키텍처. 요청한 쪽인 API 서버, 어드민, 배치가 가입과 한 트랜잭션으로 운영 DB의 발송 요청 테이블에 행을 적는다. 이 테이블에는 보낼 시각, 우선순위, 상태 열이 있어 큐 역할을 한다. 발송 워커 두 대가 1초마다 SKIP LOCKED로 테이블을 조회해 꺼내고, 직접 만든 한도 카운터로 워커끼리 5초에 100건을 확인한 뒤 외부 API로 보낸다. 완료 행은 직접 만든 정리 작업이 지운다. 얻는 것은 새로 운영할 것이 없고 가입과 한 트랜잭션으로 묶인다는 점이고, 내주는 것은 조회 부하가 운영 DB로 가고 한도와 정리를 직접 만들어야 한다는 점이다.",
		},
		redis: {
			title: "Redis 작업 큐를 쓰면",
			db: ["운영 DB", "가입은 여기에 커밋"] as Pair,
			commit: "커밋",
			toRedis: "따로 넣는다",
			redis: "Redis",
			lib: "BullMQ · Sidekiq 같은 라이브러리가 관리",
			parts: [
				["대기", "바로 보낼 것"],
				["지연", "3일 뒤 재안내"],
				["우선순위", "인증번호 먼저"],
				["한도 카운터", "워커끼리 공유"],
			] as readonly Pair[],
			setup: "noeviction과 AOF는 따로 설정한다",
			workersSub: "꺼내면서 한도도 함께 센다",
			trade: ["지연, 재시도, 우선순위, 한도 공유가 라이브러리에 있다", "Redis를 큐용으로 운영하고, 가입과는 따로 커밋된다"] as Pair,
			aria: "Redis 작업 큐를 쓰는 아키텍처. 요청한 쪽인 API 서버, 어드민, 배치는 가입을 운영 DB에 커밋하고, 발송 요청은 따로 Redis에 넣는다. Redis 안에는 BullMQ나 Sidekiq 같은 라이브러리가 관리하는 대기, 지연, 우선순위, 한도 카운터가 있다. noeviction과 AOF는 따로 설정해야 한다. 발송 워커 두 대가 Redis에서 꺼내면서 한도도 함께 세고, 외부 API로 보낸다. 얻는 것은 지연, 재시도, 우선순위, 한도 공유가 라이브러리에 있다는 점이고, 내주는 것은 Redis를 큐용으로 운영해야 하고 가입과는 따로 커밋된다는 점이다.",
		},
		sqs: {
			title: "SQS를 쓰면",
			scheduler: ["EventBridge Scheduler", "15분 넘는 예약을 맡는다"] as Pair,
			toScheduler: "3일 뒤 재안내",
			tags: ["① 예약", "② 큐를 둘로 나눈다", "③ 한도"],
			tagW: [50, 50],
			urgentQ: "SQS 인증번호 큐",
			noticeQ: "SQS 공지 큐",
			toUrgent: "인증번호",
			toNotice: "3일 뒤",
			workersSub: "인증번호 큐를 먼저 읽는다",
			first: "먼저",
			then: "다음",
			redis: ["Redis 카운터", "워커끼리 5초에 100건"] as Pair,
			trade: ["띄울 서버가 없고, 메시지는 여러 가용 영역에 남는다", "예약, 우선순위, 한도를 부품 셋으로 따로 채운다"] as Pair,
			aria: "SQS를 쓰는 아키텍처. 요청한 쪽인 API 서버, 어드민, 배치는 3일 뒤 재안내를 EventBridge Scheduler에 맡기고, 스케줄러가 그 시각에 SQS 공지 큐에 넣는다. 인증번호는 SQS 인증번호 큐에 바로 넣는다. 발송 워커 두 대는 인증번호 큐를 먼저 읽고, 보내기 전에 Redis 카운터로 워커끼리 5초에 100건 한도를 함께 지킨 뒤 외부 API로 보낸다. 얻는 것은 띄울 서버가 없고 메시지가 여러 가용 영역에 남는다는 점이고, 내주는 것은 예약, 우선순위, 한도를 부품 셋으로 따로 채워야 한다는 점이다.",
		},
		rabbitmq: {
			title: "RabbitMQ를 쓰면",
			exchange: ["exchange", "라우팅 규칙으로 큐를 고른다"] as Pair,
			route: "라우팅",
			queue: ["발송 큐", "quorum 큐 · 우선순위"] as Pair,
			wait: ["재시도 대기 큐", "TTL 30초 · 읽는 워커 없음"] as Pair,
			deadLetter: "dead-letter",
			workersSub: "prefetch로 받는 양만 정한다",
			reject: "거절",
			trade: ["우선순위, 재전달, dead-letter가 브로커에 있다", "재시도 간격과 한도를 직접 엮고, 브로커 클러스터를 지킨다"] as Pair,
			aria: "RabbitMQ를 쓰는 아키텍처. 요청한 쪽인 API 서버, 어드민, 배치가 exchange에 발행하면 라우팅 규칙에 따라 우선순위가 있는 quorum 발송 큐로 들어간다. 발송 워커 두 대는 prefetch로 받는 양만 정해 꺼내고, 실패한 메시지를 거절하면 직접 엮은 재시도 대기 큐로 갔다가 TTL 30초 뒤 dead-letter로 발송 큐에 돌아온다. 워커는 직접 만든 한도 카운터로 5초에 100건을 확인한 뒤 외부 API로 보낸다. 얻는 것은 우선순위, 재전달, dead-letter가 브로커에 있다는 점이고, 내주는 것은 재시도 간격과 한도를 직접 엮고 브로커 클러스터를 지켜야 한다는 점이다.",
		},
		kafka: {
			title: "Kafka를 쓰면",
			topic: "알림 토픽",
			partitions: "파티션 4개",
			read: "오프셋으로 읽음",
			group: ["발송 워커 · 소비자 그룹", "파티션 수만큼만 일한다"] as Pair,
			apiShort: ["외부 API", "한도 안"] as Pair,
			extras: [
				["재시도 토픽", "실패한 건을 옮긴다"],
				["예약 저장소", "지연 발송"],
				["우선순위 토픽", "인증번호를 따로"],
				["한도 카운터", "워커끼리 공유"],
			] as readonly Pair[],
			extrasLabel: "작업 큐로 쓰려면 직접 만들어 붙인다",
			trade: ["같은 이벤트를 여러 서비스가 읽고, 다시 읽을 수도 있다", "재시도, 지연, 우선순위, 한도를 모두 직접 만든다"] as Pair,
			aria: "Kafka를 쓰는 아키텍처. 요청한 쪽인 API 서버, 어드민, 배치가 파티션 4개짜리 알림 토픽에 발행하고, 소비자 그룹의 발송 워커가 오프셋으로 읽어 외부 API로 보낸다. 워커는 파티션 수만큼만 일한다. 작업 큐로 쓰려면 재시도 토픽, 예약 저장소, 우선순위 토픽, 한도 카운터를 직접 만들어 붙여야 한다. 얻는 것은 같은 이벤트를 여러 서비스가 읽고 다시 읽을 수도 있다는 점이고, 내주는 것은 재시도, 지연, 우선순위, 한도를 모두 직접 만들어야 한다는 점이다.",
		},
	},
	en: {
		db: {
			title: "Using a DB table as the queue",
			toDb: "same transaction as sign-up",
			db: "production DB",
			members: "users table",
			jobs: ["send requests table", "send_at · priority · status"] as Pair,
			jobsTag: "the queue",
			cleanup: ["cleanup job", "deletes finished rows"] as Pair,
			del: "delete",
			workersSub: "poll every 1 s, SKIP LOCKED",
			poll: "poll",
			trade: ["nothing new to run; commits with sign-up", "polling loads the DB; you build limits and cleanup"] as Pair,
			aria: "Architecture of using a DB table as the queue. The callers (API server, admin, batch) write a row to the send requests table in the production DB in the same transaction as sign-up. The table has send_at, priority, and status columns and acts as the queue. Two send workers poll it every second with SKIP LOCKED, check a hand-built limit counter for 100 per 5 seconds across workers, and call the external API. A hand-built cleanup job deletes finished rows. The gain: nothing new to run, and requests commit with sign-up. The cost: polling loads the production DB, and you build the limit and the cleanup.",
		},
		redis: {
			title: "Using a Redis job queue",
			db: ["production DB", "sign-up commits here"] as Pair,
			commit: "commit",
			toRedis: "enqueued separately",
			redis: "Redis",
			lib: "managed by a library like BullMQ or Sidekiq",
			parts: [
				["waiting", "send now"],
				["delayed", "3-day follow-up"],
				["priority", "OTP first"],
				["limit counter", "shared"],
			] as readonly Pair[],
			setup: "set noeviction and AOF yourself",
			workersSub: "take jobs and count the limit",
			trade: ["delays, retries, priority, shared limits built in", "you run Redis as a queue; it commits apart from sign-up"] as Pair,
			aria: "Architecture of a Redis job queue. The callers (API server, admin, batch) commit sign-up to the production DB and enqueue the send request into Redis separately. Inside Redis, a library like BullMQ or Sidekiq manages the waiting, delayed, priority, and limit-counter structures. noeviction and AOF must be set separately. Two send workers take jobs from Redis, count the shared limit, and call the external API. The gain: delays, retries, priority, and shared limits are built in. The cost: you run Redis as a queue, and it commits apart from sign-up.",
		},
		sqs: {
			title: "Using SQS",
			scheduler: ["EventBridge Scheduler", "holds schedules past 15 min"] as Pair,
			toScheduler: "retry in 3 days",
			tags: ["① schedule", "② split into two queues", "③ limit"],
			tagW: [74, 52],
			urgentQ: "SQS OTP queue",
			noticeQ: "SQS notice queue",
			toUrgent: "OTP",
			toNotice: "in 3 days",
			workersSub: "read the OTP queue first",
			first: "first",
			then: "then",
			redis: ["Redis counter", "100 per 5 s, shared"] as Pair,
			trade: ["no servers to run; messages live in several AZs", "scheduling, priority, limits come from three add-ons"] as Pair,
			aria: "Architecture of using SQS. The callers (API server, admin, batch) hand the 3-day follow-up to EventBridge Scheduler, which puts it into the SQS notice queue at that time. OTPs go straight into the SQS OTP queue. Two send workers read the OTP queue first, check a shared Redis counter so that together they stay at 100 per 5 seconds, and call the external API. The gain: no servers to run, and messages are stored across several availability zones. The cost: scheduling, priority, and limits come from three separate add-ons.",
		},
		rabbitmq: {
			title: "Using RabbitMQ",
			exchange: ["exchange", "routing rules pick the queue"] as Pair,
			route: "route",
			queue: ["send queue", "quorum queue · priority"] as Pair,
			wait: ["retry wait queue", "TTL 30 s · no consumers"] as Pair,
			deadLetter: "dead-letter",
			workersSub: "prefetch caps what they hold",
			reject: "reject",
			trade: ["priority, redelivery, dead-lettering in the broker", "you wire retry delays and limits, and run a cluster"] as Pair,
			aria: "Architecture of using RabbitMQ. The callers (API server, admin, batch) publish to an exchange, and routing rules put messages into a quorum send queue with priorities. Two send workers take messages with a prefetch cap; a rejected message goes to a hand-wired retry wait queue and dead-letters back to the send queue after a 30-second TTL. Workers check a hand-built limit counter for 100 per 5 seconds and call the external API. The gain: priority, redelivery, and dead-lettering live in the broker. The cost: you wire retry delays and limits yourself and run a broker cluster.",
		},
		kafka: {
			title: "Using Kafka",
			topic: "notification topic",
			partitions: "4 partitions",
			read: "read by offset",
			group: ["send workers · consumer group", "work up to the partition count"] as Pair,
			apiShort: ["external API", "within limit"] as Pair,
			extras: [
				["retry topic", "failed messages"],
				["schedule store", "delayed sends"],
				["priority topic", "OTPs apart"],
				["limit counter", "shared"],
			] as readonly Pair[],
			extrasLabel: "to use it as a job queue, you build and attach these",
			trade: ["many services read the same events, and can replay them", "you build retries, delays, priority, and limits"] as Pair,
			aria: "Architecture of using Kafka. The callers (API server, admin, batch) publish to a notification topic with 4 partitions, and the send workers in a consumer group read by offset and call the external API. Workers only scale up to the partition count. To use it as a job queue, you build and attach a retry topic, a schedule store, a priority topic, and a limit counter. The gain: many services can read the same events and replay them. The cost: you build retries, delays, priority, and limits yourself.",
		},
	},
} as const;

type Lang = keyof typeof COMMON;

const HEIGHTS: Record<Kind, number> = { db: 486, redis: 486, sqs: 468, rabbitmq: 450, kafka: 424 };
const plain = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const accent = { fill: "var(--secondary)", stroke: "var(--accent)", strokeOpacity: 0.8, strokeWidth: 1.6 } as const;
const extra = { fill: "var(--background)", stroke: "var(--accent)", strokeOpacity: 0.8, strokeWidth: 1.4, strokeDasharray: "5 4" } as const;
const inner = { fill: "var(--background)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;

type Variant = "plain" | "accent" | "extra";

function Node({ x, y, w, h, text, variant = "plain", subTone }: { x: number; y: number; w: number; h: number; text: Pair | readonly [string]; variant?: Variant; subTone?: string }) {
	const cx = x + w / 2;
	const style = variant === "accent" ? accent : variant === "extra" ? extra : plain;
	const [title, sub] = text;
	return (
		<g>
			<rect x={x} y={y} width={w} height={h} rx="10" {...style} />
			<text x={cx} y={sub ? y + h / 2 - 3 : y + h / 2 + 5} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{title}
			</text>
			{sub && (
				<text x={cx} y={y + h / 2 + 15} textAnchor="middle" fontSize="11" fontWeight={subTone ? 600 : 400} fill={subTone ?? "var(--muted-foreground)"}>
					{sub}
				</text>
			)}
		</g>
	);
}

function Tag({ x, y, w, label }: { x: number; y: number; w: number; label: string }) {
	return (
		<g>
			<rect x={x} y={y} width={w} height="18" rx="9" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.8" />
			<text x={x + w / 2} y={y + 13} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)">
				{label}
			</text>
		</g>
	);
}

function Label({ x, y, text, anchor = "start", tone, weight }: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end"; tone?: string; weight?: number }) {
	return (
		<text x={x} y={y} textAnchor={anchor} fontSize="11" fontWeight={weight} fill={tone ?? "var(--muted-foreground)"}>
			{text}
		</text>
	);
}

export default function QueueArchitectureDiagram({ kind, lang = "ko" }: { kind: Kind; lang?: Lang }) {
	const C = COMMON[lang];
	const K = KINDS[lang];
	const H = HEIGHTS[kind];
	const arrowId = `qa-arrow-${kind}`;
	const both = `qa-both-${kind}`;
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: `url(#${arrowId})` } as const;
	const trade = K[kind].trade;
	const buildTag = (right: number, y: number) => <Tag x={right - C.tagW.build - 6} y={y} w={C.tagW.build} label={C.build} />;
	// 화살표가 상자 오른쪽 위로 들어오는 한도 카운터는 태그를 왼쪽에 둔다.
	const leftTag = (y: number) => <Tag x={14} y={y} w={C.tagW.build} label={C.build} />;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={K[kind].aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<defs>
				<marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
				<marker id={both} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{K[kind].title}
			</text>

			{kind === "db" && (
				<g>
					<Node x={8} y={40} w={160} h={52} text={C.callers} />
					<line {...line} x1="88" y1="92" x2="88" y2="130" />
					<Label x={96} y={115} text={K.db.toDb} tone="var(--accent)" weight={600} />
					<rect x="8" y="132" width="444" height="88" rx="10" {...plain} />
					<text x="20" y="152" fontSize="13.5" fontWeight="700" fill="var(--foreground)">
						{K.db.db}
					</text>
					<rect x="20" y="162" width="130" height="44" rx="8" {...inner} />
					<text x="85" y="188.5" textAnchor="middle" fontSize="12.5" fill="var(--foreground)">
						{K.db.members}
					</text>
					<rect x="162" y="162" width="278" height="44" rx="8" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.4" />
					<text x="301" y="180" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
						{K.db.jobs[0]}
					</text>
					<text x="301" y="196" textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
						{K.db.jobs[1]}
					</text>
					<Tag x={440 - 66} y={153} w={62} label={K.db.jobsTag} />

					<Node x={8} y={262} w={172} h={52} text={K.db.cleanup} variant="extra" />
					{buildTag(180, 253)}
					<line {...line} x1="94" y1="262" x2="94" y2="224" />
					<Label x={102} y={246} text={K.db.del} />

					<line {...line} x1="300" y1="220" x2="300" y2="258" />
					<Label x={308} y={243} text={K.db.poll} />
					<Node x={200} y={262} w={252} h={52} text={[C.workers, K.db.workersSub]} subTone="var(--accent)" />

					<line {...line} x1="270" y1="314" x2="130" y2="350" />
					<Label x={196} y={326} text={C.check} anchor="end" />
					<line {...line} x1="370" y1="314" x2="356" y2="350" />
					<Label x={372} y={340} text={C.send} />
					<Node x={8} y={352} w={192} h={52} text={C.counter} variant="extra" />
					{leftTag(343)}
					<Node x={260} y={352} w={192} h={52} text={C.api} subTone="var(--accent)" />
				</g>
			)}

			{kind === "redis" && (
				<g>
					<Node x={8} y={40} w={160} h={52} text={C.callers} />
					<line {...line} x1="168" y1="66" x2="288" y2="66" />
					<Label x={228} y={58} text={K.redis.commit} anchor="middle" />
					<Node x={292} y={40} w={160} h={52} text={K.redis.db} />
					<line {...line} x1="88" y1="92" x2="88" y2="130" />
					<Label x={96} y={115} text={K.redis.toRedis} tone="var(--destructive)" weight={600} />

					<rect x="8" y="132" width="444" height="96" rx="10" {...accent} />
					<text x="20" y="152" fontSize="13.5" fontWeight="700" fill="var(--foreground)">
						{K.redis.redis}
					</text>
					<text x="440" y="152" textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)">
						{K.redis.lib}
					</text>
					{K.redis.parts.map(([t, s], i) => {
						const x = 20 + i * 108;
						return (
							<g key={t}>
								<rect x={x} y="162" width="96" height="40" rx="8" {...inner} />
								<text x={x + 48} y="178" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
									{t}
								</text>
								<text x={x + 48} y="194" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
									{s}
								</text>
							</g>
						);
					})}
					<text x="230" y="220" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--destructive)">
						{K.redis.setup}
					</text>

					<line {...line} x1="230" y1="228" x2="230" y2="266" />
					<Label x={238} y={251} text={C.take} />
					<Node x={110} y={268} w={240} h={52} text={[C.workers, K.redis.workersSub]} subTone="var(--accent)" />
					<line {...line} x1="230" y1="320" x2="230" y2="354" />
					<Label x={238} y={341} text={C.send} />
					<Node x={130} y={356} w={200} h={48} text={C.api} subTone="var(--accent)" />
				</g>
			)}

			{kind === "sqs" && (
				<g>
					<Node x={8} y={40} w={140} h={52} text={C.callers} />
					<line {...line} x1="148" y1="66" x2="258" y2="66" />
					<Label x={203} y={58} text={K.sqs.toScheduler} anchor="middle" />
					<Node x={262} y={40} w={190} h={52} text={K.sqs.scheduler} variant="accent" />
					<Tag x={452 - K.sqs.tagW[0] - 6} y={31} w={K.sqs.tagW[0]} label={K.sqs.tags[0]} />

					<line {...line} x1="78" y1="92" x2="78" y2="140" />
					<Label x={86} y={110} text={K.sqs.toUrgent} />
					<line {...line} x1="341" y1="92" x2="341" y2="140" />
					<Label x={349} y={110} text={K.sqs.toNotice} />
					<rect x="4" y="118" width="452" height="80" rx="12" fill="none" stroke="var(--accent)" strokeOpacity="0.7" strokeWidth="1.4" strokeDasharray="5 4" />
					<text x="230" y="194" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--accent)">
						{K.sqs.tags[1]}
					</text>
					<Node x={16} y={142} w={206} h={36} text={[K.sqs.urgentQ]} />
					<Node x={238} y={142} w={206} h={36} text={[K.sqs.noticeQ]} />

					<line {...line} x1="119" y1="198" x2="186" y2="234" />
					<Label x={140} y={222} text={K.sqs.first} anchor="end" />
					<line {...line} x1="341" y1="198" x2="274" y2="234" />
					<Label x={320} y={222} text={K.sqs.then} />
					<Node x={130} y={236} w={200} h={52} text={[C.workers, K.sqs.workersSub]} subTone="var(--accent)" />

					<line {...line} x1="180" y1="288" x2="110" y2="328" />
					<Label x={134} y={312} text={C.check} anchor="end" />
					<line {...line} x1="280" y1="288" x2="350" y2="328" />
					<Label x={326} y={312} text={C.send} />
					<Node x={8} y={330} w={192} h={56} text={K.sqs.redis} variant="accent" />
					<Tag x={200 - K.sqs.tagW[1] - 6} y={321} w={K.sqs.tagW[1]} label={K.sqs.tags[2]} />
					<Node x={260} y={330} w={192} h={56} text={C.api} subTone="var(--accent)" />
				</g>
			)}

			{kind === "rabbitmq" && (
				<g>
					<Node x={8} y={40} w={160} h={52} text={C.callers} />
					<line {...line} x1="168" y1="66" x2="288" y2="66" />
					<Label x={228} y={58} text={C.publish} anchor="middle" />
					<Node x={292} y={40} w={160} h={52} text={K.rabbitmq.exchange} />
					<line {...line} x1="330" y1="92" x2="150" y2="130" />
					<Label x={262} y={124} text={K.rabbitmq.route} />

					<Node x={8} y={132} w={196} h={52} text={K.rabbitmq.queue} variant="accent" />
					<Node x={256} y={132} w={196} h={52} text={K.rabbitmq.wait} variant="extra" />
					<Tag x={452 - C.tagW.wire - 6} y={123} w={C.tagW.wire} label={C.wire} />
					<line x1="212" y1="158" x2="248" y2="158" stroke="rgb(var(--gray))" strokeWidth="1.5" markerStart={`url(#${both})`} markerEnd={`url(#${both})`} />
					<text x="230" y="198" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
						{K.rabbitmq.deadLetter}
					</text>

					<line {...line} x1="106" y1="184" x2="176" y2="222" />
					<Label x={124} y={214} text={C.take} anchor="end" />
					<line {...line} x1="290" y1="224" x2="340" y2="188" />
					<Label x={322} y={214} text={K.rabbitmq.reject} />
					<Node x={130} y={224} w={200} h={52} text={[C.workers, K.rabbitmq.workersSub]} subTone="var(--accent)" />

					<line {...line} x1="190" y1="276" x2="110" y2="314" />
					<Label x={142} y={300} text={C.check} anchor="end" />
					<line {...line} x1="270" y1="276" x2="350" y2="314" />
					<Label x={318} y={300} text={C.send} />
					<Node x={8} y={316} w={192} h={52} text={C.counter} variant="extra" />
					{leftTag(307)}
					<Node x={260} y={316} w={192} h={52} text={C.api} subTone="var(--accent)" />
				</g>
			)}

			{kind === "kafka" && (
				<g>
					<Node x={8} y={40} w={160} h={52} text={C.callers} />
					<line {...line} x1="168" y1="66" x2="228" y2="66" />
					<Label x={198} y={58} text={C.publish} anchor="middle" />
					<rect x="232" y="34" width="220" height="92" rx="10" {...accent} />
					<text x="244" y="54" fontSize="13.5" fontWeight="700" fill="var(--foreground)">
						{K.kafka.topic}
					</text>
					<text x="440" y="54" textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)">
						{K.kafka.partitions}
					</text>
					{[0, 1, 2, 3].map((p) =>
						Array.from({ length: 10 }, (_, k) => <rect key={`${p}-${k}`} x={244 + k * 19.6} y={64 + p * 14} width="17" height="10" rx="2" fill="rgb(var(--gray))" fillOpacity="0.3" />),
					)}

					<line {...line} x1="300" y1="126" x2="262" y2="166" />
					<Label x={290} y={150} text={K.kafka.read} />
					<Node x={110} y={168} w={226} h={52} text={K.kafka.group} subTone="var(--destructive)" />
					<line {...line} x1="336" y1="194" x2="352" y2="194" />
					<Node x={354} y={168} w={98} h={52} text={K.kafka.apiShort} subTone="var(--accent)" />

					<rect x="4" y="252" width="452" height="90" rx="12" fill="none" stroke="var(--accent)" strokeOpacity="0.7" strokeWidth="1.4" strokeDasharray="5 4" />
					{K.kafka.extras.map((pair, i) => {
						const x = 12 + i * 110;
						const cx = x + 51;
						return (
							<g key={pair[0]}>
								<line {...line} x1={170 + i * 30} y1="220" x2={cx} y2="258" />
								<rect x={x} y="260" width="102" height="50" rx="8" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.8" />
								<text x={cx} y="281" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
									{pair[0]}
								</text>
								<text x={cx} y="298" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
									{pair[1]}
								</text>
							</g>
						);
					})}
					<text x="230" y="331" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--accent)">
						{K.kafka.extrasLabel}
					</text>
				</g>
			)}

			{/* 얻는 것 / 내주는 것 */}
			{[0, 1].map((r) => {
				const y = H - 62 + r * 28;
				const tone = r === 0 ? "var(--accent)" : "var(--destructive)";
				const pw = C.pillW[r];
				return (
					<g key={r}>
						<rect x="8" y={y} width={pw} height="20" rx="10" fill="var(--background)" stroke={tone} strokeOpacity="0.8" />
						<text x={8 + pw / 2} y={y + 14} textAnchor="middle" fontSize="11" fontWeight="700" fill={tone}>
							{r === 0 ? C.gain : C.give}
						</text>
						<text x={8 + pw + 8} y={y + 14.5} fontSize="12" fill="var(--foreground)">
							{trade[r]}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

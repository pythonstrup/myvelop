// 트랜잭셔널 아웃박스를 두 장면으로 나눈 그림.
// ① 가입과 발송 요청이 한 트랜잭션으로 적힌다 ② 그 테이블을 큐처럼 쓰려면 직접 만들어야 하는 것들.
// ②는 발송 워커 두 대가 1초마다 테이블을 읽는다고 가정한다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		titles: ["① 커밋과 함께 적는다", "② 테이블을 큐처럼 쓰려면"],
		api: ["가입 API"],
		db: "DB",
		tx: "한 트랜잭션",
		rows: ["회원 +1행", "아웃박스 +1행"],
		worker: ["발송 워커"],
		ext: ["외부 API"],
		workers: "발송 워커",
		workerNames: ["워커 1", "워커 2"],
		poll: ["1초마다 조회"],
		head: ["#", "상태", "다음 시도"],
		status: ["완료", "처리 중", "처리 중", "재시도 대기", "대기"],
		next: ["-", "-", "-", "30초 뒤", "-"],
		callouts: [["처리한 행은 지운다"], ["SKIP LOCKED로", "다른 행을 잠근다"], ["재시도 간격을 센다"], ["다음 조회까지 기다린다"]],
		notes: [
			["가입이 커밋되면 발송 요청도 함께 커밋된다", "롤백되면 두 행이 함께 사라진다"],
			["잠금, 재시도 간격, 정리, 워커 사이의 한도를 직접 만든다", "1초마다 읽는 만큼 DB에 부하가 가고, 발송은 최대 1초 늦어진다"],
		],
		aria: [
			"커밋과 함께 적을 때: 가입 API가 DB에 회원 행과 아웃박스 행을 한 트랜잭션으로 함께 적고, 발송 워커가 아웃박스를 읽어 외부 API로 보낸다. 가입이 커밋되면 발송 요청도 함께 커밋되고, 롤백되면 두 행이 함께 사라진다.",
			"아웃박스 테이블을 큐처럼 쓸 때: 발송 워커 두 대가 1초마다 테이블을 조회한다. 1번 행은 완료되어 지워야 하고, 처리 중인 2번과 3번 행은 워커 1과 워커 2가 SKIP LOCKED로 서로 다른 행을 잠근다. 4번 행은 재시도 대기로 30초 뒤에 다시 시도하고, 5번 행은 다음 조회까지 기다린다. 잠금, 재시도 간격, 정리, 워커 사이의 한도를 직접 만들어야 하고, 1초마다 읽는 만큼 DB에 부하가 가며 발송은 최대 1초 늦어진다.",
		],
	},
	en: {
		titles: ["① Written with the commit", "② Using the table as a queue"],
		api: ["sign-up", "API"],
		db: "DB",
		tx: "one transaction",
		rows: ["users +1 row", "outbox +1 row"],
		worker: ["send", "worker"],
		ext: ["external", "API"],
		workers: "send workers",
		workerNames: ["worker 1", "worker 2"],
		poll: ["polls", "every 1 s"],
		head: ["#", "status", "next try"],
		status: ["done", "in progress", "in progress", "retry wait", "waiting"],
		next: ["-", "-", "-", "in 30 s", "-"],
		callouts: [["delete done rows"], ["SKIP LOCKED", "splits the rows"], ["track retry times"], ["wait for next poll"]],
		notes: [
			["when sign-up commits, the send request commits with it", "on rollback, both rows disappear together"],
			["you build locking, retries, cleanup, and a shared limit", "polling every second loads the DB and delays sends up to 1 s"],
		],
		aria: [
			"Written with the commit: the sign-up API writes a user row and an outbox row to the DB in one transaction, and the send worker reads the outbox and sends to the external API. When sign-up commits, the send request commits with it; on rollback, both rows disappear together.",
			"Using the outbox table as a queue: two send workers poll the table every second. Row 1 is done and has to be deleted. Rows 2 and 3 are in progress, and SKIP LOCKED keeps worker 1 and worker 2 on different rows. Row 4 waits to retry in 30 seconds, and row 5 waits for the next poll. Locking, retry intervals, cleanup, and a limit shared across workers all have to be built by hand, and polling every second loads the DB and delays sends by up to 1 second.",
		],
	},
} as const;
type Lang = keyof typeof LABELS;
type Scene = 1 | 2;

const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const inner = { fill: "var(--background)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const HEIGHTS = { 1: 262, 2: 330 } as const;

// 한 줄 또는 두 줄 라벨을 상자 가운데에 놓는다.
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

export default function OutboxTableDiagram({ scene, lang = "ko" }: { scene: Scene; lang?: Lang }) {
	const T = LABELS[lang];
	const H = HEIGHTS[scene];
	// 한 페이지에 두 장면이 함께 들어가므로 marker id를 장면마다 따로 둔다.
	const arrowId = `ot-arrow-${scene}`;
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: `url(#${arrowId})` } as const;
	const notes = T.notes[scene - 1];
	const noteY = H - 42;
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

			{scene === 1 && (
				<g>
					{/* 가입 API → DB(한 트랜잭션) → 발송 워커 → 외부 API */}
					<rect x="8" y="108" width="78" height="56" rx="10" {...box} />
					<Lines x={47} cy={136} lines={T.api} size={13.5} weight={600} fill="var(--foreground)" />
					<line {...line} x1="86" y1="136" x2="104" y2="136" />

					<rect x="106" y="34" width="152" height="164" rx="10" {...box} />
					<text x="182" y="56" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--foreground)">
						{T.db}
					</text>
					<rect x="116" y="68" width="132" height="118" rx="8" fill="none" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.4" strokeDasharray="5 4" />
					<text x="182" y="88" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--accent)">
						{T.tx}
					</text>
					<rect x="124" y="102" width="116" height="30" rx="6" {...inner} />
					<text x="182" y="121.5" textAnchor="middle" fontSize="12" fill="var(--foreground)">
						{T.rows[0]}
					</text>
					<rect x="124" y="144" width="116" height="30" rx="6" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.8" />
					<text x="182" y="163.5" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
						{T.rows[1]}
					</text>

					<line {...line} x1="258" y1="136" x2="274" y2="136" />
					<rect x="276" y="108" width="78" height="56" rx="10" {...box} />
					<Lines x={315} cy={136} lines={T.worker} size={13.5} weight={600} fill="var(--foreground)" />
					<line {...line} x1="354" y1="136" x2="372" y2="136" />
					<rect x="374" y="108" width="78" height="56" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
					<Lines x={413} cy={136} lines={T.ext} size={13.5} weight={600} fill="var(--foreground)" />
				</g>
			)}

			{scene === 2 && (
				<g>
					{/* 발송 워커 두 대 */}
					<rect x="8" y="64" width="90" height="156" rx="10" {...box} />
					<text x="53" y="86" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
						{T.workers}
					</text>
					{T.workerNames.map((name, i) => (
						<g key={name}>
							<rect x="18" y={106 + i * 40} width="70" height="28" rx="6" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.8" />
							<text x="53" y={124.5 + i * 40} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--accent)">
								{name}
							</text>
							<line {...line} x1="88" y1={120 + i * 40} x2="114" y2={120 + i * 40} />
						</g>
					))}
					<Lines x={53} cy={T.poll.length > 1 ? 198 : 200} lines={T.poll} size={11} fill="var(--muted-foreground)" gap={13} />

					{/* 아웃박스 테이블 */}
					<rect x="116" y="34" width="184" height="226" rx="8" {...box} />
					{[1, 2].map((i) => (
						<rect key={i} x="117" y={60 + i * 40} width="182" height="40" fill="var(--accent)" fillOpacity="0.1" />
					))}
					<line x1="116" y1="60" x2="300" y2="60" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
					{[100, 140, 180, 220].map((y) => (
						<line key={y} x1="116" y1={y} x2="300" y2={y} stroke="rgb(var(--gray))" strokeOpacity="0.2" />
					))}
					{[129, 182, 261].map((x, c) => (
						<text key={x} x={x} y="51.5" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
							{T.head[c]}
						</text>
					))}
					{T.status.map((status, i) => {
						const cy = 80 + i * 40;
						const done = i === 0;
						const busy = i === 1 || i === 2;
						const retry = i === 3;
						const tone = busy ? "var(--accent)" : retry ? "var(--destructive)" : done ? "var(--muted-foreground)" : "var(--foreground)";
						return (
							<g key={`${i}-${status}`} opacity={done ? 0.65 : 1}>
								<text x="129" y={cy + 4.5} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
									{i + 1}
								</text>
								<text x="182" y={cy + 4.5} textAnchor="middle" fontSize="12" fontWeight={busy || retry ? 600 : 400} fill={tone}>
									{status}
								</text>
								<text x="261" y={cy + 4.5} textAnchor="middle" fontSize="12" fill={retry ? "var(--destructive)" : "var(--muted-foreground)"}>
									{T.next[i]}
								</text>
							</g>
						);
					})}

					{/* 행마다 직접 만들어야 하는 것 */}
					{[80, 200, 240].map((cy) => (
						<line key={cy} x1="302" y1={cy} x2="308" y2={cy} stroke="var(--accent)" strokeOpacity="0.7" strokeWidth="1.4" />
					))}
					<path d="M 302 104 H 306 V 176 H 302" fill="none" stroke="var(--accent)" strokeOpacity="0.7" strokeWidth="1.4" />
					{[80, 140, 200, 240].map((cy, k) => (
						<text key={cy} fontSize="11.5" fontWeight="600" fill="var(--accent)">
							{T.callouts[k].map((s, j) => (
								<tspan key={s} x="312" y={cy + 4 + (j - (T.callouts[k].length - 1) / 2) * 16}>
									{s}
								</tspan>
							))}
						</text>
					))}
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

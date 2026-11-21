// 예약을 테이블의 행으로 적고 폴러가 때가 된 행을 큐로 옮기는 구성을 한 장에 그린 그림.
// 지금은 목 15:00이다. 결제 실패 처리와 어드민이 예약 테이블에 쓰고, 폴러가 1분마다 때가 된 행을 옮긴다.
// B는 수요일에 다시 결제했지만 예약은 그 사실을 모르므로, 워커가 보내기 직전에 다시 확인해 거둔다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "예약 테이블과 폴러",
		now: "지금은 목 15:00",
		writers: [
			["결제 실패 처리", "결제와 한 트랜잭션으로 적는다"],
			["어드민", "예약을 찾아 취소하거나 시각을 바꾼다"],
		],
		head: ["id", "예약", "send_at", "상태", "이번 폴링"],
		what: ["재안내 · 사용자 A", "재안내 · 사용자 B", "어드민 · 사용자 C", "어드민 · 사용자 D", "어드민 · 사용자 E"],
		sendAt: ["목 15:00", "목 15:00", "목 15:00", "목 16:00", "다음 주 화 15:00"],
		changed: "14:00에서 바꿈",
		status: ["예약됨", "예약됨", "취소됨", "예약됨", "예약됨"],
		result: ["큐로 옮긴다", "큐로 옮긴다", "건너뛴다", "아직 때가 아니다", "아직 때가 아니다"],
		poller: ["폴러 · 1분마다", "때가 된 행을 옮긴다"],
		queue: ["큐", "작업 id = 예약 id"],
		worker: ["워커", "보내기 직전에 다시 본다", "A는 보내고 B는 거둔다"],
		notes: ["취소와 시각 변경은 행 하나를 고치는 일이다", "폴러와 보내기 직전의 재확인은 직접 만든다"],
		aria: "예약 테이블과 폴러로 예약 발송을 표현하는 구성. 지금은 목요일 15시다. 결제 실패 처리는 결제와 한 트랜잭션으로 예약을 적고, 어드민은 예약을 찾아 취소하거나 시각을 바꾼다. 예약 테이블에는 다섯 행이 있다. 사용자 A와 B의 재안내는 목요일 15시 예약이라 큐로 옮긴다. 어드민이 취소한 사용자 C의 예약은 건너뛴다. 사용자 D의 예약은 14시에서 16시로 바뀌었고, 사용자 E의 예약은 다음 주 화요일이라 아직 때가 아니다. 폴러가 1분마다 때가 된 행을 예약 id를 작업 id로 삼아 큐로 옮기고, 워커는 보내기 직전에 다시 확인해 A에게는 보내고 수요일에 다시 결제한 B의 재안내는 거둔다. 취소와 시각 변경은 행 하나를 고치는 일이지만, 폴러와 보내기 직전의 재확인은 직접 만들어야 한다.",
	},
	en: {
		title: "A reservation table and a poller",
		now: "now: Thu 15:00",
		writers: [
			["payment failure handler", "writes in the payment's transaction"],
			["admin", "finds, cancels, or reschedules"],
		],
		head: ["id", "booking", "send_at", "status", "this poll"],
		what: ["follow-up · user A", "follow-up · user B", "admin · user C", "admin · user D", "admin · user E"],
		sendAt: ["Thu 15:00", "Thu 15:00", "Thu 15:00", "Thu 16:00", "next Tue 15:00"],
		changed: "moved from 14:00",
		status: ["booked", "booked", "cancelled", "booked", "booked"],
		result: ["moved to queue", "moved to queue", "skipped", "not due yet", "not due yet"],
		poller: ["poller · every 1 min", "moves due rows"],
		queue: ["queue", "job id = booking id"],
		worker: ["worker", "checks again before sending", "sends A, drops B"],
		notes: ["cancelling or rescheduling is editing one row", "the poller and the last-moment check are yours to build"],
		aria: "Scheduled sends as a reservation table and a poller. It is Thursday 15:00. The payment failure handler writes a booking in the payment's transaction, and an admin can find, cancel, or reschedule bookings. The table has five rows. The follow-ups for users A and B are due Thursday 15:00 and are moved to the queue. User C's booking was cancelled by an admin and is skipped. User D's booking was moved from 14:00 to 16:00, and user E's is next Tuesday, so neither is due. Every minute the poller moves due rows into the queue with the booking id as the job id, and the worker checks again right before sending: it sends to A and drops the follow-up for B, who paid again on Wednesday. Cancelling or rescheduling is editing one row, but the poller and the last-moment check have to be built.",
	},
} as const;
type Lang = keyof typeof LABELS;

const H = 452;
const ROW_H = 30;
const TABLE_Y = 112;
const TOP = TABLE_Y + 26;
// 열 경계: id | 예약 | send_at | 상태 | 이번 폴링
const COLS = [8, 34, 152, 254, 316, 452];
const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;

export default function ReservationTableDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const center = (c: number) => (COLS[c] + COLS[c + 1]) / 2;
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: "url(#rt-arrow)" } as const;
	const bottomY = TOP + ROW_H * 5 + 26;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<defs>
				<marker id="rt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>
			<text x="452" y="18" textAnchor="end" fontSize="12" fontWeight="600" fill="var(--muted-foreground)">
				{T.now}
			</text>

			{/* 예약을 적는 두 곳 */}
			{T.writers.map(([name, sub], i) => {
				const x = i === 0 ? 8 : 238;
				return (
					<g key={name}>
						<rect x={x} y="32" width="214" height="48" rx="10" {...box} />
						<text x={x + 107} y="52" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
							{name}
						</text>
						<text x={x + 107} y="70" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
							{sub}
						</text>
						<line {...line} x1={x + 107} y1="80" x2={x + 107} y2={TABLE_Y - 2} />
					</g>
				);
			})}

			{/* 예약 테이블 */}
			<rect x="8" y={TABLE_Y} width="444" height={26 + ROW_H * 5} rx="8" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			{[0, 1].map((i) => (
				<rect key={i} x="9" y={TOP + i * ROW_H} width="442" height={ROW_H} fill="var(--accent)" fillOpacity="0.1" />
			))}
			<line x1="8" y1={TOP} x2="452" y2={TOP} stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			{[1, 2, 3, 4].map((i) => (
				<line key={i} x1="8" y1={TOP + i * ROW_H} x2="452" y2={TOP + i * ROW_H} stroke="rgb(var(--gray))" strokeOpacity="0.2" />
			))}
			{T.head.map((h, c) => (
				<text key={h} x={center(c)} y={TABLE_Y + 17.5} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
					{h}
				</text>
			))}
			{T.what.map((what, i) => {
				const y = TOP + i * ROW_H;
				const due = i < 2;
				const cancelled = i === 2;
				const cell = cancelled ? "var(--muted-foreground)" : "var(--foreground)";
				const mid = y + 19.5;
				return (
					<g key={what}>
						<text x={center(0)} y={mid} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
							{i + 1}
						</text>
						<text x={COLS[1] + 8} y={mid} fontSize="12" fill={cell} textDecoration={cancelled ? "line-through" : undefined}>
							{what}
						</text>
						{i === 3 ? (
							<>
								<text x={center(2)} y={y + 12.5} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
									{T.sendAt[i]}
								</text>
								<text x={center(2)} y={y + 25.5} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
									{T.changed}
								</text>
							</>
						) : (
							<text x={center(2)} y={mid} textAnchor="middle" fontSize={i === 4 ? 11 : 12} fill={cell}>
								{T.sendAt[i]}
							</text>
						)}
						<text x={center(3)} y={mid} textAnchor="middle" fontSize="12" fontWeight={cancelled ? 600 : 400} fill={cancelled ? "var(--destructive)" : cell}>
							{T.status[i]}
						</text>
						<text x={center(4)} y={mid} textAnchor="middle" fontSize="12" fontWeight={due ? 700 : 400} fill={due ? "var(--accent)" : "var(--muted-foreground)"}>
							{T.result[i]}
						</text>
					</g>
				);
			})}

			{/* 폴러 → 큐 → 워커 */}
			<line {...line} x1="76" y1={TOP + ROW_H * 5} x2="76" y2={bottomY - 2} />
			<rect x="8" y={bottomY} width="136" height="70" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
			<text x="76" y={bottomY + 28} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
				{T.poller[0]}
			</text>
			<text x="76" y={bottomY + 49} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{T.poller[1]}
			</text>
			<line {...line} x1="144" y1={bottomY + 35} x2="158" y2={bottomY + 35} />
			<rect x="160" y={bottomY} width="118" height="70" rx="10" {...box} />
			<text x="219" y={bottomY + 28} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{T.queue[0]}
			</text>
			<text x="219" y={bottomY + 49} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{T.queue[1]}
			</text>
			<line {...line} x1="278" y1={bottomY + 35} x2="292" y2={bottomY + 35} />
			<rect x="294" y={bottomY} width="158" height="70" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
			<text x="373" y={bottomY + 22} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{T.worker[0]}
			</text>
			<text x="373" y={bottomY + 41} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{T.worker[1]}
			</text>
			<text x="373" y={bottomY + 59} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--accent)">
				{T.worker[2]}
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

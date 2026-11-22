// 예약을 EventBridge Scheduler 같은 관리형 스케줄러의 일정으로 맡겼을 때의 구성.
// 지금은 화 11:00이다. 재안내는 결제 id로, 어드민 예약은 사용자를 넣은 이름으로 일정을 짓고, 밤 공지는 반복 일정 하나다.
// B가 다시 결제해 retry.p-102는 이름으로 지웠다. 시각이 되면 스케줄러가 발송 큐에 메시지를 넣는다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "관리형 스케줄러에 맡긴 예약",
		now: "지금은 화 11:00",
		writers: [
			["결제 실패 처리", "일정 이름을 결제 id로 짓는다"],
			["어드민", "접두어 admin.u-C로 찾는다"],
		],
		scheduler: "EventBridge Scheduler",
		head: ["일정 이름", "언제", "큐에 넣을 메시지"],
		when: ["목 15:00 한 번", "목 15:00 한 번", "금 09:00 한 번", "매일 21:00"],
		msgs: ["payment: p-101", "이름으로 지웠다", "booking: 0412", "job: notice"],
		fire: "시각이 되면 메시지를 넣는다 · 분 단위",
		queue: ["발송 큐", "SQS"],
		worker: ["워커", "보내기 직전에 다시 본다"],
		notes: ["띄울 것은 없지만 찾는 길은 일정 이름뿐이다", "이름을 도메인 id에서 지을 수 있어야 다루기 쉽다"],
		aria: "예약을 관리형 스케줄러의 일정으로 맡긴 구성. 지금은 화요일 11시다. 결제 실패 처리는 일정 이름을 결제 id로 지어 일정을 만들고, 어드민은 이름 접두어 admin.u-C로 사용자 C의 예약을 찾는다. EventBridge Scheduler에는 일정이 넷 있다. retry.p-101은 목요일 15시에 한 번 돌고, retry.p-102는 사용자 B가 다시 결제해 이름으로 지웠다. admin.u-C.0412는 금요일 9시에 한 번 돌고, notice.nightly는 매일 21시에 도는 반복 일정이다. 시각이 되면 스케줄러가 분 단위로 SQS 발송 큐에 메시지를 넣고, 워커는 보내기 직전에 다시 확인한다. 띄울 것은 없지만 찾는 길은 일정 이름뿐이라, 이름을 도메인 id에서 지을 수 있어야 다루기 쉽다.",
	},
	en: {
		title: "Bookings handed to a managed scheduler",
		now: "now: Tue 11:00",
		writers: [
			["payment failure handler", "names the schedule after the payment"],
			["admin", "finds by prefix admin.u-C"],
		],
		scheduler: "EventBridge Scheduler",
		head: ["schedule name", "when", "message to enqueue"],
		when: ["once, Thu 15:00", "once, Thu 15:00", "once, Fri 09:00", "daily 21:00"],
		msgs: ["payment: p-101", "deleted by name", "booking: 0412", "job: notice"],
		fire: "enqueues the message when due · to the minute",
		queue: ["send queue", "SQS"],
		worker: ["worker", "checks again before sending"],
		notes: ["nothing to run, but names are the only way to find a schedule", "it works best when names come from domain ids"],
		aria: "Bookings handed to a managed scheduler. It is Tuesday 11:00. The payment failure handler creates a schedule named after the payment id, and an admin finds user C's booking by the name prefix admin.u-C. EventBridge Scheduler holds four schedules. retry.p-101 runs once on Thursday at 15:00. retry.p-102 was deleted by name because user B paid again. admin.u-C.0412 runs once on Friday at 09:00, and notice.nightly is a recurring schedule that runs daily at 21:00. When a schedule is due, the scheduler puts its message on the SQS send queue to the minute, and the worker checks again right before sending. There is nothing to run, but names are the only way to find a schedule, so it works best when names come from domain ids.",
	},
} as const;
type Lang = keyof typeof LABELS;

const NAMES = ["retry.p-101", "retry.p-102", "admin.u-C.0412", "notice.nightly"];
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const BOX_Y = 112;
const ROWS_Y = BOX_Y + 50;
const ROW_H = 30;
const BOX_H = 50 + ROW_H * 4 + 10;
const FLOW_Y = BOX_Y + BOX_H + 30;
const H = FLOW_Y + 56 + 70;
const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;

export default function ManagedSchedulerDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: "url(#ms-arrow)" } as const;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<defs>
				<marker id="ms-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>
			<text x="452" y="18" textAnchor="end" fontSize="12" fontWeight="600" fill="var(--muted-foreground)">
				{T.now}
			</text>

			{/* 일정을 만들고 찾는 두 곳 */}
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
						<line {...line} x1={x + 107} y1="80" x2={x + 107} y2={BOX_Y - 2} />
					</g>
				);
			})}

			{/* 스케줄러 안의 일정 */}
			<rect x="8" y={BOX_Y} width="444" height={BOX_H} rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
			<text x="20" y={BOX_Y + 22} fontSize="13.5" fontWeight="700" fill="var(--foreground)">
				{T.scheduler}
			</text>
			{T.head.map((h, c) => (
				<text key={h} x={[20, 232, 300][c]} y={BOX_Y + 42} textAnchor={c === 1 ? "middle" : "start"} fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
					{h}
				</text>
			))}
			{NAMES.map((name, i) => {
				const y = ROWS_Y + i * ROW_H;
				const gone = i === 1;
				const mid = y + 19.5;
				return (
					<g key={name}>
						<rect x="16" y={y} width="428" height={ROW_H - 4} rx="6" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity={gone ? 0.2 : 0.4} />
						<text
							x="26"
							y={mid}
							fontSize="11.5"
							fontFamily={MONO}
							fontWeight="600"
							fill={gone ? "var(--muted-foreground)" : "var(--foreground)"}
							textDecoration={gone ? "line-through" : undefined}
						>
							{name}
						</text>
						<text x="232" y={mid} textAnchor="middle" fontSize="12" fill={gone ? "var(--muted-foreground)" : i === 3 ? "var(--accent)" : "var(--foreground)"} fontWeight={i === 3 ? 600 : 400}>
							{T.when[i]}
						</text>
						<text x="300" y={mid} fontSize={gone ? 12 : 11.5} fontFamily={gone ? undefined : MONO} fontWeight={gone ? 700 : 400} fill={gone ? "var(--accent)" : "var(--muted-foreground)"}>
							{T.msgs[i]}
						</text>
					</g>
				);
			})}

			{/* 스케줄러 → 발송 큐 → 워커 */}
			<line {...line} x1="104" y1={BOX_Y + BOX_H} x2="104" y2={FLOW_Y - 2} />
			<text x="116" y={FLOW_Y - 10} fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
				{T.fire}
			</text>
			<rect x="8" y={FLOW_Y} width="192" height="56" rx="10" {...box} />
			<text x="104" y={FLOW_Y + 24} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{T.queue[0]}
			</text>
			<text x="104" y={FLOW_Y + 43} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{T.queue[1]}
			</text>
			<line {...line} x1="200" y1={FLOW_Y + 28} x2="214" y2={FLOW_Y + 28} />
			<rect x="216" y={FLOW_Y} width="236" height="56" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.6" />
			<text x="334" y={FLOW_Y + 24} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="var(--foreground)">
				{T.worker[0]}
			</text>
			<text x="334" y={FLOW_Y + 43} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{T.worker[1]}
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

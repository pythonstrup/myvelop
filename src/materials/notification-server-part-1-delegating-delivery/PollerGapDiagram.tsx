// 폴러가 예약 r-7을 큐로 옮기다 죽었을 때, 두 일의 순서에 따라 무엇이 남는지 나란히 놓은 그림.
// ① 상태를 먼저 바꾸면 테이블은 옮김인데 큐는 비어 예약이 사라진다.
// ② 큐에 먼저 넣으면 테이블은 아직 예약됨이라 다음 폴링이 한 번 더 넣지만, 예약 id를 작업 id로 써서 큐가 거른다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "폴러가 옮기다 죽으면",
		booking: "예약 r-7",
		lanes: ["① 상태를 먼저 바꾼다", "② 큐에 먼저 넣는다"],
		setMoved: ["상태 → 옮김", "예약 테이블"],
		enqueue: ["큐에 넣기", "작업 id = r-7"],
		notDone: "하지 못했다",
		crash: "죽는다",
		lost: ["큐는 비어 있다", "예약이 사라진다"],
		pending: ["테이블은 아직 예약됨", "큐에는 r-7이 있다"],
		later: "1분 뒤",
		repoll: ["다음 폴링", "r-7을 다시 넣는다"],
		dedupe: ["큐", "같은 id라 거른다"],
		once: ["r-7은 큐에 하나뿐", "한 번만 나간다"],
		notes: ["큐에 넣는 일과 상태를 바꾸는 일은 한 트랜잭션으로 묶이지 않는다", "큐에 먼저 넣고, 예약 id를 작업 id로 써서 중복을 거른다"],
		aria: "폴러가 예약 r-7을 큐로 옮기다 죽었을 때 두 순서를 비교한 그림. 첫째, 예약 테이블의 상태를 먼저 옮김으로 바꾸고 큐에 넣기 전에 죽으면, 테이블은 옮김인데 큐는 비어 있어 예약이 사라진다. 둘째, 작업 id를 r-7로 정해 큐에 먼저 넣고 상태를 바꾸기 전에 죽으면, 테이블은 아직 예약됨이고 큐에는 r-7이 있다. 1분 뒤 다음 폴링이 r-7을 다시 넣지만 큐가 같은 id라 걸러, r-7은 큐에 하나뿐이고 한 번만 나간다. 큐에 넣는 일과 상태를 바꾸는 일은 한 트랜잭션으로 묶이지 않으므로, 큐에 먼저 넣고 예약 id를 작업 id로 써서 중복을 거른다.",
	},
	en: {
		title: "If the poller dies mid-move",
		booking: "booking r-7",
		lanes: ["① update the status first", "② enqueue first"],
		setMoved: ["status → moved", "reservation table"],
		enqueue: ["enqueue", "job id = r-7"],
		notDone: "never happened",
		crash: "dies",
		lost: ["the queue is empty", "the booking is lost"],
		pending: ["table still says booked", "queue holds r-7"],
		later: "1 min later",
		repoll: ["next poll", "enqueues r-7 again"],
		dedupe: ["queue", "drops the same id"],
		once: ["r-7 is queued once", "it goes out once"],
		notes: ["enqueueing and updating the status are not one transaction", "enqueue first and use the booking id as the job id"],
		aria: "Two orders compared for a poller that dies while moving booking r-7 into the queue. First, if it marks the row as moved and dies before enqueueing, the table says moved but the queue is empty, so the booking is lost. Second, if it enqueues with job id r-7 first and dies before updating the row, the table still says booked and the queue holds r-7. A minute later the next poll enqueues r-7 again, but the queue drops the same id, so r-7 is queued once and goes out once. Enqueueing and updating the status are not one transaction, so enqueue first and use the booking id as the job id.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const BOX_W = 120;
const BOX_H = 52;
const X1 = 20;
const X2 = 176;
const RX = 379;
const P1 = 32;
const P2 = 156;
const H = 418;

function Step({ x, y, title, sub, kind = "done", mono = false }: { x: number; y: number; title: string; sub: string; kind?: "done" | "skipped" | "good"; mono?: boolean }) {
	const skipped = kind === "skipped";
	const good = kind === "good";
	return (
		<g>
			<rect
				x={x}
				y={y}
				width={BOX_W}
				height={BOX_H}
				rx="9"
				fill={skipped ? "transparent" : "var(--background)"}
				stroke={good ? "var(--accent)" : "rgb(var(--gray))"}
				strokeOpacity={good ? 0.8 : skipped ? 0.5 : 0.6}
				strokeWidth={good ? 1.6 : 1.2}
				strokeDasharray={skipped ? "4 3" : undefined}
			/>
			<text x={x + BOX_W / 2} y={y + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill={skipped ? "var(--muted-foreground)" : "var(--foreground)"}>
				{title}
			</text>
			<text x={x + BOX_W / 2} y={y + 40} textAnchor="middle" fontSize="11" fontFamily={mono ? MONO : undefined} fill={good ? "var(--accent)" : "var(--muted-foreground)"} fontWeight={good ? 600 : 400}>
				{sub}
			</text>
		</g>
	);
}

function Crash({ cx, cy, label }: { cx: number; cy: number; label: string }) {
	return (
		<g>
			<circle cx={cx} cy={cy} r="10" fill="var(--destructive)" />
			<path d={`M ${cx - 4} ${cy - 4} L ${cx + 4} ${cy + 4} M ${cx + 4} ${cy - 4} L ${cx - 4} ${cy + 4}`} stroke="var(--background)" strokeWidth="2" strokeLinecap="round" />
			<text x={cx} y={cy + 24} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--destructive)">
				{label}
			</text>
		</g>
	);
}

function Result({ y, lines, tone }: { y: number; lines: readonly [string, string]; tone: string }) {
	return (
		<g>
			<text x={RX} y={y + 22} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{lines[0]}
			</text>
			<text x={RX} y={y + 42} textAnchor="middle" fontSize="13" fontWeight="700" fill={tone}>
				{lines[1]}
			</text>
		</g>
	);
}

export default function PollerGapDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: "url(#pg-arrow)" } as const;
	const r1 = P1 + 36;
	const r2 = P2 + 36;
	const r3 = r2 + BOX_H + 34;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<defs>
				<marker id="pg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>
			<text x="452" y="18" textAnchor="end" fontSize="12" fontWeight="600" fontFamily={MONO} fill="var(--muted-foreground)">
				{T.booking}
			</text>

			{/* ① 상태를 먼저 바꾼다 */}
			<rect x="8" y={P1} width="444" height="112" rx="10" fill="var(--secondary)" stroke="var(--destructive)" strokeOpacity="0.5" />
			<text x="20" y={P1 + 22} fontSize="13.5" fontWeight="700" fill="var(--foreground)">
				{T.lanes[0]}
			</text>
			<Step x={X1} y={r1} title={T.setMoved[0]} sub={T.setMoved[1]} />
			<Crash cx={158} cy={r1 + BOX_H / 2} label={T.crash} />
			<Step x={X2} y={r1} title={T.enqueue[0]} sub={T.notDone} kind="skipped" />
			<Result y={r1} lines={T.lost} tone="var(--destructive)" />

			{/* ② 큐에 먼저 넣는다 */}
			<rect x="8" y={P2} width="444" height="190" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.6" />
			<text x="20" y={P2 + 22} fontSize="13.5" fontWeight="700" fill="var(--foreground)">
				{T.lanes[1]}
			</text>
			<Step x={X1} y={r2} title={T.enqueue[0]} sub={T.enqueue[1]} mono />
			<Crash cx={158} cy={r2 + BOX_H / 2} label={T.crash} />
			<Step x={X2} y={r2} title={T.setMoved[0]} sub={T.notDone} kind="skipped" />
			<Result y={r2} lines={T.pending} tone="var(--foreground)" />

			<line {...line} x1={X1 + BOX_W / 2} y1={r2 + BOX_H} x2={X1 + BOX_W / 2} y2={r3 - 2} />
			<text x={X1 + BOX_W / 2 + 10} y={r2 + BOX_H + 21} fontSize="11" fontWeight="600" fill="var(--muted-foreground)">
				{T.later}
			</text>
			<Step x={X1} y={r3} title={T.repoll[0]} sub={T.repoll[1]} />
			<line {...line} x1={X1 + BOX_W} y1={r3 + BOX_H / 2} x2={X2 - 2} y2={r3 + BOX_H / 2} />
			<Step x={X2} y={r3} title={T.dedupe[0]} sub={T.dedupe[1]} kind="good" />
			<Result y={r3} lines={T.once} tone="var(--accent)" />

			<text x="230" y={H - 42} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.notes[0]}
			</text>
			<text x="230" y={H - 18} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{T.notes[1]}
			</text>
		</svg>
	);
}

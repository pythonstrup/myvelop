// 예약을 큐의 지연 작업으로 넣었을 때, 큐 안에서 예약이 어떤 모양으로 기다리는지 보여 주는 그림.
// 지금은 화 11:00이다. 재안내는 결제 id로 작업 id를 정했고, 어드민 예약은 큐가 정해 준 id를 받았다.
// ② B는 결제 id로 작업 id를 알 수 있어 바로 지운다. ③ C는 id를 모르면 전부 훑어야 하고, 문구도 넣을 때 그대로다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "큐 안에서 기다리는 지연 작업",
		now: "지금은 화 11:00",
		sub: "지연 작업은 보낼 시각 순으로만 줄 서 있다",
		head: ["", "보낼 시각", "작업 id", "작업 데이터"],
		sendAt: ["목 15:00", "목 15:00", "금 09:00", "다음 주 화 15:00"],
		data: ["사용자 A", "사용자 B", "사용자 C · 문구 전체", "사용자 E · 문구 전체"],
		marks: [
			{ n: 2, text: "B가 다시 결제하면 결제 id로 작업 id를 알아 바로 지운다", bad: false },
			{ n: 3, text: "어드민이 C의 예약을 찾으려면 작업을 모두 훑는다", bad: true },
			{ n: 3, text: "C의 문구는 넣을 때 그대로라 고친 문구가 들어가지 않는다", bad: true },
		],
		notes: ["넣기는 한 줄이지만 찾고 바꾸려면 작업 id가 필요하다", "id를 정할 규칙이 없으면 결국 어딘가에 적게 된다"],
		aria: "예약을 큐의 지연 작업으로 넣었을 때 큐 안의 모습. 지금은 화요일 11시다. 지연 작업 네 개가 보낼 시각 순으로 줄 서 있다. 1번과 2번은 사용자 A와 B의 재안내로 목요일 15시에 나가고, 작업 id를 결제 id에서 정해 retry:p-101, retry:p-102다. 3번은 금요일 9시에 나갈 사용자 C의 어드민 예약이고, 4번은 다음 주 화요일 15시에 나갈 사용자 E의 어드민 예약이다. 둘 다 큐가 정해 준 id를 받았고 문구 전체를 데이터로 담았다. B가 다시 결제하면 결제 id로 작업 id를 알아 바로 지울 수 있다. 하지만 어드민이 C의 예약을 찾으려면 작업을 모두 훑어야 하고, C의 문구는 넣을 때 그대로라 그사이 고친 문구가 들어가지 않는다. 넣기는 한 줄이지만 찾고 바꾸려면 작업 id가 필요하고, id를 정할 규칙이 없으면 결국 어딘가에 적게 된다.",
	},
	en: {
		title: "Delayed jobs waiting in the queue",
		now: "now: Tue 11:00",
		sub: "delayed jobs line up by due time and nothing else",
		head: ["", "due", "job id", "job data"],
		sendAt: ["Thu 15:00", "Thu 15:00", "Fri 09:00", "next Tue 15:00"],
		data: ["user A", "user B", "user C · full text", "user E · full text"],
		marks: [
			{ n: 2, text: "if B pays again, the payment id gives the job id to remove", bad: false },
			{ n: 3, text: "to find C's booking, an admin has to scan every job", bad: true },
			{ n: 3, text: "C's text is frozen at enqueue time, so edits never reach it", bad: true },
		],
		notes: ["adding is one line, but finding or changing needs the job id", "without a rule for ids, you end up writing them down somewhere"],
		aria: "What a queue looks like when bookings are delayed jobs. It is Tuesday 11:00. Four delayed jobs line up by due time. Jobs 1 and 2 are follow-ups for users A and B due Thursday 15:00, with job ids derived from payment ids: retry:p-101 and retry:p-102. Job 3 is an admin booking for user C due Friday 09:00, and job 4 is one for user E due next Tuesday 15:00. Both got ids from the queue and carry the full message text. If B pays again, the payment id gives the job id, so the job can be removed at once. But an admin looking for C's booking has to scan every job, and C's text is frozen at enqueue time, so later edits never reach it. Adding is one line, but finding or changing a booking needs its job id, and without a rule for ids you end up writing them down somewhere.",
	},
} as const;
type Lang = keyof typeof LABELS;

const ROW_H = 32;
const TABLE_Y = 56;
const TOP = TABLE_Y + 26;
// 열 경계: 번호 | 보낼 시각 | 작업 id | 작업 데이터
const COLS = [8, 36, 146, 262, 452];
const MARK_Y = TOP + ROW_H * 4 + 30;
const H = MARK_Y + 28 * 2 + 74;
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const IDS = ["retry:p-101", "retry:p-102", "8f3a2c", "d71e09"];

function Badge({ cx, cy, n, tone }: { cx: number; cy: number; n: number; tone: string }) {
	return (
		<g>
			<circle cx={cx} cy={cy} r="8.5" fill="var(--background)" stroke={tone} strokeWidth="1.5" />
			<text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={tone}>
				{n}
			</text>
		</g>
	);
}

export default function DelayedJobDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const center = (c: number) => (COLS[c] + COLS[c + 1]) / 2;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>
			<text x="452" y="18" textAnchor="end" fontSize="12" fontWeight="600" fill="var(--muted-foreground)">
				{T.now}
			</text>
			<text x="8" y="42" fontSize="12" fill="var(--muted-foreground)">
				{T.sub}
			</text>

			{/* 지연 작업 목록 */}
			<rect x="8" y={TABLE_Y} width="444" height={26 + ROW_H * 4} rx="8" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			<rect x="9" y={TOP + ROW_H} width="442" height={ROW_H} fill="var(--accent)" fillOpacity="0.1" />
			<rect x="9" y={TOP + ROW_H * 2} width="442" height={ROW_H} fill="var(--destructive)" fillOpacity="0.08" />
			<line x1="8" y1={TOP} x2="452" y2={TOP} stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			{[1, 2, 3].map((i) => (
				<line key={i} x1="8" y1={TOP + i * ROW_H} x2="452" y2={TOP + i * ROW_H} stroke="rgb(var(--gray))" strokeOpacity="0.2" />
			))}
			{T.head.map((h, c) => (
				<text key={c} x={c === 3 ? COLS[3] + 12 : center(c)} y={TABLE_Y + 17.5} textAnchor={c === 3 ? "start" : "middle"} fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
					{h}
				</text>
			))}
			{T.sendAt.map((at, i) => {
				const y = TOP + i * ROW_H;
				const mid = y + 20.5;
				const ours = i < 2;
				return (
					<g key={i}>
						{i === 1 || i === 2 ? (
							<Badge cx={center(0)} cy={y + 16} n={i + 1} tone={i === 1 ? "var(--accent)" : "var(--destructive)"} />
						) : (
							<text x={center(0)} y={mid} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
								{i + 1}
							</text>
						)}
						<text x={center(1)} y={mid} textAnchor="middle" fontSize={i === 3 ? 11 : 12} fill="var(--foreground)">
							{at}
						</text>
						<text x={center(2)} y={mid} textAnchor="middle" fontSize="11.5" fontFamily={MONO} fontWeight={ours ? 600 : 400} fill={ours ? "var(--accent)" : "var(--muted-foreground)"}>
							{IDS[i]}
						</text>
						<text x={COLS[3] + 12} y={mid} fontSize="12" fill="var(--foreground)">
							{T.data[i]}
						</text>
					</g>
				);
			})}

			{/* 번호별 설명 */}
			{T.marks.map((m, i) => {
				const y = MARK_Y + i * 28;
				const tone = m.bad ? "var(--destructive)" : "var(--accent)";
				return (
					<g key={m.text}>
						<Badge cx={20} cy={y} n={m.n} tone={tone} />
						<text x="36" y={y + 4.5} fontSize="12.5" fontWeight="600" fill={tone}>
							{m.text}
						</text>
					</g>
				);
			})}

			<text x="230" y={H - 42} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.notes[0]}
			</text>
			<text x="230" y={H - 18} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{T.notes[1]}
			</text>
		</svg>
	);
}

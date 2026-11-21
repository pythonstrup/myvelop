// 예약을 적지 않고 배치가 조건으로 대상을 찾을 때를 두 사용자의 타임라인으로 그린 그림.
// 배치는 매일 10:00에 "실패한 지 3일 이상 지났고 다시 결제하지 않은 사용자"를 찾는다.
// A와 B 모두 월 15:00에 결제가 실패했고, B만 수 14:00에 다시 결제했다.
// A는 목 10:00 배치 때 2일 19시간째라 빠지고 금 10:00에 나가 정한 시각(목 15:00)보다 19시간 늦는다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "매일 10시에 도는 재안내 배치",
		rule: "배치는 실패한 지 3일 이상 지났고 다시 결제하지 않은 사용자를 찾는다",
		days: ["월 10시", "화 10시", "수 10시", "목 10시", "금 10시"],
		users: ["사용자 A", "사용자 B"],
		failed: "결제 실패",
		due: "정한 시각",
		sent: "발송",
		late: "19시간 늦게",
		paid: "다시 결제",
		dropped: "대상에서 빠진다",
		notes: ["다시 결제한 B는 취소 로직 없이 대상에서 빠진다", "A는 다음 배치를 기다려 정한 시각보다 늦게 나간다"],
		aria: "매일 10시에 도는 재안내 배치가 실패한 지 3일 이상 지났고 다시 결제하지 않은 사용자를 찾는 모습. 사용자 A와 B 모두 월요일 15시에 결제가 실패했다. A는 화, 수, 목요일 10시 배치 때 아직 3일이 지나지 않아 빠지고, 금요일 10시 배치에서 발송된다. 정한 시각인 목요일 15시보다 19시간 늦다. B는 수요일 14시에 다시 결제해 목요일과 금요일 배치에서 취소 로직 없이 대상에서 빠진다.",
	},
	en: {
		title: "A follow-up batch that runs daily at 10:00",
		rule: "it looks for payments that failed 3+ days ago and were not paid again",
		days: ["Mon 10:00", "Tue 10:00", "Wed 10:00", "Thu 10:00", "Fri 10:00"],
		users: ["user A", "user B"],
		failed: "payment failed",
		due: "due",
		sent: "sent",
		late: "19 h late",
		paid: "paid again",
		dropped: "drops out",
		notes: ["B paid again and drops out with no cancel logic", "A waits for the next run and goes out late"],
		aria: "A follow-up batch runs daily at 10:00 and looks for users whose payment failed at least 3 days ago and who have not paid again. Users A and B both had a payment fail on Monday at 15:00. A is not yet 3 days old at the Tuesday, Wednesday, and Thursday runs and is sent at the Friday 10:00 run, 19 hours after the due time of Thursday 15:00. B pays again on Wednesday at 14:00 and drops out of the Thursday and Friday runs with no cancel logic.",
	},
} as const;
type Lang = keyof typeof LABELS;

const H = 304;
const X0 = 84;
const DW = 84;
// d: 월요일부터 센 날짜, h: 시각
const x = (d: number, h: number) => X0 + d * DW + ((h - 10) / 24) * DW;
const LANE = [136, 216];

function Check({ cx, cy, faded }: { cx: number; cy: number; faded?: boolean }) {
	return <circle cx={cx} cy={cy} r="4.5" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity={faded ? 0.35 : 0.8} strokeWidth="1.5" />;
}

export default function BatchScanDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const fail = x(0, 15);
	const due = x(3, 15);
	const sent = x(4, 10);
	const paid = x(2, 14);
	const [a, b] = LANE;
	const label = { fontSize: 11.5, fontWeight: 600, textAnchor: "middle" } as const;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>
			<text x="8" y="40" fontSize="12" fill="var(--muted-foreground)">
				{T.rule}
			</text>

			{/* 매일 10시 배치 */}
			{T.days.map((day, d) => (
				<g key={day}>
					<text x={x(d, 10)} y="72" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
						{day}
					</text>
					<line x1={x(d, 10)} y1="82" x2={x(d, 10)} y2="234" stroke="rgb(var(--gray))" strokeOpacity="0.45" strokeDasharray="3 4" />
				</g>
			))}

			{T.users.map((name, i) => (
				<text key={name} x="8" y={LANE[i] + 4.5} fontSize="13" fontWeight="700" fill="var(--foreground)">
					{name}
				</text>
			))}

			{/* 사용자 A: 화·수·목 배치에서 빠지고 금 10시에 나간다 */}
			<line x1={fail} y1={a} x2={sent} y2={a} stroke="rgb(var(--gray))" strokeOpacity="0.7" strokeWidth="1.5" />
			{[1, 2, 3].map((d) => (
				<Check key={d} cx={x(d, 10)} cy={a} />
			))}
			<circle cx={fail} cy={a} r="5" fill="var(--destructive)" />
			<text x={fail} y={a - 14} {...label} fill="var(--destructive)">
				{T.failed}
			</text>
			<path d={`M ${due} ${a - 6} L ${due + 6} ${a} L ${due} ${a + 6} L ${due - 6} ${a} Z`} fill="var(--background)" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="2 2" />
			<text x={due} y={a - 14} {...label} fill="var(--accent)">
				{T.due}
			</text>
			<circle cx={sent} cy={a} r="6" fill="var(--accent)" />
			<text x={sent} y={a - 14} {...label} fontWeight={700} fill="var(--accent)">
				{T.sent}
			</text>
			<path d={`M ${due} ${a + 12} v 6 H ${sent} v -6`} fill="none" stroke="var(--destructive)" strokeWidth="1.3" />
			<text x={(due + sent) / 2} y={a + 33} {...label} fontWeight={700} fill="var(--destructive)">
				{T.late}
			</text>

			{/* 사용자 B: 수 14시에 다시 결제해 목·금 배치에서 빠진다 */}
			<line x1={fail} y1={b} x2={paid} y2={b} stroke="rgb(var(--gray))" strokeOpacity="0.7" strokeWidth="1.5" />
			<line x1={paid} y1={b} x2={sent + 16} y2={b} stroke="rgb(var(--gray))" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 4" />
			{[1, 2].map((d) => (
				<Check key={d} cx={x(d, 10)} cy={b} />
			))}
			{[3, 4].map((d) => (
				<Check key={d} cx={x(d, 10)} cy={b} faded />
			))}
			<circle cx={fail} cy={b} r="5" fill="var(--destructive)" />
			<text x={fail} y={b - 14} {...label} fill="var(--destructive)">
				{T.failed}
			</text>
			<circle cx={paid} cy={b} r="5" fill="var(--accent)" />
			<text x={paid} y={b - 14} {...label} fill="var(--accent)">
				{T.paid}
			</text>
			<text x={(x(3, 10) + x(4, 10)) / 2} y={b + 24} {...label} fontWeight={400} fill="var(--muted-foreground)">
				{T.dropped}
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

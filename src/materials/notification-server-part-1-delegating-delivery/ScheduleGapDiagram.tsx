// 예약을 건 때와 보내는 때 사이 3일 동안 일어날 수 있는 일을 세로 타임라인으로 그린 그림.
// 월 15:00에 결제가 실패해 목 15:00로 재안내를 걸었다고 가정한다.
// 각 사건 아래에 예약을 표현하는 방식이 답해야 할 질문을 붙인다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "재안내를 건 뒤 3일 동안",
		rows: [
			["월 15:00", "결제가 실패해 목 15:00로 재안내를 건다", "여기서부터 3일을 버텨야 한다"],
			["화 11:00", "어드민이 걸린 재안내를 찾아 문구를 고친다", "걸어 둔 예약을 찾아 바꿀 수 있는가"],
			["화 22:00", "발송 서버를 배포하며 재시작한다", "재시작 뒤에도 예약이 남아 있는가"],
			["수 14:00", "사용자가 다시 결제한다", "보내지 않도록 거둘 수 있는가"],
			["목 15:00", "정한 시각이 된다", "지금도 보내야 하는지 누가 따지는가"],
		],
		note: "예약은 정한 때부터 보내는 때까지 버티고, 보낼 때 다시 따져야 한다",
		aria: "월요일 15시에 결제가 실패해 목요일 15시로 재안내를 건 뒤 3일 동안 일어날 수 있는 일. 화요일 11시에 어드민이 걸린 재안내를 찾아 문구를 고치므로 걸어 둔 예약을 찾아 바꿀 수 있어야 한다. 화요일 22시에 발송 서버를 배포하며 재시작하므로 예약이 재시작 뒤에도 남아 있어야 한다. 수요일 14시에 사용자가 다시 결제하므로 재안내를 거둘 수 있어야 한다. 목요일 15시에 정한 시각이 되면 지금도 보내야 하는지 누군가 따져야 한다.",
	},
	en: {
		title: "Three days after the follow-up is booked",
		rows: [
			["Mon 15:00", "a payment fails; a follow-up is set for Thu 15:00", "it has to last three days from here"],
			["Tue 11:00", "an admin finds the follow-up and edits its text", "can a booked send be found and changed?"],
			["Tue 22:00", "the send server is redeployed and restarts", "is the booking still there afterwards?"],
			["Wed 14:00", "the user pays again", "can the follow-up be called off?"],
			["Thu 15:00", "the booked time arrives", "who checks it should still go out?"],
		],
		note: "a booking has to last until it is due, then be checked again",
		aria: "What can happen in the three days after a payment fails on Monday at 15:00 and a follow-up is booked for Thursday at 15:00. On Tuesday at 11:00 an admin finds the follow-up and edits its text, so a booked send has to be findable and changeable. On Tuesday at 22:00 the send server is redeployed, so the booking has to survive a restart. On Wednesday at 14:00 the user pays again, so the follow-up has to be called off. When Thursday 15:00 arrives, something has to check whether it should still go out.",
	},
} as const;
type Lang = keyof typeof LABELS;

const TOP = 46;
const ROW = 54;
const LINE_X = 92;
const H = TOP + ROW * 5 + 40;

export default function ScheduleGapDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const dotY = (i: number) => TOP + i * ROW + 13;
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>

			{/* 세로 시간축 */}
			<line x1={LINE_X} y1={dotY(0)} x2={LINE_X} y2={dotY(4)} stroke="rgb(var(--gray))" strokeOpacity="0.6" strokeWidth="1.5" />

			{T.rows.map(([time, event, question], i) => {
				const y = dotY(i);
				const edge = i === 0 || i === 4;
				return (
					<g key={time}>
						<text x={LINE_X - 14} y={y + 4.5} textAnchor="end" fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
							{time}
						</text>
						<circle
							cx={LINE_X}
							cy={y}
							r={edge ? 6 : 5}
							fill={i === 0 ? "var(--accent)" : "var(--background)"}
							stroke={edge ? "var(--accent)" : "rgb(var(--gray))"}
							strokeWidth={edge ? 2 : 1.5}
						/>
						<text x={LINE_X + 16} y={y + 4.5} fontSize="13.5" fontWeight="600" fill="var(--foreground)">
							{event}
						</text>
						<text x={LINE_X + 16} y={y + 25} fontSize="12" fontWeight={i === 0 ? 400 : 600} fill={i === 0 ? "var(--muted-foreground)" : "var(--accent)"}>
							{question}
						</text>
					</g>
				);
			})}

			<text x="230" y={H - 16} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{T.note}
			</text>
		</svg>
	);
}

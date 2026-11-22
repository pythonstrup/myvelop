// 외부 API의 5초 칸이 3초째에 꽉 찼을 때, 물러서는 세 방식이 이어서 무엇을 보내는지 나란히 놓은 그림.
// ① 실패한 작업만 재시도하면 칸이 닫히는 5초까지 거절이 이어진다.
// ② 큐 전체를 멈추면 첫 429에서 멈췄다가 Retry-After가 지난 5초에 다시 보낸다.
// ③ 속도를 낮추면 거절이 올 때마다 간격을 벌리고, 거절이 없으면 다시 좁힌다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "3초째에 429가 왔을 때",
		window: ["외부 API의", "칸"],
		filling: "채워진다",
		full: "가득 참",
		next: "새 칸",
		lanes: [
			["실패한 작업만", "재시도"],
			["큐 전체", "멈춤"],
			["속도", "낮추기"],
		],
		captions: ["칸이 닫힐 때까지 거절이 이어진다", "Retry-After: 2만큼 멈추고 재시도 횟수를 쓰지 않는다", "거절이 올 때마다 간격을 벌리고 다시 좁힌다"],
		pause: "2초 멈춤",
		legend: ["보냄", "거절(429)"],
		sec: (t: number) => `${t}초`,
		aria: "외부 API의 5초 칸이 3초째에 가득 찼을 때 세 방식이 이어서 무엇을 보내는지 비교한 그림. 첫째, 실패한 작업만 재시도하면 다른 작업은 계속 나가 칸이 닫히는 5초까지 거절이 이어진다. 둘째, 큐 전체를 멈추면 3초의 첫 429에서 멈추고 Retry-After 2초를 기다렸다가 5초부터 다시 보낸다. 재시도 횟수는 쓰지 않는다. 셋째, 속도를 낮추면 거절이 올 때마다 보내는 간격을 벌려 3초, 3.5초, 4.5초의 세 번만 거절되고, 5초 뒤 거절이 없자 간격을 다시 좁힌다.",
	},
	en: {
		title: "When a 429 arrives at second 3",
		window: ["the API's", "window"],
		filling: "filling",
		full: "full",
		next: "next window",
		lanes: [
			["retry failed", "jobs only"],
			["pause the", "whole queue"],
			["lower the", "rate"],
		],
		captions: ["rejections continue until the window closes", "waits out Retry-After: 2 and spends no retries", "widens the gap on each rejection, then narrows it"],
		pause: "pause 2s",
		legend: ["sent", "rejected (429)"],
		sec: (t: number) => `${t}s`,
		aria: "What three approaches send after the API's 5-second window fills up at second 3. First, retrying only the failed jobs lets other jobs keep going, so rejections continue until the window closes at 5 seconds. Second, pausing the whole queue stops at the first 429 at 3 seconds, waits out Retry-After of 2 seconds, and resumes at 5 seconds without spending retries. Third, lowering the rate widens the gap between sends on each rejection, so only the sends at 3, 3.5, and 4.5 seconds are rejected, and after 5 seconds without rejections the gap narrows again.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 460;
const X0 = 122;
const X1 = 446;
const MAX = 9;
const x = (t: number) => X0 + (t / MAX) * (X1 - X0);
const TOP = 46;
const LANE_Y = 96;
const LANE_H = 72;
const AXIS_Y = LANE_Y + LANE_H * 3 + 2;
const H = AXIS_Y + 58;

const range = (from: number, to: number, step: number) => {
	const out: number[] = [];
	for (let t = from; t < to - 1e-9; t += step) out.push(Math.round(t * 100) / 100);
	return out;
};

// 레인마다 보낸 시각과 거절된 시각.
const LANES: { sent: number[]; rejected: number[] }[] = [
	{ sent: [...range(0, 3, 0.25), ...range(5, 9, 0.25)], rejected: range(3, 5, 0.25) },
	{ sent: [...range(0, 3, 0.25), ...range(5, 9, 0.25)], rejected: [3] },
	{ sent: [...range(0, 3, 0.25), 5.5, 6.3, 7, 7.6, 8.1, 8.5, 8.85], rejected: [3, 3.5, 4.5] },
];

function Tick({ t, y }: { t: number; y: number }) {
	return <line x1={x(t)} y1={y} x2={x(t)} y2={y + 22} stroke="var(--accent)" strokeWidth="1.6" strokeOpacity="0.85" />;
}

function Cross({ t, y }: { t: number; y: number }) {
	const cx = x(t);
	const cy = y + 11;
	return <path d={`M ${cx - 3} ${cy - 3} L ${cx + 3} ${cy + 3} M ${cx + 3} ${cy - 3} L ${cx - 3} ${cy + 3}`} stroke="var(--destructive)" strokeWidth="1.8" strokeLinecap="round" />;
}

export default function BackoffLanesDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: W, margin: "1.75rem auto" }}>
			<text x="8" y="20" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>

			{/* 외부 API의 칸 */}
			<text x="8" y={TOP + 10} fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
				{T.window[0]}
			</text>
			<text x="8" y={TOP + 25} fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
				{T.window[1]}
			</text>
			<rect x={x(0) + 1} y={TOP} width={x(3) - x(0) - 1} height="28" rx="5" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.5" />
			<text x={(x(0) + x(3)) / 2} y={TOP + 18} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{T.filling}
			</text>
			<rect x={x(3)} y={TOP} width={x(5) - x(3) - 1} height="28" rx="5" fill="var(--destructive)" fillOpacity="0.14" stroke="var(--destructive)" strokeOpacity="0.6" />
			<text x={(x(3) + x(5)) / 2} y={TOP + 18} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--destructive)">
				{T.full}
			</text>
			<rect x={x(5) + 1} y={TOP} width={x(9) - x(5) - 1} height="28" rx="5" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.5" />
			<text x={(x(5) + x(9)) / 2} y={TOP + 18} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{T.next}
			</text>

			{/* 3초와 5초 기준선 */}
			{[3, 5].map((t) => (
				<line key={t} x1={x(t)} y1={TOP + 30} x2={x(t)} y2={AXIS_Y} stroke="rgb(var(--gray))" strokeOpacity="0.45" strokeDasharray="3 3" />
			))}

			{LANES.map((lane, i) => {
				const y = LANE_Y + i * LANE_H;
				return (
					<g key={i}>
						<rect x="4" y={y - 6} width={W - 8} height={LANE_H - 8} rx="9" fill="var(--secondary)" fillOpacity="0.5" />
						<text x="12" y={y + 10} fontSize="12" fontWeight="700" fill="var(--foreground)">
							{T.lanes[i][0]}
						</text>
						<text x="12" y={y + 26} fontSize="12" fontWeight="700" fill="var(--foreground)">
							{T.lanes[i][1]}
						</text>
						{i === 1 ? (
							<g>
								<rect x={x(3) + 6} y={y} width={x(5) - x(3) - 10} height="22" rx="5" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity="0.55" strokeDasharray="4 3" />
								<text x={(x(3) + x(5)) / 2 + 3} y={y + 15} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--muted-foreground)">
									{T.pause}
								</text>
							</g>
						) : null}
						{lane.sent.map((t) => (
							<Tick key={`s${t}`} t={t} y={y} />
						))}
						{lane.rejected.map((t) => (
							<Cross key={`r${t}`} t={t} y={y} />
						))}
						<text x={X0} y={y + 44} fontSize="11" fill="var(--muted-foreground)">
							{T.captions[i]}
						</text>
					</g>
				);
			})}

			{/* 시간 축 */}
			<line x1={X0} y1={AXIS_Y} x2={X1} y2={AXIS_Y} stroke="rgb(var(--gray))" strokeOpacity="0.5" />
			{Array.from({ length: MAX + 1 }, (_, t) => (
				<g key={t}>
					<line x1={x(t)} y1={AXIS_Y} x2={x(t)} y2={AXIS_Y + 4} stroke="rgb(var(--gray))" strokeOpacity="0.6" />
					<text x={x(t)} y={AXIS_Y + 16} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
						{T.sec(t)}
					</text>
				</g>
			))}

			{/* 범례 */}
			<g transform={`translate(${X0}, ${H - 14})`}>
				<line x1="0" y1="-9" x2="0" y2="3" stroke="var(--accent)" strokeWidth="1.6" />
				<text x="8" y="0" fontSize="11" fill="var(--muted-foreground)">
					{T.legend[0]}
				</text>
				<path d="M 70 -7 L 78 1 M 78 -7 L 70 1" stroke="var(--destructive)" strokeWidth="2" strokeLinecap="round" />
				<text x="86" y="0" fontSize="11" fill="var(--muted-foreground)">
					{T.legend[1]}
				</text>
			</g>
		</svg>
	);
}

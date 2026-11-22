// 슬라이딩 윈도우(로그 방식). 지금이 6.2초이고 지난 5초(1.2초~6.2초)에 보낸 기록이 100건이면,
// 가장 오래된 1.3초 기록이 창 밖으로 빠지는 6.3초까지 다음 발송을 미룬다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "지난 5초를 세는 방식",
		sends: "보낸 기록",
		now: "지금 6.2초",
		windowLabel: "지난 5초 · 100건",
		out: "창 밖",
		oldest: "가장 오래된 기록 1.3초",
		slide: "5초 뒤 창 밖으로 빠진다",
		next: "다음 발송 6.3초",
		count: (n: number) => `${n}건`,
		sec: (t: number) => `${t}초`,
		notes: ["어느 순간에 재도 지난 5초는 100건을 넘지 않는다", "자리가 없으면 가장 오래된 기록이 빠질 때까지 기다린다"],
		aria: "슬라이딩 윈도우를 로그 방식으로 세는 그림. 보낸 시각을 모두 기록한다. 0.3초 무렵의 20건은 이미 창 밖이다. 지금은 6.2초이고, 1.2초부터 6.2초까지의 지난 5초에 1.3초 무렵 30건, 3초 무렵 40건, 5.4초 무렵 30건, 모두 100건이 있다. 자리가 없으므로 가장 오래된 1.3초 기록이 5초 뒤 창 밖으로 빠지는 6.3초까지 다음 발송을 기다린다. 어느 순간에 재도 지난 5초는 100건을 넘지 않는다.",
	},
	en: {
		title: "Counting the last 5 seconds",
		sends: "send log",
		now: "now 6.2s",
		windowLabel: "last 5 seconds · 100",
		out: "out of window",
		oldest: "oldest entry 1.3s",
		slide: "leaves the window 5 seconds later",
		next: "next send 6.3s",
		count: (n: number) => `${n}`,
		sec: (t: number) => `${t}s`,
		notes: ["at any moment, the last 5 seconds hold at most 100", "with no room, wait until the oldest entry drops out"],
		aria: "Counting a sliding window with a log. Every send time is recorded. The 20 sends around 0.3 seconds are already outside the window. It is now 6.2 seconds, and the last 5 seconds, from 1.2 to 6.2, hold 30 sends around 1.3 seconds, 40 around 3 seconds, and 30 around 5.4 seconds, 100 in all. With no room left, the next send waits until 6.3 seconds, when the oldest entry at 1.3 seconds drops out of the window. At any moment, the last 5 seconds hold at most 100.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 460;
const H = 300;
const L = 24;
const R = 436;
const MAX = 7;
const x = (t: number) => L + (t / MAX) * (R - L);

function Cluster({ t1, t2, y, label, dim = false }: { t1: number; t2: number; y: number; label: string; dim?: boolean }) {
	const x1 = x(t1);
	const x2 = x(t2);
	const count = Math.max(3, Math.round((x2 - x1) / 3.2));
	return (
		<g opacity={dim ? 0.4 : 1}>
			{Array.from({ length: count }, (_, i) => {
				const cx = x1 + ((x2 - x1) * (i + 0.5)) / count;
				return <line key={i} x1={cx} y1={y} x2={cx} y2={y + 22} stroke={dim ? "rgb(var(--gray))" : "var(--accent)"} strokeWidth="1.4" />;
			})}
			<text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">
				{label}
			</text>
		</g>
	);
}

export default function SlidingLogDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const ySends = 86;
	const yWin = 124;
	const ySlide = 176;
	const yAxis = 214;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: W, margin: "1.75rem auto" }}>
			<defs>
				<marker id="sl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="var(--accent)" />
				</marker>
			</defs>
			<text x="8" y="20" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>

			{/* 지금 */}
			<line x1={x(6.2)} y1={40} x2={x(6.2)} y2={yAxis} stroke="var(--foreground)" strokeOpacity="0.55" strokeDasharray="3 3" />
			<text x={x(6.2)} y={50} textAnchor="end" dx="-4" fontSize="11.5" fontWeight="700" fill="var(--foreground)">
				{T.now}
			</text>

			<text x={L} y={ySends - 22} fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
				{T.sends}
			</text>
			<Cluster t1={0.2} t2={0.7} y={ySends} label={T.count(20)} dim />
			<Cluster t1={1.3} t2={1.8} y={ySends} label={T.count(30)} />
			<Cluster t1={3.0} t2={3.6} y={ySends} label={T.count(40)} />
			<Cluster t1={5.4} t2={6.1} y={ySends} label={T.count(30)} />

			{/* 지난 5초 */}
			<rect x={x(1.2)} y={yWin} width={x(6.2) - x(1.2)} height="26" rx="6" fill="var(--accent)" fillOpacity="0.1" stroke="var(--accent)" strokeOpacity="0.75" />
			<text x={(x(1.2) + x(6.2)) / 2} y={yWin + 17} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--accent)">
				{T.windowLabel}
			</text>
			<text x={(x(0) + x(1.2)) / 2} y={yWin + 17} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
				{T.out}
			</text>

			{/* 가장 오래된 기록이 빠지는 시각 */}
			<circle cx={x(1.3)} cy={ySlide} r="4" fill="var(--accent)" />
			<text x={x(1.3)} y={ySlide - 9} fontSize="10.5" fill="var(--muted-foreground)">
				{T.oldest}
			</text>
			<line x1={x(1.3) + 6} y1={ySlide} x2={x(6.3) - 7} y2={ySlide} stroke="var(--accent)" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#sl-arrow)" />
			<text x={(x(1.3) + x(6.3)) / 2} y={ySlide + 16} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
				{T.slide}
			</text>
			<circle cx={x(6.3)} cy={ySlide} r="5" fill="var(--background)" stroke="var(--accent)" strokeWidth="2" />
			<text x={x(6.3) + 8} y={ySlide - 9} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--accent)">
				{T.next}
			</text>

			{/* 시간 축 */}
			<line x1={L} y1={yAxis} x2={R} y2={yAxis} stroke="rgb(var(--gray))" strokeOpacity="0.5" />
			{Array.from({ length: MAX + 1 }, (_, t) => (
				<g key={t}>
					<line x1={x(t)} y1={yAxis} x2={x(t)} y2={yAxis + 4} stroke="rgb(var(--gray))" strokeOpacity="0.6" />
					<text x={x(t)} y={yAxis + 16} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
						{T.sec(t)}
					</text>
				</g>
			))}

			<text x={W / 2} y={H - 30} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.notes[0]}
			</text>
			<text x={W / 2} y={H - 10} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{T.notes[1]}
			</text>
		</svg>
	);
}

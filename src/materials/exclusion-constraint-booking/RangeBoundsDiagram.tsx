// '[)' 와 '[]' 가 맞닿은 두 예약의 경계(11:00)를 어떻게 다루는지 나란히 놓는다. 시간은 요구사항 그림처럼 세로축이다.
// 채운 점은 그 시각을 포함, 빈 점은 그 시각을 뺀다는 뜻이다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const T0 = 10;
const T1 = 12;
const Y0 = 46;
const Y1 = 166;
const COL_X = 40;
const COL_W = 56;
const y = (hour: number) => Y0 + ((Y1 - Y0) * (hour - T0)) / (T1 - T0);

const LABELS = {
	ko: {
		legend: ["그 시각을 포함", "그 시각을 뺌"],
		titles: ["반열린 구간", "닫힌 구간"],
		existing: "기존",
		fresh: "새 예약",
		at: "11:00에서",
		prev: "앞 예약",
		next: "뒤 예약",
		results: ["겹치지 않음 → 허용", "한 점이 겹침 → 거절"],
		aria: "회의실 A의 10:00–11:00 예약 바로 뒤에 11:00–12:00 예약을 넣는 두 경우. '[)' 반열린 구간에서는 앞 예약이 11:00을 빼고 뒤 예약이 11:00을 포함해서 겹치지 않고 허용된다. '[]' 닫힌 구간에서는 두 예약이 모두 11:00을 포함해서 그 한 점이 겹치고 거절된다.",
	},
	en: {
		legend: ["includes the instant", "excludes the instant"],
		titles: ["half-open", "closed"],
		existing: "Booked",
		fresh: "New",
		at: "At 11:00",
		prev: "earlier",
		next: "later",
		results: ["no overlap → OK", "share a point → rejected"],
		aria: "Two cases of booking room A for 11:00–12:00 right after a 10:00–11:00 booking. With the half-open '[)' range, the earlier booking excludes 11:00 and the later one includes it, so they do not overlap and the booking is accepted. With the closed '[]' range, both include 11:00, so they share that single point and the booking is rejected.",
	},
} as const;
type Lang = keyof typeof LABELS;
type Labels = (typeof LABELS)[Lang];

// 넓으면 두 칸을 나란히, 좁으면 위아래로 놓는다.
const STYLE = `
	.rbd { container-type: inline-size; }
	.rbd-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.25rem 2rem; }
	@container (min-width: 440px) { .rbd-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

function Dot({ cx, cy, filled, color }: { cx: number; cy: number; filled: boolean; color: string }) {
	return <circle cx={cx} cy={cy} r="4.5" fill={filled ? color : "var(--background)"} stroke={color} strokeWidth="1.8" />;
}

function PanelSvg({ closed, t }: { closed: boolean; t: Labels }) {
	const i = closed ? 1 : 0;
	const result = closed ? "var(--destructive)" : "var(--accent)";
	const b = y(11);
	const dotPrev = COL_X + 18;
	const dotNext = COL_X + COL_W - 18;
	return (
		<svg viewBox="0 0 220 178" aria-hidden="true" style={{ display: "block", width: "100%" }}>
			<text x="0" y="14" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				<tspan fontWeight="700">{closed ? "'[]'" : "'[)'"}</tspan>
				<tspan dx="6">{t.titles[i]}</tspan>
			</text>
			<text x={COL_X + COL_W / 2} y={Y0 - 8} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--foreground)">
				A
			</text>
			{[10, 11, 12].map((hour) => (
				<text key={hour} x={COL_X - 6} y={y(hour) + 3.5} fontSize="10" textAnchor="end" fill="var(--muted-foreground)">
					{`${hour}:00`}
				</text>
			))}
			<rect x={COL_X} y={Y0} width={COL_W} height={Y1 - Y0} rx="4" fill="none" stroke="var(--border)" />

			{/* 앞 예약 10:00–11:00, 뒤 예약 11:00–12:00. 경계가 보이게 위아래로 2px씩 띄운다. */}
			<rect x={COL_X} y={Y0} width={COL_W} height={b - Y0 - 2} rx="4" fill="rgb(var(--gray))" fillOpacity="0.35" />
			<text x={COL_X + COL_W / 2} y={Y0 + 18} fontSize="11" textAnchor="middle" fill="var(--foreground)">
				{t.existing}
			</text>
			<rect
				x={COL_X + 2}
				y={b + 2}
				width={COL_W - 4}
				height={Y1 - b - 4}
				rx="4"
				fill={result}
				fillOpacity="0.12"
				stroke={result}
				strokeWidth="2"
				strokeDasharray={closed ? "5 3" : undefined}
			/>
			<text x={COL_X + COL_W / 2} y={Y1 - 14} fontSize="11" textAnchor="middle" fill={result} fontWeight="600">
				{t.fresh}
			</text>

			{/* 경계 11:00. 닫힌 구간이면 두 예약이 함께 갖는 한 점을 빨갛게 칠한다. */}
			{closed && <line x1={COL_X - 2} x2={COL_X + COL_W + 2} y1={b} y2={b} stroke="var(--destructive)" strokeWidth="2.5" />}
			<Dot cx={dotPrev} cy={b} filled={closed} color={closed ? "var(--destructive)" : "var(--foreground)"} />
			<Dot cx={dotNext} cy={b} filled color={closed ? "var(--destructive)" : "var(--foreground)"} />

			{/* 오른쪽 설명: 어느 점이 어느 예약인지와 결과 */}
			<text x="110" y={b - 22} fontSize="10.5" fill="var(--muted-foreground)">
				{t.at}
			</text>
			<Dot cx={116} cy={b - 4} filled={closed} color="var(--foreground)" />
			<text x="126" y={b} fontSize="11" fill="var(--foreground)">
				{t.prev}
			</text>
			<Dot cx={116} cy={b + 14} filled color="var(--foreground)" />
			<text x="126" y={b + 18} fontSize="11" fill="var(--foreground)">
				{t.next}
			</text>
			<text x="110" y={b + 44} fontSize="11.5" fontWeight="600" fill={result}>
				{t.results[i]}
			</text>
		</svg>
	);
}

export default function RangeBoundsDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	return (
		<figure className="rbd" role="img" aria-label={t.aria} style={{ margin: "2rem auto", maxWidth: 560 }}>
			<style>{STYLE}</style>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1.2rem", justifyContent: "center", marginBottom: "1rem" }}>
				{t.legend.map((name, i) => (
					<span key={name} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
						<svg width="12" height="12" aria-hidden="true">
							<circle cx="6" cy="6" r="4.5" fill={i === 0 ? "var(--foreground)" : "var(--background)"} stroke="var(--foreground)" strokeWidth="1.8" />
						</svg>
						{name}
					</span>
				))}
			</div>
			<div className="rbd-grid">
				<PanelSvg closed={false} t={t} />
				<PanelSvg closed t={t} />
			</div>
		</figure>
	);
}

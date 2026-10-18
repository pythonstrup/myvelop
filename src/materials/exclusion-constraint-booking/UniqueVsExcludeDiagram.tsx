// UNIQUE 와 EXCLUDE 가 새 행을 기존 행과 비교하는 방식을 나란히 놓는다. 둘 다 모든 열의 비교가 참이면 거절하고,
// 다른 것은 열마다 쓰는 연산자뿐이다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		rule: "모든 열의 비교가 참이면 거절한다",
		rows: ["기존 행", "새 행"],
		trueText: "참",
		falseText: "거짓",
		time: "시간",
		panels: [
			{ title: "UNIQUE (room, starts_at)", times: ["10:00", "10:30"], op: "=", match: false, result: "하나가 거짓 → 통과, 겹친 예약이 생긴다" },
			{ title: "EXCLUDE (room =, 시간 &&)", times: ["10:00–11:00", "10:30–11:30"], op: "&&", match: true, result: "모두 참 → 거절" },
		],
		aria: "UNIQUE와 EXCLUDE의 비교 방식. 둘 다 모든 열의 비교가 참이면 거절한다. UNIQUE (room, starts_at)는 기존 행 A·10:00과 새 행 A·10:30을 등호로 비교한다. room은 참이지만 시작 시각은 거짓이라 통과하고, 시간이 겹친 예약이 생긴다. EXCLUDE는 room을 등호로, 시간을 겹침 연산자로 비교한다. A와 A는 같고 10:00–11:00과 10:30–11:30은 겹쳐서 모두 참이므로 거절한다.",
	},
	en: {
		rule: "Reject when every column comparison is true",
		rows: ["existing", "new"],
		trueText: "true",
		falseText: "false",
		time: "time",
		panels: [
			{ title: "UNIQUE (room, starts_at)", times: ["10:00", "10:30"], op: "=", match: false, result: "One is false → passes, bookings overlap" },
			{ title: "EXCLUDE (room =, time &&)", times: ["10:00–11:00", "10:30–11:30"], op: "&&", match: true, result: "All true → rejected" },
		],
		aria: "How UNIQUE and EXCLUDE compare rows. Both reject when every column comparison is true. UNIQUE (room, starts_at) compares the existing row A, 10:00 with the new row A, 10:30 using equality: room is true but the start time is false, so it passes and overlapping bookings appear. EXCLUDE compares room with equality and time with the overlap operator: A equals A and 10:00–11:00 overlaps 10:30–11:30, so both are true and the row is rejected.",
	},
} as const;
type Lang = keyof typeof LABELS;
type Labels = (typeof LABELS)[Lang];

// 넓으면 두 칸을 나란히, 좁으면 위아래로 놓는다.
const STYLE = `
	.uve { container-type: inline-size; }
	.uve-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem 2rem; }
	@container (min-width: 560px) { .uve-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

const ROOM_X = 64;
const ROOM_W = 54;
const TIME_X = 128;
const TIME_W = 168;
const ROW_Y = [40, 74];
const ROW_H = 26;

function Verdict({ x, y, op, ok, t }: { x: number; y: number; op: string; ok: boolean; t: Labels }) {
	return (
		<text x={x} y={y} fontSize="12" textAnchor="middle" fill={ok ? "var(--foreground)" : "var(--muted-foreground)"}>
			<tspan fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" fontWeight="700">
				{op}
			</tspan>
			<tspan dx="6" fontWeight="600" fill={ok ? "var(--accent)" : "var(--destructive)"}>
				{ok ? t.trueText : t.falseText}
			</tspan>
		</text>
	);
}

function PanelSvg({ p, t }: { p: Labels["panels"][number]; t: Labels }) {
	const cell = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.4, rx: 4 } as const;
	const value = { fontSize: 12.5, fontWeight: 600, textAnchor: "middle", fill: "var(--foreground)" } as const;
	return (
		<svg viewBox="0 0 300 176" aria-hidden="true" style={{ display: "block", width: "100%" }}>
			<text x="0" y="14" fontSize="12.5" fontWeight="700" fill="var(--foreground)" fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
				{p.title}
			</text>
			<text x={ROOM_X + ROOM_W / 2} y="32" fontSize="10.5" textAnchor="middle" fill="var(--muted-foreground)">
				room
			</text>
			<text x={TIME_X + TIME_W / 2} y="32" fontSize="10.5" textAnchor="middle" fill="var(--muted-foreground)">
				{p.op === "=" ? "starts_at" : t.time}
			</text>
			{ROW_Y.map((y, i) => (
				<g key={y}>
					<text x="0" y={y + ROW_H / 2 + 4} fontSize="11" fill="var(--muted-foreground)">
						{t.rows[i]}
					</text>
					<rect x={ROOM_X} y={y} width={ROOM_W} height={ROW_H} {...cell} />
					<text x={ROOM_X + ROOM_W / 2} y={y + ROW_H / 2 + 4.5} {...value}>
						A
					</text>
					<rect x={TIME_X} y={y} width={TIME_W} height={ROW_H} {...cell} />
					<text x={TIME_X + TIME_W / 2} y={y + ROW_H / 2 + 4.5} {...value}>
						{p.times[i]}
					</text>
				</g>
			))}
			<Verdict x={ROOM_X + ROOM_W / 2} y={124} op="=" ok t={t} />
			<Verdict x={TIME_X + TIME_W / 2} y={124} op={p.op} ok={p.match} t={t} />
			<line x1="0" x2="296" y1="140" y2="140" stroke="var(--border)" />
			<text x="0" y="162" fontSize="12" fontWeight="600" fill={p.match ? "var(--accent)" : "var(--destructive)"}>
				{p.result}
			</text>
		</svg>
	);
}

export default function UniqueVsExcludeDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	return (
		<figure className="uve" role="img" aria-label={t.aria} style={{ margin: "2rem auto", maxWidth: 680 }}>
			<style>{STYLE}</style>
			<p style={{ margin: "0 0 1rem", textAlign: "center", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>{t.rule}</p>
			<div className="uve-grid">
				{t.panels.map((p) => (
					<PanelSvg key={p.title} p={p} t={t} />
				))}
			</div>
		</figure>
	);
}

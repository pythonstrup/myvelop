// 요구사항 1·2·5·6을 회의실 A·B·C × 시간 격자 네 칸으로 보여 준다. 예약 화면처럼 회의실은 열, 시간은 세로축이다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const T0 = 10; // 10:00
const T1 = 13; // 13:00
const Y0 = 44;
const Y1 = 206;
const COL_X = [38, 82, 126]; // A·B·C 열의 왼쪽 변
const COL_W = 40;
const y = (hour: number) => Y0 + ((Y1 - Y0) * (hour - T0)) / (T1 - T0);

type Bar = { rooms: number[]; from: number; to: number };
type Request = Bar & { ok: boolean; label?: string };
type Panel = { title: string; existing: Bar[]; requests: Request[]; conflict?: Bar };

const LABELS = {
	ko: {
		legend: ["기존 예약", "받아들이는 요청", "거절하는 요청"],
		existing: "기존",
		ok: "허용",
		rejected: "거절",
		titles: ["1. 겹치면 거절", "2. 맞닿으면 허용", "5. 다른 회의실은 따로", "6. 연결 예약"],
		linked: ["A+B 허용", "A+C 거절"],
		aria: "회의실 A·B·C를 열로, 10시부터 13시까지를 세로축으로 둔 시간 격자 네 개. 1번: A에 10시–11시 예약이 있을 때 A 10시 30분–11시 30분 요청은 겹쳐서 거절된다. 2번: 같은 상황에서 A 11시–12시 요청은 맞닿기만 해서 받아들여진다. 5번: B 10시–11시 요청은 A의 예약과 상관없이 받아들여진다. 6번: A+B 10시–11시 요청은 두 회의실을 함께 차지하고, B를 건너뛴 A+C 11시 30분–12시 30분 요청은 거절된다.",
	},
	en: {
		legend: ["Existing booking", "Accepted request", "Rejected request"],
		existing: "Booked",
		ok: "OK",
		rejected: "Rejected",
		titles: ["1. Overlap: rejected", "2. Touching: OK", "5. Other room: OK", "6. Linked rooms"],
		linked: ["A+B OK", "A+C rejected"],
		aria: "Four grids with rooms A, B, and C as columns and 10:00 to 13:00 running down. 1: with A booked 10:00–11:00, a request for A 10:30–11:30 overlaps and is rejected. 2: in the same situation, a request for A 11:00–12:00 only touches it and is accepted. 5: a request for B 10:00–11:00 is accepted regardless of A's booking. 6: a request for A+B 10:00–11:00 takes both rooms, and a request for A+C 11:30–12:30, which skips B, is rejected.",
	},
} as const;
type Lang = keyof typeof LABELS;
type Labels = (typeof LABELS)[Lang];

const ROOM_NAMES = ["A", "B", "C"];

// 칸 너비는 글 폭(컨테이너)을 따른다. 넓으면 네 칸 한 줄, 좁으면 2×2.
const STYLE = `
	.brd { container-type: inline-size; }
	.brd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem 1.5rem; }
	@container (min-width: 600px) { .brd-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
`;

function panels(t: Labels): Panel[] {
	const booked: Bar = { rooms: [0], from: 10, to: 11 };
	return [
		{ title: t.titles[0], existing: [booked], requests: [{ rooms: [0], from: 10.5, to: 11.5, ok: false }], conflict: { rooms: [0], from: 10.5, to: 11 } },
		{ title: t.titles[1], existing: [booked], requests: [{ rooms: [0], from: 11, to: 12, ok: true }] },
		{ title: t.titles[2], existing: [booked], requests: [{ rooms: [1], from: 10, to: 11, ok: true }] },
		{
			title: t.titles[3],
			existing: [],
			requests: [
				{ rooms: [0, 1], from: 10, to: 11, ok: true, label: t.linked[0] },
				{ rooms: [0, 2], from: 11.5, to: 12.5, ok: false, label: t.linked[1] },
			],
		},
	];
}

// 이어진 회의실은 막대 하나로, 떨어진 회의실(A+C)은 막대 둘을 점선으로 잇는다. 결과는 막대 아래에 적는다.
function RequestBar({ r, t }: { r: Request; t: Labels }) {
	const color = r.ok ? "var(--accent)" : "var(--destructive)";
	const stroke = { stroke: color, strokeWidth: 2, strokeDasharray: r.ok ? undefined : "5 3" };
	const y0 = y(r.from);
	const h = y(r.to) - y0;
	const first = r.rooms[0];
	const last = r.rooms[r.rooms.length - 1];
	const contiguous = last - first === r.rooms.length - 1;
	const rects = contiguous
		? [{ x: COL_X[first] + 3, w: COL_X[last] + COL_W - 3 - (COL_X[first] + 3) }]
		: r.rooms.map((room) => ({ x: COL_X[room] + 3, w: COL_W - 6 }));
	const midX = (COL_X[first] + COL_X[last] + COL_W) / 2;
	return (
		<g>
			{rects.map((b) => (
				<rect key={b.x} x={b.x} y={y0} width={b.w} height={h} rx="4" fill={color} fillOpacity="0.12" {...stroke} />
			))}
			{!contiguous && (
				<line x1={COL_X[first] + COL_W - 3} x2={COL_X[last] + 3} y1={y0 + h / 2} y2={y0 + h / 2} {...stroke} strokeWidth={1.5} />
			)}
			<text x={midX} y={y(r.to) + 14} fontSize="11" fontWeight="600" textAnchor="middle" fill={color}>
				{r.label ?? (r.ok ? t.ok : t.rejected)}
			</text>
		</g>
	);
}

function PanelSvg({ p, t }: { p: Panel; t: Labels }) {
	const right = COL_X[2] + COL_W;
	return (
		<svg viewBox="0 0 170 232" aria-hidden="true" style={{ display: "block", width: "100%" }}>
			<text x="0" y="14" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				{p.title}
			</text>
			{ROOM_NAMES.map((name, i) => (
				<text key={name} x={COL_X[i] + COL_W / 2} y={Y0 - 8} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--foreground)">
					{name}
				</text>
			))}

			{/* 시각 눈금: 정시는 실선, 30분은 점선 */}
			{[10, 10.5, 11, 11.5, 12, 12.5, 13].map((hour) => (
				<line
					key={hour}
					x1={COL_X[0] - 2}
					x2={right + 2}
					y1={y(hour)}
					y2={y(hour)}
					stroke={Number.isInteger(hour) ? "rgb(var(--gray))" : "var(--border)"}
					strokeOpacity={Number.isInteger(hour) ? 0.35 : 1}
					strokeDasharray={Number.isInteger(hour) ? undefined : "2 3"}
				/>
			))}
			{[10, 11, 12, 13].map((hour) => (
				<text key={hour} x={COL_X[0] - 6} y={y(hour) + 3.5} fontSize="10" textAnchor="end" fill="var(--muted-foreground)">
					{`${hour}:00`}
				</text>
			))}
			{COL_X.map((cx) => (
				<rect key={cx} x={cx} y={Y0} width={COL_W} height={Y1 - Y0} rx="4" fill="none" stroke="var(--border)" />
			))}

			{p.existing.map((b) => (
				<g key={`${b.rooms.join()}-${b.from}`}>
					<rect x={COL_X[b.rooms[0]]} y={y(b.from)} width={COL_W} height={y(b.to) - y(b.from)} rx="4" fill="rgb(var(--gray))" fillOpacity="0.35" />
					{/* 1번 칸에서 요청 막대가 10:30에 시작하므로 라벨은 막대 위쪽에 붙인다 */}
					<text x={COL_X[b.rooms[0]] + COL_W / 2} y={y(b.from) + 16} fontSize="11" textAnchor="middle" fill="var(--foreground)">
						{t.existing}
					</text>
				</g>
			))}
			{p.conflict && (
				<rect
					x={COL_X[p.conflict.rooms[0]]}
					y={y(p.conflict.from)}
					width={COL_W}
					height={y(p.conflict.to) - y(p.conflict.from)}
					fill="var(--destructive)"
					fillOpacity="0.25"
				/>
			)}
			{p.requests.map((r) => (
				<RequestBar key={`${r.rooms.join()}-${r.from}`} r={r} t={t} />
			))}
		</svg>
	);
}

export default function BookingRulesDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const swatch = (i: number) =>
		i === 0
			? { fill: "rgb(var(--gray))", fillOpacity: 0.35 }
			: {
					fill: i === 1 ? "var(--accent)" : "var(--destructive)",
					fillOpacity: 0.12,
					stroke: i === 1 ? "var(--accent)" : "var(--destructive)",
					strokeWidth: 2,
					strokeDasharray: i === 2 ? "5 3" : undefined,
				};
	return (
		<figure className="brd" role="img" aria-label={t.aria} style={{ margin: "2rem auto", maxWidth: 720 }}>
			<style>{STYLE}</style>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1.2rem", justifyContent: "center", marginBottom: "1rem" }}>
				{t.legend.map((name, i) => (
					<span key={name} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
						<svg width="22" height="12" aria-hidden="true">
							<rect x="1" y="1" width="20" height="10" rx="2" {...swatch(i)} />
						</svg>
						{name}
					</span>
				))}
			</div>
			<div className="brd-grid">
				{panels(t).map((p) => (
					<PanelSvg key={p.title} p={p} t={t} />
				))}
			</div>
		</figure>
	);
}

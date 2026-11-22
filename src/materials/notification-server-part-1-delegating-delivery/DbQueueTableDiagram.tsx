// DB 테이블을 큐로 쓸 때, 쿼리 하나로 다섯 행이 어떻게 갈리는지 보여 주는 그림.
// 지금은 10:00:00이고, 다른 워커가 2번 행을 잡고 있다고 가정한다.
// 우선순위 정렬(5번이 먼저), SKIP LOCKED(2번 건너뜀), 지연 발송(3번 제외), 재시도 간격(4번 제외).
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "쿼리 하나로 갈리는 다섯 행",
		now: "지금은 10:00:00",
		head: ["id", "종류", "send_at", "priority", "결과"],
		types: ["공지", "공지", "재안내", "공지", "인증번호"],
		sendAt: ["10:00:00", "10:00:00", "3일 뒤", "10:00:30", "10:00:00"],
		results: [
			["두 번째로 집힌다", "우선순위 정렬"],
			["다른 워커가 잠가 건너뛴다", "SKIP LOCKED"],
			["보낼 시각 전이라 빠진다", "지연 발송"],
			["실패해서 30초 뒤로 미뤘다", "재시도 간격"],
			["가장 먼저 집힌다", "우선순위 정렬"],
		],
		notes: ["지연, 재시도 간격, 우선순위가 열과 조건으로 표현된다", "한도 공유와 완료 행 정리는 쿼리 밖에서 직접 만든다"],
		aria: "DB 테이블을 큐로 쓸 때 쿼리 하나로 다섯 행이 갈리는 모습. 지금은 10시 정각이다. 워커가 send_at이 지금 이전이고 대기 상태인 행을 priority와 send_at 순으로 정렬해 두 개를 FOR UPDATE SKIP LOCKED로 집는다. 우선순위 1인 5번 인증번호가 가장 먼저, 1번 공지가 두 번째로 집힌다. 2번 공지는 다른 워커가 잠가 건너뛰고, 3번 재안내는 보낼 시각이 3일 뒤라 빠지며, 4번 공지는 실패해서 보낼 시각을 30초 뒤로 미뤄 빠진다. 지연, 재시도 간격, 우선순위가 열과 조건으로 표현되지만, 한도 공유와 완료 행 정리는 쿼리 밖에서 직접 만들어야 한다.",
	},
	en: {
		title: "One query over five rows",
		now: "now: 10:00:00",
		head: ["id", "type", "send_at", "priority", "result"],
		types: ["notice", "notice", "follow-up", "notice", "OTP"],
		sendAt: ["10:00:00", "10:00:00", "in 3 days", "10:00:30", "10:00:00"],
		results: [
			["picked second", "priority order"],
			["locked elsewhere, skipped", "SKIP LOCKED"],
			["not due yet, left out", "delayed send"],
			["failed, pushed back 30 s", "retry delay"],
			["picked first", "priority order"],
		],
		notes: ["delays, retry gaps, and priority become columns and conditions", "the shared limit and cleanup stay outside the query"],
		aria: "How one query splits five rows when a DB table is the queue. It is 10:00:00. A worker selects ready rows whose send_at has passed, ordered by priority and send_at, and takes two with FOR UPDATE SKIP LOCKED. Row 5, an OTP with priority 1, is picked first and row 1, a notice, second. Row 2 is locked by another worker and skipped, row 3 is a follow-up due in 3 days and left out, and row 4 failed and had its send_at pushed back 30 seconds. Delays, retry gaps, and priority become columns and conditions, but the shared limit and cleanup of finished rows have to be built outside the query.",
	},
} as const;
type Lang = keyof typeof LABELS;

const H = 412;
const ROW_H = 34;
const TOP = 72;
// 열 경계: id | 종류 | send_at | priority | 결과
const COLS = [8, 40, 112, 200, 264, 452];
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const QUERY = [
	"SELECT * FROM send_requests",
	"WHERE send_at <= now() AND status = 'ready'",
	"ORDER BY priority, send_at",
	"LIMIT 2 FOR UPDATE SKIP LOCKED",
];

export default function DbQueueTableDiagram({ lang = "ko" }: { lang?: Lang }) {
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

			{/* 표 */}
			<rect x="8" y="46" width="444" height={26 + ROW_H * 5} rx="8" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			{[0, 4].map((i) => (
				<rect key={i} x="9" y={TOP + i * ROW_H} width="442" height={ROW_H} fill="var(--accent)" fillOpacity="0.1" />
			))}
			<line x1="8" y1={TOP} x2="452" y2={TOP} stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			{[1, 2, 3, 4].map((i) => (
				<line key={i} x1="8" y1={TOP + i * ROW_H} x2="452" y2={TOP + i * ROW_H} stroke="rgb(var(--gray))" strokeOpacity="0.2" />
			))}
			{T.head.map((h, c) => (
				<text key={h} x={c === 4 ? COLS[4] + 10 : center(c)} y="63.5" textAnchor={c === 4 ? "start" : "middle"} fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
					{h}
				</text>
			))}
			{T.results.map(([result, feature], i) => {
				const y = TOP + i * ROW_H;
				const picked = i === 0 || i === 4;
				const failed = i === 3;
				const out = i === 1 || i === 2;
				const tone = picked ? "var(--accent)" : failed ? "var(--destructive)" : "var(--muted-foreground)";
				const cellTone = out ? "var(--muted-foreground)" : "var(--foreground)";
				return (
					<g key={result}>
						<text x={center(0)} y={y + 21.5} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
							{i + 1}
						</text>
						<text x={center(1)} y={y + 21.5} textAnchor="middle" fontSize="12" fontWeight={i === 4 ? 700 : 400} fill={cellTone}>
							{T.types[i]}
						</text>
						<text x={center(2)} y={y + 21.5} textAnchor="middle" fontSize="12" fontWeight={i === 2 || i === 3 ? 600 : 400} fill={i === 3 ? "var(--destructive)" : cellTone}>
							{T.sendAt[i]}
						</text>
						<text x={center(3)} y={y + 21.5} textAnchor="middle" fontSize="12" fontWeight={i === 4 ? 700 : 400} fill={i === 4 ? "var(--accent)" : cellTone}>
							{i === 4 ? 1 : 5}
						</text>
						<text x={COLS[4] + 10} y={y + 15} fontSize="12" fontWeight={picked || failed ? 600 : 400} fill={tone}>
							{result}
						</text>
						<text x={COLS[4] + 10} y={y + 28} fontSize="10" fill="var(--muted-foreground)">
							{feature}
						</text>
					</g>
				);
			})}

			{/* 워커가 던지는 쿼리 */}
			<rect x="8" y="258" width="444" height="88" rx="8" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity="0.6" />
			{QUERY.map((q, i) => (
				<text key={q} x="20" y={280 + i * 18} fontSize="11.5" fontFamily={MONO} fill="var(--foreground)">
					{q}
				</text>
			))}

			<text x="230" y={H - 42} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.notes[0]}
			</text>
			<text x="230" y={H - 18} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{T.notes[1]}
			</text>
		</svg>
	);
}

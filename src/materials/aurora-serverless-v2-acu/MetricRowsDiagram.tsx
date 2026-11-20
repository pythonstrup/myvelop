// ACU와 원인이 되는 지표들을 시간축을 맞춰 위아래로 늘어놓은 정적 그림.
// 원인마다 ACU와 함께 움직이는 지표가 다르다는 것을 같은 꼴로 견주려고 scenario로 나눈다.
// 값은 모두 그림을 위해 가정한 것이고, 줄마다 0~1로 맞춘 높이다.

const N = 120;
const X0 = 20;
const X1 = 460;
const ROW_TOP = 26;
const ROW_STEP = 76;
const PLOT_H = 44;
const x = (i: number) => X0 + ((X1 - X0) * i) / (N - 1);
// 같은 그림이 늘 같게 그려지도록 고른 흔들림
const jitter = (i: number, seed: number) => 0.5 + 0.5 * Math.sin(i * 12.9898 + seed * 78.233);
const series = (f: (i: number) => number) => Array.from({ length: N }, (_, i) => f(i));

// 구간 안에서는 계단을 밟아 to까지 오르고, 구간이 끝나면 from으로 내려오는 ACU
function acuSteps(from: number, to: number, band: Band) {
	const out: number[] = [];
	let c = from;
	for (let i = 0; i < N; i++) {
		if (i % 3 === 0) c = Math.round((c + ((inBand(i, band) ? to : from) - c) * 0.3) * 2) / 2;
		out.push(c);
	}
	return out;
}

type Band = { from: number; to: number; label: string };
type Row = { name: string; note: string; values: number[]; accent?: boolean; ref?: { value: number; label: string } };
type Scenario = { band: Band; rows: Row[]; caption: string; aria: string };

const inBand = (i: number, band: Band) => i / (N - 1) >= band.from && i / (N - 1) < band.to;

const CPU_BAND: Band = { from: 0.3, to: 0.7, label: "무거운 쿼리가 몰린다" };
const CPU_ACU = acuSteps(2, 10, CPU_BAND);

const WRITE_BAND: Band = { from: 0.32, to: 0.72, label: "큰 쓰기 작업" };

const IDLE_BAND: Band = { from: 0, to: 1, label: "애플리케이션이 조용한 시간" };

const SCENARIOS: Record<"cpu" | "write" | "idle", Scenario> = {
	cpu: {
		band: CPU_BAND,
		rows: [
			{ name: "ServerlessDatabaseCapacity", note: "지금 용량(ACU)", values: CPU_ACU.map((v) => v / 14), accent: true },
			{
				name: "CPUUtilization",
				note: "ACU와 함께 오르지만 숫자는 낮다",
				values: series((i) => (CPU_ACU[i] / 20) * 0.85 + 0.02 * jitter(i, 1)),
				ref: { value: 1, label: "100%" },
			},
			{ name: "DatabaseConnections", note: "연결 수", values: series((i) => (inBand(i, CPU_BAND) ? 0.72 + 0.1 * jitter(i, 2) : 0.18 + 0.05 * jitter(i, 3))) },
		],
		caption: "CPU가 ACU와 같은 때 오르면 CPU를 먼저 의심한다",
		aria: "무거운 쿼리가 몰리는 동안 세 지표를 시간축을 맞춰 위아래로 늘어놓은 그림. 가운데 칠한 구간이 쿼리가 몰리는 때다. 맨 위 ServerlessDatabaseCapacity는 구간이 시작되면 계단을 밟아 오르고 끝나면 내려온다. CPUUtilization도 ACU와 같은 모양으로 오르내리지만, 최대 ACU를 기준으로 계산되어 100% 눈금의 절반에 못 미친다. DatabaseConnections도 구간 동안 함께 늘어난다.",
	},
	write: {
		band: WRITE_BAND,
		rows: [
			{ name: "ServerlessDatabaseCapacity", note: "지금 용량(ACU)", values: acuSteps(2, 12, WRITE_BAND).map((v) => v / 14), accent: true },
			{
				name: "CPUUtilization",
				note: "최대 ACU 기준이라 낮게 나온다",
				values: series((i) => (8 + 3 * jitter(i, 1) + (inBand(i, WRITE_BAND) ? 5 : 0)) / 100),
				ref: { value: 1, label: "100%" },
			},
			{ name: "WriteIOPS", note: "저장소로 보내는 초당 로그 레코드 수", values: series((i) => (inBand(i, WRITE_BAND) ? 0.74 + 0.14 * jitter(i, 2) : 0.06 + 0.04 * jitter(i, 3))) },
			{
				name: "StorageNetworkTransmitThroughput",
				note: "저장소로 보내는 초당 바이트 수",
				values: series((i) => (inBand(i, WRITE_BAND) ? 0.7 + 0.14 * jitter(i, 4) : 0.05 + 0.04 * jitter(i, 5))),
			},
		],
		caption: "ACU가 쓰기 지표와 함께 오르면 쓰기를 먼저 의심한다",
		aria: "큰 쓰기 작업이 도는 동안 네 지표를 시간축을 맞춰 위아래로 늘어놓은 그림. 가운데 칠한 구간이 쓰기 작업이 도는 때다. 맨 위 ServerlessDatabaseCapacity는 작업이 시작되면 계단을 밟아 오르고 끝나면 내려온다. 그 아래 CPUUtilization은 작업 내내 낮게 잔잔하다. WriteIOPS와 StorageNetworkTransmitThroughput은 작업이 시작되자마자 함께 크게 오르고, 끝나면 바로 내려온다.",
	},
	idle: {
		band: IDLE_BAND,
		rows: [
			{
				name: "ServerlessDatabaseCapacity",
				note: "최소까지 내려오지 않는다",
				values: series((i) => (4 + 0.25 * jitter(i, 6)) / 8),
				accent: true,
				ref: { value: 1 / 8, label: "최소 1 ACU" },
			},
			{ name: "DatabaseConnections", note: "연결 수", values: series((i) => 0.03 * jitter(i, 7)) },
			{ name: "CommitThroughput", note: "초당 커밋 수", values: series((i) => 0.02 * jitter(i, 8)) },
		],
		caption: "요청은 바닥인데 ACU만 높으면 데이터베이스 안을 의심한다",
		aria: "애플리케이션이 조용한 시간 동안 세 지표를 시간축을 맞춰 위아래로 늘어놓은 그림. 맨 위 ServerlessDatabaseCapacity는 최소 1 ACU 선보다 한참 위인 4 ACU 근처에 머문다. 그 아래 DatabaseConnections와 CommitThroughput은 내내 바닥에 붙어 있다.",
	},
};

export default function MetricRowsDiagram({ scenario }: { scenario: keyof typeof SCENARIOS }) {
	const { band, rows, caption, aria } = SCENARIOS[scenario];
	const bandBottom = ROW_TOP + ROW_STEP * (rows.length - 1) + 20 + PLOT_H + 4;
	const bx0 = x(band.from * (N - 1));
	const bx1 = x(band.to * (N - 1));
	return (
		<svg viewBox={`0 0 480 ${bandBottom + 44}`} role="img" aria-label={aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<rect x={bx0} y="20" width={bx1 - bx0} height={bandBottom - 20} fill="var(--secondary)" fillOpacity="0.7" />
			<text x={(bx0 + bx1) / 2} y="13" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
				{band.label}
			</text>

			{rows.map((row, r) => {
				const top = ROW_TOP + ROW_STEP * r;
				const base = top + 20 + PLOT_H;
				const y = (v: number) => base - PLOT_H * v;
				return (
					<g key={row.name}>
						<text x={X0} y={top + 12} fontSize="12" fill="var(--foreground)">
							<tspan fontWeight="600">{row.name}</tspan>
							<tspan dx="8" fontSize="11.5" fill="var(--muted-foreground)">
								{row.note}
							</tspan>
						</text>
						{row.ref && (
							<>
								<line x1={X0} y1={y(row.ref.value)} x2={X1} y2={y(row.ref.value)} stroke="rgb(var(--gray))" strokeOpacity="0.5" strokeDasharray="4 4" />
								<text x={X1} y={y(row.ref.value) - 4} textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)">
									{row.ref.label}
								</text>
							</>
						)}
						<polyline
							points={row.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
							fill="none"
							stroke={row.accent ? "var(--accent)" : "var(--foreground)"}
							strokeWidth={row.accent ? 2.2 : 1.6}
							strokeLinejoin="round"
						/>
						<line x1={X0} y1={base} x2={X1} y2={base} stroke="rgb(var(--gray))" strokeOpacity="0.7" />
					</g>
				);
			})}

			<text x={X1} y={bandBottom + 14} textAnchor="end" fontSize="11.5" fill="var(--muted-foreground)">
				시간 →
			</text>
			<text x="240" y={bandBottom + 36} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{caption}
			</text>
		</svg>
	);
}

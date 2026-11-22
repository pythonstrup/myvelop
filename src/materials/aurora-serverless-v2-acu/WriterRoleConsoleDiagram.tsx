// CloudWatch 콘솔의 지표 화면을 단순하게 그려, Role=WRITER로 고른 값과 인스턴스 이름으로 고른 값이 장애 조치 뒤에 갈리는 모습을 보여주는 정적 그림.
const ARIA =
	"CloudWatch 콘솔의 지표 화면을 단순하게 그린 그림. 위쪽 그래프에는 ServerlessDatabaseCapacity 선이 두 개 있다. 파란 선은 DBClusterIdentifier가 demo-cluster이고 Role이 WRITER인 값, 회색 선은 인스턴스 이름 demo-instance-1로 고른 값이다. 가운데 점선이 장애 조치가 일어난 때다. 그 전에는 두 선이 겹쳐 12 ACU 근처에 있다. 장애 조치로 demo-instance-1이 reader가 되자 회색 선은 2 ACU 근처로 떨어지고, 파란 선은 새 writer의 값을 이어서 보여 준다. 아래쪽 표는 RDS 지표 가운데 DBClusterIdentifier, Role 묶음을 연 모습으로, demo-cluster의 WRITER 줄 ServerlessDatabaseCapacity에 체크가 되어 있다. 값과 이름은 모두 그림을 위한 가정이다.";

// 그래프: 0~16 ACU를 높이 96으로 그린다. 값은 모두 그림을 위한 가정이다.
const G = { left: 46, right: 452, top: 74, bottom: 170 };
const N = 24;
const FAILOVER = 14;
const WRITER = [11, 12, 12, 13, 12, 11, 12, 13, 13, 12, 12, 13, 12, 12, 12, 13, 12, 12, 11, 12, 13, 12, 12, 12];
const INSTANCE_1 = WRITER.map((v, k) => (k < FAILOVER ? v : k === FAILOVER ? 3 : 2 + (k % 3 === 0 ? 0.5 : 0)));
const gx = (k: number) => G.left + ((G.right - G.left) * k) / (N - 1);
const gy = (v: number) => G.bottom - (v * (G.bottom - G.top)) / 16;
const path = (vs: number[]) => vs.map((v, k) => `${k === 0 ? "M" : "L"}${gx(k).toFixed(1)},${gy(v).toFixed(1)}`).join(" ");

const ROWS = [
	{ role: "READER", metric: "ServerlessDatabaseCapacity", checked: false },
	{ role: "WRITER", metric: "ServerlessDatabaseCapacity", checked: true },
	{ role: "WRITER", metric: "ACUUtilization", checked: false },
] as const;
const TABLE_TOP = 262;
const ROW_H = 26;

export default function WriterRoleConsoleDiagram() {
	const failX = gx(FAILOVER - 0.5);
	return (
		<svg viewBox="0 0 480 410"role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			{/* 창 테두리와 제목 줄 */}
			<rect x="10" y="8" width="460" height="394" rx="10" fill="none" stroke="rgb(var(--gray))" strokeOpacity="0.7" />
			<path d="M10,36 H470" stroke="rgb(var(--gray))" strokeOpacity="0.5" />
			{[26, 40, 54].map((cx) => (
				<circle key={cx} cx={cx} cy="22" r="4" fill="rgb(var(--gray))" fillOpacity="0.5" />
			))}
			<text x="72" y="26" fontSize="11.5" fill="var(--muted-foreground)">
				CloudWatch › 지표 › 모든 지표
			</text>

			{/* 그래프 */}
			<text x="24" y="58" fontSize="12" fontWeight="600" fill="var(--foreground)">
				ServerlessDatabaseCapacity
			</text>
			{[0, 8, 16].map((v) => (
				<g key={v}>
					<line x1={G.left} y1={gy(v)} x2={G.right} y2={gy(v)} stroke="rgb(var(--gray))" strokeOpacity={v === 0 ? 0.6 : 0.25} />
					<text x={G.left - 8} y={gy(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)">
						{v}
					</text>
				</g>
			))}
			<line x1={failX} y1={G.top - 6} x2={failX} y2={G.bottom} stroke="var(--foreground)" strokeOpacity="0.55" strokeDasharray="4 3" />
			<text x={failX} y={G.top - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">
				장애 조치
			</text>
			<path d={path(INSTANCE_1)} fill="none" stroke="rgb(var(--gray))" strokeWidth="2.4" strokeLinejoin="round" />
			<path d={path(WRITER)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
			<text x={G.right} y={gy(2) - 8} textAnchor="end" fontSize="10.5" fill="var(--muted-foreground)">
				이제 reader다
			</text>

			{/* 범례 */}
			<line x1="24" y1="196" x2="38" y2="196" stroke="var(--accent)" strokeWidth="2.4" />
			<text x="44" y="200" fontSize="11" fill="var(--foreground)">
				DBClusterIdentifier=demo-cluster, Role=WRITER
			</text>
			<line x1="24" y1="216" x2="38" y2="216" stroke="rgb(var(--gray))" strokeWidth="2.4" />
			<text x="44" y="220" fontSize="11" fill="var(--foreground)">
				DBInstanceIdentifier=demo-instance-1
			</text>

			{/* 지표 고르는 표 */}
			<path d="M10,234 H470" stroke="rgb(var(--gray))" strokeOpacity="0.5" />
			<text x="24" y="254" fontSize="11.5" fill="var(--muted-foreground)">
				모든 지표 › RDS › <tspan fill="var(--foreground)" fontWeight="600">DBClusterIdentifier, Role</tspan>
			</text>
			<g fontSize="11" fontWeight="600" fill="var(--muted-foreground)">
				<text x="48" y={TABLE_TOP + 18}>DBClusterIdentifier</text>
				<text x="186" y={TABLE_TOP + 18}>Role</text>
				<text x="252" y={TABLE_TOP + 18}>지표 이름</text>
			</g>
			{ROWS.map((r, i) => {
				const y = TABLE_TOP + ROW_H * (i + 1);
				return (
					<g key={`${r.role}-${r.metric}`}>
						{r.checked && <rect x="18" y={y + 2} width="444" height={ROW_H - 4} rx="4" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeOpacity="0.8" />}
						<line x1="18" y1={y} x2="462" y2={y} stroke="rgb(var(--gray))" strokeOpacity="0.3" />
						<rect x="26" y={y + 8} width="11" height="11" rx="2" fill={r.checked ? "var(--accent)" : "none"} stroke={r.checked ? "var(--accent)" : "rgb(var(--gray))"} />
						{r.checked && <path d={`M28.5,${y + 13.5} l2.5,2.5 l4,-5`} fill="none" stroke="var(--background)" strokeWidth="1.6" />}
						<g fontSize="11" fill="var(--foreground)" fontWeight={r.checked ? 600 : 400}>
							<text x="48" y={y + 17.5}>demo-cluster</text>
							<text x="186" y={y + 17.5} fill={r.checked ? "var(--accent)" : "var(--foreground)"}>
								{r.role}
							</text>
							<text x="252" y={y + 17.5}>{r.metric}</text>
						</g>
					</g>
				);
			})}
			<text x="240" y="388" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				writer가 바뀌어도 WRITER 줄은 늘 지금의 writer를 가리킨다
			</text>
		</svg>
	);
}

// 같은 하루를 프로비저닝과 Serverless v2로 견줘, 고른 크기만큼 내는 요금과 쓴 만큼 내는 요금의 차이를 보여주는 정적 그림.
const ARIA =
	"같은 하루의 부하를 위아래 두 그래프로 견준 그림. 부하는 밤에 낮고 오후 2시쯤 가장 높다. 위는 프로비저닝으로, 가장 바쁠 때에 맞춘 크기를 하루 내내 켜 두어서 부하 위로 쓰지 않은 몫이 넓게 칠해진다. 아래는 Serverless v2로, 용량이 부하를 따라 늘고 줄어서 쓰지 않은 몫이 얇게만 남는다. 두 방식 모두 칠한 넓이 전체만큼 요금을 낸다.";

// 시간별 부하. 그림을 위해 고른 가상의 값이다.
const LOAD: [number, number][] = [
	[0, 2],
	[7, 2],
	[9, 8],
	[11, 11],
	[13, 14],
	[14, 16],
	[15, 13],
	[17, 11],
	[19, 6],
	[21, 3],
	[24, 2],
];
const PEAK = 16;
const X0 = 20;
const W = 440;
const H = 104;
const V_MAX = 18;
const hx = (hour: number) => X0 + (W * hour) / 24;
const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

function loadAt(hour: number) {
	const i = LOAD.findIndex(([h]) => h >= hour);
	if (i <= 0) return LOAD[0][1];
	const [h0, v0] = LOAD[i - 1];
	const [h1, v1] = LOAD[i];
	return v0 + ((v1 - v0) * (hour - h0)) / (h1 - h0);
}

// Serverless 용량은 한 시간마다 그 시간의 부하보다 조금 크게, 0.5 단위로 맞춘다.
const CAP = Array.from({ length: 24 }, (_, hour) => Math.ceil((Math.max(loadAt(hour), loadAt(hour + 1)) + 0.5) * 2) / 2);

function Panel({ base, title, note, capPoints }: { base: number; title: string; note: string; capPoints: (y: (v: number) => number) => string }) {
	const y = (v: number) => base - (H * v) / V_MAX;
	const load = HOURS.map((hour) => `${hx(hour)},${y(loadAt(hour))}`);
	const cap = capPoints(y);
	return (
		<g>
			<text x={X0} y={base - H - 18} fontSize="13" fill="var(--foreground)">
				<tspan fontWeight="600">{title}</tspan>
				<tspan dx="8" fontSize="12" fill="var(--muted-foreground)">
					{note}
				</tspan>
			</text>
			<polygon points={`${cap} ${[...load].reverse().join(" ")}`} fill="url(#prov-sv-hatch)" />
			<polygon points={`${X0},${base} ${load.join(" ")} ${hx(24)},${base}`} fill="var(--accent)" fillOpacity="0.3" />
			<polyline points={cap} fill="none" stroke="var(--accent)" strokeWidth="2" />
			<line x1={X0} y1={base} x2={hx(24)} y2={base} stroke="rgb(var(--gray))" strokeOpacity="0.7" />
		</g>
	);
}

export default function ProvisionedVsServerlessDiagram() {
	const base1 = 144;
	const base2 = 306;
	const y1 = (v: number) => base1 - (H * v) / V_MAX;
	const y2 = (v: number) => base2 - (H * v) / V_MAX;
	return (
		<svg viewBox="0 0 480 362" role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<pattern id="prov-sv-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<rect width="7" height="7" fill="var(--accent)" fillOpacity="0.06" />
					<line x1="0" y1="0" x2="0" y2="7" stroke="var(--accent)" strokeOpacity="0.45" strokeWidth="1.5" />
				</pattern>
			</defs>

			<Panel
				base={base1}
				title="프로비저닝"
				note="가장 바쁠 때에 맞춘 크기를 하루 내내 켜 둔다"
				capPoints={(y) => `${X0},${y(PEAK)} ${hx(24)},${y(PEAK)}`}
			/>
			<text x={hx(3.5)} y={y1(9)} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
				한가해도 이만큼 낸다
			</text>

			<Panel
				base={base2}
				title="Serverless v2"
				note="부하를 따라 용량이 늘고 준다"
				capPoints={(y) => CAP.map((v, hour) => `${hx(hour)},${y(v)} ${hx(hour + 1)},${y(v)}`).join(" ")}
			/>
			<text x={hx(3.5)} y={y2(6)} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
				쓴 만큼만 낸다
			</text>

			{[0, 6, 12, 18, 24].map((hour) => (
				<text key={hour} x={hx(hour)} y={base2 + 18} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
					{hour}시
				</text>
			))}

			<rect x="52" y="340" width="14" height="10" fill="var(--accent)" fillOpacity="0.3" />
			<text x="72" y="349" fontSize="12" fill="var(--muted-foreground)">
				실제로 쓴 몫
			</text>
			<rect x="182" y="340" width="14" height="10" fill="url(#prov-sv-hatch)" stroke="var(--accent)" strokeOpacity="0.45" />
			<text x="202" y="349" fontSize="12" fill="var(--muted-foreground)">
				쓰지 않았지만 요금을 내는 몫
			</text>
		</svg>
	);
}

// 하루 동안의 용량 그래프 아래 넓이가 ACU-시간임을 보여주는 정적 그림.
const ARIA =
	"하루 24시간 동안의 용량 그래프. 평소에는 2 ACU에 머물고, 3시부터 한 시간 동안만 배치 작업으로 20 ACU까지 오른다. 그래프 아래 넓이가 ACU-시간이다. 평소 몫은 2 ACU 곱하기 24시간으로 48 ACU-시간이고, 배치로 늘어난 몫은 18 ACU 곱하기 1시간으로 18 ACU-시간이다.";

// 24시간을 폭 420, 0~20 ACU를 높이 150으로 그린다.
const X0 = 44;
const BASE = 200;
const hx = (hour: number) => X0 + (420 * hour) / 24;
const ay = (acu: number) => BASE - (150 * acu) / 20;

export default function AcuHoursDiagram() {
	return (
		<svg viewBox="0 0 480 270" role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<pattern id="acu-hours-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<rect width="7" height="7" fill="var(--accent)" fillOpacity="0.12" />
					<line x1="0" y1="0" x2="0" y2="7" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="2" />
				</pattern>
			</defs>

			<line x1={X0} y1={ay(20)} x2={hx(24)} y2={ay(20)} stroke="rgb(var(--gray))" strokeOpacity="0.4" strokeDasharray="4 4" />
			<text x={X0 - 8} y={ay(20) + 4} textAnchor="end" fontSize="11.5" fill="var(--muted-foreground)">
				20
			</text>
			<text x={X0 - 8} y={ay(2) + 4} textAnchor="end" fontSize="11.5" fill="var(--muted-foreground)">
				2
			</text>
			<text x={X0 - 8} y={ay(20) - 12} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
				ACU
			</text>

			<rect x={X0} y={ay(2)} width={hx(24) - X0} height={BASE - ay(2)} fill="var(--accent)" fillOpacity="0.3" />
			<rect x={hx(3)} y={ay(20)} width={hx(4) - hx(3)} height={ay(2) - ay(20)} fill="url(#acu-hours-hatch)" />
			<polyline
				points={`${X0},${ay(2)} ${hx(3)},${ay(2)} ${hx(3)},${ay(20)} ${hx(4)},${ay(20)} ${hx(4)},${ay(2)} ${hx(24)},${ay(2)}`}
				fill="none"
				stroke="var(--accent)"
				strokeWidth="2"
			/>
			<line x1={X0} y1={BASE} x2={hx(24)} y2={BASE} stroke="rgb(var(--gray))" strokeOpacity="0.7" />
			{[0, 6, 12, 18, 24].map((hour) => (
				<text key={hour} x={hx(hour)} y={BASE + 18} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
					{hour}시
				</text>
			))}

			<text x={hx(4) + 12} y={ay(17)} fontSize="13" fontWeight="600" fill="var(--foreground)">
				배치로 늘어난 몫
			</text>
			<text x={hx(4) + 12} y={ay(17) + 20} fontSize="12.5" fill="var(--muted-foreground)">
				18 ACU × 1시간 = 18 ACU-시간
			</text>
			<text x={hx(14)} y={ay(2) - 12} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
				평소 몫
			</text>
			<text x={hx(14)} y={ay(2) + 11} textAnchor="middle" fontSize="11.5" fill="var(--foreground)">
				2 ACU × 24시간 = 48 ACU-시간
			</text>
			<text x="240" y="254" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				그래프 아래 넓이가 곧 ACU-시간이다
			</text>
		</svg>
	);
}

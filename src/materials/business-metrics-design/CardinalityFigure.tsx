import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// 라벨 값의 조합마다 시계열이 하나씩 생겨 시계열 수가 곱으로 늘어나는 모습을 그린 정적 그림.
// orders_completed_total 에 결제 수단 4가지, 지역 5가지, 사용자 ID 10만 명을 라벨로 더한다는 값은 가정이다.
// 아래 띠는 본문의 Prometheus 권고(대개 10 아래, 100을 넘으면 다른 방법)를 로그 눈금 위에 그린 것이다.
const W = 720;
const H = 316;
const CELL = 24;
const GAP = 4;
const GRID_Y = 56;
const ROWS = 4; // 결제 수단
const REGIONS = 5; // 지역
const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
const PX = { a: 40, b: 200, c: 430 };
const C_W = W - 24 - PX.c;
const COUNT_Y = 190;

// 로그 눈금 띠
const LX0 = 60;
const LX1 = 680;
const LOG_MAX = 7;
const lx = (n: number) => LX0 + (Math.log10(n) / LOG_MAX) * (LX1 - LX0);
const BAND_Y = 236;
const AXIS_Y = 258;
const TICKS: [number, string][] = [
	[1, "1"],
	[10, "10"],
	[100, "100"],
	[1e3, "1천"],
	[1e4, "1만"],
	[1e5, "10만"],
	[1e6, "100만"],
	[1e7, "1000만"],
];
const DOTS: [number, string, "blue" | "red"][] = [
	[4, "4", "blue"],
	[20, "20", "blue"],
	[2e6, "200만", "red"],
];
const ARIA =
	"라벨 값의 조합마다 시계열이 하나씩 생기는 모습. 주문 완료 카운터에 결제 수단 라벨 4가지를 붙이면 시계열이 4개, 지역 라벨 5가지를 더하면 4 곱하기 5로 20개, 사용자 ID 10만 명을 더하면 200만 개가 된다. 아래 로그 눈금에는 Prometheus 문서의 권고대로 대개 10 아래, 100을 넘으면 다른 방법을 찾는 구간을 표시했다.";

function Grid({ x, cols }: { x: number; cols: number }) {
	return (
		<g>
			{Array.from({ length: ROWS * cols }, (_, i) => (
				<rect
					key={i}
					x={x + (i % cols) * (CELL + GAP)}
					y={GRID_Y + Math.floor(i / cols) * (CELL + GAP)}
					width={CELL}
					height={CELL}
					rx={4}
					className="fg-blue-fill fg-blue"
					strokeWidth={1.5}
				/>
			))}
		</g>
	);
}

function Arrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
	return (
		<g>
			<line x1={x1} y1={y} x2={x2 - 6} y2={y} className="fg-arrow" strokeWidth={1.5} />
			<path d={`M ${x2 - 7} ${y - 4.5} L ${x2} ${y} L ${x2 - 7} ${y + 4.5} Z`} className="fg-head" />
		</g>
	);
}

export default function CardinalityFigure() {
	const gridMid = GRID_Y + GRID_H / 2;
	const bEnd = PX.b + REGIONS * CELL + (REGIONS - 1) * GAP;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<defs>
				<pattern id="cardinality-cells" width={6} height={6} patternUnits="userSpaceOnUse">
					<rect x={0.5} y={0.5} width={5} height={5} className="fg-red-fill fg-red" strokeWidth={0.6} />
				</pattern>
			</defs>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 위: 라벨을 하나씩 더할 때 늘어나는 시계열 */}
			<text x={PX.a} y={36} className="fg-text" fontSize={14} fontWeight={700}>
				결제 수단 4가지
			</text>
			<text x={PX.b} y={36} className="fg-text" fontSize={14} fontWeight={700}>
				× 지역 5가지
			</text>
			<text x={PX.c} y={36} className="fg-text" fontSize={14} fontWeight={700}>
				× 사용자 ID 10만 명
			</text>
			<Grid x={PX.a} cols={1} />
			<Grid x={PX.b} cols={REGIONS} />
			<rect x={PX.c} y={GRID_Y} width={C_W} height={GRID_H} fill="url(#cardinality-cells)" />
			<Pill cx={PX.c + C_W / 2} cy={gridMid} label="다 그릴 수 없다" tone="red" />
			<Arrow x1={PX.a + CELL + 24} x2={PX.b - 24} y={gridMid} />
			<Arrow x1={bEnd + 24} x2={PX.c - 24} y={gridMid} />
			<text x={PX.a} y={COUNT_Y} className="fg-blue-ink" fontSize={14} fontWeight={700}>
				시계열 4개
			</text>
			<text x={PX.b} y={COUNT_Y} className="fg-blue-ink" fontSize={14} fontWeight={700}>
				시계열 20개
			</text>
			<text x={PX.c} y={COUNT_Y} className="fg-red-ink" fontSize={14} fontWeight={700}>
				시계열 200만 개
			</text>

			{/* 아래: 같은 수를 로그 눈금에 놓고 Prometheus 권고 구간을 겹친다 */}
			<rect x={lx(1)} y={BAND_Y} width={lx(10) - lx(1)} height={AXIS_Y - BAND_Y} className="fg-green-fill" />
			<rect x={lx(100)} y={BAND_Y} width={LX1 - lx(100)} height={AXIS_Y - BAND_Y} className="fg-red-fill" />
			<text x={lx(1) + 6} y={BAND_Y + 15} className="fg-green-ink" fontSize={12}>
				대개 10 아래
			</text>
			<text x={lx(100) + 8} y={BAND_Y + 15} className="fg-red-ink" fontSize={12}>
				100을 넘으면 다른 방법을 찾는다
			</text>
			<line x1={LX0} y1={AXIS_Y} x2={LX1} y2={AXIS_Y} className="fg-axis" strokeWidth={1.5} />
			{TICKS.map(([n, label]) => (
				<g key={n}>
					<line x1={lx(n)} y1={AXIS_Y} x2={lx(n)} y2={AXIS_Y + 5} className="fg-axis" strokeWidth={1.5} />
					<text x={lx(n)} y={AXIS_Y + 20} textAnchor="middle" className="fg-sub" fontSize={12}>
						{label}
					</text>
				</g>
			))}
			{DOTS.map(([n, label, tone]) => (
				<g key={n}>
					<circle cx={lx(n)} cy={AXIS_Y} r={5} className={`fg-${tone}-ink`} />
					<text x={lx(n)} y={BAND_Y - 8} textAnchor="middle" className={`fg-${tone}-ink`} fontSize={13} fontWeight={700}>
						{label}
					</text>
				</g>
			))}
			<text x={(LX0 + LX1) / 2} y={H - 12} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				orders_completed_total 의 시계열 수, 로그 눈금
			</text>
		</svg>
	);
}

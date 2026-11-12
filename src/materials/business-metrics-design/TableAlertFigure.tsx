import { FIG_STYLE, Pill } from "@/materials/monitoring-design/figure";

// Uber 방식의 데이터 품질 경보 흐름을 보이는 정적 그림.
// 테이블의 열마다 평균, 최솟값, 최댓값, 빠진 값 개수를 시계열로 만들어 Holt-Winters 예측 범위와 견주고,
// 벗어난 정도를 테이블 점수 하나로 묶어 경보 하나를 낸다.
// 열 이름, 선 모양, 16칸 가운데 2칸이 벗어났다는 것은 모양을 보이려고 정한 가정값이다.
const W = 720;
const H = 292;
const COLS = ["주문 금액", "국가 코드", "결제 수단", "주문 시각"] as const;
const STATS = ["평균", "최솟값", "최댓값", "빠진 값 개수"] as const;
// 예측 범위를 벗어난 칸과 벗어난 방향(1 위, -1 아래)
const OFF: Record<string, 1 | -1> = { "주문 금액|평균": -1, "결제 수단|빠진 값 개수": 1 };
const GX = 150; // 칸 묶음의 왼쪽
const CW = 84;
const CH = 30;
const GAP = 6;
const RY = 78; // 첫 줄의 위
const RH = CH + 10;
const GRID_R = GX + STATS.length * CW + (STATS.length - 1) * GAP;
const BOX = { x: 552, y: 98, w: 144, h: 110 };
const POINTS = 10;
const ARIA =
	"테이블의 열 네 개마다 평균, 최솟값, 최댓값, 빠진 값 개수를 시계열로 만들어 예측 범위와 견주는 그림. 열여섯 칸 가운데 주문 금액의 평균과 결제 수단의 빠진 값 개수가 범위를 벗어났고, 벗어난 정도를 테이블 점수 하나로 묶어 기준을 넘었으므로 경보 한 건을 낸다. 골라 둔 지표는 지표 단위 경보도 함께 건다.";

// 칸 하나 안의 작은 시계열. 예측 범위 띠와 실제 값 선을 그린다.
function Spark({ x, y, seed, dir }: { x: number; y: number; seed: number; dir?: 1 | -1 }) {
	const px = (i: number) => x + 6 + (i / (POINTS - 1)) * (CW - 12);
	const py = (v: number) => y + 4 + (1 - v) * (CH - 8);
	const idx = Array.from({ length: POINTS }, (_, i) => i);
	const mid = (i: number) => 0.5 + 0.14 * Math.sin(i * 0.8 + seed);
	const val = (i: number) => (dir && i === POINTS - 1 ? (dir > 0 ? 0.98 : 0.02) : mid(i) + 0.06 * Math.sin(i * 2.1 + seed));
	const band = [...idx.map((i) => `${px(i).toFixed(1)},${py(mid(i) + 0.2).toFixed(1)}`), ...[...idx].reverse().map((i) => `${px(i).toFixed(1)},${py(mid(i) - 0.2).toFixed(1)}`)].join(" ");
	const pts = (is: number[]) => is.map((i) => `${px(i).toFixed(1)},${py(val(i)).toFixed(1)}`).join(" ");
	return (
		<g>
			<rect x={x} y={y} width={CW} height={CH} rx={5} className="fg-box" />
			<polygon points={band} className="fg-blue-fill" />
			<polyline points={pts(dir ? idx.slice(0, -1) : idx)} fill="none" className="fg-blue" strokeWidth={1.5} strokeLinejoin="round" />
			{dir && (
				<>
					<polyline points={pts([POINTS - 2, POINTS - 1])} fill="none" className="fg-red" strokeWidth={2} />
					<circle cx={px(POINTS - 1)} cy={py(val(POINTS - 1))} r={2.5} className="fg-red-ink" />
					<rect x={x} y={y} width={CW} height={CH} rx={5} fill="none" className="fg-red" strokeWidth={1.5} />
				</>
			)}
		</g>
	);
}

export default function TableAlertFigure() {
	const cy = BOX.y + BOX.h / 2;
	const gauge = { x: BOX.x + 16, w: BOX.w - 32, y: 138 };
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 단계 이름 */}
			<text x={(GX + GRID_R) / 2} y={32} textAnchor="middle" className="fg-text" fontSize={13.5} fontWeight={700}>
				열마다 통계를 시계열로 만들어 예측 범위와 견준다
			</text>
			<text x={BOX.x + BOX.w / 2} y={32} textAnchor="middle" className="fg-text" fontSize={13.5} fontWeight={700}>
				테이블 점수로 묶는다
			</text>

			{/* 머리글 */}
			<text x={24} y={RY - 10} className="fg-sub" fontSize={12.5}>
				테이블의 열
			</text>
			{STATS.map((s, j) => (
				<text key={s} x={GX + j * (CW + GAP) + CW / 2} y={RY - 10} textAnchor="middle" className="fg-sub" fontSize={12.5}>
					{s}
				</text>
			))}

			{/* 열 × 통계 칸 */}
			{COLS.map((c, i) => (
				<g key={c}>
					<text x={24} y={RY + i * RH + 20} className="fg-text" fontSize={13.5}>
						{c}
					</text>
					{STATS.map((s, j) => (
						<Spark key={s} x={GX + j * (CW + GAP)} y={RY + i * RH} seed={i * 1.7 + j} dir={OFF[`${c}|${s}`]} />
					))}
					<line x1={GRID_R + 4} y1={RY + i * RH + CH / 2} x2={BOX.x - 7} y2={cy} className="fg-arrow" strokeWidth={1.5} />
				</g>
			))}
			<path d={`M ${BOX.x - 8} ${cy - 5} L ${BOX.x - 1} ${cy} L ${BOX.x - 8} ${cy + 5} Z`} className="fg-head" />

			{/* 테이블 점수 */}
			<rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={10} className="fg-box" />
			<text x={BOX.x + BOX.w / 2} y={BOX.y + 24} textAnchor="middle" className="fg-text" fontSize={14} fontWeight={700}>
				테이블 점수
			</text>
			<rect x={gauge.x} y={gauge.y} width={gauge.w} height={10} rx={5} className="fg-gray-fill" />
			<rect x={gauge.x} y={gauge.y} width={gauge.w * 0.75} height={10} rx={5} className="fg-red-fill fg-red" strokeWidth={1.5} />
			<line x1={gauge.x + gauge.w * 0.5} y1={gauge.y - 6} x2={gauge.x + gauge.w * 0.5} y2={gauge.y + 16} className="fg-sub-line" strokeWidth={1.5} strokeDasharray="3 2" />
			<text x={gauge.x + gauge.w * 0.5} y={gauge.y + 30} textAnchor="middle" className="fg-sub" fontSize={12}>
				기준
			</text>
			<Pill cx={BOX.x + BOX.w / 2} cy={BOX.y + BOX.h - 20} label="경보 1건" tone="red" maxX={W} />

			{/* 아래: 지표 단위 경보와 범례 */}
			<rect x={24} y={246} width={282} height={26} rx={6} fill="none" className="fg-gray" strokeDasharray="4 3" />
			<text x={36} y={263} className="fg-sub" fontSize={12.5}>
				골라 둔 지표는 지표 단위 경보도 함께 건다
			</text>
			<rect x={404} y={252} width={18} height={12} rx={2} className="fg-blue-fill" />
			<text x={428} y={263} className="fg-sub" fontSize={12.5}>
				Holt-Winters 예측 범위
			</text>
			<line x1={596} y1={258} x2={614} y2={258} className="fg-red" strokeWidth={2} />
			<text x={620} y={263} className="fg-sub" fontSize={12.5}>
				벗어남
			</text>
		</svg>
	);
}

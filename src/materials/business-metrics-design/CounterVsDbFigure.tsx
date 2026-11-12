import { FIG_STYLE, type Tone } from "@/materials/monitoring-design/figure";

// 사업 지표의 숫자가 나오는 두 경로를 그린 정적 그림.
// 위는 앱이 올린 카운터를 Prometheus가 읽어 가는 길이고, 아래는 장부인 주문 테이블을
// SELECT 권한만 준 전용 사용자로 Grafana가 바로 읽는 길이다. 본문에 나온 말만 쓴다.
const W = 720;
const H = 256;
const BOX_H = 52;
const APP = { x: 24, w: 80 };
const COLS = [
	{ x: 136, w: 180 },
	{ x: 348, w: 160 },
	{ x: 540, w: 156 },
];
const LANES: { title: string; tone: Tone; y: number; note: string; boxes: [string, string][] }[] = [
	{
		title: "카운터로 세는 길",
		tone: "blue",
		y: 42,
		note: "카운터 숫자는 조금 어긋날 수 있어서 추세와 이상을 보는 데 쓴다",
		boxes: [
			["카운터", "orders_completed_total"],
			["Prometheus", "값을 읽어 간다"],
			["대시보드", "추세와 이상을 본다"],
		],
	},
	{
		title: "DB를 바로 읽는 길",
		tone: "green",
		y: 162,
		note: "대시보드를 고치는 사람이 위험한 SQL을 실행하지 못하게 권한을 좁힌다",
		boxes: [
			["주문 테이블", "장부 역할을 하는 DB"],
			["전용 DB 사용자", "SELECT 권한만"],
			["Grafana", "매출처럼 맞아야 할 숫자"],
		],
	},
];
const ARIA =
	"사업 지표의 숫자가 나오는 두 경로. 위는 앱이 주문이 끝날 때마다 카운터 orders_completed_total을 1씩 올리고 Prometheus가 그 값을 읽어 가 대시보드에서 추세와 이상을 보는 길이다. 카운터 숫자는 조금 어긋날 수 있다. 아래는 장부 역할을 하는 주문 테이블을 SELECT 권한만 준 전용 DB 사용자로 Grafana가 바로 읽어 매출처럼 맞아야 할 숫자를 보는 길이다.";

function Arrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
	return (
		<g>
			<line x1={x1} y1={y} x2={x2 - 6} y2={y} className="fg-arrow" strokeWidth={1.5} />
			<path d={`M ${x2 - 7} ${y - 4.5} L ${x2} ${y} L ${x2 - 7} ${y + 4.5} Z`} className="fg-head" />
		</g>
	);
}

export default function CounterVsDbFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 앱 하나에서 두 길이 갈라진다 */}
			<rect x={APP.x} y={LANES[0].y} width={APP.w} height={LANES[1].y + BOX_H - LANES[0].y} rx={8} className="fg-box" />
			<text x={APP.x + APP.w / 2} y={(LANES[0].y + LANES[1].y + BOX_H) / 2 + 5} textAnchor="middle" className="fg-text" fontSize={15} fontWeight={700}>
				앱
			</text>

			{LANES.map((l, li) => {
				const cy = l.y + BOX_H / 2;
				return (
					<g key={l.title}>
						<text x={COLS[0].x} y={l.y - 12} className={`fg-${l.tone}-ink`} fontSize={13.5} fontWeight={700}>
							{l.title}
						</text>
						<Arrow x1={APP.x + APP.w} x2={COLS[0].x} y={cy} />
						{li === 0 && (
							<text x={(APP.x + APP.w + COLS[0].x) / 2} y={cy - 8} textAnchor="middle" className="fg-sub" fontSize={12}>
								+1
							</text>
						)}
						{l.boxes.map(([name, sub], i) => {
							const c = COLS[i];
							return (
								<g key={name}>
									{i > 0 && <Arrow x1={COLS[i - 1].x + COLS[i - 1].w} x2={c.x} y={cy} />}
									<rect x={c.x} y={l.y} width={c.w} height={BOX_H} rx={8} className={i === 0 ? `fg-${l.tone}-fill fg-${l.tone}` : "fg-box"} strokeWidth={1.5} />
									<text x={c.x + c.w / 2} y={l.y + 22} textAnchor="middle" className="fg-text" fontSize={14} fontWeight={700}>
										{name}
									</text>
									<text
										x={c.x + c.w / 2}
										y={l.y + 40}
										textAnchor="middle"
										className="fg-sub"
										fontSize={i === 0 && li === 0 ? 12 : 12.5}
										fontFamily={sub.includes("_") ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined}
									>
										{sub}
									</text>
								</g>
							);
						})}
						<text x={COLS[0].x} y={l.y + BOX_H + 22} className="fg-sub" fontSize={12.5}>
							{l.note}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

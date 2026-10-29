import { SVG_STYLE } from "./colors";

// noul 답은 0.5가 모르겠다는 뜻이고, 0이나 1 쪽으로 멀어질수록 확실하다.
// 같은 이력서의 Kafka·Kotlin 실측값을 찍는다. 정적 SVG로 SSR에서만 렌더링한다.
const X0 = 30;
const X1 = 370;
const Y_AXIS = 112;
const V_H = 56; // 양 끝에서 확실함을 나타내는 V자의 높이
const POINTS = [
	{ name: "Kafka", p: 0.53 },
	{ name: "Kotlin", p: 0.97 },
];

const x = (p: number) => X0 + (X1 - X0) * p;

const LABELS = {
	ko: {
		center: "0.5 · 모름",
		no: "0 · 아니오 쪽으로 확실",
		yes: "예 쪽으로 확실 · 1",
		distance: (d: string) => `0.5에서 ${d}`,
		note: "0.5에서 멀수록 확실한 답이다",
		aria: "noul 답이 얼마나 확실한지 보여주는 그림. 0.5는 모르겠다는 뜻이고 0이나 1 쪽으로 갈수록 확실하다. Kafka 실무 경험은 0.53으로 0.5에서 0.03 떨어져 있고, Kotlin 실무 경험은 0.97로 0.47 떨어져 있다.",
	},
	en: {
		center: "0.5 · don't know",
		no: "0 · surely no",
		yes: "surely yes · 1",
		distance: (d: string) => `${d} from 0.5`,
		note: "The farther from 0.5, the surer the answer",
		aria: "Diagram of how sure a noul answer is. 0.5 means Jev does not know, and the answer gets surer toward 0 or 1. Kafka in real work is 0.53, only 0.03 from 0.5. Kotlin in real work is 0.97, 0.47 from 0.5.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function NoulDistanceDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const muted = "var(--muted-foreground)";
	const fg = "var(--foreground)";
	const armTop = Y_AXIS - V_H;
	return (
		<svg viewBox="0 0 400 184" role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>

			{/* 가운데서 0, 양 끝에서 가장 높은 V자: 0.5에서 멀수록 확실하다 */}
			<polygon
				points={`${x(0)},${Y_AXIS} ${x(0)},${armTop} ${x(0.5)},${Y_AXIS} ${x(1)},${armTop} ${x(1)},${Y_AXIS}`}
				className="jv-blue-soft"
			/>
			<text x={x(0)} y={armTop - 8} fontSize="11" fill={muted}>
				{L.no}
			</text>
			<text x={x(1)} y={armTop - 8} fontSize="11" textAnchor="end" fill={muted}>
				{L.yes}
			</text>

			<line x1={x(0.5)} x2={x(0.5)} y1={30} y2={Y_AXIS} stroke={muted} strokeWidth="1" strokeDasharray="3 3" />
			<text x={x(0.5)} y={22} fontSize="11.5" fontWeight="600" textAnchor="middle" fill={fg}>
				{L.center}
			</text>

			<line x1={x(0)} x2={x(1)} y1={Y_AXIS} y2={Y_AXIS} stroke="var(--border)" strokeWidth="1.5" />

			{POINTS.map(({ name, p }) => {
				const nearEnd = p > 0.9;
				const anchor = nearEnd ? "end" : "middle";
				const lx = nearEnd ? x(1) : x(p);
				return (
					<g key={name}>
						<circle cx={x(p)} cy={Y_AXIS} r="6" className="jv-blue" stroke="var(--background)" strokeWidth="2" />
						<text x={lx} y={Y_AXIS + 22} fontSize="12" fontWeight="700" textAnchor={anchor} fill={fg}>
							{`${name} ${p.toFixed(2)}`}
						</text>
						<text x={lx} y={Y_AXIS + 37} fontSize="11" textAnchor={anchor} fill={muted}>
							{L.distance(Math.abs(p - 0.5).toFixed(2))}
						</text>
					</g>
				);
			})}

			<text x={200} y={176} fontSize="11.5" textAnchor="middle" fill={muted}>
				{L.note}
			</text>
		</svg>
	);
}

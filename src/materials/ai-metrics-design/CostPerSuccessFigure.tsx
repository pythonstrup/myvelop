import { FIG_STYLE, Pill, type Tone } from "@/materials/monitoring-design/figure";

// 실행 한 번이 싼 모델과 비싼 모델의 성공한 결과당 비용을 비교하는 그림.
// 단가와 성공 횟수는 모양을 보이려고 가정한 값이다.
// 모델 A: 한 번에 10원, 100번 중 50번 성공 → 1,000원 ÷ 50 = 20원
// 모델 B: 한 번에 15원, 100번 중 95번 성공 → 1,500원 ÷ 95 ≈ 15.8원
const W = 720;
const H = 222;
const BAR_X = 168;
const BAR_W = 320;
const BAR_H = 30;
const RESULT_X = 600;
const RUNS = 100;
const MODELS: { name: string; price: number; ok: number; per: string; tone: Tone; y: number }[] = [
	{ name: "모델 A", price: 10, ok: 50, per: "20원", tone: "red", y: 48 },
	{ name: "모델 B", price: 15, ok: 95, per: "약 15.8원", tone: "green", y: 148 },
];
const won = (n: number) => `${n.toLocaleString("en-US")}원`;
const ARIA =
	"성공한 결과당 비용 비교. 모델 A는 실행 한 번에 10원이 들고 100번 가운데 50번 성공해, 1,000원을 50으로 나눈 성공 한 번에 20원이다. 모델 B는 한 번에 15원이 들고 100번 가운데 95번 성공해, 1,500원을 95로 나눈 성공 한 번에 약 15.8원이다. 실행 한 번은 A가 싸지만 성공한 결과당 비용은 B가 싸다.";

export default function CostPerSuccessFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<text x={BAR_X} y={28} className="fg-sub" fontSize={12.5}>
				실행 100번
			</text>
			<text x={RESULT_X} y={28} textAnchor="middle" className="fg-sub" fontSize={12.5}>
				성공한 결과당 비용
			</text>
			<line x1={24} y1={128} x2={W - 24} y2={128} className="fg-frame" />

			{MODELS.map((m) => {
				const okW = (BAR_W * m.ok) / RUNS;
				const fail = RUNS - m.ok;
				// ponytail: 실패 칸이 좁으면 이름표를 막대 오른쪽 아래로 뺀다
				const failInside = BAR_W - okW >= 64;
				return (
					<g key={m.name}>
						<text x={24} y={m.y + 20} className="fg-text" fontSize={15} fontWeight={700}>
							{m.name}
						</text>
						<text x={24} y={m.y + 42} className="fg-sub" fontSize={12.5}>
							한 번에 {won(m.price)}
						</text>

						<rect x={BAR_X} y={m.y} width={okW} height={BAR_H} className="fg-green-fill fg-green" strokeWidth={1.5} />
						<rect x={BAR_X + okW} y={m.y} width={BAR_W - okW} height={BAR_H} className="fg-red-fill fg-red" strokeWidth={1.5} />
						<text x={BAR_X + okW / 2} y={m.y + 20} textAnchor="middle" className="fg-green-ink" fontSize={13} fontWeight={700}>
							성공 {m.ok}
						</text>
						{failInside ? (
							<text x={BAR_X + (okW + BAR_W) / 2} y={m.y + 20} textAnchor="middle" className="fg-red-ink" fontSize={13} fontWeight={700}>
								실패 {fail}
							</text>
						) : (
							<text x={BAR_X + BAR_W} y={m.y + 50} textAnchor="end" className="fg-red-ink" fontSize={13} fontWeight={700}>
								실패 {fail}
							</text>
						)}
						<text x={BAR_X} y={m.y + 50} className="fg-sub" fontSize={12.5}>
							{won(m.price)} × {RUNS}번 = {won(m.price * RUNS)}
						</text>

						<Pill cx={RESULT_X} cy={m.y + 15} label={`성공 한 번에 ${m.per}`} tone={m.tone} maxX={W} />
						<text x={RESULT_X} y={m.y + 50} textAnchor="middle" className="fg-sub" fontSize={12.5}>
							{won(m.price * RUNS)} ÷ 성공 {m.ok}번
						</text>
					</g>
				);
			})}
		</svg>
	);
}

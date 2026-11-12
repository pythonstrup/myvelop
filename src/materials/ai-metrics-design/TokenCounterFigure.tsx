import { FIG_STYLE, Pill, type Tone } from "@/materials/monitoring-design/figure";

// OpenTelemetry 토큰 카운터의 포함 관계를 그린 정적 그림.
// 상자 크기는 포함 관계만 보이려고 정한 값이고 토큰 양의 비율이 아니다.
// 회색 칸은 규약이 따로 세지 않는 나머지이고, Anthropic API 의 input_tokens 가 이 칸만 센다.
const W = 720;
const H = 286;
const BOX_TOP = 20;
const BOX_H = 150;
const INNER_TOP = 68;
const INNER_H = 80;
// 이름표가 괄호보다 넓어 괄호를 덮으므로 Anthropic 이름표는 괄호 아래에 따로 단다
const ANTHROPIC_Y = 186;
const ANTHROPIC_PILL_Y = 214;
const BRACKET_Y = 260;
const UNCACHED = { label: "캐시를 안 거친 입력", x: 340, w: 150, tone: "gray" } as const;
const GROUPS: { label: string; x: number; w: number; tone: Tone; parts: { label: string; x: number; w: number; tone?: Tone }[] }[] = [
	{
		label: "입력 토큰",
		x: 20,
		w: 484,
		tone: "blue",
		parts: [{ label: "캐시에서 읽은 입력", x: 36, w: 148 }, { label: "캐시에 쓴 입력", x: 196, w: 132 }, UNCACHED],
	},
	{ label: "출력 토큰", x: 524, w: 176, tone: "amber", parts: [{ label: "추론 출력", x: 544, w: 116 }] },
];
const ARIA =
	"토큰 카운터의 포함 관계. 입력 토큰 안에 캐시에서 읽은 입력, 캐시에 쓴 입력, 캐시를 안 거친 입력이 들어 있고, 출력 토큰 안에 추론 출력이 들어 있다. Anthropic API의 input_tokens는 이 가운데 캐시를 안 거친 입력만 센다. 전체 토큰은 입력 토큰과 출력 토큰을 더한 값이다.";

export default function TokenCounterFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			{GROUPS.map((g) => (
				<g key={g.label}>
					<rect x={g.x} y={BOX_TOP} width={g.w} height={BOX_H} rx={8} className={`fg-${g.tone}-fill fg-${g.tone}`} strokeWidth={1.5} />
					<text x={g.x + 20} y={BOX_TOP + 30} className={`fg-${g.tone}-ink`} fontSize={15} fontWeight={700}>
						{g.label}
					</text>
					{g.parts.map((p) => (
						<g key={p.label}>
							<rect x={p.x} y={INNER_TOP} width={p.w} height={INNER_H} rx={6} className={`fg-bg fg-${p.tone ?? g.tone}`} strokeWidth={1.5} strokeDasharray="4 3" />
							<text x={p.x + p.w / 2} y={INNER_TOP + INNER_H / 2 + 5} textAnchor="middle" className="fg-text" fontSize={14}>
								{p.label}
							</text>
						</g>
					))}
				</g>
			))}
			{/* Anthropic 의 input_tokens 는 회색 칸만 센다 */}
			<g className="fg-gray" strokeWidth={1.5}>
				<line x1={UNCACHED.x} y1={ANTHROPIC_Y} x2={UNCACHED.x + UNCACHED.w} y2={ANTHROPIC_Y} />
				<line x1={UNCACHED.x} y1={ANTHROPIC_Y - 6} x2={UNCACHED.x} y2={ANTHROPIC_Y + 6} />
				<line x1={UNCACHED.x + UNCACHED.w} y1={ANTHROPIC_Y - 6} x2={UNCACHED.x + UNCACHED.w} y2={ANTHROPIC_Y + 6} />
				<line x1={UNCACHED.x + UNCACHED.w / 2} y1={ANTHROPIC_Y} x2={UNCACHED.x + UNCACHED.w / 2} y2={ANTHROPIC_PILL_Y} />
			</g>
			<Pill cx={UNCACHED.x + UNCACHED.w / 2} cy={ANTHROPIC_PILL_Y} label="Anthropic의 input_tokens" tone="gray" maxX={W} />
			{/* 전체 토큰은 바깥 상자 둘만 더한다 */}
			<g className="fg-gray" strokeWidth={1.5}>
				<line x1={20} y1={BRACKET_Y} x2={700} y2={BRACKET_Y} />
				<line x1={20} y1={BRACKET_Y - 6} x2={20} y2={BRACKET_Y + 6} />
				<line x1={700} y1={BRACKET_Y - 6} x2={700} y2={BRACKET_Y + 6} />
			</g>
			<Pill cx={W / 2} cy={BRACKET_Y} label="전체 토큰 = 입력 토큰 + 출력 토큰" tone="gray" maxX={W} />
		</svg>
	);
}

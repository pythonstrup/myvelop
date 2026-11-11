import { FIG_STYLE, Pill, type Tone, VLine } from "@/materials/monitoring-design/figure";

// 스트리밍 응답 하나의 시간을 첫 토큰까지 시간, 토큰당 시간, 전체 시간으로 나눠 보이는 정적 그림.
// 토큰 개수와 간격은 모양을 보이려고 정한 값이다.
const W = 720;
const H = 224;
const X0 = 40; // 요청을 보낸 때
const X1 = 268; // 첫 토큰이 온 때
const XN = 680; // 마지막 토큰이 온 때
const TOKENS = 10;
const GAP = (XN - X1) / (TOKENS - 1);
const BLOCK = 30;
const ends = Array.from({ length: TOKENS }, (_, i) => X1 + i * GAP);
const ARIA =
	"스트리밍 응답의 시간. 요청을 보낸 뒤 대기와 프롬프트 처리를 거쳐 첫 토큰이 오기까지가 첫 토큰까지 시간이고, 그 뒤 토큰이 하나씩 오는 간격이 토큰당 시간이며, 요청부터 마지막 토큰까지가 전체 응답 시간이다.";

function Bracket({ x1, x2, y, tone }: { x1: number; x2: number; y: number; tone: Tone }) {
	return (
		<g className={`fg-${tone}`} strokeWidth={1.5}>
			<line x1={x1} y1={y} x2={x2} y2={y} />
			<line x1={x1} y1={y - 6} x2={x1} y2={y + 6} />
			<line x1={x2} y1={y - 6} x2={x2} y2={y + 6} />
		</g>
	);
}

export default function StreamTimelineFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />

			{/* 선을 먼저 모두 그리고 이름표를 나중에 그린다 */}
			<Bracket x1={X0} x2={XN} y={32} tone="gray" />
			{[X0, X1, XN].map((x) => (
				<VLine key={x} x={x} y1={44} y2={182} tone="gray" />
			))}
			<Bracket x1={X0} x2={X1} y={146} tone="blue" />
			<Bracket x1={ends[3]} x2={ends[4]} y={146} tone="amber" />

			{/* 대기와 프롬프트 처리, 그 뒤로 하나씩 오는 토큰 */}
			<rect x={X0 + 4} y={72} width={X1 - BLOCK - X0 - 12} height={30} rx={6} className="fg-box" />
			<text x={(X0 + X1 - BLOCK) / 2} y={92} textAnchor="middle" className="fg-sub" fontSize={13}>
				대기 · 프롬프트 처리
			</text>
			{ends.map((x) => (
				<rect key={x} x={x - BLOCK} y={72} width={BLOCK} height={30} rx={4} className="fg-blue-fill fg-blue" strokeWidth={1.5} />
			))}
			<text x={(X1 + XN) / 2} y={122} textAnchor="middle" className="fg-sub" fontSize={13}>
				토큰이 하나씩 온다
			</text>

			<text x={X0} y={204} className="fg-text" fontSize={13}>
				요청 보냄
			</text>
			<text x={X1} y={204} textAnchor="middle" className="fg-text" fontSize={13}>
				첫 토큰
			</text>
			<text x={XN} y={204} textAnchor="end" className="fg-text" fontSize={13}>
				마지막 토큰
			</text>

			<Pill cx={(X0 + XN) / 2} cy={32} label="전체 응답 시간" tone="gray" maxX={W} />
			<Pill cx={(X0 + X1) / 2} cy={146} label="첫 토큰까지 시간" tone="blue" maxX={W} />
			<Pill cx={(ends[3] + ends[4]) / 2} cy={174} label="토큰당 시간" tone="amber" maxX={W} />
		</svg>
	);
}

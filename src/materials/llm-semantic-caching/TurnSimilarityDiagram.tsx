// 대화가 이어질 때 요청마다 앞선 대화를 전부 다시 보내므로, 연속된 두 요청의 유사도가 1에 가까워지는 모습을 보여주는 정적 그림.
// 유사도는 시스템 프롬프트 37토큰과 그때까지의 대화를 통째로 bge-m3(q8)에 넣어 잰 값이다.
const TURNS = [
	{ blocks: 1, question: "주문한 운동화가 아직 안 왔어요", sim: null },
	{ blocks: 3, question: "주문 번호는 A-1001이에요", sim: "0.869" },
	{ blocks: 5, question: "그럼 주소를 바꿀 수 있나요?", sim: "0.964" },
	{ blocks: 7, question: "교환하면 배송비는 누가 내나요?", sim: "0.975" },
	{ blocks: 9, question: "그럼 그냥 환불해 주세요", sim: "0.990" },
] as const;

const ARIA =
	"한 대화에서 이어진 요청 다섯 개를 위에서 아래로 쌓은 그림. 요청마다 시스템 프롬프트와 앞선 대화를 전부 다시 보내므로 막대가 길어진다. 직전 요청과 견주면 새로 붙는 것은 챗봇의 직전 답과 이번 질문이다. 직전 요청과의 유사도는 두 번째 0.869, 세 번째 0.964, 네 번째 0.975, 다섯 번째 0.990으로 올라간다. 다섯 번째 요청인 「그럼 그냥 환불해 주세요」는 네 번째 요청인 「교환하면 배송비는 누가 내나요?」와 거의 같은 글로 보인다.";

const X0 = 8;
const SYS_W = 44;
const BLOCK_W = 22;
const ROW_H = 54;

export default function TurnSimilarityDiagram() {
	return (
		<svg viewBox="0 0 400 310" role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<text x={X0} y="14" fontSize="11.5" fill="var(--muted-foreground)">
				요청에 담긴 글
			</text>
			<text x="392" y="14" textAnchor="end" fontSize="11.5" fill="var(--muted-foreground)">
				직전 요청과의 유사도
			</text>
			{TURNS.map((turn, i) => {
				const y = 26 + i * ROW_H;
				return (
					<g key={turn.question}>
						<text x={X0} y={y + 12} fontSize="12.5" fill="var(--foreground)">
							{`${i + 1}. ${turn.question}`}
						</text>
						<rect x={X0} y={y + 19} width={SYS_W} height="18" rx="3" fill="rgb(var(--gray))" fillOpacity="0.35" />
						<text x={X0 + SYS_W / 2} y={y + 32} textAnchor="middle" fontSize="10.5" fill="var(--foreground)">
							시스템
						</text>
						{Array.from({ length: turn.blocks }, (_, b) => {
							const isNew = b === turn.blocks - 1;
							return (
								<rect
									key={b}
									x={X0 + SYS_W + 3 + b * (BLOCK_W + 3)}
									y={y + 19}
									width={BLOCK_W}
									height="18"
									rx="3"
									fill={isNew ? "var(--accent)" : "var(--secondary)"}
									stroke={isNew ? "var(--accent)" : "rgb(var(--gray))"}
									strokeOpacity={isNew ? 1 : 0.4}
								/>
							);
						})}
						{turn.sim && (
							<text x="392" y={y + 33} textAnchor="end" fontSize="14" fontWeight="600" fill="var(--foreground)">
								{turn.sim}
							</text>
						)}
					</g>
				);
			})}
			<g fontSize="11.5" fill="var(--muted-foreground)">
				<rect x={X0} y="293" width="12" height="12" rx="2" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.4" />
				<text x={X0 + 18} y="303">
					앞선 대화
				</text>
				<rect x="118" y="293" width="12" height="12" rx="2" fill="var(--accent)" />
				<text x="136" y="303">
					이번 질문
				</text>
			</g>
		</svg>
	);
}

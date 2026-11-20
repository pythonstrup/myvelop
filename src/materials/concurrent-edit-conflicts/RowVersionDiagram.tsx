// 행 단위 비교 — 행 전체에 버전이 하나라, 서로 다른 칸을 고쳐도 첫 저장만 통과한다.
import { LINEN, ROW_H, ROWS_TOP, textWidth } from "./admin";
import { SaveLogFigure, WhoBadge } from "./save-log";

const TAG = "행 버전 하나: 7 → 8";

export default function RowVersionDiagram() {
	return (
		<SaveLogFigure
			label="행 단위 비교의 저장 순서. 베이직 린넨 셔츠 행 전체를 버전 하나가 감싸고 있고, A는 가격, B는 상품 설명, C는 태그 칸을 고친다. 버전 7을 읽은 세 사람 가운데 A가 먼저 가격을 29,000원으로 저장하자 버전이 8로 오른다. 이어서 B와 C가 저장하면 읽은 버전 7과 최신 버전 8이 달라 서로 다른 칸을 고쳤는데도 둘 다 거절된다."
			row={{ ...LINEN, price: "29,000원" }}
			rowH={ROW_H}
			overlay={
				<g>
					<rect
						x="25"
						y={ROWS_TOP + 1}
						width="630"
						height={ROW_H - 2}
						rx="4"
						fill="none"
						stroke="var(--accent)"
						strokeWidth="2"
					/>
					<rect
						x="25"
						y={ROWS_TOP - 8}
						width={textWidth(TAG, 10.5) + 12}
						height="16"
						rx="3"
						fill="var(--accent)"
					/>
					<text
						x="31"
						y={ROWS_TOP + 4}
						fontSize="10.5"
						fontWeight="600"
						fill="var(--background)"
					>
						{TAG}
					</text>
					<WhoBadge col="price" who="A" />
					<WhoBadge col="tags" who="C" />
					<WhoBadge col="desc" who="B" />
				</g>
			}
			attempts={[
				{
					who: "A",
					action: "가격을 29,000원으로",
					check: "행 버전: 읽은 7, 최신 7",
					ok: true,
					note: "버전이 8로 오른다",
				},
				{
					who: "B",
					action: "설명에 세탁 방법 추가",
					check: "행 버전: 읽은 7, 최신 8",
					ok: false,
					note: "다른 칸인데도",
				},
				{
					who: "C",
					action: "태그 '신상'을 '세일'로",
					check: "행 버전: 읽은 7, 최신 8",
					ok: false,
					note: "다른 칸인데도",
				},
			]}
			caption="세 사람이 서로 다른 칸을 고쳤는데 첫 저장만 남는다"
		/>
	);
}

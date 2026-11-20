// 칸 단위 비교 — 칸마다 읽은 값과 최신 값을 비교하므로, 같은 칸을 고친 저장만 걸린다.
import { CellOutline, LINEN, ROWS_TOP } from "./admin";
import { SaveLogFigure, WhoBadge } from "./save-log";

const ROW_H = 58;

export default function CellValueDiagram() {
	return (
		<SaveLogFigure
			label="칸 단위 비교의 저장 순서. 베이직 린넨 셔츠 행에서 A는 가격, B는 상품 설명, C는 태그 칸을 고치고, D도 가격 칸을 고친다. A, B, C는 각자 고친 칸의 읽은 값과 최신 값이 같아 모두 저장된다. A보다 늦게 가격을 35,000원으로 저장하려던 D는 읽은 값 39,000원과 최신 값 29,000원이 달라 거절된다. 행에는 가격 29,000원, 태그 여름과 세일, 세탁 방법을 덧붙인 설명이 함께 남는다."
			row={{
				...LINEN,
				price: "29,000원",
				tags: ["여름", "세일"],
				desc: ["통기성 좋은 린넨 100% 셔츠.", "찬물 손세탁 권장"],
			}}
			rowH={ROW_H}
			overlay={
				<g>
					<CellOutline
						col="price"
						top={ROWS_TOP}
						h={ROW_H}
						color="var(--accent)"
					/>
					<CellOutline
						col="tags"
						top={ROWS_TOP}
						h={ROW_H}
						color="var(--accent)"
					/>
					<CellOutline
						col="desc"
						top={ROWS_TOP}
						h={ROW_H}
						color="var(--accent)"
					/>
					<WhoBadge col="price" who="A" nth={1} />
					<WhoBadge col="price" who="D" />
					<WhoBadge col="tags" who="C" />
					<WhoBadge col="desc" who="B" />
				</g>
			}
			attempts={[
				{
					who: "A",
					action: "가격을 29,000원으로",
					check: "가격: 읽은 39,000원, 최신 39,000원",
					ok: true,
				},
				{
					who: "B",
					action: "설명에 세탁 방법 추가",
					check: "설명: 읽은 값과 최신 값이 같음",
					ok: true,
				},
				{
					who: "C",
					action: "태그 '신상'을 '세일'로",
					check: "태그: 읽은 값과 최신 값이 같음",
					ok: true,
				},
				{
					who: "D",
					action: "가격을 35,000원으로",
					check: "가격: 읽은 39,000원, 최신 29,000원",
					ok: false,
					note: "같은 칸을 고쳤다",
				},
			]}
			caption="다른 칸을 고친 세 사람은 모두 저장되고, 같은 칸을 고친 D만 걸린다"
		/>
	);
}

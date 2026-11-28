// 버전 비교 — 행 버전이 바뀌었으니 B가 설명만 고쳤어도 저장을 거절한다.
import {
	CellOutline,
	Dialog,
	Dimmer,
	Figure,
	LINEN,
	PageHeader,
	ProductRow,
	ROWS_TOP,
	TableHead,
} from "./admin";

const FRAME_H = 258;

export default function VersionRejectDiagram() {
	return (
		<Figure
			frameH={FRAME_H}
			label="버전 비교 방식의 화면. B가 상품 설명만 고쳐 저장을 누르자 '저장하지 못했습니다. 편집하는 동안 A님이 이 상품을 바꿨습니다. 입력한 내용을 적어 둔 뒤 다시 불러와 주세요.'라는 창이 뜬다. 창 아래에는 내가 고친 칸이 상품 설명이라고 적혀 있고, 다시 불러오기 버튼만 있다."
		>
			<PageHeader count={1} />
			<TableHead />
			<ProductRow
				row={{
					...LINEN,
					desc: ["통기성 좋은 린넨 100% 셔츠.", "찬물 손세탁 권장"],
				}}
				top={ROWS_TOP}
				h={58}
			/>
			<CellOutline
				col="desc"
				top={ROWS_TOP}
				h={58}
				color="var(--foreground)"
				tag="B 편집 중"
			/>
			<Dimmer frameH={FRAME_H} />
			<Dialog
				x={170}
				y={70}
				w={340}
				title="저장하지 못했습니다"
				lines={[
					"편집하는 동안 A님이 이 상품을 바꿨습니다.",
					"입력한 내용을 적어 둔 뒤 다시 불러와 주세요.",
				]}
				note="내가 고친 칸: 상품 설명"
				buttons={[{ label: "다시 불러오기", primary: true }]}
			/>
		</Figure>
	);
}

// 편집 잠금(부드러운 잠금) — A가 편집 중인 상품을 B가 열면 경고가 뜨지만 막지는 않는다.
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

const FRAME_H = 238;

export default function EditLockDiagram() {
	return (
		<Figure
			frameH={FRAME_H}
			label="부드러운 편집 잠금의 화면. B가 상품을 열자 'A님이 이 상품을 편집하고 있습니다. 동시에 고치면 한쪽 수정이 사라질 수 있습니다.'라는 경고 창이 뜨고, 닫기와 그래도 편집 버튼이 있다. 경고만 할 뿐 편집을 막지는 않는다."
		>
			<PageHeader count={1} />
			<TableHead />
			<ProductRow row={LINEN} top={ROWS_TOP} />
			<CellOutline
				col="price"
				top={ROWS_TOP}
				color="var(--accent)"
				tag="A 편집 중"
			/>
			<Dimmer frameH={FRAME_H} />
			<Dialog
				x={180}
				y={78}
				w={320}
				title="A님이 이 상품을 편집하고 있습니다"
				lines={["동시에 고치면 한쪽 수정이", "사라질 수 있습니다."]}
				buttons={[{ label: "닫기" }, { label: "그래도 편집", primary: true }]}
			/>
		</Figure>
	);
}

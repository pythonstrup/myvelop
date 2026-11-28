// 자동 병합 — 서로 다른 칸을 고쳤으니 묻지 않고 두 수정을 모두 살린다.
import {
	CellOutline,
	Figure,
	LINEN,
	PageHeader,
	ProductRow,
	ROWS_TOP,
	TableHead,
} from "./admin";

const ROW_H = 58;
const FRAME_H = 246;

export default function AutoMergeDiagram() {
	const toastY = ROWS_TOP + ROW_H + 20;
	return (
		<Figure
			frameH={FRAME_H}
			label="자동 병합 방식의 화면. B가 저장한 뒤 베이직 린넨 셔츠 행에는 A가 내린 가격 29,000원과 B가 덧붙인 설명 '찬물 손세탁 권장'이 함께 반영돼 있다. 화면 오른쪽 아래에 'A님의 변경과 합쳐 저장했습니다'라는 알림이 떠 있다."
		>
			<PageHeader count={1} />
			<TableHead />
			<ProductRow
				row={{
					...LINEN,
					price: "29,000원",
					desc: ["통기성 좋은 린넨 100% 셔츠.", "찬물 손세탁 권장"],
				}}
				top={ROWS_TOP}
				h={ROW_H}
			/>
			<CellOutline
				col="price"
				top={ROWS_TOP}
				h={ROW_H}
				color="var(--accent)"
				tag="A의 변경"
			/>
			<CellOutline
				col="desc"
				top={ROWS_TOP}
				h={ROW_H}
				color="var(--foreground)"
				tag="B의 변경"
			/>

			<rect
				x="388"
				y={toastY}
				width="268"
				height="38"
				rx="8"
				fill="var(--foreground)"
			/>
			<circle cx="408" cy={toastY + 19} r="8" fill="var(--accent)" />
			<path
				d={`M 404 ${toastY + 19} l 3 3 l 5 -6`}
				fill="none"
				stroke="var(--background)"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<text x="424" y={toastY + 23.5} fontSize="12.5" fill="var(--background)">
				A님의 변경과 합쳐 저장했습니다
			</text>
		</Figure>
	);
}

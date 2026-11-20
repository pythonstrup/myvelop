// 묶인 칸 — 칸 단위로 따로 비교하면 재고 0과 판매 중이 함께 저장된다.
import {
	CellOutline,
	Figure,
	LINEN,
	PageHeader,
	ProductRow,
	ROW_H,
	ROWS_TOP,
	TableHead,
} from "./admin";

const FRAME_H = ROWS_TOP + ROW_H + 74;

export default function LinkedCellsDiagram() {
	const top = ROWS_TOP + ROW_H + 16;
	return (
		<Figure
			frameH={FRAME_H}
			label="칸 단위 비교에서 묶인 칸이 어긋난 화면. 베이직 린넨 셔츠 행에서 A가 고친 재고 칸은 0이고, B가 고친 판매 상태 칸은 판매 중이다. 행 아래에 '재고가 0인데 판매 중이다'라는 경고가 붙어 있다."
		>
			<PageHeader count={1} />
			<TableHead />
			<ProductRow row={{ ...LINEN, stock: "0" }} top={ROWS_TOP} />
			<CellOutline
				col="stock"
				top={ROWS_TOP}
				color="var(--accent)"
				tag="A 변경"
			/>
			<CellOutline
				col="status"
				top={ROWS_TOP}
				color="var(--foreground)"
				tag="B 변경"
			/>

			<rect
				x="244"
				y={top}
				width="216"
				height="34"
				rx="8"
				fill="var(--background)"
				stroke="var(--destructive)"
				strokeWidth="1.5"
			/>
			<circle cx="264" cy={top + 17} r="8" fill="var(--destructive)" />
			<text
				x="264"
				y={top + 21}
				textAnchor="middle"
				fontSize="11"
				fontWeight="700"
				fill="var(--background)"
			>
				!
			</text>
			<text
				x="280"
				y={top + 21.5}
				fontSize="12.5"
				fontWeight="600"
				fill="var(--destructive)"
			>
				재고가 0인데 판매 중이다
			</text>
		</Figure>
	);
}

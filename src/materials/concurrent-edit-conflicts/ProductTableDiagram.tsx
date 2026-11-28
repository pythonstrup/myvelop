// 쇼핑몰 관리자 화면의 상품 표. 첫 행에서 A·B가 서로 다른 칸을 편집 중이다.
import {
	CellOutline,
	Figure,
	LINEN,
	PageHeader,
	ProductRow,
	type ProductRowData,
	ROW_H,
	ROWS_TOP,
	TableHead,
} from "./admin";

const ROWS: ProductRowData[] = [
	LINEN,
	{
		name: "코튼 반팔 티셔츠",
		price: "19,000원",
		stock: "340",
		onSale: true,
		tags: ["기본"],
		desc: ["데일리로 입기 좋은 두께"],
	},
	{
		name: "와이드 데님 팬츠",
		price: "49,000원",
		stock: "0",
		onSale: false,
		tags: ["가을"],
		desc: ["허리 밴딩으로 편한 착용감"],
	},
];
const FRAME_H = ROWS_TOP + ROW_H * ROWS.length + 10;

export default function ProductTableDiagram() {
	return (
		<Figure
			frameH={FRAME_H}
			label="쇼핑몰 관리자 화면의 상품 표. 상품 세 개가 상품명, 가격, 재고, 판매 상태, 태그, 상품 설명 열로 나열돼 있다. 첫 행인 베이직 린넨 셔츠에서 A는 가격 칸을, B는 상품 설명 칸을 편집하고 있다."
		>
			<PageHeader count={ROWS.length} />
			<TableHead />
			{ROWS.map((row, i) => (
				<ProductRow
					key={row.name}
					row={row}
					top={ROWS_TOP + ROW_H * i}
					highlight={i === 0}
				/>
			))}
			<CellOutline
				col="price"
				top={ROWS_TOP}
				color="var(--accent)"
				tag="A 편집 중"
			/>
			<CellOutline
				col="desc"
				top={ROWS_TOP}
				color="var(--foreground)"
				tag="B 편집 중"
			/>
		</Figure>
	);
}

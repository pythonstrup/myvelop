import { MONO } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type Colors, FONT } from "@/materials/shared";

// m7i.xlarge의 ENI 한 장(IP 15개)을 한 줄로 그리는 격자. MaxPodsDemo와 WarmEniDemo가 함께 쓴다.
export const IPS_PER_ENI = 15;
export const ROW_HEIGHT = 26;
export type CellState = "hidden" | "empty" | "primary" | "pod" | "warm";

const LABEL_WIDTH = 38;
const GAP = 3;

function layout(w: number) {
	const cell = Math.min(20, Math.floor((w - 16 - LABEL_WIDTH - GAP * (IPS_PER_ENI - 1)) / IPS_PER_ENI));
	const gridWidth = cell * IPS_PER_ENI + GAP * (IPS_PER_ENI - 1);
	return { cell, left: (w - LABEL_WIDTH - gridWidth) / 2 };
}

// col번째 칸의 왼쪽 좌표와 크기
export function eniCell(w: number, col: number) {
	const { cell, left } = layout(w);
	return { x: left + LABEL_WIDTH + col * (cell + GAP), size: cell };
}

export function eniGrid(ctx: CanvasRenderingContext2D, c: Colors, w: number, top: number, rows: number, state: (row: number, col: number) => CellState) {
	const { cell, left } = layout(w);
	const styles: Record<Exclude<CellState, "hidden">, { fill: string; stroke: string }> = {
		empty: { fill: "transparent", stroke: c.boxStroke },
		primary: { fill: c.amberFill, stroke: c.amber },
		pod: { fill: c.blueFill, stroke: c.blue },
		warm: { fill: c.greenFill, stroke: c.green },
	};
	for (let row = 0; row < rows; row++) {
		const y = top + row * ROW_HEIGHT;
		if (state(row, 0) === "hidden") continue;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.sub;
		ctx.font = `500 11px ${MONO}`;
		ctx.fillText(`eth${row}`, left, y + cell / 2);
		for (let col = 0; col < IPS_PER_ENI; col++) {
			const s = state(row, col);
			if (s === "hidden") continue;
			ctx.beginPath();
			ctx.roundRect(left + LABEL_WIDTH + col * (cell + GAP), y, cell, cell, 3);
			ctx.fillStyle = styles[s].fill;
			ctx.fill();
			ctx.strokeStyle = styles[s].stroke;
			ctx.lineWidth = 1;
			ctx.stroke();
		}
	}
}

// 격자 위의 범례 한 줄. 항목 폭을 재서 가운데에 놓는다.
export function legend(ctx: CanvasRenderingContext2D, c: Colors, w: number, y: number, items: readonly { label: string; fill: string; stroke: string }[]) {
	ctx.font = `500 11px ${FONT}`;
	const widths = items.map((i) => ctx.measureText(i.label).width + 16);
	let x = (w - (widths.reduce((a, b) => a + b, 0) + 12 * (items.length - 1))) / 2;
	items.forEach((item, i) => {
		ctx.beginPath();
		ctx.roundRect(x, y - 5, 10, 10, 2);
		ctx.fillStyle = item.fill;
		ctx.fill();
		ctx.strokeStyle = item.stroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.sub;
		ctx.fillText(item.label, x + 14, y + 0.5);
		x += widths[i] + 12;
	});
}

export function formula(ctx: CanvasRenderingContext2D, c: Colors, w: number, y: number, text: string) {
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `700 15px ${MONO}`;
	ctx.fillText(text, w / 2, y);
}

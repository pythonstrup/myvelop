import { FONT } from "@/materials/shared";

// 이 글의 용량 그래프들이 함께 쓰는 규칙과 범례.

// 지금 용량이 클수록 한 번에 크게 움직인다. 그림을 위해 고른 규칙이다.
export const stepOf = (cap: number) => Math.max(0.5, Math.round(cap * 0.4) / 2);

// 선(또는 칠한 칸) 하나와 이름. 다음 항목을 그릴 x를 돌려준다.
export function legend(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, textColor: string, label: string, fill = false) {
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.lineWidth = 2.5;
	if (fill) ctx.fillRect(x, y - 5, 14, 10);
	else {
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + 14, y);
		ctx.stroke();
	}
	ctx.font = `500 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = textColor;
	ctx.fillText(label, x + 19, y);
	return x + 19 + ctx.measureText(label).width + 14;
}

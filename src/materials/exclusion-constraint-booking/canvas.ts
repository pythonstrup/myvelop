import { type Colors, FONT } from "@/materials/shared";

// 이 글의 캔버스 데모가 함께 쓰는 그리기 함수.

export function drawArrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, alpha: number, dashed: boolean) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 1.5;
	if (dashed) ctx.setLineDash([4, 3]);
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.stroke();
	ctx.setLineDash([]);
	const a = Math.atan2(y1 - y0, x1 - x0);
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x1 - 7 * Math.cos(a - 0.45), y1 - 7 * Math.sin(a - 0.45));
	ctx.lineTo(x1 - 7 * Math.cos(a + 0.45), y1 - 7 * Math.sin(a + 0.45));
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

export type CardLine = { text: string; alpha: number; color?: string };

// 요청 카드: 제목 한 줄 아래에 진행 기록을 한 줄씩 남긴다.
export function drawCard(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, w: number, h: number, title: string, lines: CardLine[], color: string, fill: string) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 8);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 11.5px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(title, x + 10, y + 17);
	ctx.font = `500 11px ${FONT}`;
	lines.forEach((line, i) => {
		if (line.alpha <= 0) return;
		ctx.globalAlpha = line.alpha;
		ctx.fillStyle = line.color ?? color;
		ctx.beginPath();
		ctx.arc(x + 13, y + 37 + i * 16, 2.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = line.color ?? c.text;
		ctx.fillText(line.text, x + 21, y + 37 + i * 16);
		ctx.globalAlpha = 1;
	});
}

// 캡션이 375px에서도 한 줄에 들어가게 글자 크기를 줄인다.
export function fitCaption(ctx: CanvasRenderingContext2D, text: string, w: number) {
	let size = 12;
	ctx.font = `500 ${size}px ${FONT}`;
	while (ctx.measureText(text).width > w - 16 && size > 10) {
		size -= 0.5;
		ctx.font = `500 ${size}px ${FONT}`;
	}
}

// deadlock_timeout 처럼 정해진 시간을 기다리는 모습. 원호가 p(0~1)만큼 찬다.
export function drawTimer(ctx: CanvasRenderingContext2D, c: Colors, cx: number, cy: number, p: number, label: string, color: string, bg: string, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(cx, cy, 14, 0, Math.PI * 2);
	ctx.fillStyle = bg;
	ctx.fill();
	ctx.lineWidth = 3;
	ctx.strokeStyle = c.line;
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(cx, cy, 14, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
	ctx.strokeStyle = color;
	ctx.stroke();
	ctx.font = `700 9.5px ${FONT}`;
	ctx.fillStyle = color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, cx, cy + 0.5);
	ctx.restore();
}

// 인덱스 항목 한 칸. 커밋 전은 점선이고, 바탕이 boxFill 이면 비어 있는 자리로 보고 글자를 흐리게 쓴다.
export function drawEntry(ctx: CanvasRenderingContext2D, c: Colors, x: number, cy: number, w: number, text: string, color: string, fill: string, dashed: boolean, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(x, cy - 12, w, 24, 5);
	ctx.fillStyle = fill;
	ctx.fill();
	if (dashed) ctx.setLineDash([4, 3]);
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.font = `600 10px ${FONT}`;
	ctx.fillStyle = fill === c.boxFill ? c.sub : c.text;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, x + w / 2, cy + 0.5);
	ctx.restore();
}

// 세션마다 기다린 시간을 가로 막대로 그린다. 끝나기 전에는 주황, 진 세션은 lose 색, 이긴 세션은 초록이다.
// ends 는 진 세션들이, win 은 이긴 세션이 끝난 시각(ms)이고 e 는 지금까지 흐른 시간(ms)이다. 세션 자리는 옅게 깔아 둔다.
export function drawBars(ctx: CanvasRenderingContext2D, c: Colors, x: number, top: number, w: number, row: number, h: number, axisMax: number, ends: number[], win: number, e: number, lose: string) {
	const xAt = (ms: number) => x + (w * ms) / axisMax;
	[...ends, win].forEach((end, k) => {
		const y = top + k * row;
		const done = e >= end;
		const isWin = k === ends.length;
		ctx.globalAlpha = 0.35;
		ctx.fillStyle = c.line;
		ctx.fillRect(x, y, w, h);
		ctx.globalAlpha = done && !isWin ? 0.45 : 0.85;
		ctx.fillStyle = !done ? c.amber : isWin ? c.green : lose;
		ctx.fillRect(x, y, Math.max(0, xAt(Math.min(e, end)) - x), h);
		ctx.globalAlpha = 1;
		if (done) {
			ctx.beginPath();
			ctx.arc(xAt(end), y + h / 2, h * 0.6, 0, Math.PI * 2);
			ctx.fill();
		}
	});
}

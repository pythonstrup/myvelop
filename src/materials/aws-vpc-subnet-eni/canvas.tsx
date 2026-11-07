import { clamp01, type Colors, ease, FONT, lerp, useCanvasScene } from "@/materials/shared";

// 이 글의 캔버스 데모가 함께 쓰는 틀과 그리기 함수.

export type Pt = readonly [number, number];
type Scene = (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => void;

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// scene은 모듈 수준 함수를 넘긴다. 훅이 마운트할 때 한 번만 캡처한다.
export function CanvasFigure({ height, cycle, scene, label }: { height: number; cycle: number; scene: Scene; label: string }) {
	const { containerRef, canvasRef } = useCanvasScene(height, cycle, scene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={label} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

// a~b 구간에서의 진행률. 구간 앞은 0, 뒤는 1이다.
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// 꺾은선 위에서 길이 비율 p인 점. 끝없이 흐르는 점은 eased를 꺼서 일정한 속도로 움직인다.
export function along(pts: readonly Pt[], p: number, eased = true): Pt {
	const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
	let d = (eased ? ease(clamp01(p)) : clamp01(p)) * lens.reduce((a, b) => a + b, 0);
	for (let i = 0; i < lens.length; i++) {
		if (d <= lens[i] || i === lens.length - 1) {
			const f = lens[i] ? Math.min(1, d / lens[i]) : 1;
			return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)];
		}
		d -= lens[i];
	}
	return pts[0];
}

export function path(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, dashed = false, alpha = 1) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	if (dashed) ctx.setLineDash([4, 4]);
	ctx.beginPath();
	ctx.moveTo(pts[0][0], pts[0][1]);
	for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]);
	ctx.stroke();
	ctx.restore();
}

export function box(
	ctx: CanvasRenderingContext2D,
	c: Colors,
	cx: number,
	cy: number,
	w: number,
	h: number,
	title: string,
	sub = "",
	stroke = c.boxStroke,
	fill = c.boxFill,
) {
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 12px ${FONT}`;
	ctx.fillText(title, cx, sub ? cy - 7 : cy);
	if (!sub) return;
	ctx.fillStyle = c.sub;
	ctx.font = `400 10px ${FONT}`;
	ctx.fillText(sub, cx, cy + 9);
}

// 이름표를 왼쪽 위에 단 영역(VPC, 서브넷, 가용 영역)
export function region(
	ctx: CanvasRenderingContext2D,
	c: Colors,
	x: number,
	y: number,
	w: number,
	h: number,
	label: string,
	opts: { stroke?: string; fill?: string; dashed?: boolean } = {},
) {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 10);
	if (opts.fill) {
		ctx.fillStyle = opts.fill;
		ctx.fill();
	}
	ctx.strokeStyle = opts.stroke ?? c.boxStroke;
	ctx.lineWidth = 1;
	if (opts.dashed) ctx.setLineDash([5, 4]);
	ctx.stroke();
	ctx.restore();
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillStyle = c.sub;
	ctx.font = `600 10.5px ${FONT}`;
	ctx.fillText(label, x + 8, y + 6);
}

export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, r = 5) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
}

export function cross(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 2.5;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(x - 6, y - 6);
	ctx.lineTo(x + 6, y + 6);
	ctx.moveTo(x + 6, y - 6);
	ctx.lineTo(x - 6, y + 6);
	ctx.stroke();
	ctx.restore();
}

// 둥근 이름표. 캔버스 밖으로 나가지 않게 x를 당긴다.
export function pill(ctx: CanvasRenderingContext2D, w: number, x: number, y: number, label: string, color: string, fill: string, alpha = 1) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.font = `600 10.5px ${FONT}`;
	const pw = ctx.measureText(label).width + 14;
	const cx = Math.min(Math.max(x, pw / 2 + 2), w - pw / 2 - 2);
	ctx.beginPath();
	ctx.roundRect(cx - pw / 2, y - 9, pw, 18, 9);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, cx, y + 0.5);
	ctx.restore();
}

// 아래쪽 설명 한 줄. 폭이 모자라면 두 줄로 나눈다.
export function caption(ctx: CanvasRenderingContext2D, c: Colors, text: string, w: number, y: number) {
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	if (ctx.measureText(text).width <= w - 16) {
		ctx.fillText(text, w / 2, y);
		return;
	}
	const words = text.split(" ");
	let cut = 1;
	let best = Number.POSITIVE_INFINITY;
	for (let i = 1; i < words.length; i++) {
		const diff = Math.abs(ctx.measureText(words.slice(0, i).join(" ")).width - ctx.measureText(words.slice(i).join(" ")).width);
		if (diff < best) {
			best = diff;
			cut = i;
		}
	}
	ctx.fillText(words.slice(0, cut).join(" "), w / 2, y - 8);
	ctx.fillText(words.slice(cut).join(" "), w / 2, y + 8);
}

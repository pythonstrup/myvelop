import { useEffect, useRef } from "react";

// 글 데모 캔버스가 공유하는 팔레트·이징·애니메이션 루프.
export const FONT = '"Pretendard Variable", Pretendard, sans-serif';

export function palette(dark: boolean) {
	return dark
		? {
				text: "#e9ecef",
				sub: "#adb5bd",
				line: "#495057",
				boxFill: "rgba(255, 255, 255, 0.05)",
				boxStroke: "rgba(255, 255, 255, 0.2)",
				blue: "#4dabf7",
				blueFill: "rgba(77, 171, 247, 0.18)",
				amber: "#ffa94d",
				amberFill: "rgba(255, 169, 77, 0.18)",
				green: "#69db7c",
				greenFill: "rgba(105, 219, 124, 0.18)",
				red: "#ff6b6b",
				redFill: "rgba(255, 107, 107, 0.18)",
			}
		: {
				text: "#343a40",
				sub: "#868e96",
				line: "#ced4da",
				boxFill: "#f8f9fa",
				boxStroke: "#dee2e6",
				blue: "#1971c2",
				blueFill: "#d0ebff",
				amber: "#e8590c",
				amberFill: "#ffe8cc",
				green: "#2f9e44",
				greenFill: "#d3f9d8",
				red: "#e03131",
				redFill: "#ffe3e3",
			};
}

export type Colors = ReturnType<typeof palette>;

export const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

export function drawBadge(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	label: string,
	fill: string,
	color: string,
	alpha: number,
) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.font = `600 10.5px ${FONT}`;
	const w = ctx.measureText(label).width + 14;
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - 9, w, 18, 9);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, cx, cy + 0.5);
	ctx.restore();
}

// DPR·리사이즈·prefers-reduced-motion·정리를 처리하는 캔버스 루프.
// drawScene은 모듈 수준 순수 함수여야 한다(마운트 시 한 번만 캡처된다).
export function useCanvasScene(
	height: number,
	cycle: number,
	drawScene: (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => void,
) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!container || !canvas || !ctx) return;

		const draw = (t: number) => {
			const w = container.clientWidth;
			if (!w) return;
			const dpr = window.devicePixelRatio || 1;
			if (canvas.width !== w * dpr || canvas.height !== height * dpr) {
				canvas.width = w * dpr;
				canvas.height = height * dpr;
				canvas.style.height = `${height}px`;
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, height);
			drawScene(ctx, w, t, document.documentElement.classList.contains("dark"));
		};

		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
		let raf = 0;
		const start = performance.now();
		const loop = (now: number) => {
			draw((now - start) % cycle);
			raf = requestAnimationFrame(loop);
		};
		// 모션 최소화 설정이면 마지막 장면만 정지 화면으로 보여준다.
		if (reduced.matches) draw(cycle - 1);
		else raf = requestAnimationFrame(loop);

		const observer = new ResizeObserver(() => {
			if (reduced.matches) draw(cycle - 1);
		});
		observer.observe(container);
		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
		};
	}, [height, cycle, drawScene]);

	return { containerRef, canvasRef };
}

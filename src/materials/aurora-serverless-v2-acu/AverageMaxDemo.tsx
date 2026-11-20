import { CanvasFigure, caption, pill, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { FONT, palette } from "@/materials/shared";

// 1초마다 잰 용량 60개가 CloudWatch의 1분 값 하나로 묶일 때 Average와 Maximum이 어떻게 갈리는지 보여주는 애니메이션.
const HEIGHT = 260;
const CYCLE = 12000;
const SWEEP = 6000;
const AVG_AT = SWEEP + 400;
const MAX_AT = SWEEP + 2800;
const Y_MAX = 23;
const SPIKE_FROM = 25;
const SPIKE_TO = 35;
const valueAt = (s: number) => (s >= SPIKE_FROM && s < SPIKE_TO ? 20 : 4);
const AVG = (4 * 50 + 20 * 10) / 60;
const ARIA =
	"1분 동안 1초마다 잰 용량을 그리는 애니메이션. 50초는 4 ACU에 머물고 25초부터 10초 동안만 20 ACU로 튄다. 다 그리고 나면 이 1분의 Average인 약 6.7 ACU 선과 Maximum인 20 ACU 선이 차례로 나타난다.";

function captionAt(t: number, sec: number) {
	if (t < SWEEP) {
		if (sec >= SPIKE_FROM && sec < SPIKE_TO + 4) return "② 10초짜리 봉우리가 지나간다";
		return "① 1초마다 잰 용량이 1분 동안 쌓인다";
	}
	if (t < MAX_AT) return "③ Average는 1분의 평균이라 약 6.7 ACU다";
	return "④ Maximum은 가장 높았던 값이라 20 ACU다";
}

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const left = 14;
	const right = w - 14;
	const top = 40;
	const bottom = HEIGHT - 76;
	const x = (s: number) => left + ((right - left) * s) / 60;
	const y = (v: number) => bottom - ((bottom - top) * v) / Y_MAX;
	const sec = seg(t, 0, SWEEP) * 60;

	// 위쪽 괄호: 이 구간 전체가 1분 값 하나다
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(left, 31);
	ctx.lineTo(left, 25);
	ctx.lineTo(right, 25);
	ctx.lineTo(right, 31);
	ctx.stroke();
	ctx.font = `600 11px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("이 1분 전체가 CloudWatch에 값 하나로 남는다", w / 2, 12);

	// 바닥과 눈금
	ctx.strokeStyle = c.line;
	ctx.beginPath();
	ctx.moveTo(left, bottom);
	ctx.lineTo(right, bottom);
	ctx.stroke();
	ctx.font = `400 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textBaseline = "top";
	for (const s of [0, 30, 60]) {
		ctx.textAlign = s === 0 ? "left" : s === 60 ? "right" : "center";
		ctx.fillText(`${s}초`, x(s), bottom + 6);
	}

	// 1초마다 잰 값. 지나간 만큼만 그린다.
	const drawn = Math.floor(sec);
	ctx.fillStyle = c.blueFill;
	for (let s = 0; s < drawn; s++) ctx.fillRect(x(s), y(valueAt(s)), x(s + 1) - x(s) + 0.5, bottom - y(valueAt(s)));
	ctx.strokeStyle = c.blue;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x(0), y(valueAt(0)));
	for (let s = 1; s <= drawn; s++) {
		ctx.lineTo(x(s), y(valueAt(s - 1)));
		if (s < 60) ctx.lineTo(x(s), y(valueAt(s)));
	}
	ctx.stroke();
	if (t < SWEEP) {
		ctx.fillStyle = c.blue;
		ctx.beginPath();
		ctx.arc(x(drawn), y(valueAt(Math.min(59, drawn))), 4, 0, Math.PI * 2);
		ctx.fill();
	}

	const guide = (v: number, color: string, alpha: number) => {
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.setLineDash([6, 4]);
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(left, y(v));
		ctx.lineTo(right, y(v));
		ctx.stroke();
		ctx.restore();
	};
	const avgAlpha = seg(t, AVG_AT, AVG_AT + 600);
	const maxAlpha = seg(t, MAX_AT, MAX_AT + 600);
	guide(AVG, c.green, avgAlpha);
	guide(20, c.red, maxAlpha);
	pill(ctx, w, right - 62, y(AVG) - 13, "Average 약 6.7", c.green, c.greenFill, avgAlpha);
	pill(ctx, w, right - 62, y(20) - 13, "Maximum 20", c.red, c.redFill, maxAlpha);

	caption(ctx, c, captionAt(t, sec), w, HEIGHT - 28);
}

export default function AverageMaxDemo() {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={scene} label={ARIA} />;
}

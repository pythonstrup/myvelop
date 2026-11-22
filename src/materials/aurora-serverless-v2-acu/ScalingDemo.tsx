import { legend, stepOf } from "@/materials/aurora-serverless-v2-acu/scaling";
import { CanvasFigure, caption, pill, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { FONT, palette } from "@/materials/shared";

// 큰 작업이 들어오면 용량이 계단을 밟아 오르고, 최대에서 멈췄다가, 작업이 끝나면 내려오는 애니메이션.
const HEIGHT = 290;
const CYCLE = 14000;
const DRAW_MS = 11000;
const N = 240;
const TICK = 5; // 용량은 몇 칸에 한 번씩 바뀐다
const MIN = 1;
const MAX = 20;
const Y_MAX = 28;
const ARIA =
	"가로축은 시간, 세로축은 ACU인 그래프 애니메이션. 평소 용량은 최소 1 ACU에 머문다. 최대를 넘는 큰 작업이 들어오면 용량이 조금씩 늘어나는데, 작을 때는 한 번에 느는 폭이 작고 커질수록 폭도 커진다. 용량이 따라 오르는 동안과 최대 20 ACU에 닿은 뒤에는 필요한 용량과의 차이가 모자란 용량으로 칠해진다. 작업이 끝나면 용량도 조금씩 줄어든다.";

// 필요한 용량. 그림을 위해 고른 가상의 값이다.
function demandAt(i: number) {
	const s = i / N;
	if (s < 0.12) return MIN;
	if (s < 0.62) return 26;
	if (s < 0.76) return 4;
	return MIN;
}

const SIM = (() => {
	const demand: number[] = [];
	const cap: number[] = [];
	let c = demandAt(0);
	for (let i = 0; i < N; i++) {
		const d = demandAt(i);
		if (i % TICK === 0) {
			if (d > c) c = Math.min(MAX, c + stepOf(c));
			else if (d < c) c = Math.max(MIN, d, c - stepOf(c));
		}
		demand.push(d);
		cap.push(c);
	}
	return { demand, cap };
})();

function captionAt(i: number) {
	const s = i / N;
	if (s < 0.12) return "① 평소에는 최소에 머문다";
	if (s >= 0.62) return "④ 작업이 끝나면 용량도 조금씩 줄어든다";
	if (SIM.cap[i] < MAX) return "② 조금씩 늘어난다. 작을 때는 느는 폭도 작다";
	return "③ 최대에 닿으면 더 늘지 않는다. 모자란 만큼 느려진다";
}

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const left = 14;
	const right = w - 14;
	const top = 44;
	const bottom = HEIGHT - 72;
	const x = (i: number) => left + ((right - left) * i) / (N - 1);
	const y = (v: number) => bottom - ((bottom - top) * v) / Y_MAX;
	const upto = Math.max(1, Math.round(seg(t, 0, DRAW_MS) * (N - 1)));

	let lx = legend(ctx, left, 16, c.blue, c.text, "용량(ACU)");
	lx = legend(ctx, lx, 16, c.amber, c.text, "필요한 용량");
	legend(ctx, lx, 16, c.redFill, c.text, "모자란 용량", true);

	// 최대·최소 안내선과 바닥
	ctx.save();
	ctx.setLineDash([5, 4]);
	ctx.lineWidth = 1;
	ctx.strokeStyle = c.sub;
	for (const v of [MAX, MIN]) {
		ctx.beginPath();
		ctx.moveTo(left, y(v));
		ctx.lineTo(right, y(v));
		ctx.stroke();
	}
	ctx.restore();
	ctx.strokeStyle = c.line;
	ctx.beginPath();
	ctx.moveTo(left, bottom);
	ctx.lineTo(right, bottom);
	ctx.stroke();
	ctx.font = `600 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "right";
	ctx.textBaseline = "bottom";
	// 내려오는 계단과 겹치지 않게 이름을 짧게 쓴다
	ctx.fillText("최대 20", right, y(MAX) - 3);
	ctx.fillText("최소 1", right, y(MIN) - 3);
	ctx.textBaseline = "top";
	ctx.textAlign = "right";
	ctx.font = `400 10.5px ${FONT}`;
	ctx.fillText("시간 →", right, bottom + 6);

	// 필요한 용량에 못 미치는 몫
	// 한 경로로 모아 한 번에 칠해야 반투명 색이 칸 경계에서 겹쳐 진해지지 않는다
	ctx.fillStyle = c.redFill;
	ctx.beginPath();
	for (let i = 0; i < upto; i++) {
		const d = SIM.demand[i];
		const cap = SIM.cap[i];
		if (d > cap) ctx.rect(x(i), y(d), x(i + 1) - x(i) + 0.5, y(cap) - y(d));
	}
	ctx.fill();

	const line = (vals: number[], color: string, width: number) => {
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineJoin = "round";
		ctx.beginPath();
		ctx.moveTo(x(0), y(vals[0]));
		for (let i = 1; i <= upto; i++) {
			// 값이 바뀌는 칸은 수직으로 세워 계단 모양을 만든다
			ctx.lineTo(x(i), y(vals[i - 1]));
			ctx.lineTo(x(i), y(vals[i]));
		}
		ctx.stroke();
	};
	line(SIM.demand, c.amber, 1.5);
	line(SIM.cap, c.blue, 2.5);

	// 지금 위치와 용량
	const cap = SIM.cap[upto];
	ctx.fillStyle = c.blue;
	ctx.beginPath();
	ctx.arc(x(upto), y(cap), 4, 0, Math.PI * 2);
	ctx.fill();
	// 최소에 머물 때는 숫자 대신 안내선 이름이 그 값을 말해 준다
	if (cap > MIN) pill(ctx, w, x(upto), Math.max(top - 6, y(cap) - 16), `${cap} ACU`, c.blue, c.blueFill);

	caption(ctx, c, captionAt(upto), w, HEIGHT - 28);
}

export default function ScalingDemo() {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={scene} label={ARIA} />;
}

import { CanvasFigure, caption, pill, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { FONT, palette } from "@/materials/shared";

// 배치가 묶음을 쓰고 쉬다가, 1분 늦게 읽은 ACU가 문턱을 넘으면 멈추고, 내려오면 이어 쓰는 애니메이션.
const HEIGHT = 330;
const CYCLE = 16000;
const DRAW_MS = 13000;
const N = 200;
const LAG = 6; // 읽는 값은 이만큼 앞의 값이다(1분 전이라고 하자)
const MAX = 20;
const LIMIT = 10; // 최대의 50%라고 가정한 문턱
const Y_MAX = 22;
const STEPS = { write: 8, rest: 3, pause: 10 } as const;
const ARIA =
	"가로축은 시간, 세로축은 writer의 ACU인 그래프 애니메이션. 최대는 20 ACU, 배치의 문턱은 그 절반인 10 ACU이고, 문턱과 최대 사이는 사용자가 화면을 열 때 서비스가 보내는 쿼리를 위해 비워 둔 여유로 칠해져 있다. 배치는 묶음을 쓰고 짧게 쉬기를 되풀이한다. 묶음 사이에 1분 전의 ACU를 읽어 문턱을 넘었으면 멈추고, 값이 내려오면 이어 쓴다. 읽는 값이 늦어서 ACU는 문턱을 조금 넘었다가 내려오지만 최대에는 닿지 않는다. 아래 띠는 배치가 쓰는 때, 쉬는 때, 멈춘 때를 색으로 나눠 보여준다.";

type Mode = keyof typeof STEPS;

// 서비스 요청이 만드는 부하. 중간에 한동안 늘어난다. 모두 그림을 위한 가상의 값이다.
const otherLoad = (k: number) => 3 + (k >= 110 && k < 150 ? 3 : 0);

const SIM = (() => {
	const acu: number[] = [];
	const mode: Mode[] = [];
	let a = 3;
	let batch = 0;
	let m: Mode = "rest";
	let left = 0;
	for (let k = 0; k < N; k++) {
		if (left === 0) {
			if (m === "write") m = "rest";
			else m = (acu[Math.max(0, k - LAG)] ?? a) >= LIMIT ? "pause" : "write";
			left = STEPS[m];
		}
		batch = m === "write" ? Math.min(batch + 1, 12) : batch * 0.85;
		a = Math.min(MAX, Math.max(1, a + (otherLoad(k) + batch - a) * 0.3));
		acu.push(a);
		mode.push(m);
		left--;
	}
	return { acu, mode };
})();

function captionAt(k: number, done: boolean) {
	if (done) return "④ 문턱 위는 서비스 요청이 쓸 여유로 비워 둔다";
	if (SIM.mode[k] === "pause") return "② 읽은 값이 문턱을 넘었으면 멈춘다";
	return SIM.mode.slice(0, k).includes("pause")
		? "③ 내려오면 저장해 둔 위치부터 이어 쓴다"
		: "① 묶음을 쓰고 짧게 쉰다";
}

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const left = 14;
	const right = w - 14;
	const top = 34;
	const bottom = HEIGHT - 118;
	const x = (k: number) => left + ((right - left) * k) / (N - 1);
	const y = (v: number) => bottom - ((bottom - top) * v) / Y_MAX;
	const upto = Math.max(1, Math.round(seg(t, 0, DRAW_MS) * (N - 1)));
	const color: Record<Mode, string> = { write: c.blue, rest: c.line, pause: c.amber };

	// 문턱과 최대 사이: 배치가 쓰지 않고 서비스 요청을 위해 비워 두는 여유. ACU 선이 닿지 않는 띠 윗부분에 이름을 적는다.
	ctx.fillStyle = c.greenFill;
	ctx.fillRect(left, y(MAX), right - left, y(LIMIT) - y(MAX));
	ctx.font = `600 11px ${FONT}`;
	ctx.fillStyle = c.green;
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";
	ctx.fillText("서비스 요청이 쓸 여유", right - 8, y(MAX - 1.6));
	ctx.save();
	ctx.setLineDash([5, 4]);
	ctx.lineWidth = 1.2;
	ctx.strokeStyle = c.sub;
	ctx.beginPath();
	ctx.moveTo(left, y(MAX));
	ctx.lineTo(right, y(MAX));
	ctx.stroke();
	ctx.strokeStyle = c.red;
	ctx.beginPath();
	ctx.moveTo(left, y(LIMIT));
	ctx.lineTo(right, y(LIMIT));
	ctx.stroke();
	ctx.restore();
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(left, bottom);
	ctx.lineTo(right, bottom);
	ctx.stroke();

	// 선 이름은 선과 겹치지 않게 위쪽 범례로 뺀다
	ctx.font = `500 11px ${FONT}`;
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	let lx = left;
	for (const [swatch, label] of [
		[c.sub, "최대 20 ACU"],
		[c.red, "배치 문턱 50%"],
	] as const) {
		ctx.strokeStyle = swatch;
		ctx.save();
		ctx.setLineDash([4, 3]);
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(lx, 12);
		ctx.lineTo(lx + 14, 12);
		ctx.stroke();
		ctx.restore();
		ctx.fillStyle = c.text;
		ctx.fillText(label, lx + 19, 12);
		lx += 19 + ctx.measureText(label).width + 14;
	}

	// writer의 ACU
	ctx.strokeStyle = c.blue;
	ctx.lineWidth = 2.2;
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.moveTo(x(0), y(SIM.acu[0]));
	for (let k = 1; k <= upto; k++) ctx.lineTo(x(k), y(SIM.acu[k]));
	ctx.stroke();

	// 지금 값과, 배치가 읽는 늦은 값
	const done = t >= DRAW_MS;
	if (!done && upto > LAG) {
		const r = upto - LAG;
		ctx.strokeStyle = c.amber;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(x(r), y(SIM.acu[r]), 5, 0, Math.PI * 2);
		ctx.stroke();
		pill(ctx, w, x(r), Math.min(bottom - 10, y(SIM.acu[r]) + 18), "읽는 값(1분 전)", c.amber, c.amberFill);
	}
	ctx.fillStyle = c.blue;
	ctx.beginPath();
	ctx.arc(x(upto), y(SIM.acu[upto]), 4, 0, Math.PI * 2);
	ctx.fill();

	// 배치의 상태 띠
	const stripY = bottom + 14;
	for (let k = 0; k < upto; k++) {
		ctx.fillStyle = color[SIM.mode[k]];
		ctx.fillRect(x(k), stripY, x(k + 1) - x(k) + 0.5, 12);
	}
	ctx.font = `500 10.5px ${FONT}`;
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	lx = left;
	for (const [m, label] of [
		["write", "묶음 쓰기"],
		["rest", "짧은 쉼"],
		["pause", "멈춤"],
	] as const) {
		ctx.fillStyle = color[m];
		ctx.fillRect(lx, stripY + 30, 10, 10);
		ctx.fillStyle = c.sub;
		ctx.fillText(label, lx + 14, stripY + 35);
		lx += 14 + ctx.measureText(label).width + 16;
	}

	caption(ctx, c, captionAt(upto, done), w, HEIGHT - 26);
}

export default function ThrottleDemo() {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={scene} label={ARIA} />;
}

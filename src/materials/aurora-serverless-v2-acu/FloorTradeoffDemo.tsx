import { legend, stepOf } from "@/materials/aurora-serverless-v2-acu/scaling";
import { CanvasFigure, caption, pill, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { FONT, palette } from "@/materials/shared";

// 최소만 다르게 둔 두 인스턴스에 같은 일을 맡겨, 바닥이 낮으면 한가할 때 요금이 적고
// 바닥이 높으면 바빠졌을 때 빨리 따라잡는다는 것을 견주는 애니메이션.
const HEIGHT = 350;
const CYCLE = 13000;
const DRAW_MS = 9000;
const N = 160;
const TICK = 4; // 용량은 몇 칸에 한 번씩 바뀐다
const JUMP_AT = 48; // 이 칸부터 바빠진다
const IDLE = 0.3;
const NEED = 12;
const Y_MAX = 14;
const LANE_H = 84;
const ARIA =
	"최소만 다르게 둔 인스턴스 두 개를 위아래로 견주는 애니메이션. 위는 최소 0.5 ACU, 아래는 최소 4 ACU다. 한가할 때는 둘 다 바닥에 머물러, 위는 0.5 ACU, 아래는 4 ACU만큼 요금이 나간다. 일이 몰려 12 ACU가 필요해지면 둘 다 조금씩 늘어난다. 바닥이 높은 아래쪽은 한 번에 크게 늘어 먼저 따라잡고, 바닥이 낮은 위쪽은 조금씩 늘어 오래 걸린다. 그래서 위쪽의 모자란 용량이 더 넓게 칠해진다.";

const demandAt = (i: number) => (i < JUMP_AT ? IDLE : NEED);

// 바닥에서 출발해 필요한 용량까지 계단을 밟아 오른다. 바닥 밑으로는 내려가지 않는다.
function simulate(floor: number) {
	const cap: number[] = [];
	let c = floor;
	let caughtAt = N - 1;
	for (let i = 0; i < N; i++) {
		const d = demandAt(i);
		if (i % TICK === 0 && d > c) c = Math.min(NEED, c + stepOf(c));
		if (caughtAt === N - 1 && i >= JUMP_AT && c >= d) caughtAt = i;
		cap.push(c);
	}
	return { floor, cap, caughtAt };
}

const LANES = [simulate(0.5), simulate(4)];

function captionAt(upto: number) {
	if (upto < JUMP_AT) return "① 한가할 때는 바닥만큼 요금이 나간다";
	if (upto < LANES[0].caughtAt) return "② 바빠지면 바닥이 높은 쪽이 먼저 따라잡는다";
	return "③ 최솟값은 한가할 때의 요금과 바빠졌을 때의 속도를 맞바꾼다";
}

function lane(ctx: CanvasRenderingContext2D, dark: boolean, w: number, top: number, L: (typeof LANES)[number], upto: number) {
	const c = palette(dark);
	const left = 14;
	const right = w - 14;
	const bottom = top + LANE_H;
	const x = (i: number) => left + ((right - left) * i) / (N - 1);
	const y = (v: number) => bottom - (LANE_H * v) / Y_MAX;

	ctx.font = `600 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(`최소 ${L.floor} ACU`, left, top - 8);

	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(left, bottom);
	ctx.lineTo(right, bottom);
	ctx.stroke();

	// 한가할 때 쓰는 용량(요금)과, 바빠진 뒤 모자란 몫
	ctx.fillStyle = c.blueFill;
	ctx.fillRect(x(0), y(L.floor), x(Math.min(upto, JUMP_AT)) - x(0), bottom - y(L.floor));
	ctx.fillStyle = c.redFill;
	ctx.beginPath();
	for (let i = JUMP_AT; i < upto; i++) {
		if (NEED > L.cap[i]) ctx.rect(x(i), y(NEED), x(i + 1) - x(i) + 0.5, y(L.cap[i]) - y(NEED));
	}
	ctx.fill();

	const line = (vals: (i: number) => number, color: string, width: number) => {
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineJoin = "round";
		ctx.beginPath();
		ctx.moveTo(x(0), y(vals(0)));
		for (let i = 1; i <= upto; i++) {
			ctx.lineTo(x(i), y(vals(i - 1)));
			ctx.lineTo(x(i), y(vals(i)));
		}
		ctx.stroke();
	};
	line(demandAt, c.amber, 1.5);
	line((i) => L.cap[i], c.blue, 2.5);

	if (upto >= JUMP_AT) pill(ctx, w, x(JUMP_AT / 2), y(L.floor) - 14, `평소 ${L.floor} ACU`, c.blue, c.blueFill);

	// 따라잡는 데 걸린 시간
	if (upto >= L.caughtAt) {
		const a = x(JUMP_AT);
		const b = x(L.caughtAt);
		ctx.strokeStyle = c.red;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(a, bottom + 5);
		ctx.lineTo(a, bottom + 10);
		ctx.lineTo(b, bottom + 10);
		ctx.lineTo(b, bottom + 5);
		ctx.stroke();
		ctx.font = `600 11px ${FONT}`;
		ctx.fillStyle = c.red;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(L.floor < 1 ? "따라잡는 데 오래 걸린다" : "금방 따라잡는다", a, bottom + 14);
	}
}

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const upto = Math.max(1, Math.round(seg(t, 0, DRAW_MS) * (N - 1)));

	let lx = legend(ctx, 14, 14, c.blue, c.text, "용량(ACU)");
	lx = legend(ctx, lx, 14, c.amber, c.text, "필요한 용량");
	legend(ctx, lx, 14, c.redFill, c.text, "모자란 용량", true);

	lane(ctx, dark, w, 58, LANES[0], upto);
	lane(ctx, dark, w, 202, LANES[1], upto);

	caption(ctx, c, captionAt(upto), w, HEIGHT - 24);
}

export default function FloorTradeoffDemo() {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={scene} label={ARIA} />;
}

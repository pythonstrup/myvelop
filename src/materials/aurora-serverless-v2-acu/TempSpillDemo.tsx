import { CanvasFigure, caption, pill, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { FONT, lerp, palette } from "@/materials/shared";

// 정렬 쿼리 하나가 메모리를 넘쳐 임시 파일을 로컬 저장소에 쓰는 동안, DB 인스턴스의 세 길에 무엇이 오가고
// 길마다 다른 지표가 어떻게 움직이는지 보여주는 애니메이션. 시각과 양은 모두 그림을 위한 가정이다.
const HEIGHT = 360;
const CYCLE = 12500;
const END = 9800; // 작은 그래프의 시간축 끝
const SLOTS = 8;
const FILL_FROM = 300;
const FILL_STEP = 330;
const SPILL_FROM = 2900;
const READBACK_FROM = 5900;
const RESULT_FROM = 7600;
const CLEAR_AT = 8400;
const DONE_AT = 9300;
const TRAVEL = 700;
const SPACING = 140;
const ARIA =
	"DB 인스턴스를 가운데 두고, 위에 애플리케이션, 왼쪽 아래에 클러스터 저장소, 오른쪽 아래에 로컬 저장소가 있다. 상자마다 그 길을 재는 지표 이름과 그 값의 작은 그래프가 붙어 있다. 먼저 정렬할 행이 클러스터 저장소에서 인스턴스로 올라와 메모리의 정렬 작업 공간이 찬다. 공간이 다 차면 넘친 몫이 로컬 저장소로 내려가 임시 파일이 쌓이고, 그동안 TempStorageThroughput 그래프가 크게 오르며 ACU도 4에서 6으로 오른다. 이어서 임시 파일을 다시 읽어 정렬을 마치고, 결과를 애플리케이션으로 보낸 뒤 임시 파일을 지운다. 끝나고 나면 임시 파일이 오간 양은 TempStorageThroughput 그래프로 볼 수 있다.";

// 꺼졌다 켜졌다 하는 구간. a에서 켜지고 b에서 꺼진다.
const window01 = (t: number, a: number, b: number) => Math.min(seg(t, a, a + 300), 1 - seg(t, b, b + 300));
const RATE = {
	// 넘치기 시작하면 정렬이 임시 파일을 오가느라 행을 읽는 속도가 줄어든다
	cluster: (t: number) => (0.7 - 0.35 * seg(t, SPILL_FROM, SPILL_FROM + 300)) * window01(t, 200, 7000),
	local: (t: number) => window01(t, SPILL_FROM, RESULT_FROM),
	app: (t: number) => 0.35 * window01(t, RESULT_FROM, DONE_AT - 300),
};
const jitter = (k: number, seed: number) => 0.5 + 0.5 * Math.sin(k * 12.9898 + seed * 78.233);

function captionAt(t: number) {
	if (t < SPILL_FROM) return "① 정렬할 행을 읽어 와 메모리에서 정렬한다";
	if (t < READBACK_FROM) return "② 메모리가 차면 넘친 몫을 임시 파일로 덜어 낸다";
	if (t < RESULT_FROM) return "③ 임시 파일을 다시 읽어 가며 정렬을 마친다";
	if (t < DONE_AT) return "④ 결과를 보내고 임시 파일은 지운다";
	return "⑤ 임시 파일이 오간 양은 TempStorage 지표로 본다";
}

type Pt = readonly [number, number];

// from에서 to로 흐르는 점들. emitted(te)가 참인 때 떠난 점만 그린다.
function stream(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, t: number, emitted: (te: number, k: number) => boolean, color: string, seed: number) {
	const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
	const nx = -(to[1] - from[1]) / len;
	const ny = (to[0] - from[0]) / len;
	ctx.fillStyle = color;
	for (let k = Math.max(0, Math.floor((t - TRAVEL) / SPACING)); k <= Math.floor(t / SPACING); k++) {
		const te = k * SPACING;
		const p = (t - te) / TRAVEL;
		if (p < 0 || p > 1 || !emitted(te, k)) continue;
		const off = (jitter(k, seed) - 0.5) * 8;
		ctx.beginPath();
		ctx.arc(lerp(from[0], to[0], p) + nx * off, lerp(from[1], to[1], p) + ny * off, 3, 0, Math.PI * 2);
		ctx.fill();
	}
}

// 글자가 maxW 안에 들어가도록 크기를 줄여 쓴다.
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight: number) {
	let s = size;
	ctx.font = `${weight} ${s}px ${FONT}`;
	while (s > 8 && ctx.measureText(text).width > maxW) {
		s -= 0.5;
		ctx.font = `${weight} ${s}px ${FONT}`;
	}
	ctx.fillText(text, x, y);
}

// 지표 상자: 이름, 지표, 지금까지의 값 흐름
function metricBox(ctx: CanvasRenderingContext2D, c: ReturnType<typeof palette>, x: number, y: number, bw: number, bh: number, title: string, metric: string, rate: (t: number) => number, t: number, color: string, fill: string, accent: boolean) {
	ctx.beginPath();
	ctx.roundRect(x, y, bw, bh, 10);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = accent ? color : c.boxStroke;
	ctx.lineWidth = accent ? 1.5 : 1;
	ctx.stroke();

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	fitText(ctx, title, x + 10, y + 15, bw - 20, 12, 600);
	ctx.fillStyle = color;
	fitText(ctx, metric, x + 10, y + 31, bw - 20, 10.5, 600);

	const sx0 = x + 10;
	const sx1 = x + bw - 10;
	const base = y + bh - 9;
	const h = bh - 50;
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(sx0, base);
	ctx.lineTo(sx1, base);
	ctx.stroke();
	const upto = Math.min(t, END);
	ctx.beginPath();
	ctx.moveTo(sx0, base);
	for (let s = 0; s <= upto; s += 50) ctx.lineTo(sx0 + ((sx1 - sx0) * s) / END, base - h * rate(s));
	ctx.lineTo(sx0 + ((sx1 - sx0) * upto) / END, base);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.beginPath();
	for (let s = 0; s <= upto; s += 50) {
		const px = sx0 + ((sx1 - sx0) * s) / END;
		const py = base - h * rate(s);
		if (s === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const cx = w / 2;
	const appW = Math.min(260, w - 24);
	const appX = cx - appW / 2;
	const appY = 8;
	const appH = 66;
	const instW = Math.min(340, w - 24);
	const instX = cx - instW / 2;
	const instY = 108;
	const instH = 92;
	const gap = 12;
	const botW = Math.min(240, (w - 24 - gap) / 2);
	const botY = 238;
	const botH = 74;
	const cluX = cx - gap / 2 - botW;
	const locX = cx + gap / 2;

	// 세 길
	const appPath: [Pt, Pt] = [
		[cx, instY - 2],
		[cx, appY + appH + 2],
	];
	const cluPath: [Pt, Pt] = [
		[cluX + botW / 2, botY - 2],
		[cx - instW / 4, instY + instH + 2],
	];
	const locPath: [Pt, Pt] = [
		[cx + instW / 4, instY + instH + 2],
		[locX + botW / 2, botY - 2],
	];
	ctx.save();
	ctx.setLineDash([3, 4]);
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	for (const [a, b] of [appPath, cluPath, locPath]) {
		ctx.beginPath();
		ctx.moveTo(a[0], a[1]);
		ctx.lineTo(b[0], b[1]);
		ctx.stroke();
	}
	ctx.restore();

	metricBox(ctx, c, appX, appY, appW, appH, "애플리케이션", "NetworkThroughput", RATE.app, t, c.green, c.greenFill, false);
	metricBox(ctx, c, cluX, botY, botW, botH, "클러스터 저장소", "StorageNetworkThroughput", RATE.cluster, t, c.blue, c.blueFill, false);
	metricBox(ctx, c, locX, botY, botW, botH, "로컬 저장소", "TempStorageThroughput", RATE.local, t, c.amber, c.amberFill, true);

	// 로컬 저장소에 쌓인 임시 파일
	const files = t >= SPILL_FROM + TRAVEL && t < CLEAR_AT ? Math.min(5, 1 + Math.floor((Math.min(t, READBACK_FROM) - SPILL_FROM - TRAVEL) / 500)) : 0;
	for (let i = 0; i < files; i++) {
		const fx = locX + botW - 18 - i * 12;
		const fy = botY + 8;
		ctx.beginPath();
		ctx.moveTo(fx, fy);
		ctx.lineTo(fx + 6, fy);
		ctx.lineTo(fx + 9, fy + 3);
		ctx.lineTo(fx + 9, fy + 12);
		ctx.lineTo(fx, fy + 12);
		ctx.closePath();
		ctx.fillStyle = c.amberFill;
		ctx.fill();
		ctx.strokeStyle = c.amber;
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	// DB 인스턴스와 정렬 작업 공간
	region(ctx, c, instX, instY, instW, instH, "DB 인스턴스", { stroke: c.blue });
	const acu = 4 + Math.round(RATE.local(t) * 4) / 2;
	pill(ctx, w, instX + instW - 38, instY + 14, `${acu} ACU`, c.blue, c.blueFill);
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("정렬 작업 공간(메모리)", cx, instY + 36);
	const slot = Math.min(20, (instW - 40) / SLOTS - 4);
	const sx = cx - (SLOTS * (slot + 4) - 4) / 2;
	const full = t >= SPILL_FROM && t < CLEAR_AT;
	for (let i = 0; i < SLOTS; i++) {
		const on = t >= FILL_FROM + i * FILL_STEP && t < CLEAR_AT;
		ctx.beginPath();
		ctx.roundRect(sx + i * (slot + 4), instY + 50, slot, slot, 3);
		ctx.fillStyle = on ? c.blueFill : "transparent";
		ctx.fill();
		ctx.strokeStyle = full ? c.amber : on ? c.blue : c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
	}
	if (full && t < RESULT_FROM) {
		ctx.font = `600 10.5px ${FONT}`;
		ctx.fillStyle = c.amber;
		ctx.fillText("가득 참", cx, instY + 50 + slot + 12);
	}

	// 길마다 오가는 것
	stream(ctx, cluPath[0], cluPath[1], t, (te) => te >= 200 && te < 7000 && (te < SPILL_FROM || te % (SPACING * 2) === 0), c.blue, 1);
	stream(ctx, locPath[0], locPath[1], t, (te) => te >= SPILL_FROM && te < READBACK_FROM, c.amber, 2);
	stream(ctx, locPath[1], locPath[0], t, (te) => te >= READBACK_FROM && te < RESULT_FROM, c.amber, 3);
	stream(ctx, appPath[0], appPath[1], t, (te, k) => te >= RESULT_FROM && te < DONE_AT - 300 && k % 3 === 0, c.green, 4);

	caption(ctx, c, captionAt(t), w, HEIGHT - 22);
}

export default function TempSpillDemo() {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={scene} label={ARIA} />;
}

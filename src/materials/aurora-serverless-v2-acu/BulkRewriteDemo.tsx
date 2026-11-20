import { legend } from "@/materials/aurora-serverless-v2-acu/scaling";
import { CanvasFigure, caption, region } from "@/materials/aws-vpc-subnet-eni/canvas";
import { clamp01, ease, FONT, lerp, palette } from "@/materials/shared";

// 많은 행을 고쳐 쓰는 작업이 페이지를 버퍼 캐시로 읽어 와 고치고 로그 레코드를 저장소로 보내는 동안,
// 메모리와 쓰기는 많은데 CPU는 낮고, ACU는 메모리를 따라 오르는 모습을 보여주는 애니메이션.
const HEIGHT = 350;
const CYCLE = 12500;
const PAGES = 24;
const COLS = 6;
const READ_FROM = 300;
const READ_TO = 4300;
const MOD_FROM = 4600;
const MOD_TO = 7600;
const FLY_MS = 600;
const LOG_MS = 900;
// 그림을 위한 가정: 평소 4GiB(2 ACU)를 쓰다가 캐시가 다 차면 24GiB(12 ACU)가 된다. 최대는 20 ACU(40GiB)다.
const BASE_GIB = 4;
const CACHE_GIB = 20;
const MAX_ACU = 20;
const ARIA =
	"위쪽 왼편은 저장소, 오른편은 writer 인스턴스의 버퍼 캐시이고, 아래쪽은 메모리, CPU, 저장소 쓰기, ACU 막대다. 먼저 고칠 행이 든 페이지가 저장소에서 버퍼 캐시로 하나씩 올라오면서 메모리가 4GiB에서 24GiB까지 늘고, ACU 막대도 같은 길이로 2에서 12 ACU까지 따라 오른다. 이어서 페이지를 하나씩 고치면 칸이 주황으로 바뀌고, 고친 내용은 로그 레코드가 되어 저장소로 내려가며 저장소 쓰기 막대가 찬다. 그동안 CPU 막대는 10% 안팎으로 낮게 머문다.";

const arriveAt = (k: number) => READ_FROM + (k * (READ_TO - READ_FROM - FLY_MS)) / (PAGES - 1);
const modifyAt = (k: number) => MOD_FROM + (k * (MOD_TO - MOD_FROM - LOG_MS)) / (PAGES - 1);

function captionAt(t: number) {
	if (t < MOD_FROM) return "① 페이지를 캐시로 읽어 오느라 메모리가 늘고, ACU가 따라 오른다";
	if (t < MOD_TO) return "② 페이지를 고치고, 고친 내용은 로그 레코드로 저장소에 보낸다";
	return "③ 메모리와 쓰기는 많았지만 CPU는 내내 낮았다";
}

// 가로 막대 하나. ratio는 0~1이다.
function meter(ctx: CanvasRenderingContext2D, c: ReturnType<typeof palette>, y: number, x0: number, x1: number, w: number, label: string, ratio: number, color: string, fill: string, value: string) {
	ctx.font = `600 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.fillText(label, 14, y);
	ctx.beginPath();
	ctx.roundRect(x0, y - 5, x1 - x0, 10, 3);
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1;
	ctx.stroke();
	const r = clamp01(ratio);
	if (r > 0) {
		ctx.beginPath();
		ctx.roundRect(x0, y - 5, (x1 - x0) * r, 10, 3);
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.stroke();
	}
	ctx.textAlign = "right";
	ctx.fillStyle = color;
	ctx.fillText(value, w - 14, y);
}

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const top = 12;
	const bottom = 186;
	const sx0 = 8;
	const sx1 = w * 0.27;
	const ix0 = w * 0.33;
	const ix1 = w - 8;
	region(ctx, c, sx0, top, sx1 - sx0, bottom - top, "클러스터 저장소");
	region(ctx, c, ix0, top, ix1 - ix0, bottom - top, "writer", { stroke: c.blue });

	// 저장소의 데이터 페이지. 읽어 가도 저장소에는 그대로 남는다.
	const sCell = Math.min(14, (sx1 - sx0 - 20) / 3 - 4);
	const sgx = (sx0 + sx1) / 2 - (3 * (sCell + 4)) / 2;
	for (let i = 0; i < 12; i++) {
		ctx.beginPath();
		ctx.roundRect(sgx + (i % 3) * (sCell + 4), top + 34 + Math.floor(i / 3) * (sCell + 4), sCell, sCell, 2);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.stroke();
	}
	const storageIn: [number, number] = [(sx0 + sx1) / 2, bottom - 34];

	// 버퍼 캐시 칸
	const cell = Math.max(10, Math.min(20, (ix1 - ix0 - 20) / COLS - 4));
	const gx = (ix0 + ix1) / 2 - (COLS * (cell + 4)) / 2;
	const gy = top + 44;
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("버퍼 캐시(메모리)", (ix0 + ix1) / 2, gy - 12);
	const cellPos = (k: number): [number, number] => [gx + (k % COLS) * (cell + 4), gy + Math.floor(k / COLS) * (cell + 4)];
	const pageFrom: [number, number] = [sx1 - 6, top + 60];

	let loaded = 0;
	let sent = 0;
	let inFlight = 0;
	for (let k = 0; k < PAGES; k++) {
		const [cx, cy] = cellPos(k);
		ctx.beginPath();
		ctx.roundRect(cx, cy, cell, cell, 3);
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();

		const a = arriveAt(k);
		if (t < a) continue;
		const p = clamp01((t - a) / FLY_MS);
		loaded += p;
		if (p < 1) {
			// 저장소에서 캐시 칸으로 올라오는 페이지
			const e = ease(p);
			ctx.beginPath();
			ctx.roundRect(lerp(pageFrom[0], cx, e), lerp(pageFrom[1], cy, e), cell, cell, 3);
			ctx.fillStyle = c.blueFill;
			ctx.fill();
			ctx.strokeStyle = c.blue;
			ctx.stroke();
			continue;
		}
		const isModified = t >= modifyAt(k);
		ctx.beginPath();
		ctx.roundRect(cx, cy, cell, cell, 3);
		ctx.fillStyle = isModified ? c.amberFill : c.blueFill;
		ctx.fill();
		ctx.strokeStyle = isModified ? c.amber : c.blue;
		ctx.stroke();

		// 고친 순간 로그 레코드 하나가 저장소로 내려간다
		const lp = (t - modifyAt(k)) / LOG_MS;
		if (lp >= 1) sent++;
		if (lp >= 0 && lp < 1) {
			inFlight++;
			const e = ease(lp);
			ctx.beginPath();
			ctx.arc(lerp(cx + cell / 2, storageIn[0], e), lerp(cy + cell / 2, storageIn[1], e), 3.5, 0, Math.PI * 2);
			ctx.fillStyle = c.amber;
			ctx.fill();
		}
	}
	ctx.font = `600 10.5px ${FONT}`;
	ctx.fillStyle = sent > 0 ? c.amber : c.sub;
	ctx.textAlign = "center";
	ctx.fillText(`받은 로그 ${sent}개`, storageIn[0], bottom - 16);

	let lx = legend(ctx, 14, 206, c.blueFill, c.text, "읽어 온 페이지", true);
	lx = legend(ctx, lx, 206, c.amberFill, c.text, "고친 페이지", true);
	ctx.beginPath();
	ctx.arc(lx + 7, 206, 3.5, 0, Math.PI * 2);
	ctx.fillStyle = c.amber;
	ctx.fill();
	ctx.font = `500 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.fillStyle = c.text;
	ctx.fillText("로그 레코드", lx + 19, 206);

	// 메모리가 캐시만큼 늘고, ACU는 메모리를 따라 오른다(1 ACU ≈ 2GiB). CPU는 고치는 동안에만 조금 오른다.
	const mem = BASE_GIB + (CACHE_GIB * loaded) / PAGES;
	const acu = Math.round(mem) / 2;
	const busy = t >= MOD_FROM && t < MOD_TO ? 1 : 0;
	const cpu = 8 + busy * (5 + 2 * Math.sin(t / 300));
	const x0 = 88;
	const x1 = w - 70;
	meter(ctx, c, 236, x0, x1, w, "메모리", mem / (MAX_ACU * 2), c.green, c.greenFill, `${Math.round(mem)} GiB`);
	meter(ctx, c, 258, x0, x1, w, "CPU", cpu / 100, c.sub, c.boxFill, `${Math.round(cpu)}%`);
	meter(ctx, c, 280, x0, x1, w, "저장소 쓰기", inFlight / 12, c.amber, c.amberFill, inFlight > 0 ? "많음" : "");
	meter(ctx, c, 302, x0, x1, w, "ACU", acu / MAX_ACU, c.blue, c.blueFill, `${acu} ACU`);

	caption(ctx, c, captionAt(t), w, HEIGHT - 22);
}

export default function BulkRewriteDemo() {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={scene} label={ARIA} />;
}

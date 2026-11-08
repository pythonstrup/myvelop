import { along, box, CanvasFigure, caption, cross, dot, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type Colors, FONT, palette } from "@/materials/shared";

// 글머리의 두 문제를 차례로 보여 주는 애니메이션.
// 위: NAT로만 밖에 나가면 NAT가 멈출 때 새 Pod가 이미지를 받지 못한다. 아래: VPC 주소 범위를 다 쓰면 넓힐 수 없다.
const HEIGHT = 416;
const A = [3200, 4400, 7400, 10400] as const;
const B0 = 10800;
const B = [3200, 5400, 8200] as const;
const CYCLE = 20500;
const PANEL_B_Y = 272;
const A_CAPTIONS = [
	"① 새 Pod를 띄우면 노드는 NAT를 거쳐 이미지를 받아 온다",
	"② NAT 게이트웨이가 멈추면",
	"③ 이미지를 이미 받은 Pod는 계속 돌지만 새 Pod는 이미지를 받지 못한다",
	"④ NAT를 거치지 않는 다른 길을 만들어 두었다면 이미지를 받는다",
];
const B_CAPTIONS = [
	"⑤ 서브넷을 자를 때마다 VPC 범위에서 주소를 떼어 간다",
	"⑥ 범위를 다 쓰면 서브넷을 더 자를 수 없다",
	"⑦ VPC를 만들 때 정한 범위는 나중에 고칠 수 없다",
];

type PodState = "none" | "pulling" | "failed" | "running";

function title(ctx: CanvasRenderingContext2D, c: Colors, text: string, y: number) {
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = `600 11.5px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(text, 10, y);
}

function podChip(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, name: string, state: PodState) {
	if (state === "none") return;
	const look = {
		pulling: [c.blue, c.blueFill, "받는 중"],
		failed: [c.red, c.redFill, "못 받음"],
		running: [c.green, c.greenFill, "실행 중"],
	} as const;
	const [stroke, fill, sub] = look[state];
	box(ctx, c, x, y, 64, 32, name, sub, stroke, fill);
}

function panelA(ctx: CanvasRenderingContext2D, c: Colors, w: number, t: number) {
	const step = A.findIndex((u) => t < u);
	const s = step === -1 ? 3 : step;
	const cx = w / 2;
	// 왼쪽 길은 프라이빗 서브넷 이름표 오른쪽으로 지나게 한다
	const leftX = Math.max(w * 0.22, 112);
	const rightX = Math.min(w * 0.78, w - 56);
	const storeW = Math.min(130, w - 2 * leftX - 24);
	const storeY = 40;
	const natW = Math.min(120, w * 0.3);
	const natY = 114;
	const nodeTop = 158;
	const podY = 190;
	const natDown = t >= A[0];
	const epOn = seg(t, A[2], A[2] + 400);

	title(ctx, c, "새 Pod가 이미지를 받는 길", 4);
	region(ctx, c, 8, 64, w - 16, 162, "VPC");
	const pubX = rightX - natW / 2 - 40;
	region(ctx, c, pubX, 80, w - 20 - pubX, 56, "퍼블릭 서브넷", { fill: c.boxFill });
	region(ctx, c, 20, 140, w - 40, 78, "프라이빗 서브넷", { fill: c.boxFill });
	region(ctx, c, 28, nodeTop, w - 56, 54, "노드");

	const viaNat: Pt[] = [
		[rightX, nodeTop],
		[rightX, natY + 16],
		[rightX, natY - 16],
		[rightX, storeY],
		[cx + storeW / 2, storeY],
	];
	const viaEp: Pt[] = [
		[leftX, nodeTop],
		[leftX, storeY],
		[cx - storeW / 2, storeY],
	];
	// NAT 상자 안은 긋지 않는다. 어두운 테마에서 상자가 비쳐 글자와 겹친다.
	path(ctx, viaNat.slice(0, 2), natDown ? c.red : c.line, natDown);
	path(ctx, viaNat.slice(2), natDown ? c.red : c.line, natDown);
	if (epOn > 0) {
		path(ctx, viaEp, c.green, true, epOn);
		pill(ctx, w, leftX, natY, "VPC 엔드포인트", c.green, c.greenFill, epOn);
	}

	box(ctx, c, cx, storeY, storeW, 30, "ECR", "VPC 밖 이미지 저장소");
	box(ctx, c, rightX, natY, natW, 32, "NAT 게이트웨이", natDown ? "멈춤" : "", natDown ? c.red : c.boxStroke, natDown ? c.redFill : c.boxFill);

	// Pod 1은 처음부터 돌고 있다. Pod 2는 ①에서, Pod 3은 ③에서 새로 뜬다.
	const pod2: PodState = t < 2900 ? "pulling" : "running";
	const pod3: PodState = t < A[1] ? "none" : t < A[1] + 1200 ? "pulling" : t < A[2] + 2400 ? "failed" : "running";
	podChip(ctx, c, cx - 72, podY, "Pod 1", "running");
	podChip(ctx, c, cx, podY, "Pod 2", pod2);
	podChip(ctx, c, cx + 72, podY, "Pod 3", pod3);

	if (s === 0) {
		if (t < 1500) {
			const [x, y] = along(viaNat, seg(t, 300, 1500));
			dot(ctx, x, y, c.blue);
		} else if (t < 2900) {
			const [x, y] = along([...viaNat].reverse(), seg(t, 1700, 2900));
			pill(ctx, w, x, y, "이미지", c.green, c.greenFill);
		}
	} else if (s === 2) {
		const p = seg(t, A[1] + 200, A[1] + 1200);
		if (p < 1) {
			const [x, y] = along(viaNat.slice(0, 2), p);
			dot(ctx, x, y, c.blue);
		} else cross(ctx, rightX, natY + 27, c.red);
	} else if (s === 3) {
		cross(ctx, rightX, natY + 27, c.red);
		if (t < A[2] + 1400) {
			const [x, y] = along(viaEp, seg(t, A[2] + 400, A[2] + 1400));
			dot(ctx, x, y, c.blue);
		} else if (t < A[2] + 2400) {
			const [x, y] = along([...viaEp].reverse(), seg(t, A[2] + 1400, A[2] + 2400));
			pill(ctx, w, x, y, "이미지", c.green, c.greenFill);
		}
	}

	caption(ctx, c, A_CAPTIONS[s], w, 244);
}

function panelB(ctx: CanvasRenderingContext2D, c: Colors, w: number, t: number) {
	const u = t - B0;
	const step = B.findIndex((v) => u < v);
	const s = step === -1 ? 2 : step;
	const cx = w / 2;
	const y0 = PANEL_B_Y;
	// 범위를 넓히려다 되돌아가는 몸짓. 오른쪽 14px은 그 여유다.
	const stretch = Math.sin(seg(u, B[1], B[1] + 900) * Math.PI) * 14;
	const blocked = u >= B[1];
	const vw = w - 30 + stretch;

	title(ctx, c, "VPC 주소 범위", y0 + 4);
	region(ctx, c, 8, y0 + 24, vw, 64, "VPC 10.0.0.0/16", blocked ? { stroke: c.red } : {});

	const gap = 4;
	const bw = (w - 30 - 16 - gap * 3) / 4;
	for (let i = 0; i < 4; i++) {
		const a = seg(u, i * 800, i * 800 + 500);
		if (a <= 0) continue;
		ctx.save();
		ctx.globalAlpha = a;
		box(ctx, c, 16 + bw / 2 + i * (bw + gap), y0 + 62, bw, 36, `서브넷 ${i + 1}`, "", c.blue, c.blueFill);
		ctx.restore();
	}

	if (s === 1) pill(ctx, w, cx, y0 + 106, "서브넷 5: 남은 주소 없음", c.red, c.redFill, seg(u, B[0], B[0] + 300));
	if (s === 2) {
		const a = seg(u, B[1] + 900, B[1] + 1200);
		pill(ctx, w, cx, y0 + 106, "범위 넓히기: 고칠 수 없음", c.red, c.redFill, a);
		if (stretch > 0) cross(ctx, w - 12, y0 + 56, c.red);
	}

	caption(ctx, c, B_CAPTIONS[s], w, y0 + 126);
}

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	panelA(ctx, c, w, t);
	ctx.beginPath();
	ctx.moveTo(8, PANEL_B_Y - 8);
	ctx.lineTo(w - 8, PANEL_B_Y - 8);
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.stroke();
	// 아래 판은 위 판이 끝날 때까지 흐리게 기다린다.
	ctx.save();
	ctx.globalAlpha = t < B0 ? 0.35 : 1;
	panelB(ctx, c, w, Math.max(t, B0));
	ctx.restore();
}

export default function PitfallsDemo() {
	return (
		<CanvasFigure
			height={HEIGHT}
			cycle={CYCLE}
			scene={scene}
			label="두 장면을 차례로 보여 주는 애니메이션. 위 장면은 프라이빗 서브넷의 노드가 퍼블릭 서브넷의 NAT 게이트웨이를 거쳐 VPC 밖의 ECR에서 이미지를 받아 새 Pod를 띄운다. NAT 게이트웨이가 멈추면 이미 뜬 Pod는 계속 돌지만 새 Pod는 이미지를 받지 못한다. NAT를 거치지 않는 VPC 엔드포인트 길을 만들어 두면 새 Pod도 이미지를 받는다. 아래 장면은 10.0.0.0/16 VPC 범위를 서브넷 네 개가 다 채워 다섯 번째 서브넷을 자를 자리가 없고, 범위를 넓히려 해도 고칠 수 없다는 것을 보여 준다."
		/>
	);
}

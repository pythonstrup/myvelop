import { along, box, CanvasFigure, caption, cross, dot, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type Colors, FONT, palette } from "@/materials/shared";

// NAT 하나를 두 가용 영역이 같이 쓸 때와 영역마다 둘 때, 가용 영역 a 장애가 어떻게 번지는지 견주는 애니메이션.
const HEIGHT = 372;
const FAIL = 4000;
const RESULT = 5200;
const CYCLE = 9000;
const PANEL_H = 160;
const LABELS = {
	ko: {
		shared: "NAT 하나를 같이 쓸 때",
		perAz: "가용 영역마다 NAT를 둘 때",
		internet: "인터넷",
		azA: "가용 영역 a",
		azB: "가용 영역 b",
		failure: "장애",
		nat: "NAT 게이트웨이",
		nodeA: "노드 a",
		nodeB: "노드 b",
		cut: "나갈 길이 끊김",
		captions: ["① 평소에는 두 방식 모두 잘 나간다", "② 가용 영역 a에 장애가 나면", "③ 같이 쓰면 b도 끊기고, 영역마다 두면 b는 그대로 나간다"],
		aria: "가용 영역 a와 b에 노드가 하나씩 있는 VPC 두 개를 위아래로 견주는 애니메이션. 위쪽은 가용 영역 a의 NAT 게이트웨이 하나를 두 노드가 같이 쓰고, 아래쪽은 영역마다 NAT 게이트웨이를 하나씩 둔다. 가용 영역 a에 장애가 나면 위쪽은 노드 b도 나갈 길이 끊기고, 아래쪽 노드 b는 자기 영역의 NAT로 그대로 나간다.",
	},
	en: {
		shared: "When both zones share one NAT",
		perAz: "With a NAT in each Availability Zone",
		internet: "Internet",
		azA: "Zone a",
		azB: "Zone b",
		failure: "Failure",
		nat: "NAT gateway",
		nodeA: "Node a",
		nodeB: "Node b",
		cut: "No way out",
		captions: ["① Normally, both setups reach the outside", "② When Availability Zone a fails", "③ With a shared NAT, b is cut off too. With one per zone, b keeps going out"],
		aria: "An animation comparing two VPCs, one above the other, each with a node in Availability Zones a and b. In the top one, both nodes share a single NAT gateway in zone a. In the bottom one, each zone has its own NAT gateway. When zone a fails, node b in the top VPC loses its way out, while node b in the bottom VPC keeps going out through the NAT in its own zone.",
	},
};
type Lang = keyof typeof LABELS;

function panel(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, c: Colors, w: number, t: number, py: number, shared: boolean) {
	const down = seg(t, FAIL, FAIL + 400);
	const azW = (w - 16) / 2 - 4;
	const ax = 8 + azW / 2;
	const bx = w / 2 + 4 + azW / 2;
	const bw = Math.min(110, azW - 24);
	const natY = py + 88;
	const nodeY = py + 132;
	const netY = py + 44;

	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = `600 11.5px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(shared ? L.shared : L.perAz, 10, py + 4);

	ctx.beginPath();
	ctx.roundRect(8, py + 24, w - 16, 20, 6);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(L.internet, w / 2, py + 34);

	region(ctx, c, 8, py + 52, azW, 104, L.azA, down > 0 ? { stroke: c.red, fill: c.redFill } : {});
	region(ctx, c, w / 2 + 4, py + 52, azW, 104, L.azB);
	if (down > 0) pill(ctx, w, 8 + azW - 26, py + 60, L.failure, c.red, c.redFill, down);

	const pathA: Pt[] = [[ax, nodeY - 15], [ax, natY - 15], [ax, netY]];
	const pathB: Pt[] = shared
		? [[bx, nodeY - 15], [ax + bw / 2, natY + 4], [ax, natY - 15], [ax, netY]]
		: [[bx, nodeY - 15], [bx, natY - 15], [bx, netY]];
	const bCut = shared && t >= RESULT;
	path(ctx, pathA, c.line, false, 1 - down * 0.6);
	path(ctx, pathB, bCut ? c.red : c.line, bCut);

	// 장애가 난 영역의 NAT와 노드는 흐리게 그린다
	ctx.save();
	ctx.globalAlpha = 1 - down * 0.6;
	box(ctx, c, ax, natY, bw, 30, L.nat);
	box(ctx, c, ax, nodeY, bw, 30, L.nodeA);
	ctx.restore();
	if (!shared) box(ctx, c, bx, natY, bw, 30, L.nat, "", t >= RESULT ? c.green : c.boxStroke);
	box(ctx, c, bx, nodeY, bw, 30, L.nodeB, "", t < RESULT ? c.boxStroke : bCut ? c.red : c.green);

	// 밖으로 흐르는 패킷
	for (let j = 0; j < 2; j++) {
		const phase = (t / 1600 + j / 2) % 1;
		if (t < FAIL) {
			const [x, y] = along(pathA, phase, false);
			dot(ctx, x, y, c.blue, 4);
		}
		if (t < FAIL || (!shared && t >= RESULT)) {
			const [x, y] = along(pathB, phase, false);
			dot(ctx, x, y, t < FAIL ? c.blue : c.green, 4);
		}
	}
	if (bCut) {
		cross(ctx, ax + bw / 2 + 10, natY + 2, c.red);
		pill(ctx, w, bx, natY, L.cut, c.red, c.redFill);
	}
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	panel(L, ctx, c, w, t, 0, true);
	panel(L, ctx, c, w, t, PANEL_H + 8, false);
	caption(ctx, c, L.captions[t < FAIL ? 0 : t < RESULT ? 1 : 2], w, HEIGHT - 22);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function NatZoneDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

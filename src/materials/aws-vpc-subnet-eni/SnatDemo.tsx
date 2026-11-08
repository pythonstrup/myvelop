import { along, box, CanvasFigure, caption, dot, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { FONT, palette } from "@/materials/shared";

// Pod에서 나간 패킷의 출발 주소가 노드와 NAT 게이트웨이를 지날 때 바뀌고, 응답이 거꾸로 되돌아오는 애니메이션.
// VPC › 가용 영역 › 서브넷 › EC2 노드 › Pod 순으로 겹친 구성 위에서 패킷이 위로 올라갔다가 내려온다.
const HEIGHT = 404;
// 구간마다: 끝 시각, 출발·도착 지점(0 Pod, 1 노드 ENI, 2 NAT, 3 바깥 서버), 패킷에 붙은 주소, 설명 번호, 주소를 바꾸는 지점
type Leg = { end: number; from: number; to: number; label: string; cap: number; mark?: number };
const LEGS: Leg[] = [
	{ end: 600, from: 0, to: 0, label: "출발 10.0.10.25", cap: 0 },
	{ end: 1600, from: 0, to: 1, label: "출발 10.0.10.25", cap: 0 },
	{ end: 1900, from: 1, to: 1, label: "출발 10.0.10.25", cap: 1, mark: 1 },
	{ end: 2800, from: 1, to: 1, label: "출발 10.0.10.7", cap: 1, mark: 1 },
	{ end: 3800, from: 1, to: 2, label: "출발 10.0.10.7", cap: 1 },
	{ end: 4100, from: 2, to: 2, label: "출발 10.0.10.7", cap: 2, mark: 2 },
	{ end: 5000, from: 2, to: 2, label: "출발 203.0.113.10", cap: 2, mark: 2 },
	{ end: 6200, from: 2, to: 3, label: "출발 203.0.113.10", cap: 2 },
	{ end: 7600, from: 3, to: 3, label: "출발 203.0.113.10", cap: 3, mark: 3 },
	{ end: 8800, from: 3, to: 2, label: "도착 203.0.113.10", cap: 4 },
	{ end: 9300, from: 2, to: 2, label: "도착 10.0.10.7", cap: 4, mark: 2 },
	{ end: 10300, from: 2, to: 1, label: "도착 10.0.10.7", cap: 4 },
	{ end: 10800, from: 1, to: 1, label: "도착 10.0.10.25", cap: 4, mark: 1 },
	{ end: 11800, from: 1, to: 0, label: "도착 10.0.10.25", cap: 4 },
	{ end: 13000, from: 0, to: 0, label: "도착 10.0.10.25", cap: 5 },
];
const CYCLE = LEGS[LEGS.length - 1].end;
const MARKS = ["", "VPC CNI가 바꿈", "NAT가 바꿈", "로그: 203.0.113.10"];
const CAPTIONS = [
	"① 패킷의 출발 주소는 Pod IP다",
	"② 노드를 떠날 때 VPC CNI가 노드의 주 IP로 바꾼다",
	"③ NAT 게이트웨이를 떠날 때 NAT의 공인 IP로 바뀐다",
	"④ 상대 서버의 로그에는 NAT의 공인 IP가 찍힌다",
	"⑤ 응답은 바꿨던 주소를 거꾸로 되돌리며 돌아온다",
	"⑥ 응답이 Pod까지 돌아왔다",
];

// 세로 배치(위에서 아래로)
const API_Y = 30;
const VPC_Y = 100;
const NAT_Y = 190;
const NODE_Y = 256;
const POD_Y = 306;
const BOX_H = 36;

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const i = LEGS.findIndex((l) => t < l.end);
	const leg = LEGS[i];
	const begin = i === 0 ? 0 : LEGS[i - 1].end;
	const back = leg.label.startsWith("도착");
	const done = leg.cap === 5;

	// 오른쪽에 주소 이름표가 다닐 자리를 남기고 가운데 줄에 상자를 세운다
	const x = Math.min(w / 2, w - 190);
	const lane = Math.min(x + 130, w - 62);
	const bw = Math.min(170, w * 0.4);
	const top = (y: number) => y - BOX_H / 2;
	const bottom = (y: number) => y + BOX_H / 2;

	region(ctx, c, 8, VPC_Y, w - 16, 262, "VPC 10.0.0.0/16");
	region(ctx, c, 16, 124, w - 32, 230, "가용 영역 a", { dashed: true });
	region(ctx, c, 28, 146, w - 56, 72, "퍼블릭 서브넷 10.0.0.0/24", { stroke: c.green, fill: c.boxFill });
	region(ctx, c, 28, 228, w - 56, 118, "프라이빗 서브넷 10.0.10.0/24", { stroke: c.blue, fill: c.boxFill });
	region(ctx, c, 40, NODE_Y, w - 80, 82, "EKS 노드 (EC2)");

	// 상자 사이의 선. 상자 안은 지나가지 않는다.
	const gaps: [number, number][] = [
		[bottom(API_Y), VPC_Y - 14],
		[VPC_Y + 14, NAT_Y - 20],
		[NAT_Y + 20, NODE_Y],
		[NODE_Y, top(POD_Y)],
	];
	for (const [a, b] of gaps)
		path(ctx, [
			[x, a],
			[x, b],
		], c.line);
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText("인터넷", x - 8, (bottom(API_Y) + VPC_Y - 14) / 2);

	// 패킷이 멈추는 지점: Pod 위, 노드 ENI, NAT 위, 바깥 서버 아래. 점이 상자에 가리지 않게 조금 띄운다.
	const stops = [top(POD_Y) - 7, NODE_Y, NAT_Y - 27, bottom(API_Y) + 7];
	const pts: Pt[] = [
		[x, stops[leg.from]],
		[x, stops[leg.to]],
	];
	const [, py] = along(pts, seg(t, begin, leg.end));
	// 상자 안을 지나는 동안은 점을 감춘다
	const inside = (y: number, h: number) => py > y - h / 2 + 2 && py < y + h / 2 - 2;
	const hidden = inside(API_Y, BOX_H) || inside(VPC_Y, 28) || inside(NAT_Y, 40) || inside(NODE_Y, 18) || inside(POD_Y, BOX_H);
	const color = back ? c.green : c.blue;
	if (!hidden) dot(ctx, x, py, color);

	const marked = (k: number) => leg.mark === k;
	// 경계선과 길 위에 올라가는 것은 어두운 테마에서도 뒤가 비치지 않게 불투명하게 칠한다
	const solid = dark ? "#212529" : "#f1f3f5";
	box(ctx, c, x, API_Y, bw, BOX_H, "바깥 API 서버", "다른 회사", marked(3) ? c.amber : c.boxStroke);
	box(ctx, c, x, VPC_Y, bw, 28, "인터넷 게이트웨이", "", c.boxStroke, solid);
	box(ctx, c, x, NAT_Y, bw, 40, "NAT 게이트웨이", "Elastic IP 203.0.113.10", marked(2) ? c.amber : c.boxStroke);
	box(ctx, c, x, POD_Y, 110, BOX_H, "Pod", "10.0.10.25", done ? c.green : c.boxStroke);
	box(ctx, c, x - 92, POD_Y, 62, BOX_H, "VPC CNI", "", marked(1) ? c.amber : c.boxStroke);
	pill(ctx, w, x, NODE_Y, "ENI 10.0.10.7", c.sub, solid);
	if (marked(1)) pill(ctx, w, x, NODE_Y, "ENI 10.0.10.7", c.amber, c.amberFill);

	pill(ctx, w, lane, py, leg.label, color, solid);
	pill(ctx, w, lane, py, leg.label, color, back ? c.greenFill : c.blueFill);
	if (leg.mark !== undefined) {
		const note = back ? "되돌림" : MARKS[leg.mark];
		pill(ctx, w, lane, py + 22, note, c.amber, solid);
		pill(ctx, w, lane, py + 22, note, c.amber, c.amberFill);
	}

	caption(ctx, c, CAPTIONS[leg.cap], w, HEIGHT - 20);
}

export default function SnatDemo() {
	return (
		<CanvasFigure
			height={HEIGHT}
			cycle={CYCLE}
			scene={scene}
			label="VPC 10.0.0.0/16 안 가용 영역 a에 퍼블릭 서브넷과 프라이빗 서브넷이 있다. 프라이빗 서브넷의 EKS 노드(EC2)에는 ENI 10.0.10.7이 붙어 있고 그 안에서 VPC CNI와 Pod 10.0.10.25가 돈다. 퍼블릭 서브넷에는 Elastic IP 203.0.113.10을 붙인 NAT 게이트웨이가 있고, VPC 위쪽 경계에 인터넷 게이트웨이, 그 밖 인터넷에 바깥 API 서버가 있다. Pod가 보낸 패킷은 노드를 떠날 때 VPC CNI가 출발 주소를 노드의 주 IP로 바꾸고, NAT 게이트웨이를 떠날 때 NAT의 공인 IP로 바뀐 뒤 인터넷 게이트웨이를 지나 바깥 서버에 닿는다. 바깥 서버의 로그에는 203.0.113.10이 찍힌다. 응답은 NAT와 노드가 주소를 거꾸로 되돌리며 Pod까지 돌아온다."
		/>
	);
}

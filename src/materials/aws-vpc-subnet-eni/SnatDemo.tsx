import { box, CanvasFigure, caption, dot, path, pill, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { ease, lerp, palette } from "@/materials/shared";

// Pod에서 나간 패킷의 출발 주소가 노드와 NAT 게이트웨이를 지날 때 바뀌고, 응답이 거꾸로 되돌아오는 애니메이션.
const HEIGHT = 200;
// 구간마다: 끝 시각, 출발·도착 상자, 패킷에 붙은 주소, 설명 번호, 주소를 바꾸는 상자
type Leg = { end: number; from: number; to: number; label: string; cap: number; mark?: number };
const LEGS: Leg[] = [
	{ end: 600, from: 0, to: 0, label: "출발 10.0.10.25", cap: 0 },
	{ end: 1600, from: 0, to: 1, label: "출발 10.0.10.25", cap: 0 },
	{ end: 1900, from: 1, to: 1, label: "출발 10.0.10.25", cap: 1, mark: 1 },
	{ end: 2800, from: 1, to: 1, label: "출발 10.0.10.7", cap: 1, mark: 1 },
	{ end: 3800, from: 1, to: 2, label: "출발 10.0.10.7", cap: 1 },
	{ end: 4100, from: 2, to: 2, label: "출발 10.0.10.7", cap: 2, mark: 2 },
	{ end: 5000, from: 2, to: 2, label: "출발 203.0.113.10", cap: 2, mark: 2 },
	{ end: 6000, from: 2, to: 3, label: "출발 203.0.113.10", cap: 2 },
	{ end: 7400, from: 3, to: 3, label: "출발 203.0.113.10", cap: 3, mark: 3 },
	{ end: 8400, from: 3, to: 2, label: "도착 203.0.113.10", cap: 4 },
	{ end: 8900, from: 2, to: 2, label: "도착 10.0.10.7", cap: 4, mark: 2 },
	{ end: 9900, from: 2, to: 1, label: "도착 10.0.10.7", cap: 4 },
	{ end: 10400, from: 1, to: 1, label: "도착 10.0.10.25", cap: 4, mark: 1 },
	{ end: 11400, from: 1, to: 0, label: "도착 10.0.10.25", cap: 4 },
	{ end: 12600, from: 0, to: 0, label: "도착 10.0.10.25", cap: 5 },
];
const CYCLE = LEGS[LEGS.length - 1].end;
const BOXES = [
	{ title: "Pod", sub: "10.0.10.25" },
	{ title: "노드", sub: "10.0.10.7" },
	{ title: "NAT", sub: "203.0.113.10" },
	{ title: "바깥 API", sub: "서버" },
];
const MARKS = ["", "VPC CNI가 바꿈", "NAT가 바꿈", "로그: 203.0.113.10"];
const CAPTIONS = [
	"① 패킷의 출발 주소는 Pod IP다",
	"② 노드를 떠날 때 VPC CNI가 노드의 주 IP로 바꾼다",
	"③ NAT 게이트웨이를 떠날 때 NAT의 공인 IP로 바뀐다",
	"④ 상대 서버의 로그에는 NAT의 공인 IP가 찍힌다",
	"⑤ 응답은 바꿨던 주소를 거꾸로 되돌리며 돌아온다",
	"⑥ 응답이 Pod까지 돌아왔다",
];

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const i = LEGS.findIndex((l) => t < l.end);
	const leg = LEGS[i];
	const begin = i === 0 ? 0 : LEGS[i - 1].end;
	const back = leg.label.startsWith("도착");

	const margin = 8;
	const boxW = Math.min(112, (w - margin * 2) / 4 - 10);
	const boxH = 44;
	const cy = 96;
	const xs = [0, 1, 2, 3].map((k) => margin + boxW / 2 + k * ((w - margin * 2 - boxW) / 3));

	for (let k = 0; k < 3; k++)
		path(ctx, [
			[xs[k] + boxW / 2 + 4, cy],
			[xs[k + 1] - boxW / 2 - 4, cy],
		], c.line);

	BOXES.forEach((b, k) => {
		const marked = leg.mark === k;
		const arrived = k === 0 && leg.cap === 5;
		box(ctx, c, xs[k], cy, boxW, boxH, b.title, b.sub, marked ? c.amber : arrived ? c.green : c.boxStroke);
		if (marked) pill(ctx, w, xs[k], cy + boxH / 2 + 16, back ? "되돌림" : MARKS[k], c.amber, c.amberFill);
	});

	const x = lerp(xs[leg.from], xs[leg.to], ease(seg(t, begin, leg.end)));
	const color = back ? c.green : c.blue;
	dot(ctx, x, cy - boxH / 2 - 6, color);
	pill(ctx, w, x, cy - boxH / 2 - 26, leg.label, color, back ? c.greenFill : c.blueFill);

	caption(ctx, c, CAPTIONS[leg.cap], w, HEIGHT - 22);
}

export default function SnatDemo() {
	return (
		<CanvasFigure
			height={HEIGHT}
			cycle={CYCLE}
			scene={scene}
			label="Pod 10.0.10.25, 노드 10.0.10.7, NAT 게이트웨이 203.0.113.10, 바깥 API 서버를 차례로 놓고 패킷 하나를 보내는 애니메이션. 패킷의 출발 주소는 처음에 Pod IP이고, 노드를 떠날 때 VPC CNI가 노드의 주 IP로 바꾸고, NAT 게이트웨이를 떠날 때 NAT의 공인 IP로 바뀐다. 바깥 서버의 로그에는 203.0.113.10이 찍힌다. 응답은 NAT와 노드가 주소를 거꾸로 되돌리며 Pod까지 돌아온다."
		/>
	);
}

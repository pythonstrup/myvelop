import { along, box, CanvasFigure, caption, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type Colors, FONT, palette } from "@/materials/shared";

// 노드가 이미지를 받을 때 목록(ECR)과 층 파일(S3)이 어느 길로 오는지, 엔드포인트를 하나씩 붙이며 견주는 애니메이션.
// 엔드포인트는 AWS 서비스로 가는 길이라 외부 요청은 끝까지 NAT로 나간다.
const HEIGHT = 332;
const PHASE_START = [0, 5400, 11400] as const;
const CYCLE = 18800;
// 내려받는 것: 출발 시각(각 단계 안에서), 크기 비율, 층 파일인지
const ITEMS = [
	{ at: 300, size: 0.04, layer: false },
	{ at: 1500, size: 0.32, layer: true },
	{ at: 2000, size: 0.32, layer: true },
	{ at: 2500, size: 0.32, layer: true },
] as const;
const TRIP = 1400;
// 마지막 단계에서 이미지를 다 받은 뒤 외부 요청이 나가는 시각
const EXTERNAL_AT = 5000;
const CAPTIONS = [
	"① 엔드포인트가 없으면 목록도 층 파일도 NAT를 지난다",
	"② S3 게이트웨이 엔드포인트를 붙이면",
	"③ 층 파일은 엔드포인트로 오고, NAT에는 목록만 지난다",
	"④ ECR 인터페이스 엔드포인트까지 붙이면",
	"⑤ 목록도 엔드포인트로 오고, 이미지는 NAT를 지나지 않는다",
	"⑥ 외부 요청은 그대로 NAT로 나간다",
];

function drawItem(ctx: CanvasRenderingContext2D, c: Colors, [x, y]: Pt, layer: boolean) {
	const s = layer ? 16 : 10;
	ctx.beginPath();
	ctx.roundRect(x - s / 2, y - s / 2, s, s, 3);
	ctx.fillStyle = layer ? c.blueFill : c.amberFill;
	ctx.fill();
	ctx.strokeStyle = layer ? c.blue : c.amber;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	ctx.font = `500 9.5px ${FONT}`;
	ctx.fillStyle = layer ? c.blue : c.amber;
	ctx.fillText(layer ? "층" : "목록", x, y - s / 2 - 2);
}

function captionIndex(phase: number, u: number) {
	if (phase === 0) return 0;
	if (phase === 1) return u < 900 ? 1 : 2;
	if (u < 900) return 3;
	return u < EXTERNAL_AT ? 4 : 5;
}

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const phase = t < PHASE_START[1] ? 0 : t < PHASE_START[2] ? 1 : 2;
	const u = t - PHASE_START[phase];
	// 엔드포인트가 나타난 뒤에 받기 시작한다
	const lag = phase === 0 ? 0 : 800;
	const s3On = phase === 0 ? 0 : phase === 1 ? seg(u, 0, 600) : 1;
	const ecrOn = phase === 2 ? seg(u, 0, 600) : 0;
	const external = phase === 2 ? seg(u, EXTERNAL_AT, EXTERNAL_AT + TRIP) : 0;

	const bw = Math.min(100, w * 0.24);
	const bh = 40;
	const nodeX = 8 + bw / 2 + 4;
	const midX = w * 0.43;
	const outX = w - 8 - bw / 2;
	const natY = 72;
	const ecrY = 138;
	const s3Y = 204;
	const nodeY = ecrY;
	const midL = midX - bw / 2;
	const midR = midX + bw / 2;
	const outL = outX - bw / 2;
	const nodeTop: Pt = [nodeX, nodeY - bh / 2];
	const nodeBottom: Pt = [nodeX, nodeY + bh / 2];
	const nodeRight: Pt = [nodeX + bw / 2, nodeY];

	region(ctx, c, 6, 28, w * 0.62, 226, "VPC", { dashed: true });

	const natToNode: Pt[] = [[midL, natY], [nodeX, natY], nodeTop];
	const viaNatEcr: Pt[] = [[outL, ecrY], [midR, natY], ...natToNode];
	const viaNatS3: Pt[] = [[outL, s3Y], [midR, natY], ...natToNode];
	const viaEpEcr: Pt[] = [[outL, ecrY], [midR, ecrY], [midL, ecrY], nodeRight];
	const viaEpS3: Pt[] = [[outL, s3Y], [midR, s3Y], [midL, s3Y], [nodeX, s3Y], nodeBottom];
	const toExternal: Pt[] = [nodeTop, [nodeX, natY], [midL, natY], [midR, natY], [outL, natY]];

	path(ctx, natToNode, external > 0 ? c.blue : c.line);
	path(ctx, [[midR, natY], [outL, natY]], external > 0 ? c.blue : c.line);
	path(ctx, [[outL, ecrY], [midR, natY]], c.line, ecrOn > 0, ecrOn > 0 ? 0.35 : 1);
	path(ctx, [[outL, s3Y], [midR, natY]], c.line, s3On > 0, s3On > 0 ? 0.35 : 1);
	if (s3On > 0) {
		path(ctx, [[outL, s3Y], [midR, s3Y]], c.green, false, s3On);
		path(ctx, [[midL, s3Y], [nodeX, s3Y], nodeBottom], c.green, false, s3On);
	}
	if (ecrOn > 0) {
		path(ctx, [[outL, ecrY], [midR, ecrY]], c.green, false, ecrOn);
		path(ctx, [[midL, ecrY], nodeRight], c.green, false, ecrOn);
	}

	box(ctx, c, nodeX, nodeY, bw, bh, "노드", "이미지 받는 중");
	box(ctx, c, midX, natY, bw, bh, "NAT", "게이트웨이", external > 0 ? c.blue : c.boxStroke);
	box(ctx, c, outX, natY, bw, bh, "외부 서비스", "인터넷", external >= 1 ? c.blue : c.boxStroke);
	box(ctx, c, outX, ecrY, bw, bh, "ECR", "이미지 목록");
	box(ctx, c, outX, s3Y, bw, bh, "S3", "층 파일");
	ctx.save();
	ctx.globalAlpha = s3On;
	box(ctx, c, midX, s3Y, bw, bh, "엔드포인트", "S3 게이트웨이", c.green);
	ctx.restore();
	ctx.save();
	ctx.globalAlpha = ecrOn;
	box(ctx, c, midX, ecrY, bw, bh, "엔드포인트", "ECR 인터페이스", c.green);
	ctx.restore();
	pill(ctx, w, midX, s3Y + bh / 2 + 14, "S3 주소 → 엔드포인트", c.green, c.greenFill, phase === 0 ? 0 : phase === 1 ? seg(u, 300, 900) : 1);
	pill(ctx, w, midX, ecrY + bh / 2 + 13, "ecr.api · ecr.dkr", c.green, c.greenFill, phase === 2 ? seg(u, 300, 900) : 0);

	// NAT를 지난 이미지 용량 막대
	let passed = 0;
	for (const it of ITEMS) {
		const p = seg(u, it.at + lag, it.at + lag + TRIP);
		const viaEndpoint = it.layer ? phase >= 1 : phase === 2;
		// 엔드포인트로 오는 것은 NAT 막대에 더하지 않는다
		if (!viaEndpoint) passed += it.size * p;
		const route = it.layer ? (viaEndpoint ? viaEpS3 : viaNatS3) : viaEndpoint ? viaEpEcr : viaNatEcr;
		if (p > 0 && p < 1) drawItem(ctx, c, along(route, p), it.layer);
	}

	// 외부 요청은 NAT로 나가 도착한 뒤 NAT와 외부 서비스 사이에 남는다. 어두운 테마에서 선이 비치지 않게 바닥을 칠한다.
	if (external > 0) {
		const [x, y] = external < 1 ? along(toExternal, external) : [(midR + outL) / 2, natY];
		pill(ctx, w, x, y, "외부 요청", c.blue, dark ? "#212529" : "#f1f3f5");
		pill(ctx, w, x, y, "외부 요청", c.blue, c.blueFill);
	}

	const barY = 276;
	const barLabel = "NAT를 지난 이미지 용량";
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(barLabel, 8, barY);
	const barX = 8 + ctx.measureText(barLabel).width + 10;
	const barW = w - 8 - barX;
	ctx.beginPath();
	ctx.roundRect(barX, barY - 6, barW, 12, 3);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(barX, barY - 6, Math.max(2, barW * passed), 12, 3);
	ctx.fillStyle = c.amber;
	ctx.fill();

	caption(ctx, c, CAPTIONS[captionIndex(phase, u)], w, HEIGHT - 22);
}

export default function ImagePullDemo() {
	return (
		<CanvasFigure
			height={HEIGHT}
			cycle={CYCLE}
			scene={scene}
			label="프라이빗 서브넷의 노드가 컨테이너 이미지를 받는 길을 세 번 보여 주는 애니메이션. 처음에는 ECR에서 오는 이미지 목록과 S3에서 오는 층 파일이 모두 NAT 게이트웨이를 지나, 아래 막대의 NAT를 지난 이미지 용량이 거의 가득 찬다. S3 게이트웨이 엔드포인트를 붙이면 층 파일이 엔드포인트로 바로 오고, NAT에는 작은 목록만 지나 막대가 조금만 찬다. ECR 인터페이스 엔드포인트까지 붙이면 목록도 엔드포인트로 와서 이미지는 NAT를 지나지 않는다. 마지막으로 외부 서비스로 가는 요청은 엔드포인트가 아니라 그대로 NAT 게이트웨이로 나간다."
		/>
	);
}

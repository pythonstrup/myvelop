import { along, box, CanvasFigure, caption, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type Colors, FONT, palette } from "@/materials/shared";

// 노드가 이미지를 받을 때 목록(ECR)과 층 파일(S3)이 어느 길로 오는지, S3 게이트웨이 엔드포인트 전후를 견주는 애니메이션.
const HEIGHT = 300;
const PHASE2 = 5400;
const CYCLE = 11400;
// 내려받는 것: 출발 시각(각 단계 안에서), 크기 비율, 층 파일인지
const ITEMS = [
	{ at: 300, size: 0.04, layer: false },
	{ at: 1500, size: 0.32, layer: true },
	{ at: 2000, size: 0.32, layer: true },
	{ at: 2500, size: 0.32, layer: true },
] as const;
const TRIP = 1400;
const CAPTIONS = [
	"① 엔드포인트가 없으면 목록도 층 파일도 NAT를 지난다",
	"② S3 게이트웨이 엔드포인트를 붙이면",
	"③ 층 파일은 엔드포인트로 오고, NAT에는 목록만 지난다",
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

function scene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const second = t >= PHASE2;
	const u = second ? t - PHASE2 : t;
	// 2단계는 엔드포인트가 나타난 뒤에 받기 시작한다
	const lag = second ? 800 : 0;

	const bw = Math.min(100, w * 0.24);
	const bh = 40;
	const nodeX = 8 + bw / 2 + 4;
	const midX = w * 0.43;
	const outX = w - 8 - bw / 2;
	const topY = 84;
	const nodeY = 136;
	const botY = 188;

	region(ctx, c, 8 - 2, 44, w * 0.62, 176, "VPC", { dashed: true });

	const node: Pt[] = [[nodeX + bw / 2, nodeY]];
	const viaNatEcr: Pt[] = [[outX - bw / 2, topY], [midX + bw / 2, topY], [midX - bw / 2, topY], ...node];
	const viaNatS3: Pt[] = [[outX - bw / 2, botY], [midX + bw / 2, topY], [midX - bw / 2, topY], ...node];
	const viaEp: Pt[] = [[outX - bw / 2, botY], [midX + bw / 2, botY], [midX - bw / 2, botY], ...node];

	path(ctx, [viaNatEcr[0], viaNatEcr[1]], c.line);
	path(ctx, [viaNatEcr[2], viaNatEcr[3]], c.line);
	path(ctx, [viaNatS3[0], viaNatS3[1]], c.line, second, second ? 0.35 : 1);
	const ep = seg(u, 0, 600);
	if (second) {
		path(ctx, [viaEp[0], viaEp[1]], c.green, false, ep);
		path(ctx, [viaEp[2], viaEp[3]], c.green, false, ep);
	}

	box(ctx, c, nodeX, nodeY, bw, bh, "노드", "이미지 받는 중");
	box(ctx, c, midX, topY, bw, bh, "NAT", "게이트웨이");
	box(ctx, c, outX, topY, bw, bh, "ECR", "이미지 목록");
	box(ctx, c, outX, botY, bw, bh, "S3", "층 파일");
	if (second) {
		ctx.save();
		ctx.globalAlpha = ep;
		box(ctx, c, midX, botY, bw, bh, "엔드포인트", "S3 게이트웨이", c.green);
		ctx.restore();
		pill(ctx, w, midX, botY + bh / 2 + 14, "S3 주소 → 엔드포인트", c.green, c.greenFill, seg(u, 300, 900));
	}

	// NAT를 지난 용량 막대
	let passed = 0;
	for (const it of ITEMS) {
		const p = seg(u, it.at + lag, it.at + lag + TRIP);
		const viaEndpoint = it.layer && second;
		// 엔드포인트로 오는 층 파일은 NAT 막대에 더하지 않는다
		if (!viaEndpoint) passed += it.size * p;
		const route = !it.layer ? viaNatEcr : viaEndpoint ? viaEp : viaNatS3;
		if (p > 0 && p < 1) drawItem(ctx, c, along(route, p), it.layer);
	}
	const barX = 112;
	const barW = w - 8 - barX;
	const barY = 246;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `500 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText("NAT를 지난 용량", 8, barY);
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

	const cap = !second ? 0 : u < 900 ? 1 : 2;
	caption(ctx, c, CAPTIONS[cap], w, HEIGHT - 22);
}

export default function ImagePullDemo() {
	return (
		<CanvasFigure
			height={HEIGHT}
			cycle={CYCLE}
			scene={scene}
			label="프라이빗 서브넷의 노드가 컨테이너 이미지를 받는 길을 두 번 보여 주는 애니메이션. 처음에는 ECR에서 오는 이미지 목록과 S3에서 오는 층 파일이 모두 NAT 게이트웨이를 지나, 아래 막대의 NAT를 지난 용량이 거의 가득 찬다. S3 게이트웨이 엔드포인트를 붙인 뒤에는 층 파일이 엔드포인트로 바로 오고, NAT에는 작은 목록만 지나 막대가 조금만 찬다."
		/>
	);
}

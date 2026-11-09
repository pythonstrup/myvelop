import { along, box, CanvasFigure, caption, cross, dot, path, pill, type Pt, region } from "@/materials/aws-vpc-subnet-eni/canvas";
import { cmd, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { palette } from "@/materials/shared";

// 클러스터 엔드포인트 설정에 따라 kubectl과 노드가 API 서버로 가는 길이 어떻게 바뀌는지 보여 주는 애니메이션.
const HEIGHT = 450;
const UNTIL = [3600, 7200, 10800, 14400] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const FLOW = 2000;
const TERM_TOP = 316;
const TERM_ROWS = 4;
const QUERY = [cmd("$ aws eks describe-cluster --name my-cluster \\"), cmd("    --query cluster.resourcesVpcConfig")];
const VALUES = [
	[out('"endpointPublicAccess": true'), out('"endpointPrivateAccess": false')],
	[out('"endpointPublicAccess": true'), out('"endpointPrivateAccess": true')],
	[out('"endpointPublicAccess": false'), out('"endpointPrivateAccess": true')],
	[out('"endpointPublicAccess": true'), out('"publicAccessCidrs": ["203.0.113.10/32"]')],
];
// 단계별로 kubectl과 노드가 어디로 가고 어디서 막히는지
const FLOWS = [
	{ kubectl: "open", node: "public" },
	{ kubectl: "open", node: "private" },
	{ kubectl: "closed", node: "private" },
	{ kubectl: "open", node: "denied" },
] as const;
const LABELS = {
	ko: {
		captions: [
			"① 공개만 켜면(기본값) 노드도 NAT 게이트웨이를 지나 공개 엔드포인트로 간다",
			"② 비공개도 켜면 노드는 VPC 안의 ENI로 바로 가고, 밖의 kubectl은 공개 쪽으로 간다",
			"③ 비공개만 켜면 밖에서는 닿지 않는다. kubectl은 VPC나 연결된 네트워크에서 쳐야 한다",
			"④ 허용 목록에 NAT의 공인 IP가 없으면 kubectl은 되어도 노드가 API 서버에 닿지 못한다",
		],
		modes: ["공개만 (기본값)", "공개 + 비공개", "비공개만", "공개 + 허용 목록"],
		kubectl: "밖의 kubectl",
		awsVpc: "AWS가 관리하는 VPC",
		myVpc: "내 VPC",
		api: "API 서버",
		nlb: "NLB",
		nlbOn: "공개 엔드포인트",
		nlbOff: "꺼짐",
		nlbCheck: "허용 목록 검사",
		eni: "컨트롤 플레인 ENI",
		eniOn: "비공개 엔드포인트",
		eniOff: "kubelet 연결 전용",
		nat: "NAT 게이트웨이",
		natSub: "공인 IP",
		node: "노드",
		nodeSub: "프라이빗 서브넷",
		denied: "허용 목록에 없음",
		aria: "클러스터 엔드포인트 설정 네 가지를 차례로 보여 주는 애니메이션. 공개만 켠 기본값에서는 kubectl과 노드 모두 NLB로 된 공개 엔드포인트를 지나 API 서버로 가고, 프라이빗 서브넷의 노드는 NAT 게이트웨이를 거친다. 비공개도 켜면 노드는 VPC 안의 컨트롤 플레인 ENI로 바로 간다. 비공개만 켜면 VPC 밖의 kubectl은 닿지 못한다. 공개 엔드포인트에 허용 목록을 걸었는데 NAT 게이트웨이의 공인 IP가 빠져 있으면 kubectl은 되어도 노드는 API 서버에 닿지 못한다.",
	},
	en: {
		captions: [
			"① Public only (the default): nodes also go through the NAT gateway to the public endpoint",
			"② With private on, nodes go straight to an ENI in the VPC while outside kubectl stays public",
			"③ Private only: nothing outside reaches it. Run kubectl from the VPC or a connected network",
			"④ If the allow list lacks the NAT's public IP, kubectl works but nodes can't reach the API server",
		],
		modes: ["Public only (default)", "Public + private", "Private only", "Public + allow list"],
		kubectl: "Outside kubectl",
		awsVpc: "AWS-managed VPC",
		myVpc: "My VPC",
		api: "API server",
		nlb: "NLB",
		nlbOn: "Public endpoint",
		nlbOff: "Off",
		nlbCheck: "Checks allow list",
		eni: "Control plane ENI",
		eniOn: "Private endpoint",
		eniOff: "kubelet link only",
		nat: "NAT gateway",
		natSub: "Public IP",
		node: "Node",
		nodeSub: "Private subnet",
		denied: "Not on allow list",
		aria: "An animation showing four cluster endpoint settings in turn. With the default, public only, both kubectl and nodes go through the public endpoint, an NLB, to reach the API server, and nodes in a private subnet pass through the NAT gateway. With private on as well, nodes go straight to a control plane ENI in the VPC. With private only, kubectl outside the VPC can't reach it. If the public endpoint has an allow list that lacks the NAT gateway's public IP, kubectl works but nodes can't reach the API server.",
	},
};
type Lang = keyof typeof LABELS;

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const flow = FLOWS[step];
	const bw = Math.min(130, (w - 56) / 2);
	const lx = Math.max(w * 0.27, 20 + bw / 2);
	const rx = w - lx;
	const cx = w / 2;
	const bh = 40;
	const ys = { kubectl: 22, top: 96, mid: 196, node: 270 };

	region(ctx, c, 8, 50, w - 16, 84, L.awsVpc);
	region(ctx, c, 8, 150, w - 16, 158, L.myVpc);

	const laptop: Pt = [rx, ys.kubectl + 16];
	const nlbTop: Pt = [rx, ys.top - bh / 2];
	const nlbBottom: Pt = [rx, ys.top + bh / 2];
	const nlbLeft: Pt = [rx - bw / 2, ys.top];
	const apiRight: Pt = [lx + bw / 2, ys.top];
	const apiBottom: Pt = [lx, ys.top + bh / 2];
	const eniTop: Pt = [lx, ys.mid - bh / 2];
	const eniBottom: Pt = [lx, ys.mid + bh / 2];
	const natTop: Pt = [rx, ys.mid - bh / 2];
	const natBottom: Pt = [rx, ys.mid + bh / 2];
	const nodeL: Pt = [cx - 16, ys.node - bh / 2];
	const nodeR: Pt = [cx + 16, ys.node - bh / 2];
	const closedAt: Pt = [rx, (laptop[1] + nlbTop[1]) / 2];
	const deniedAt: Pt = [rx, 142];

	for (const line of [[laptop, nlbTop], [nlbLeft, apiRight], [natTop, nlbBottom], [eniTop, apiBottom], [nodeL, eniBottom], [nodeR, natBottom]] as const) path(ctx, line, c.line);

	const p = ((t - (step === 0 ? 0 : UNTIL[step - 1])) % FLOW) / FLOW;
	const kubectlRoute: readonly Pt[] = flow.kubectl === "open" ? [laptop, nlbTop, [rx, ys.top], nlbLeft, apiRight] : [laptop, closedAt];
	const nodeRoutes = {
		public: [nodeR, natBottom, natTop, nlbBottom, [rx, ys.top], nlbLeft, apiRight],
		private: [nodeL, eniBottom, eniTop, apiBottom],
		denied: [nodeR, natBottom, natTop, deniedAt],
	} as const satisfies Record<string, readonly Pt[]>;

	// 지나는 구간을 진하게 칠한다. 상자 안쪽은 칠하지 않는다.
	if (flow.kubectl === "open") {
		path(ctx, [laptop, nlbTop], c.blue, false, 0.6);
		path(ctx, [nlbLeft, apiRight], c.blue, false, 0.6);
	}
	if (flow.node === "public") {
		for (const line of [[nodeR, natBottom], [natTop, nlbBottom]] as const) path(ctx, line, c.green, false, 0.6);
	} else if (flow.node === "private") {
		for (const line of [[nodeL, eniBottom], [eniTop, apiBottom]] as const) path(ctx, line, c.green, false, 0.6);
	} else {
		for (const line of [[nodeR, natBottom], [natTop, deniedAt]] as const) path(ctx, line, c.green, false, 0.6);
	}

	const [kx, ky] = along(kubectlRoute, p, false);
	dot(ctx, kx, ky, c.blue, 4.5);
	const [nx, ny] = along(nodeRoutes[flow.node], p, false);
	dot(ctx, nx, ny, c.green, 4.5);

	const closed = flow.kubectl === "closed";
	const nlbSub = closed ? L.nlbOff : step === 3 ? L.nlbCheck : L.nlbOn;
	box(ctx, c, rx, ys.kubectl, bw, 32, L.kubectl, "", c.blue);
	box(ctx, c, lx, ys.top, bw, bh, L.api, "");
	box(ctx, c, rx, ys.top, bw, bh, L.nlb, nlbSub, closed ? c.line : step === 3 ? c.amber : c.boxStroke);
	box(ctx, c, lx, ys.mid, bw, bh, L.eni, flow.node === "private" ? L.eniOn : L.eniOff);
	box(ctx, c, rx, ys.mid, bw, bh, L.nat, L.natSub);
	box(ctx, c, cx, ys.node, bw, bh, L.node, L.nodeSub, c.green);

	pill(ctx, w, lx, ys.kubectl, L.modes[step], c.amber, c.amberFill);
	if (closed) cross(ctx, closedAt[0], closedAt[1], c.red);
	if (flow.node === "denied") {
		cross(ctx, deniedAt[0], deniedAt[1], c.red);
		pill(ctx, w, cx - 8, deniedAt[1], L.denied, c.red, c.redFill);
	}

	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, [...QUERY, ...VALUES[step]]);
	caption(ctx, c, L.captions[step], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function EndpointDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

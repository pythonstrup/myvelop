import { CanvasFigure, caption, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type CellState, eniGrid, formula, IPS_PER_ENI, legend, ROW_HEIGHT } from "@/materials/eks-nodes-and-clusters/eni-grid";
import { cmd, err, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { type Colors, FONT, palette } from "@/materials/shared";

// WARM_ENI_TARGET=1로 미리 잡는 IP가 왜 필요하고, 서브넷 IP를 어떻게 줄이는지 보여 주는 애니메이션. Pod 수와 노드 수는 설명용이다.
const HEIGHT = 310;
const UNTIL = [3200, 5800, 8800, 12600, 16400] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const PODS = 20;
const NODE_IPS = 45;
const NODES = 5;
const SUBNET_IPS = 251;
const SHARES = [3, PODS, NODE_IPS - 3 - PODS] as const; // 노드 하나의 주 IP, Pod IP, 여유 IP
const TERM_TOP = 192;
const TERM_ROWS = 3;
const WARM = [cmd("$ kubectl describe ds aws-node -n kube-system"), out("WARM_ENI_TARGET:  1")];
const SUBNET = [cmd("$ aws ec2 describe-subnets \\"), cmd("    --subnet-ids subnet-0a1b2c3d")];
const FAILED = [cmd("$ kubectl describe pod web"), err("Warning  FailedCreatePodSandBox ..."), err("failed to assign an IP address to container")];
const LABELS = {
	ko: {
		captions: [
			"① m7i.xlarge에 IP를 받는 Pod가 20개라고 하자. ENI 2장이면 들어간다",
			"② WARM_ENI_TARGET=1은 한 장 분량의 여유를 둔다. 8개로는 모자라 한 장 더 꽂는다",
			"③ 덕분에 새 Pod는 IP를 바로 받는다. ENI를 새로 붙이면 10초까지 걸린다",
			"④ 대가는 서브넷 IP다. 서브넷이 /24라면 이런 노드 5대가 Pod 100개로 IP 225개를 잡는다",
			"⑤ 바닥나면 Pod가 ContainerCreating에 멈춘다. 서브넷을 더하거나 WARM_IP_TARGET으로 줄인다",
		],
		primary: "주 IP",
		pod: "Pod",
		warm: "미리 잡아 둔 IP",
		count: (ips: number) => `노드 1대: Pod 20개, IP ${ips}개`,
		subnet: "서브넷 /24 · 쓸 수 있는 IP 251개",
		held: (ips: number) => `${ips}개 잡힘`,
		aria: "m7i.xlarge에서 IP를 받는 Pod가 20개라고 가정한 애니메이션. 첫 ENI에 14개, 둘째 ENI에 6개가 들어가 2장이면 충분하다. WARM_ENI_TARGET이 1이면 ENI 한 장 분량의 IP를 여유로 두는데, 남는 IP가 8개뿐이라 모자란다. 그래서 VPC CNI가 한 장을 더 꽂아 3장, IP 45개를 잡는다. 덕분에 새 Pod는 IP를 바로 받는다. 서브넷이 /24라서 쓸 수 있는 IP가 251개라면 이런 노드 5대가 225개를 잡고, 서브넷이 바닥나면 Pod는 failed to assign an IP address to container 오류와 함께 ContainerCreating에 멈춘다.",
	},
	en: {
		captions: [
			"① Say an m7i.xlarge runs 20 Pods that take IPs. Two ENIs are enough",
			"② WARM_ENI_TARGET=1 keeps a full ENI of spare IPs. Eight falls short, so one more is attached",
			"③ So a new Pod gets an IP right away. Attaching a new ENI can take up to 10 seconds",
			"④ The cost is subnet IPs. In a /24 subnet, five such nodes hold 225 IPs for just 100 Pods",
			"⑤ When it runs out, Pods stop at ContainerCreating. Add a subnet or trim with WARM_IP_TARGET",
		],
		primary: "Primary IP",
		pod: "Pod",
		warm: "Held in advance",
		count: (ips: number) => `1 node: 20 Pods, ${ips} IPs`,
		subnet: "/24 subnet · 251 usable IPs",
		held: (ips: number) => `${ips} held`,
		aria: "An animation assuming an m7i.xlarge runs 20 Pods that take IPs. Fourteen go on the first ENI and six on the second, so two ENIs are enough. WARM_ENI_TARGET at 1 keeps a full ENI of spare IPs, and the eight left over fall short. So the VPC CNI attaches one more ENI, holding three ENIs and 45 IPs. A new Pod then gets an IP right away. If a /24 subnet has 251 usable IPs, five such nodes hold 225 of them, and when the subnet runs out, Pods stop at ContainerCreating with the error failed to assign an IP address to container.",
	},
};
type Lang = keyof typeof LABELS;

// 서브넷 전체를 한 줄 막대로 그리고, 노드 하나가 잡은 IP를 칸으로 쌓는다.
function subnetBar(ctx: CanvasRenderingContext2D, c: Colors, w: number, y: number, nodes: number, exhausted: number) {
	const x = Math.max(16, (w - 560) / 2);
	const bw = w - x * 2;
	const h = 18;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, bw, h, 4);
	ctx.clip();
	ctx.fillStyle = c.boxFill;
	ctx.fillRect(x, y, bw, h);
	const colors = [c.amber, c.blue, c.green];
	let cursor = x;
	for (let n = 0; n < nodes; n++) {
		SHARES.forEach((share, i) => {
			const part = (bw * share) / SUBNET_IPS;
			ctx.fillStyle = colors[i];
			ctx.fillRect(cursor, y, part - 0.5, h);
			cursor += part;
		});
	}
	ctx.fillStyle = c.red;
	ctx.fillRect(cursor, y, (x + bw - cursor) * exhausted, h);
	ctx.restore();
	ctx.beginPath();
	ctx.roundRect(x, y, bw, h, 4);
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1;
	ctx.stroke();
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const top = 36;
	const rows = 3;
	const x = Math.max(16, (w - 560) / 2);

	legend(ctx, c, w, 14, [
		{ label: L.primary, fill: c.amberFill, stroke: c.amber },
		{ label: L.pod, fill: c.blueFill, stroke: c.blue },
		{ label: L.warm, fill: c.greenFill, stroke: c.green },
	]);

	// 셋째 ENI는 ②단계에서 꽂힌다.
	const third = step >= 1 && t >= UNTIL[0] + 700;
	const state = (row: number, col: number): CellState => {
		if (row === 2 && !third) return "hidden";
		if (col === 0) return "primary";
		const index = row * (IPS_PER_ENI - 1) + col - 1;
		if (index < PODS && t >= 300 + index * 110) return "pod";
		// ③단계: 새 Pod가 여유 IP 한 칸을 받는 모습을 깜빡여 보여 준다.
		if (step === 2 && index === PODS && t % 800 < 400) return "pod";
		return third ? "warm" : "empty";
	};
	eniGrid(ctx, c, w, top, rows, state);
	formula(ctx, c, w, top + rows * ROW_HEIGHT + 16, L.count(third ? NODE_IPS : 30));

	const nodes = step < 1 || !third ? 0 : step < 3 ? 1 : step === 3 ? 1 + Math.floor((NODES - 1) * seg(t, UNTIL[2] + 400, UNTIL[2] + 2000)) : NODES;
	const exhausted = step === 4 ? seg(t, UNTIL[3] + 300, UNTIL[3] + 1100) : 0;
	const held = exhausted >= 1 ? SUBNET_IPS : nodes * NODE_IPS;
	ctx.textBaseline = "middle";
	ctx.font = `600 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.fillStyle = c.sub;
	ctx.fillText(L.subnet, x, 152);
	if (held > 0) {
		ctx.textAlign = "right";
		ctx.fillStyle = exhausted >= 1 ? c.red : c.text;
		ctx.fillText(L.held(held), w - x, 152);
	}
	subnetBar(ctx, c, w, 162, nodes, exhausted);

	const lines = step === 4 ? FAILED : step === 3 ? [...SUBNET, out(`"AvailableIpAddressCount": ${SUBNET_IPS - held}`)] : WARM;
	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, lines);
	caption(ctx, c, L.captions[step], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function WarmEniDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

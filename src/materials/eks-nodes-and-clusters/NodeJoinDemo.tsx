import { along, box, CanvasFigure, caption, dot, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { cmd, err, ok, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { palette } from "@/materials/shared";

// 관리형 노드 그룹의 EC2가 노드로 등록되기까지의 단계와, 막혔을 때 어디를 볼지 보여 주는 애니메이션.
const HEIGHT = 402;
const UNTIL = [2400, 5000, 7400, 9800, 13200, 17600] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const TERM_TOP = 268;
const TERM_ROWS = 4;
const GET_NODES = cmd("$ kubectl get nodes");
const CONFIG = [cmd("apiServerEndpoint: https://example.com"), cmd("certificateAuthority: LS0t..."), cmd("cidr: 10.100.0.0/16")];
const LABELS = {
	ko: {
		captions: [
			"① 노드 그룹의 Auto Scaling 그룹이 EC2를 띄운다",
			"② nodeadm이 kubelet에 클러스터 주소와 인증서를 넣는다",
			"③ kubelet이 엔드포인트로 가서 노드 IAM 역할로 자신을 증명한다",
			"④ 액세스 항목이 그 역할을 노드(system:nodes)로 인정한다",
			"⑤ kubelet이 Node 객체를 등록한다. VPC CNI까지 뜨면 NotReady가 Ready로 바뀐다",
			"⑥ 노드가 목록에 없으면 A를, NotReady에 머물면 B를 본다",
		],
		terms: [
			[GET_NODES, out("No resources found")],
			[out("# nodeadm이 읽는 NodeConfig"), ...CONFIG],
			[out("# 엔드포인트에 닿아야 다음으로 넘어간다"), out("# 신원은 노드 IAM 역할로 증명한다")],
			[out("username: system:node:ip-10-0-10-7..."), out("group:    system:nodes")],
			[GET_NODES],
			[err("A 목록에 없음: NodeCreationFailure"), out("  밖으로 나가는 길, 노드 IAM 역할 권한"), err("B NotReady: cni plugin not initialized"), out("  aws-node Pod의 상태와 로그")],
		],
		asg: "Auto Scaling 그룹",
		ec2: "EC2 (내 계정)",
		cp: "컨트롤 플레인",
		api: "API 서버",
		entry: "액세스 항목",
		entrySub: "역할의 권한",
		role: "노드 IAM 역할",
		config: "주소 · 인증서",
		node: "Node 객체",
		aria: "왼쪽에 내 계정의 EC2, 오른쪽에 컨트롤 플레인을 둔 애니메이션. Auto Scaling 그룹이 EC2를 띄우고, nodeadm이 kubelet에 클러스터 주소와 인증서를 넣는다. kubelet은 엔드포인트로 가서 노드 IAM 역할로 자신을 증명하고, 액세스 항목이 그 역할을 노드로 인정한다. kubelet이 Node 객체를 등록하고, VPC CNI까지 뜨면 NotReady가 Ready로 바뀐다. 노드가 목록에 없으면 밖으로 나가는 길과 노드 IAM 역할 권한을, NotReady에 머물면 aws-node Pod를 본다.",
	},
	en: {
		captions: [
			"① The node group's Auto Scaling group launches an EC2 instance",
			"② nodeadm gives the kubelet the cluster address and certificate",
			"③ The kubelet goes to the endpoint and proves itself with the node IAM role",
			"④ An access entry recognizes that role as a node (system:nodes)",
			"⑤ The kubelet registers a Node object. Once the VPC CNI is up, NotReady turns Ready",
			"⑥ If the node isn't listed, check A. If it stays NotReady, check B",
		],
		terms: [
			[GET_NODES, out("No resources found")],
			[out("# The NodeConfig nodeadm reads"), ...CONFIG],
			[out("# It must reach the endpoint to go on"), out("# It proves its identity with the node IAM role")],
			[out("username: system:node:ip-10-0-10-7..."), out("group:    system:nodes")],
			[GET_NODES],
			[err("A Not listed: NodeCreationFailure"), out("  Outbound path, node IAM role permissions"), err("B NotReady: cni plugin not initialized"), out("  Status and logs of the aws-node Pod")],
		],
		asg: "Auto Scaling group",
		ec2: "EC2 (my account)",
		cp: "Control plane",
		api: "API server",
		entry: "Access entry",
		entrySub: "Role permissions",
		role: "Node IAM role",
		config: "Address · cert",
		node: "Node object",
		aria: "An animation with EC2 in my account on the left and the control plane on the right. An Auto Scaling group launches an EC2 instance, and nodeadm gives the kubelet the cluster address and certificate. The kubelet goes to the endpoint and proves itself with the node IAM role, and an access entry recognizes that role as a node. The kubelet registers a Node object, and once the VPC CNI is up, NotReady turns Ready. If the node isn't listed, check the outbound path and node IAM role permissions. If it stays NotReady, check the aws-node Pod.",
	},
};
type Lang = keyof typeof LABELS;

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const rw = (w - 28) / 2;
	const lx = 8 + rw / 2;
	const rx = w - 8 - rw / 2;
	const bw = Math.min(130, rw - 16);
	const bh = 36;
	const ec2On = step > 0 || t >= 1400;

	const asgBottom: Pt = [lx, 40];
	const regionTop = 62;
	const nodeadm = 112;
	const kubelet = 192;
	const api = 104;
	const entry = 166;
	const nodeObj = 228;

	box(ctx, c, lx, 24, bw, 32, L.asg, "", step === 0 ? c.blue : c.boxStroke);
	path(ctx, [asgBottom, [lx, regionTop]], c.line);
	region(ctx, c, 8, regionTop, rw, 196, L.ec2, ec2On ? { stroke: step === 0 ? c.blue : undefined, fill: c.boxFill } : { dashed: true });
	region(ctx, c, w - 8 - rw, regionTop, rw, 196, L.cp, { fill: c.boxFill });

	const kubeletRight: Pt = [lx + bw / 2, kubelet];
	const apiLeft: Pt = [rx - bw / 2, api];
	const nodeLeft: Pt = [rx - bw / 2, nodeObj];
	path(ctx, [[rx, api + bh / 2], [rx, entry - bh / 2]], c.line);

	if (ec2On) {
		path(ctx, [[lx, nodeadm + bh / 2], [lx, kubelet - bh / 2]], c.line);
		path(ctx, [kubeletRight, apiLeft], step === 5 ? c.red : c.line, step === 5);
		path(ctx, [kubeletRight, nodeLeft], c.line);
		box(ctx, c, lx, nodeadm, bw, bh, "nodeadm", "", step === 1 ? c.blue : c.boxStroke);
		box(ctx, c, lx, kubelet, bw, bh, "kubelet", step === 2 || step === 3 ? L.role : "", step >= 1 && step <= 4 ? c.blue : c.boxStroke);
	}
	box(ctx, c, rx, api, bw, bh, L.api, "", step === 2 || step === 3 ? c.blue : c.boxStroke);
	box(ctx, c, rx, entry, bw, bh, L.entry, L.entrySub, step === 3 ? c.green : c.boxStroke);

	const registered = step === 4 && t >= UNTIL[3] + 1000;
	const ready = step === 4 && t >= UNTIL[3] + 2000;
	const nodeSub = step === 5 ? "NotReady" : ready ? "Ready" : registered ? "NotReady" : "";
	box(ctx, c, rx, nodeObj, bw, bh, L.node, nodeSub, step === 5 ? c.red : ready ? c.green : step === 4 ? c.blue : c.boxStroke);

	if (step === 0) {
		const [x, y] = along([asgBottom, [lx, regionTop]], seg(t, 300, 1300));
		dot(ctx, x, y, c.blue);
	} else if (step === 1) {
		const [x, y] = along([[lx, nodeadm + bh / 2], [lx, kubelet - bh / 2]], seg(t, UNTIL[0] + 300, UNTIL[0] + 1600));
		dot(ctx, x, y, c.blue);
		pill(ctx, w, lx, (nodeadm + kubelet) / 2, L.config, c.blue, c.blueFill, seg(t, UNTIL[0] + 200, UNTIL[0] + 500));
	} else if (step === 2) {
		const [x, y] = along([kubeletRight, apiLeft], seg(t, UNTIL[1] + 300, UNTIL[1] + 1700));
		dot(ctx, x, y, c.blue);
	} else if (step === 3) {
		const [x, y] = along([[rx, api + bh / 2], [rx, entry - bh / 2]], seg(t, UNTIL[2] + 200, UNTIL[2] + 1100));
		dot(ctx, x, y, c.green);
	} else if (step === 4) {
		if (!registered) {
			const [x, y] = along([kubeletRight, nodeLeft], seg(t, UNTIL[3] + 200, UNTIL[3] + 1000));
			dot(ctx, x, y, c.blue);
		}
	} else {
		pill(ctx, w, (kubeletRight[0] + apiLeft[0]) / 2, (kubeletRight[1] + apiLeft[1]) / 2, "A", c.red, c.redFill);
		pill(ctx, w, rx + bw / 2 - 6, nodeObj - bh / 2, "B", c.red, c.redFill);
	}

	const statusLine = ready ? ok("ip-10-0-10-7   Ready") : err("ip-10-0-10-7   NotReady");
	const lines = step === 4 ? (registered ? [...L.terms[4], statusLine] : [...L.terms[4], out("No resources found")]) : L.terms[step];
	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, lines);
	caption(ctx, c, L.captions[step], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function NodeJoinDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

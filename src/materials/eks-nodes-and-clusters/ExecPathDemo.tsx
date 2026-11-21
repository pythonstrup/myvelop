import { along, box, CanvasFigure, caption, cross, dot, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { cmd, err, ok, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { palette } from "@/materials/shared";

// kubectl exec가 API 서버를 지나 노드의 kubelet까지 가는 길, get과의 차이, 10250이 막혔을 때의 증상을 보여 주는 애니메이션.
const HEIGHT = 474;
const UNTIL = [2600, 4400, 6800, 8600, 11400, 14400, 18000] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const TERM_TOP = 374;
const TERM_ROWS = 2;
const EXEC = cmd("$ kubectl exec -it web -- sh");
const LABELS = {
	ko: {
		captions: [
			"① kubectl의 요청을 AWS가 관리하는 NLB가 받아 API 서버로 넘긴다",
			"② API 서버가 IAM 인증과 RBAC 권한을 확인한다",
			"③ API 서버가 내 서브넷의 ENI를 지나 kubelet의 10250번 포트로 연결한다",
			"④ kubelet이 컨테이너 런타임에 명령 실행을 맡긴다",
			"⑤ 명령이 끝날 때까지 입출력이 같은 길로 오간다",
			"⑥ kubectl get은 다르다. 답이 etcd에 저장돼 있어 API 서버에서 끝나고 노드까지 가지 않는다",
			"⑦ 그래서 보안 그룹이 10250을 막으면 get은 되는데 exec와 logs만 실패한다",
		],
		terms: [
			[EXEC, out("# 공개 엔드포인트로 요청을 보낸다")],
			[EXEC, err("# 권한이 없으면 여기서 Forbidden으로 끝난다")],
			[EXEC, out("# API 서버 → kubelet:10250")],
			[EXEC, out("# 컨테이너 안에서 sh를 실행한다")],
			[EXEC, ok("/ # ls")],
			[cmd("$ kubectl get pods"), ok("web   1/1   Running")],
			[cmd("$ kubectl logs web"), err("... dial tcp 10.0.10.7:10250: i/o timeout")],
		],
		kubectl: "노트북의 kubectl",
		awsVpc: "AWS가 관리하는 VPC",
		nlb: "NLB",
		nlbSub: "공개 엔드포인트",
		api: "API 서버",
		apiSub: "IAM 인증 · RBAC 확인",
		etcdSub: "상태 저장",
		myVpc: "내 VPC",
		eni: "컨트롤 플레인 ENI",
		node: "노드 (EC2)",
		runtime: "컨테이너 런타임",
		stops: "노드까지 안 감",
		blocked: "보안 그룹이 막음",
		aria: "kubectl exec 요청의 경로를 위에서 아래로 그린 애니메이션. 노트북의 kubectl이 보낸 요청을 AWS가 관리하는 VPC의 NLB가 받아 API 서버로 넘긴다. API 서버는 IAM 인증과 RBAC 권한을 확인한 뒤, 내 VPC의 서브넷에 꽂힌 컨트롤 플레인 ENI를 지나 노드의 kubelet 10250번 포트로 연결한다. kubelet은 컨테이너 런타임에 실행을 맡기고, 명령이 끝날 때까지 입출력이 같은 길로 오간다. kubectl get은 etcd에 저장된 값을 답하므로 API 서버에서 끝난다. 그래서 보안 그룹이 10250번 포트를 막으면 get은 되고 exec와 logs는 i/o timeout으로 실패한다.",
	},
	en: {
		captions: [
			"① An AWS-managed NLB receives kubectl's request and passes it to the API server",
			"② The API server checks IAM authentication and RBAC permissions",
			"③ The API server connects to the kubelet's port 10250 through an ENI in my subnet",
			"④ The kubelet hands the command to the container runtime",
			"⑤ Input and output travel the same path until the command ends",
			"⑥ kubectl get differs. Its answer is stored in etcd, so it ends at the API server and never reaches the node",
			"⑦ So if a security group blocks 10250, get still works while exec and logs fail",
		],
		terms: [
			[EXEC, out("# Sends a request to the public endpoint")],
			[EXEC, err("# Without permission, it ends here: Forbidden")],
			[EXEC, out("# API server → kubelet:10250")],
			[EXEC, out("# Runs sh inside the container")],
			[EXEC, ok("/ # ls")],
			[cmd("$ kubectl get pods"), ok("web   1/1   Running")],
			[cmd("$ kubectl logs web"), err("... dial tcp 10.0.10.7:10250: i/o timeout")],
		],
		kubectl: "kubectl on a laptop",
		awsVpc: "AWS-managed VPC",
		nlb: "NLB",
		nlbSub: "Public endpoint",
		api: "API server",
		apiSub: "IAM auth · RBAC check",
		etcdSub: "Stores state",
		myVpc: "My VPC",
		eni: "Control plane ENI",
		node: "Node (EC2)",
		runtime: "Container runtime",
		stops: "Skips the node",
		blocked: "Blocked by SG",
		aria: "An animation of the path of a kubectl exec request, drawn from top to bottom. An NLB in an AWS-managed VPC receives the request from kubectl on a laptop and passes it to the API server. The API server checks IAM authentication and RBAC permissions, then connects to port 10250 on the node's kubelet through a control plane ENI attached to a subnet in my VPC. The kubelet hands the command to the container runtime, and input and output travel the same path until the command ends. kubectl get answers from values stored in etcd, so it ends at the API server. If a security group blocks port 10250, get still works while exec and logs fail with an i/o timeout.",
	},
};
type Lang = keyof typeof LABELS;
type BoxKey = "kubectl" | "nlb" | "api" | "etcd" | "eni" | "kubelet" | "runtime";

const ACTIVE: readonly (readonly BoxKey[])[] = [
	["kubectl", "nlb", "api"],
	["api"],
	["api", "eni", "kubelet"],
	["kubelet", "runtime"],
	["kubectl", "nlb", "api", "eni", "kubelet", "runtime"],
	["kubectl", "nlb", "api", "etcd"],
	["kubectl", "nlb", "api", "eni"],
];

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const ew = 96;
	const gap = 18;
	const bw = Math.min(170, w - ew - gap - 40);
	const left = (w - bw - gap - ew) / 2;
	const cx = left + bw / 2;
	const etcdX = left + bw + gap + ew / 2;
	const ys = { kubectl: 22, nlb: 92, api: 142, eni: 222, kubelet: 284, runtime: 334 };
	const hs = { kubectl: 32, nlb: 36, api: 40, eni: 32, kubelet: 32, runtime: 32 };
	const top = (k: keyof typeof ys): Pt => [cx, ys[k] - hs[k] / 2];
	const bottom = (k: keyof typeof ys): Pt => [cx, ys[k] + hs[k] / 2];
	const apiRight: Pt = [cx + bw / 2, ys.api];
	const etcdLeft: Pt = [etcdX - ew / 2, ys.api];
	const blockedAt: Pt = [cx, (bottom("eni")[1] + top("kubelet")[1]) / 2];

	region(ctx, c, 8, 50, w - 16, 122, L.awsVpc);
	region(ctx, c, 8, 186, w - 16, 180, L.myVpc);
	region(ctx, c, 20, 246, w - 40, 112, L.node, { fill: c.boxFill });

	const order = ["kubectl", "nlb", "api", "eni", "kubelet", "runtime"] as const;
	for (let i = 0; i < order.length - 1; i++) path(ctx, [bottom(order[i]), top(order[i + 1])], c.line);
	path(ctx, [apiRight, etcdLeft], c.line);

	// 점을 상자보다 먼저 그려 상자 안의 글자를 가리지 않게 한다.
	const toApi: readonly Pt[] = [bottom("kubectl"), top("nlb"), bottom("nlb"), top("api")];
	if (step === 0) {
		const [x, y] = along(toApi, seg(t, 300, 2300));
		dot(ctx, x, y, c.blue);
	} else if (step === 2) {
		const [x, y] = along([bottom("api"), top("eni"), bottom("eni"), top("kubelet")], seg(t, UNTIL[1] + 200, UNTIL[1] + 2100));
		dot(ctx, x, y, c.blue);
	} else if (step === 3) {
		const [x, y] = along([bottom("kubelet"), top("runtime")], seg(t, UNTIL[2] + 200, UNTIL[2] + 1300));
		dot(ctx, x, y, c.blue);
	} else if (step === 4) {
		const route = order.flatMap((k, i) => (i === 0 ? [bottom(k)] : i === order.length - 1 ? [top(k)] : [top(k), bottom(k)]));
		const p = ((t - UNTIL[3]) % 2400) / 2400;
		const [dx, dy] = along(route, p, false);
		const [ux, uy] = along([...route].reverse(), (p + 0.5) % 1, false);
		dot(ctx, dx - 7, dy, c.blue, 4);
		dot(ctx, ux + 7, uy, c.green, 4);
	} else if (step === 5) {
		const route: readonly Pt[] = [...toApi, [cx, ys.api], apiRight, etcdLeft];
		const back = seg(t, UNTIL[4] + 1500, UNTIL[4] + 2700);
		const [x, y] = back > 0 ? along([...route].reverse(), back) : along(route, seg(t, UNTIL[4] + 200, UNTIL[4] + 1500));
		dot(ctx, x, y, c.green);
	} else if (step === 6) {
		const p = seg(t, UNTIL[5] + 200, UNTIL[5] + 1400);
		if (p < 1) {
			const [x, y] = along([...toApi, bottom("api"), top("eni"), bottom("eni"), blockedAt], p);
			dot(ctx, x, y, c.blue);
		}
		path(ctx, [bottom("eni"), top("kubelet")], c.red, true);
	}

	const stroke = (k: BoxKey) => {
		if (step === 6 && (k === "kubelet" || k === "runtime")) return c.red;
		if (!ACTIVE[step].includes(k)) return c.boxStroke;
		return step === 4 || step === 5 ? c.green : c.blue;
	};
	box(ctx, c, cx, ys.kubectl, bw, hs.kubectl, L.kubectl, "", stroke("kubectl"));
	box(ctx, c, cx, ys.nlb, bw, hs.nlb, L.nlb, L.nlbSub, stroke("nlb"));
	box(ctx, c, cx, ys.api, bw, hs.api, L.api, L.apiSub, stroke("api"));
	box(ctx, c, etcdX, ys.api, ew, hs.api, "etcd", L.etcdSub, stroke("etcd"));
	box(ctx, c, cx, ys.eni, bw, hs.eni, L.eni, "", stroke("eni"));
	box(ctx, c, cx, ys.kubelet, bw, hs.kubelet, "kubelet", "", stroke("kubelet"));
	box(ctx, c, cx, ys.runtime, bw, hs.runtime, L.runtime, "", stroke("runtime"));

	if (step >= 2 && step <= 4) pill(ctx, w, etcdX, ys.eni, "TCP 10250", c.blue, c.blueFill);
	if (step === 5) pill(ctx, w, etcdX, ys.eni, L.stops, c.green, c.greenFill);
	if (step === 6) {
		pill(ctx, w, etcdX, ys.eni, L.blocked, c.red, c.redFill);
		if (t >= UNTIL[5] + 1400) cross(ctx, blockedAt[0], blockedAt[1], c.red);
	}

	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, L.terms[step]);
	caption(ctx, c, L.captions[step], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function ExecPathDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

import { box, CanvasFigure, caption } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type CellState, eniGrid, formula, IPS_PER_ENI, legend, ROW_HEIGHT } from "@/materials/eks-nodes-and-clusters/eni-grid";
import { cmd, err, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { palette } from "@/materials/shared";

// m7i.xlarge의 ENI 장수와 IP 수로 기본 Pod 상한 58이 나오는 계산과, 상한에 닿았을 때의 증상을 보여 주는 애니메이션.
const HEIGHT = 362;
const UNTIL = [2800, 5000, 7800, 10600, 13400, 16800] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const ENIS = 4;
const TERM_TOP = 230;
const TERM_ROWS = 4;
const FORMULAS = ["4 × 15", "4 × (15 − 1)", "4 × (15 − 1) = 56", "4 × (15 − 1) + 2", "4 × (15 − 1) + 2 = 58", "4 × (15 − 1) + 2 = 58"] as const;
const LOOKUP = [cmd("$ aws ec2 describe-instance-types \\"), cmd("    --instance-types m7i.xlarge"), out('"MaximumNetworkInterfaces": 4'), out('"Ipv4AddressesPerInterface": 15')];
const TERMS = [
	LOOKUP,
	LOOKUP,
	LOOKUP,
	LOOKUP,
	[cmd("$ kubectl describe node my-node | grep pods:"), out("  pods:   58"), out("  pods:   58")],
	[cmd("$ kubectl describe pod web"), err("0/1 nodes are available: 1 Too many pods.")],
];
const LABELS = {
	ko: {
		captions: [
			"① 인스턴스 종류마다 ENI 장수와 장당 IP 수가 정해져 있다. m7i.xlarge는 4장, 15개다",
			"② 장마다 첫 IP는 ENI 자신의 주소(주 IP)라 Pod에 줄 수 없다",
			"③ 나머지 14개씩, 모두 56개를 Pod에 줄 수 있다",
			"④ VPC CNI와 kube-proxy는 노드 IP를 함께 쓰므로 IP 없이 2개를 더 올린다",
			"⑤ 기본 상한은 58개다. kubelet의 maxPods가 되어 노드의 pods 값으로 보인다",
			"⑥ 59번째 Pod는 CPU와 메모리가 남아도 Too many pods로 Pending이다",
		],
		boxes: [
			[["ENI 4장", "인스턴스 종류가 정함"], ["IP 15개", "ENI 한 장당"]],
			[["주 IP 4개", "ENI 자신의 주소"], ["Pod에 못 줌", "장마다 1개씩"]],
			[["보조 IP 56개", "Pod에 준다"], ["주 IP 4개", "뺀다"]],
			[["VPC CNI", "노드 IP를 함께 씀"], ["kube-proxy", "노드 IP를 함께 씀"]],
			[["maxPods 58", "kubelet 설정"], ["pods 58", "노드의 상한"]],
			[["Pod 58개", "자리 다 참"], ["59번째 Pod", "Pending"]],
		],
		primary: "주 IP",
		pod: "Pod 몫",
		empty: "IP",
		aria: "m7i.xlarge의 ENI 4장을 각각 IP 15칸으로 그린 애니메이션. 장마다 첫 칸인 주 IP는 ENI 자신의 주소라 Pod에 줄 수 없고, 나머지 14칸씩 모두 56칸이 Pod 몫으로 채워진다. VPC CNI와 kube-proxy는 노드 IP를 함께 쓰므로 2개를 더해 기본 Pod 상한은 58개다. 이 값은 kubelet의 maxPods가 되어 노드의 pods 값으로 보이고, 59번째 Pod는 CPU와 메모리가 남아도 Too many pods로 Pending이 된다.",
	},
	en: {
		captions: [
			"① Each instance type has a fixed ENI count and IPs per ENI. An m7i.xlarge has 4 ENIs with 15 IPs each",
			"② On each ENI, the first IP is the ENI's own address (the primary IP), so no Pod can take it",
			"③ The other 14 per ENI, 56 in total, can go to Pods",
			"④ The VPC CNI and kube-proxy share the node's IP, so 2 more run without taking an IP",
			"⑤ The default limit is 58. It becomes the kubelet's maxPods and shows as the node's pods value",
			"⑥ Pod number 59 stays Pending with Too many pods, even with CPU and memory to spare",
		],
		boxes: [
			[["4 ENIs", "Set by instance type"], ["15 IPs", "Per ENI"]],
			[["4 primary IPs", "The ENI's own address"], ["Not for Pods", "One per ENI"]],
			[["56 secondary IPs", "Go to Pods"], ["4 primary IPs", "Left out"]],
			[["VPC CNI", "Shares the node IP"], ["kube-proxy", "Shares the node IP"]],
			[["maxPods 58", "kubelet setting"], ["pods 58", "The node's limit"]],
			[["58 Pods", "No room left"], ["Pod number 59", "Pending"]],
		],
		primary: "Primary IP",
		pod: "For Pods",
		empty: "IP",
		aria: "An animation drawing the 4 ENIs of an m7i.xlarge as 15 IP cells each. The first cell on each ENI, the primary IP, is the ENI's own address and can't go to a Pod, so the other 14 cells per ENI, 56 in total, fill up as room for Pods. The VPC CNI and kube-proxy share the node's IP, so adding 2 gives a default Pod limit of 58. This value becomes the kubelet's maxPods and shows as the node's pods value. Pod number 59 stays Pending with Too many pods, even with CPU and memory to spare.",
	},
};
type Lang = keyof typeof LABELS;

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const top = 36;

	legend(ctx, c, w, 14, [
		{ label: L.empty, fill: "transparent", stroke: c.boxStroke },
		{ label: L.primary, fill: c.amberFill, stroke: c.amber },
		{ label: L.pod, fill: c.blueFill, stroke: c.blue },
	]);

	const state = (row: number, col: number): CellState => {
		if (t < 200 + row * 350) return "hidden";
		if (step >= 1 && col === 0) return "primary";
		if (step < 2 || col === 0) return "empty";
		return t >= UNTIL[1] + 200 + (row * (IPS_PER_ENI - 1) + col - 1) * 36 ? "pod" : "empty";
	};
	eniGrid(ctx, c, w, top, ENIS, state);

	formula(ctx, c, w, top + ENIS * ROW_HEIGHT + 16, FORMULAS[step]);

	const bw = Math.min(150, (w - 32) / 2);
	const y = top + ENIS * ROW_HEIGHT + 60;
	const [first, second] = L.boxes[step];
	const accent = step === 1 ? c.amber : c.blue;
	box(ctx, c, w / 2 - bw / 2 - 4, y, bw, 40, first[0], first[1], accent);
	box(ctx, c, w / 2 + bw / 2 + 4, y, bw, 40, second[0], second[1], step === 5 ? c.red : step === 2 ? c.amber : accent);

	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, TERMS[step]);
	caption(ctx, c, L.captions[step], w, HEIGHT - 22);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function MaxPodsDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

import { box, CanvasFigure, caption, path, pill, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { cmd, err, ok, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { palette } from "@/materials/shared";

// Pod가 뜨는 네 단계와, 멈춘 단계를 STATUS와 Events로 찾아가는 순서를 보여 주는 애니메이션.
const HEIGHT = 230;
const CARD = 3400;
const CARDS = 6;
const CYCLE = CARD * CARDS;
const TERM_TOP = 96;
const TERM_ROWS = 4;
const STAGES = 4;
const GAP = 10;
const BOX_HEIGHT = 44;
const BOX_Y = 58;
// 카드마다 Pod가 어느 단계까지 가는지. 3은 끝까지 간 정상 경우다.
const STOPS = [3, 0, 0, 0, 1, 2] as const;
const STATUS = ["Running", "Pending", "Pending", "Pending", "ContainerCreating", "ImagePullBackOff"] as const;
const GET = cmd("$ kubectl get pod web");
const DESCRIBE = cmd("$ kubectl describe pod web");
const TERMS = [
	[GET, ok("web   1/1   Running"), DESCRIBE, out("Events: Scheduled, Pulled, Created, Started")],
	[GET, err("web   0/1   Pending"), DESCRIBE, err("0/3 nodes are available: 3 Insufficient memory.")],
	[GET, err("web   0/1   Pending"), DESCRIBE, err("0/3 nodes are available: 3 Too many pods.")],
	[GET, err("web   0/1   Pending"), DESCRIBE, err("3 node(s) had untolerated taint")],
	[GET, err("web   0/1   ContainerCreating"), DESCRIBE, err("failed to assign an IP address to container")],
	[GET, err("web   0/1   ImagePullBackOff"), DESCRIBE, err('Failed to pull image "web:1.0": ... i/o timeout')],
];
const LABELS = {
	ko: {
		captions: [
			"① Pod는 네 단계를 지나 Running이 된다. 막히면 STATUS와 Events가 멈춘 곳을 알려 준다",
			"② 요청값 합이 할당 가능량을 넘었다. describe node의 Allocated resources를 본다",
			"③ 노드의 Pod 상한에 닿았다. 노드를 늘리거나 ENI와 IP가 많은 인스턴스로 바꾼다",
			"④ 테인트를 허용하지 않았거나 라벨이 맞지 않는다. Pod의 tolerations와 nodeSelector를 본다",
			"⑤ 노드는 정해졌지만 IP를 못 받았다. 서브넷의 남은 IP와 aws-node 로그를 본다",
			"⑥ 이미지를 받지 못한다. NAT 게이트웨이나 VPC 엔드포인트 경로, 이미지 이름과 권한을 본다",
		],
		stages: [
			["스케줄러", "노드 고르기"],
			["VPC CNI", "IP 받기"],
			["kubelet", "이미지 받기"],
			["컨테이너", "실행"],
		],
		aria: "Pod가 뜨는 네 단계인 스케줄러의 노드 고르기, VPC CNI의 IP 받기, kubelet의 이미지 받기, 컨테이너 실행을 차례로 그린 애니메이션. 스케줄러에서 멈추면 STATUS가 Pending이고 Events에 Insufficient memory, Too many pods, untolerated taint 같은 이유가 나온다. IP를 못 받으면 ContainerCreating에 멈추고 failed to assign an IP address to container가 나온다. 이미지를 못 받으면 ImagePullBackOff가 된다. 원인마다 어디를 볼지 자막으로 알려 준다.",
	},
	en: {
		captions: [
			"① A Pod passes four stages to reach Running. If stuck, STATUS and Events show where it stopped",
			"② Total requests exceed allocatable. Check Allocated resources in describe node",
			"③ The node hit its Pod limit. Add nodes or switch to an instance with more ENIs and IPs",
			"④ The taint isn't tolerated or the label doesn't match. Check the Pod's tolerations and nodeSelector",
			"⑤ It has a node but no IP. Check the subnet's remaining IPs and the aws-node logs",
			"⑥ It can't get the image. Check the NAT gateway or VPC endpoint path, the image name, and permissions",
		],
		stages: [
			["Scheduler", "Pick a node"],
			["VPC CNI", "Get an IP"],
			["kubelet", "Pull image"],
			["Container", "Run"],
		],
		aria: "An animation drawing the four stages of starting a Pod in turn: the scheduler picks a node, the VPC CNI gives an IP, the kubelet pulls the image, and the container runs. If it stops at the scheduler, STATUS is Pending and Events give a reason such as Insufficient memory, Too many pods, or untolerated taint. Without an IP it stops at ContainerCreating with failed to assign an IP address to container. Without the image it becomes ImagePullBackOff. The captions say where to look for each cause.",
	},
};
type Lang = keyof typeof LABELS;

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const card = Math.floor(t / CARD);
	const stop = STOPS[card];
	const healthy = card === 0;
	const start = card * CARD;
	const bw = Math.min(130, (w - 16 - GAP * (STAGES - 1)) / STAGES);
	const left = (w - bw * STAGES - GAP * (STAGES - 1)) / 2;
	const centers = Array.from({ length: STAGES }, (_, i) => left + i * (bw + GAP) + bw / 2);
	// 앞 단계부터 차례로 불을 켜고, 멈춘 단계는 빨갛게 표시한다.
	const p = seg(t, start + 100, start + 1300);
	const settled = p >= 1;
	const reached = Math.min(stop, Math.floor(p * (stop + 1)));

	centers.forEach((x, i) => {
		if (i < STAGES - 1) path(ctx, [[x + bw / 2, BOX_Y], [centers[i + 1] - bw / 2, BOX_Y]], i < reached ? c.green : c.line);
		const stroke = i < reached ? c.green : i > reached ? c.boxStroke : !settled ? c.blue : healthy ? c.green : c.red;
		box(ctx, c, x, BOX_Y, bw, BOX_HEIGHT, L.stages[i][0], L.stages[i][1], stroke);
	});

	if (settled) {
		const color = healthy ? c.green : c.red;
		pill(ctx, w, centers[stop], 18, STATUS[card], color, healthy ? c.greenFill : c.redFill);
	}

	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, TERMS[card]);
	caption(ctx, c, L.captions[card], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function PodTriageDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

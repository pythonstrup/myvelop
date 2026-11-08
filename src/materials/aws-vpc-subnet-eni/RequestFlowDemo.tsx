import { along, box, CanvasFigure, caption, cross, dot, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { palette } from "@/materials/shared";

// 사용자 요청이 퍼블릭 서브넷의 로드 밸런서를 거쳐 프라이빗 서브넷의 앱으로 가는 길을 보여 주는 애니메이션.
const HEIGHT = 348;
const UNTIL = [2600, 4600, 7400, 10200] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const LABELS = {
	ko: {
		captions: [
			"① 사용자의 요청은 인터넷 게이트웨이를 지나 로드 밸런서에 닿는다",
			"② 로드 밸런서가 요청을 프라이빗 서브넷의 앱으로 넘긴다",
			"③ 앱의 응답은 로드 밸런서를 거쳐 사용자에게 돌아간다",
			"④ 앱은 사설 IP만 있어서 인터넷에서 직접 접속할 수 없다",
		],
		pub: "퍼블릭 서브넷",
		pri: "프라이빗 서브넷",
		user: "사용자",
		igw: "인터넷 게이트웨이",
		lb: "로드 밸런서",
		lbSub: "공인 IP 있음",
		pod: "앱 Pod",
		podSub: "사설 IP만",
		blocked: "직접 접속 불가",
		aria: "VPC 위쪽에 인터넷 게이트웨이, 그 아래 퍼블릭 서브넷에 공인 IP가 있는 로드 밸런서, 맨 아래 프라이빗 서브넷에 사설 IP만 있는 앱 Pod 두 개를 둔 애니메이션. 사용자의 요청은 인터넷 게이트웨이를 지나 로드 밸런서에 닿고, 로드 밸런서가 앱 Pod로 넘긴다. 응답은 로드 밸런서를 거쳐 사용자에게 돌아간다. 인터넷에서 앱 Pod로 직접 접속하려는 연결은 VPC에 닿지 못한다.",
	},
	en: {
		captions: [
			"① The user's request passes through the internet gateway and reaches the load balancer",
			"② The load balancer forwards the request to the app in the private subnet",
			"③ The app's response goes back to the user through the load balancer",
			"④ The app has only a private IP, so it can't be reached directly from the internet",
		],
		pub: "Public subnet",
		pri: "Private subnet",
		user: "User",
		igw: "Internet gateway",
		lb: "Load balancer",
		lbSub: "Has a public IP",
		pod: "App Pod",
		podSub: "Private IP only",
		blocked: "No direct access",
		aria: "An animation with an internet gateway at the top of a VPC, a public subnet below it holding a load balancer with a public IP, and a private subnet at the bottom holding two app Pods with only private IPs. The user's request passes through the internet gateway to the load balancer, which forwards it to an app Pod. The response goes back to the user through the load balancer. A connection trying to reach an app Pod directly from the internet does not reach the VPC.",
	},
};
type Lang = keyof typeof LABELS;

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const cx = w / 2;
	const leftX = Math.max(w * 0.3, 70);
	const rightX = Math.min(w * 0.7, w - 70);
	const bw = Math.min(130, w * 0.36);
	const bh = 40;
	const userY = 24;
	const igwY = 80;
	const lbY = 158;
	const podY = 262;

	region(ctx, c, 8, igwY, w - 16, 228, "VPC");
	region(ctx, c, 20, 112, w - 40, 84, L.pub, { fill: c.boxFill });
	region(ctx, c, 20, 210, w - 40, 88, L.pri, { fill: c.boxFill });

	const userBottom: Pt = [cx, userY + 16];
	const igwTop: Pt = [cx, igwY - 16];
	const igwBottom: Pt = [cx, igwY + 16];
	const lbTop: Pt = [cx, lbY - bh / 2];
	const lbBottom: Pt = [cx, lbY + bh / 2];
	const podA: Pt = [leftX, podY - bh / 2];
	const podB: Pt = [rightX, podY - bh / 2];
	// 앱으로 바로 가려는 연결. VPC 경계(igwY)에서 멈춘다.
	const directFrom: Pt = [cx + 60, userY];
	const directTo: Pt = [rightX + bw / 4, podY - bh / 2];
	const directHit: Pt = [directFrom[0] + ((directTo[0] - directFrom[0]) * (igwY - userY)) / (directTo[1] - userY), igwY];

	for (const line of [
		[userBottom, igwTop],
		[igwBottom, lbTop],
		[lbBottom, podA],
		[lbBottom, podB],
	] as const)
		path(ctx, line, c.line);
	if (step === 3) path(ctx, [directFrom, directTo], c.amber, true, 0.6);

	const route = step === 0 ? c.blue : step === 2 ? c.green : c.boxStroke;
	box(ctx, c, cx, userY, 120, 32, L.user, "", route);
	box(ctx, c, cx, igwY, 120, 32, L.igw, "", route);
	box(ctx, c, cx, lbY, bw, bh, L.lb, L.lbSub, step === 1 ? c.blue : route);
	box(ctx, c, leftX, podY, bw, bh, L.pod, L.podSub, step === 1 ? c.blue : step === 2 ? c.green : c.boxStroke);
	box(ctx, c, rightX, podY, bw, bh, L.pod, L.podSub);

	if (step === 0) {
		const [x, y] = along([userBottom, igwTop, igwBottom, lbTop], seg(t, 300, 2200));
		dot(ctx, x, y, c.blue);
	} else if (step === 1) {
		const [x, y] = along([lbBottom, podA], seg(t, UNTIL[0] + 200, UNTIL[0] + 1600));
		dot(ctx, x, y, c.blue);
	} else if (step === 2) {
		const [x, y] = along([podA, lbBottom, lbTop, igwBottom, igwTop, userBottom], seg(t, UNTIL[1] + 200, UNTIL[1] + 2400));
		dot(ctx, x, y, c.green);
	} else {
		const p = seg(t, UNTIL[2] + 200, UNTIL[2] + 1300);
		if (p < 1) {
			const [x, y] = along([directFrom, directHit], p);
			dot(ctx, x, y, c.amber);
		} else {
			cross(ctx, directHit[0], directHit[1], c.red);
			pill(ctx, w, directHit[0] + 52, 58, L.blocked, c.red, c.redFill);
		}
	}

	caption(ctx, c, L.captions[step], w, HEIGHT - 22);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function RequestFlowDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

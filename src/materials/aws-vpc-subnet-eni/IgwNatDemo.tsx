import { along, box, CanvasFigure, caption, cross, dot, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { palette } from "@/materials/shared";

// 인터넷 게이트웨이는 양방향, NAT 게이트웨이는 나가는 방향만 연다는 것을 차례로 보여 주는 애니메이션.
const HEIGHT = 348;
const UNTIL = [2600, 5200, 7000, 8800, 11400] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const LABELS = {
	ko: {
		captions: [
			"① 공인 IP가 있는 서버는 인터넷 게이트웨이로 나간다",
			"② 밖에서 먼저 들어올 수도 있다. 양방향이다",
			"③ 프라이빗 서브넷의 표가 패킷을 NAT로 보낸다",
			"④ NAT가 있는 퍼블릭 서브넷의 표가 다시 인터넷 게이트웨이로 보낸다",
			"⑤ 밖에서 먼저 들어오는 연결은 NAT가 받지 않는다",
		],
		pub: "퍼블릭 서브넷",
		pri: "프라이빗 서브넷",
		internet: "인터넷",
		igw: "인터넷 게이트웨이",
		web: "웹 서버",
		webSub: "공인 IP 있음",
		nat: "NAT 게이트웨이",
		server: "서버",
		serverSub: "사설 IP만",
		blocked: "들어오는 연결 차단",
		aria: "VPC 위쪽에 인터넷 게이트웨이, 그 아래 퍼블릭 서브넷에 공인 IP가 있는 웹 서버와 NAT 게이트웨이, 맨 아래 프라이빗 서브넷에 사설 IP만 있는 서버를 둔 애니메이션. 웹 서버는 인터넷 게이트웨이로 나갈 수도 있고 밖에서 들어온 연결을 받을 수도 있다. 프라이빗 서버의 패킷은 프라이빗 서브넷의 라우팅 테이블을 따라 NAT 게이트웨이로 가고, 퍼블릭 서브넷의 라우팅 테이블을 따라 인터넷 게이트웨이로 나간다. 밖에서 먼저 들어오려는 연결은 NAT 게이트웨이에서 막힌다.",
	},
	en: {
		captions: [
			"① A server with a public IP goes out through the internet gateway",
			"② Connections can also start from outside. It works both ways",
			"③ The private subnet's route table sends the packet to the NAT",
			"④ The route table of the NAT's public subnet sends it on to the internet gateway",
			"⑤ The NAT does not accept connections started from outside",
		],
		pub: "Public subnet",
		pri: "Private subnet",
		internet: "Internet",
		igw: "Internet gateway",
		web: "Web server",
		webSub: "Has a public IP",
		nat: "NAT gateway",
		server: "Server",
		serverSub: "Private IP only",
		blocked: "Inbound connection blocked",
		aria: "An animation with an internet gateway at the top of a VPC, a public subnet below it holding a web server with a public IP and a NAT gateway, and a private subnet at the bottom holding a server with only a private IP. The web server can go out through the internet gateway and can accept connections from outside. The private server's packets follow the private subnet's route table to the NAT gateway, then the public subnet's route table out through the internet gateway. A connection started from outside is blocked at the NAT gateway.",
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
	const netY = 24;
	const igwY = 80;
	const pubY = 158;
	const priY = 262;

	region(ctx, c, 8, igwY, w - 16, 228, "VPC");
	region(ctx, c, 20, 112, w - 40, 84, L.pub, { fill: c.boxFill });
	region(ctx, c, 20, 210, w - 40, 88, L.pri, { fill: c.boxFill });

	const igwTop: Pt = [cx, igwY - 16];
	const igwBottom: Pt = [cx, igwY + 16];
	const net: Pt = [cx, netY + 16];
	const web: Pt = [leftX, pubY - bh / 2];
	const natTop: Pt = [rightX, pubY - bh / 2];
	const natBottom: Pt = [rightX, pubY + bh / 2];
	const server: Pt = [rightX, priY - bh / 2];

	for (const seg2 of [
		[web, igwBottom],
		[natTop, igwBottom],
		[server, natBottom],
		[igwTop, net],
	] as const)
		path(ctx, seg2, c.line);

	const webOn = step <= 1;
	const natOn = step === 2 || step === 3;
	const blocked = step === 4 && t >= UNTIL[3] + 1500;
	box(ctx, c, cx, netY, 120, 32, L.internet);
	box(ctx, c, cx, igwY, Math.min(150, w - 40), 32, L.igw, "", webOn || step === 3 ? c.green : c.boxStroke);
	box(ctx, c, leftX, pubY, bw, bh, L.web, L.webSub, webOn ? c.blue : c.boxStroke);
	box(ctx, c, rightX, pubY, bw, bh, L.nat, "Elastic IP", blocked ? c.red : natOn ? c.blue : c.boxStroke);
	box(ctx, c, rightX, priY, bw, bh, L.server, L.serverSub, step === 2 ? c.blue : c.boxStroke);

	if (step === 0) {
		const [x, y] = along([web, igwBottom, igwTop, net], seg(t, 300, 2000));
		dot(ctx, x, y, c.blue);
	} else if (step === 1) {
		const [x, y] = along([net, igwTop, igwBottom, web], seg(t, UNTIL[0] + 300, UNTIL[0] + 2000));
		dot(ctx, x, y, c.green);
	} else if (step === 2) {
		const [x, y] = along([server, natBottom], seg(t, UNTIL[1] + 200, UNTIL[1] + 1400));
		dot(ctx, x, y, c.blue);
		pill(ctx, w, leftX, priY, "0.0.0.0/0 → NAT", c.blue, c.blueFill, seg(t, UNTIL[1], UNTIL[1] + 300));
	} else if (step === 3) {
		const [x, y] = along([natBottom, natTop, igwBottom, igwTop, net], seg(t, UNTIL[2] + 200, UNTIL[2] + 1600));
		dot(ctx, x, y, c.blue);
		pill(ctx, w, (leftX + rightX) / 2, igwY + 34, "0.0.0.0/0 → IGW", c.green, c.greenFill, seg(t, UNTIL[2], UNTIL[2] + 300));
	} else {
		const p = seg(t, UNTIL[3] + 200, UNTIL[3] + 1500);
		if (p < 1) {
			const [x, y] = along([net, igwTop, igwBottom, natTop], p);
			dot(ctx, x, y, c.amber);
		} else {
			cross(ctx, natTop[0], natTop[1] - 8, c.red);
			pill(ctx, w, rightX, pubY + bh / 2 + 14, L.blocked, c.red, c.redFill);
		}
	}

	caption(ctx, c, L.captions[step], w, HEIGHT - 22);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function IgwNatDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

import { box, CanvasFigure, caption, cross, dot, path, pill, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type Colors, ease, FONT, lerp, palette } from "@/materials/shared";

// 같은 요청과 응답을 보안 그룹과 네트워크 ACL에 보내, 연결을 기억하는 쪽만 응답을 내보내는 것을 견주는 애니메이션.
const HEIGHT = 288;
const CYCLE = 8000;
const LABELS = {
	ko: {
		captions: [
			"① 요청은 인바운드 443 규칙에 걸려 둘 다 들어간다",
			"② 보안 그룹은 이 연결을 기억해 둔다",
			"③ 응답이 나간다. 나가는 규칙은 둘 다 없다",
			"④ 보안 그룹은 기억한 연결이라 내보내고, ACL은 막는다",
		],
		sg: "보안 그룹",
		acl: "네트워크 ACL",
		rules: "인바운드 443 허용 · 아웃바운드 규칙 없음",
		client: "클라이언트",
		node: "노드",
		remembered: "연결 기억",
		allowed: "443 허용",
		noRule: "나가는 규칙 없음",
		aria: "인바운드 443만 허용하고 아웃바운드 규칙은 없는 보안 그룹과 네트워크 ACL을 위아래로 두고, 클라이언트가 노드로 요청을 보내는 애니메이션. 요청은 둘 다 통과하고, 보안 그룹은 그 연결을 기억한다. 노드의 응답이 나갈 때 보안 그룹은 기억한 연결의 응답이라 내보내고, 네트워크 ACL은 나가는 규칙이 없어 막는다.",
	},
	en: {
		captions: [
			"① The request matches the inbound 443 rule and enters through both",
			"② The security group remembers this connection",
			"③ The response goes out. Neither has an outbound rule",
			"④ The security group lets out a remembered connection, the ACL blocks it",
		],
		sg: "Security group",
		acl: "Network ACL",
		rules: "Inbound 443 allowed · no outbound rules",
		client: "Client",
		node: "Node",
		remembered: "Connection remembered",
		allowed: "443 allowed",
		noRule: "No outbound rule",
		aria: "An animation with a security group above and a network ACL below, each allowing only inbound 443 with no outbound rules, as a client sends a request to a node. The request passes both, and the security group remembers the connection. When the node's response goes out, the security group lets it through as the response to a remembered connection, and the network ACL blocks it because there is no outbound rule.",
	},
};
type Lang = keyof typeof LABELS;

function lane(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, c: Colors, w: number, t: number, cy: number, stateful: boolean) {
	const bw = Math.min(100, w * 0.24);
	const left = 8 + bw / 2;
	const right = w - 8 - bw / 2;
	const wall = w / 2;

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 11.5px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(stateful ? L.sg : L.acl, 8, cy - 52);
	ctx.font = `400 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "right";
	ctx.fillText(L.rules, w - 8, cy - 52);

	path(ctx, [[left + bw / 2 + 4, cy], [right - bw / 2 - 4, cy]], c.line);
	const blocked = !stateful && t >= 4600;
	const passedBack = stateful && t >= 4600;
	ctx.beginPath();
	ctx.roundRect(wall - 6, cy - 30, 12, 60, 3);
	ctx.fillStyle = blocked ? c.redFill : passedBack ? c.greenFill : c.boxFill;
	ctx.fill();
	ctx.strokeStyle = blocked ? c.red : passedBack ? c.green : c.boxStroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();

	box(ctx, c, left, cy, bw, 40, L.client, "", stateful && t >= 5500 ? c.green : c.boxStroke);
	box(ctx, c, right, cy, bw, 40, L.node, ":443");

	// 기억해 둔 연결
	if (stateful && t >= 1500) pill(ctx, w, wall, cy + 44, L.remembered, c.green, t >= 3800 ? c.greenFill : c.boxFill, seg(t, 1500, 1800));
	if (t >= 1000 && t < 2400) pill(ctx, w, wall, cy - 22 - 16, L.allowed, c.green, c.greenFill);

	if (t < 2400) {
		const x = t < 1500 ? lerp(left + bw / 2, wall, ease(seg(t, 0, 1000))) : lerp(wall, right - bw / 2, ease(seg(t, 1500, 2400)));
		dot(ctx, x, cy, c.blue);
	} else if (t >= 2900 && t < 3800) {
		dot(ctx, lerp(right - bw / 2, wall + 10, ease(seg(t, 2900, 3800))), cy, c.amber);
	} else if (t >= 3800 && stateful && t < 5500) {
		dot(ctx, lerp(wall + 10, left + bw / 2, ease(seg(t, 4600, 5500))), cy, c.amber);
	} else if (t >= 3800 && !stateful) {
		if (t < 4600) dot(ctx, wall + 10, cy, c.amber);
		else {
			cross(ctx, wall + 16, cy, c.red);
			pill(ctx, w, wall, cy - 22 - 16, L.noRule, c.red, c.redFill);
		}
	}
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	lane(L, ctx, c, w, t, 74, true);
	lane(L, ctx, c, w, t, 192, false);
	const step = t < 1500 ? 0 : t < 2900 ? 1 : t < 4600 ? 2 : 3;
	caption(ctx, c, L.captions[step], w, HEIGHT - 22);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function SecurityGroupDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

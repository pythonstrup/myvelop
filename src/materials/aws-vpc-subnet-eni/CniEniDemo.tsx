import { along, CanvasFigure, caption, MONO, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type Colors, FONT, palette } from "@/materials/shared";

// VPC CNI가 노드에 ENI를 한 장씩 더 꽂고 보조 IP를 Pod에 나눠 주다가, 장수와 IP가 다 차면 더는 못 주는 애니메이션.
// 숫자는 예시로 줄였다: 카드 3장, 장마다 IP 3개(주 IP 1 + 보조 IP 2).
const HEIGHT = 312;
const CYCLE = 10600;
const CARDS = [
	{ name: "eth0", ips: ["10.0.10.7", "10.0.10.21", "10.0.10.22"], attach: -1 },
	{ name: "eth1", ips: ["10.0.10.8", "10.0.10.31", "10.0.10.32"], attach: 2600 },
	{ name: "eth2", ips: ["10.0.10.9", "10.0.10.41", "10.0.10.42"], attach: 5200 },
] as const;
// Pod마다 도착 시각과 받을 자리 [카드, 칸]. 마지막 Pod는 자리가 없다.
const PODS: { at: number; slot: readonly [number, number] | null }[] = [
	{ at: 600, slot: [0, 1] },
	{ at: 1500, slot: [0, 2] },
	{ at: 3200, slot: [1, 1] },
	{ at: 4100, slot: [1, 2] },
	{ at: 5800, slot: [2, 1] },
	{ at: 6700, slot: [2, 2] },
	{ at: 8000, slot: null },
];
const TRIP = 800;
const LABELS = {
	ko: {
		captions: [
			"① Pod는 카드의 보조 IP를 하나씩 받는다. 주 IP는 카드 몫이다",
			"② IP가 떨어지면 VPC CNI가 카드를 한 장 더 꽂는다",
			"③ 꽂을 수 있는 장수까지 늘려 간다",
			"④ 카드도 IP도 다 쓰면 새 Pod는 IP를 받지 못한다",
		],
		node: "노드 (EC2)",
		example: "예시: 카드 3장 · 장마다 IP 3개",
		primary: "주 IP",
		secondary: "보조 IP",
		empty: "빈 자리",
		noIp: "IP 없음",
		aria: "노드 하나에 ENI를 세 장까지 꽂을 수 있고, 장마다 주 IP 하나와 보조 IP 두 개가 있다고 줄여 그린 애니메이션. 새 Pod가 뜰 때마다 eth0의 보조 IP를 하나씩 받는다. eth0의 보조 IP가 떨어지면 VPC CNI가 eth1을 꽂고, 다음에 eth2를 꽂는다. 주 IP는 Pod에 주지 않는다. 세 장의 보조 IP를 다 쓴 뒤에 온 일곱 번째 Pod는 IP를 받지 못한다.",
	},
	en: {
		captions: [
			"① Each Pod takes one secondary IP from a card. The primary IP stays with the card",
			"② When IPs run out, the VPC CNI attaches another card",
			"③ It keeps adding cards up to the allowed number",
			"④ With every card and IP used, a new Pod cannot get an IP",
		],
		node: "Node (EC2)",
		example: "Example: 3 cards · 3 IPs per card",
		primary: "Primary IP",
		secondary: "Secondary IP",
		empty: "Empty",
		noIp: "no IP",
		aria: "An animation simplified to a node that can hold up to three ENIs, each with one primary IP and two secondary IPs. Each new Pod takes one secondary IP on eth0. When eth0 runs out of secondary IPs, the VPC CNI attaches eth1, then eth2. Primary IPs are not given to Pods. The seventh Pod, arriving after the secondary IPs on all three cards are used, cannot get an IP.",
	},
};
type Lang = keyof typeof LABELS;

function slotBox(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, w: number, h: number, top: string, ip: string, kind: "primary" | "empty" | "pod") {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 6);
	ctx.fillStyle = kind === "pod" ? c.greenFill : c.boxFill;
	ctx.fill();
	ctx.strokeStyle = kind === "pod" ? c.green : c.boxStroke;
	ctx.lineWidth = 1;
	ctx.save();
	if (kind === "empty") ctx.setLineDash([3, 3]);
	ctx.stroke();
	ctx.restore();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `600 10px ${FONT}`;
	ctx.fillStyle = kind === "pod" ? c.green : c.sub;
	ctx.fillText(top, x + w / 2, y + h / 2 - 7);
	ctx.font = `500 10.5px ${MONO}`;
	ctx.fillStyle = kind === "empty" ? c.sub : c.text;
	ctx.fillText(ip, x + w / 2, y + h / 2 + 7);
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const labelW = 44;
	const x0 = 20 + labelW + 8;
	const slotW = Math.min(130, (w - 20 - x0 - 12) / 3);
	const rowY = (r: number) => 64 + r * 54;
	const slotX = (k: number) => x0 + k * (slotW + 6);
	const spawn: Pt = [w / 2, 262];

	region(ctx, c, 8, 30, w - 16, 196, L.node);
	ctx.textAlign = "right";
	ctx.textBaseline = "top";
	ctx.font = `400 10px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(L.example, w - 16, 36);

	CARDS.forEach((card, r) => {
		const on = card.attach < 0 ? 1 : seg(t, card.attach, card.attach + 600);
		const y = rowY(r);
		ctx.save();
		ctx.globalAlpha = 0.35 + 0.65 * on;
		ctx.translate((1 - on) * 24, 0);
		ctx.beginPath();
		ctx.roundRect(20, y, labelW, 44, 6);
		ctx.fillStyle = on >= 1 ? c.blueFill : c.boxFill;
		ctx.fill();
		ctx.strokeStyle = on >= 1 ? c.blue : c.boxStroke;
		ctx.stroke();
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `600 11px ${MONO}`;
		ctx.fillStyle = on >= 1 ? c.blue : c.sub;
		ctx.fillText(card.name, 20 + labelW / 2, y + 22);
		card.ips.forEach((ip, k) => {
			const pod = PODS.findIndex((p) => p.slot?.[0] === r && p.slot?.[1] === k);
			const filled = pod >= 0 && t >= PODS[pod].at + TRIP;
			const kind = k === 0 ? "primary" : filled ? "pod" : "empty";
			const top = k === 0 ? L.primary : filled ? `Pod ${pod + 1}` : L.secondary;
			slotBox(ctx, c, slotX(k), y, slotW, 44, top, on > 0 ? ip : L.empty, on > 0 ? kind : "empty");
		});
		ctx.restore();
	});

	// 새 Pod가 아래에서 올라와 자리를 받는다
	PODS.forEach((pod, i) => {
		const p = seg(t, pod.at, pod.at + TRIP);
		if (p <= 0) return;
		if (pod.slot) {
			if (p >= 1) return;
			const target: Pt = [slotX(pod.slot[1]) + slotW / 2, rowY(pod.slot[0]) + 22];
			const [x, y] = along([spawn, target], p);
			pill(ctx, w, x, y, `Pod ${i + 1}`, c.green, c.greenFill);
		} else {
			pill(ctx, w, spawn[0], spawn[1], `Pod ${i + 1} · ${L.noIp}`, c.red, c.redFill, p);
		}
	});

	const step = t < 2600 ? 0 : t < 5200 ? 1 : t < 8000 ? 2 : 3;
	caption(ctx, c, L.captions[step], w, HEIGHT - 22);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function CniEniDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

import { CanvasFigure, caption, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { cmd, ok, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { type Colors, FONT, palette } from "@/materials/shared";

// 노드 전체 용량에서 예약분을 떼어 할당 가능량이 남는 과정을 Kubernetes 문서의 예시 값으로 보여 주는 애니메이션.
const HEIGHT = 322;
const UNTIL = [1900, 4100, 6300, 9100, 12800] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const TERM_TOP = 204;
const TERM_ROWS = 3;
const CPU_LEFT = ["16 CPU", "15 CPU", "14.5 CPU", "14.5 CPU", "14.5 CPU"] as const;
const MEMORY_LEFT = ["32Gi", "30Gi", "29Gi", "28.5Gi", "28.5Gi"] as const;
const TERMS = [
	[out("cpu     16"), out("memory  32Gi")],
	[out("cpu     16 - 1 = 15"), out("memory  32 - 2 = 30Gi")],
	[out("cpu     16 - 1 - 0.5 = 14.5"), out("memory  32 - 2 - 1 = 29Gi")],
	[out("cpu     16 - 1 - 0.5 = 14.5"), out("memory  32 - 2 - 1 - 0.5 = 28.5Gi")],
	[cmd("$ kubectl describe node my-node"), out("Capacity:     cpu 16      memory 32Gi"), ok("Allocatable:  cpu 14500m  memory 28.5Gi")],
];
const LABELS = {
	ko: {
		captions: [
			"① 노드 전체 용량(capacity)이 16 CPU, 32Gi라고 하자",
			"② kubelet과 컨테이너 런타임이 쓸 몫을 먼저 뗀다(kube-reserved)",
			"③ 운영체제의 데몬이 쓸 몫을 뗀다(system-reserved)",
			"④ 메모리 여유가 500Mi 밑으로 내려가면 kubelet이 Pod를 내보낸다. 그 안전선도 뗀다",
			"⑤ 남은 값이 Pod의 자리다. CPU는 모자라면 느려질 뿐이라 안전선이 없다",
		],
		cpu: "CPU",
		memory: "메모리",
		eviction: "축출 임계값",
		none: "없음",
		aria: "CPU와 메모리 막대 두 개로 그린 애니메이션. 전체 용량 16 CPU, 32Gi에서 kube-reserved 1 CPU와 2Gi, system-reserved 0.5 CPU와 1Gi를 차례로 떼고, 메모리에서만 축출 임계값 500Mi를 더 뗀다. 메모리 여유가 이 값 밑으로 내려가면 kubelet이 Pod를 내보낸다. 남은 14.5 CPU와 28.5Gi가 할당 가능량이고, kubectl describe node의 Capacity와 Allocatable에서 확인할 수 있다.",
	},
	en: {
		captions: [
			"① Say a node's total capacity is 16 CPU and 32Gi",
			"② Take out the share for the kubelet and container runtime (kube-reserved)",
			"③ Take out the share for operating system daemons (system-reserved)",
			"④ If free memory drops below 500Mi, the kubelet evicts Pods. That safety margin comes out too",
			"⑤ What's left is the room for Pods. CPU has no margin, since running short only slows things down",
		],
		cpu: "CPU",
		memory: "Memory",
		eviction: "Eviction threshold",
		none: "None",
		aria: "An animation with two bars, for CPU and memory. From a total capacity of 16 CPU and 32Gi, it takes out kube-reserved at 1 CPU and 2Gi, then system-reserved at 0.5 CPU and 1Gi, and for memory only, an eviction threshold of 500Mi. If free memory drops below that value, the kubelet evicts Pods. The remaining 14.5 CPU and 28.5Gi are allocatable, which kubectl describe node shows under Capacity and Allocatable.",
	},
};
type Lang = keyof typeof LABELS;

// 막대 하나: 왼쪽은 남는 자리, 오른쪽부터 예약분이 차례로 자란다.
function bar(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, w: number, h: number, parts: readonly { share: number; color: string; p: number }[], center: string) {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 6);
	ctx.clip();
	ctx.fillStyle = c.blueFill;
	ctx.fillRect(x, y, w, h);
	let right = x + w;
	for (const part of parts) {
		const pw = w * part.share * part.p;
		right -= pw;
		ctx.fillStyle = part.color;
		ctx.fillRect(right, y, pw, h);
	}
	ctx.restore();
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 6);
	ctx.strokeStyle = c.blue;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 12px ${FONT}`;
	ctx.fillText(center, x + (right - x) / 2, y + h / 2 + 0.5);
}

function row(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, w: number, swatch: string, name: string, value: string, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.fillStyle = swatch;
	ctx.beginPath();
	ctx.roundRect(x, y - 5, 10, 10, 2);
	ctx.fill();
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	ctx.fillStyle = c.text;
	ctx.font = `500 12px ${FONT}`;
	ctx.fillText(name, x + 16, y + 0.5);
	ctx.textAlign = "right";
	ctx.fillText(value, x + w, y + 0.5);
	ctx.restore();
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const x = Math.max(16, (w - 560) / 2);
	const bw = w - x * 2;
	const grow = (i: number) => seg(t, UNTIL[i - 1] + 150, UNTIL[i - 1] + 800);
	const kube = grow(1);
	const sys = grow(2);
	const ev = grow(3);

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.sub;
	ctx.font = `600 11px ${FONT}`;
	ctx.fillText(L.cpu, x, 16);
	bar(ctx, c, x, 28, bw, 32, [{ share: 1 / 16, color: c.amber, p: kube }, { share: 0.5 / 16, color: c.red, p: sys }], CPU_LEFT[step]);
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.sub;
	ctx.font = `600 11px ${FONT}`;
	ctx.fillText(L.memory, x, 76);
	bar(ctx, c, x, 88, bw, 32, [{ share: 2 / 32, color: c.amber, p: kube }, { share: 1 / 32, color: c.red, p: sys }, { share: 0.5 / 32, color: c.sub, p: ev }], MEMORY_LEFT[step]);

	row(ctx, c, x, 142, bw, c.amber, "kube-reserved", "1 CPU · 2Gi", kube);
	row(ctx, c, x, 164, bw, c.red, "system-reserved", "0.5 CPU · 1Gi", sys);
	row(ctx, c, x, 186, bw, c.sub, L.eviction, `CPU ${L.none} · 500Mi`, ev);

	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, TERMS[step]);
	caption(ctx, c, L.captions[step], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function AllocatableDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

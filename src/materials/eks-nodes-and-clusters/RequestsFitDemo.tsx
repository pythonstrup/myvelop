import { CanvasFigure, caption, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { cmd, err, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { type Colors, FONT, palette } from "@/materials/shared";

// 스케줄러가 실제 사용량이 아니라 요청값 합으로 자리를 세어, 메모리가 비어 있어도 Pod가 Pending이 되는 것을 보여 주는 애니메이션. 값은 설명용이다.
const HEIGHT = 284;
const UNTIL = [2800, 5600, 8200, 11800, 15800] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const TERM_TOP = 150;
const TERM_ROWS = 4;
const ALLOCATABLE = 8;
const SCALE = 10; // 8Gi를 넘치는 부분까지 보이도록 막대 눈금을 10Gi로 잡는다.
const SPEC = [cmd("resources:"), cmd("  requests:"), cmd("    memory: 3Gi")];
const LABELS = {
	ko: {
		captions: [
			"① 메모리 할당 가능량이 8Gi라고 하자. 스케줄러는 실제 사용량이 아니라 요청값으로 자리를 센다",
			"② Pod A가 3Gi를 요청하면 1Gi만 써도 3Gi가 찬 것으로 친다",
			"③ Pod B도 3Gi를 요청한다. 요청값 합은 6Gi, 실제 사용량은 1.5Gi다",
			"④ Pod C의 3Gi는 남은 2Gi에 들어가지 않는다. 메모리가 6.5Gi나 비어 있어도 Pending이다",
			"⑤ 요청값이 크면 자리가 놀고, 작으면 메모리가 모자라 Pod가 쫓겨난다. 실사용에 맞춰 적는다",
		],
		terms: [
			[out("# Pod 스펙에 적는 값"), ...SPEC],
			[out("# Pod A"), ...SPEC],
			[out("# Pod B"), ...SPEC],
			[cmd("$ kubectl describe pod c"), err("0/1 nodes are available: 1 Insufficient memory.")],
			[cmd("$ kubectl describe node my-node"), out("memory  6Gi (75%)   # 요청값 합"), cmd("$ kubectl top node   # metrics-server 필요"), out("my-node  1536Mi     # 실제 사용량")],
		],
		requests: "요청값 합 · 스케줄러가 보는 값",
		usage: "실제 사용량 · 스케줄러가 보지 않는 값",
		allocatable: "할당 가능량 8Gi",
		pending: "C Pending",
		free: "6.5Gi 비어 있음",
		aria: "요청값 합과 실제 사용량을 막대 두 개로 비교하는 애니메이션. 메모리 할당 가능량이 8Gi라고 가정한다. Pod A와 Pod B가 3Gi씩 요청하면 요청값 합은 6Gi지만 실제 사용량은 1.5Gi다. Pod C가 3Gi를 요청하면 합이 9Gi가 되어 8Gi를 넘으므로, 메모리가 6.5Gi 비어 있어도 Insufficient memory로 Pending이 된다. 요청값 합은 kubectl describe node로, 실제 사용량은 kubectl top node로 본다.",
	},
	en: {
		captions: [
			"① Say allocatable memory is 8Gi. The scheduler counts room by requests, not actual usage",
			"② If Pod A requests 3Gi, 3Gi counts as taken even if it only uses 1Gi",
			"③ Pod B also requests 3Gi. Requests total 6Gi, while actual usage is 1.5Gi",
			"④ Pod C's 3Gi doesn't fit in the remaining 2Gi. It stays Pending even with 6.5Gi of memory free",
			"⑤ Requests too high waste room; too low and Pods get evicted when memory runs out. Match real usage",
		],
		terms: [
			[out("# Set in the Pod spec"), ...SPEC],
			[out("# Pod A"), ...SPEC],
			[out("# Pod B"), ...SPEC],
			[cmd("$ kubectl describe pod c"), err("0/1 nodes are available: 1 Insufficient memory.")],
			[cmd("$ kubectl describe node my-node"), out("memory  6Gi (75%)   # total requests"), cmd("$ kubectl top node   # needs metrics-server"), out("my-node  1536Mi     # actual usage")],
		],
		requests: "Total requests · what the scheduler sees",
		usage: "Actual usage · what the scheduler ignores",
		allocatable: "Allocatable 8Gi",
		pending: "C Pending",
		free: "6.5Gi free",
		aria: "An animation comparing total requests and actual usage with two bars. It assumes allocatable memory is 8Gi. If Pod A and Pod B request 3Gi each, requests total 6Gi while actual usage is 1.5Gi. If Pod C requests 3Gi, the total of 9Gi exceeds 8Gi, so it stays Pending with Insufficient memory even though 6.5Gi is free. kubectl describe node shows total requests, and kubectl top node shows actual usage.",
	},
};
type Lang = keyof typeof LABELS;

function segment(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, w: number, h: number, stroke: string, fill: string, label: string, labelSpan = w) {
	if (w <= 0) return;
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 4);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1;
	ctx.stroke();
	if (!label || w < 60) return;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 11.5px ${FONT}`;
	ctx.fillText(label, x + Math.min(w, labelSpan) / 2, y + h / 2 + 0.5);
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const x = Math.max(16, (w - 560) / 2);
	const bw = w - x * 2;
	const gi = (v: number) => (bw * v) / SCALE;
	const a = seg(t, UNTIL[0] + 200, UNTIL[0] + 900);
	const b = seg(t, UNTIL[1] + 200, UNTIL[1] + 900);
	const cPod = seg(t, UNTIL[2] + 200, UNTIL[2] + 900);
	const barY = { requests: 26, usage: 90 };
	const barH = 32;
	const edge = x + gi(ALLOCATABLE);

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.sub;
	ctx.font = `600 11px ${FONT}`;
	ctx.fillText(L.requests, x, 14);
	ctx.fillText(L.usage, x, 78);

	for (const y of [barY.requests, barY.usage]) segment(ctx, c, x, y, gi(ALLOCATABLE), barH, c.boxStroke, c.boxFill, "");

	segment(ctx, c, x, barY.requests, gi(3) * a, barH, c.blue, c.blueFill, "A 3Gi");
	segment(ctx, c, x + gi(3), barY.requests, gi(3) * b, barH, c.blue, c.blueFill, "B 3Gi");
	segment(ctx, c, x + gi(6), barY.requests, gi(3) * cPod, barH, c.red, c.redFill, L.pending, gi(ALLOCATABLE - 6));

	segment(ctx, c, x, barY.usage, gi(1) * a, barH, c.green, c.greenFill, "");
	segment(ctx, c, x + gi(1), barY.usage, gi(0.5) * b, barH, c.green, c.greenFill, "");
	const used = Math.round((a + 0.5 * b) * 10) / 10;
	ctx.textBaseline = "middle";
	if (used > 0) {
		ctx.textAlign = "left";
		ctx.fillStyle = c.text;
		ctx.font = `600 11.5px ${FONT}`;
		ctx.fillText(`${used}Gi`, x + gi(used) + 6, barY.usage + barH / 2 + 0.5);
	}
	if (step >= 3) {
		ctx.textAlign = "center";
		ctx.fillStyle = c.sub;
		ctx.font = `600 11px ${FONT}`;
		ctx.fillText(L.free, x + gi(used + 0.9 + (ALLOCATABLE - used - 0.9) / 2), barY.usage + barH / 2 + 0.5);
	}

	// 할당 가능량 경계선
	ctx.save();
	ctx.strokeStyle = c.amber;
	ctx.lineWidth = 1.5;
	ctx.setLineDash([4, 3]);
	ctx.beginPath();
	ctx.moveTo(edge, barY.requests - 4);
	ctx.lineTo(edge, barY.usage + barH + 4);
	ctx.stroke();
	ctx.restore();
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.amber;
	ctx.font = `600 10.5px ${FONT}`;
	ctx.fillText(L.allocatable, edge, barY.usage + barH + 14);

	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, L.terms[step]);
	caption(ctx, c, L.captions[step], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function RequestsFitDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

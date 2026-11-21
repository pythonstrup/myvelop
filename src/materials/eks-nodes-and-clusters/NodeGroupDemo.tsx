import { along, box, CanvasFigure, caption, cross, dot, path, pill, type Pt, region, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { cmd, err, ok, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { type Colors, FONT, palette } from "@/materials/shared";

// 라벨과 테인트 조합에 따라 Pod가 어느 노드 그룹으로 가는지, 전용 그룹이 차면 어떻게 되는지 보여 주는 애니메이션. 대수와 칸 수는 설명용이다.
const HEIGHT = 384;
const UNTIL = [3000, 5800, 9000, 12000, 14800, 19000] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const TERM_TOP = 250;
const TERM_ROWS = 4;
const SLOTS = 4;
const SLOT = 16;
const SLOT_GAP = 6;
const AFFINITY = "2 node(s) didn't match Pod's node affinity/selector";
const SELECTOR = cmd("nodeSelector: workload=batch");
const TOLERATION = cmd("tolerations:  workload=batch");
const LABELS = {
	ko: {
		captions: [
			"① 전용 노드 그룹에 라벨과 테인트를 붙였다고 하자. 라벨은 고르는 표시, 테인트는 막는 표시다",
			"② 아무 설정 없는 Pod는 테인트에 막혀 공용 노드 그룹으로 간다",
			"③ 라벨만 고른 Pod는 전용 그룹은 테인트에, 공용 그룹은 라벨에 막혀 Pending이다",
			"④ 허용만 단 Pod는 전용 그룹에 갈 수 있을 뿐, 공용 그룹으로 갈 수도 있다",
			"⑤ 라벨을 고르고 허용도 단 Pod만 전용 그룹으로 확실히 간다",
			"⑥ 전용 그룹이 꽉 차면 공용 그룹에 자리가 남아도 Pending이다. 노드를 늘려야 한다",
		],
		terms: [
			[out("# 전용 노드 그룹의 설정"), cmd("labels:  workload=batch"), cmd("taints:  workload=batch:NoSchedule")],
			[out("nodeSelector: 없음"), out("tolerations:  없음"), ok("# 공용 노드 그룹으로 간다")],
			[SELECTOR, out("tolerations:  없음"), err("1 node(s) had untolerated taint"), err(AFFINITY)],
			[out("nodeSelector: 없음"), TOLERATION, ok("# 어느 쪽으로 갈지 스케줄러가 고른다")],
			[SELECTOR, TOLERATION, ok("# 전용 노드 그룹으로만 간다")],
			[cmd("$ kubectl describe pod batch"), err("0/3 nodes are available:"), err("1 Insufficient memory,"), err(AFFINITY)],
		],
		scheduler: "스케줄러",
		common: "공용 노드 그룹",
		dedicated: "전용 노드 그룹",
		node: "노드",
		taint: "라벨 · 테인트",
		maybe: "여기도 가능",
		pending: "Pending",
		aria: "스케줄러 아래에 공용 노드 그룹과, 라벨과 테인트를 붙인 전용 노드 그룹을 둔 애니메이션. 아무 설정 없는 Pod는 테인트에 막혀 공용 그룹으로 간다. 라벨만 고른 Pod는 전용 그룹은 테인트에, 공용 그룹은 라벨에 막혀 Pending이 된다. 허용만 단 Pod는 어느 쪽으로든 갈 수 있다. 라벨을 고르고 허용도 단 Pod만 전용 그룹으로 확실히 간다. 전용 그룹이 꽉 차면 공용 그룹에 자리가 남아도 Insufficient memory와 node affinity 불일치로 Pending이 된다.",
	},
	en: {
		captions: [
			"① Say a dedicated node group has a label and a taint. A label is for choosing; a taint is for blocking",
			"② A Pod with no settings is blocked by the taint and goes to the shared node group",
			"③ A Pod that only selects the label is blocked by the taint and by the shared group's labels, so it's Pending",
			"④ A Pod that only tolerates the taint may go to the dedicated group, but also to the shared one",
			"⑤ Only a Pod that selects the label and tolerates the taint reliably lands on the dedicated group",
			"⑥ When the dedicated group is full, its Pods stay Pending even if the shared group has room. Add nodes",
		],
		terms: [
			[out("# Dedicated node group settings"), cmd("labels:  workload=batch"), cmd("taints:  workload=batch:NoSchedule")],
			[out("nodeSelector: none"), out("tolerations:  none"), ok("# Goes to the shared node group")],
			[SELECTOR, out("tolerations:  none"), err("1 node(s) had untolerated taint"), err(AFFINITY)],
			[out("nodeSelector: none"), TOLERATION, ok("# The scheduler picks either group")],
			[SELECTOR, TOLERATION, ok("# Goes only to the dedicated node group")],
			[cmd("$ kubectl describe pod batch"), err("0/3 nodes are available:"), err("1 Insufficient memory,"), err(AFFINITY)],
		],
		scheduler: "Scheduler",
		common: "Shared node group",
		dedicated: "Dedicated node group",
		node: "Node",
		taint: "Label · taint",
		maybe: "Also possible",
		pending: "Pending",
		aria: "An animation with a shared node group and a dedicated node group, which has a label and a taint, under the scheduler. A Pod with no settings is blocked by the taint and goes to the shared group. A Pod that only selects the label is blocked by the taint on the dedicated group and by the labels on the shared group, so it stays Pending. A Pod that only tolerates the taint can go to either. Only a Pod that selects the label and tolerates the taint reliably lands on the dedicated group. When that group is full, its Pods stay Pending with Insufficient memory and a node affinity mismatch, even if the shared group has room.",
	},
};
type Lang = keyof typeof LABELS;

function slotPoint(cx: number, cy: number, i: number): Pt {
	const total = SLOTS * SLOT + (SLOTS - 1) * SLOT_GAP;
	return [cx - total / 2 + i * (SLOT + SLOT_GAP) + SLOT / 2, cy + 10];
}

function nodeBox(ctx: CanvasRenderingContext2D, c: Colors, cx: number, cy: number, w: number, label: string, filled: number, color: string, fill: string, freeStroke: string) {
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - 27, w, 54, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 11.5px ${FONT}`;
	ctx.fillText(label, cx, cy - 13);
	for (let i = 0; i < SLOTS; i++) {
		const [x, y] = slotPoint(cx, cy, i);
		ctx.beginPath();
		ctx.roundRect(x - SLOT / 2, y - SLOT / 2, SLOT, SLOT, 3);
		ctx.fillStyle = i < filled ? fill : "transparent";
		ctx.fill();
		ctx.strokeStyle = i < filled ? color : freeStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
	}
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const cx = w / 2;
	const rw = (w - 24) / 2;
	const lx = 8 + rw / 2;
	const rx = w - 8 - rw / 2;
	const nw = Math.min(140, rw - 16);
	const regionTop = 66;
	const regionHeight = 176;
	const n1 = 116;
	const n2 = 202;
	const nd = 170;
	const from: Pt = [cx, 40];
	const commonGate: Pt = [lx, regionTop];
	const dedicatedGate: Pt = [rx, regionTop];

	// 단계가 시작되고 1.3초 뒤 Pod가 도착한다.
	const start = step === 0 ? 0 : UNTIL[step - 1];
	const p = seg(t, start + 200, start + 1300);
	const arrived = (i: number) => step > i || (step === i && p >= 1);
	const commonA = 2 + (arrived(1) ? 1 : 0) + (arrived(3) ? 1 : 0);
	const dedicatedFilled = 2 + (arrived(4) ? 1 : 0) + (step === 5 ? 1 : 0);

	box(ctx, c, cx, 24, Math.min(170, w - 40), 32, L.scheduler);
	path(ctx, [from, commonGate], c.line);
	path(ctx, [from, dedicatedGate], c.line);
	region(ctx, c, 8, regionTop, rw, regionHeight, L.common, { fill: c.boxFill });
	region(ctx, c, w - 8 - rw, regionTop, rw, regionHeight, L.dedicated, { stroke: c.amber, fill: c.boxFill });

	nodeBox(ctx, c, lx, n1, nw, L.node, commonA, c.sub, c.boxStroke, step === 5 ? c.green : c.boxStroke);
	nodeBox(ctx, c, lx, n2, nw, L.node, 1, c.sub, c.boxStroke, step === 5 ? c.green : c.boxStroke);
	nodeBox(ctx, c, rx, nd, nw, L.node, dedicatedFilled, c.blue, c.blueFill, c.boxStroke);
	pill(ctx, w, rx, 120, L.taint, c.amber, c.amberFill);

	if (step === 1) {
		cross(ctx, dedicatedGate[0], dedicatedGate[1], c.amber);
		if (p < 1) {
			const [x, y] = along([from, commonGate, slotPoint(lx, n1, 2)], p);
			dot(ctx, x, y, c.sub);
		}
	} else if (step === 2 || step === 5) {
		cross(ctx, commonGate[0], commonGate[1], c.amber);
		if (p < 1) {
			const [x, y] = along([from, dedicatedGate], p);
			dot(ctx, x, y, c.blue);
		} else {
			if (step === 2) cross(ctx, dedicatedGate[0], dedicatedGate[1], c.red);
			pill(ctx, w, rx + Math.min(46, rw / 2 - 30), regionTop - 12, L.pending, c.red, c.redFill);
		}
	} else if (step === 3) {
		if (p < 1) {
			const [x, y] = along([from, commonGate, slotPoint(lx, n1, 3)], p);
			dot(ctx, x, y, c.sub);
			const [gx, gy] = along([from, dedicatedGate], p);
			ctx.save();
			ctx.globalAlpha = 0.4;
			dot(ctx, gx, gy, c.blue);
			ctx.restore();
		}
		pill(ctx, w, rx + Math.min(46, rw / 2 - 30), regionTop - 12, L.maybe, c.blue, c.blueFill, seg(t, start + 300, start + 700));
	} else if (step === 4) {
		cross(ctx, commonGate[0], commonGate[1], c.amber);
		if (p < 1) {
			const [x, y] = along([from, dedicatedGate, slotPoint(rx, nd, 2)], p);
			dot(ctx, x, y, c.blue);
		}
	}

	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, L.terms[step]);
	caption(ctx, c, L.captions[step], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function NodeGroupDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

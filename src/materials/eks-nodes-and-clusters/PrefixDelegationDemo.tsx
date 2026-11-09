import { CanvasFigure, caption, cross, path } from "@/materials/aws-vpc-subnet-eni/canvas";
import { type CellState, eniCell, eniGrid, formula, legend } from "@/materials/eks-nodes-and-clusters/eni-grid";
import { cmd, err, out, terminal } from "@/materials/eks-nodes-and-clusters/terminal";
import { type Colors, FONT, palette } from "@/materials/shared";

// ENI 칸 하나에 IP 하나 대신 /28 묶음을 붙이는 prefix delegation의 효과와 상한, 쪼개진 서브넷의 함정을 보여 주는 애니메이션.
const HEIGHT = 288;
const UNTIL = [3000, 6200, 9600, 12600, 16800] as const;
const CYCLE = UNTIL[UNTIL.length - 1];
const BLOCK = 16;
const GAP = 3;
const ENI_TOP = 28;
const STRIP_TOP = 70;
const TERM_TOP = 150;
const TERM_ROWS = 4;
// 쪼개진 서브넷 예시. 세 묶음 모두 어딘가 쓰이고 있어 통째로 빈 /28이 없다.
const USED = new Set([3, 11, 17, 22, 30, 36, 41, 44, 47]);
const ENABLE = [cmd("$ kubectl set env ds aws-node -n kube-system \\"), cmd("    ENABLE_PREFIX_DELEGATION=true")];
const CIDR_ERROR = [err("InsufficientCidrBlocks: The specified subnet does"), err("not have enough free cidr blocks to satisfy the"), err("request")];
const LABELS = {
	ko: {
		captions: [
			"① 기본은 ENI의 보조 IP 칸 14개에 IP를 하나씩 붙인다. 한 장에 Pod 14개다",
			"② prefix delegation을 켜면 같은 한 칸에 /28 묶음, IP 16개를 붙인다",
			"③ 14칸이면 IP 224개다. 보통 ENI 한 장으로 충분하고, 묶음을 붙이는 데는 1초도 안 걸린다",
			"④ 그래도 Pod 수는 maxPods 상한까지다. 관리형 노드 그룹에서 vCPU 30개 미만이면 110개다",
			"⑤ /28은 연속된 16개 주소여야 한다. 서브넷이 쪼개져 있으면 IP가 남아도 붙지 않는다",
		],
		terms: [
			[out("# VPC CNI 기본값"), out("ENABLE_PREFIX_DELEGATION: false")],
			[...ENABLE, out("# 새 노드 그룹을 만들어 Pod를 옮긴다")],
			[...ENABLE, out("# 새 노드 그룹을 만들어 Pod를 옮긴다")],
			[cmd("$ kubectl describe node my-node | grep pods:"), out("  pods:   110"), out("  pods:   110")],
			[...CIDR_ERROR, out("# 새 서브넷을 쓰거나 서브넷 CIDR을 예약한다")],
		],
		primary: "주 IP",
		single: "IP 1개",
		block: "/28 묶음",
		range: "10.0.10.16/28 · IP 16개",
		formulas: ["14칸 × IP 1개 = 14개", "한 칸 = IP 16개", "14칸 × 16개 = 224개", "maxPods 58 → 110"],
		map: "서브넷의 주소 · 한 줄이 /28 하나",
		stat: "빈 IP 39개, 통째로 빈 /28 0개",
		aria: "ENI 한 장을 15칸으로 그린 애니메이션. 기본 모드에서는 주 IP를 뺀 14칸에 IP를 하나씩 붙여 Pod 14개를 받는다. prefix delegation을 켜면 같은 칸 하나에 /28 묶음, IP 16개를 붙여 14칸이면 IP 224개가 된다. 그래도 관리형 노드 그룹의 maxPods 상한은 그대로여서 vCPU 30개 미만이면 m7i.xlarge의 상한은 58에서 110이 된다. /28은 연속된 16개 주소여야 하므로, 서브넷 주소가 쪼개져 통째로 빈 묶음이 없으면 빈 IP가 39개 있어도 InsufficientCidrBlocks 오류로 실패한다.",
	},
	en: {
		captions: [
			"① By default, each of an ENI's 14 secondary slots holds one IP. That's 14 Pods per ENI",
			"② With prefix delegation, that same slot holds a /28 block of 16 IPs",
			"③ 14 slots give 224 IPs. One ENI is usually enough, and attaching a block typically takes under a second",
			"④ Pods still stop at the maxPods limit. Managed node groups cap it at 110 under 30 vCPUs",
			"⑤ A /28 needs 16 contiguous addresses. In a fragmented subnet it fails even with IPs left",
		],
		terms: [
			[out("# VPC CNI default"), out("ENABLE_PREFIX_DELEGATION: false")],
			[...ENABLE, out("# Then move Pods to a new node group")],
			[...ENABLE, out("# Then move Pods to a new node group")],
			[cmd("$ kubectl describe node my-node | grep pods:"), out("  pods:   110"), out("  pods:   110")],
			[...CIDR_ERROR, out("# Use a new subnet or a subnet CIDR reservation")],
		],
		primary: "Primary IP",
		single: "1 IP",
		block: "/28 block",
		range: "10.0.10.16/28 · 16 IPs",
		formulas: ["14 slots × 1 IP = 14", "1 slot = 16 IPs", "14 slots × 16 = 224", "maxPods 58 → 110"],
		map: "Subnet addresses · each row is one /28",
		stat: "39 free IPs, 0 fully free /28s",
		aria: "An animation drawing one ENI as 15 cells. By default, the 14 cells other than the primary IP hold one IP each, for 14 Pods. With prefix delegation, one cell holds a /28 block of 16 IPs, so 14 cells give 224 IPs. The managed node group's maxPods limit still applies, so under 30 vCPUs an m7i.xlarge goes from 58 to 110. A /28 needs 16 contiguous addresses, so if subnet addresses are fragmented and no block is fully free, it fails with InsufficientCidrBlocks even with 39 free IPs.",
	},
};
type Lang = keyof typeof LABELS;

function cells(ctx: CanvasRenderingContext2D, left: number, top: number, size: number, count: number, style: (i: number) => { fill: string; stroke: string }) {
	for (let i = 0; i < count; i++) {
		const s = style(i);
		ctx.beginPath();
		ctx.roundRect(left + i * (size + GAP), top, size, size, 2);
		ctx.fillStyle = s.fill;
		ctx.fill();
		ctx.strokeStyle = s.stroke;
		ctx.lineWidth = 1;
		ctx.stroke();
	}
}

function label(ctx: CanvasRenderingContext2D, c: Colors, text: string, x: number, y: number) {
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.sub;
	ctx.font = `600 11px ${FONT}`;
	ctx.fillText(text, x, y);
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const step = UNTIL.findIndex((u) => t < u);
	const size = Math.min(16, Math.floor((w - 32 - GAP * (BLOCK - 1)) / BLOCK));
	const stripWidth = size * BLOCK + GAP * (BLOCK - 1);
	const left = (w - stripWidth) / 2;
	const slot = eniCell(w, 1);

	legend(ctx, c, w, 12, [
		{ label: L.primary, fill: c.amberFill, stroke: c.amber },
		{ label: L.single, fill: c.blueFill, stroke: c.blue },
		{ label: L.block, fill: c.greenFill, stroke: c.green },
	]);

	const state = (_row: number, col: number): CellState => {
		if (col === 0) return "primary";
		if (step === 0) return t >= 300 + (col - 1) * 130 ? "pod" : "empty";
		if (step === 4) return "empty";
		if (col === 1) return "warm";
		if (step === 1) return "empty";
		return step > 2 || t >= UNTIL[1] + 200 + (col - 2) * 90 ? "warm" : "empty";
	};
	eniGrid(ctx, c, w, ENI_TOP, 1, state);

	if (step === 4) {
		cross(ctx, slot.x + slot.size / 2, ENI_TOP + slot.size / 2, c.red);
		label(ctx, c, L.map, w / 2, 62);
		for (let row = 0; row < 3; row++) {
			cells(ctx, left, 72 + row * (size + GAP), size, BLOCK, (i) => (USED.has(row * BLOCK + i) ? { fill: c.redFill, stroke: c.red } : { fill: "transparent", stroke: c.boxStroke }));
		}
		label(ctx, c, L.stat, w / 2, 72 + 3 * (size + GAP) + 7);
	} else {
		if (step >= 1) {
			const bottom = ENI_TOP + slot.size;
			path(ctx, [[slot.x, bottom], [left, STRIP_TOP]], c.green, true, 0.7);
			path(ctx, [[slot.x + slot.size, bottom], [left + stripWidth, STRIP_TOP]], c.green, true, 0.7);
			cells(ctx, left, STRIP_TOP, size, BLOCK, () => ({ fill: c.greenFill, stroke: c.green }));
			label(ctx, c, L.range, w / 2, STRIP_TOP + size + 12);
		}
		formula(ctx, c, w, 128, L.formulas[step]);
	}

	terminal(ctx, c, w, TERM_TOP, TERM_ROWS, L.terms[step]);
	caption(ctx, c, L.captions[step], w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function PrefixDelegationDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

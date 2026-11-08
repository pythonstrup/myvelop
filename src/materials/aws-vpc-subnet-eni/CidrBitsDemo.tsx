import { CanvasFigure, caption, MONO, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { ease, FONT, lerp, palette } from "@/materials/shared";

// 32비트 주소에서 고정 비트가 /16 → /19 → /20 → /24로 늘어나며 주소 수가 줄어드는 애니메이션.
const HEIGHT = 216;
const CYCLE = 9000;
// [시각, 접두사 길이]. 사이 구간은 미끄러지듯 옮겨 간다.
const KEYS = [
	[0, 24],
	[600, 16],
	[2200, 16],
	[2800, 19],
	[4400, 19],
	[5000, 20],
	[6600, 20],
	[7200, 24],
	[9000, 24],
] as const;
const LABELS = {
	ko: {
		captions: {
			16: "앞 16비트를 고정하고, 남은 16비트로 주소를 만든다",
			19: "3비트를 더 고정하면 주소는 2³분의 1로 준다",
			20: "1비트를 더 고정하면 다시 절반이 된다",
			24: "/ 뒤 숫자가 클수록 범위는 작아진다",
		} as Record<number, string>,
		count: (exp: string, n: string) => `주소 2${exp} = ${n}개`,
		fixed: (n: number) => `고정 ${n}비트`,
		free: (n: number) => `남는 ${n}비트`,
		scale: "/16 전체와 견준 크기",
		aria: "IPv4 주소 32비트를 칸 32개로 그린 애니메이션. 슬래시 뒤 숫자만큼 앞쪽 칸이 고정되어 파랗게 칠해지고, 남은 칸으로 주소를 만든다. /16에서 /19, /20, /24로 고정 칸이 늘어날 때마다 주소 수는 65,536개에서 8,192개, 4,096개, 256개로 줄고, 아래 막대도 /16 전체에 견준 크기만큼 짧아진다.",
	},
	en: {
		captions: {
			16: "Fix the first 16 bits and build addresses from the remaining 16",
			19: "Fix 3 more bits and the address count drops to 1/2³",
			20: "Fix 1 more bit and it halves again",
			24: "The larger the number after /, the smaller the range",
		} as Record<number, string>,
		count: (exp: string, n: string) => `2${exp} = ${n} addresses`,
		fixed: (n: number) => `${n} bits fixed`,
		free: (n: number) => `${n} bits left`,
		scale: "Size compared with the whole /16",
		aria: "An animation that draws the 32 bits of an IPv4 address as 32 cells. As many leading cells as the number after the slash are fixed and turn blue, and the remaining cells build addresses. As the fixed cells grow from /16 to /19, /20, and /24, the address count drops from 65,536 to 8,192, 4,096, and 256, and the bar below shrinks to its size relative to the whole /16.",
	},
};
type Lang = keyof typeof LABELS;
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => [...String(n)].map((d) => SUP[Number(d)]).join("");

function prefixAt(t: number) {
	const i = KEYS.findIndex(([at]) => t < at);
	const [a, from] = KEYS[i - 1];
	const [b, to] = KEYS[i];
	return { p: lerp(from, to, ease(seg(t, a, b))), target: to };
}

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const { p, target } = prefixAt(t);
	const n = Math.round(p);
	const gap = 8;
	const cell = Math.min(18, (w - 16 - gap * 3) / 32);
	const total = cell * 32 + gap * 3;
	const x0 = (w - total) / 2;
	const cellX = (i: number) => x0 + i * cell + Math.floor(i / 8) * gap;

	// 머리줄: CIDR과 주소 수
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	ctx.font = `600 17px ${MONO}`;
	ctx.fillStyle = c.text;
	ctx.fillText(`10.0.0.0/${n}`, x0, 26);
	ctx.textAlign = "right";
	ctx.font = `600 13px ${FONT}`;
	ctx.fillStyle = c.blue;
	ctx.fillText(L.count(sup(32 - n), (2 ** (32 - n)).toLocaleString("en-US")), x0 + total, 26);

	// 32칸. 고정된 비트는 파랗게 칠한다.
	const top = 52;
	for (let i = 0; i < 32; i++) {
		const f = Math.min(1, Math.max(0, p - i));
		ctx.beginPath();
		ctx.roundRect(cellX(i) + 1, top, cell - 2, 26, 2);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		if (f <= 0) continue;
		ctx.save();
		ctx.globalAlpha = f;
		ctx.fillStyle = c.blueFill;
		ctx.fill();
		ctx.strokeStyle = c.blue;
		ctx.stroke();
		ctx.restore();
	}

	// 칸 아래 괄호: 고정 / 남는 비트
	const split = cellX(Math.min(31, Math.floor(p))) + (p % 1) * cell;
	const end = cellX(31) + cell;
	const brace = (a: number, b: number, color: string, label: string) => {
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(a + 1, 84);
		ctx.lineTo(a + 1, 90);
		ctx.lineTo(b - 1, 90);
		ctx.lineTo(b - 1, 84);
		ctx.stroke();
		ctx.textAlign = "center";
		ctx.font = `500 11px ${FONT}`;
		ctx.fillStyle = color;
		ctx.fillText(label, (a + b) / 2, 103);
	};
	brace(x0, split, c.blue, L.fixed(n));
	brace(split, end, c.sub, L.free(32 - n));

	// /16 VPC 전체와 견준 범위 크기
	ctx.textAlign = "left";
	ctx.font = `400 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(L.scale, x0, 130);
	ctx.beginPath();
	ctx.roundRect(x0, 140, total, 12, 3);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.boxStroke;
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(x0, 140, Math.max(3, total * 2 ** (16 - p)), 12, 3);
	ctx.fillStyle = c.blue;
	ctx.fill();

	caption(ctx, c, `/${target} · ${L.captions[target]}`, w, HEIGHT - 26);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function CidrBitsDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

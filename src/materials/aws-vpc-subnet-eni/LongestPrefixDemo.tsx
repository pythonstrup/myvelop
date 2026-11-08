import { along, box, CanvasFigure, caption, MONO, pill, seg } from "@/materials/aws-vpc-subnet-eni/canvas";
import { FONT, palette } from "@/materials/shared";

// 라우팅 테이블이 목적지가 다른 패킷 두 개를 어느 줄로 보내는지 보여 주는 애니메이션.
const HEIGHT = 232;
const ROUND = 5000;
const CYCLE = ROUND * 2;
const ROWS = [
	{ dest: "10.0.0.0/16", target: "local", exitSub: "local" },
	{ dest: "0.0.0.0/0", target: "nat-0a1b2c3d", exitSub: "nat-0a1b2c3d" },
] as const;
const PACKETS = [
	{ match: [true, true], win: 0 },
	{ match: [false, true], win: 1 },
] as const;
const LABELS = {
	ko: {
		dest: "목적지",
		target: "대상",
		exits: ["VPC 안", "NAT"],
		packets: [
			{ label: "목적지 10.0.5.10", ask: "10.0.5.10은 어느 줄에 걸릴까?", answer: "두 줄에 다 걸리면 더 좁은 /16 줄을 따른다" },
			{ label: "목적지 203.0.113.50", ask: "203.0.113.50은 어느 줄에 걸릴까?", answer: "/0 줄에만 걸리니 NAT로 간다" },
		],
		aria: "라우팅 테이블 두 줄, 10.0.0.0/16은 local로, 0.0.0.0/0은 NAT 게이트웨이로 보내는 표에 패킷 두 개를 차례로 넣는 애니메이션. 목적지가 10.0.5.10인 패킷은 두 줄에 모두 걸리고, 범위가 더 좁은 /16 줄을 따라 VPC 안으로 간다. 목적지가 203.0.113.50인 패킷은 /0 줄에만 걸려 NAT 게이트웨이로 간다.",
	},
	en: {
		dest: "Destination",
		target: "Target",
		exits: ["Inside VPC", "NAT"],
		packets: [
			{ label: "To 10.0.5.10", ask: "Which row does 10.0.5.10 match?", answer: "It matches both, so the narrower /16 row wins" },
			{ label: "To 203.0.113.50", ask: "Which row does 203.0.113.50 match?", answer: "It matches only the /0 row, so it goes to the NAT" },
		],
		aria: "An animation feeding two packets in turn into a two-row route table, where 10.0.0.0/16 goes to local and 0.0.0.0/0 goes to a NAT gateway. The packet destined for 10.0.5.10 matches both rows and follows the narrower /16 row into the VPC. The packet destined for 203.0.113.50 matches only the /0 row and goes to the NAT gateway.",
	},
};
type Lang = keyof typeof LABELS;

function scene(L: (typeof LABELS)[Lang], ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const round = t < ROUND ? 0 : 1;
	const u = t % ROUND;
	const pk = PACKETS[round];
	const text = L.packets[round];

	// 표와 출구를 한 덩어리로 가운데에 둔다. 표 왼쪽 24px은 ✓/✗ 자리다.
	const tableW = Math.min(w * 0.6, 300);
	const exitW = Math.min(150, w - 8 - 24 - tableW - 22);
	const tx = Math.max(24, (w - tableW - 22 - exitW) / 2);
	const split = tx + tableW * 0.55;
	const headY = 70;
	const rowH = 38;
	const rowY = (i: number) => headY + 20 + i * rowH;
	const rowMid = (i: number) => rowY(i) + rowH / 2;
	const exitL = tx + tableW + 22;
	const exitX = exitL + exitW / 2;

	// 표 머리
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 10.5px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(L.dest, tx + 10, headY + 10);
	ctx.fillText(L.target, split + 10, headY + 10);

	const checked = [seg(u, 700, 1400), seg(u, 1400, 2100)];
	const decided = u >= 2100;
	ROWS.forEach((row, i) => {
		const y = rowY(i);
		const hit = pk.match[i];
		const done = checked[i] >= 1;
		const checking = checked[i] > 0 && !done;
		const winner = decided && i === pk.win;
		ctx.save();
		ctx.globalAlpha = decided && !winner ? 0.4 : 1;
		ctx.beginPath();
		ctx.rect(tx, y, tableW, rowH);
		ctx.fillStyle = checking ? c.blueFill : done ? (hit ? c.greenFill : c.boxFill) : c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(split, y);
		ctx.lineTo(split, y + rowH);
		ctx.strokeStyle = c.boxStroke;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.font = `500 11px ${MONO}`;
		ctx.fillStyle = c.text;
		ctx.textAlign = "left";
		ctx.fillText(row.dest, tx + 10, y + rowH / 2);
		ctx.fillText(row.target, split + 10, y + rowH / 2);
		// 걸렸는지 표시: 표 왼쪽 바깥에 ✓ / ✗
		if (done) {
			ctx.textAlign = "center";
			ctx.font = `700 13px ${FONT}`;
			ctx.fillStyle = hit ? c.green : c.red;
			ctx.fillText(hit ? "✓" : "✗", tx - 12, y + rowH / 2);
		}
		// 표에서 출구로 가는 화살표
		ctx.strokeStyle = winner ? c.green : c.line;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(tx + tableW, rowMid(i));
		ctx.lineTo(exitL - 4, rowMid(i));
		ctx.stroke();
		box(ctx, c, exitX, rowMid(i), exitW, rowH - 6, L.exits[i], row.exitSub, winner && u >= 3900 ? c.green : c.boxStroke);
		ctx.restore();
	});
	// 이긴 줄 테두리는 다음 줄에 덮이지 않게 마지막에 그린다
	if (decided) {
		ctx.strokeStyle = c.green;
		ctx.lineWidth = 2;
		ctx.strokeRect(tx, rowY(pk.win), tableW, rowH);
	}

	// 패킷: 위에서 내려와 표 위에서 기다리다가, 이긴 줄을 따라 출구로 간다
	const cx = tx + tableW / 2;
	const start: [number, number] = [cx, 22];
	const wait: [number, number] = [cx, headY - 8];
	let pos = along([start, wait], seg(u, 0, 700));
	if (u >= 2900) pos = along([wait, [cx, rowMid(pk.win)], [exitX, rowMid(pk.win)]], seg(u, 2900, 3900));
	pill(ctx, w, pos[0], pos[1], text.label, c.blue, c.blueFill, 1 - seg(u, 3500, 3900));

	caption(ctx, c, `${round === 0 ? "①" : "②"} ${decided ? text.answer : text.ask}`, w, HEIGHT - 24);
}

const SCENES = { ko: scene.bind(null, LABELS.ko), en: scene.bind(null, LABELS.en) };

export default function LongestPrefixDemo({ lang = "ko" }: { lang?: Lang }) {
	return <CanvasFigure height={HEIGHT} cycle={CYCLE} scene={SCENES[lang]} label={LABELS[lang].aria} />;
}

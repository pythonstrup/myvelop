import { clamp01, type Colors, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// LSTM 셀 하나에서 게이트 세 개가 차례로 일하는 과정을 반복 재생한다.
// 위쪽 굵은 선이 셀 상태(장기 기억), 아래쪽 선이 은닉 상태 h다. 파란 점은 셀 상태에 실린 기억, 주황 점은 이번 칸의 새 후보, 초록 점은 내보내는 h(t)다.
// 게이트 상자의 채움 높이는 0~1 게이트 값을 보인 것이고, 값 자체(0.8·0.7·0.9)는 설명용으로 정했다.
const STEPS = [
	{ title: "① 망각 게이트", desc: "이전 기억 중 무엇을 남길지 0~1 사이 값으로 고른다", value: 0.8 },
	{ title: "② 입력 게이트", desc: "이번 칸에서 새로 적을 내용과 그 양을 고른다", value: 0.7 },
	{ title: "③ 출력 게이트", desc: "쌓인 기억 중 지금 내보낼 부분을 골라 h(t)로 넘긴다", value: 0.9 },
] as const;
const HOLD = { title: "세 게이트가 칸마다 이 과정을 되풀이한다", desc: "그래서 멀리 떨어진 칸의 정보도 흐려지지 않고 전달된다" };
const ARIA =
	"LSTM 셀 하나에서 게이트 세 개가 차례로 일하는 애니메이션. 위쪽의 셀 상태는 칸에서 칸으로 이어지는 장기 기억이다. 망각 게이트가 이전 기억 중 남길 몫을 0에서 1 사이 값으로 곱하고, 입력 게이트가 이번 칸의 새 후보 중 적을 몫을 골라 셀 상태에 더하고, 출력 게이트가 셀 상태 중 내보낼 몫을 골라 다음 칸으로 넘길 은닉 상태 h(t)를 만든다.";

const STEP_MS = 3200;
const CYCLE = STEP_MS * 3 + 1600;
const HEIGHT = 336;
const CY = 44;
const MY = 102;
const GY = 138;
const GH = 42;
const HY = 222;

// 가로 위치는 폭에 대한 비율(0~1)로 두고 그릴 때 픽셀로 바꾼다
const U = { forget: 0.22, input: 0.41, cand: 0.59, mix: 0.5, out: 0.74, tap: 0.87, xin: 0.1 };

type Geo = { x: (u: number) => number; boxW: number };
type Group = "forget" | "input" | "output";

function paths(g: Geo): Record<Group, [number, number][][]> {
	const { x } = g;
	return {
		forget: [
			[
				[x(U.forget), HY],
				[x(U.forget), GY + GH],
			],
			[
				[x(U.forget), GY],
				[x(U.forget), CY],
			],
		],
		input: [
			[
				[x(U.input), HY],
				[x(U.input), GY + GH],
			],
			[
				[x(U.cand), HY],
				[x(U.cand), GY + GH],
			],
			[
				[x(U.input), GY],
				[x(U.input), MY],
				[x(U.mix), MY],
			],
			[
				[x(U.cand), GY],
				[x(U.cand), MY],
				[x(U.mix), MY],
			],
			[
				[x(U.mix), MY],
				[x(U.mix), CY],
			],
		],
		output: [
			[
				[x(U.out), HY],
				[x(U.out), GY + GH],
			],
			[
				[x(U.out), GY],
				[x(U.out), MY],
				[x(U.tap), MY],
			],
			[
				[x(U.tap), CY],
				[x(U.tap), MY],
				[x(U.tap), HY],
				[x(1), HY],
			],
		],
	};
}

// 투명 캔버스에서 뒤에 지나가는 선을 가리려고 모양만큼 지운 뒤 칠한다
function solid(ctx: CanvasRenderingContext2D, shape: () => void, fill: string, stroke: string, lineWidth: number) {
	ctx.save();
	ctx.globalCompositeOperation = "destination-out";
	shape();
	ctx.fill();
	ctx.restore();
	shape();
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = lineWidth;
	ctx.stroke();
}

function gateBox(ctx: CanvasRenderingContext2D, g: Geo, u: number, symbol: string, label: string, on: boolean, fill: number, c: Colors) {
	const left = g.x(u) - g.boxW / 2;
	solid(ctx, () => {
		ctx.beginPath();
		ctx.roundRect(left, GY, g.boxW, GH, 6);
	}, c.boxFill, on ? c.blue : c.sub, on ? 2 : 1);
	if (fill > 0) {
		ctx.fillStyle = c.blueFill;
		ctx.fillRect(left + 2, GY + GH - 2 - (GH - 4) * fill, g.boxW - 4, (GH - 4) * fill);
	}
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `700 ${symbol === "σ" ? 15 : 11}px ${FONT}`;
	ctx.fillText(symbol, g.x(u), GY + 14);
	ctx.font = `500 10px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(label, g.x(u), GY + 32);
}

function op(ctx: CanvasRenderingContext2D, x: number, y: number, symbol: string, on: boolean, c: Colors) {
	solid(ctx, () => {
		ctx.beginPath();
		ctx.arc(x, y, 10, 0, Math.PI * 2);
	}, c.boxFill, on ? c.blue : c.sub, on ? 2 : 1.2);
	ctx.fillStyle = c.text;
	ctx.font = `600 14px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(symbol, x, y + 1);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
	if (alpha <= 0) return;
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
	ctx.globalAlpha = 1;
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) {
	const c = palette(dark);
	const inner = Math.min(560, w - 24);
	const left = (w - inner) / 2;
	const g: Geo = { x: (u) => left + u * inner, boxW: Math.min(50, inner * 0.13) };
	const { x } = g;
	const hold = t >= STEP_MS * 3;
	const s = hold ? -1 : Math.floor(t / STEP_MS);
	const u = hold ? 1 : (t - s * STEP_MS) / STEP_MS;
	const groups: Group[] = ["forget", "input", "output"];

	// 셀 상태와 은닉 상태 선
	ctx.strokeStyle = c.text;
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(x(0), CY);
	ctx.lineTo(x(1), CY);
	ctx.stroke();
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(x(0), HY);
	ctx.lineTo(x(U.out), HY);
	ctx.moveTo(x(U.xin), HY + 40);
	ctx.lineTo(x(U.xin), HY);
	ctx.stroke();

	// 게이트로 가는 선: 지금 일하는 게이트만 파랗게
	const all = paths(g);
	groups.forEach((name, k) => {
		ctx.strokeStyle = k === s ? c.blue : c.sub;
		ctx.lineWidth = k === s ? 2.5 : 1.5;
		for (const line of all[name]) {
			ctx.beginPath();
			line.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
			ctx.stroke();
		}
	});

	const fillOf = (k: number) => (k === s ? STEPS[k].value * clamp01(u * 2) : 0);
	gateBox(ctx, g, U.forget, "σ", "망각", s === 0, fillOf(0), c);
	gateBox(ctx, g, U.input, "σ", "입력", s === 1, fillOf(1), c);
	gateBox(ctx, g, U.cand, "tanh", "새 후보", s === 1, 0, c);
	gateBox(ctx, g, U.out, "σ", "출력", s === 2, fillOf(2), c);
	op(ctx, x(U.forget), CY, "×", s === 0, c);
	op(ctx, x(U.mix), MY, "×", s === 1, c);
	op(ctx, x(U.mix), CY, "+", s === 1, c);
	op(ctx, x(U.tap), MY, "×", s === 2, c);
	solid(ctx, () => {
		ctx.beginPath();
		ctx.roundRect(x(U.tap) - 18, CY + 18, 36, 20, 5);
	}, c.boxFill, s === 2 ? c.blue : c.sub, s === 2 ? 2 : 1);
	ctx.fillStyle = c.text;
	ctx.font = `700 10px ${FONT}`;
	ctx.fillText("tanh", x(U.tap), CY + 29);

	// 선 이름
	ctx.font = `500 11px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textBaseline = "alphabetic";
	ctx.textAlign = "center";
	ctx.fillText("셀 상태 · 장기 기억이 흐르는 컨베이어", x(0.5), CY - 14);
	ctx.textAlign = "left";
	ctx.fillText("c(t−1)", x(0), CY + 18);
	ctx.fillText("h(t−1)", x(0), HY + 16);
	ctx.fillText("x(t) · 이번 칸의 특징", x(U.xin) + 8, HY + 36);
	ctx.textAlign = "right";
	ctx.fillText("c(t)", x(1), CY + 18);
	ctx.fillText("h(t)", x(1), HY + 16);

	// 점의 움직임
	const mem = { x: x(0), r: 7, a: 1 };
	if (hold) Object.assign(mem, { x: x(1), r: 8 });
	else if (s === 0) Object.assign(mem, { x: lerp(x(0), x(U.forget), clamp01(u * 1.6)), a: u < 0.62 ? 1 : lerp(1, 0.5, clamp01((u - 0.62) * 4)) });
	else if (s === 1) {
		Object.assign(mem, { x: lerp(x(U.forget), x(U.mix), clamp01(u * 2)), a: u > 0.8 ? 1 : 0.5, r: u > 0.8 ? 8.5 : 7 });
		if (u <= 0.8) {
			const cand =
				u < 0.3
					? [x(U.cand), lerp(GY, MY, u / 0.3)]
					: u < 0.5
						? [lerp(x(U.cand), x(U.mix), (u - 0.3) / 0.2), MY]
						: [x(U.mix), lerp(MY, CY, (u - 0.5) / 0.3)];
			dot(ctx, cand[0], cand[1], 5, c.amber, 1);
		}
	} else {
		Object.assign(mem, { x: lerp(x(U.mix), x(1), clamp01(u * 1.3)), r: 8.5 });
		if (u > 0.3) {
			const out =
				u < 0.5
					? [x(U.tap), lerp(CY, MY, (u - 0.3) / 0.2)]
					: u < 0.75
						? [x(U.tap), lerp(MY, HY, (u - 0.5) / 0.25)]
						: [lerp(x(U.tap), x(1), (u - 0.75) / 0.25), HY];
			dot(ctx, out[0], out[1], 5, c.green, 1);
		}
	}
	dot(ctx, mem.x, CY, mem.r, c.blue, mem.a);

	const cap = hold ? HOLD : STEPS[s];
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `700 12.5px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(cap.title, w / 2, HEIGHT - 38);
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(cap.desc, w / 2, HEIGHT - 16);
}

export default function LstmGateDemo() {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, drawScene);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={ARIA} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 앞부분이 같은 요청 4개를 게이트웨이가 deployment A·B·C로 보낸다. 1부는 로드밸런싱, 2부는 A로만 보낸다.
// 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const REQ = 1500; // 요청 하나를 보내고 결과를 보여주는 시간(ms)
const ARRIVE = 0.6; // 요청 구간에서 deployment에 닿는 시점
const PART2 = 7200; // 2부 시작
const CYCLE = 14800;
const HEIGHT = 262;

const TARGETS = [
	[0, 1, 2, 0],
	[0, 0, 0, 0],
];
const NAMES = ["A", "B", "C"];

const CHIP_Y = 42;
const GW_Y = 96;
const DEP_Y = 140;
const DEP_H = 46;
const RESULT_Y = [206, 224];

type Labels = {
	captions: string[];
	titles: string[];
	gateway: string;
	req: (i: number) => string;
	dep: (name: string) => string;
	write: string;
	read: string;
	writes: (n: number) => string;
	reads: (n: number) => string;
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		captions: [
			"① 로드밸런싱: 요청이 A, B, C 순서로 간다",
			"② 처음 가는 곳마다 다시 쓰고 4번째만 읽는다",
			"③ 같은 요청 4개를 A로만 보낸다",
			"④ 첫 요청만 쓰고 나머지 3개는 읽는다",
		],
		titles: ["로드밸런싱", "A로 고정"],
		gateway: "게이트웨이",
		req: (i) => `요청 ${i + 1}`,
		dep: (name) => `deployment ${name}`,
		write: "쓰기",
		read: "읽기",
		writes: (n) => `쓰기 ${n}번`,
		reads: (n) => `읽기 ${n}번`,
		aria: "앞부분이 같은 요청 4개를 게이트웨이가 deployment A, B, C로 보내는 두 경우를 이어서 재생하는 애니메이션. 로드밸런싱으로 A, B, C, A 순서로 보내면 처음 가는 deployment마다 앞부분을 캐시에 새로 써서 쓰기 3번, 읽기 1번이 된다. 모두 A로 보내면 첫 요청만 쓰고 나머지 3개는 캐시에서 읽어 쓰기 1번, 읽기 3번이 된다.",
	},
	en: {
		captions: [
			"① Load balancing: requests go to A, B, C in turn",
			"② Each first visit writes; only the 4th reads",
			"③ Send the same 4 requests to A only",
			"④ Only the first writes; the other 3 read",
		],
		titles: ["Load balancing", "Pinned to A"],
		gateway: "Gateway",
		req: (i) => `Request ${i + 1}`,
		dep: (name) => `deployment ${name}`,
		write: "write",
		read: "read",
		writes: (n) => `${n} ${n === 1 ? "write" : "writes"}`,
		reads: (n) => `${n} ${n === 1 ? "read" : "reads"}`,
		aria: "Animation that plays two cases in a row, with a gateway sending four requests that share a prefix to deployments A, B, and C. With load balancing in the order A, B, C, A, each deployment visited for the first time writes the prefix to its own cache, for 3 writes and 1 read. Sending all four to A writes only on the first request and reads on the other three, for 1 write and 3 reads.",
	},
};
type Lang = keyof typeof LABELS;

type Outcome = "write" | "read";

// 도착한 요청을 차례로 처리해 요청별 결과와 deployment별 캐시 상태를 구한다.
function replay(targets: number[], arrivedCount: number) {
	const cached = [false, false, false];
	const outcomes: Outcome[] = [];
	for (let i = 0; i < arrivedCount; i++) {
		const d = targets[i];
		outcomes.push(cached[d] ? "read" : "write");
		cached[d] = true;
	}
	const writes = outcomes.filter((o) => o === "write").length;
	return { cached, outcomes, writes, reads: outcomes.length - writes };
}

function drawBox(ctx: CanvasRenderingContext2D, c: Colors, cx: number, y: number, w: number, h: number, stroke = c.boxStroke) {
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, y, w, h, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "center") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function drawResult(ctx: CanvasRenderingContext2D, c: Colors, L: Labels, x: number, y: number, title: string, writes: number, reads: number) {
	const parts: [string, string][] = [
		[`${title} · `, c.text],
		[L.writes(writes), c.amber],
		[", ", c.sub],
		[L.reads(reads), c.green],
	];
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 11px ${FONT}`;
	let dx = x;
	for (const [text, color] of parts) {
		ctx.fillStyle = color;
		ctx.fillText(text, dx, y);
		dx += ctx.measureText(text).width;
	}
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const part = t < PART2 ? 0 : 1;
		const local = part === 0 ? t : t - PART2;
		const targets = TARGETS[part];
		const idx = Math.min(3, Math.floor(local / REQ));
		const p = clamp01((local - idx * REQ) / REQ);
		const arrivedCount = idx + (p >= ARRIVE ? 1 : 0);
		const state = replay(targets, arrivedCount);

		const gwX = w / 2;
		const gwW = 120;
		const depW = Math.min(150, (w - margin * 2) / 3 - 12);
		const depX = (d: number) => margin + ((w - margin * 2) * (2 * d + 1)) / 6;
		const chipW = Math.min(64, (w - margin * 2) / 4 - 10);
		const chipX = (i: number) => w / 2 + (i - 1.5) * (chipW + 12);

		// 제목
		drawText(ctx, L.titles[part], margin, 12, c.text, `700 12px ${FONT}`, "left");

		// 요청 칩에서 게이트웨이로, 게이트웨이에서 각 deployment로 가는 선
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		for (let i = 0; i < 4; i++) {
			ctx.moveTo(chipX(i), CHIP_Y + 11);
			ctx.lineTo(gwX, GW_Y);
		}
		for (let d = 0; d < 3; d++) {
			ctx.moveTo(gwX, GW_Y + 26);
			ctx.lineTo(depX(d), DEP_Y);
		}
		ctx.stroke();

		// 요청 칩: 보낸 요청은 결과 색으로 테를 두른다
		for (let i = 0; i < 4; i++) {
			const outcome = state.outcomes[i];
			const current = i === idx && p < ARRIVE;
			const stroke = outcome === "write" ? c.amber : outcome === "read" ? c.green : current ? c.blue : c.boxStroke;
			ctx.beginPath();
			ctx.roundRect(chipX(i) - chipW / 2, CHIP_Y - 11, chipW, 22, 11);
			ctx.fillStyle = outcome === "write" ? c.amberFill : outcome === "read" ? c.greenFill : c.boxFill;
			ctx.fill();
			ctx.strokeStyle = stroke;
			ctx.lineWidth = 1.2;
			ctx.stroke();
			drawText(ctx, L.req(i), chipX(i), CHIP_Y + 0.5, c.text, `500 10.5px ${FONT}`);
		}

		// 게이트웨이
		drawBox(ctx, c, gwX, GW_Y, gwW, 26);
		drawText(ctx, L.gateway, gwX, GW_Y + 13.5, c.text, `600 11.5px ${FONT}`);

		// deployment와 캐시 칸. 2부에서 쓰지 않는 B·C는 흐리게 둔다.
		const current = targets[idx];
		const flashRead = p >= ARRIVE && p < 1 && state.outcomes[idx] === "read";
		for (let d = 0; d < 3; d++) {
			ctx.save();
			if (part === 1 && d > 0) ctx.globalAlpha = 0.4;
			drawBox(ctx, c, depX(d), DEP_Y, depW, DEP_H, d === current && p >= ARRIVE && p < 1 ? c.blue : c.boxStroke);
			drawText(ctx, L.dep(NAMES[d]), depX(d), DEP_Y + 15, c.text, `600 11px ${FONT}`);
			const sx = depX(d) - (depW - 24) / 2;
			const sy = DEP_Y + 27;
			ctx.beginPath();
			ctx.roundRect(sx, sy, depW - 24, 10, 3);
			if (state.cached[d]) {
				const reading = flashRead && d === current;
				ctx.fillStyle = reading ? c.greenFill : c.amberFill;
				ctx.fill();
				ctx.strokeStyle = reading ? c.green : c.amber;
				ctx.lineWidth = 1;
				ctx.stroke();
			} else {
				ctx.save();
				ctx.setLineDash([3, 3]);
				ctx.strokeStyle = c.boxStroke;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.restore();
			}
			ctx.restore();
		}

		// 이동 중인 요청: 칩 → 게이트웨이 → deployment
		if (p < ARRIVE) {
			const k = p / ARRIVE;
			const first = ease(clamp01(k / 0.5));
			const second = ease(clamp01((k - 0.5) / 0.5));
			const x = k < 0.5 ? lerp(chipX(idx), gwX, first) : lerp(gwX, depX(current), second);
			const y = k < 0.5 ? lerp(CHIP_Y + 11, GW_Y, first) : lerp(GW_Y + 26, DEP_Y, second);
			ctx.beginPath();
			ctx.arc(x, y, 5, 0, Math.PI * 2);
			ctx.fillStyle = c.blue;
			ctx.fill();
		} else if (p < 1) {
			const outcome = state.outcomes[idx];
			const label = outcome === "write" ? L.write : L.read;
			drawBadge(ctx, depX(current), DEP_Y - 10, label, outcome === "write" ? c.amberFill : c.greenFill, outcome === "write" ? c.amber : c.green, 1);
		}

		// 결과: 1부 결과는 2부에서도 남겨 둔다
		const first = part === 0 ? state : replay(TARGETS[0], 4);
		drawResult(ctx, c, L, margin, RESULT_Y[0], L.titles[0], first.writes, first.reads);
		if (part === 1) drawResult(ctx, c, L, margin, RESULT_Y[1], L.titles[1], state.writes, state.reads);

		// 하단 캡션
		const caption = part === 0 ? (idx < 3 ? 0 : 1) : idx < 2 ? 2 : 3;
		drawText(ctx, L.captions[caption], w / 2, HEIGHT - 14, c.text, `500 12px ${FONT}`);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function RoutingDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

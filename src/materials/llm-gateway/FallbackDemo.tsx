import { type Colors, clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// Anthropic이 429를 돌려줄 때 Gemini로 넘기는 과정을 두 번 재생한다.
// 1부는 세무 서비스가 직접 넘기고, 2부는 게이트웨이가 넘긴다. 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const P1 = 8600; // 2부 시작
const CYCLE = 18000;
const HEIGHT = 228;

const ROW_Y = [40, 92, 144];
const BOX_H = 38;
const TAX = 1; // 세무 서비스 행
const ANTHROPIC = 1;
const GEMINI = 2;

// [시작, 끝] 구간(ms)
const D = {
	toAnthropic: [0, 1400],
	anthropic429: 1400,
	back: [2200, 3000],
	toGemini: [3000, 4400],
	gemini200: 4400,
	reply: [5200, 6000],
	codeOthers: [6200, 6700],
} as const;
const G = {
	toGateway: [0, 1000],
	toAnthropic: [1000, 2000],
	anthropic429: 2000,
	back: [2700, 3400],
	toGemini: [3400, 4400],
	gemini200: 4400,
	toGatewayOk: [5000, 5800],
	reply: [5800, 6800],
	setting: 2700,
} as const;

type Labels = {
	captions: string[];
	titles: string[];
	services: string[];
	providers: string[];
	gateway: string;
	code: string;
	setting: string;
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		captions: [
			"① 세무 서비스가 Anthropic을 직접 부른다",
			"② 429를 받은 서비스가 직접 Gemini로 넘긴다",
			"③ 요약·재무 서비스에도 같은 코드가 필요하다",
			"④ 게이트웨이를 두면 서비스는 한 곳에만 요청한다",
			"⑤ 429는 게이트웨이가 받아 Gemini로 넘긴다",
			"⑥ fallback 설정은 게이트웨이 한 곳에만 있다",
		],
		titles: ["직접 호출", "LLM 게이트웨이"],
		services: ["요약 서비스", "세무 서비스", "재무 서비스"],
		providers: ["OpenAI", "Anthropic", "Gemini"],
		gateway: "게이트웨이",
		code: "fallback 코드",
		setting: "fallback 설정",
		aria: "Anthropic이 429를 돌려줄 때 Gemini로 넘기는 과정을 두 번 이어서 재생하는 애니메이션. 직접 호출에서는 세무 서비스가 Anthropic에 요청했다가 429를 받고, 직접 Gemini로 다시 보내 응답을 받는다. 이 fallback 코드는 요약 서비스와 재무 서비스에도 따로 필요하다. 게이트웨이를 두면 세무 서비스는 게이트웨이에만 요청하고, 게이트웨이가 Anthropic의 429를 받아 Gemini로 넘긴 뒤 응답을 서비스에 돌려준다. fallback 설정은 게이트웨이 한 곳에만 있다.",
	},
	en: {
		captions: [
			"① The tax service calls Anthropic directly",
			"② On a 429, the service itself retries on Gemini",
			"③ Summary and finance need the same code",
			"④ With a gateway, services call one place",
			"⑤ The gateway takes the 429 and moves to Gemini",
			"⑥ The fallback lives only in the gateway",
		],
		titles: ["Direct calls", "LLM gateway"],
		services: ["Summary", "Tax", "Finance"],
		providers: ["OpenAI", "Anthropic", "Gemini"],
		gateway: "Gateway",
		code: "fallback code",
		setting: "fallback config",
		aria: "Animation that plays the fallback from Anthropic to Gemini twice in a row. With direct calls, the tax service sends a request to Anthropic, gets a 429, and sends it again to Gemini itself. The summary and finance services each need the same fallback code. With a gateway, the tax service sends its request only to the gateway, which takes Anthropic's 429, moves the request to Gemini, and returns the response to the service. The fallback config lives only in the gateway.",
	},
};
type Lang = keyof typeof LABELS;

const progress = (t: number, [from, to]: readonly [number, number]) => clamp01((t - from) / (to - from));
const inside = (t: number, [from, to]: readonly [number, number]) => t >= from && t < to;

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string, width = 1.5) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 8);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = width;
	ctx.stroke();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "center") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function drawDot(ctx: CanvasRenderingContext2D, from: [number, number], to: [number, number], p: number, color: string) {
	const k = ease(p);
	ctx.beginPath();
	ctx.arc(lerp(from[0], to[0], k), lerp(from[1], to[1], k), 5, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
}

type Status = "none" | "fail" | "ok";

function drawNode(ctx: CanvasRenderingContext2D, c: Colors, cx: number, row: number, w: number, name: string, sub: string, status: Status) {
	const y = ROW_Y[row];
	const fill = status === "fail" ? c.redFill : status === "ok" ? c.greenFill : c.boxFill;
	const stroke = status === "fail" ? c.red : status === "ok" ? c.green : c.boxStroke;
	drawBox(ctx, cx - w / 2, y, w, BOX_H, fill, stroke);
	if (!sub) {
		drawText(ctx, name, cx, y + BOX_H / 2 + 0.5, c.text, `600 11.5px ${FONT}`);
		return;
	}
	drawText(ctx, name, cx, y + 13, c.text, `600 11.5px ${FONT}`);
	const subColor = status === "fail" ? c.red : status === "ok" ? c.green : c.amber;
	drawText(ctx, sub, cx, y + 27, subColor, `600 10.5px ${FONT}`);
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const colW = (w - margin * 2) / 3;
		const boxW = Math.min(124, colW - 14);
		const colX = (k: number) => margin + colW * (k + 0.5);
		const mid = (row: number) => ROW_Y[row] + BOX_H / 2;
		const svcRight = (row: number): [number, number] => [colX(0) + boxW / 2, mid(row)];
		const prvLeft = (row: number): [number, number] => [colX(2) - boxW / 2, mid(row)];
		const gwLeft = (row: number): [number, number] => [colX(1) - boxW / 2, mid(row)];
		const gwRight = (row: number): [number, number] => [colX(1) + boxW / 2, mid(row)];
		const part = t < P1 ? 0 : 1;
		const u = part === 0 ? t : t - P1;

		drawText(ctx, L.titles[part], margin, 14, c.text, `700 12px ${FONT}`, "left");

		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.2;
		const line = (a: [number, number], b: [number, number], dashed = false) => {
			ctx.save();
			if (dashed) ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(...a);
			ctx.lineTo(...b);
			ctx.stroke();
			ctx.restore();
		};

		let anthropic: Status = "none";
		let gemini: Status = "none";

		if (part === 0) {
			// 지금 쓰는 연결과, fallback을 붙이며 생긴 세무 → Gemini 연결
			for (let r = 0; r < 3; r++) line(svcRight(r), prvLeft(r));
			if (u >= D.toGemini[0]) line(svcRight(TAX), prvLeft(GEMINI), true);

			if (u >= D.anthropic429) anthropic = "fail";
			if (u >= D.gemini200) gemini = "ok";
			const code = (row: number) =>
				(row === TAX && u >= D.back[0]) || (row !== TAX && u >= (row === 0 ? D.codeOthers[0] : D.codeOthers[1]));
			for (let r = 0; r < 3; r++) drawNode(ctx, c, colX(0), r, boxW, L.services[r], code(r) ? L.code : "", "none");
		} else {
			for (let r = 0; r < 3; r++) {
				line(svcRight(r), gwLeft(r));
				line(gwRight(r), prvLeft(r));
			}
			if (u >= G.anthropic429) anthropic = "fail";
			if (u >= G.gemini200) gemini = "ok";
			for (let r = 0; r < 3; r++) drawNode(ctx, c, colX(0), r, boxW, L.services[r], "", "none");

			// 게이트웨이는 세 행을 아우르는 상자 하나다
			const top = ROW_Y[0];
			const bottom = ROW_Y[2] + BOX_H;
			drawBox(ctx, colX(1) - boxW / 2, top, boxW, bottom - top, c.blueFill, c.blue, 1.8);
			drawText(ctx, L.gateway, colX(1), top + 18, c.blue, `700 12px ${FONT}`);
			if (u >= G.setting) drawText(ctx, L.setting, colX(1), bottom - 16, c.amber, `600 10.5px ${FONT}`);
		}

		const sub = (s: Status) => (s === "fail" ? "429" : s === "ok" ? "200" : "");
		for (let r = 0; r < 3; r++) {
			const s = r === ANTHROPIC ? anthropic : r === GEMINI ? gemini : "none";
			drawNode(ctx, c, colX(2), r, boxW, L.providers[r], sub(s), s);
		}

		// 이동 중인 요청
		if (part === 0) {
			if (inside(u, D.toAnthropic)) drawDot(ctx, svcRight(TAX), prvLeft(ANTHROPIC), progress(u, D.toAnthropic), c.blue);
			if (inside(u, D.back)) drawDot(ctx, prvLeft(ANTHROPIC), svcRight(TAX), progress(u, D.back), c.red);
			if (inside(u, D.toGemini)) drawDot(ctx, svcRight(TAX), prvLeft(GEMINI), progress(u, D.toGemini), c.blue);
			if (inside(u, D.reply)) drawDot(ctx, prvLeft(GEMINI), svcRight(TAX), progress(u, D.reply), c.green);
		} else {
			if (inside(u, G.toGateway)) drawDot(ctx, svcRight(TAX), gwLeft(TAX), progress(u, G.toGateway), c.blue);
			if (inside(u, G.toAnthropic)) drawDot(ctx, gwRight(TAX), prvLeft(ANTHROPIC), progress(u, G.toAnthropic), c.blue);
			if (inside(u, G.back)) drawDot(ctx, prvLeft(ANTHROPIC), gwRight(TAX), progress(u, G.back), c.red);
			if (inside(u, G.toGemini)) drawDot(ctx, gwRight(GEMINI), prvLeft(GEMINI), progress(u, G.toGemini), c.blue);
			if (inside(u, G.toGatewayOk)) drawDot(ctx, prvLeft(GEMINI), gwRight(GEMINI), progress(u, G.toGatewayOk), c.green);
			if (inside(u, G.reply)) drawDot(ctx, gwLeft(TAX), svcRight(TAX), progress(u, G.reply), c.green);
		}

		// 하단 캡션
		const caption =
			part === 0
				? u < D.anthropic429
					? 0
					: u < D.reply[1]
						? 1
						: 2
				: u < G.anthropic429
					? 3
					: u < G.reply[1]
						? 4
						: 5;
		drawText(ctx, L.captions[caption], w / 2, HEIGHT - 14, c.text, `500 12px ${FONT}`);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function FallbackDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

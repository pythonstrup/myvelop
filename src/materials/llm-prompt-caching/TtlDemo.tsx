import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 5분 TTL에서 0·3·7·15분에 요청이 올 때 유효 시간이 늘어나고 끝나는 모습을 시간축에 그린다.
// 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const PLAY = 10000; // 0~20분을 재생하는 시간(ms). 나머지는 마지막 장면을 멈춰 보여준다.
const CYCLE = 12400;
const HEIGHT = 164;

const END = 20; // 시간축 끝(분)
const TTL = 5; // 분
const EXTEND = 0.8; // 적중 뒤 유효 시간이 늘어나는 모습을 보여주는 길이(분)
const HITS = [3, 7];
const EXPIRE = 12;
const REWRITE = 15;
const EVENTS = [
	{ at: 0, kind: "write" },
	{ at: 3, kind: "read" },
	{ at: 7, kind: "read" },
	{ at: EXPIRE, kind: "expire" },
	{ at: REWRITE, kind: "write" },
] as const;

const MARK_Y = 56;
const BAR_Y = 76;
const BAR_H = 18;
const AXIS_Y = 108;

type Labels = {
	captions: string[];
	badge: { write: string; read: string; expire: string };
	ttl: string;
	minute: (min: number) => string;
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		captions: [
			"① 0분에 캐시에 쓰고 5분 뒤까지 유효하다",
			"② 3분에 적중하면 5분이 다시 늘어난다",
			"③ 7분에 또 적중해 12분까지 유효하다",
			"④ 12분까지 쓰이지 않아 만료된다",
			"⑤ 15분 요청은 적중하지 못해 다시 쓴다",
			"⑥ 유효 시간은 마지막으로 쓴 때부터 5분이다",
		],
		badge: { write: "쓰기", read: "읽기", expire: "만료" },
		ttl: "유효 시간",
		minute: (min) => `${min}분`,
		aria: "5분 TTL에서 0분, 3분, 7분, 15분에 요청이 오는 시간축을 반복 재생하는 애니메이션. 0분 요청이 캐시에 쓰고 5분 뒤까지 유효하다. 3분과 7분 요청이 적중할 때마다 유효 시간이 마지막으로 쓴 때부터 5분으로 늘어나 12분까지 간다. 12분까지 요청이 없어 만료되고, 15분 요청은 적중하지 못해 캐시에 다시 쓴다.",
	},
	en: {
		captions: [
			"① Written at 0 min, valid until 5 min",
			"② A hit at 3 min adds another 5 minutes",
			"③ Another hit at 7 min: valid until 12 min",
			"④ Unused until 12 min, so it expires",
			"⑤ The 15-min request misses and writes again",
			"⑥ The TTL runs 5 minutes from the last use",
		],
		badge: { write: "write", read: "read", expire: "expired" },
		ttl: "TTL",
		minute: (min) => `${min} min`,
		aria: "Looping animation of a timeline with a 5-minute TTL and requests at 0, 3, 7, and 15 minutes. The request at 0 minutes writes the cache, valid until 5 minutes. Each hit at 3 and 7 minutes extends it to 5 minutes after the last use, up to 12 minutes. With no request by 12 minutes it expires, and the request at 15 minutes misses and writes the cache again.",
	},
};
type Lang = keyof typeof LABELS;

// 지나간 구간은 진하게, 아직 남은 유효 시간은 옅게 그린다. 만료된 구간은 회색이다.
function drawWindow(ctx: CanvasRenderingContext2D, c: Colors, x0: number, x1: number, now: number, expired: boolean) {
	if (x1 - x0 < 1) return;
	if (expired) {
		ctx.beginPath();
		ctx.roundRect(x0, BAR_Y, x1 - x0, BAR_H, 4);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.stroke();
		return;
	}
	ctx.save();
	ctx.setLineDash([4, 3]);
	ctx.beginPath();
	ctx.roundRect(x0, BAR_Y, x1 - x0, BAR_H, 4);
	ctx.strokeStyle = c.green;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.restore();
	const xe = Math.min(now, x1);
	if (xe - x0 < 1) return;
	ctx.beginPath();
	ctx.roundRect(x0, BAR_Y, xe - x0, BAR_H, 4);
	ctx.fillStyle = c.greenFill;
	ctx.fill();
	ctx.strokeStyle = c.green;
	ctx.stroke();
}

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 14;
		const x = (min: number) => margin + ((w - margin * 2) * min) / END;
		const m = Math.min(END, (t / PLAY) * END);
		const step = t >= PLAY ? 5 : m < 3 ? 0 : m < 7 ? 1 : m < EXPIRE ? 2 : m < REWRITE ? 3 : 4;

		// 첫 캐시의 만료 시각은 마지막으로 쓴 때 + 5분이다. 적중할 때마다 뒤로 밀린다.
		let end1 = TTL;
		for (const h of HITS) {
			if (m < h) break;
			end1 = lerp(end1, h + TTL, ease(clamp01((m - h) / EXTEND)));
		}

		// 시간축과 눈금. 라벨은 캔버스 안쪽으로 당긴다.
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x(0), AXIS_Y);
		ctx.lineTo(x(END), AXIS_Y);
		for (let min = 0; min <= END; min += 5) {
			ctx.moveTo(x(min), AXIS_Y - 4);
			ctx.lineTo(x(min), AXIS_Y + 4);
		}
		ctx.stroke();
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 10px ${FONT}`;
		ctx.fillStyle = c.sub;
		for (let min = 0; min <= END; min += 5) {
			const label = L.minute(min);
			const half = ctx.measureText(label).width / 2;
			ctx.fillText(label, Math.min(Math.max(x(min), half + 2), w - half - 2), AXIS_Y + 14);
		}

		// 유효 시간 막대
		drawWindow(ctx, c, x(0), x(end1), x(m), m >= EXPIRE);
		if (m >= REWRITE) drawWindow(ctx, c, x(REWRITE), x(REWRITE + TTL), x(m), false);
		ctx.textAlign = "left";
		ctx.font = `600 10.5px ${FONT}`;
		ctx.fillStyle = m >= EXPIRE ? c.sub : c.green;
		ctx.fillText(L.ttl, x(0) + 6, BAR_Y + BAR_H / 2);

		// 요청과 만료 표시. 배지는 캔버스 안쪽으로 당긴다.
		ctx.font = `600 10.5px ${FONT}`;
		for (const e of EVENTS) {
			if (m < e.at) continue;
			const color = e.kind === "write" ? c.amber : e.kind === "read" ? c.green : c.red;
			const fill = e.kind === "write" ? c.amberFill : e.kind === "read" ? c.greenFill : c.redFill;
			const label = L.badge[e.kind];
			const half = (ctx.measureText(label).width + 14) / 2;
			const ex = x(e.at);
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(ex, MARK_Y + 5);
			ctx.lineTo(ex, BAR_Y);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(ex, MARK_Y, 4.5, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
			drawBadge(ctx, Math.min(Math.max(ex, half + 2), w - half - 2), MARK_Y - 16, label, fill, color, 1);
			ctx.font = `600 10.5px ${FONT}`;
		}

		// 재생 위치
		if (t < PLAY) {
			ctx.save();
			ctx.globalAlpha = 0.5;
			ctx.strokeStyle = c.text;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(x(m), MARK_Y - 28);
			ctx.lineTo(x(m), AXIS_Y + 4);
			ctx.stroke();
			ctx.restore();
		}

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 16);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function TtlDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

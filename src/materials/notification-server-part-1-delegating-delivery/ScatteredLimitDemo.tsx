import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 서문의 가정: 세 곳이 각자 한도 안에서 보낸 양이 외부 API에서 합쳐지면 한도를 넘는다.
// 점 하나가 10건이다. API 서버 4, 어드민 2, 배치 6 → 합계 120건, 한도는 5초당 100건.
const HEIGHT = 250;
const UNTIL = [1500, 5100, 8200, 11000];
const CYCLE = 11000;
// 점이 출발하는 순서(보내는 곳의 번호). 11번째부터 한도를 넘는다.
const ORDER = [2, 0, 2, 1, 0, 2, 2, 0, 1, 2, 0, 2];
const LIMIT_DOTS = 10;
const emitAt = (k: number) => 1600 + k * 280;
const arriveAt = (k: number) => emitAt(k) + 700;

const LABELS = {
	ko: {
		senders: ["API 서버", "어드민", "배치"],
		sent: (n: number) => `이번 5초 ${n}건`,
		api: "외부 메시징 API",
		total: (n: number) => `${n}건 / 5초`,
		limit: "한도 100건",
		rejected: (n: number) => `429 거절 ${n}건`,
		unit: "점 하나 = 10건",
		captions: [
			"① 세 곳이 각자 외부 API를 부른다",
			"② 각자 보기에는 5초당 100건 안이다",
			"③ 합치면 120건, 넘친 20건은 429로 거절된다",
			"④ 서로의 호출량을 아는 곳이 없다",
		],
		aria: "API 서버, 어드민, 배치가 각자 외부 메시징 API를 부르는 애니메이션. 각자 보낸 양은 40건, 20건, 60건으로 저마다 5초당 100건 한도 안이지만, 외부 API에서 합치면 120건이 되어 넘친 20건이 429로 거절된다. 점 하나는 10건이다.",
	},
	en: {
		senders: ["API server", "admin", "batch"],
		sent: (n: number) => `${n} in this 5 s`,
		api: "external messaging API",
		total: (n: number) => `${n} / 5 s`,
		limit: "limit 100",
		rejected: (n: number) => `429 rejected: ${n}`,
		unit: "one dot = 10 messages",
		captions: [
			"① Three places call the external API on their own",
			"② Each one stays under 100 per 5 seconds",
			"③ Together they send 120; the extra 20 get 429",
			"④ None of them knows how much the others send",
		],
		aria: "Animation of the API server, admin, and batch each calling the external messaging API. They send 40, 20, and 60 messages, each under the limit of 100 per 5 seconds, but the external API sees 120 in total and rejects the extra 20 with 429. One dot is 10 messages.",
	},
} as const;
type Lang = keyof typeof LABELS;

function drawBox(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	w: number,
	h: number,
	title: string,
	sub: string,
	c: Colors,
	stroke: string,
	alpha = 1,
) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 13px ${FONT}`;
	ctx.fillText(title, cx, cy - 8);
	ctx.fillStyle = c.sub;
	ctx.font = `400 10.5px ${FONT}`;
	ctx.fillText(sub, cx, cy + 9);
	ctx.restore();
}

function caption(ctx: CanvasRenderingContext2D, text: string, w: number, y: number, c: Colors) {
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `500 12px ${FONT}`;
	if (ctx.measureText(text).width > w - 16) ctx.font = `500 11px ${FONT}`;
	ctx.fillText(text, w / 2, y);
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const m = 8;
		const boxW = Math.min(132, (w - m * 2) * 0.34);
		const boxH = 40;
		const ys = [56, 116, 176];
		const sx = m + boxW / 2;
		const apiW = Math.min(170, (w - m * 2) * 0.42);
		const apiH = 96;
		const apiX = w - m - apiW / 2;
		const apiY = 116;
		const x0 = sx + boxW / 2 + 6;
		const x1 = apiX - apiW / 2 - 6;
		const endYs = [apiY - 22, apiY, apiY + 22];

		const step = UNTIL.findIndex((u) => t < u);
		const appear = (i: number) => (step === 0 ? clamp01((t - i * 300) / 600) : 1);

		// 단위 범례
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.sub;
		ctx.font = `400 10.5px ${FONT}`;
		ctx.fillText(L.unit, w - m, 14);

		// 보내는 곳 → 외부 API 연결선
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.5;
		for (let i = 0; i < 3; i += 1) {
			ctx.save();
			ctx.globalAlpha = appear(i) * 0.7;
			ctx.beginPath();
			ctx.moveTo(x0, ys[i]);
			ctx.lineTo(x1, endYs[i]);
			ctx.stroke();
			ctx.restore();
		}

		// 보내는 곳: 자기가 보낸 양만 센다. 각자는 한도 안이다.
		for (let i = 0; i < 3; i += 1) {
			const n = ORDER.filter((s, k) => s === i && emitAt(k) <= t).length * 10;
			drawBox(ctx, sx, ys[i], boxW, boxH, L.senders[i], L.sent(n), c, step >= 1 ? c.green : c.boxStroke, appear(i));
		}

		// 외부 API: 세 곳의 호출이 한 창에 합쳐진다.
		const arrived = ORDER.filter((_, k) => arriveAt(k) <= t).length;
		const over = arrived > LIMIT_DOTS;
		drawBox(ctx, apiX, apiY, apiW, apiH, "", "", c, over ? c.red : c.boxStroke);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.text;
		ctx.font = `600 13px ${FONT}`;
		ctx.fillText(L.api, apiX, apiY - 28);
		ctx.fillStyle = over ? c.red : c.text;
		ctx.font = `600 12px ${FONT}`;
		ctx.fillText(L.total(arrived * 10), apiX, apiY - 8);

		// 게이지: 120건 눈금 위에 한도 100건 선
		const gx = apiX - apiW / 2 + 12;
		const gw = apiW - 24;
		const gy = apiY + 8;
		const toX = (dots: number) => gx + (gw * dots) / ORDER.length;
		ctx.beginPath();
		ctx.roundRect(gx, gy, gw, 10, 3);
		ctx.fillStyle = c.line;
		ctx.globalAlpha = 0.35;
		ctx.fill();
		ctx.globalAlpha = 1;
		ctx.fillStyle = c.blue;
		ctx.fillRect(gx, gy, toX(Math.min(arrived, LIMIT_DOTS)) - gx, 10);
		if (over) {
			ctx.fillStyle = c.red;
			ctx.fillRect(toX(LIMIT_DOTS), gy, toX(arrived) - toX(LIMIT_DOTS), 10);
		}
		ctx.strokeStyle = c.text;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(toX(LIMIT_DOTS), gy - 4);
		ctx.lineTo(toX(LIMIT_DOTS), gy + 14);
		ctx.stroke();
		ctx.fillStyle = c.sub;
		ctx.font = `400 10.5px ${FONT}`;
		ctx.textAlign = "right";
		ctx.fillText(L.limit, toX(LIMIT_DOTS) + 2, gy + 26);

		// 이동 중인 점
		for (let k = 0; k < ORDER.length; k += 1) {
			if (t < emitAt(k) || t >= arriveAt(k)) continue;
			const s = ORDER[k];
			const q = ease(clamp01((t - emitAt(k)) / (arriveAt(k) - emitAt(k))));
			ctx.beginPath();
			ctx.arc(lerp(x0, x1, q), lerp(ys[s], endYs[s], q), 4.5, 0, Math.PI * 2);
			ctx.fillStyle = c.blue;
			ctx.fill();
		}

		// 한도를 넘어 도착한 점은 문 앞에서 거절된다.
		for (let k = LIMIT_DOTS; k < ORDER.length; k += 1) {
			if (t < arriveAt(k)) continue;
			const y = endYs[ORDER[k]];
			ctx.save();
			ctx.globalAlpha = clamp01((t - arriveAt(k)) / 250);
			ctx.strokeStyle = c.red;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(x1 - 5, y - 5);
			ctx.lineTo(x1 + 5, y + 5);
			ctx.moveTo(x1 + 5, y - 5);
			ctx.lineTo(x1 - 5, y + 5);
			ctx.stroke();
			ctx.restore();
		}
		if (over) {
			const p = clamp01((t - arriveAt(LIMIT_DOTS)) / 300);
			drawBadge(ctx, apiX, apiY + apiH / 2 + 16, L.rejected((arrived - LIMIT_DOTS) * 10), c.redFill, c.red, p);
		}

		caption(ctx, L.captions[step], w, HEIGHT - 18, c);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function ScatteredLimitDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

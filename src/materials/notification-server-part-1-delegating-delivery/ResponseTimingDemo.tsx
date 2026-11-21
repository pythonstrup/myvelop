import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 발송 서버 API의 두 갈래. 가입 처리 0.2초, 외부 API 3초라고 가정하고
// 가입 응답이 언제 돌아오는지를 같은 시간축에 놓는다.
const HEIGHT = 276;
const UNTIL = [1400, 6400, 9200, 12000];
const CYCLE = 12000;
const SIM_MAX = 3.5;
const SIGNUP = 0.2;
const EXTERNAL = 3;
const BG_START = 0.25;

const LABELS = {
	ko: {
		lanes: ["발송이 끝난 뒤 응답", "받자마자 202로 응답"],
		signup: "가입",
		external: "외부 API 3초",
		background: "뒤에서 발송",
		response: (s: string) => `응답 ${s}초`,
		where: "어디에 쌓아 두나?",
		tick: (s: number) => `${s}초`,
		captions: [
			"① 가입 처리 0.2초, 외부 API 3초가 걸린다고 하자",
			"② 발송 후 응답은 외부 API가 끝나기를 기다린다",
			"③ 가입 응답이 0.2초와 3.2초로 갈린다",
			"④ 202는 빠르지만 받은 요청을 어딘가 쌓아야 한다",
		],
		aria: "가입 요청 하나를 두 방식으로 처리할 때 응답 시점을 비교하는 애니메이션. 가입 처리에 0.2초, 외부 API에 3초가 걸린다고 할 때, 발송이 끝난 뒤 응답하면 가입 응답이 3.2초에 돌아온다. 받자마자 202로 응답하면 0.2초에 돌아오지만 발송은 뒤에서 이뤄지므로, 받은 요청을 어딘가에 쌓아 두어야 한다.",
	},
	en: {
		lanes: ["Respond after sending", "Respond 202 on receipt"],
		signup: "sign-up",
		external: "external API 3 s",
		background: "sent in the background",
		response: (s: string) => `response ${s} s`,
		where: "stored where?",
		tick: (s: number) => `${s} s`,
		captions: [
			"① Say sign-up takes 0.2 s and the external API 3 s",
			"② Responding after sending waits for the external API",
			"③ The sign-up response comes at 0.2 s or 3.2 s",
			"④ 202 is fast, but the request must be stored somewhere",
		],
		aria: "Animation comparing when the sign-up response returns under two approaches. With 0.2 s of sign-up work and a 3 s external API, responding after sending returns at 3.2 s. Responding 202 on receipt returns at 0.2 s, but the send happens in the background, so the received request has to be stored somewhere.",
	},
} as const;
type Lang = keyof typeof LABELS;

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
		const m = 10;
		const x = (s: number) => m + ((w - m * 2) * s) / SIM_MAX;
		const step = UNTIL.findIndex((u) => t < u);
		const now = step === 0 ? 0 : step === 1 ? lerp(0, SIM_MAX, clamp01((t - UNTIL[0]) / (UNTIL[1] - UNTIL[0]))) : SIM_MAX;

		const trackH = 18;
		const laneA = 58;
		const laneB = 146;
		const bgY = 182;
		const axisY = 226;

		// 구간을 지금 시각까지만 채운다.
		const segment = (y: number, from: number, to: number, fill: string, stroke: string, label = "", dashed = false) => {
			if (now <= from) return;
			const end = Math.min(now, to);
			ctx.save();
			ctx.beginPath();
			ctx.roundRect(x(from), y - trackH / 2, Math.max(2, x(end) - x(from)), trackH, 4);
			ctx.fillStyle = fill;
			ctx.fill();
			ctx.strokeStyle = stroke;
			ctx.lineWidth = 1.2;
			if (dashed) ctx.setLineDash([4, 3]);
			ctx.stroke();
			ctx.restore();
			if (label && x(end) - x(from) > ctx.measureText(label).width + 12) {
				ctx.fillStyle = stroke;
				ctx.font = `600 11px ${FONT}`;
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ctx.fillText(label, x(from) + 6, y + 0.5);
			}
		};

		// 응답이 돌아온 순간을 세로선과 배지로 표시한다.
		const responseMark = (y: number, at: number, color: string, fill: string) => {
			if (now < at) return;
			const p = step === 1 ? clamp01((now - at) / 0.25) : 1;
			ctx.save();
			ctx.globalAlpha = p;
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x(at), y - trackH / 2 - 6);
			ctx.lineTo(x(at), y + trackH / 2 + 6);
			ctx.stroke();
			ctx.restore();
			const label = L.response(at.toFixed(1));
			ctx.font = `600 10.5px ${FONT}`;
			const half = ctx.measureText(label).width / 2 + 7;
			const cx = Math.min(Math.max(x(at), m + half), w - m - half);
			drawBadge(ctx, cx, y - trackH / 2 - 16, label, fill, color, p);
		};

		// 레인 제목
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.font = `600 12.5px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.lanes[0], m, 16);
		ctx.fillText(L.lanes[1], m, 102);

		// 빈 트랙
		ctx.save();
		ctx.globalAlpha = 0.35;
		ctx.fillStyle = c.line;
		for (const y of [laneA, laneB]) {
			ctx.beginPath();
			ctx.roundRect(x(0), y - trackH / 2, x(SIM_MAX) - x(0), trackH, 4);
			ctx.fill();
		}
		ctx.restore();

		// 발송이 끝난 뒤 응답: 가입 → 외부 API 3초 → 응답
		ctx.font = `600 11px ${FONT}`;
		segment(laneA, 0, SIGNUP, c.blueFill, c.blue);
		segment(laneA, SIGNUP, SIGNUP + EXTERNAL, c.amberFill, c.amber, L.external);
		responseMark(laneA, SIGNUP + EXTERNAL, c.red, c.redFill);

		// 받자마자 202: 가입 → 응답, 발송은 아래 줄에서 뒤늦게
		segment(laneB, 0, SIGNUP, c.blueFill, c.blue);
		responseMark(laneB, SIGNUP, c.green, c.greenFill);
		segment(bgY, BG_START, BG_START + EXTERNAL, c.amberFill, c.amber, L.background, true);

		// 가입 구간 이름은 트랙 아래에 둔다(구간이 짧다).
		ctx.fillStyle = c.sub;
		ctx.font = `400 10.5px ${FONT}`;
		ctx.textAlign = "left";
		for (const y of [laneA, laneB]) if (now > 0) ctx.fillText(L.signup, x(0), y + trackH / 2 + 10);

		// ④ 뒤에서 보내는 요청은 어딘가에 쌓여 있어야 한다.
		if (step === 3) {
			const p = ease(clamp01((t - UNTIL[2]) / 500));
			drawBadge(ctx, x(BG_START + EXTERNAL / 2), bgY + trackH / 2 + 14, L.where, c.amberFill, c.amber, p);
		}

		// 시간축과 지금 시각
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x(0), axisY);
		ctx.lineTo(x(SIM_MAX), axisY);
		ctx.stroke();
		ctx.fillStyle = c.sub;
		ctx.font = `400 10.5px ${FONT}`;
		ctx.textAlign = "center";
		for (let s = 0; s <= 3; s += 1) {
			ctx.beginPath();
			ctx.moveTo(x(s), axisY - 3);
			ctx.lineTo(x(s), axisY + 3);
			ctx.stroke();
			ctx.fillText(L.tick(s), Math.max(x(s), m + 8), axisY + 13);
		}
		if (step === 1) {
			ctx.strokeStyle = c.sub;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(x(now), 30);
			ctx.lineTo(x(now), axisY);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		caption(ctx, L.captions[step], w, HEIGHT - 18, c);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function ResponseTimingDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

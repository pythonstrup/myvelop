import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 공지 1만 건이 쌓인 큐에 인증번호 한 건이 들어올 때.
// 위: 우선순위가 없어 맨 뒤에서 기다린다 / 아래: 우선순위로 맨 앞에 서서 바로 나간다.
// 워커는 5초에 100건을 보내므로 1만 건을 다 보내는 데 500초(8분 20초)가 걸린다.
const HEIGHT = 288;
const UNTIL = [1500, 3000, 5600, 9200];
const CYCLE = 9200;
const ENTER = [1500, 2300];
const JUMP = [5600, 6600];
const SEND = [6900, 7700];

const LABELS = {
	ko: {
		lanes: ["우선순위가 없을 때", "우선순위를 줄 때"],
		notice: "공지 1만 건",
		urgent: "인증번호",
		worker: "발송 워커",
		pace: "5초에 100건",
		waiting: "1만 1번째 · 약 8분 20초 뒤",
		sent: "다음 5초 안에 발송",
		captions: [
			"① 공지 1만 건이 큐에 쌓여 있다",
			"② 인증번호 한 건이 들어온다",
			"③ 우선순위가 없으면 1만 건 뒤에서 기다린다",
			"④ 우선순위가 있으면 맨 앞에 서서 바로 나간다",
		],
		aria: "공지 1만 건이 쌓인 큐에 인증번호 한 건이 들어올 때를 비교하는 애니메이션. 발송 워커는 5초에 100건을 보낸다. 우선순위가 없으면 인증번호는 1만 1번째로 줄을 서서 약 8분 20초 뒤에 나간다. 우선순위를 주면 인증번호가 맨 앞으로 가서 다음 5초 안에 발송된다.",
	},
	en: {
		lanes: ["Without priority", "With priority"],
		notice: "10,000 notices",
		urgent: "OTP",
		worker: "send worker",
		pace: "100 per 5 s",
		waiting: "10,001st · about 8 min 20 s",
		sent: "sent within the next 5 s",
		captions: [
			"① 10,000 notices are waiting in the queue",
			"② One OTP arrives",
			"③ Without priority, it waits behind all 10,000",
			"④ With priority, it goes to the front and out",
		],
		aria: "Animation of one OTP arriving at a queue that already holds 10,000 notices. The send worker sends 100 messages per 5 seconds. Without priority, the OTP is 10,001st in line and goes out after about 8 minutes 20 seconds. With priority, it moves to the front and is sent within the next 5 seconds.",
	},
} as const;
type Lang = keyof typeof LABELS;

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: Colors, stroke: string) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "center") {
	ctx.fillStyle = color;
	ctx.font = font;
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.fillText(s, x, y);
}

function urgentPill(ctx: CanvasRenderingContext2D, cx: number, cy: number, label: string, c: Colors, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.font = `600 10.5px ${FONT}`;
	const w = Math.max(44, ctx.measureText(label).width + 16);
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - 11, w, 22, 6);
	ctx.fillStyle = c.amberFill;
	ctx.fill();
	ctx.strokeStyle = c.amber;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	text(ctx, label, cx, cy + 0.5, c.amber, `600 10.5px ${FONT}`);
	ctx.restore();
}

// 배지가 캔버스 밖으로 나가지 않도록 가운데 좌표를 좁힌다.
function badgeX(ctx: CanvasRenderingContext2D, label: string, cx: number, w: number, m: number) {
	ctx.font = `600 10.5px ${FONT}`;
	const bw = ctx.measureText(label).width + 14;
	return Math.min(Math.max(cx, m + bw / 2), w - m - bw / 2);
}

function caption(ctx: CanvasRenderingContext2D, s: string, w: number, y: number, c: Colors) {
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `500 12px ${FONT}`;
	if (ctx.measureText(s).width > w - 16) ctx.font = `500 11px ${FONT}`;
	ctx.fillText(s, w / 2, y);
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const m = 8;
		const ww = 86;
		const wh = 46;
		const wx = w - m - ww;
		const qx0 = m;
		const qx1 = wx - 22;
		const slot = 64;
		const tailX = qx0 + 6 + slot / 2;
		const headX = qx1 - 6 - slot / 2;
		const cellsX0 = qx0 + 6 + slot + 4;
		const cellsX1 = qx1 - 6 - slot - 4;
		const n = Math.max(3, Math.floor((cellsX1 - cellsX0 + 3) / 13));
		const cw = (cellsX1 - cellsX0 - (n - 1) * 3) / n;
		const step = UNTIL.findIndex((u) => t < u);
		const fade = (from: number, dur = 300) => clamp01((t - from) / dur);
		const ys = [78, 196];

		for (let lane = 0; lane < 2; lane += 1) {
			const y = ys[lane];
			text(ctx, L.lanes[lane], m, y - 54, c.text, `600 12.5px ${FONT}`, "left");

			// 큐: 꼬리 칸 · 공지 · 머리 칸
			box(ctx, qx0, y - 22, qx1 - qx0, 44, c, c.boxStroke);
			for (let i = 0; i < n; i += 1) {
				ctx.beginPath();
				ctx.roundRect(cellsX0 + i * (cw + 3), y - 9, cw, 18, 3);
				ctx.fillStyle = c.line;
				ctx.fill();
			}
			text(ctx, L.notice, (cellsX0 + cellsX1) / 2, y + 34, c.sub, `500 11px ${FONT}`);

			// 큐 → 발송 워커
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(qx1 + 4, y);
			ctx.lineTo(wx - 6, y);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(wx - 4, y);
			ctx.lineTo(wx - 11, y - 4);
			ctx.lineTo(wx - 11, y + 4);
			ctx.closePath();
			ctx.fillStyle = c.line;
			ctx.fill();

			const sent = lane === 1 && t >= SEND[1];
			box(ctx, wx, y - wh / 2, ww, wh, c, sent ? c.green : c.boxStroke);
			text(ctx, L.worker, wx + ww / 2, y - 8, c.text, `600 12.5px ${FONT}`);
			text(ctx, L.pace, wx + ww / 2, y + 11, c.sub, `400 10.5px ${FONT}`);

			// 인증번호: 위에서 내려와 꼬리 칸에 선다.
			if (t >= ENTER[0]) {
				const q = ease(clamp01((t - ENTER[0]) / (ENTER[1] - ENTER[0])));
				let x = tailX;
				let py = lerp(y - 30, y, q);
				let alpha = clamp01((t - ENTER[0]) / 250);
				if (lane === 1 && t >= JUMP[0]) {
					// 우선순위: 공지 위를 넘어 머리 칸으로 간 뒤 워커로 나간다.
					const j = ease(clamp01((t - JUMP[0]) / (JUMP[1] - JUMP[0])));
					x = lerp(tailX, headX, j);
					py = y - Math.sin(Math.PI * j) * 30;
					if (t >= SEND[0]) {
						const s = ease(clamp01((t - SEND[0]) / (SEND[1] - SEND[0])));
						x = lerp(headX, wx + ww / 2, s);
						py = y;
						alpha = 1 - clamp01((t - (SEND[1] - 250)) / 250);
					}
				}
				urgentPill(ctx, x, py, L.urgent, c, alpha);
			}

			if (lane === 0 && step >= 2) {
				drawBadge(ctx, badgeX(ctx, L.waiting, tailX, w, m), y - 34, L.waiting, c.redFill, c.red, fade(UNTIL[1]));
			}
			if (sent) {
				drawBadge(ctx, badgeX(ctx, L.sent, wx + ww / 2, w, m), y - 36, L.sent, c.greenFill, c.green, fade(SEND[1]));
			}
		}

		caption(ctx, L.captions[step], w, HEIGHT - 16, c);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function PriorityDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

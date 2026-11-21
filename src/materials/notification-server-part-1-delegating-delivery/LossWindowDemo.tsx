import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 커밋 직후, 큐에 넣기 직전에 서버가 죽으면 무엇이 남는가.
// 위: 메시지 큐에 바로 넣기 / 아래: 트랜잭셔널 아웃박스.
const HEIGHT = 300;
const UNTIL = [2400, 4600, 7600, 10200];
const CYCLE = 10200;
const COMMIT = [500, 1400];
const CRASH = 2700;
const RESTART = 4700;
const PICK = [5300, 6300];

const LABELS = {
	ko: {
		lanes: ["메시지 큐에 바로 넣기", "트랜잭셔널 아웃박스"],
		api: "가입 API",
		db: "DB",
		queue: "큐",
		worker: "발송 워커",
		member: "회원",
		request: "발송 요청",
		tx: "한 트랜잭션",
		crash: "서버 다운",
		restarted: "재시작",
		empty: "비어 있음",
		waiting: "대기",
		lost: "알림 유실",
		sent: "발송 완료",
		picked: "요청을 꺼냄",
		captions: [
			"① 가입을 DB에 커밋한다",
			"② 큐에 넣기 직전에 서버가 죽는다",
			"③ 큐에는 남은 것이 없고, 아웃박스에는 요청이 남아 있다",
			"④ 아웃박스는 가입과 함께 커밋되어 틈이 없다",
		],
		aria: "커밋 직후 서버가 죽을 때를 비교하는 애니메이션. 메시지 큐에 바로 넣는 쪽은 가입이 DB에 커밋된 뒤 큐에 넣기 직전에 서버가 죽어 큐가 빈 채로 남고 알림이 사라진다. 트랜잭셔널 아웃박스 쪽은 가입과 발송 요청이 한 트랜잭션으로 커밋되어, 서버가 재시작된 뒤 발송 워커가 아웃박스에서 요청을 꺼내 보낸다.",
	},
	en: {
		lanes: ["Enqueue directly", "Transactional outbox"],
		api: "sign-up API",
		db: "DB",
		queue: "queue",
		worker: "send worker",
		member: "user",
		request: "send request",
		tx: "one transaction",
		crash: "server down",
		restarted: "restarted",
		empty: "empty",
		waiting: "waiting",
		lost: "notification lost",
		sent: "sent",
		picked: "request taken",
		captions: [
			"① Sign-up is committed to the DB",
			"② The server dies right before enqueueing",
			"③ The queue holds nothing; the outbox still has the request",
			"④ The outbox commits with sign-up, so there is no gap",
		],
		aria: "Animation comparing a server crash right after commit. When enqueueing directly, sign-up is committed to the DB, the server dies before enqueueing, the queue stays empty, and the notification is lost. With a transactional outbox, sign-up and the send request commit in one transaction, and after the restart the send worker takes the request from the outbox and sends it.",
	},
} as const;
type Lang = keyof typeof LABELS;

function box(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, c: Colors, stroke: string) {
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, font: string) {
	ctx.fillStyle = color;
	ctx.font = font;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(s, x, y);
}

function pill(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, label: string, fill: string, color: string, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - 8, w, 16, 5);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.stroke();
	text(ctx, label, cx, cy + 0.5, color, `500 10.5px ${FONT}`);
	ctx.restore();
}

function cross(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(x - r, y - r);
	ctx.lineTo(x + r, y + r);
	ctx.moveTo(x + r, y - r);
	ctx.lineTo(x - r, y + r);
	ctx.stroke();
	ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
	ctx.beginPath();
	ctx.arc(x, y, 4.5, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
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
		const gap = 14;
		const bw = Math.min(124, (w - m * 2 - gap * 2) / 3);
		const bh = 66;
		const xs = [m + bw / 2, w / 2, w - m - bw / 2];
		const ys = [62, 196];
		const step = UNTIL.findIndex((u) => t < u);
		const fade = (from: number, dur = 300) => clamp01((t - from) / dur);
		const down = t >= CRASH && t < RESTART;
		const committed = t >= COMMIT[1];

		// 레인 제목
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.font = `600 12.5px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.lanes[0], m, 14);
		ctx.fillText(L.lanes[1], m, 148);

		for (let lane = 0; lane < 2; lane += 1) {
			const y = ys[lane];
			const apiStroke = down ? c.red : c.boxStroke;

			// 연결선: 가입 API → DB, 그리고 위 레인은 API → 큐(아래로 돌아가는 곡선), 아래 레인은 DB → 워커
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(xs[0] + bw / 2 + 4, y);
			ctx.lineTo(xs[1] - bw / 2 - 4, y);
			if (lane === 1) {
				ctx.moveTo(xs[1] + bw / 2 + 4, y);
				ctx.lineTo(xs[2] - bw / 2 - 4, y);
			}
			ctx.stroke();
			if (lane === 0) {
				// API → 큐는 DB 아래로 돌아가는 점선 곡선이다. 요청은 끝내 이 길을 지나지 못한다.
				ctx.save();
				ctx.setLineDash([4, 4]);
				ctx.strokeStyle = c.line;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(xs[0], y + bh / 2 + 2);
				ctx.quadraticCurveTo(xs[1], y + bh / 2 + 44, xs[2], y + bh / 2 + 2);
				ctx.stroke();
				ctx.restore();
			}

			// 상자
			box(ctx, xs[0], y, bw, bh, c, apiStroke);
			text(ctx, L.api, xs[0], y - 8, c.text, `600 13px ${FONT}`);
			if (down) text(ctx, L.crash, xs[0], y + 12, c.red, `600 10.5px ${FONT}`);
			else if (t >= RESTART) text(ctx, L.restarted, xs[0], y + 12, c.sub, `400 10.5px ${FONT}`);
			if (down) cross(ctx, xs[0] + bw / 2 - 10, y - bh / 2 + 10, 5, c.red, fade(CRASH, 200));

			box(ctx, xs[1], y, bw, bh, c, committed ? c.green : c.boxStroke);
			text(ctx, L.db, xs[1], y - 20, c.text, `600 13px ${FONT}`);

			const third = lane === 0 ? L.queue : L.worker;
			const lost = lane === 0 && t >= RESTART;
			const sent = lane === 1 && t >= PICK[1];
			box(ctx, xs[2], y, bw, bh, c, lost ? c.red : sent ? c.green : c.boxStroke);
			text(ctx, third, xs[2], y - 8, c.text, `600 13px ${FONT}`);
			if (lane === 0) text(ctx, L.empty, xs[2], y + 12, lost ? c.red : c.sub, `400 10.5px ${FONT}`);
			else text(ctx, sent ? L.picked : L.waiting, xs[2], y + 12, sent ? c.green : c.sub, `400 10.5px ${FONT}`);

			// 커밋: API → DB로 점이 가고, 행이 생긴다.
			if (t >= COMMIT[0] && t < COMMIT[1]) {
				const q = ease(clamp01((t - COMMIT[0]) / (COMMIT[1] - COMMIT[0])));
				dot(ctx, lerp(xs[0] + bw / 2 + 4, xs[1] - bw / 2 - 4, q), y, c.blue);
			}
			const rowW = bw - 16;
			pill(ctx, xs[1], y + 2, rowW, L.member, c.greenFill, c.green, fade(COMMIT[1]));
			if (lane === 1) {
				const done = t >= PICK[0];
				pill(ctx, xs[1], y + 21, rowW, L.request, done ? c.boxFill : c.blueFill, done ? c.sub : c.blue, fade(COMMIT[1]));
				if (committed && step <= 1) {
					ctx.save();
					ctx.globalAlpha = fade(COMMIT[1]);
					text(ctx, L.tx, xs[1], y + bh / 2 + 12, c.green, `500 10.5px ${FONT}`);
					ctx.restore();
				}
			}

			// 위 레인: 큐로 가려던 요청이 서버와 함께 사라진다.
			if (lane === 0) {
				const midY = y + bh / 2 + 23;
				if (t >= COMMIT[1] && t < CRASH) dot(ctx, xs[0] + bw / 2 - 6, y + bh / 2 - 6, c.blue);
				if (t >= CRASH) cross(ctx, xs[1], midY, 6, c.red, fade(CRASH, 250));
				if (lost) drawBadge(ctx, xs[2], y - bh / 2 - 13, L.lost, c.redFill, c.red, fade(RESTART));
			}

			// 아래 레인: 재시작 뒤 워커가 아웃박스에서 요청을 꺼내 보낸다.
			if (lane === 1 && t >= PICK[0] && t < PICK[1]) {
				const q = ease(clamp01((t - PICK[0]) / (PICK[1] - PICK[0])));
				dot(ctx, lerp(xs[1] + bw / 2 + 4, xs[2] - bw / 2 - 4, q), y, c.blue);
			}
			if (sent) drawBadge(ctx, xs[2], y - bh / 2 - 13, L.sent, c.greenFill, c.green, fade(PICK[1]));
		}

		caption(ctx, L.captions[step], w, HEIGHT - 16, c);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function LossWindowDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

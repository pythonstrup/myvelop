import { type Colors, drawBadge, ease, FONT, lerp, clamp01, palette, useCanvasScene } from "@/materials/shared";

// 동시성을 다루지 않은 naive 발송의 실패 재생. 마지막 표시가 붙은 청크가
// 중간 청크보다 먼저 끝나 그룹이 덜 담긴 채 발송되는 결정적 애니메이션이다.
const UNTIL = [1800, 4200, 6600, 8800, 11000, 13000];
const CYCLE = 13000;
const HEIGHT = 232;

// 청크별 이동 구간(ms). 1번이 가장 느려 발송 뒤에야 도착한다.
const CHUNKS = [
	{ start: 1800, arrive: 4800 },
	{ start: 2600, arrive: 12200 },
	{ start: 2200, arrive: 6000 },
];

const LABELS = {
	ko: {
		captions: [
			"① batch 서버가 청크 셋을 큐에 넣는다",
			"② 워커들이 비동기로 소비한다, 속도는 제각각이다",
			"③ 마지막 표시가 붙은 청크 2가 청크 1보다 먼저 끝난다",
			"④ 마지막이 끝났다는 판정이 발송을 트리거한다",
			"⑤ 청크 1이 담기기 전에 그룹이 발송된다",
			"⑥ 청크 1의 몫이 빠졌다, 부분 발송이다",
		],
		chunk: "청크",
		last: "마지막 표시",
		wait: "대기",
		staging: "적재 중",
		done: "적재 완료",
		missed: "못 담았다",
		group: "그룹",
		stagedOf: (n: number) => `${n}/3 담김`,
		sent: "발송됨 · 2/3",
		trigger: "발송 트리거",
		partial: "부분 발송",
		aria: "청크 셋이 비동기로 소비되다 마지막 표시가 붙은 청크 2가 청크 1보다 먼저 끝나고, 마지막이 끝났다는 판정이 발송을 트리거해 그룹이 2/3만 담긴 채 발송되며, 늦게 끝난 청크 1의 몫이 빠지는 부분 발송이 되는 여섯 단계를 반복 재생하는 애니메이션.",
	},
	en: {
		captions: [
			"① The batch server queues three chunks",
			"② Workers consume them asynchronously, at varying speeds",
			"③ Chunk 2, marked last, finishes before chunk 1",
			"④ The last-chunk-done rule triggers the send",
			"⑤ The group ships before chunk 1 is staged",
			"⑥ Chunk 1's share is missing, a partial send",
		],
		chunk: "chunk",
		last: "marked last",
		wait: "queued",
		staging: "staging",
		done: "staged",
		missed: "missed",
		group: "group",
		stagedOf: (n: number) => `${n}/3 staged`,
		sent: "sent · 2/3",
		trigger: "send triggered",
		partial: "partial send",
		aria: "Looping animation of six steps: three chunks are consumed asynchronously, chunk 2 marked as last finishes before chunk 1, the last-chunk-done rule triggers the send, the group ships with only 2/3 staged, and chunk 1's late share is left out — a partial send.",
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
	stroke = c.boxStroke,
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

function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors, dark: boolean, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(x, y, 9, 0, Math.PI * 2);
	ctx.fillStyle = c.green;
	ctx.fill();
	ctx.strokeStyle = dark ? "#1a1a1a" : "#ffffff";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x - 4, y);
	ctx.lineTo(x - 1, y + 3);
	ctx.lineTo(x + 4, y - 4);
	ctx.stroke();
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const boxW = Math.min(140, (w - margin * 2) * 0.36);
		const boxH = 38;
		const ys = [40, 100, 160];
		const chunkX = margin + boxW / 2;
		const groupX = w - margin - boxW / 2;
		const groupY = 100;
		const groupH = 64;
		const lineStartX = chunkX + boxW / 2 + 6;
		const lineEndX = groupX - boxW / 2 - 8;
		const endYs = [groupY - 16, groupY, groupY + 16];

		const step = UNTIL.findIndex((u) => t < u);
		const p = ease((t - (step === 0 ? 0 : UNTIL[step - 1])) / (UNTIL[step] - (step === 0 ? 0 : UNTIL[step - 1])));

		const appear = (i: number) => (step === 0 ? clamp01((t - i * 350) / 700) : 1);
		const prog = (i: number) => ease(clamp01((t - CHUNKS[i].start) / (CHUNKS[i].arrive - CHUNKS[i].start)));
		const staged = (i: number) => t >= CHUNKS[i].arrive;
		const sent = step >= 4;
		const rejected = t >= CHUNKS[1].arrive;

		// 청크 → 그룹 연결선
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.5;
		for (let i = 0; i < 3; i += 1) {
			ctx.save();
			ctx.globalAlpha = appear(i) * 0.7;
			ctx.beginPath();
			ctx.moveTo(lineStartX, ys[i]);
			ctx.lineTo(lineEndX, endYs[i]);
			ctx.stroke();
			ctx.restore();
		}

		// 그룹 박스 — 담긴 몫을 세다가, ⑤에서 2/3인 채로 발송된다.
		const n = (staged(0) ? 1 : 0) + (staged(2) ? 1 : 0);
		drawBox(ctx, groupX, groupY, boxW, groupH, L.group, sent ? L.sent : L.stagedOf(n), c, sent ? c.red : c.boxStroke);

		// 청크 박스들. 2번은 마지막 표시를 달고 있고, 1번은 끝내 담지 못한다.
		for (let i = 0; i < 3; i += 1) {
			const moving = t >= CHUNKS[i].start && !staged(i);
			const sub = i === 2 ? L.last : t < CHUNKS[i].start ? L.wait : i === 1 ? (rejected ? L.missed : L.staging) : staged(i) ? L.done : L.staging;
			const stroke =
				i === 1 && rejected ? c.red : i !== 1 && staged(i) ? c.green : moving ? c.blue : c.boxStroke;
			drawBox(ctx, chunkX, ys[i], boxW, boxH, `${L.chunk} ${i}`, sub, c, stroke, appear(i));
			if (i !== 1 && staged(i)) drawCheck(ctx, chunkX + boxW / 2 - 2, ys[i] - boxH / 2 + 2, c, dark, clamp01((t - CHUNKS[i].arrive) / 300));
		}

		// 적재 중인 몫이 선을 따라 이동한다.
		for (let i = 0; i < 3; i += 1) {
			const q = prog(i);
			if (t >= CHUNKS[i].start && q < 1) {
				ctx.beginPath();
				ctx.arc(lerp(lineStartX, lineEndX, q), lerp(ys[i], endYs[i], q), 4, 0, Math.PI * 2);
				ctx.fillStyle = c.blue;
				ctx.fill();
			}
		}

		// ⑥: 늦게 도착한 청크 1의 몫은 발송된 그룹에 담기지 못한다.
		if (rejected) {
			ctx.save();
			ctx.globalAlpha = clamp01((t - CHUNKS[1].arrive) / 300);
			ctx.strokeStyle = c.red;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(lineEndX - 5, groupY - 5);
			ctx.lineTo(lineEndX + 5, groupY + 5);
			ctx.moveTo(lineEndX + 5, groupY - 5);
			ctx.lineTo(lineEndX - 5, groupY + 5);
			ctx.stroke();
			ctx.restore();
		}

		// ④~⑥: 발송 트리거 배지, 마지막엔 부분 발송으로 바뀐다.
		const badgeY = groupY + groupH / 2 + 16;
		if (step === 5) drawBadge(ctx, groupX, badgeY, L.partial, c.redFill, c.red, p);
		else if (step >= 3) drawBadge(ctx, groupX, badgeY, L.trigger, c.amberFill, c.amber, step === 3 ? p : 1);

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 26);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function PrematureSendDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas
				ref={canvasRef}
				role="img"
				aria-label={LABELS[lang].aria}
				style={{ display: "block", width: "100%" }}
			/>
		</div>
	);
}

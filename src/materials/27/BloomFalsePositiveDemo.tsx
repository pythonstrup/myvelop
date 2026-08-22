import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 거짓 양성은 배열이 찬 정도의 문제다. 값이 늘어 배열이 차오르면
// 넣은 적 없는 값도 켜진 자리만 밟게 되고, 배열을 키우면 다시 0을 만난다.
const UNTIL = [3400, 7200, 11000, 15000, 18800, 22200];
const CYCLE = 22200;
const HEIGHT = 252;

const BITS1 = 16;
// 삽입 값과 해시 자리. dave는 넣지 않는다.
const PHASE1 = [
	{ name: "alice", bits: [1, 5, 9] },
	{ name: "bob", bits: [4, 9, 14] },
];
const PHASE2 = [
	{ name: "carol", bits: [2, 7, 13] },
	{ name: "eve", bits: [0, 8, 11] },
	{ name: "frank", bits: [3, 10, 15] },
];
const PROBE = [4, 8, 13]; // dave의 해시 자리 — 두 배열에서 같은 자리를 짚는다

const BITS2 = 24;
const ON2 = [1, 9, 17, 4, 14, 21, 2, 7, 19, 0, 11, 15, 3, 10, 22]; // 같은 값 다섯을 24칸에 넣은 결과

// 각 비트가 켜지는 시각
const LIT: Record<number, number> = {};
PHASE1.forEach((v, vi) =>
	v.bits.forEach((b, k) => {
		LIT[b] = Math.min(LIT[b] ?? Infinity, 500 + vi * 1000 + k * 160);
	}),
);
PHASE2.forEach((v, vi) =>
	v.bits.forEach((b, k) => {
		LIT[b] = Math.min(LIT[b] ?? Infinity, UNTIL[1] + 400 + vi * 800 + k * 140);
	}),
);

const LABELS = {
	ko: {
	captions: [
		"① 값을 넣을 때마다 1인 칸이 늘어난다 — alice, bob",
		"② 조회 dave — 0인 칸이 있어 확실히 없다",
		"③ carol, eve, frank까지 넣자 배열이 거의 다 찼다",
		"④ 같은 dave 조회 — 전부 1이다. 바뀐 건 dave가 아니라 배열이다",
		"⑤ 배열이 24칸이었다면 덜 차서, dave는 0을 만난다",
		"⑥ 거짓 양성은 배열이 찬 정도의 문제다 — 크기와 해시로 조절한다",
	],
	ins1: "넣은 값: alice, bob",
	ins2: "넣은 값: + carol, eve, frank",
	query: '조회 "dave"',
	fill: (n: number, m: number) => `1인 칸 ${n}/${m}`,
	verdictNo: "8번이 0 → 확실히 없음",
	verdictFp: "전부 1 → 있을 수 있음 · 사실은 없다",
	wide: "같은 값 다섯, 배열만 24칸",
	aria: "블룸 필터의 거짓 양성이 언제 생기는지 반복 재생하는 애니메이션. 16칸 비트 배열에 alice와 bob을 넣어 다섯 칸만 켜진 상태에서 넣은 적 없는 dave를 조회하면 짚은 자리 중 0이 있어 확실히 없다고 답한다. carol, eve, frank까지 넣어 배열이 열네 칸까지 차면, 같은 dave 조회가 이번에는 전부 1을 만나 있을 수 있다고 답한다. dave는 그대로인데 배열이 차서 생긴 거짓 양성이다. 배열이 24칸이었다면 같은 값 다섯을 넣어도 덜 차서 dave는 0을 만나 없다고 즉시 답한다. 거짓 양성은 배열이 찬 정도의 문제이고, 배열 크기와 해시 개수로 조절한다.",
},
	en: {
		captions: [
			"\u2460 Every insert turns on more slots \u2014 alice, bob",
			"\u2461 Query dave \u2014 a 0 slot: definitely absent",
			"\u2462 After carol, eve and frank the array is nearly full",
			"\u2463 Same query \u2014 all 1s now. The array changed, not dave",
			"\u2464 With 24 slots it stays sparse and dave hits a 0",
			"\u2465 False positives track how full the array is \u2014 size and hashes tune it",
		],
		ins1: "inserted: alice, bob",
		ins2: "inserted: + carol, eve, frank",
		query: 'query "dave"',
		fill: (n: number, m: number) => `on bits ${n}/${m}`,
		verdictNo: "slot 8 is 0 \u2192 definitely absent",
		verdictFp: "all 1s \u2192 maybe \u00b7 actually absent",
		wide: "same five values, 24 slots",
		aria: "Looping animation of when Bloom filter false positives happen. With alice and bob inserted, only five of sixteen slots are on, and querying the never-inserted dave hits a 0 slot, answering definitely absent. After carol, eve and frank fill the array to fourteen slots, the same dave query now meets all 1s and answers maybe \u2014 dave did not change, the array did. Had the array held 24 slots, the same five values would leave it sparse and dave would hit a 0 again. False positives track how full the array is, tuned by its size and the number of hashes.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 14;
const TOP_Y = 24;
const BIT1_Y = 60;
const BIT1_H = 34;
const IDX_Y = BIT1_Y + BIT1_H + 11;
const LBL2_Y = 140;
const BIT2_Y = 156;
const BIT2_H = 28;
const VERDICT_Y = 210;

const fade = (t: number, at: number, dur = 500) => ease(clamp01((t - at) / dur));

function drawArrow(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: string,
	alpha: number,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.4;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2 - 7);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x2, y2);
	ctx.lineTo(x2 - 4, y2 - 6);
	ctx.lineTo(x2 + 4, y2 - 6);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const usable = w - MARGIN * 2;
	const step = UNTIL.findIndex((u) => t < u);
	const cellW1 = usable / BITS1;
	const cx1 = (i: number) => MARGIN + i * cellW1 + cellW1 / 2;

	// 위 배열(16칸)
	let onCount1 = 0;
	for (let i = 0; i < BITS1; i++) {
		const a = LIT[i] !== undefined ? fade(t, LIT[i], 300) : 0;
		if (a > 0.5) onCount1++;
		const x = MARGIN + i * cellW1 + 1.5;
		const cw = cellW1 - 3;
		ctx.beginPath();
		ctx.roundRect(x, BIT1_Y, cw, BIT1_H, 4);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.stroke();
		if (a > 0) {
			ctx.save();
			ctx.globalAlpha = a;
			ctx.beginPath();
			ctx.roundRect(x, BIT1_Y, cw, BIT1_H, 4);
			ctx.fillStyle = c.blueFill;
			ctx.fill();
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 1.3;
			ctx.stroke();
			ctx.restore();
		}
		ctx.font = `700 13px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = a > 0.5 ? c.blue : c.sub;
		ctx.fillText(a > 0.5 ? "1" : "0", cx1(i), BIT1_Y + BIT1_H / 2);
		ctx.font = `500 9px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(String(i), cx1(i), IDX_Y);
	}

	// 삽입 라벨(왼쪽)과 채움 계기판(오른쪽)
	ctx.font = `600 11px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.sub;
	const insLabel = step >= 2 ? L.ins2 : L.ins1;
	ctx.save();
	ctx.globalAlpha = fade(t, step >= 2 ? UNTIL[1] + 200 : 300, 350);
	ctx.fillText(insLabel, MARGIN, TOP_Y);
	ctx.restore();
	ctx.textAlign = "right";
	ctx.fillStyle = onCount1 >= 12 ? c.red : c.sub;
	ctx.fillText(L.fill(onCount1, BITS1), w - MARGIN, TOP_Y);

	// dave 조회 (②와 ④)
	const querying = step === 1 || step === 3;
	if (querying) {
		const qStart = step === 1 ? UNTIL[0] : UNTIL[2];
		const qa = fade(t, qStart + 100, 300);
		ctx.save();
		ctx.globalAlpha = qa;
		ctx.font = `600 12px ${FONT}`;
		const bw = ctx.measureText(L.query).width + 20;
		ctx.beginPath();
		ctx.roundRect(w / 2 - bw / 2, TOP_Y - 12, bw, 24, 7);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.amber;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = c.text;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(L.query, w / 2, TOP_Y);
		ctx.restore();

		PROBE.forEach((b, k) => {
			const a = fade(t, qStart + 400 + k * 500, 350);
			drawArrow(ctx, w / 2, TOP_Y + 12, cx1(b), BIT1_Y - 4, c.amber, a);
			if (a > 0) {
				const on = LIT[b] !== undefined && fade(t, LIT[b], 300) > 0.5;
				ctx.save();
				ctx.globalAlpha = a;
				ctx.setLineDash([3, 3]);
				ctx.strokeStyle = on ? c.green : c.red;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.roundRect(MARGIN + b * cellW1 + 0.5, BIT1_Y - 3, cellW1 - 1, BIT1_H + 6, 6);
				ctx.stroke();
				ctx.restore();
			}
		});

		const va = fade(t, qStart + 2200, 400);
		if (step === 1) drawBadge(ctx, w / 2, VERDICT_Y, L.verdictNo, c.greenFill, c.green, va);
		else drawBadge(ctx, w / 2, VERDICT_Y, L.verdictFp, c.redFill, c.red, va);
	}

	// ⑤ 배열이 24칸이었다면
	if (step >= 4) {
		const wa = fade(t, UNTIL[3] + 200, 400);
		const cellW2 = usable / BITS2;
		const cx2 = (i: number) => MARGIN + i * cellW2 + cellW2 / 2;
		let onCount2 = 0;
		ctx.save();
		ctx.globalAlpha = wa;
		ctx.font = `600 11px ${FONT}`;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.wide, MARGIN, LBL2_Y);
		ctx.restore();
		for (let i = 0; i < BITS2; i++) {
			const a = wa * fade(t, UNTIL[3] + 500 + i * 40, 250);
			const on = ON2.includes(i);
			if (on && a > 0.5) onCount2++;
			const x = MARGIN + i * cellW2 + 1;
			const cw = cellW2 - 2;
			ctx.save();
			ctx.globalAlpha = wa;
			ctx.beginPath();
			ctx.roundRect(x, BIT2_Y, cw, BIT2_H, 3);
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 0.9;
			ctx.stroke();
			if (on && a > 0) {
				ctx.globalAlpha = a;
				ctx.beginPath();
				ctx.roundRect(x, BIT2_Y, cw, BIT2_H, 3);
				ctx.fillStyle = c.blueFill;
				ctx.fill();
				ctx.strokeStyle = c.blue;
				ctx.lineWidth = 1.1;
				ctx.stroke();
			}
			ctx.font = `700 10px ${FONT}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = on && a > 0.5 ? c.blue : c.sub;
			ctx.fillText(on && a > 0.5 ? "1" : "0", cx2(i), BIT2_Y + BIT2_H / 2);
			ctx.restore();
		}
		ctx.save();
		ctx.globalAlpha = wa;
		ctx.font = `600 11px ${FONT}`;
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.fill(onCount2, BITS2), w - MARGIN, LBL2_Y);
		ctx.restore();

		// 같은 자리(4·8·13)를 짚는다 — 8이 0이다
		PROBE.forEach((b, k) => {
			const a = wa * fade(t, UNTIL[3] + 1700 + k * 400, 350);
			if (a > 0) {
				const on = ON2.includes(b);
				ctx.save();
				ctx.globalAlpha = a;
				ctx.setLineDash([3, 3]);
				ctx.strokeStyle = on ? c.green : c.red;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.roundRect(MARGIN + b * cellW2 + 0.5, BIT2_Y - 3, cellW2 - 1, BIT2_H + 6, 5);
				ctx.stroke();
				ctx.restore();
			}
		});
		if (step === 4) {
			drawBadge(ctx, w / 2, VERDICT_Y, L.verdictNo, c.greenFill, c.green, fade(t, UNTIL[3] + 3100, 400));
		}
	}

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function BloomFalsePositiveDemo({ lang = "ko" }: { lang?: Lang }) {
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

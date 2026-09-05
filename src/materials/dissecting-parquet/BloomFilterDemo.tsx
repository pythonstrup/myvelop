import { type Colors, clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 블룸 필터의 원리: 해시가 짚은 자리를 켜서 넣고, 조회는 그 자리들이 켜져 있는지만 본다.
// 한 장면에 개념 하나씩 — 삽입 2번, 조회 2번(즉답·거짓 양성), 마지막에 요약.
const UNTIL = [3000, 6600, 10200, 14200, 18200, 21700];
const CYCLE = 21700;
const HEIGHT = 262;

const BITS = 12;
const ALICE = [2, 5, 9];
const BOB = [4, 5, 11]; // 5는 alice와 겹친다 — 겹쳐도 그대로 1
const CAROL = [4, 7, 9]; // h2가 짚은 7이 0 → 나머지는 볼 것도 없다
const DAVE = [2, 4, 11]; // 우연히 전부 1 → 거짓 양성

type StepDef = {
	kind: "idle" | "insert" | "query" | "summary";
	name?: string;
	bits?: number[];
	verdict?: "no" | "maybe";
	probes?: number;
};
const STEPS: StepDef[] = [
	{ kind: "idle" },
	{ kind: "insert", name: "alice", bits: ALICE },
	{ kind: "insert", name: "bob", bits: BOB },
	{ kind: "query", name: "carol", bits: CAROL, verdict: "no", probes: 2 },
	{ kind: "query", name: "dave", bits: DAVE, verdict: "maybe", probes: 3 },
	{ kind: "summary" },
];

const LABELS = {
	ko: {
	captions: [
		"① 블룸 필터 = 비트 배열 + 해시 함수 3개, 처음엔 전부 0이다",
		"② 삽입 — 해시 3개가 낸 번호의 칸을 1로 켠다",
		"③ 삽입 — 이미 켜진 칸(5번)은 그대로 둔다",
		"④ 조회 — 0인 칸이 나오면 그 즉시 \"확실히 없음\"이다",
		"⑤ 조회 — 전부 1이어도 \"있을 수 있음\"일 뿐이다",
		"⑥ 블룸 필터는 \"없음\"을 빠르게 걸러내는 데 쓴다",
	],
	insert: (n: string) => `삽입 "${n}"`,
	query: (n: string) => `조회 "${n}"`,
	verdictNo: "7번이 0 → 확실히 없음 · 즉시 끝",
	verdictMaybe: "전부 1 → 있을 수 있음 · 사실은 없다",
	sum1: "0이 하나라도 있으면 → 확실히 없음",
	sum2: "전부 1이어도 → 있을 수 있음일 뿐",
	aria: "블룸 필터의 원리를 반복 재생하는 애니메이션. 12칸짜리 비트 배열이 전부 0에서 시작한다. alice를 삽입하면 해시 함수 세 개가 각각 2, 5, 9를 내놓아 그 자리가 1로 켜지고, bob을 삽입하면 4, 5, 11이 켜지는데 이미 켜진 5는 그대로 둔다. carol을 조회하면 두 번째 해시가 짚은 7번 칸이 0이라 나머지는 볼 것도 없이 확실히 없다고 즉시 답한다. dave를 조회하면 짚은 세 자리가 우연히 전부 1이라 있을 수 있다고 답하지만 실제로 넣은 적은 없다. 이것이 거짓 양성이며, 결론적으로 블룸 필터는 없음은 확실하게, 있음은 추측으로만 답한다.",
},
	en: {
		captions: [
			"\u2460 A Bloom filter = a bit array + 3 hash functions, all zeros at first",
			"\u2461 Insert \u2014 turn on the slots the hashes point at",
			"\u2462 Insert \u2014 slot 5 is already on, leave it",
			"\u2463 Query \u2014 any 0 means definitely absent, instantly",
			"\u2464 Query \u2014 all 1s still only means maybe",
			"\u2465 Use it to rule things out quickly",
		],
		insert: (n: string) => `insert "${n}"`,
		query: (n: string) => `query "${n}"`,
		verdictNo: "slot 7 is 0 \u2192 definitely absent \u00b7 done",
		verdictMaybe: "all 1s \u2192 maybe \u00b7 actually absent",
		sum1: "any 0 \u2192 definitely absent",
		sum2: "all 1s \u2192 still only maybe",
		aria: "Looping animation of how a Bloom filter works. A 12-slot bit array starts at all zeros. Inserting alice turns on slots 2, 5 and 9 as three hash functions dictate; inserting bob turns on 4, 5 and 11, leaving the already-on 5 as it is. Querying carol probes 4, 7 and 9, and since slot 7 is 0 the answer is definitely absent without checking the rest. Querying dave probes 2, 4 and 11, which happen to be all on, so the answer is maybe \u2014 yet dave was never inserted. That is a false positive: the filter answers absence with certainty but presence only as a guess.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 14;
const ITEM_Y = 34;
const HASH_Y = 76;
const BIT_Y = 112;
const BIT_H = 40;
const IDX_Y = BIT_Y + BIT_H + 12;
const VERDICT_Y = 202;
const probeAt = (k: number) => 400 + k * 900; // k번째 해시 알약이 뜨는 시각(장면 시작 기준)
const LIGHT_AT = 550; // 알약이 뜬 뒤 비트가 켜지기까지

const fade = (t: number, at: number, dur = 500) => ease(clamp01((t - at) / dur));

function bitAlpha(i: number, t: number, step: number) {
	let a = 0;
	if (step >= 1)
		for (const [k, b] of ALICE.entries())
			if (b === i) a = Math.max(a, fade(t, UNTIL[0] + probeAt(k) + LIGHT_AT, 350));
	if (step >= 2)
		for (const [k, b] of BOB.entries())
			if (b === i) a = Math.max(a, fade(t, UNTIL[1] + probeAt(k) + LIGHT_AT, 350));
	return a;
}

function drawArrowDown(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: string,
	alpha: number,
	head: boolean,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.4;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2 - (head ? 7 : 0));
	ctx.stroke();
	if (head) {
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(x2 - 4, y2 - 6);
		ctx.lineTo(x2 + 4, y2 - 6);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
	}
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const usable = w - MARGIN * 2;
	const cellW = usable / BITS;
	const cellX = (i: number) => MARGIN + i * cellW;
	const cellCx = (i: number) => cellX(i) + cellW / 2;
	const step = UNTIL.findIndex((u) => t < u);
	const stepStart = step <= 0 ? 0 : UNTIL[step - 1];
	const cur = STEPS[step];

	// 비트 배열
	for (let i = 0; i < BITS; i++) {
		const x = cellX(i) + 2;
		const cw = cellW - 4;
		ctx.beginPath();
		ctx.roundRect(x, BIT_Y, cw, BIT_H, 5);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.stroke();

		const a = bitAlpha(i, t, step);
		if (a > 0) {
			ctx.save();
			ctx.globalAlpha = a;
			ctx.beginPath();
			ctx.roundRect(x, BIT_Y, cw, BIT_H, 5);
			ctx.fillStyle = c.blueFill;
			ctx.fill();
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 1.4;
			ctx.stroke();
			ctx.restore();
		}
		ctx.font = `700 16px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = a > 0.5 ? c.blue : c.sub;
		ctx.fillText(a > 0.5 ? "1" : "0", cellCx(i), BIT_Y + BIT_H / 2);

		ctx.font = `500 10px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(String(i), cellCx(i), IDX_Y);
	}

	if (cur.kind === "summary") {
		// ⑥ 요약 — 규칙 두 줄만 남긴다
		drawBadge(ctx, w / 2, ITEM_Y + 8, L.sum1, c.greenFill, c.green, fade(t, stepStart + 200, 400));
		drawBadge(ctx, w / 2, ITEM_Y + 40, L.sum2, c.redFill, c.red, fade(t, stepStart + 900, 400));
	} else if (cur.kind === "insert" || cur.kind === "query") {
		const isQuery = cur.kind === "query";
		const bits = cur.bits ?? [];
		const name = cur.name ?? "";
		const accentColor = isQuery ? c.amber : c.blue;
		const boxA = fade(t, stepStart, 300);
		const label = isQuery ? L.query(name) : L.insert(name);
		ctx.font = `600 13px ${FONT}`;
		const bw = ctx.measureText(label).width + 20;
		ctx.save();
		ctx.globalAlpha = boxA;
		ctx.beginPath();
		ctx.roundRect(w / 2 - bw / 2, ITEM_Y - 14, bw, 28, 8);
		ctx.fillStyle = c.boxFill;
		ctx.fill();
		ctx.strokeStyle = accentColor;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = c.text;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, w / 2, ITEM_Y);
		ctx.restore();

		const nProbes = isQuery ? (cur.probes ?? bits.length) : bits.length;
		for (let k = 0; k < nProbes; k++) {
			const b = bits[k];
			const a = fade(t, stepStart + probeAt(k), 400);
			// 항목 → 해시 알약 → 칸: 해시가 번호를 내놓는 단계를 눈에 보이게 둔다
			drawArrowDown(ctx, w / 2, ITEM_Y + 14, cellCx(b), HASH_Y - 10, accentColor, a, false);
			drawBadge(ctx, cellCx(b), HASH_Y, `h${k + 1}=${b}`, c.boxFill, accentColor, a);
			drawArrowDown(ctx, cellCx(b), HASH_Y + 10, cellCx(b), BIT_Y - 4, accentColor, a, true);

			// 조회는 켜지 않고 들여다보기만 한다 — 결과를 고리 색으로
			if (isQuery && a > 0) {
				const on = bitAlpha(b, t, step) > 0.5;
				ctx.save();
				ctx.globalAlpha = a;
				ctx.setLineDash([3, 3]);
				ctx.strokeStyle = on ? c.green : c.red;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.roundRect(cellX(b) + 0.5, BIT_Y - 3, cellW - 1, BIT_H + 6, 6);
				ctx.stroke();
				ctx.restore();
			}
		}

		if (isQuery) {
			const va = fade(t, stepStart + probeAt(nProbes - 1) + 900, 400);
			const no = cur.verdict === "no";
			drawBadge(
				ctx,
				w / 2,
				VERDICT_Y,
				no ? L.verdictNo : L.verdictMaybe,
				no ? c.greenFill : c.redFill,
				no ? c.green : c.red,
				va,
			);
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

export default function BloomFilterDemo({ lang = "ko" }: { lang?: Lang }) {
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

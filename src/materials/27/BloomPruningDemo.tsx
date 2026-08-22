import { clamp01, drawBadge, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// Parquet에서 블룸 필터가 필요한 이유: min/max가 겹치는 열은 목차로 못 거른다.
// 덩어리마다 저장한 블룸 필터에 조회 값을 해시해 동시에 물어보고,
// "확실히 없음"이 나온 덩어리는 건너뛴다.
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
const UNTIL = [3000, 6600, 10000, 13800, 18400, 21800];
const CYCLE = 21800;
const HEIGHT = 310;

const GROUPS = 4;
const HIT = 2; // 'M-42'가 실제로 든 덩어리 3 (0부터 세면 2)
// 덩어리별 블룸 필터 비트맵. PROBE 두 자리가 모두 1인 덩어리만 "있을 수 있음"이다.
const BITS = [
	[1, 0, 1, 0, 0, 0, 0, 0],
	[0, 1, 0, 0, 1, 0, 1, 0],
	[1, 0, 0, 1, 0, 1, 1, 1],
	[0, 0, 1, 0, 1, 1, 0, 0],
];
const PROBE = [0, 5];

const LABELS = {
	ko: {
	captions: [
		"① message_id = 'M-42'인 행을 찾는다 — 파일 안에는 덩어리 넷",
		"② 목차의 min/max가 넷 다 겹친다 — 이대로면 전부 읽어야 한다",
		"③ 그래서 Parquet은 덩어리마다 블룸 필터를 함께 저장한다",
		"④ 'M-42'를 해시해 나온 0번·5번 자리를 네 덩어리에 물어본다",
		"⑤ 0이 나온 셋은 확실히 없음 — 건너뛰고 하나만 읽는다",
		"⑥ min/max가 못 거르는 열은 블룸 필터가 덩어리를 걸러준다",
	],
	query: 'message_id = "M-42" 를 찾는다',
	group: (n: number) => `덩어리 ${n}`,
	minmax: "min A · max Z",
	bloomLabel: "Bloom filter",
	hash: '해시("M-42") → 0번과 5번 자리',
	absent: "확실히 없음",
	maybe: "있을 수 있음",
	counterBad: "이대로면 덩어리 4 / 4 를 다 읽어야 한다",
	counterGood: "읽는 덩어리 1 / 4",
	aria: "Parquet 파일에서 블룸 필터가 왜 필요한지 반복 재생하는 애니메이션. message_id가 M-42인 행을 찾는데, 파일 안 덩어리 넷의 min/max가 전부 겹쳐 목차만으로는 하나도 거를 수 없어 넷을 다 읽어야 할 판이다. 그래서 Parquet은 덩어리마다 작은 블룸 필터를 함께 저장한다. 조회 값을 해시해 나온 0번과 5번 자리를 네 덩어리의 블룸 필터에 각각 물어보면, 어느 한 자리가 0인 세 덩어리는 확실히 없음이라 건너뛰고, 두 자리가 모두 1인 덩어리 하나만 읽는다.",
},
	en: {
		captions: [
			"\u2460 Find message_id = 'M-42' \u2014 four row groups in the file",
			"\u2461 Every min/max overlaps \u2014 as is, all four must be read",
			"\u2462 So Parquet stores a Bloom filter per row group",
			"\u2463 Hash 'M-42' and ask all four filters about slots 0 and 5",
			"\u2464 Three answer definitely-absent \u2014 skip them, read one",
			"\u2465 Where min/max cannot prune, Bloom filters do",
		],
		query: 'find message_id = "M-42"',
		group: (n: number) => `group ${n}`,
		minmax: "min A \u00b7 max Z",
		bloomLabel: "Bloom filter",
		hash: 'hash("M-42") \u2192 slots 0 and 5',
		absent: "definitely absent",
		maybe: "maybe present",
		counterBad: "as is, all 4 / 4 row groups get read",
		counterGood: "row groups read: 1 / 4",
		aria: "Looping animation of why Parquet needs Bloom filters. Searching for message_id M-42, the min/max of all four row groups overlap, so the table of contents alone cannot prune any and all four would have to be read. Parquet therefore stores a small Bloom filter per row group. Hashing the query value yields slots 0 and 5, and asking each group's filter, three answer definitely absent \u2014 skipped without opening \u2014 while the single group whose two slots are both on is the only one read.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MARGIN = 14;
const GAP = 10;
const CHUNK_TOP = 52;
const CHUNK_H = 118;
const BITMAP_DY = 78;
const BIT_H = 18;
const VERDICT_DY = 56;
const HASH_Y = 198;
const COUNTER_Y = 226;

const fade = (t: number, at: number, dur = 500) => ease(clamp01((t - at) / dur));

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const usable = w - MARGIN * 2;
	const boxW = (usable - GAP * (GROUPS - 1)) / GROUPS;
	const step = UNTIL.findIndex((u) => t < u);

	// 조회 조건
	drawBadge(ctx, w / 2, 24, L.query, c.boxFill, c.text, fade(t, 200, 400));

	for (let g = 0; g < GROUPS; g++) {
		const bx = MARGIN + g * (boxW + GAP);
		const judged = step >= 4 ? fade(t, UNTIL[3] + 400 + g * 300, 350) : 0;
		const isHit = g === HIT;
		const dim = judged > 0 && !isHit ? 1 - judged * 0.62 : 1;

		ctx.save();
		ctx.globalAlpha = dim;

		// 덩어리 상자
		ctx.beginPath();
		ctx.roundRect(bx, CHUNK_TOP, boxW, CHUNK_H, 8);
		if (isHit && judged > 0) {
			ctx.fillStyle = c.greenFill;
			ctx.fill();
			ctx.strokeStyle = c.green;
			ctx.lineWidth = 1.8;
		} else {
			ctx.fillStyle = c.boxFill;
			ctx.fill();
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1.5;
		}
		ctx.stroke();

		ctx.font = `600 11px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.sub;
		ctx.fillText(L.group(g + 1), bx + boxW / 2, CHUNK_TOP + 15);

		// 행이 들었다는 암시
		ctx.save();
		ctx.globalAlpha = dim * 0.5;
		ctx.strokeStyle = c.sub;
		ctx.lineWidth = 1;
		for (let i = 0; i < 3; i++) {
			const y = CHUNK_TOP + 30 + i * 8;
			ctx.beginPath();
			ctx.moveTo(bx + 12, y);
			ctx.lineTo(bx + boxW - 12, y);
			ctx.stroke();
		}
		ctx.restore();

		// ② min/max — 넷이 똑같이 겹친다. 블룸 필터가 등장하면 물러난다.
		const mmA =
			step >= 1 ? fade(t, UNTIL[0] + g * 250, 350) * (1 - fade(t, UNTIL[1], 400)) : 0;
		drawBadge(ctx, bx + boxW / 2, CHUNK_TOP + VERDICT_DY + 10, L.minmax, c.redFill, c.red, mmA);

		// ③ 덩어리마다 붙는 블룸 필터 비트맵
		const bmA = step >= 2 ? fade(t, UNTIL[1] + 400 + g * 250, 400) : 0;
		if (bmA > 0) {
			const cellW = (boxW - 14) / 8;
			ctx.save();
			ctx.globalAlpha = dim * bmA;
			for (let i = 0; i < 8; i++) {
				const x = bx + 7 + i * cellW;
				const on = BITS[g][i] === 1;
				ctx.beginPath();
				ctx.roundRect(x + 0.8, CHUNK_TOP + BITMAP_DY, cellW - 1.6, BIT_H, 3);
				ctx.fillStyle = on ? c.blueFill : c.boxFill;
				ctx.fill();
				ctx.strokeStyle = on ? c.blue : c.line;
				ctx.lineWidth = on ? 1.2 : 1;
				ctx.stroke();
				ctx.font = `600 10px ${MONO}`;
				ctx.fillStyle = on ? c.blue : c.sub;
				ctx.fillText(String(BITS[g][i]), x + cellW / 2, CHUNK_TOP + BITMAP_DY + BIT_H / 2 + 0.5);
			}
			ctx.font = `500 9px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.fillText(L.bloomLabel, bx + boxW / 2, CHUNK_TOP + BITMAP_DY + BIT_H + 10);
			ctx.restore();

			// ④ 해시가 짚은 두 자리를 고리로 묻는다 — 판정 뒤엔 1은 초록, 0은 빨강
			const probeA = step >= 3 ? fade(t, UNTIL[2] + 500 + g * 250, 400) : 0;
			if (probeA > 0) {
				for (const p of PROBE) {
					const x = bx + 7 + p * cellW;
					const on = BITS[g][p] === 1;
					ctx.save();
					ctx.globalAlpha = dim * probeA;
					ctx.setLineDash([3, 2]);
					ctx.strokeStyle = judged > 0.5 ? (on ? c.green : c.red) : c.amber;
					ctx.lineWidth = 1.8;
					ctx.beginPath();
					ctx.roundRect(x - 0.6, CHUNK_TOP + BITMAP_DY - 2.5, cellW + 1.2, BIT_H + 5, 4);
					ctx.stroke();
					ctx.restore();
				}
			}
		}
		ctx.restore();

		// ⑤ 판정 배지 — 흐려지지 않게 상자 바깥 알파로 그린다
		if (judged > 0) {
			drawBadge(
				ctx,
				bx + boxW / 2,
				CHUNK_TOP + VERDICT_DY,
				isHit ? L.maybe : L.absent,
				isHit ? c.greenFill : c.redFill,
				isHit ? c.green : c.red,
				judged,
			);
		}
	}

	// ② 이대로면 다 읽어야 한다 (블룸 필터가 나오면 사라진다)
	const badA = step >= 1 ? fade(t, UNTIL[0] + 1500, 400) * (1 - fade(t, UNTIL[1], 400)) : 0;
	drawBadge(ctx, w / 2, COUNTER_Y, L.counterBad, c.redFill, c.red, badA);

	// ④ 해시 안내
	if (step >= 3) {
		drawBadge(ctx, w / 2, HASH_Y, L.hash, c.amberFill, c.amber, fade(t, UNTIL[2], 400));
	}

	// ⑤ 읽는 덩어리 하나
	if (step >= 4) {
		drawBadge(ctx, w / 2, COUNTER_Y, L.counterGood, c.greenFill, c.green, fade(t, UNTIL[3] + 1800, 400));
	}

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(L.captions[step], w / 2, HEIGHT - 18);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function BloomPruningDemo({ lang = "ko" }: { lang?: Lang }) {
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

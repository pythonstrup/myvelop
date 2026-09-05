import { type Colors, clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";

// 하루치 Parquet 파일 하나를 놓고 같은 조회를 세 조건에서 재생한다.
// ② 시간순으로 쓰면 덩어리별 min/max가 겹쳐 프루닝이 걸리지 않는다.
// ③ 조회 축으로 정렬해 쓰면 범위가 갈려 덩어리 하나만 남는다.
// ④ 정렬 축을 이미 써버린 열은 Bloom filter가 "없음"을 즉답해 잘라낸다.
const UNTIL = [1900, 4400, 6900, 9600, 11600];
const CYCLE = 11600;
const HEIGHT = 250;

const CHUNK_COUNT = 4;
const RANGES_UNSORTED = ["1–99", "1–99", "1–99", "1–99"];
const RANGES_SORTED = ["1–25", "26–50", "51–75", "76–99"];
const HIT_SORTED = 0; // user_id = 7 은 정렬 후 첫 덩어리에만 있다
const HIT_BLOOM = 2; // message_id 는 세 번째 덩어리에만 있다

// Bloom filter 비트맵(고정 패턴). PROBE 두 자리가 모두 켜진 덩어리만 "있을 수 있음"이다.
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
			"① 하루치가 파일 하나, 그 안에 덩어리 넷",
			"② 시간순으로 쓰면 범위가 겹쳐 넷 다 읽는다",
			"③ user_id로 정렬해 쓰면 하나만 읽는다",
			"④ 정렬 축을 못 쓰는 열은 Bloom filter가 잘라낸다",
			"⑤ 날짜는 파티션, 한 축은 정렬, 나머지는 Bloom filter",
		],
		file: "dt=2026-07-29/",
		queryUser: "WHERE user_id = 7",
		queryMsg: "WHERE message_id = 'M-42'",
		read: "읽음",
		skip: "건너뜀",
		absent: "확실히 없음",
		maybe: "있을 수 있음",
		counter: (n: number) => `읽는 덩어리 ${n} / ${CHUNK_COUNT}`,
		overlap: "min/max 겹침",
		aria: "Parquet 하루 파일 하나에서 덩어리 단위 건너뛰기가 어떻게 달라지는지 반복 재생하는 애니메이션. 시간순으로 쓰면 덩어리마다 user_id 범위가 1에서 99까지 겹쳐 조건에 맞는 덩어리를 골라낼 수 없어 넷을 모두 읽는다. user_id로 정렬해 쓰면 덩어리 범위가 1에서 25, 26에서 50처럼 갈라져 조건에 맞는 덩어리 하나만 읽는다. 정렬 축을 이미 써버린 message_id 같은 열은 범위가 다시 겹치지만, 덩어리마다 심어둔 Bloom filter가 값이 확실히 없는 덩어리 셋을 잘라내 하나만 읽는다.",
	},
	en: {
		captions: [
			"① One day, one file, four row groups inside",
			"② Written in time order, ranges overlap — read all four",
			"③ Sorted by user_id, only one row group is read",
			"④ For a column you cannot sort on, a Bloom filter prunes",
			"⑤ Date by partition, one axis by sort, the rest by Bloom",
		],
		file: "dt=2026-07-29/",
		queryUser: "WHERE user_id = 7",
		queryMsg: "WHERE message_id = 'M-42'",
		read: "read",
		skip: "skipped",
		absent: "definitely no",
		maybe: "probably yes",
		counter: (n: number) => `row groups read ${n} / ${CHUNK_COUNT}`,
		// 덩어리 하나에 배지가 들어가야 해서 짧게 쓴다. "min/max overlap"은 375px에서 서로 겹친다.
		overlap: "overlap",
		aria: "Looping animation showing how row-group skipping changes inside a single daily Parquet file. Written in time order every row group spans user_id 1 to 99, so none can be excluded and all four are read. Sorted by user_id the ranges split into 1 to 25, 26 to 50 and so on, so only the matching row group is read. For a column such as message_id, which cannot use the sort axis, the ranges overlap again, but a Bloom filter stored per row group answers definitely-no for three of them and only one is read.",
	},
} as const;
type Lang = keyof typeof LABELS;

const CHUNK_TOP = 84;
const CHUNK_H = 74;
const GAP = 10;

const fade = (t: number, at: number, dur = 340) => clamp01((t - at) / dur);

function drawChunk(
	ctx: CanvasRenderingContext2D,
	x: number,
	width: number,
	state: "idle" | "read" | "skip" | "hit",
	alpha: number,
	c: Colors,
) {
	const dim = state === "skip" ? 0.34 : 1;
	ctx.save();
	ctx.globalAlpha = alpha * dim;
	const fill =
		state === "read" ? c.redFill : state === "hit" ? c.greenFill : c.boxFill;
	const stroke =
		state === "read" ? c.red : state === "hit" ? c.green : c.line;
	ctx.beginPath();
	ctx.roundRect(x, CHUNK_TOP, width, CHUNK_H, 8);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = state === "idle" ? 1.5 : 1.8;
	ctx.stroke();
	ctx.restore();
}

// 덩어리 안에 담긴 행을 짧은 가로선 몇 개로 암시한다.
function drawRows(
	ctx: CanvasRenderingContext2D,
	x: number,
	width: number,
	alpha: number,
	c: Colors,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha * 0.5;
	ctx.strokeStyle = c.sub;
	ctx.lineWidth = 1;
	const inset = Math.min(14, width * 0.18);
	for (let i = 0; i < 4; i++) {
		const y = CHUNK_TOP + 16 + i * 9;
		ctx.beginPath();
		ctx.moveTo(x + inset, y);
		ctx.lineTo(x + width - inset, y);
		ctx.stroke();
	}
	ctx.restore();
}

function drawBits(
	ctx: CanvasRenderingContext2D,
	x: number,
	width: number,
	bits: readonly number[],
	present: boolean,
	alpha: number,
	c: Colors,
) {
	if (alpha <= 0) return;
	const cell = Math.min(9, (width - 20) / bits.length);
	const totalW = cell * bits.length;
	const bx = x + (width - totalW) / 2;
	const by = CHUNK_TOP + CHUNK_H - 26;
	ctx.save();
	ctx.globalAlpha = alpha;
	for (let i = 0; i < bits.length; i++) {
		const on = bits[i] === 1;
		const probed = PROBE.includes(i);
		ctx.beginPath();
		ctx.roundRect(bx + i * cell, by, cell - 2, cell - 2, 1.5);
		ctx.fillStyle = on ? (probed ? (present ? c.green : c.blue) : c.line) : "transparent";
		if (on) ctx.fill();
		ctx.strokeStyle = probed ? (present ? c.green : c.red) : c.boxStroke;
		ctx.lineWidth = probed ? 1.4 : 0.8;
		ctx.stroke();
	}
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 12;
		const usable = w - margin * 2;
		const chunkW = (usable - GAP * (CHUNK_COUNT - 1)) / CHUNK_COUNT;
		const chunkX = (i: number) => margin + i * (chunkW + GAP);

		const step = UNTIL.findIndex((u) => t < u);
		const sorted = step >= 2 && step <= 2;
		const bloom = step >= 3;

		// 파일 이름과 조회 조건
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = c.sub;
		ctx.fillText(L.file, margin, 26);
		ctx.textAlign = "right";
		ctx.font = `600 12px ${FONT}`;
		ctx.fillStyle = c.blue;
		ctx.fillText(bloom ? L.queryMsg : L.queryUser, w - margin, 26);

		for (let i = 0; i < CHUNK_COUNT; i++) {
			const x = chunkX(i);
			let state: "idle" | "read" | "skip" | "hit" = "idle";
			if (step === 1) state = "read";
			else if (step === 2) state = i === HIT_SORTED ? "hit" : "skip";
			else if (step >= 3) state = i === HIT_BLOOM ? "hit" : "skip";

			drawChunk(ctx, x, chunkW, state, fade(t, 120), c);
			drawRows(ctx, x, chunkW, fade(t, 260) * (bloom ? 0.5 : 1), c);

			// 덩어리 위 min/max 배지. 정렬 단계에서만 범위가 갈라진다.
			const range = sorted ? RANGES_SORTED[i] : RANGES_UNSORTED[i];
			const badgeColor = sorted && i !== HIT_SORTED ? c.sub : bloom ? c.sub : step === 1 ? c.red : c.text;
			if (step >= 1) {
				drawBadge(
					ctx,
					x + chunkW / 2,
					CHUNK_TOP - 14,
					bloom ? L.overlap : range,
					c.boxFill,
					badgeColor,
					fade(t, UNTIL[0]) * (bloom ? 0.45 : 1),
				);
			}

			// Bloom 단계에서만 비트맵과 판정을 띄운다.
			if (bloom) {
				const present = i === HIT_BLOOM;
				drawBits(ctx, x, chunkW, BITS[i], present, fade(t, UNTIL[2]), c);
				drawBadge(
					ctx,
					x + chunkW / 2,
					CHUNK_TOP + CHUNK_H + 16,
					present ? L.maybe : L.absent,
					present ? c.greenFill : c.redFill,
					present ? c.green : c.red,
					fade(t, UNTIL[2] + 260),
				);
			} else if (step >= 1) {
				const hit = step === 2 && i === HIT_SORTED;
				drawBadge(
					ctx,
					x + chunkW / 2,
					CHUNK_TOP + CHUNK_H + 16,
					hit || step === 1 ? L.read : L.skip,
					hit ? c.greenFill : step === 1 ? c.redFill : c.boxFill,
					hit ? c.green : step === 1 ? c.red : c.sub,
					fade(t, UNTIL[0] + 200) * (step === 1 || hit ? 1 : 0.7),
				);
			}
		}

		// 읽는 덩어리 수
		if (step >= 1) {
			const n = step === 1 ? CHUNK_COUNT : 1;
			ctx.textAlign = "center";
			ctx.font = `700 12.5px ${FONT}`;
			ctx.fillStyle = n === CHUNK_COUNT ? c.red : c.green;
			ctx.globalAlpha = fade(t, UNTIL[0] + 320);
			ctx.fillText(L.counter(n), w / 2, HEIGHT - 44);
			ctx.globalAlpha = 1;
		}

		ctx.textAlign = "center";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 20);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function RowGroupPruningDemo({ lang = "ko" }: { lang?: Lang }) {
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

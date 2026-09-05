import { clamp01, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 같은 조회(유저 1명 한달치)를 네 경로로 — 순차 왕복 깊이 비교 (실측치 포함).
// 가로 = 순차 왕복(시간), 세로 = 병렬. 순차 깊이 parquet 3 / posting 13 / B-tree 5 / LSM 2.
const CYCLE = 6400; // 등장 후 홀드
const HEIGHT = 340;

type Wave = { n: number; seq: number };
const LANES: { y: number; waves: Wave[]; color: "blue" | "green" | "amber" | "red" }[] = [
	{
		y: 0.22,
		waves: [
			{ n: 1, seq: 1 },
			{ n: 5, seq: 1 },
			{ n: 4, seq: 1 },
		],
		color: "blue",
	},
	{
		y: 0.41,
		waves: [
			{ n: 1, seq: 12 },
			{ n: 5, seq: 1 },
		],
		color: "green",
	},
	{
		y: 0.6,
		waves: [
			{ n: 1, seq: 4 },
			{ n: 5, seq: 1 },
		],
		color: "amber",
	},
	{
		y: 0.79,
		waves: [
			{ n: 1, seq: 1 },
			{ n: 5, seq: 1 },
		],
		color: "red",
	},
];

const LABELS = {
	ko: {
		head: "같은 조회(유저 1명 한달치)를 네 경로로 — 가로 = 순차 왕복(시간), 세로 = 병렬",
		headNarrow: "유저 1명 한달치 — 왕복 구조",
		lanes: [
			{ label: "parquet — LIST 1 + 병렬 2왕복 (실측 0.89s)", short: "parquet — 병렬 2왕복" },
			{ label: "키값 이진탐색 — 순차 12왕복 + 병렬 1왕복 (실측 0.77s)", short: "키값 탐색 — 순차 12 + 병렬 1" },
			{ label: "B-tree cold — 하강 3 + 포인터 1 + 병렬 1왕복 (실측 0.36s)", short: "B-tree — 순차 4 + 병렬 1" },
			{ label: "LSM 컴팩션 후 — fence 블록 1왕복 + 병렬 1왕복 (실측 0.16s)", short: "LSM 컴팩션 후 — 순차 1 + 병렬 1" },
		],
		caption: "순차 깊이 3 · 13 · 5 · 2 — 시간이 비슷해도 왕복 깊이는 구조가 결정한다",
		captionNarrow: "순차 깊이 3·13·5·2 — 왕복은 구조가 정한다",
		aria: "같은 조회를 네 경로로 비교한 왕복 구조 애니메이션. 가로축은 순차 왕복, 세로축은 병렬 요청이다. 순차 깊이는 parquet 3, 키값 이진탐색 13, B-tree 5, LSM 컴팩션 후 2로, 시간이 비슷해도 왕복 깊이는 구조가 결정한다.",
	},
	en: {
		head: "Same query (one user's month), four paths — x = sequential round trips, y = parallel",
		headNarrow: "one user's month — round trip structure",
		lanes: [
			{ label: "parquet — LIST 1 + 2 parallel round trips (measured 0.89s)", short: "parquet — 2 parallel trips" },
			{
				label: "index binary search — 12 sequential round trips + 1 parallel (measured 0.77s)",
				short: "index bsearch — sequential 12 + parallel 1",
			},
			{
				label: "B-tree cold — descent 3 + pointer 1 + parallel 1 round trip (measured 0.36s)",
				short: "B-tree — sequential 4 + parallel 1",
			},
			{
				label: "LSM after compaction — fence block 1 + parallel 1 round trip (measured 0.16s)",
				short: "LSM after compaction — sequential 1 + parallel 1",
			},
		],
		caption: "Sequential depth 3 · 13 · 5 · 2 — similar times, structure decides the depth",
		captionNarrow: "Sequential depth 3·13·5·2 — structure sets round trips",
		aria: "Round-trip structure animation comparing the same query along four paths. The horizontal axis is sequential round trips, the vertical axis parallel requests. Sequential depths are parquet 3, index binary search 13, B-tree 5, and LSM after compaction 2 — even with similar times, structure decides the round-trip depth.",
	},
} as const;
type Lang = keyof typeof LABELS;

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const h = HEIGHT;
	const m = Math.max(16, w * 0.04);
	const bw = w - m * 2;
	const fs = Math.max(11, Math.min(14, w / 46));
	const narrow = w < 480;
	const p = ease(clamp01(t / 1400));

	ctx.textBaseline = "alphabetic";
	ctx.font = `${fs - 1}px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "left";
	ctx.fillText(narrow ? L.headNarrow : L.head, m, h * 0.09);

	const r = Math.max(3, w * 0.006);
	LANES.forEach((lane, li) => {
		const y = h * lane.y;
		const color = c[lane.color];
		ctx.font = `600 ${fs - 1}px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.textAlign = "left";
		ctx.fillText(narrow ? L.lanes[li].short : L.lanes[li].label, m, y - r * 6.5);
		// waves: [{n(세로 점 수), seq(순차 반복 수)}...] 를 시간축(가로)으로 배열
		let x = m + 4;
		const step = Math.min(w * 0.045, (bw - 8) / 15);
		for (const wv of lane.waves) {
			let stop = false;
			for (let s = 0; s < wv.seq && !stop; s++) {
				if ((x - m - 4) / (step * 14) > p) {
					stop = true;
					break;
				}
				for (let k = 0; k < wv.n; k++) {
					ctx.fillStyle = color;
					ctx.beginPath();
					ctx.arc(x, y + (k - (wv.n - 1) / 2) * (r * 2.4), r, 0, Math.PI * 2);
					ctx.fill();
				}
				x += step;
			}
			if (stop) break;
		}
	});

	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "center";
	ctx.fillText(narrow ? L.captionNarrow : L.caption, w / 2, h - 16);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function QueryPathDepthDemo({ lang = "ko" }: { lang?: Lang }) {
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

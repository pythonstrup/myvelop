import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 같은 하루치를 두 가지 모양으로 읽는다.
// 위: 큰 파일 하나 — 왕복 한 번.
// 아래: 작은 객체 수천 개 — 객체마다 왕복. 총 바이트는 같은데 걸리는 시간이 다르다.
const UNTIL = [2200, 4500, 9000, 11200, 12600];
const CYCLE = 12600;
const HEIGHT = 252;

const RUN_START = 4500;
const RUN_END = 9000;
const OBJECTS = 12000;
const PACKETS = 8; // 아래 레인에서 동시에 흐르는 점
const PACKET_MS = 300;

const LABELS = {
	ko: {
		captions: [
			"① 같은 하루치를 두 가지 모양으로 놓는다",
			"② 담긴 바이트는 양쪽이 똑같다",
			"③ 읽는다 — S3는 객체 하나마다 왕복이 붙는다",
			"④ 같은 100MB인데 왕복 수가 다르다",
			"⑤ 파일을 합쳐야 풀린다, 포맷을 바꿔도 왕복은 그대로다",
		],
		laneA: "큰 파일 하나",
		laneB: "작은 객체 12,000개",
		store: "S3",
		engine: "조회",
		size: "100MB",
		tripsA: "왕복 1회",
		tripsB: (n: number) => `왕복 ${n.toLocaleString("en-US")}회`,
		done: "완료",
		aria: "같은 하루치 데이터를 두 가지 모양으로 S3에서 읽을 때의 차이를 반복 재생하는 애니메이션. 위 레인은 큰 파일 하나여서 왕복 한 번으로 100MB를 읽어온다. 아래 레인은 같은 100MB가 작은 객체 1만 2천 개로 나뉘어 있어 객체마다 HTTP 왕복이 붙고, 총 바이트가 같은데도 왕복 횟수가 1만 2천 번으로 늘어 조회가 느려진다. 파일을 합쳐야 풀리는 문제이며 포맷을 JSON에서 Parquet으로 바꿔도 왕복 횟수는 그대로다.",
	},
	en: {
		captions: [
			"① The same day, laid out two ways",
			"② Both sides hold the same bytes",
			"③ Reading — S3 costs one round trip per object",
			"④ Same 100MB, very different round-trip counts",
			"⑤ Merge the files; changing format leaves the trips",
		],
		laneA: "one large file",
		laneB: "12,000 small objects",
		store: "S3",
		engine: "query",
		size: "100MB",
		tripsA: "1 round trip",
		tripsB: (n: number) => `${n.toLocaleString("en-US")} round trips`,
		done: "done",
		aria: "Looping animation contrasting how the same day's data is read from S3 in two shapes. The top lane is a single large file and one round trip fetches all 100MB. The bottom lane holds the same 100MB split into twelve thousand small objects, so every object costs its own HTTP round trip and the read is far slower despite identical bytes. Merging files is what fixes it; switching format from JSON to Parquet leaves the round-trip count unchanged.",
	},
} as const;
type Lang = keyof typeof LABELS;

const LANE_A = 68;
const LANE_B = 162;
const BOX_W = 58;
const BOX_H = 42;

function drawEndpoint(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	label: string,
	c: Colors,
	accent: string,
) {
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = accent;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.fillStyle = c.text;
	ctx.font = `600 11px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, cx, cy);
	ctx.restore();
}

// 하나의 큰 덩어리와 잘게 쪼개진 조각들을 저장소 안쪽에 그린다.
function drawShape(
	ctx: CanvasRenderingContext2D,
	x: number,
	cy: number,
	width: number,
	many: boolean,
	c: Colors,
	alpha: number,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	if (many) {
		const cell = 9;
		const cols = Math.max(6, Math.floor(width / cell));
		for (let i = 0; i < cols * 3; i++) {
			const col = i % cols;
			const row = Math.floor(i / cols);
			ctx.beginPath();
			ctx.roundRect(x + col * cell, cy - 14 + row * cell, cell - 2.5, cell - 2.5, 1.5);
			ctx.fillStyle = c.amberFill;
			ctx.fill();
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 0.7;
			ctx.stroke();
		}
	} else {
		ctx.beginPath();
		ctx.roundRect(x, cy - 14, Math.min(width, 86), 28, 5);
		ctx.fillStyle = c.blueFill;
		ctx.fill();
		ctx.strokeStyle = c.blue;
		ctx.lineWidth = 1.4;
		ctx.stroke();
	}
	ctx.restore();
}

function drawPacket(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 12;
		const leftCx = margin + BOX_W / 2;
		const rightCx = w - margin - BOX_W / 2;
		const trackFrom = leftCx + BOX_W / 2 + 6;
		const trackTo = rightCx - BOX_W / 2 - 6;
		const trackLen = trackTo - trackFrom;

		const step = UNTIL.findIndex((u) => t < u);
		const running = t >= RUN_START;
		const runP = clamp01((t - RUN_START) / (RUN_END - RUN_START));

		for (const [i, laneY] of [LANE_A, LANE_B].entries()) {
			const many = i === 1;
			const accent = many ? c.amber : c.blue;

			// 레인 제목
			ctx.font = `600 12px ${FONT}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillStyle = c.text;
			ctx.fillText(many ? L.laneB : L.laneA, margin, laneY - 40);

			// 저장소와 조회 쪽 끝점
			drawEndpoint(ctx, leftCx, laneY, L.store, c, accent);
			drawEndpoint(ctx, rightCx, laneY, L.engine, c, accent);

			// 트랙
			ctx.save();
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(trackFrom, laneY);
			ctx.lineTo(trackTo, laneY);
			ctx.stroke();
			ctx.restore();

			// 담긴 모양과 용량
			drawShape(ctx, trackFrom + 4, laneY, Math.min(trackLen - 8, 92), many, c, running ? 0.25 : 1);
			if (step >= 1 && !running) {
				drawBadge(ctx, (trackFrom + trackTo) / 2 + 60, laneY, L.size, c.boxFill, c.sub, 1);
			}

			// 왕복 애니메이션
			if (running) {
				if (many) {
					for (let p = 0; p < PACKETS; p++) {
						const local = ((t - RUN_START + (p * PACKET_MS) / PACKETS) % PACKET_MS) / PACKET_MS;
						if (t > RUN_END && local > runP) continue;
						const x = lerp(trackFrom, trackTo, ease(local));
						drawPacket(ctx, x, laneY, 3.4, c.amber);
					}
				} else {
					const p = clamp01((t - RUN_START) / 1500);
					if (p < 1) drawPacket(ctx, lerp(trackFrom, trackTo, ease(p)), laneY, 7, c.blue);
				}
			}

			// 왕복 카운터
			if (running) {
				const label = many
					? L.tripsB(Math.round(OBJECTS * runP))
					: t - RUN_START > 1500
						? L.tripsA
						: "";
				if (label) {
					drawBadge(
						ctx,
						(trackFrom + trackTo) / 2,
						laneY + 34,
						label,
						many ? c.redFill : c.greenFill,
						many ? c.red : c.green,
						1,
					);
				}
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

export default function SmallFilesDemo({ lang = "ko" }: { lang?: Lang }) {
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

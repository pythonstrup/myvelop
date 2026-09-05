import { type Colors, clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";

// 같은 데이터베이스의 시간을 두 레인으로 재생한다.
// 위: GRANT ON ALL TABLES(스냅샷) — 실행 시점 이후의 테이블은 권한이 빈다.
// 아래: ALTER DEFAULT PRIVILEGES(규칙) — 테이블이 생기기 전에 등록해 이후 전부 자동.
const UNTIL = [1600, 3400, 5200, 7600, 10000];
const CYCLE = 10000;
const HEIGHT = 210;

const LABELS = {
	ko: {
		captions: [
			"① 아래 레인은 테이블이 생기기 전에 규칙부터 등록한다",
			"② 스키마 적용 — 아래 레인은 생기는 즉시 권한이 붙는다",
			"③ 위 레인은 이제야 GRANT ON ALL TABLES — 스냅샷이다",
			"④ 이후 마이그레이션 — 위 레인 새 테이블만 권한이 빈다",
			"⑤ 새 테이블에서만 permission denied — grant 재실행 전까지",
		],
		laneA: "GRANT ON ALL TABLES — 스냅샷",
		laneB: "ALTER DEFAULT PRIVILEGES — 규칙",
		ruleMark: "규칙 등록",
		grantMark: "GRANT 실행",
		aria: "권한이 걸리는 시점의 차이를 두 레인으로 반복 재생하는 애니메이션. 위 레인은 GRANT ON ALL TABLES를 실행한 시점까지 존재하던 테이블만 권한이 부여되어 이후 마이그레이션으로 생긴 테이블이 permission denied가 되고, 아래 레인은 테이블이 생기기 전에 ALTER DEFAULT PRIVILEGES를 등록해 이후 생성되는 테이블 전부에 권한이 자동으로 붙는다.",
	},
	en: {
		captions: [
			"① The bottom lane registers the rule before any tables",
			"② Schema applied — bottom-lane tables start with grants",
			"③ Only now does the top lane run GRANT — a snapshot",
			"④ A later migration — new top-lane tables get nothing",
			"⑤ permission denied on new tables until GRANT is rerun",
		],
		laneA: "GRANT ON ALL TABLES — snapshot",
		laneB: "ALTER DEFAULT PRIVILEGES — rule",
		ruleMark: "rule registered",
		grantMark: "GRANT runs",
		aria: "Looping animation contrasting when privileges attach, in two lanes. In the top lane only tables that existed when GRANT ON ALL TABLES ran get privileges, so tables created by later migrations hit permission denied. In the bottom lane ALTER DEFAULT PRIVILEGES is registered before any tables exist, so every table created afterwards gets its privileges automatically.",
	},
} as const;
type Lang = keyof typeof LABELS;

const LANE_A = 58; // GRANT 스냅샷 레인
const LANE_B = 146; // default privileges 레인
const BOX_W = 44;
const BOX_H = 34;

// 타임라인 위 X 위치(전체 폭 대비 비율)와 등장 시점(ms)
const RULE_X = 0.05;
const GRANT_X = 0.55;
const TABLES = [
	{ x: 0.24, name: "t1", appear: 1800 },
	{ x: 0.42, name: "t2", appear: 2500 },
	{ x: 0.72, name: "t3", appear: 5400 },
	{ x: 0.9, name: "t4", appear: 6300 },
];
const GRANT_T = 3600; // 위 레인 grant 실행 시점

const fade = (t: number, at: number, dur = 350) => clamp01((t - at) / dur);

function drawTable(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	name: string,
	state: "gray" | "green" | "red",
	alpha: number,
	c: Colors,
) {
	if (alpha <= 0) return;
	const fill = state === "green" ? c.greenFill : state === "red" ? c.redFill : c.boxFill;
	const stroke = state === "green" ? c.green : state === "red" ? c.red : c.boxStroke;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(cx - BOX_W / 2, cy - BOX_H / 2, BOX_W, BOX_H, 6);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	// 테이블 헤더 줄
	ctx.beginPath();
	ctx.moveTo(cx - BOX_W / 2, cy - BOX_H / 2 + 11);
	ctx.lineTo(cx + BOX_W / 2, cy - BOX_H / 2 + 11);
	ctx.stroke();
	ctx.fillStyle = state === "gray" ? c.sub : stroke;
	ctx.font = `600 10px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(name, cx, cy + 6);
	// 권한 상태 표시
	ctx.font = `700 10px ${FONT}`;
	ctx.fillText(state === "green" ? "✓" : state === "red" ? "✗" : "", cx, cy - BOX_H / 2 + 5.5);
	ctx.restore();
}

function drawMarker(
	ctx: CanvasRenderingContext2D,
	x: number,
	laneY: number,
	label: string,
	color: string,
	alpha: number,
) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.setLineDash([4, 3]);
	ctx.beginPath();
	ctx.moveTo(x, laneY - 26);
	ctx.lineTo(x, laneY + 24);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.fillStyle = color;
	ctx.font = `600 10px ${FONT}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillText(label, x + 6, laneY - 20);
	ctx.restore();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 12;
		const usable = w - margin * 2;
		const px = (f: number) => margin + f * usable;

		const step = UNTIL.findIndex((u) => t < u);

		// 레인 제목과 기준선
		ctx.font = `600 12px ${FONT}`;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillStyle = c.text;
		ctx.fillText(L.laneA, margin, LANE_A - 32);
		ctx.fillText(L.laneB, margin, LANE_B - 32);
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		for (const y of [LANE_A, LANE_B]) {
			ctx.beginPath();
			ctx.moveTo(margin, y + BOX_H / 2 + 6);
			ctx.lineTo(w - margin, y + BOX_H / 2 + 6);
			ctx.stroke();
		}

		// 마커: 아래 레인 규칙 등록(맨 앞), 위 레인 grant 실행(중간)
		drawMarker(ctx, px(RULE_X), LANE_B, L.ruleMark, c.green, fade(t, 200));
		drawMarker(ctx, px(GRANT_X), LANE_A, L.grantMark, c.blue, fade(t, GRANT_T));

		for (const table of TABLES) {
			const alpha = fade(t, table.appear);
			const afterGrant = table.appear > GRANT_T;
			// 위 레인: grant 이전 테이블은 실행 순간 회색→초록, 이후 테이블은 권한이 빈다
			if (afterGrant) {
				drawTable(ctx, px(table.x), LANE_A, table.name, "red", alpha, c);
			} else {
				const k = fade(t, GRANT_T + 300);
				drawTable(ctx, px(table.x), LANE_A, table.name, "gray", alpha * (1 - k), c);
				drawTable(ctx, px(table.x), LANE_A, table.name, "green", alpha * k, c);
			}
			// 아래 레인: 규칙이 먼저 있으므로 생기는 즉시 초록
			drawTable(ctx, px(table.x), LANE_B, table.name, "green", alpha, c);
		}

		// ⑤ 위 레인 새 테이블 강조
		if (step === 4) {
			const pulse = 0.55 + 0.45 * Math.sin((t - 7600) / 220);
			drawBadge(
				ctx,
				(px(TABLES[2].x) + px(TABLES[3].x)) / 2,
				LANE_A - 32,
				"permission denied",
				c.redFill,
				c.red,
				pulse,
			);
		}

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 24);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function PrivilegesTimingDemo({ lang = "ko" }: { lang?: Lang }) {
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

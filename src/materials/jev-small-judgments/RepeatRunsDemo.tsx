import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 같은 요청을 다시 보냈을 때 답이 얼마나 흔들리는지 보여준다. 위는 Jev 다섯 번, 아래는 Haiku 열 번의 실측값이다.
// Jev는 확률이 소수 둘째 자리에서 흔들려도 1순위가 그대로이고, Haiku는 데이터베이스 설계 1순위가 얕음과 보통으로 갈린다.
// 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const KAFKA = [0.53, 0.44, 0.51, 0.51, 0.58];
const INCIDENT_DEEP = [0.55, 0.58, 0.54, 0.58, 0.57];
const JEV_DB = [0.81, 0.8, 0.78, 0.8, 0.79]; // 다섯 번 모두 1순위 얕음
const HAIKU_DB: ("shallow" | "moderate")[] = [
	"shallow",
	"moderate",
	"moderate",
	"shallow",
	"moderate",
	"moderate",
	"moderate",
	"moderate",
	"moderate",
	"moderate",
];

const AXIS_MIN = 0.3; // 0.5 근처의 흔들림이 보이도록 축을 0.3~0.7로 좁힌다
const AXIS_MAX = 0.7;

const START = 400;
const JEV_STEP = 900;
const MOVE = 0.45; // 한 실행 안에서 점이 새 값으로 옮겨 가는 몫
const JEV_END = START + JEV_STEP * KAFKA.length;
const HAIKU_START = JEV_END + 400;
const HAIKU_STEP = 500;
const HAIKU_END = HAIKU_START + HAIKU_STEP * HAIKU_DB.length;
const CYCLE = HAIKU_END + 3200;
const FADE = 250; // 칩이 나타나는 시간(ms)

const CONTENT_MAX = 520;
const VALUE_W = 40;
const CHIP_H = 18;
const HAIKU_PER_ROW = 5;

// 세로 자리
const Y = {
	jevTitle: 14,
	kafkaLabel: 38,
	kafka: 54,
	incidentLabel: 76,
	incident: 92,
	ticks: 110,
	jevDbLabel: 134,
	jevDb: 152,
	jevDbProb: 173,
	haikuTitle: 200,
	haikuLabel: 222,
	haikuRows: [240, 264],
};
const HEIGHT = 310;

type Labels = {
	jevTitle: string;
	haikuTitle: string;
	run: (n: number, total: number) => string;
	kafka: string;
	incident: string;
	dbPick: string;
	shallow: string;
	moderate: string;
	tally: (s: number, m: number) => string;
	captions: string[];
	aria: string;
};

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		jevTitle: "Jev · 같은 요청 5번",
		haikuTitle: "Haiku · 같은 요청 10번",
		run: (n, total) => `실행 ${n}/${total}`,
		kafka: "Kafka 실무 경험 · noul",
		incident: "장애 대응 · 깊음의 확률",
		dbPick: "데이터베이스 설계 · 1순위",
		shallow: "얕음",
		moderate: "보통",
		tally: (s, m) => `얕음 ${s} · 보통 ${m}`,
		captions: ["① Jev에 같은 요청을 다섯 번 보낸다", "② Haiku에 같은 요청을 열 번 보낸다", "③ Jev는 다섯 번 모두 얕음, Haiku는 둘로 갈렸다"],
		aria: "같은 요청을 다시 보냈을 때 답이 얼마나 흔들리는지 보여주는 애니메이션. Jev에 다섯 번 보내자 Kafka 실무 경험 확률은 0.53, 0.44, 0.51, 0.51, 0.58로 0.5를 넘나들었고, 장애 대응의 깊음은 0.55, 0.58, 0.54, 0.58, 0.57이었다. 데이터베이스 설계의 1순위는 다섯 번 모두 얕음이었고 확률은 0.78에서 0.81 사이였다. Haiku에 열 번 보내자 같은 질문의 1순위가 얕음 두 번, 보통 여덟 번으로 갈렸다.",
	},
	en: {
		jevTitle: "Jev · same request 5 times",
		haikuTitle: "Haiku · same request 10 times",
		run: (n, total) => `run ${n}/${total}`,
		kafka: "Kafka in real work · noul",
		incident: "Incident response · P(Deep)",
		dbPick: "Database design · top choice",
		shallow: "Shallow",
		moderate: "Moderate",
		tally: (s, m) => `Shallow ${s} · Moderate ${m}`,
		captions: ["① Send Jev the same request five times", "② Send Haiku the same request ten times", "③ Jev said Shallow every time, Haiku split"],
		aria: "Animation of how much answers wobble when the same request is sent again. Sent to Jev five times, the probability for Kafka in real work went 0.53, 0.44, 0.51, 0.51, 0.58, crossing 0.5, and Deep for incident response went 0.55, 0.58, 0.54, 0.58, 0.57. The top choice for database design was Shallow all five times, with probabilities between 0.78 and 0.81. Sent to Haiku ten times, the same question came back Shallow twice and Moderate eight times.",
	},
};
type Lang = keyof typeof LABELS;
type Ctx = CanvasRenderingContext2D;

function drawText(ctx: Ctx, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "left") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function drawChip(ctx: Ctx, cx: number, cy: number, w: number, label: string, fill: string, stroke: string, color: string, alpha: number) {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - CHIP_H / 2, w, CHIP_H, 9);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1;
	ctx.stroke();
	drawText(ctx, label, cx, cy + 0.5, color, `600 10.5px ${FONT}`, "center");
	ctx.restore();
}

// Jev 실행 k(0부터)가 t에 어디까지 왔는지: 실행 번호와 그 안의 진행률.
function jevRun(t: number) {
	if (t < START) return { k: -1, p: 0 };
	if (t >= JEV_END) return { k: KAFKA.length - 1, p: 1 };
	const f = (t - START) / JEV_STEP;
	return { k: Math.floor(f), p: f - Math.floor(f) };
}

function makeScene(L: Labels) {
	return (ctx: Ctx, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const cw = Math.min(w - 16, CONTENT_MAX);
		const left = (w - cw) / 2;
		const right = left + cw;
		const ax0 = left + 6;
		const ax1 = right - VALUE_W;
		const ax = (v: number) => ax0 + ((ax1 - ax0) * (v - AXIS_MIN)) / (AXIS_MAX - AXIS_MIN);
		const { k, p } = jevRun(t);

		// Jev 머리
		drawText(ctx, L.jevTitle, left, Y.jevTitle, c.text, `700 12px ${FONT}`);
		if (k >= 0) drawText(ctx, L.run(k + 1, KAFKA.length), right, Y.jevTitle, c.sub, `600 11px ${FONT}`, "right");

		// 확률 두 줄: 지난 실행은 빈 원, 이번 실행은 파란 점
		const axisRow = (label: string, labelY: number, cy: number, values: number[]) => {
			drawText(ctx, label, left, labelY, c.sub, `500 11px ${FONT}`);
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(ax0, cy);
			ctx.lineTo(ax1, cy);
			ctx.stroke();
			ctx.save();
			ctx.setLineDash([3, 3]);
			ctx.strokeStyle = c.sub;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(ax(0.5), cy - 10);
			ctx.lineTo(ax(0.5), cy + 10);
			ctx.stroke();
			ctx.restore();
			if (k < 0) return;
			for (let i = 0; i < k; i++) {
				ctx.beginPath();
				ctx.arc(ax(values[i]), cy, 4, 0, Math.PI * 2);
				ctx.strokeStyle = c.sub;
				ctx.lineWidth = 1.2;
				ctx.stroke();
			}
			const from = k === 0 ? values[0] : values[k - 1];
			const cur = lerp(from, values[k], ease(clamp01(p / MOVE)));
			ctx.save();
			ctx.globalAlpha = k === 0 ? ease(clamp01(p / MOVE)) : 1;
			ctx.beginPath();
			ctx.arc(ax(cur), cy, 6, 0, Math.PI * 2);
			ctx.fillStyle = c.blue;
			ctx.fill();
			ctx.restore();
			drawText(ctx, values[k].toFixed(2), right, cy, c.text, `700 11.5px ${FONT}`, "right");
		};
		axisRow(L.kafka, Y.kafkaLabel, Y.kafka, KAFKA);
		axisRow(L.incident, Y.incidentLabel, Y.incident, INCIDENT_DEEP);
		for (const v of [AXIS_MIN, 0.5, AXIS_MAX]) {
			drawText(ctx, v.toFixed(1), ax(v), Y.ticks, c.sub, `500 10.5px ${FONT}`, "center");
		}

		// Jev 1순위 칩 다섯 개와 그 확률
		const slot = cw / KAFKA.length;
		const chipW = Math.min(slot - 6, 96);
		drawText(ctx, L.dbPick, left, Y.jevDbLabel, c.sub, `500 11px ${FONT}`);
		JEV_DB.forEach((prob, i) => {
			const a = ease(clamp01((t - (START + i * JEV_STEP)) / FADE));
			const cx = left + slot * (i + 0.5);
			drawChip(ctx, cx, Y.jevDb, chipW, L.shallow, c.blueFill, c.blue, c.text, a);
			if (a > 0) {
				ctx.save();
				ctx.globalAlpha = a;
				drawText(ctx, prob.toFixed(2), cx, Y.jevDbProb, c.sub, `600 10.5px ${FONT}`, "center");
				ctx.restore();
			}
		});

		// Haiku 머리와 1순위 칩 열 개(다섯 개씩 두 줄)
		const shown = t < HAIKU_START ? 0 : Math.min(HAIKU_DB.length, Math.floor((t - HAIKU_START) / HAIKU_STEP) + 1);
		drawText(ctx, L.haikuTitle, left, Y.haikuTitle, c.text, `700 12px ${FONT}`);
		if (shown > 0) {
			const s = HAIKU_DB.slice(0, shown).filter((v) => v === "shallow").length;
			drawText(ctx, L.tally(s, shown - s), right, Y.haikuTitle, c.amber, `700 11px ${FONT}`, "right");
		}
		drawText(ctx, L.dbPick, left, Y.haikuLabel, c.sub, `500 11px ${FONT}`);
		const hSlot = cw / HAIKU_PER_ROW;
		const hChipW = Math.min(hSlot - 6, 96);
		HAIKU_DB.forEach((pick, i) => {
			const a = ease(clamp01((t - (HAIKU_START + i * HAIKU_STEP)) / FADE));
			const cx = left + hSlot * ((i % HAIKU_PER_ROW) + 0.5);
			const cy = Y.haikuRows[Math.floor(i / HAIKU_PER_ROW)];
			const isShallow = pick === "shallow";
			drawChip(ctx, cx, cy, hChipW, isShallow ? L.shallow : L.moderate, isShallow ? c.amberFill : c.boxFill, c.amber, c.text, a);
		});

		const caption = t < JEV_END ? 0 : t < HAIKU_END ? 1 : 2;
		drawText(ctx, L.captions[caption], w / 2, HEIGHT - 14, c.text, `500 12px ${FONT}`, "center");
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function RepeatRunsDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

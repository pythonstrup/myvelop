import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 글의 문턱 표를 항목마다 한 줄로 그린다. 축에 구간을 칠해 두고, Jev가 돌려준 실제 답(측정 run 0)이
// 차례로 떨어지면 결과 배지를 띄운다. 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
type Kind = "green" | "amber" | "gray";
type Band = { from: number; to: number; kind: Kind };
type Dot = { v: number; badge: string; kind: Kind };
type Row = { title: string; bands: Band[]; ticks: number[]; dots: Dot[] };

const DOT_GAP = 900; // 점 하나가 출발하는 간격(ms)
const DROP = 700; // 점이 떨어지는 시간
const FADE = 300; // 배지가 나타나는 시간
const START = 500;
const DOT_COUNT = 6;
const LANDED = START + (DOT_COUNT - 1) * DOT_GAP + DROP + FADE + 200;
const CYCLE = LANDED + 3800;

const TOP = 34;
const ROW_H = 92;
const ROWS_N = 4;
const HEIGHT = TOP + ROWS_N * ROW_H + 30;
const AXIS_DY = 38; // 줄 위쪽에서 축까지
const AXIS_H = 10;
const DOT_R = 6;
const DROP_FROM = 26; // 점이 출발하는 높이(축 위)

type Labels = { legend: [string, string, string]; rows: Row[]; captions: [string, string]; aria: string };

const LABELS: Record<"ko" | "en", Labels> = {
	ko: {
		legend: ["바로 처리", "확인으로 넘김", "모름·따로 둠"],
		rows: [
			{
				title: "기술 스택 · 예일 확률",
				bands: [
					{ from: 0, to: 0.3, kind: "gray" },
					{ from: 0.3, to: 0.7, kind: "amber" },
					{ from: 0.7, to: 1, kind: "green" },
				],
				ticks: [0.3, 0.7],
				dots: [
					{ v: 0.97, badge: "Kotlin → 태그", kind: "green" },
					{ v: 0.53, badge: "Kafka → 확인할 점", kind: "amber" },
				],
			},
			{
				title: "직무 관련성 · 예일 확률",
				bands: [
					{ from: 0, to: 0.1, kind: "gray" },
					{ from: 0.1, to: 0.9, kind: "amber" },
					{ from: 0.9, to: 1, kind: "green" },
				],
				ticks: [0.1, 0.9],
				dots: [{ v: 0.97, badge: "관련 있음 → 진행", kind: "green" }],
			},
			{
				title: "필수 요건 · 확신도",
				bands: [
					{ from: 0, to: 0.9, kind: "amber" },
					{ from: 0.9, to: 1, kind: "green" },
				],
				ticks: [0.9],
				dots: [{ v: 0.33, badge: "장애 대응 → 확인", kind: "amber" }],
			},
			{
				title: "우대 조건 · 확신도",
				bands: [
					{ from: 0, to: 0.7, kind: "gray" },
					{ from: 0.7, to: 1, kind: "green" },
				],
				ticks: [0.7],
				dots: [
					{ v: 0.79, badge: "팀을 이끈 경험 → 일부로 반영", kind: "green" },
					{ v: 0.64, badge: "쿠버네티스 → 모름", kind: "gray" },
				],
			},
		],
		captions: ["① 답이 항목마다 정한 구간에 떨어진다", "② 초록은 코드가 바로 처리하고, 주황은 확인으로 넘긴다"],
		aria: "이력서 판독기의 항목마다 구간을 나눠 두고 Jev의 실제 답이 어느 구간에 떨어지는지 보여 주는 애니메이션. 기술 스택은 예일 확률 0.7 이상이면 태그를 붙이며, Kotlin 0.97은 태그가 붙고 Kafka 0.53은 확인할 점으로 남는다. 직무 관련성은 0.9 이상이면 진행, 0.1 이하면 따로 모으고 그 사이는 사람이 보며, 0.97이라 진행한다. 필수 요건은 확신도 0.9 이상만 바로 처리하며, 장애 대응은 확신도 0.33이라 확인으로 넘어간다. 우대 조건은 확신도 0.7 이상이면 반영하고 아니면 모름으로 두며, 팀을 이끈 경험은 0.79라 일부로 반영되고 쿠버네티스 운영 경험은 0.64라 모름으로 남는다.",
	},
	en: {
		legend: ["Handle now", "Send to review", "Unknown, set aside"],
		rows: [
			{
				title: "Tech stack · P(yes)",
				bands: [
					{ from: 0, to: 0.3, kind: "gray" },
					{ from: 0.3, to: 0.7, kind: "amber" },
					{ from: 0.7, to: 1, kind: "green" },
				],
				ticks: [0.3, 0.7],
				dots: [
					{ v: 0.97, badge: "Kotlin → tag", kind: "green" },
					{ v: 0.53, badge: "Kafka → check", kind: "amber" },
				],
			},
			{
				title: "Job relevance · P(yes)",
				bands: [
					{ from: 0, to: 0.1, kind: "gray" },
					{ from: 0.1, to: 0.9, kind: "amber" },
					{ from: 0.9, to: 1, kind: "green" },
				],
				ticks: [0.1, 0.9],
				dots: [{ v: 0.97, badge: "Relevant → proceed", kind: "green" }],
			},
			{
				title: "Required skills · confidence",
				bands: [
					{ from: 0, to: 0.9, kind: "amber" },
					{ from: 0.9, to: 1, kind: "green" },
				],
				ticks: [0.9],
				dots: [{ v: 0.33, badge: "Incident response → review", kind: "amber" }],
			},
			{
				title: "Preferred · confidence",
				bands: [
					{ from: 0, to: 0.7, kind: "gray" },
					{ from: 0.7, to: 1, kind: "green" },
				],
				ticks: [0.7],
				dots: [
					{ v: 0.79, badge: "Leading a team → Partly", kind: "green" },
					{ v: 0.64, badge: "Kubernetes → Unknown", kind: "gray" },
				],
			},
		],
		captions: ["① Each answer lands in the bands set for its item", "② Green is handled in code, amber goes to review"],
		aria: "Animation of the resume reader's bands per item and where Jev's actual answers land. For the tech stack, a probability of 0.7 or higher adds a tag: Kotlin at 0.97 gets a tag and Kafka at 0.53 is left as a point to check. For job relevance, 0.9 or higher moves on, 0.1 or lower is set aside, and a person looks at everything in between; the answer is 0.97, so it moves on. Required skills are handled right away only at confidence 0.9 or higher; incident response has confidence 0.33 and goes to review. Preferred qualifications count at confidence 0.7 or higher and are otherwise left as unknown; leading a team at 0.79 counts as partly met, and running Kubernetes at 0.64 stays unknown.",
	},
};
type Lang = keyof typeof LABELS;

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "left") {
	ctx.textAlign = align;
	ctx.textBaseline = "middle";
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

const DARK_BAND_ALPHA = 0.42; // 어두운 화면의 연한 채움색은 구간끼리 구분이 안 돼 진한 색을 비쳐 칠한다

function fillBand(ctx: CanvasRenderingContext2D, c: Colors, kind: Kind, dark: boolean, draw: () => void) {
	ctx.save();
	if (kind === "gray") ctx.fillStyle = c.line;
	else if (dark) {
		ctx.fillStyle = kind === "green" ? c.green : c.amber;
		ctx.globalAlpha = DARK_BAND_ALPHA;
	} else ctx.fillStyle = kind === "green" ? c.greenFill : c.amberFill;
	draw();
	ctx.restore();
}

function badgeColors(c: Colors, kind: Kind) {
	if (kind === "green") return { fill: c.greenFill, color: c.green };
	if (kind === "amber") return { fill: c.amberFill, color: c.amber };
	return { fill: c.boxFill, color: c.sub };
}

const BADGE_FONT = `600 10.5px ${FONT}`;

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const ax0 = margin + 4;
		const ax1 = w - margin - 4;
		const x = (v: number) => ax0 + (ax1 - ax0) * v;

		// 범례
		let lx = margin;
		L.legend.forEach((name, i) => {
			const kind: Kind = i === 0 ? "green" : i === 1 ? "amber" : "gray";
			fillBand(ctx, c, kind, dark, () => {
				ctx.beginPath();
				ctx.roundRect(lx, 7, 12, 10, 2);
				ctx.fill();
			});
			drawText(ctx, name, lx + 17, 12.5, c.sub, `500 10.5px ${FONT}`);
			lx += 17 + ctx.measureText(name).width + 14;
		});

		let dotIndex = 0;
		L.rows.forEach((row, r) => {
			const y = TOP + r * ROW_H;
			const axisY = y + AXIS_DY;
			drawText(ctx, row.title, margin, y + 8, c.text, `700 11.5px ${FONT}`);

			// 구간을 칠한 축
			ctx.save();
			ctx.beginPath();
			ctx.roundRect(ax0, axisY - AXIS_H / 2, ax1 - ax0, AXIS_H, 4);
			ctx.clip();
			for (const band of row.bands) {
				fillBand(ctx, c, band.kind, dark, () => ctx.fillRect(x(band.from), axisY - AXIS_H / 2, x(band.to) - x(band.from), AXIS_H));
			}
			ctx.restore();
			ctx.beginPath();
			ctx.roundRect(ax0, axisY - AXIS_H / 2, ax1 - ax0, AXIS_H, 4);
			ctx.strokeStyle = c.boxStroke;
			ctx.lineWidth = 1;
			ctx.stroke();

			// 눈금: 양 끝과 문턱
			const ticks = [0, ...row.ticks, 1];
			for (const v of ticks) {
				const isEdge = v === 0 || v === 1;
				if (!isEdge) {
					ctx.beginPath();
					ctx.moveTo(x(v), axisY - AXIS_H / 2 - 3);
					ctx.lineTo(x(v), axisY + AXIS_H / 2 + 3);
					ctx.strokeStyle = c.sub;
					ctx.stroke();
				}
				drawText(ctx, String(v), x(v), axisY + 18, isEdge ? c.sub : c.text, `${isEdge ? 500 : 600} 10.5px ${FONT}`, v === 0 ? "left" : v === 1 ? "right" : "center");
			}

			// 점과 배지
			let bx = margin;
			for (const dot of row.dots) {
				const t0 = START + dotIndex * DOT_GAP;
				dotIndex++;
				const p = clamp01((t - t0) / DROP);
				const badgeP = clamp01((t - t0 - DROP) / FADE);
				ctx.font = BADGE_FONT;
				const bw = ctx.measureText(dot.badge).width + 14;
				const bcx = bx + bw / 2;
				bx += bw + 8;
				if (p <= 0) continue;

				const cy = lerp(axisY - DROP_FROM, axisY, ease(p));
				ctx.save();
				ctx.globalAlpha = Math.min(1, p * 3);
				ctx.beginPath();
				ctx.arc(x(dot.v), cy, DOT_R, 0, Math.PI * 2);
				ctx.fillStyle = c.blue;
				ctx.fill();
				ctx.lineWidth = 2;
				ctx.strokeStyle = dark ? "rgba(0, 0, 0, 0.6)" : "#ffffff";
				ctx.stroke();
				ctx.restore();

				if (badgeP > 0) {
					ctx.save();
					ctx.globalAlpha = badgeP;
					drawText(ctx, String(dot.v), x(dot.v), axisY - 16, c.blue, `700 11px ${FONT}`, "center");
					ctx.restore();
					const bc = badgeColors(c, dot.kind);
					drawBadge(ctx, bcx, y + 74, dot.badge, bc.fill, bc.color, badgeP);
				}
			}
		});

		const caption = t < LANDED ? 0 : 1;
		drawText(ctx, L.captions[caption], w / 2, HEIGHT - 14, c.text, `500 12px ${FONT}`, "center");
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function BandsDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

import { clamp01, FONT, palette, useCanvasScene } from "@/materials/shared";
import { drawArrow, drawTimer, fitCaption } from "./canvas";

// 연결 예약 X·Y(둘 다 A+B)를 같은 새 시간으로 동시에 옮길 때 회의실 행을 고치는 순서에 따라 결과가 갈린다.
// 위는 반대 순서로 교착 → 2.09초에 X 40P01, 아래는 같은 순서로 Y 가 A 에서 기다리다 1.09초에 23P01.
// 두 행을 고치는 사이에 1초를 둔 실험의 시간이다. 행은 세션(X·Y), 열은 회의실(A·B)이다.
const CYCLE = 11800;
const HEIGHT = 296;
const STEP_END = [2000, 4600, 6200, 7900, CYCLE];
const LANE_Y = [22, 156];
const ROW_Y = [28, 80]; // 레인 위쪽에서 X 줄, Y 줄까지
const BLOCK_H = 26;
const O = { first: 500, second: 2000, timer: [2400, 4400], abort: 4600, commit: 5200 };
const S = { first: 6400, second: 7900, commit: 8500, reject: 8700 };

type Labels = {
	lanes: [string, string];
	stamps: [string, string];
	timer: string;
	opposite: { x: [string, string, string]; y: [string, string, string] };
	same: { x: [string, string, string]; y: [string, string] };
	captions: string[];
	aria: string;
};
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		lanes: ["반대 순서 · X: A→B · Y: B→A", "같은 순서 · X: A→B · Y: A→B"],
		stamps: ["2.09초", "1.09초"],
		timer: "1초",
		opposite: { x: ["A 고침", "B에서 Y를 기다림", "40P01, 롤백"], y: ["B 고침", "A에서 X를 기다림", "통과, 커밋"] },
		same: { x: ["A 고침", "B 고침", "커밋"], y: ["A에서 X를 기다림", "23P01"] },
		captions: [
			"① 반대 순서: X는 A부터, Y는 B부터 고친다",
			"② 1초 뒤 X는 B에서, Y는 A에서 서로를 기다린다",
			"③ 1초를 더 기다려 X가 40P01로 끝난다 · 2.09초",
			"④ 같은 순서: Y는 A에서 X를 기다린다",
			"⑤ X가 B까지 고쳐 커밋하자 Y는 23P01을 받는다 · 1.09초",
		],
		aria: "A+B 연결 예약 X와 Y를 같은 새 시간으로 동시에 옮길 때 회의실 행을 고치는 순서에 따라 결과가 갈리는 과정을 반복 재생하는 애니메이션. 반대 순서에서는 X가 A를, Y가 B를 먼저 고치고 1초 뒤 X는 B에서 Y를, Y는 A에서 X를 기다려 교착이 난다. 교착 검사를 1초 더 기다린 뒤 X가 40P01로 롤백되고 Y가 커밋한다. 2.09초가 걸렸다. 같은 순서에서는 Y가 A에서 X를 기다리기만 하고, X가 B까지 고쳐 커밋하자 Y는 1.09초에 23P01을 받는다.",
	},
	en: {
		lanes: ["Opposite order · X: A→B · Y: B→A", "Same order · X: A→B · Y: A→B"],
		stamps: ["2.09 s", "1.09 s"],
		timer: "1 s",
		opposite: { x: ["updated A", "waits for Y at B", "40P01, rolled back"], y: ["updated B", "waits for X at A", "passes, commits"] },
		same: { x: ["updated A", "updated B", "committed"], y: ["waits for X at A", "23P01"] },
		captions: [
			"① Opposite order: X starts with A, Y with B",
			"② 1 s later X waits at B and Y at A, for each other",
			"③ After 1 s more, X fails with 40P01 · 2.09 s",
			"④ Same order: Y waits for X at A",
			"⑤ X updates B and commits; Y gets 23P01 · 1.09 s",
		],
		aria: "Looping animation of linked bookings X and Y, both A+B, moved to the same new time at once, with different results depending on the order their room rows are updated. In the opposite order X updates A and Y updates B first; a second later X waits for Y at B and Y waits for X at A, a deadlock. After the deadlock check waits another second, X rolls back with 40P01 and Y commits, 2.09 s in total. In the same order Y only waits for X at A, and when X updates B and commits, Y gets 23P01 at 1.09 s.",
	},
};

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pageBg = dark ? "#0d1117" : "#ffffff";
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const x0 = ox + 22;
		const colW = comp * 0.24;
		const colX = (k: number) => x0 + k * (colW + 10);
		const sx = colX(2) + 6;
		const step = STEP_END.findIndex((end) => t < end);
		const fade = (at: number) => clamp01((t - at) / 300);
		const out = (at: number) => 1 - clamp01((t - at) / 600);
		const session = [
			{ color: c.blue, fill: c.blueFill },
			{ color: c.amber, fill: c.amberFill },
		];

		// 행 하나: 커밋 전은 점선, 안의 숫자는 그 세션이 고친 순서다.
		const block = (y0: number, r: number, k: number, label: string, color: string, fill: string, dashed: boolean, alpha: number) => {
			if (alpha <= 0) return;
			const y = y0 + ROW_Y[r];
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.beginPath();
			ctx.roundRect(colX(k) + 2, y, colW - 4, BLOCK_H, 5);
			ctx.fillStyle = fill;
			ctx.fill();
			if (dashed) ctx.setLineDash([4, 3]);
			ctx.strokeStyle = color;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.font = `700 11px ${FONT}`;
			ctx.fillStyle = color;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(label, colX(k) + colW / 2, y + BLOCK_H / 2 + 0.5);
			ctx.restore();
		};
		// 기다리는 쪽 행에서 상대 행으로 가는 세로 화살표
		const waitArrow = (y0: number, k: number, fromRow: number, color: string, alpha: number) => {
			const cx = colX(k) + colW / 2;
			const top = y0 + ROW_Y[0] + BLOCK_H + 3;
			const bottom = y0 + ROW_Y[1] - 3;
			if (fromRow === 0) drawArrow(ctx, cx, top, cx, bottom, color, alpha, true);
			else drawArrow(ctx, cx, bottom, cx, top, color, alpha, true);
		};
		const status = (y0: number, r: number, text: string, color: string, alpha: number) => {
			if (alpha <= 0) return;
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.font = `600 10.5px ${FONT}`;
			ctx.fillStyle = color;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(text, sx, y0 + ROW_Y[r] + BLOCK_H / 2);
			ctx.restore();
		};

		LANE_Y.forEach((y0, lane) => {
			ctx.font = `600 10.5px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(L.lanes[lane], ox, y0);
			ctx.textAlign = "center";
			ctx.font = `600 11px ${FONT}`;
			["A", "B"].forEach((room, k) => ctx.fillText(room, colX(k) + colW / 2, y0 + 17));
			["X", "Y"].forEach((name, r) => {
				ctx.fillStyle = session[r].color;
				ctx.fillText(name, ox + 8, y0 + ROW_Y[r] + BLOCK_H / 2);
			});
			for (const r of [0, 1]) {
				for (const k of [0, 1]) {
					ctx.beginPath();
					ctx.roundRect(colX(k) + 2, y0 + ROW_Y[r], colW - 4, BLOCK_H, 5);
					ctx.strokeStyle = c.boxStroke;
					ctx.lineWidth = 1;
					ctx.stroke();
				}
			}
		});

		// 반대 순서
		{
			const y0 = LANE_Y[0];
			const L0 = L.opposite;
			const aborted = t >= O.abort;
			const committed = t >= O.commit;
			const xOut = out(O.abort + 100);
			block(y0, 0, 0, "①", c.blue, c.blueFill, true, fade(O.first) * xOut);
			block(y0, 0, 1, "②", c.blue, c.blueFill, true, fade(O.second) * xOut);
			block(y0, 1, 1, "①", c.amber, c.amberFill, !committed, fade(O.first));
			block(y0, 1, 0, "②", c.amber, c.amberFill, !committed, fade(O.second));
			waitArrow(y0, 1, 0, aborted ? c.red : c.blue, fade(O.second + 200) * out(O.abort));
			waitArrow(y0, 0, 1, aborted ? c.red : c.amber, fade(O.second + 200) * out(O.abort + 400));
			const p = clamp01((t - O.timer[0]) / (O.timer[1] - O.timer[0]));
			drawTimer(ctx, c, colX(1) - 5, y0 + (ROW_Y[0] + BLOCK_H + ROW_Y[1]) / 2, p, L.timer, p >= 1 ? c.red : c.amber, pageBg, fade(O.timer[0] - 200) * out(O.abort));
			const xi = aborted ? 2 : t >= O.second ? 1 : 0;
			const yi = committed ? 2 : t >= O.second ? 1 : 0;
			status(y0, 0, `X · ${L0.x[xi]}`, xi === 2 ? c.red : xi === 1 ? c.blue : c.text, fade(O.first));
			status(y0, 1, `Y · ${L0.y[yi]}`, yi === 2 ? c.green : yi === 1 ? c.amber : c.text, fade(O.first));
			ctx.font = `700 12px ${FONT}`;
			ctx.fillStyle = c.red;
			ctx.textAlign = "right";
			ctx.globalAlpha = fade(O.abort);
			ctx.fillText(L.stamps[0], ox + comp, y0);
			ctx.globalAlpha = 1;
		}

		// 같은 순서
		{
			const y0 = LANE_Y[1];
			const L1 = L.same;
			const committed = t >= S.commit;
			const rejected = t >= S.reject;
			block(y0, 0, 0, "①", c.blue, c.blueFill, !committed, fade(S.first));
			block(y0, 0, 1, "②", c.blue, c.blueFill, !committed, fade(S.second));
			block(y0, 1, 0, "①", rejected ? c.red : c.amber, rejected ? c.redFill : c.amberFill, true, fade(S.first) * out(S.reject + 200));
			waitArrow(y0, 0, 1, c.amber, fade(S.first + 200) * out(S.commit));
			const xi = committed ? 2 : t >= S.second ? 1 : 0;
			status(y0, 0, `X · ${L1.x[xi]}`, xi === 2 ? c.green : c.text, fade(S.first));
			status(y0, 1, `Y · ${L1.y[rejected ? 1 : 0]}`, rejected ? c.red : c.amber, fade(S.first));
			ctx.font = `700 12px ${FONT}`;
			ctx.fillStyle = c.text;
			ctx.textAlign = "right";
			ctx.globalAlpha = fade(S.reject);
			ctx.fillText(L.stamps[1], ox + comp, y0);
			ctx.globalAlpha = 1;
		}

		const caption = L.captions[step];
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		fitCaption(ctx, caption, w);
		ctx.fillStyle = c.text;
		ctx.fillText(caption, w / 2, HEIGHT - 16);
	};
}

const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function WriteOrderDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

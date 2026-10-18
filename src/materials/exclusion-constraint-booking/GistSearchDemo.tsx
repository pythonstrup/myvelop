import { clamp01, drawBadge, FONT, palette, useCanvasScene } from "@/materials/shared";
import { fitCaption } from "./canvas";

// GiST 검색이 겹치는 가지만 따라 내려가는 모습. 값은 10만 건으로 만든 시간 범위 GiST 를 pageinspect 로 연 결과다.
// 루트 9개 중 세 번째(2027.5.26–2028.2.4) → 가운데 102개 중 6.15–6.17 → 잎의 6월 15일 11:00–12:00.
const CYCLE = 13000;
const HEIGHT = 272;
const STEP_END = [2400, 5000, 7600, 10200, CYCLE];
const ROW_Y = [58, 126, 194];
const CELL_H = 26;
const PICK_AT = [2600, 5800, 8400];
const SHOW_AT = [0, 5200, 7800];
const DONE_AT = 10400;

const ROOT = ["26.1", "26.9", "27.5", "28.2", "28.10", "29.6", "30.3", "30.11", "31.8"];
const MID = ["6.7–9", "6.10–12", "6.12–14", "6.15–17", "6.17–19", "6.20–22", "6.22–24"];
const LEAF = ["09–10", "11–12", "13–14", "15–16"];
const PICK = [2, 3, 1];

type Labels = { query: string; titles: [string, string, string]; picked: [string, string, string]; times10: string; captions: string[]; aria: string };
type Lang = "ko" | "en";

const LABELS: Record<Lang, Labels> = {
	ko: {
		query: "찾을 범위 · 2027-06-15 10:30–11:30",
		titles: ["루트 · 항목 9개", "가운데 페이지 · 항목 102개 중 일부", "잎 페이지 · 6월 15일 부분"],
		picked: ["2027.5.26 – 2028.2.4", "2027.6.15 09:00 – 6.17 12:00", "6.15 11:00–12:00 · 회의실 10개"],
		times10: "×10",
		captions: [
			"① 찾을 범위는 2027-06-15 10:30–11:30이다",
			"② 루트 9개 중 이 날짜를 덮는 항목으로만 내려간다",
			"③ 가운데 102개 중 6월 15일을 덮는 항목만 따라간다",
			"④ 잎에서 시간이 겹치는 11:00–12:00을 찾는다",
			"⑤ 회의실까지 거르면 C 한 건, 인덱스 4페이지만 읽었다",
		],
		aria: "GiST 인덱스에서 2027년 6월 15일 10:30–11:30과 겹치는 행을 찾는 과정을 반복 재생하는 애니메이션. 루트의 항목 9개 중 2027년 5월 26일부터 2028년 2월 4일까지를 덮는 세 번째 항목으로만 내려가고, 가운데 페이지의 항목 102개 중 6월 15일 09:00부터 6월 17일 12:00까지를 덮는 항목만 따라간다. 잎 페이지에서 시간이 겹치는 6월 15일 11:00–12:00 항목을 찾고, 회의실까지 거르면 회의실 C 한 건이 남는다. 이 조회는 인덱스 4페이지만 읽었다.",
	},
	en: {
		query: "Search range · 2027-06-15 10:30–11:30",
		titles: ["Root · 9 entries", "Middle page · some of 102 entries", "Leaf page · June 15"],
		picked: ["2027-05-26 – 2028-02-04", "2027-06-15 09:00 – 06-17 12:00", "06-15 11:00–12:00 · 10 rooms"],
		times10: "×10",
		captions: [
			"① The search range is 2027-06-15 10:30–11:30",
			"② From the root's 9 entries, descend only into the one covering it",
			"③ Of 102 middle entries, follow only the one covering June 15",
			"④ In the leaf, find the overlapping 11:00–12:00",
			"⑤ Filtering by room leaves room C: 4 index pages read",
		],
		aria: "Looping animation of a GiST index search for rows overlapping 2027-06-15 10:30–11:30. Of the root's 9 entries it descends only into the third, covering 2027-05-26 to 2028-02-04; of the middle page's 102 entries it follows only the one covering June 15 09:00 to June 17 12:00. In the leaf page it finds the overlapping June 15 11:00–12:00 entries, and filtering by room leaves one row for room C. The query read only 4 index pages.",
	},
};

function makeScene(L: Labels) {
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const pageBg = dark ? "#0d1117" : "#ffffff";
		const comp = Math.min(w - 28, 520);
		const ox = (w - comp) / 2;
		const step = STEP_END.findIndex((end) => t < end);

		// 찾을 범위
		drawBadge(ctx, w / 2, 18, L.query, c.blueFill, c.blue, 1);

		const rows = [ROOT, MID, LEAF];
		const cellsOf = (r: number) => {
			const items = rows[r];
			const pad = r === 1 ? 18 : 0; // 가운데 줄은 양 끝에 … 자리를 둔다
			const gap = 4;
			const cw = (comp - pad * 2 - gap * (items.length - 1)) / items.length;
			return items.map((_, i) => ({ x: ox + pad + i * (cw + gap), w: cw }));
		};

		rows.forEach((items, r) => {
			const shown = clamp01((t - SHOW_AT[r]) / 400);
			if (shown <= 0) return;
			const y = ROW_Y[r];
			const cells = cellsOf(r);
			const picked = t >= PICK_AT[r];
			const dimmed = clamp01((t - PICK_AT[r] - 500) / 400);
			ctx.save();
			ctx.globalAlpha = shown;
			ctx.font = `600 10.5px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(L.titles[r], ox, y - 11);
			if (r === 1) {
				ctx.fillStyle = c.sub;
				ctx.textAlign = "center";
				ctx.fillText("…", ox + 7, y + CELL_H / 2);
				ctx.fillText("…", ox + comp - 7, y + CELL_H / 2);
			}
			items.forEach((label, i) => {
				const { x, w: cw } = cells[i];
				const hit = picked && i === PICK[r];
				ctx.globalAlpha = shown * (hit ? 1 : 1 - dimmed * 0.65);
				ctx.beginPath();
				ctx.roundRect(x, y, cw, CELL_H, 4);
				ctx.fillStyle = hit ? c.amberFill : c.boxFill;
				ctx.fill();
				ctx.strokeStyle = hit ? c.amber : c.boxStroke;
				ctx.lineWidth = hit ? 2 : 1;
				ctx.stroke();
				const text = r === 2 ? `${label} ${L.times10}` : label;
				// 칸에 안 들어가면 글자를 줄여 보고, 그래도 안 되면 비워 둔다(고른 칸은 아래 배지에 적힌다).
				ctx.font = `${hit ? 700 : 500} 9.5px ${FONT}`;
				if (ctx.measureText(text).width >= cw - 2) ctx.font = `${hit ? 700 : 500} 8.5px ${FONT}`;
				if (ctx.measureText(text).width < cw - 2) {
					ctx.fillStyle = hit ? c.amber : c.text;
					ctx.textAlign = "center";
					ctx.fillText(text, x + cw / 2, y + CELL_H / 2 + 0.5);
				}
			});
			ctx.restore();
			if (picked) {
				const { x, w: cw } = cells[PICK[r]];
				drawBadge(ctx, Math.min(Math.max(x + cw / 2, ox + 70), ox + comp - 70), y + CELL_H + 12, L.picked[r], pageBg, c.amber, clamp01((t - PICK_AT[r]) / 300));
			}
		});

		// 고른 항목에서 아래 페이지로 내려가는 선
		for (const r of [0, 1]) {
			const a = clamp01((t - SHOW_AT[r + 1] + 200) / 400);
			if (a <= 0) continue;
			const { x, w: cw } = cellsOf(r)[PICK[r]];
			const top = ROW_Y[r] + CELL_H + 22;
			const bottom = ROW_Y[r + 1] - 20;
			ctx.save();
			ctx.globalAlpha = a * 0.8;
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 1.2;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(x + cw / 2, top);
			ctx.lineTo(ox + 2, bottom);
			ctx.moveTo(x + cw / 2, top);
			ctx.lineTo(ox + comp - 2, bottom);
			ctx.stroke();
			ctx.restore();
		}

		if (t >= DONE_AT) {
			const cells = cellsOf(2);
			const { x, w: cw } = cells[PICK[2]];
			ctx.save();
			ctx.globalAlpha = clamp01((t - DONE_AT) / 300);
			ctx.strokeStyle = c.green;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.roundRect(x - 3, ROW_Y[2] - 3, cw + 6, CELL_H + 6, 6);
			ctx.stroke();
			ctx.restore();
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

export default function GistSearchDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

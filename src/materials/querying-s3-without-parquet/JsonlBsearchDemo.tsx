import { clamp01, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// 정렬 JSONL 파일을 HTTP Range 이진탐색으로 찾는 과정.
// 실제 알고리즘 그대로 프로브 시퀀스를 사전 계산해 매 사이클 같은 장면을 재생한다.
const SIZE = 18_350_000; // 일자 파일 크기 (bytes)
const ID_LO = 1_583_327;
const ID_HI = 1_666_659;
const TARGET = 1_620_000;
const WINDOW = 65_536;
const idAt = (x: number) => ID_LO + Math.round((x / SIZE) * (ID_HI - ID_LO));

type Probe = { mid: number; idm: number; lo: number; hi: number; left: boolean };
const PROBES: Probe[] = [];
let FINAL = { lo: 0, hi: SIZE };
{
	let lo = 0;
	let hi = SIZE;
	while (hi - lo > WINDOW) {
		const mid = Math.floor((lo + hi) / 2);
		const idm = idAt(mid);
		PROBES.push({ mid, idm, lo, hi, left: idm >= TARGET });
		if (idm < TARGET) lo = mid;
		else hi = mid;
	}
	FINAL = { lo, hi };
}

const T_INTRO = 2400;
const T_PROBE = 900;
const T_FETCH = 1800;
const T_SUMMARY = 3200;
const T_PROBES_END = T_INTRO + PROBES.length * T_PROBE;
const CYCLE = T_PROBES_END + T_FETCH + T_SUMMARY;
const HEIGHT = 300;

const LABELS = {
	ko: {
		title: "정렬 JSONL에서 id 1,620,000 찾기",
		file: "2026-07-20.jsonl · 18MB · id 정렬",
		fullScan: "풀스캔: 18MB 전체 전송",
		cap1: "① 인덱스가 없다면 파일 전체를 내려받아야 한다",
		dropRight: "≥ target → 오른쪽 버림",
		dropLeft: "< target → 왼쪽 버림",
		readPrefix: "4KB 읽음: ",
		cap2Narrow: (n: number, total: number, leftKB: string) =>
			`② 4KB 프로브 ${n}/${total} — 남은 ${leftKB}KB`,
		cap2: (n: number, total: number, leftKB: string) =>
			`② Range로 중간 4KB만 읽어 비교 — 프로브 ${n}/${total}, 남은 구간 ${leftKB}KB`,
		found: "64KB 범위 요청 → 레코드 발견 ✓",
		cap3: "③ 구간이 64KB 이하로 좁혀지면 마지막 범위만 받아 스캔한다",
		rowFull: "풀스캔",
		rowBsearch: "이진탐색",
		rowBsearchVal: "0.17MB · 요청 11회",
		cap4: "④ 전송 1/100 · 정렬돼 있다는 사실 자체가 인덱스다",
		aria: "정렬된 JSONL 파일에서 HTTP Range 요청 이진탐색으로 레코드 하나를 찾는 과정 애니메이션. 중간 지점의 4KB만 읽어 id를 비교하고 절반을 버리기를 반복해, 18MB 파일에서 전송 0.17MB·요청 11회로 목표 레코드를 찾는다.",
	},
	en: {
		title: "Finding id 1,620,000 in sorted JSONL",
		file: "2026-07-20.jsonl · 18MB · sorted by id",
		fullScan: "full scan: all 18MB transferred",
		cap1: "① Without an index, the whole file must be downloaded",
		dropRight: "≥ target → drop right",
		dropLeft: "< target → drop left",
		readPrefix: "read 4KB: ",
		cap2Narrow: (n: number, total: number, leftKB: string) =>
			`② 4KB probe ${n}/${total} — ${leftKB}KB left`,
		cap2: (n: number, total: number, leftKB: string) =>
			`② Range reads just the middle 4KB to compare — probe ${n}/${total}, ${leftKB}KB left`,
		found: "64KB Range request → record found ✓",
		cap3: "③ Once the span is under 64KB, fetch just that range and scan",
		rowFull: "full scan",
		rowBsearch: "binary search",
		rowBsearchVal: "0.17MB · 11 requests",
		cap4: "④ 1/100 the transfer · being sorted is itself the index",
		aria: "Animation of binary searching a sorted JSONL file with HTTP Range requests to find one record. Each probe reads just 4KB at the midpoint, compares the id and discards half, locating the target record in an 18MB file with 0.17MB transferred over 11 requests.",
	},
} as const;
type Lang = keyof typeof LABELS;

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const h = HEIGHT;
	const m = Math.max(16, w * 0.04);
	const barX = m;
	const barW = w - m * 2;
	const barY = h * 0.3;
	const barH = Math.max(30, h * 0.1);
	const bx = (off: number) => barX + (off / SIZE) * barW; // 바이트 → 픽셀
	const fs = Math.max(11, Math.min(14, w / 46));

	// 제목·파일 라벨
	ctx.font = `600 ${fs + 2}px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "left";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(L.title, barX, h * 0.11);
	ctx.font = `${fs - 1}px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(L.file, barX, h * 0.11 + fs + 6);

	// 파일 스트립
	ctx.fillStyle = c.boxFill;
	ctx.beginPath();
	ctx.roundRect(barX, barY, barW, barH, 6);
	ctx.fill();
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.stroke();

	// 양끝 id 라벨
	ctx.font = `${fs - 1}px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "left";
	ctx.fillText("id 1,583,327", barX, barY + barH + fs + 8);
	ctx.textAlign = "right";
	ctx.fillText("id 1,666,659", barX + barW, barY + barH + fs + 8);

	let caption = "";
	const probeIdx =
		t < T_INTRO ? -1 : Math.min(PROBES.length - 1, Math.floor((t - T_INTRO) / T_PROBE));

	if (t < T_INTRO) {
		// ① 풀스캔이라면: 전체 스윕
		const p = ease(clamp01(t / T_INTRO));
		ctx.fillStyle = c.amberFill;
		ctx.beginPath();
		ctx.roundRect(barX, barY, barW * p, barH, 6);
		ctx.fill();
		ctx.font = `600 ${fs}px ${FONT}`;
		ctx.fillStyle = c.amber;
		ctx.textAlign = "center";
		ctx.fillText(L.fullScan, barX + barW / 2, barY - 10);
		caption = L.cap1;
	} else if (t < T_PROBES_END) {
		// ② 프로브 단계
		const pr = PROBES[probeIdx];
		const pt = ease(clamp01(((t - T_INTRO) % T_PROBE) / (T_PROBE * 0.6)));
		// 지금까지 버린 구간
		ctx.fillStyle = `${c.sub}26`;
		if (pr.lo > 0) ctx.fillRect(barX, barY, bx(pr.lo) - barX, barH);
		if (pr.hi < SIZE) ctx.fillRect(bx(pr.hi), barY, barX + barW - bx(pr.hi), barH);
		// 살아있는 구간
		ctx.fillStyle = c.blueFill;
		ctx.fillRect(bx(pr.lo), barY, bx(pr.hi) - bx(pr.lo), barH);
		// 이번 프로브에서 버려지는 절반
		ctx.fillStyle = `${c.sub}44`;
		if (pr.left) ctx.fillRect(bx(pr.mid), barY, (bx(pr.hi) - bx(pr.mid)) * pt, barH);
		else
			ctx.fillRect(
				bx(pr.lo) + (bx(pr.mid) - bx(pr.lo)) * (1 - pt),
				barY,
				(bx(pr.mid) - bx(pr.lo)) * pt,
				barH,
			);
		// 프로브 마커 (위에서 낙하)
		const px = bx(pr.mid);
		const drop = ease(clamp01((t - T_INTRO - probeIdx * T_PROBE) / (T_PROBE * 0.35)));
		const py = barY - 26 + 26 * drop;
		ctx.strokeStyle = c.blue;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(px, py);
		ctx.lineTo(px, barY + barH);
		ctx.stroke();
		ctx.fillStyle = c.blue;
		ctx.beginPath();
		ctx.arc(px, py, 5, 0, Math.PI * 2);
		ctx.fill();
		// 프로브 결과 라벨 (좌우 잘림 방지)
		ctx.font = `600 ${fs}px ${FONT}`;
		ctx.fillStyle = c.blue;
		const cmp = pr.idm >= TARGET ? L.dropRight : L.dropLeft;
		const label = (w < 480 ? "" : L.readPrefix) + `id ${pr.idm.toLocaleString()} ${cmp}`;
		const tw = ctx.measureText(label).width;
		ctx.textAlign = "left";
		ctx.fillText(label, Math.max(m, Math.min(px + 10, w - m - tw)), barY - 12);
		const leftKB = Math.round((pr.hi - pr.lo) / 1024).toLocaleString();
		caption = (w < 480 ? L.cap2Narrow : L.cap2)(probeIdx + 1, PROBES.length, leftKB);
	} else if (t < T_PROBES_END + T_FETCH) {
		// ③ 최종 64KB 범위 요청
		const { lo, hi } = FINAL;
		ctx.fillStyle = `${c.sub}26`;
		ctx.beginPath();
		ctx.roundRect(barX, barY, barW, barH, 6);
		ctx.fill();
		const p = ease(clamp01((t - T_PROBES_END) / (T_FETCH * 0.5)));
		const cx = bx((lo + hi) / 2);
		ctx.fillStyle = c.green;
		const fw = Math.max(4, bx(hi) - bx(lo)) * p;
		ctx.fillRect(cx - fw / 2, barY, fw, barH);
		ctx.font = `600 ${fs}px ${FONT}`;
		ctx.fillStyle = c.green;
		ctx.textAlign = "center";
		ctx.fillText(L.found, Math.min(Math.max(cx, w * 0.25), w * 0.75), barY - 12);
		caption = L.cap3;
	} else {
		// ④ 요약: 전송량 비교 막대
		const p = ease(clamp01((t - T_PROBES_END - T_FETCH) / 900));
		ctx.fillStyle = `${c.sub}26`;
		ctx.beginPath();
		ctx.roundRect(barX, barY, barW, barH, 6);
		ctx.fill();
		const rows = [
			{ label: L.rowFull, val: "18MB", frac: 1, color: c.amber, fill: c.amberFill },
			{ label: L.rowBsearch, val: L.rowBsearchVal, frac: 0.02, color: c.green, fill: c.greenFill },
		];
		const rh = barH * 0.34;
		const gap = barH * 0.14;
		rows.forEach((r, i) => {
			const y = barY + gap + i * (rh + gap);
			ctx.fillStyle = r.fill;
			ctx.beginPath();
			ctx.roundRect(barX + 4, y, Math.max(6, (barW - 8) * r.frac * p), rh, 3);
			ctx.fill();
			ctx.font = `600 ${fs - 1}px ${FONT}`;
			ctx.fillStyle = r.color;
			ctx.textAlign = "left";
			ctx.fillText(`${r.label} — ${r.val}`, barX + 10, y + rh / 2 + (fs - 1) / 2 - 1);
		});
		caption = L.cap4;
	}

	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "center";
	ctx.fillText(caption, w / 2, h - 16);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function JsonlBsearchDemo({ lang = "ko" }: { lang?: Lang }) {
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

import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// posting 인덱스의 원리: 30개 일자 파일에 산재한 유저의 발송 건에서 위치 포인터만 뽑아
// user_id 정렬로 재배열하면 인덱스 파일의 연속 구간이 된다.
const N_FILES = 30;
const N_REC = 12;
// 유저의 발송 건 12개: 파일·파일 내 위치를 수식으로 고정 (매 사이클 동일)
const RECS = Array.from({ length: N_REC }, (_, i) => ({
	file: Math.min(N_FILES - 1, Math.floor((i * N_FILES) / N_REC) + ((i * 7) % 2)),
	pos: ((i * 37) % 89) / 89,
}));
// 인덱스에서 유저 posting 구간의 위치 (user_id 77,777 / 200,000 ≈ 39%)
const CLUSTER = 0.39;
const SLOT = 0.006;
// 인덱스 이진탐색 프로브 (target = CLUSTER, 창 2%)
type Probe = { mid: number; lo: number; hi: number; left: boolean };
const PROBES: Probe[] = [];
{
	let lo = 0;
	let hi = 1;
	while (hi - lo > 0.02 && PROBES.length < 5) {
		const mid = (lo + hi) / 2;
		PROBES.push({ mid, lo, hi, left: mid >= CLUSTER });
		if (mid < CLUSTER) lo = mid;
		else hi = mid;
	}
}

const T1 = 2200;
const T2 = 2800;
const T3 = PROBES.length * 550 + 500;
const T4 = 2600;
const T5 = 3200;
const E1 = T1;
const E2 = E1 + T2;
const E3 = E2 + T3;
const E4 = E3 + T4;
const CYCLE = E4 + T5;
const HEIGHT = 340;

const LABELS = {
	ko: {
		bodyNarrow: "본문 — 일자별 JSONL ×30",
		body: "본문 — 일자별 JSONL ×30 (590MB)",
		idxNarrow: "인덱스 — user_id 정렬 (66MB)",
		idx: "인덱스 — month.uidx, user_id 정렬 (66MB)",
		cap1Narrow: "① 유저 12건이 30개 파일에 산재",
		cap1: "① 유저 1명의 12건이 30개 파일에 산재 — 찾으려면 풀스캔 590MB",
		cap2Narrow: "② 포인터만 뽑아 정렬 — 산재가 연속이 된다",
		cap2: "② 위치 포인터만 뽑아 user_id 정렬로 재배열 — 산재가 연속 구간이 된다",
		cap3Narrow: (n: number) => `③ 인덱스를 Range 이진탐색 — 프로브 ${n}`,
		cap3: (n: number) => `③ 정렬된 인덱스 파일 자체를 Range 이진탐색 — 프로브 ${n}, 구간 발견`,
		cap4Narrow: "④ (일·offset·length)로 핀포인트 GET ×12 병렬",
		cap4: "④ 인덱스의 (일·offset·length)로 본문을 핀포인트 Range GET — 12건 병렬",
		rowFull: "풀스캔 — 590MB",
		rowIdx: "키값 이진탐색 — 175KB · 요청 24회 · 0.77s",
		rowIdxNarrow: "인덱스 — 175KB · 0.77s",
		cap5Narrow: "⑤ 전송 1/3,400 — 재배열이 인덱스다",
		cap5: "⑤ 전송 590MB → 175KB (1/3,400) — 포인터의 재배열이 곧 인덱스다",
		aria: "키값 이진탐색의 원리 애니메이션. 30개 일자 파일에 산재한 유저의 발송 건 12개에서 위치 포인터만 뽑아 user_id 정렬로 재배열하면 인덱스 파일에서 연속 구간이 되고, 그 인덱스를 Range 이진탐색한 뒤 본문을 핀포인트 GET 하여 전송량이 풀스캔의 1/3,400이 된다.",
	},
	en: {
		bodyNarrow: "data — daily JSONL ×30",
		body: "data — daily JSONL ×30 (590MB)",
		idxNarrow: "index — sorted by user_id (66MB)",
		idx: "index — month.uidx, sorted by user_id (66MB)",
		cap1Narrow: "① 12 user records scattered over 30 files",
		cap1: "① One user's 12 records scattered over 30 files — full scan reads 590MB",
		cap2Narrow: "② extract pointers, sort — scattered turns contiguous",
		cap2: "② Extract the position pointers, re-sort by user_id — scattered turns contiguous",
		cap3Narrow: (n: number) => `③ binary search the index via Range — probe ${n}`,
		cap3: (n: number) => `③ Binary search the sorted index file itself via Range — probe ${n}, run found`,
		cap4Narrow: "④ pinpoint GET ×12 parallel via (day·offset·length)",
		cap4: "④ Pinpoint Range GET on data via the index's (day·offset·length) — 12 in parallel",
		rowFull: "full scan — 590MB",
		rowIdx: "index binary search — 175KB · 24 requests · 0.77s",
		rowIdxNarrow: "index — 175KB · 0.77s",
		cap5Narrow: "⑤ 1/3,400 the transfer — rearrangement is the index",
		cap5: "⑤ 590MB → 175KB transferred (1/3,400) — rearranging pointers is the index",
		aria: "Animation of how index binary search works. One user's twelve records scattered across 30 daily files become a contiguous run in the index file once just their position pointers are extracted and re-sorted by user_id; a Range binary search over that index followed by pinpoint GETs on the data cuts the transfer to 1/3,400 of a full scan.",
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

	// 본문 스트립 (일자별 파일 30개), 인덱스 스트립
	const bodyY = h * 0.17;
	const bodyH = Math.max(24, h * 0.12);
	const idxY = h * 0.6;
	const idxH = Math.max(20, h * 0.1);
	const recX = (r: { file: number; pos: number }) => m + ((r.file + r.pos) / N_FILES) * bw;
	const slotX = (i: number) => m + (CLUSTER + i * SLOT) * bw;

	ctx.textBaseline = "alphabetic";
	ctx.font = `${fs - 1}px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "left";
	ctx.fillText(narrow ? L.bodyNarrow : L.body, m, bodyY - 8);
	ctx.fillText(narrow ? L.idxNarrow : L.idx, m, idxY - 8);

	// 본문 파일 30칸
	const seg = bw / N_FILES;
	for (let f = 0; f < N_FILES; f++) {
		ctx.fillStyle = c.boxFill;
		ctx.beginPath();
		ctx.roundRect(m + f * seg + 0.5, bodyY, seg - 1.5, bodyH, 2);
		ctx.fill();
	}
	// 인덱스 스트립
	ctx.fillStyle = c.boxFill;
	ctx.beginPath();
	ctx.roundRect(m, idxY, bw, idxH, 4);
	ctx.fill();
	ctx.strokeStyle = c.line;
	ctx.lineWidth = 1;
	ctx.stroke();

	let caption = "";

	if (t < E1) {
		// ① 산재 — 레코드 점들이 순차 등장하며 펄스
		const p = ease(clamp01(t / (T1 * 0.7)));
		RECS.forEach((r, i) => {
			if (i / N_REC > p) return;
			const pulse = 1 + 0.25 * Math.sin(t / 180 + i);
			ctx.fillStyle = c.blue;
			ctx.beginPath();
			ctx.arc(recX(r), bodyY + bodyH / 2, 4 * pulse, 0, Math.PI * 2);
			ctx.fill();
		});
		caption = narrow ? L.cap1Narrow : L.cap1;
	} else if (t < E2) {
		// ② 재배열 — 위치 포인터가 인덱스의 연속 구간으로 날아감
		const p = clamp01((t - E1) / T2);
		RECS.forEach((r, i) => {
			const fp = ease(clamp01((p - i * 0.04) / 0.55));
			ctx.fillStyle = fp > 0 ? `${c.blue}66` : c.blue;
			ctx.beginPath();
			ctx.arc(recX(r), bodyY + bodyH / 2, 4, 0, Math.PI * 2);
			ctx.fill();
			if (fp > 0) {
				const x = lerp(recX(r), slotX(i), fp);
				const y = lerp(bodyY + bodyH / 2, idxY + idxH / 2, fp) - Math.sin(fp * Math.PI) * h * 0.06;
				ctx.fillStyle = c.blue;
				ctx.beginPath();
				ctx.arc(x, y, 3.5, 0, Math.PI * 2);
				ctx.fill();
			}
		});
		caption = narrow ? L.cap2Narrow : L.cap2;
	} else {
		// 이후 단계 공통: 본문 점 흐림, 인덱스에 posting 클러스터 고정
		for (const r of RECS) {
			ctx.fillStyle = `${c.blue}55`;
			ctx.beginPath();
			ctx.arc(recX(r), bodyY + bodyH / 2, 4, 0, Math.PI * 2);
			ctx.fill();
		}
		const clW = N_REC * SLOT * bw + 4;
		const clX = slotX(0) - 2;

		if (t < E3) {
			// ③ 인덱스 위 이진탐색
			const pi = Math.min(PROBES.length - 1, Math.floor((t - E2) / 550));
			const pr = PROBES[pi];
			const pt = ease(clamp01(((t - E2) % 550) / 330));
			ctx.fillStyle = `${c.sub}26`;
			if (pr.lo > 0) ctx.fillRect(m, idxY, pr.lo * bw, idxH);
			if (pr.hi < 1) ctx.fillRect(m + pr.hi * bw, idxY, (1 - pr.hi) * bw, idxH);
			ctx.fillStyle = `${c.sub}44`;
			if (pr.left) ctx.fillRect(m + pr.mid * bw, idxY, (pr.hi - pr.mid) * bw * pt, idxH);
			else
				ctx.fillRect(
					m + (pr.lo + (pr.mid - pr.lo) * (1 - pt)) * bw,
					idxY,
					(pr.mid - pr.lo) * bw * pt,
					idxH,
				);
			ctx.fillStyle = c.blue;
			ctx.beginPath();
			ctx.roundRect(clX, idxY + 2, clW, idxH - 4, 2);
			ctx.fill();
			const px = m + pr.mid * bw; // 마커는 스트립 아래 (위쪽 라벨과 겹침 방지)
			ctx.strokeStyle = c.blue;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(px, idxY);
			ctx.lineTo(px, idxY + idxH + 14);
			ctx.stroke();
			ctx.fillStyle = c.blue;
			ctx.beginPath();
			ctx.arc(px, idxY + idxH + 14, 4.5, 0, Math.PI * 2);
			ctx.fill();
			caption = (narrow ? L.cap3Narrow : L.cap3)(pi + 1);
		} else if (t < E4) {
			// ④ 핀포인트 GET — posting에서 본문 정확한 바이트로 병렬 연결
			ctx.fillStyle = `${c.sub}26`;
			ctx.fillRect(m, idxY, bw, idxH);
			ctx.fillStyle = c.blue;
			ctx.beginPath();
			ctx.roundRect(clX, idxY + 2, clW, idxH - 4, 2);
			ctx.fill();
			const p = clamp01((t - E3) / (T4 * 0.85));
			RECS.forEach((r, i) => {
				const lp = ease(clamp01((p - i * 0.05) / 0.4));
				if (lp <= 0) return;
				const x0 = slotX(i);
				const y0 = idxY;
				const x1 = recX(r);
				const y1 = bodyY + bodyH;
				ctx.strokeStyle = c.green;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(x0, y0);
				ctx.lineTo(lerp(x0, x1, lp), lerp(y0, y1, lp));
				ctx.stroke();
				if (lp >= 1) {
					ctx.fillStyle = c.green;
					ctx.beginPath();
					ctx.arc(x1, bodyY + bodyH / 2, 4.5, 0, Math.PI * 2);
					ctx.fill();
				}
			});
			caption = narrow ? L.cap4Narrow : L.cap4;
		} else {
			// ⑤ 요약 — 전송량 비교
			ctx.fillStyle = `${c.sub}26`;
			ctx.fillRect(m, idxY, bw, idxH);
			ctx.fillStyle = c.green;
			ctx.beginPath();
			ctx.roundRect(clX, idxY + 2, clW, idxH - 4, 2);
			ctx.fill();
			const p = ease(clamp01((t - E4) / 900));
			const rows = [
				{ label: L.rowFull, frac: 1, color: c.amber, fill: c.amberFill },
				{
					label: L.rowIdx,
					frac: 0.02,
					color: c.green,
					fill: c.greenFill,
				},
			];
			const midY = (bodyY + bodyH + idxY) / 2 - h * 0.075;
			const rh = h * 0.055;
			const gap = h * 0.03;
			rows.forEach((r, i) => {
				const y = midY + i * (rh + gap);
				ctx.fillStyle = r.fill;
				ctx.beginPath();
				ctx.roundRect(m, y, Math.max(6, bw * r.frac * p), rh, 3);
				ctx.fill();
				ctx.font = `600 ${fs - 1}px ${FONT}`;
				ctx.fillStyle = r.color;
				ctx.textAlign = "left";
				ctx.fillText(
					narrow && i === 1 ? L.rowIdxNarrow : r.label,
					m + 8,
					y + rh / 2 + (fs - 1) / 2 - 1,
				);
			});
			caption = narrow ? L.cap5Narrow : L.cap5;
		}
	}

	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "center";
	ctx.fillText(caption, w / 2, h - 16);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function PostingIndexDemo({ lang = "ko" }: { lang?: Lang }) {
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

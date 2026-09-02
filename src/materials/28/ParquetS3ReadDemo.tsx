import { clamp01, ease, FONT, palette, useCanvasScene } from "@/materials/shared";

// Parquet S3 조회: LIST → footer 병렬 1왕복 → min/max 프루닝 → 필요한 청크만 병렬 2왕복째.
const N_FILES = 30;
// 유저의 건이 들어 있는 파일과 row group 위치 (posting 데모와 동일한 12개 지점)
const HITS = Array.from({ length: 12 }, (_, i) => ({
	file: Math.min(N_FILES - 1, Math.floor((i * N_FILES) / 12) + ((i * 7) % 2)),
	pos: ((i * 37) % 89) / 89,
}));
const HIT_FILES = new Set(HITS.map((hp) => hp.file));

const T1 = 2000;
const T2 = 2300;
const T3 = 2300;
const T4 = 2300;
const E1 = T1;
const E2 = E1 + T2;
const E3 = E2 + T3;
const E4 = E3 + T4;
const CYCLE = E4 + 1600; // ④ 완료 상태 홀드 후 루프
const HEIGHT = 340;

const LABELS = {
	ko: {
		head: "parquet — dt= 일자별 파티션 ×30 (192MB) · 파일 끝 = footer(메타데이터)",
		headNarrow: "parquet 일자별 ×30 (192MB)",
		captions: [
			"① 유저 X 조회 시작 — LIST 1왕복으로 30개 파일 목록 확보",
			"② footer 30개를 병렬로 읽음 — 위치가 파일 끝으로 약속돼 검색 불필요 (왕복 1파)",
			"③ footer의 min/max 통계로 필요한 row group만 선별 — 프루닝 (요청 0회)",
			"④ 선별된 컬럼 청크만 병렬로 읽음 — 왕복 2파째에서 조회 완료",
		],
		captionsNarrow: [
			"① LIST 1왕복 — 파일 목록 확보",
			"② footer 30개 병렬 읽기 — 1왕복",
			"③ min/max 통계로 row group 선별",
			"④ 필요 청크만 병렬 GET — 2왕복째",
		],
		aria: "Parquet의 S3 조회 과정 애니메이션. 30개 파일의 footer를 병렬 1왕복으로 읽고, footer의 통계로 필요한 row group만 선별한 뒤, 컬럼 청크를 병렬 2왕복째에 읽는다.",
	},
	en: {
		head: "parquet — dt= daily partitions ×30 (192MB) · file tail = footer (metadata)",
		headNarrow: "parquet daily ×30 (192MB)",
		captions: [
			"① Query for user X starts — one LIST round trip gets the 30-file list",
			"② footers ×30 in parallel — fixed tail position, no search (round trip 1)",
			"③ footer min/max stats pick only the needed row groups — pruning (0 requests)",
			"④ only the chosen column chunks in parallel — query done at round trip 2",
		],
		captionsNarrow: [
			"① LIST 1 round trip — file list",
			"② 30 footers in parallel — 1 round trip",
			"③ min/max stats pick row groups",
			"④ needed chunks, parallel GET — round trip 2",
		],
		aria: "Animation of Parquet's S3 read path. One parallel round trip reads the footers of all 30 files, the footer's statistics pick only the needed row groups, and a second parallel round trip reads just those column chunks.",
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

	const fileY = h * 0.17;
	const fileH = Math.max(34, h * 0.19);
	const footH = Math.max(5, fileH * 0.2); // 각 파일 하단 = footer
	const seg = bw / N_FILES;
	const fileX = (f: number) => m + f * seg;

	ctx.textBaseline = "alphabetic";
	ctx.font = `${fs - 1}px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "left";
	ctx.fillText(narrow ? L.headNarrow : L.head, m, fileY - 8);

	// 파일 30칸 + footer 밴드
	for (let f = 0; f < N_FILES; f++) {
		ctx.fillStyle = c.boxFill;
		ctx.beginPath();
		ctx.roundRect(fileX(f) + 0.5, fileY, seg - 1.5, fileH, 2);
		ctx.fill();
		ctx.fillStyle = `${c.sub}55`;
		ctx.fillRect(fileX(f) + 0.5, fileY + fileH - footH, seg - 1.5, footH);
	}

	let caption = "";

	if (t < E1) {
		// ① LIST — 파일 목록 확보 (스트립 위를 스윕)
		const p = ease(clamp01(t / (T1 * 0.8)));
		ctx.strokeStyle = c.blue;
		ctx.lineWidth = 2;
		ctx.strokeRect(m - 3, fileY - 3, (bw + 6) * p, fileH + 6);
		caption = narrow ? L.captionsNarrow[0] : L.captions[0];
	} else if (t < E2) {
		// ② footer 병렬 1파 — 30개 꼬리에 동시 낙하 (위치가 규약: 검색 불필요)
		const p = clamp01((t - E1) / (T2 * 0.75));
		for (let f = 0; f < N_FILES; f++) {
			const fp = ease(clamp01((p - (f % 5) * 0.02) / 0.6));
			if (fp <= 0) continue;
			const x = fileX(f) + seg / 2;
			const y0 = fileY - 18;
			const y1 = fileY + fileH - footH / 2;
			const y = y0 + (y1 - y0) * fp;
			ctx.fillStyle = c.blue;
			ctx.beginPath();
			ctx.arc(x, y, 2.5, 0, Math.PI * 2);
			ctx.fill();
			if (fp >= 1) {
				ctx.fillStyle = c.blue;
				ctx.fillRect(fileX(f) + 0.5, fileY + fileH - footH, seg - 1.5, footH);
			}
		}
		caption = narrow ? L.captionsNarrow[1] : L.captions[1];
	} else {
		// 이후 공통: footer 완료 표시
		for (let f = 0; f < N_FILES; f++) {
			ctx.fillStyle = `${c.blue}88`;
			ctx.fillRect(fileX(f) + 0.5, fileY + fileH - footH, seg - 1.5, footH);
		}

		if (t < E3) {
			// ③ 프루닝 — 통계로 필요 row group만 선별, 나머지 어두워짐
			const p = ease(clamp01((t - E2) / (T3 * 0.7)));
			for (let f = 0; f < N_FILES; f++) {
				if (!HIT_FILES.has(f)) {
					ctx.fillStyle =
						c.sub +
						Math.round(p * 64)
							.toString(16)
							.padStart(2, "0");
					ctx.fillRect(fileX(f) + 0.5, fileY, seg - 1.5, fileH - footH);
				}
			}
			for (const hp of HITS) {
				const rgY = fileY + hp.pos * (fileH - footH - 8);
				ctx.fillStyle = c.blue;
				ctx.fillRect(fileX(hp.file) + 1.5, rgY, seg - 3.5, 7);
			}
			caption = narrow ? L.captionsNarrow[2] : L.captions[2];
		} else {
			// ④ 데이터 병렬 2파째 — 선별된 청크만 GET
			for (let f = 0; f < N_FILES; f++) {
				if (!HIT_FILES.has(f)) {
					ctx.fillStyle = `${c.sub}40`;
					ctx.fillRect(fileX(f) + 0.5, fileY, seg - 1.5, fileH - footH);
				}
			}
			const p = clamp01((t - E3) / (T4 * 0.7));
			HITS.forEach((hp, i) => {
				const fp = ease(clamp01((p - (i % 4) * 0.03) / 0.55));
				const rgY = fileY + hp.pos * (fileH - footH - 8);
				ctx.fillStyle = fp >= 1 ? c.green : c.blue;
				ctx.fillRect(fileX(hp.file) + 1.5, rgY, seg - 3.5, 7);
				if (fp > 0 && fp < 1) {
					const x = fileX(hp.file) + seg / 2;
					ctx.fillStyle = c.green;
					ctx.beginPath();
					ctx.arc(x, fileY - 18 + (rgY - fileY + 18) * fp, 2.5, 0, Math.PI * 2);
					ctx.fill();
				}
			});
			caption = narrow ? L.captionsNarrow[3] : L.captions[3];
		}
	}

	// 하단 캡션
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "center";
	ctx.fillText(caption, w / 2, h - 16);
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function ParquetS3ReadDemo({ lang = "ko" }: { lang?: Lang }) {
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

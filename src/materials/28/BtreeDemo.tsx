import { clamp01, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// B-tree 동작: 조회 하강, 제자리 삽입, 페이지 분할, 연속 삽입의 랜덤 I/O.
const T1 = 2200;
const T2 = 2400;
const T3 = 2400;
const T4 = 3200;
const T5 = 2800;
const E1 = T1;
const E2 = E1 + T2;
const E3 = E2 + T3;
const E4 = E3 + T4;
const CYCLE = E4 + T5;
const HEIGHT = 320;

// 리프 배치: 분할 전 4페이지 / 후 5페이지 (x는 폭 비율)
const FR4 = [0.14, 0.38, 0.62, 0.86];
const FR5 = [0.1, 0.3, 0.5, 0.7, 0.9];

const LABELS = {
	ko: {
		root: "루트 (페이지 1장)",
		leaves: "리프 페이지 — 노드 = 디스크 페이지",
		s1: ["① 넓고 얕은 트리 — 깊이 3~4단", "① 노드 = 디스크 페이지, 팬아웃 수백 → 수억 건도 깊이 3~4단"],
		s2: ["② 조회 50: 루트→리프 한 경로", "② 조회 50: 루트에서 비교해 한 경로로 하강 — 위치는 정확히 한 곳"],
		s3: ["③ 삽입 58: 리프 제자리 수정", "③ 삽입 58: 자리 있는 리프면 그 페이지만 제자리 수정"],
		s4a: ["④ 삽입 27: 페이지가 꽉 참!", "④ 삽입 27: 대상 리프가 꽉 찼다 — 분할 시작"],
		s4b: ["④ 분할: 절반 이동 + 33이 루트로", "④ 분할: 키 절반이 새 페이지로, 경계 키 33이 루트로 올라간다"],
		s4c: ["④ 분할 후 27 삽입 완료", "④ 분할이 끝나야 27이 들어간다 — 부모가 꽉 찼다면 분할이 연쇄됐을 것"],
		s5: ["⑤ 연속 삽입 = 흩어진 페이지 쓰기", "⑤ 키 값이 위치를 정한다 — 연속 삽입이 디스크 여기저기를 찍는 랜덤 I/O"],
		aria: "B-tree 동작 애니메이션. 루트와 리프 페이지로 된 넓고 얕은 트리에서 조회가 한 경로로 내려가고, 삽입은 리프를 제자리 수정하며, 페이지가 꽉 차면 분할이 일어나 부모에 키가 올라가고, 연속 삽입이 디스크 여기저기를 찍는 랜덤 I/O가 됨을 보여준다.",
	},
	en: {
		root: "root (one page)",
		leaves: "leaf pages — node = disk page",
		s1: ["① Wide, shallow tree — depth 3–4", "① Node = disk page, fan-out in the hundreds → 100M+ rows in depth 3–4"],
		s2: ["② Lookup 50: one path, root → leaf", "② Lookup 50: compare at the root, descend one path — exactly one location"],
		s3: ["③ Insert 58: in-place leaf edit", "③ Insert 58: a leaf with room gets an in-place edit of that page only"],
		s4a: ["④ Insert 27: the page is full!", "④ Insert 27: the target leaf is full — split begins"],
		s4b: ["④ Split: half moves + 33 to root", "④ Split: half the keys move to a new page, boundary key 33 goes up to the root"],
		s4c: ["④ After the split, 27 goes in", "④ 27 fits only after the split — a full parent would have cascaded the split"],
		s5: ["⑤ Consecutive inserts = scattered writes", "⑤ The key decides the location — consecutive inserts become random I/O across the disk"],
		aria: "Animation of B-tree operations. In a wide, shallow tree of a root and leaf pages, a lookup descends along one path, an insert edits a leaf in place, a full page splits and pushes a key up to the parent, and consecutive inserts become random I/O that touches pages all over the disk.",
	},
} as const;
type Lang = keyof typeof LABELS;

type Leaf = { k: (number | string)[]; f: number; born?: number };

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const h = HEIGHT;
	const fs = Math.max(10, Math.min(13, w / 50));
	const narrow = w < 480;
	ctx.textBaseline = "middle";

	const rootY = h * 0.13;
	const rootH = Math.max(24, h * 0.1);
	const leafY = h * 0.52;
	const leafH = Math.max(26, h * 0.11);

	// 분할 진행도 (step4 내부 0.25~0.6 구간)
	let sp = 0;
	if (t >= E3) sp = t < E4 ? ease(clamp01(((t - E3) / T4 - 0.25) / 0.35)) : 1;

	// 상태
	const rootKeys = sp > 0.5 ? [17, 33, 42, 71] : [17, 42, 71];
	const p4 = t < E4 ? clamp01((t - E3) / T4) : 1;
	const bKeys =
		t >= E3 && p4 >= 0.75 ? [21, 25, 27] : sp > 0.5 ? [21, 25] : [21, 25, 33, 38];
	const cKeys =
		t >= E2 && (t < E3 ? clamp01((t - E2) / T3) : 1) >= 0.6 ? [45, 50, 58, 61] : [45, 50, 61];
	let leaves: Leaf[];
	if (sp <= 0) {
		leaves = [
			{ k: [3, 9, 12], f: FR4[0] },
			{ k: bKeys, f: FR4[1] },
			{ k: cKeys, f: FR4[2] },
			{ k: [77, 85, 90], f: FR4[3] },
		];
	} else {
		leaves = [
			{ k: [3, 9, 12], f: lerp(FR4[0], FR5[0], sp) },
			{ k: bKeys, f: lerp(FR4[1], FR5[1], sp) },
			{ k: sp > 0.5 ? [33, 38] : [], f: FR5[2], born: sp }, // 분할로 태어난 페이지
			{ k: cKeys, f: lerp(FR4[2], FR5[3], sp) },
			{ k: [77, 85, 90], f: lerp(FR4[3], FR5[4], sp) },
		];
	}

	const slotW = Math.max(17, Math.min(26, w / 30));
	const pageW = (keys: (number | string)[]) =>
		Math.max(2, keys.length + (keys.length < 4 ? 1 : 0)) * slotW + 8;

	const drawPage = (cx: number, y: number, keys: (number | string)[], hi: number, hiColor: string) => {
		const pw = pageW(keys);
		ctx.fillStyle = c.boxFill;
		ctx.beginPath();
		ctx.roundRect(cx - pw / 2, y, pw, leafH, 5);
		ctx.fill();
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1;
		ctx.stroke();
		keys.forEach((k, i) => {
			const x = cx - pw / 2 + 4 + i * slotW;
			if (hi === i) {
				ctx.fillStyle = hiColor;
				ctx.beginPath();
				ctx.roundRect(x, y + 3, slotW - 2, leafH - 6, 3);
				ctx.fill();
			}
			ctx.fillStyle = hi === i ? "#fff" : c.text;
			ctx.font = `600 ${fs}px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText(String(k), x + (slotW - 2) / 2, y + leafH / 2);
		});
		return pw;
	};
	const edge = (x1: number, x2: number, hi: boolean) => {
		ctx.strokeStyle = hi ? c.blue : c.line;
		ctx.lineWidth = hi ? 2 : 1;
		ctx.beginPath();
		ctx.moveTo(x1, rootY + rootH);
		ctx.lineTo(x2, leafY);
		ctx.stroke();
	};

	// 라벨
	ctx.font = `${fs - 1}px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.textAlign = "left";
	ctx.fillText(L.root, 8, rootY - fs);
	ctx.fillText(L.leaves, 8, leafY - fs);

	// 간선
	let caption = "";
	let hiLeaf = -1;
	if (t >= E1 && t < E2) hiLeaf = leaves.length === 4 ? 2 : 3; // 조회 50 → C
	if (t >= E2 && t < E3) hiLeaf = leaves.length === 4 ? 2 : 3; // 삽입 58 → C
	if (t >= E3 && t < E4) hiLeaf = 1; // 삽입 27 → B
	leaves.forEach((lf, i) => edge(w / 2, lf.f * w, i === hiLeaf && t >= E1 && t < E4));

	// 루트
	drawPage(w / 2, rootY, rootKeys, sp > 0.5 && sp < 1 ? 1 : -1, c.green);

	// 리프
	leaves.forEach((lf, i) => {
		let hi = -1;
		let color = c.blue;
		if (t >= E1 && t < E2 && i === hiLeaf) hi = 1; // 50
		if (t >= E2 && t < E3 && i === hiLeaf && lf.k.length === 4) {
			hi = 2;
			color = c.green;
		} // 58
		if (t >= E3 && t < E4 && p4 >= 0.75 && i === 1) {
			hi = 2;
			color = c.green;
		} // 27
		ctx.globalAlpha = lf.born !== undefined ? clamp01((lf.born - 0.5) * 4) : 1;
		drawPage(lf.f * w, leafY, lf.k, hi, color);
		ctx.globalAlpha = 1;
	});

	if (t < E1) {
		caption = narrow ? L.s1[0] : L.s1[1];
	} else if (t < E2) {
		const p = ease(clamp01((t - E1) / (T2 * 0.6)));
		const tx = lerp(w / 2, leaves[hiLeaf].f * w, p);
		const ty = lerp(rootY + rootH / 2, leafY - 12, p);
		ctx.fillStyle = c.blue;
		ctx.beginPath();
		ctx.arc(tx, ty, 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#fff";
		ctx.font = `600 ${fs - 2}px ${FONT}`;
		ctx.textAlign = "center";
		ctx.fillText("50", tx, ty);
		caption = narrow ? L.s2[0] : L.s2[1];
	} else if (t < E3) {
		const p = clamp01((t - E2) / T3);
		if (p < 0.6) {
			const q = ease(p / 0.6);
			const tx = lerp(w / 2, leaves[hiLeaf].f * w, q);
			const ty = lerp(rootY - 20, leafY - 12, q);
			ctx.fillStyle = c.green;
			ctx.beginPath();
			ctx.arc(tx, ty, 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.font = `600 ${fs - 2}px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText("58", tx, ty);
		}
		caption = narrow ? L.s3[0] : L.s3[1];
	} else if (t < E4) {
		const p = p4;
		if (p < 0.25) {
			const q = ease(p / 0.25);
			const tx = lerp(w / 2, leaves[1].f * w, q);
			const ty = lerp(rootY - 20, leafY - 14, q);
			ctx.fillStyle = c.amber;
			ctx.beginPath();
			ctx.arc(tx, ty, 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.font = `600 ${fs - 2}px ${FONT}`;
			ctx.textAlign = "center";
			ctx.fillText("27", tx, ty);
			// 꽉 찬 페이지 경고 테두리
			const bx = leaves[1].f * w;
			const pw = pageW(leaves[1].k);
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 2;
			ctx.strokeRect(bx - pw / 2 - 2, leafY - 2, pw + 4, leafH + 4);
			caption = narrow ? L.s4a[0] : L.s4a[1];
		} else if (p < 0.75) {
			caption = narrow ? L.s4b[0] : L.s4b[1];
		} else {
			caption = narrow ? L.s4c[0] : L.s4c[1];
		}
	} else {
		// ⑤ 랜덤 I/O — 연속 삽입이 흩어진 페이지를 찍음
		const p = clamp01((t - E4) / (T5 * 0.85));
		const drops = [
			{ key: 5, leaf: 0 },
			{ key: 88, leaf: 4 },
			{ key: 46, leaf: 3 },
		];
		drops.forEach((d, i) => {
			const dp = ease(clamp01((p - i * 0.28) / 0.26));
			if (dp <= 0) return;
			const lf = leaves[d.leaf];
			if (dp < 1) {
				// 착지 후에는 write 표시만 남긴다
				const tx = lerp(w / 2, lf.f * w, dp);
				const ty = lerp(rootY - 20, leafY - 12, dp);
				ctx.fillStyle = c.amber;
				ctx.beginPath();
				ctx.arc(tx, ty, 6, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#fff";
				ctx.font = `600 ${fs - 2}px ${FONT}`;
				ctx.textAlign = "center";
				ctx.fillText(String(d.key), tx, ty);
			}
			if (dp >= 1) {
				const pw = pageW(lf.k);
				ctx.strokeStyle = c.amber;
				ctx.lineWidth = 2;
				ctx.strokeRect(lf.f * w - pw / 2 - 2, leafY - 2, pw + 4, leafH + 4);
				ctx.font = `600 ${fs - 1}px ${FONT}`;
				ctx.fillStyle = c.amber;
				ctx.textAlign = "center";
				ctx.fillText("write", lf.f * w, leafY + leafH + fs);
			}
		});
		caption = narrow ? L.s5[0] : L.s5[1];
	}

	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(caption, w / 2, h - 14);
	ctx.textBaseline = "middle";
	};
}

const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function BtreeDemo({ lang = "ko" }: { lang?: Lang }) {
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

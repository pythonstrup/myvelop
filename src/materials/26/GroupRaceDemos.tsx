import { type Colors, clamp01, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 그룹 발송의 경합 지점별 미니 시퀀스 — 생성 경합(SET NX) · 발송 트리거 경합(jobId dedupe) ·
// 재발송 방어(결말 마커 + 상태 게이트) · 재적재(쓰기 순서) · 리포트(SET NX 게이트) ·
// 세대 롤오버(SET NX 선점 + HINCRBY 판정), 그리고 막지 못한 창을 받아내는 하트비트 감시.
// 한 데모 = 장면 하나, 30초 안팎의 짧은 사이클로 반복한다.
const HEIGHT = 320;
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

type Lang = "ko" | "en";
type NodeBox = { cx: number; cy: number; hw: number; hh: number };
type MsgColor = "blue" | "amber" | "green" | "red" | "sub";
type Msg = {
	act: number;
	p0: number;
	p1: number;
	from: string;
	to: string;
	label: string;
	c: MsgColor;
	/** 도착 지점에서 X 로 사라진다(dedupe 흡수). */
	absorb?: boolean;
	/** 이 진행률에서 pill 이 소실된다(응답 유실). */
	lostAt?: number;
};

function edge(a: NodeBox, b: NodeBox, pad: number) {
	const dx = b.cx - a.cx || 1e-9;
	const dy = b.cy - a.cy || 1e-9;
	const s = Math.min(a.hw / Math.abs(dx), a.hh / Math.abs(dy));
	const k = s + pad / Math.hypot(dx, dy);
	return { x: a.cx + dx * k, y: a.cy + dy * k };
}

function drawPanelBox(ctx: CanvasRenderingContext2D, box: NodeBox, title: string, c: Colors, dark: boolean) {
	ctx.beginPath();
	ctx.roundRect(box.cx - box.hw, box.cy - box.hh, box.hw * 2, box.hh * 2, 10);
	ctx.fillStyle = dark ? "rgba(255,255,255,0.03)" : "#fcfcfd";
	ctx.fill();
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `700 11px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(title, box.cx - box.hw + 10, box.cy - box.hh + 13);
}

function drawWorkerBox(
	ctx: CanvasRenderingContext2D,
	box: NodeBox,
	title: string,
	sub: string,
	color: string,
	c: Colors,
) {
	ctx.beginPath();
	ctx.roundRect(box.cx - box.hw, box.cy - box.hh, box.hw * 2, box.hh * 2, 9);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `700 12.5px ${FONT}`;
	ctx.fillText(title, box.cx, box.cy - 9);
	ctx.fillStyle = c.sub;
	ctx.font = `400 10.5px ${FONT}`;
	ctx.fillText(sub, box.cx, box.cy + 9);
}

function drawChipAt(
	ctx: CanvasRenderingContext2D,
	xRight: number,
	y: number,
	label: string,
	fill: string,
	color: string,
) {
	ctx.font = `600 9.5px ${FONT}`;
	const cw = ctx.measureText(label).width + 10;
	ctx.beginPath();
	ctx.roundRect(xRight - cw, y - 8, cw, 16, 8);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, xRight - cw / 2, y + 0.5);
}

function drawXMark(ctx: CanvasRenderingContext2D, x: number, y: number, c: Colors, alpha: number) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = c.red;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(x - 5, y - 5);
	ctx.lineTo(x + 5, y + 5);
	ctx.moveTo(x + 5, y - 5);
	ctx.lineTo(x - 5, y + 5);
	ctx.stroke();
	ctx.restore();
}

function drawMsgs(
	ctx: CanvasRenderingContext2D,
	msgs: readonly Msg[],
	boxes: Record<string, NodeBox>,
	act: number,
	p: number,
	c: Colors,
	dark: boolean,
) {
	for (const m of msgs) {
		if (m.act !== act) continue;
		const q = clamp01((p - m.p0) / (m.p1 - m.p0));
		if (q <= 0) continue;
		const a = edge(boxes[m.from], boxes[m.to], 6);
		const b = edge(boxes[m.to], boxes[m.from], 6);
		const color = m.c === "sub" ? c.sub : c[m.c];

		// 응답 유실 — 소실 지점에서 X 만 남긴다.
		if (m.lostAt !== undefined && q >= m.lostAt) {
			const lx = lerp(a.x, b.x, m.lostAt);
			const ly = lerp(a.y, b.y, m.lostAt);
			drawXMark(ctx, lx, ly, c, 1 - clamp01((q - m.lostAt) / 0.4));
			continue;
		}
		if (q < 1) {
			ctx.save();
			ctx.globalAlpha = 0.35;
			ctx.strokeStyle = color;
			ctx.setLineDash([3, 4]);
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
			ctx.stroke();
			ctx.restore();

			const x = lerp(a.x, b.x, q);
			const y = lerp(a.y, b.y, q);
			ctx.font = `600 10px ${MONO}`;
			const pw = ctx.measureText(m.label).width + 12;
			ctx.beginPath();
			ctx.roundRect(x - pw / 2, y - 9, pw, 18, 9);
			ctx.fillStyle = dark ? "rgba(20,24,30,0.92)" : "rgba(255,255,255,0.95)";
			ctx.fill();
			ctx.strokeStyle = color;
			ctx.lineWidth = 1.2;
			ctx.stroke();
			ctx.fillStyle = color;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(m.label, x, y + 0.5);
		} else if (m.absorb === true) {
			drawXMark(ctx, b.x, b.y, c, 1 - clamp01((p - m.p1) / 0.15));
		}
	}
}

function drawCaptions(
	ctx: CanvasRenderingContext2D,
	w: number,
	lines: readonly [string, string],
	c: Colors,
) {
	const compact = w < 560;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `600 ${compact ? 11 : 12.5}px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(lines[0], w / 2, HEIGHT - 34);
	ctx.font = `400 ${compact ? 10.5 : 11.5}px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(lines[1], w / 2, HEIGHT - 16);
}

function actOf(t: number, start: readonly number[], dur: readonly number[]) {
	const act = start.findIndex((s0, i) => t < s0 + dur[i]);
	return { act, p: ease((t - start[act]) / dur[act]) };
}

const starts = (dur: readonly number[]) =>
	dur.reduce<number[]>((acc, _, i) => {
		acc.push(i === 0 ? 0 : acc[i - 1] + dur[i - 1]);
		return acc;
	}, []);

/** 그룹 카드 하나를 그린다(서드파티 패널 내부). */
function drawGroupCard(
	ctx: CanvasRenderingContext2D,
	box: NodeBox,
	slot: number,
	id: string,
	sub: string,
	status: string,
	c: Colors,
	opts: { dying?: boolean; sent?: boolean } = {},
) {
	const gy = box.cy - box.hh + 44 + slot * 58;
	ctx.save();
	ctx.globalAlpha = opts.dying === true ? 0.35 : 1;
	ctx.beginPath();
	ctx.roundRect(box.cx - box.hw + 8, gy - 20, box.hw * 2 - 16, 46, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = opts.sent === true ? c.green : opts.dying === true ? c.red : c.boxStroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `700 11.5px ${MONO}`;
	ctx.fillStyle = c.text;
	ctx.fillText(id, box.cx - box.hw + 18, gy - 6);
	ctx.font = `400 10px ${FONT}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(sub, box.cx - box.hw + 18, gy + 11);
	drawChipAt(
		ctx,
		box.cx + box.hw - 16,
		gy + 8,
		status,
		opts.sent === true ? c.greenFill : c.boxFill,
		opts.sent === true ? c.green : c.sub,
	);
	if (opts.dying === true) drawXMark(ctx, box.cx + box.hw - 26, gy - 8, c, 1);
	ctx.restore();
}

/** Redis 패널의 key = value 행. */
function drawRedisRow(
	ctx: CanvasRenderingContext2D,
	box: NodeBox,
	slot: number,
	key: string,
	value: string,
	c: Colors,
) {
	const y = box.cy - box.hh + 36 + slot * 22;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `600 10.5px ${MONO}`;
	ctx.fillStyle = c.green;
	ctx.fillText(key, box.cx - box.hw + 10, y);
	const kw = ctx.measureText(key).width;
	ctx.font = `400 10.5px ${MONO}`;
	ctx.fillStyle = c.text;
	ctx.fillText(`= ${value}`, box.cx - box.hw + 10 + kw + 12, y);
}

function drawRedisEmpty(ctx: CanvasRenderingContext2D, box: NodeBox, label: string, c: Colors) {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `400 10.5px ${MONO}`;
	ctx.fillStyle = c.sub;
	ctx.fillText(label, box.cx - box.hw + 10, box.cy - box.hh + 36);
}

// ─────────────────────────────────────────────────────────────────────
// ① 생성 경합 — 둘 다 그룹을 만들지만 SET NX 승자는 하나
// ─────────────────────────────────────────────────────────────────────

const CREATE_DUR = [9000, 10000, 9000] as const;
const CREATE_START = starts(CREATE_DUR);
const CREATE_CYCLE = CREATE_START[2] + CREATE_DUR[2];

const CREATE_LABELS = {
	ko: {
		captions: [
			["① 두 워커가 동시에 그룹을 만든다", "서드파티엔 그룹이 둘 — 아직 어느 쪽도 틀리지 않았다"],
			["② Redis SET NX — 먼저 쓴 쪽만 성공한다", "id = G-1 이 남고, G-2 의 쓰기는 (nil)로 거절된다"],
			["③ 패자는 자기가 만든 빈 그룹을 지운다", "한 묶음에 그룹은 하나 — 이후 모든 적재는 G-1 로 간다"],
		],
		w1sub: ["createGroup 호출", "SET NX 시도", "적재 계속"],
		w2sub: ["createGroup 호출", "SET NX 시도", "빈 그룹 정리"],
		worker: ["워커 1", "워커 2"],
		panels: ["Redis · 그룹 상태 키", "서드파티 · 그룹 API"],
		empty: "(비어 있음)",
		count0: "0건",
		aria: "두 워커가 동시에 서드파티 그룹을 만들어 G-1 과 G-2 가 생기지만, Redis SET NX 에 먼저 쓴 워커 1 의 G-1 만 남고 워커 2 는 (nil)을 받아 자기가 만든 빈 그룹 G-2 를 지우는 세 장면의 애니메이션.",
	},
	en: {
		captions: [
			["① Two workers create a group at the same time", "the third party now holds two groups — neither is wrong yet"],
			["② Redis SET NX — only the first write wins", "id = G-1 sticks; the G-2 write is rejected with (nil)"],
			["③ The loser deletes its own empty group", "one batch, one group — every stage call goes to G-1 from here"],
		],
		w1sub: ["calling createGroup", "trying SET NX", "staging on"],
		w2sub: ["calling createGroup", "trying SET NX", "cleaning up"],
		worker: ["worker 1", "worker 2"],
		panels: ["Redis · group state keys", "third party · group API"],
		empty: "(empty)",
		count0: "0",
		aria: "Two workers create third-party groups G-1 and G-2 simultaneously; the first SET NX write keeps G-1, the second gets nil, and the loser deletes its own empty group.",
	},
} as const;

const CREATE_MSGS: readonly Msg[] = [
	{ act: 0, p0: 0.05, p1: 0.35, from: "w1", to: "s", label: "createGroup", c: "blue" },
	{ act: 0, p0: 0.4, p1: 0.62, from: "s", to: "w1", label: "G-1", c: "green" },
	{ act: 0, p0: 0.2, p1: 0.5, from: "w2", to: "s", label: "createGroup", c: "amber" },
	{ act: 0, p0: 0.56, p1: 0.78, from: "s", to: "w2", label: "G-2", c: "green" },
	{ act: 1, p0: 0.05, p1: 0.3, from: "w1", to: "r", label: "SET id=G-1 NX", c: "blue" },
	{ act: 1, p0: 0.33, p1: 0.5, from: "r", to: "w1", label: "OK", c: "green" },
	{ act: 1, p0: 0.22, p1: 0.47, from: "w2", to: "r", label: "SET id=G-2 NX", c: "amber" },
	{ act: 1, p0: 0.52, p1: 0.7, from: "r", to: "w2", label: "(nil)", c: "red" },
	{ act: 2, p0: 0.15, p1: 0.45, from: "w2", to: "s", label: "removeGroup G-2", c: "amber" },
];

function makeCreateScene(lang: Lang) {
	const L = CREATE_LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const workerW = Math.min(128, w * 0.22);
		const midW = Math.min(190, w * 0.32);
		const rightW = Math.min(170, w * 0.28);
		const B: Record<string, NodeBox> = {
			w1: { cx: 10 + workerW / 2, cy: 88, hw: workerW / 2, hh: 27 },
			w2: { cx: 10 + workerW / 2, cy: 208, hw: workerW / 2, hh: 27 },
			r: { cx: w * 0.47, cy: 148, hw: midW / 2, hh: 38 },
			s: { cx: w - 10 - rightW / 2, cy: 148, hw: rightW / 2, hh: 82 },
		};
		const { act, p } = actOf(t, CREATE_START, CREATE_DUR);

		drawPanelBox(ctx, B.r, L.panels[0], c, dark);
		drawPanelBox(ctx, B.s, L.panels[1], c, dark);
		drawWorkerBox(ctx, B.w1, L.worker[0], L.w1sub[act], c.blue, c);
		drawWorkerBox(ctx, B.w2, L.worker[1], L.w2sub[act], c.amber, c);

		if (act === 0 && p < 0.33) drawRedisEmpty(ctx, B.r, L.empty, c);
		if (act > 1 || (act === 1 && p > 0.33)) drawRedisRow(ctx, B.r, 0, "id", "G-1", c);
		else if (act === 1) drawRedisEmpty(ctx, B.r, L.empty, c);

		const g1 = act > 0 || p > 0.4;
		const g2Born = act > 0 || p > 0.56;
		const g2Gone = act === 2 && p > 0.68;
		if (g1) drawGroupCard(ctx, B.s, 0, "G-1", L.count0, "PENDING", c);
		if (g2Born && !g2Gone)
			drawGroupCard(ctx, B.s, 1, "G-2", L.count0, "PENDING", c, { dying: act === 2 && p > 0.4 });

		drawMsgs(ctx, CREATE_MSGS, B, act, p, c, dark);
		drawCaptions(ctx, w, L.captions[act], c);
	};
}

// ─────────────────────────────────────────────────────────────────────
// ② 발송 트리거 경합 — 같은 jobId 의 두 번째 add 는 큐가 흡수한다
// ─────────────────────────────────────────────────────────────────────

const DEDUPE_DUR = [9000, 10000, 8000] as const;
const DEDUPE_START = starts(DEDUPE_DUR);
const DEDUPE_CYCLE = DEDUPE_START[2] + DEDUPE_DUR[2];

const DEDUPE_LABELS = {
	ko: {
		captions: [
			["① 마지막 두 청크가 거의 동시에 끝난다", "둘 다 기록을 읽고 '완성'을 본다 — 관측자가 둘이다"],
			["② 둘 다 ADD send-G-1 — jobId 가 같다", "BullMQ 는 같은 jobId 의 두 번째 add 를 조용히 무시한다"],
			["③ send job 은 하나만 존재한다", "여기까지가 add 시점 — 실행 시점 방어는 결말 마커의 몫이다"],
		],
		w1sub: ["완성 관측", "ADD send", "send-G-1 처리"],
		w2sub: ["완성 관측", "ADD send", "대기"],
		worker: ["워커 1", "워커 2"],
		panels: ["Redis · 그룹 상태 키", "BullMQ 큐"],
		complete: "완성: 0·1·last",
		second: "send-G-1 (2번째)",
		chips: { wait: "대기", run: "처리 중", dup: "흡수됨" },
		aria: "마지막 두 청크가 거의 동시에 완성을 관측해 둘 다 같은 jobId 의 send job 을 적재하지만, BullMQ 가 두 번째 add 를 조용히 무시해 send job 이 하나만 존재하게 되는 세 장면의 애니메이션.",
	},
	en: {
		captions: [
			["① The last two chunks finish almost together", "both read the records and see completion — two observers"],
			["② Both ADD send-G-1 — the jobId is identical", "BullMQ silently ignores the second add of the same jobId"],
			["③ Exactly one send job exists", "that covers add time — run-time defense belongs to the done marker"],
		],
		w1sub: ["checking completion", "ADD send", "running send-G-1"],
		w2sub: ["checking completion", "ADD send", "idle"],
		worker: ["worker 1", "worker 2"],
		panels: ["Redis · group state keys", "BullMQ queue"],
		complete: "complete: 0·1·last",
		second: "send-G-1 (2nd)",
		chips: { wait: "waiting", run: "running", dup: "absorbed" },
		aria: "Two chunks observe completion at the same time and both add a send job with the same jobId; BullMQ silently absorbs the second add, so exactly one send job exists.",
	},
} as const;

function makeDedupeScene(lang: Lang) {
	const L = DEDUPE_LABELS[lang];
	const MSGS: readonly Msg[] = [
		{ act: 0, p0: 0.05, p1: 0.3, from: "w1", to: "r", label: "HGETALL staged", c: "blue" },
		{ act: 0, p0: 0.33, p1: 0.55, from: "r", to: "w1", label: L.complete, c: "green" },
		{ act: 0, p0: 0.2, p1: 0.45, from: "w2", to: "r", label: "HGETALL staged", c: "amber" },
		{ act: 0, p0: 0.5, p1: 0.72, from: "r", to: "w2", label: L.complete, c: "green" },
		{ act: 1, p0: 0.05, p1: 0.35, from: "w1", to: "q", label: "ADD send-G-1", c: "blue" },
		{ act: 1, p0: 0.32, p1: 0.62, from: "w2", to: "q", label: "ADD send-G-1", c: "amber", absorb: true },
		{ act: 2, p0: 0.1, p1: 0.4, from: "q", to: "w1", label: "send-G-1", c: "blue" },
	];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const workerW = Math.min(128, w * 0.22);
		const midW = Math.min(190, w * 0.32);
		const rightW = Math.min(180, w * 0.3);
		const B: Record<string, NodeBox> = {
			w1: { cx: 10 + workerW / 2, cy: 88, hw: workerW / 2, hh: 27 },
			w2: { cx: 10 + workerW / 2, cy: 208, hw: workerW / 2, hh: 27 },
			r: { cx: w * 0.47, cy: 148, hw: midW / 2, hh: 38 },
			q: { cx: w - 10 - rightW / 2, cy: 148, hw: rightW / 2, hh: 52 },
		};
		const { act, p } = actOf(t, DEDUPE_START, DEDUPE_DUR);

		drawPanelBox(ctx, B.r, L.panels[0], c, dark);
		drawPanelBox(ctx, B.q, L.panels[1], c, dark);
		drawWorkerBox(ctx, B.w1, L.worker[0], L.w1sub[act], c.blue, c);
		drawWorkerBox(ctx, B.w2, L.worker[1], L.w2sub[act], c.amber, c);

		drawRedisRow(ctx, B.r, 0, "staged", "{0, 1, last:1}", c);

		// 큐의 send job 행 — ②에서 하나 등록되고, 두 번째는 흡수 표시만 남는다.
		const rows: Array<{ id: string; st: "wait" | "run" | "dup" }> = [];
		if (act === 1 && p > 0.35) rows.push({ id: "send-G-1", st: "wait" });
		if (act === 1 && p > 0.62) rows.push({ id: L.second, st: "dup" });
		if (act === 2) rows.push({ id: "send-G-1", st: p > 0.4 ? "run" : "wait" });
		const chipStyle = {
			wait: { fill: c.boxFill, color: c.sub },
			run: { fill: c.blueFill, color: c.blue },
			dup: { fill: c.redFill, color: c.red },
		} as const;
		rows.forEach((row, i) => {
			const y = B.q.cy - B.q.hh + 34 + i * 22;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.font = `500 10.5px ${MONO}`;
			ctx.fillStyle = row.st === "dup" ? c.red : c.text;
			ctx.fillText(row.id, B.q.cx - B.q.hw + 10, y);
			const s = chipStyle[row.st];
			drawChipAt(ctx, B.q.cx + B.q.hw - 8, y, L.chips[row.st], s.fill, s.color);
		});

		drawMsgs(ctx, MSGS, B, act, p, c, dark);
		drawCaptions(ctx, w, L.captions[act], c);
	};
}

// ─────────────────────────────────────────────────────────────────────
// ③ 재발송 방어 — 응답 유실 재시도를 결말 마커와 상태 게이트가 걸러낸다
// ─────────────────────────────────────────────────────────────────────

const RESEND_DUR = [10000, 9000, 10000, 9000] as const;
const RESEND_START = starts(RESEND_DUR);
const RESEND_CYCLE = RESEND_START[3] + RESEND_DUR[3];

const RESEND_LABELS = {
	ko: {
		captions: [
			["① 발송은 성공했는데 응답이 오다 끊겼다", "job 은 실패로 기록된다 — 결말 마커는 아직 없다"],
			["② 재시도 — 1차 게이트, 결말 마커", "(nil): 마커를 남기기 전에 끊겨서 여기서는 못 잡는다"],
			["③ 2차 게이트 — 서드파티가 보는 사실", "PENDING 이 아니다 = 이미 나갔다, 발송을 생략한다"],
			["④ 발송은 생략하고 리포트만 회수한다", "발송 1번 · 리포트 1번 — 멱등성은 jobId 가 아니라 이 게이트들이 지킨다"],
		],
		wsub: ["sendGroup 호출", "GET done", "GET group", "리포트 발행"],
		worker: "워커 (send job 재시도)",
		panels: ["Redis · 그룹 상태 키", "서드파티 · 그룹 API"],
		empty: "(비어 있음)",
		count: "10,000건",
		statusReply: "SENDING · 10,000건",
		aria: "발송 호출은 성공했지만 응답이 유실돼 job 이 실패로 남고, 재시도가 결말 마커에서 (nil)을 보지만 서드파티 상태 조회가 PENDING 이 아님을 알려 발송을 생략하고 리포트만 회수하는 네 장면의 애니메이션.",
	},
	en: {
		captions: [
			["① The send succeeded, but the reply was lost", "the job is recorded as failed — no done marker yet"],
			["② Retry — first gate, the done marker", "(nil): the crash happened before the marker, so this gate misses"],
			["③ Second gate — what the third party sees", "not PENDING = it already went out; skip the send"],
			["④ Skip the send, recover only the report", "one send · one report — idempotency lives in these gates, not the jobId"],
		],
		wsub: ["calling sendGroup", "GET done", "GET group", "publishing report"],
		worker: "worker (send job retry)",
		panels: ["Redis · group state keys", "third party · group API"],
		empty: "(empty)",
		count: "10,000",
		statusReply: "SENDING · 10,000",
		aria: "A send call succeeds but the reply is lost, so the job fails; the retry reads nil from the done marker, but the third-party status query shows the group is no longer PENDING, so it skips the send and recovers only the report.",
	},
} as const;

function makeResendScene(lang: Lang) {
	const L = RESEND_LABELS[lang];
	const MSGS: readonly Msg[] = [
		{ act: 0, p0: 0.05, p1: 0.32, from: "w1", to: "s", label: "sendGroup", c: "blue" },
		{ act: 0, p0: 0.45, p1: 0.8, from: "s", to: "w1", label: "200 OK", c: "green", lostAt: 0.5 },
		{ act: 1, p0: 0.08, p1: 0.35, from: "w1", to: "r", label: "GET done", c: "blue" },
		{ act: 1, p0: 0.4, p1: 0.65, from: "r", to: "w1", label: "(nil)", c: "sub" },
		{ act: 2, p0: 0.05, p1: 0.32, from: "w1", to: "s", label: "GET group", c: "blue" },
		{ act: 2, p0: 0.38, p1: 0.66, from: "s", to: "w1", label: L.statusReply, c: "green" },
		{ act: 3, p0: 0.1, p1: 0.38, from: "w1", to: "r", label: "SET done NX", c: "blue" },
	];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const workerW = Math.min(150, w * 0.26);
		const midW = Math.min(190, w * 0.32);
		const rightW = Math.min(170, w * 0.28);
		const B: Record<string, NodeBox> = {
			w1: { cx: 10 + workerW / 2, cy: 148, hw: workerW / 2, hh: 30 },
			r: { cx: w * 0.47, cy: 84, hw: midW / 2, hh: 38 },
			s: { cx: w - 10 - rightW / 2, cy: 178, hw: rightW / 2, hh: 62 },
		};
		const { act, p } = actOf(t, RESEND_START, RESEND_DUR);

		drawPanelBox(ctx, B.r, L.panels[0], c, dark);
		drawPanelBox(ctx, B.s, L.panels[1], c, dark);
		drawWorkerBox(ctx, B.w1, L.worker, L.wsub[act], c.blue, c);

		if (act === 3 && p > 0.42) drawRedisRow(ctx, B.r, 0, "done", "sent", c);
		else drawRedisEmpty(ctx, B.r, L.empty, c);

		const sending = act > 0 || p > 0.36;
		drawGroupCard(ctx, B.s, 0, "G-1", L.count, sending ? "SENDING" : "PENDING", c, { sent: sending });

		drawMsgs(ctx, MSGS, B, act, p, c, dark);
		drawCaptions(ctx, w, L.captions[act], c);
	};
}

// ─────────────────────────────────────────────────────────────────────
// ④ 재적재 — 기록은 마지막 조각 뒤에만, 끊긴 재시도는 통째로 다시
// ─────────────────────────────────────────────────────────────────────

const RESTAGE_DUR = [10000, 9000, 10000, 8000] as const;
const RESTAGE_START = starts(RESTAGE_DUR);
const RESTAGE_CYCLE = RESTAGE_START[3] + RESTAGE_DUR[3];

const RESTAGE_LABELS = {
	ko: {
		captions: [
			["① 조각을 담다가 중간에 끊겼다", "Redis 기록은 아직 없다 — 기록은 마지막 조각 뒤에 쓴다"],
			["② 재시도 — Redis 에 내 기록이 없다", "기록이 없으면 처음부터 통째로 다시 담는다"],
			["③ 이미 담긴 조각은 서드파티가 떨군다", "등록 수는 늘지 않는다 — 남은 조각만 새로 담긴다"],
			["④ 전부 성공한 뒤에야 기록을 남긴다", "쓰기 순서 하나가 복구 로직 전체를 대체한다"],
		],
		wsub: ["조각 적재", "재시도 진입", "통째로 재적재", "기록 남김"],
		worker: "워커 (청크 job)",
		panels: ["Redis · 적재 기록", "서드파티 · 그룹 API"],
		empty: "(seq 7 기록 없음)",
		dup: "중복 · 무시",
		count0: "0/3",
		count1: "1/3 담김",
		count3: "3/3 담김",
		aria: "청크 job 이 조각을 담다가 중간에 끊겨 Redis 기록 없이 실패하고, 재시도가 기록 없음을 확인해 통째로 다시 담되 이미 담긴 조각은 서드파티의 중복 판정이 떨구고, 마지막 조각까지 성공한 뒤에야 적재 기록을 남기는 네 장면의 애니메이션.",
	},
	en: {
		captions: [
			["① The staging broke off mid-way", "no Redis record yet — the record is written after the last piece"],
			["② Retry — Redis has no record of me", "no record means restage everything from the start"],
			["③ The third party drops already-staged pieces", "the count doesn't grow — only the missing pieces land"],
			["④ Only after full success is the record written", "one write order replaces the whole recovery logic"],
		],
		wsub: ["staging pieces", "retry entry", "restaging all", "writing record"],
		worker: "worker (chunk job)",
		panels: ["Redis · staging records", "third party · group API"],
		empty: "(no record for seq 7)",
		dup: "dup · skipped",
		count0: "0/3",
		count1: "1/3 staged",
		count3: "3/3 staged",
		aria: "A chunk job breaks off mid-staging with no Redis record; the retry sees no record and restages everything, the third party drops duplicate pieces, and the staging record is written only after the last piece succeeds.",
	},
} as const;

function makeRestageScene(lang: Lang) {
	const L = RESTAGE_LABELS[lang];
	const MSGS: readonly Msg[] = [
		{ act: 0, p0: 0.05, p1: 0.28, from: "w1", to: "s", label: "stage 1/3", c: "blue" },
		{ act: 0, p0: 0.31, p1: 0.5, from: "s", to: "w1", label: "OK", c: "green" },
		{ act: 0, p0: 0.55, p1: 0.85, from: "w1", to: "s", label: "stage 2/3", c: "blue", lostAt: 0.5 },
		{ act: 1, p0: 0.08, p1: 0.35, from: "w1", to: "r", label: "HGET staged 7", c: "blue" },
		{ act: 1, p0: 0.4, p1: 0.62, from: "r", to: "w1", label: "(nil)", c: "sub" },
		{ act: 2, p0: 0.05, p1: 0.28, from: "w1", to: "s", label: "stage 1/3", c: "blue" },
		{ act: 2, p0: 0.31, p1: 0.5, from: "s", to: "w1", label: L.dup, c: "sub" },
		{ act: 2, p0: 0.5, p1: 0.72, from: "w1", to: "s", label: "stage 2·3/3", c: "blue" },
		{ act: 2, p0: 0.75, p1: 0.93, from: "s", to: "w1", label: "OK", c: "green" },
		{ act: 3, p0: 0.1, p1: 0.4, from: "w1", to: "r", label: "HSET staged 7", c: "blue" },
	];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const workerW = Math.min(150, w * 0.26);
		const midW = Math.min(190, w * 0.32);
		const rightW = Math.min(170, w * 0.28);
		const B: Record<string, NodeBox> = {
			w1: { cx: 10 + workerW / 2, cy: 148, hw: workerW / 2, hh: 30 },
			r: { cx: w * 0.47, cy: 84, hw: midW / 2, hh: 38 },
			s: { cx: w - 10 - rightW / 2, cy: 178, hw: rightW / 2, hh: 62 },
		};
		const { act, p } = actOf(t, RESTAGE_START, RESTAGE_DUR);

		drawPanelBox(ctx, B.r, L.panels[0], c, dark);
		drawPanelBox(ctx, B.s, L.panels[1], c, dark);
		drawWorkerBox(ctx, B.w1, L.worker, L.wsub[act], c.blue, c);

		if (act === 3 && p > 0.45) drawRedisRow(ctx, B.r, 0, "staged.7", "done", c);
		else drawRedisEmpty(ctx, B.r, L.empty, c);

		const three = act === 3 || (act === 2 && p > 0.9);
		const one = act > 0 || p > 0.31;
		drawGroupCard(ctx, B.s, 0, "G-1", three ? L.count3 : one ? L.count1 : L.count0, "PENDING", c);

		drawMsgs(ctx, MSGS, B, act, p, c, dark);
		drawCaptions(ctx, w, L.captions[act], c);
	};
}

// ─────────────────────────────────────────────────────────────────────
// ⑤ 리포트 게이트 — 결말을 본 자리가 여럿이어도 발행은 한 번
// ─────────────────────────────────────────────────────────────────────

const REPORT_DUR = [9000, 10000, 8000] as const;
const REPORT_START = starts(REPORT_DUR);
const REPORT_CYCLE = REPORT_START[2] + REPORT_DUR[2];

const REPORT_LABELS = {
	ko: {
		captions: [
			["① 결말을 보는 자리가 여럿이다", "둘 다 '보냈음'을 읽고 리포트를 내려 한다"],
			["② SET NX — 먼저 쓴 하나만 통과한다", "리포트 게이트도 생성 경합과 같은 장치다"],
			["③ 리포트는 묶음당 한 번 나간다", "진 쪽은 발행 없이 그대로 접는다"],
		],
		w1sub: ["결말 확인", "SET NX 시도", "리포트 발행"],
		w2sub: ["결말 확인", "SET NX 시도", "접음"],
		worker: ["워커 1", "워커 2"],
		panels: ["Redis · 게이트 키", "발행된 리포트"],
		reportSub: "묶음 리포트",
		published: "발행 1회",
		none: "(아직 없음)",
		aria: "두 워커가 같은 묶음의 결말을 읽고 둘 다 리포트를 내려 하지만, Redis SET NX 게이트를 먼저 쓴 워커 1 만 통과해 리포트가 묶음당 한 번만 발행되는 세 장면의 애니메이션.",
	},
	en: {
		captions: [
			["① Several places observe the ending", "both read 'sent' and try to publish the report"],
			["② SET NX — only the first write passes", "the report gate is the same primitive as group creation"],
			["③ One report per batch", "the loser folds without publishing"],
		],
		w1sub: ["checking the ending", "trying SET NX", "publishing report"],
		w2sub: ["checking the ending", "trying SET NX", "folding"],
		worker: ["worker 1", "worker 2"],
		panels: ["Redis · gate keys", "published reports"],
		reportSub: "batch report",
		published: "published ×1",
		none: "(none yet)",
		aria: "Two workers read the same batch ending and both try to publish; only the first SET NX write passes, so exactly one report goes out.",
	},
} as const;

const REPORT_MSGS: readonly Msg[] = [
	{ act: 0, p0: 0.05, p1: 0.3, from: "w1", to: "r", label: "GET done", c: "blue" },
	{ act: 0, p0: 0.33, p1: 0.5, from: "r", to: "w1", label: "sent", c: "green" },
	{ act: 0, p0: 0.2, p1: 0.45, from: "w2", to: "r", label: "GET done", c: "amber" },
	{ act: 0, p0: 0.5, p1: 0.68, from: "r", to: "w2", label: "sent", c: "green" },
	{ act: 1, p0: 0.05, p1: 0.3, from: "w1", to: "r", label: "SET report NX", c: "blue" },
	{ act: 1, p0: 0.33, p1: 0.5, from: "r", to: "w1", label: "OK", c: "green" },
	{ act: 1, p0: 0.22, p1: 0.47, from: "w2", to: "r", label: "SET report NX", c: "amber" },
	{ act: 1, p0: 0.52, p1: 0.7, from: "r", to: "w2", label: "(nil)", c: "red" },
	{ act: 2, p0: 0.1, p1: 0.42, from: "w1", to: "p", label: "publish G-1", c: "blue" },
];

function makeReportScene(lang: Lang) {
	const L = REPORT_LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const workerW = Math.min(128, w * 0.22);
		const midW = Math.min(190, w * 0.32);
		const rightW = Math.min(170, w * 0.28);
		const B: Record<string, NodeBox> = {
			w1: { cx: 10 + workerW / 2, cy: 88, hw: workerW / 2, hh: 27 },
			w2: { cx: 10 + workerW / 2, cy: 208, hw: workerW / 2, hh: 27 },
			r: { cx: w * 0.47, cy: 148, hw: midW / 2, hh: 38 },
			p: { cx: w - 10 - rightW / 2, cy: 148, hw: rightW / 2, hh: 52 },
		};
		const { act, p } = actOf(t, REPORT_START, REPORT_DUR);

		drawPanelBox(ctx, B.r, L.panels[0], c, dark);
		drawPanelBox(ctx, B.p, L.panels[1], c, dark);
		drawWorkerBox(ctx, B.w1, L.worker[0], L.w1sub[act], c.blue, c);
		drawWorkerBox(ctx, B.w2, L.worker[1], L.w2sub[act], c.amber, c);

		drawRedisRow(ctx, B.r, 0, "done", "sent", c);
		if (act === 2 || (act === 1 && p > 0.33)) drawRedisRow(ctx, B.r, 1, "report", "1", c);

		if (act === 2 && p > 0.48) drawGroupCard(ctx, B.p, 0, "G-1", L.reportSub, L.published, c, { sent: true });
		else drawRedisEmpty(ctx, B.p, L.none, c);

		drawMsgs(ctx, REPORT_MSGS, B, act, p, c, dark);
		drawCaptions(ctx, w, L.captions[act], c);
	};
}

// ─────────────────────────────────────────────────────────────────────
// ⑥ 세대 롤오버 — 상한 초과를 둘이 봐도 세대를 닫는 자는 하나
// ─────────────────────────────────────────────────────────────────────

const ROLLOVER_DUR = [9500, 9500, 10000, 9500] as const;
const ROLLOVER_START = starts(ROLLOVER_DUR);
const ROLLOVER_CYCLE = ROLLOVER_START[3] + ROLLOVER_DUR[3];

const ROLLOVER_LABELS = {
	ko: {
		captions: [
			["① 마지막 승인이 상한을 넘는다", "HINCRBY 반환값 — 두 청크가 나란히 초과를 본다"],
			["② SET NX — 세대를 닫는 자는 하나다", "진 쪽은 재시도 가능한 에러로 물러난다"],
			["③ 가득 찬 그룹은 내보내고, 새 그룹을 만든다", "gen 은 1 → 2 로 정확히 한 번 오른다"],
			["④ 진 쪽은 재시도로 돌아와 새 세대에 합류한다", "빈 세대 없이 적재가 이어진다"],
		],
		w1sub: ["HINCRBY 승인", "SET NX 시도", "롤오버 수행", "적재 계속"],
		w2sub: ["HINCRBY 승인", "SET NX 시도", "물러남", "G-2 에 적재"],
		worker: ["워커 1", "워커 2"],
		panels: ["Redis · 세대 키", "서드파티 · 그룹 API"],
		gen1: "1세대",
		gen2: "2세대",
		aria: "마지막 두 청크의 HINCRBY 승인이 나란히 상한을 넘겨 둘 다 세대를 닫으려 하지만, SET NX 를 먼저 쓴 워커 1 만 롤오버를 수행해 가득 찬 G-1 을 내보내고 G-2 를 만들며, 진 워커 2 는 재시도로 돌아와 올라간 세대의 G-2 에 담는 네 장면의 애니메이션.",
	},
	en: {
		captions: [
			["① The last approvals cross the cap", "HINCRBY return values — two chunks see the overflow together"],
			["② SET NX — exactly one closes the generation", "the loser backs off with a retryable error"],
			["③ Ship the full group, create the next one", "gen goes 1 → 2 exactly once"],
			["④ The loser retries and joins the new generation", "staging continues with no empty generation"],
		],
		w1sub: ["HINCRBY approval", "trying SET NX", "rolling over", "staging on"],
		w2sub: ["HINCRBY approval", "trying SET NX", "backing off", "staging to G-2"],
		worker: ["worker 1", "worker 2"],
		panels: ["Redis · generation keys", "third party · group API"],
		gen1: "gen 1",
		gen2: "gen 2",
		aria: "Two chunks' HINCRBY approvals cross the cap together and both try to close the generation; only the first SET NX write rolls over — shipping the full G-1 and creating G-2 — while the loser retries and joins the new generation.",
	},
} as const;

const ROLLOVER_MSGS: readonly Msg[] = [
	{ act: 0, p0: 0.05, p1: 0.3, from: "w1", to: "r", label: "HINCRBY +5,000", c: "blue" },
	{ act: 0, p0: 0.35, p1: 0.58, from: "r", to: "w1", label: "10,000", c: "red" },
	{ act: 0, p0: 0.18, p1: 0.45, from: "w2", to: "r", label: "HINCRBY +5,000", c: "amber" },
	{ act: 0, p0: 0.5, p1: 0.72, from: "r", to: "w2", label: "15,000", c: "red" },
	{ act: 1, p0: 0.05, p1: 0.3, from: "w1", to: "r", label: "SET roll.1 NX", c: "blue" },
	{ act: 1, p0: 0.33, p1: 0.5, from: "r", to: "w1", label: "OK", c: "green" },
	{ act: 1, p0: 0.22, p1: 0.47, from: "w2", to: "r", label: "SET roll.1 NX", c: "amber" },
	{ act: 1, p0: 0.52, p1: 0.7, from: "r", to: "w2", label: "(nil)", c: "red" },
	{ act: 2, p0: 0.05, p1: 0.28, from: "w1", to: "s", label: "sendGroup G-1", c: "blue" },
	{ act: 2, p0: 0.34, p1: 0.54, from: "w1", to: "r", label: "INCR gen", c: "blue" },
	{ act: 2, p0: 0.6, p1: 0.8, from: "w1", to: "s", label: "createGroup", c: "blue" },
	{ act: 2, p0: 0.84, p1: 0.97, from: "s", to: "w1", label: "G-2", c: "green" },
	{ act: 3, p0: 0.05, p1: 0.28, from: "w2", to: "r", label: "GET gen", c: "amber" },
	{ act: 3, p0: 0.32, p1: 0.5, from: "r", to: "w2", label: "2", c: "green" },
	{ act: 3, p0: 0.55, p1: 0.78, from: "w2", to: "s", label: "stage → G-2", c: "amber" },
	{ act: 3, p0: 0.82, p1: 0.96, from: "s", to: "w2", label: "OK", c: "green" },
];

function makeRolloverScene(lang: Lang) {
	const L = ROLLOVER_LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const workerW = Math.min(128, w * 0.22);
		const midW = Math.min(190, w * 0.32);
		const rightW = Math.min(170, w * 0.28);
		const B: Record<string, NodeBox> = {
			w1: { cx: 10 + workerW / 2, cy: 88, hw: workerW / 2, hh: 27 },
			w2: { cx: 10 + workerW / 2, cy: 208, hw: workerW / 2, hh: 27 },
			r: { cx: w * 0.47, cy: 148, hw: midW / 2, hh: 46 },
			s: { cx: w - 10 - rightW / 2, cy: 148, hw: rightW / 2, hh: 82 },
		};
		const { act, p } = actOf(t, ROLLOVER_START, ROLLOVER_DUR);

		drawPanelBox(ctx, B.r, L.panels[0], c, dark);
		drawPanelBox(ctx, B.s, L.panels[1], c, dark);
		drawWorkerBox(ctx, B.w1, L.worker[0], L.w1sub[act], c.blue, c);
		drawWorkerBox(ctx, B.w2, L.worker[1], L.w2sub[act], c.amber, c);

		drawRedisRow(ctx, B.r, 0, "cap", "8,000", c);
		drawRedisRow(ctx, B.r, 1, "gen", act > 2 || (act === 2 && p > 0.54) ? "2" : "1", c);
		const appr = act > 0 || p > 0.45 ? "15,000" : p > 0.3 ? "10,000" : "5,000";
		drawRedisRow(ctx, B.r, 2, "appr.1", appr, c);

		// 좁은 폭에서는 부제가 상태 칩과 겹쳐 생략한다 — 세대 정보는 Redis 행과 캡션에 있다.
		const compact = w < 560;
		const sent = act > 2 || (act === 2 && p > 0.28);
		drawGroupCard(ctx, B.s, 0, "G-1", compact ? "" : L.gen1, sent ? "SENDING" : "PENDING", c, { sent });
		if (act === 3 || (act === 2 && p > 0.8))
			drawGroupCard(ctx, B.s, 1, "G-2", compact ? "" : L.gen2, "PENDING", c);

		drawMsgs(ctx, ROLLOVER_MSGS, B, act, p, c, dark);
		drawCaptions(ctx, w, L.captions[act], c);
	};
}

// ─────────────────────────────────────────────────────────────────────
// ⑦ 하트비트 감시 — 막지 못한 창은 시끄럽게 실패하고, 감시가 받아낸다
// ─────────────────────────────────────────────────────────────────────

const WATCH_DUR = [9000, 9000, 10000, 8000] as const;
const WATCH_START = starts(WATCH_DUR);
const WATCH_CYCLE = WATCH_START[3] + WATCH_DUR[3];

const WATCH_LABELS = {
	ko: {
		captions: [
			["① 막지 못한 창 — 스트래글러가 발송 뒤에 도착한다", "이미 나간 그룹에 적재를 시도하다 에러로 드러난다"],
			["② 실패는 반복되고, 묶음은 미완성으로 남는다", "하트비트(마지막 적재 시각)는 더 갱신되지 않는다"],
			["③ 감시가 주기적으로 하트비트를 훑는다", "오래 조용한 묶음이 걸려 나온다"],
			["④ 미완성 묶음을 알린다", "이중 실행도 마이크로 갭도 결국 이 감시가 받아낸다"],
		],
		w1sub: ["stage 시도", "재시도", "재시도 대기", "재시도 대기"],
		msub: ["주기 대기", "주기 대기", "SCAN 실행", "알림 발행"],
		worker: ["청크 워커", "감시 job"],
		panels: ["Redis · 하트비트", "서드파티 · 그룹 API"],
		panelShort: "서드파티",
		beatOld: ["5분 전", "9분 전", "13분 전", "13분 전"],
		beatFresh: "방금",
		quiet: "B-1 · 13분 조용",
		err: "에러 · 이미 발송됨",
		err2: "에러",
		count: "9/10 담김",
		countShort: "9/10",
		alert: "알림 · B-1 미완성",
		aria: "갭에 빠진 스트래글러 청크가 이미 발송된 그룹에 적재를 시도하다 에러로 반복 실패하고, 하트비트가 갱신되지 않아 감시 job 이 주기 스캔에서 오래 조용한 묶음을 찾아 알리는 네 장면의 애니메이션.",
	},
	en: {
		captions: [
			["① The unblocked window — a straggler arrives after the send", "it tries to stage into a group that already went out — a loud error"],
			["② The failures repeat; the batch stays incomplete", "the heartbeat (last staged-at) stops updating"],
			["③ The watchdog sweeps the heartbeats periodically", "long-quiet batches fall out of the scan"],
			["④ It alerts on the incomplete batch", "both unblocked windows land in this same net"],
		],
		w1sub: ["staging", "retrying", "awaiting retry", "awaiting retry"],
		msub: ["idle", "idle", "running SCAN", "publishing alert"],
		worker: ["chunk worker", "watchdog job"],
		panels: ["Redis · heartbeats", "third party · group API"],
		panelShort: "third party",
		beatOld: ["5 min ago", "9 min ago", "13 min ago", "13 min ago"],
		beatFresh: "just now",
		quiet: "B-1 · quiet 13 min",
		err: "error · already sent",
		err2: "error",
		count: "9/10 staged",
		countShort: "9/10",
		alert: "alert · B-1 incomplete",
		aria: "A straggler chunk arrives after the group has been sent and fails loudly on staging; the heartbeat stops updating, and the watchdog's periodic scan flags the long-quiet batch and publishes an alert.",
	},
} as const;

function makeWatchScene(lang: Lang) {
	const L = WATCH_LABELS[lang];
	const MSGS: readonly Msg[] = [
		{ act: 0, p0: 0.05, p1: 0.35, from: "w1", to: "s", label: "stage seq 9", c: "blue" },
		{ act: 0, p0: 0.42, p1: 0.7, from: "s", to: "w1", label: L.err, c: "red" },
		{ act: 1, p0: 0.1, p1: 0.4, from: "w1", to: "s", label: "stage seq 9", c: "blue" },
		{ act: 1, p0: 0.47, p1: 0.72, from: "s", to: "w1", label: L.err2, c: "red" },
		{ act: 2, p0: 0.05, p1: 0.35, from: "m", to: "r", label: "SCAN beat.*", c: "green" },
		{ act: 2, p0: 0.42, p1: 0.72, from: "r", to: "m", label: L.quiet, c: "amber" },
	];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const workerW = Math.min(128, w * 0.22);
		const midW = Math.min(190, w * 0.32);
		const rightW = Math.min(170, w * 0.28);
		const B: Record<string, NodeBox> = {
			w1: { cx: 10 + workerW / 2, cy: 88, hw: workerW / 2, hh: 27 },
			m: { cx: 10 + workerW / 2, cy: 208, hw: workerW / 2, hh: 27 },
			r: { cx: w * 0.47, cy: 148, hw: midW / 2, hh: 38 },
			s: { cx: w - 10 - rightW / 2, cy: 148, hw: rightW / 2, hh: 52 },
		};
		const { act, p } = actOf(t, WATCH_START, WATCH_DUR);
		const compact = w < 480;

		drawPanelBox(ctx, B.r, L.panels[0], c, dark);
		drawPanelBox(ctx, B.s, compact ? L.panelShort : L.panels[1], c, dark);
		drawWorkerBox(ctx, B.w1, L.worker[0], L.w1sub[act], c.blue, c);
		drawWorkerBox(ctx, B.m, L.worker[1], L.msub[act], c.green, c);

		drawRedisRow(ctx, B.r, 0, compact ? "B-1" : "beat.B-1", L.beatOld[act], c);
		drawRedisRow(ctx, B.r, 1, compact ? "B-2" : "beat.B-2", L.beatFresh, c);

		drawGroupCard(ctx, B.s, 0, "G-1", compact ? L.countShort : L.count, "SENT", c, { sent: true });

		if (act === 3) drawBadge(ctx, w / 2, 258, L.alert, c.redFill, c.red, clamp01(p / 0.25));

		drawMsgs(ctx, MSGS, B, act, p, c, dark);
		drawCaptions(ctx, w, L.captions[act], c);
	};
}

// 언어별 drawScene 을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const CREATE_SCENES = { ko: makeCreateScene("ko"), en: makeCreateScene("en") };
const DEDUPE_SCENES = { ko: makeDedupeScene("ko"), en: makeDedupeScene("en") };
const RESEND_SCENES = { ko: makeResendScene("ko"), en: makeResendScene("en") };
const RESTAGE_SCENES = { ko: makeRestageScene("ko"), en: makeRestageScene("en") };
const REPORT_SCENES = { ko: makeReportScene("ko"), en: makeReportScene("en") };
const ROLLOVER_SCENES = { ko: makeRolloverScene("ko"), en: makeRolloverScene("en") };
const WATCH_SCENES = { ko: makeWatchScene("ko"), en: makeWatchScene("en") };

function Demo({
	lang,
	cycle,
	scenes,
	aria,
}: {
	lang: Lang;
	cycle: number;
	scenes: Record<Lang, (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => void>;
	aria: string;
}) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, cycle, scenes[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

export function CreateRaceDemo({ lang = "ko" }: { lang?: Lang }) {
	return <Demo lang={lang} cycle={CREATE_CYCLE} scenes={CREATE_SCENES} aria={CREATE_LABELS[lang].aria} />;
}

export function SendDedupeDemo({ lang = "ko" }: { lang?: Lang }) {
	return <Demo lang={lang} cycle={DEDUPE_CYCLE} scenes={DEDUPE_SCENES} aria={DEDUPE_LABELS[lang].aria} />;
}

export function ResendGuardDemo({ lang = "ko" }: { lang?: Lang }) {
	return <Demo lang={lang} cycle={RESEND_CYCLE} scenes={RESEND_SCENES} aria={RESEND_LABELS[lang].aria} />;
}

export function RestageDemo({ lang = "ko" }: { lang?: Lang }) {
	return <Demo lang={lang} cycle={RESTAGE_CYCLE} scenes={RESTAGE_SCENES} aria={RESTAGE_LABELS[lang].aria} />;
}

export function ReportOnceDemo({ lang = "ko" }: { lang?: Lang }) {
	return <Demo lang={lang} cycle={REPORT_CYCLE} scenes={REPORT_SCENES} aria={REPORT_LABELS[lang].aria} />;
}

export function RolloverRaceDemo({ lang = "ko" }: { lang?: Lang }) {
	return <Demo lang={lang} cycle={ROLLOVER_CYCLE} scenes={ROLLOVER_SCENES} aria={ROLLOVER_LABELS[lang].aria} />;
}

export function HeartbeatWatchdogDemo({ lang = "ko" }: { lang?: Lang }) {
	return <Demo lang={lang} cycle={WATCH_CYCLE} scenes={WATCH_SCENES} aria={WATCH_LABELS[lang].aria} />;
}

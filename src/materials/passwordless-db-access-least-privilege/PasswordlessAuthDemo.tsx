import { type Colors, drawBadge, ease, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// 시나리오 타임라인(ms). 매 사이클 같은 장면을 재생하는 결정적 애니메이션이다.
const UNTIL = [1600, 3200, 4800, 6400, 8000, 10000];
const CYCLE = 10000;
const HEIGHT = 190;

const LABELS = {
	ko: {
		captions: [
			"① kubelet이 서명한 SA 토큰(JWT)이 파드에 준비된다",
			"② JWT로 STS에 AssumeRoleWithWebIdentity 호출",
			"③ 수명이 짧은 임시 자격증명 발급",
			"④ SigV4 서명으로 15분짜리 DB 토큰 생성 (로컬 계산)",
			"⑤ 토큰을 비밀번호 자리에 넣어 TLS로 접속",
			"⑥ rds_iam 검증 — 연결 성립, 저장된 비밀번호 없음",
		],
		pod: "파드",
		dbToken: "DB 토큰 (15분)",
		tempCreds: "임시 자격증명",
		token: "토큰",
		aria: "파드가 서비스어카운트 JWT로 STS에서 임시 자격증명을 받고, SigV4 서명으로 만든 15분짜리 토큰을 비밀번호 자리에 넣어 RDS에 접속하는 여섯 단계를 반복 재생하는 애니메이션. 어느 단계에도 저장된 비밀번호가 없다.",
	},
	en: {
		captions: [
			"① kubelet writes a signed SA token (JWT) into the pod",
			"② The JWT calls STS AssumeRoleWithWebIdentity",
			"③ Short-lived temporary credentials come back",
			"④ SigV4 signing builds a 15-min DB token locally",
			"⑤ The token goes into the password slot over TLS",
			"⑥ rds_iam verifies — connected, no stored password",
		],
		pod: "Pod",
		dbToken: "DB token (15 min)",
		tempCreds: "temp credentials",
		token: "token",
		aria: "Looping animation of six steps: the pod trades its ServiceAccount JWT for temporary credentials at STS, builds a 15-minute token with a SigV4 signature, and puts it in the password slot to connect to RDS over TLS. No stored password appears at any step.",
	},
} as const;
type Lang = keyof typeof LABELS;

function drawBox(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	w: number,
	h: number,
	title: string,
	sub: string,
	c: Colors,
	stroke = c.boxStroke,
) {
	ctx.beginPath();
	ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = c.text;
	ctx.font = `600 13px ${FONT}`;
	ctx.fillText(title, cx, cy - 8);
	ctx.fillStyle = c.sub;
	ctx.font = `400 10.5px ${FONT}`;
	ctx.fillText(sub, cx, cy + 9);
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
	ctx.beginPath();
	ctx.arc(x, y, 6, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
	ctx.font = `600 10.5px ${FONT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "bottom";
	ctx.fillText(label, x, y - 10);
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const boxW = Math.min(150, (w - margin * 2) / 3 - 10);
		const boxH = 52;
		const cy = 72;

		const stsX = margin + boxW / 2;
		const podX = w / 2;
		const rdsX = w - margin - boxW / 2;
		const leftA = stsX + boxW / 2 + 8;
		const leftB = podX - boxW / 2 - 8;
		const rightA = podX + boxW / 2 + 8;
		const rightB = rdsX - boxW / 2 - 8;

		const step = UNTIL.findIndex((u) => t < u);
		const from = step === 0 ? 0 : UNTIL[step - 1];
		const p = ease((t - from) / (UNTIL[step] - from));

		// 상시 연결선
		ctx.strokeStyle = c.line;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(leftA, cy);
		ctx.lineTo(leftB, cy);
		ctx.moveTo(rightA, cy);
		ctx.lineTo(rightB, cy);
		ctx.stroke();

		// ⑥ 연결 성립 — 파드-RDS 구간이 초록으로 굳는다
		if (step === 5) {
			ctx.save();
			ctx.globalAlpha = p;
			ctx.strokeStyle = c.green;
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(rightA, cy);
			ctx.lineTo(rightB, cy);
			ctx.stroke();
			ctx.restore();
		}

		drawBox(ctx, stsX, cy, boxW, boxH, "AWS STS", "IAM", c);
		drawBox(ctx, podX, cy, boxW, boxH, L.pod, "myapp", c);
		drawBox(ctx, rdsX, cy, boxW, boxH, "RDS", "PostgreSQL", c, step === 5 ? c.green : c.boxStroke);

		const badgeY = cy - boxH / 2 - 16;
		if (step <= 1) drawBadge(ctx, podX, badgeY, "JWT", c.blueFill, c.blue, step === 0 ? p : 1);
		if (step === 3) drawBadge(ctx, podX, badgeY, L.dbToken, c.greenFill, c.green, p);

		ctx.fillStyle = c.blue;
		if (step === 1) drawDot(ctx, lerp(leftB, leftA, p), cy, "JWT", c.blue);
		if (step === 2) drawDot(ctx, lerp(leftA, leftB, p), cy, L.tempCreds, c.amber);
		if (step === 4) drawDot(ctx, lerp(rightA, rightB, p), cy, L.token, c.green);

		if (step === 5) {
			ctx.save();
			ctx.globalAlpha = p;
			ctx.beginPath();
			ctx.arc(rdsX + boxW / 2 - 2, cy - boxH / 2 + 2, 9, 0, Math.PI * 2);
			ctx.fillStyle = c.green;
			ctx.fill();
			ctx.strokeStyle = dark ? "#1a1a1a" : "#ffffff";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(rdsX + boxW / 2 - 6, cy - boxH / 2 + 2);
			ctx.lineTo(rdsX + boxW / 2 - 3, cy - boxH / 2 + 5);
			ctx.lineTo(rdsX + boxW / 2 + 2, cy - boxH / 2 - 2);
			ctx.stroke();
			ctx.restore();
		}

		// 하단 캡션
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 26);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function PasswordlessAuthDemo({ lang = "ko" }: { lang?: Lang }) {
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

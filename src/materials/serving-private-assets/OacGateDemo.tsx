import { type Colors, drawBadge, FONT, lerp, palette, useCanvasScene } from "@/materials/shared";

// WAF → CloudFront → OAC → S3 경로를 허용 대역 층과 바깥 인터넷 층으로 나눠 차례로 재생하는 데모. 매 사이클 같은 장면을 보여주는 결정적 애니메이션이다.
const UNTIL = [1300, 2300, 3600, 4800, 6800, 9000] as const;
const CYCLE = 9000;
const HEIGHT = 262;

const LABELS = {
	ko: {
		captions: [
			"① 사무실 IP에서 요청이 온다",
			"② WAF가 허용 대역이라 통과시킨다",
			"③ 캐시에 없으면 OAC로 서명해 S3에 요청한다",
			"④ 버킷 정책이 서명을 확인하고 파일을 내준다",
			"⑤ 바깥 IP는 WAF에서 차단된다",
			"⑥ S3를 직접 부르면 버킷 정책이 거부한다",
		],
		laneInside: "사무실 · VPN에서",
		laneOutside: "바깥 인터넷에서",
		office: "사무실 · VPN",
		officeSub: "허용 대역",
		outside: "바깥 인터넷",
		outsideSub: "그 외 전부",
		direct: "S3 직접 호출",
		waf: "WAF",
		wafSub: "IP 확인",
		cf: "CloudFront",
		cfSub: "캐시 · OAC",
		s3: "S3",
		s3Sub: "버킷 정책",
		pass: "통과",
		block: "차단",
		signed: "OAC 서명",
		allowed: "허용",
		denied: "403",
		received: "파일 받음",
		aria: "WAF, CloudFront, OAC, S3를 지나는 요청 세 건을 위아래 두 층으로 나눠 반복 재생하는 애니메이션. 위층에서는 사무실 IP에서 온 요청은 WAF를 통과하고, CloudFront가 OAC로 서명해 S3에 요청하면 버킷 정책이 서명을 확인하고 파일을 내준다. 위층이 끝나면 아래층에서 바깥 IP에서 온 요청은 WAF에서 차단되고, CloudFront를 거치지 않고 S3를 직접 부른 요청은 서명이 없어 버킷 정책이 403으로 거부한다.",
	},
	en: {
		captions: [
			"① A request comes from an office IP",
			"② WAF passes it: allowed range",
			"③ Cache miss: sign with OAC, ask S3",
			"④ Bucket policy verifies it, returns the file",
			"⑤ An outside IP is blocked at WAF",
			"⑥ Calling S3 directly: bucket policy denies it",
		],
		laneInside: "From the office · VPN",
		laneOutside: "From the outside internet",
		office: "Office · VPN",
		officeSub: "allowed range",
		outside: "Outside",
		outsideSub: "other IPs",
		direct: "direct to S3",
		waf: "WAF",
		wafSub: "IP check",
		cf: "CloudFront",
		cfSub: "cache · OAC",
		s3: "S3",
		s3Sub: "bucket policy",
		pass: "pass",
		block: "blocked",
		signed: "OAC signature",
		allowed: "allowed",
		denied: "403",
		received: "file received",
		aria: "Animation replaying three requests through WAF, CloudFront, OAC and S3 in two layers. In the top layer a request from an office IP passes WAF, CloudFront signs with OAC and asks S3, and the bucket policy verifies the signature and returns the file. Once the top layer finishes, in the bottom layer a request from an outside IP is blocked at WAF, and a request that calls S3 directly without CloudFront has no signature and is denied with 403 by the bucket policy.",
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
	ctx.font = `600 12px ${FONT}`;
	ctx.fillText(title, cx, cy - 7);
	ctx.fillStyle = c.sub;
	ctx.font = `400 10px ${FONT}`;
	ctx.fillText(sub, cx, cy + 9);
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
	ctx.beginPath();
	ctx.arc(x, y, 5, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
	ctx.strokeStyle = color;
	ctx.lineWidth = 2.5;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(x - 6, y - 6);
	ctx.lineTo(x + 6, y + 6);
	ctx.moveTo(x + 6, y - 6);
	ctx.lineTo(x - 6, y + 6);
	ctx.stroke();
}

function makeScene(lang: Lang) {
	const L = LABELS[lang];
	return (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
		const c = palette(dark);
		const margin = 8;
		const boxW = Math.min(104, (w - margin * 2) / 4 - 12);
		const boxH = 44;
		const cyIn = 62;
		const cyOut = 168;
		const bypassY = cyOut + boxH / 2 + 22;

		const xs = [0, 1, 2, 3].map((i) => margin + boxW / 2 + i * ((w - margin * 2 - boxW) / 3));
		const [clientX, wafX, cfX, s3X] = xs;
		const step = UNTIL.findIndex((u) => t < u);
		const [s1, s2, s3End, s4, s5] = UNTIL;
		const outsideTurn = step >= 4;

		const drawLinks = (cy: number) => {
			ctx.strokeStyle = c.line;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			for (let i = 0; i < 3; i++) {
				ctx.moveTo(xs[i] + boxW / 2 + 4, cy);
				ctx.lineTo(xs[i + 1] - boxW / 2 - 4, cy);
			}
			ctx.stroke();
		};
		const laneName = (label: string, cy: number) => {
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.font = `600 11px ${FONT}`;
			ctx.fillStyle = c.sub;
			ctx.fillText(label, margin, cy - boxH / 2 - 12);
		};

		// 위층: 허용 대역. 아래층 차례가 오면 흐리게 둔다.
		ctx.save();
		ctx.globalAlpha = outsideTurn ? 0.45 : 1;
		laneName(L.laneInside, cyIn);
		drawLinks(cyIn);
		const received = step === 3 && t >= s4 - 200;
		drawBox(ctx, clientX, cyIn, boxW, boxH, L.office, received ? L.received : L.officeSub, c, received ? c.green : c.boxStroke);
		drawBox(ctx, wafX, cyIn, boxW, boxH, L.waf, L.wafSub, c, step === 1 ? c.green : c.boxStroke);
		drawBox(ctx, cfX, cyIn, boxW, boxH, L.cf, L.cfSub, c, step === 2 ? c.blue : c.boxStroke);
		drawBox(ctx, s3X, cyIn, boxW, boxH, L.s3, L.s3Sub, c, step === 3 ? c.green : c.boxStroke);
		const badgeIn = cyIn - boxH / 2 - 13;
		if (step === 0) {
			drawDot(ctx, lerp(clientX, wafX, t / s1), cyIn, c.blue);
		} else if (step === 1) {
			drawDot(ctx, wafX, cyIn, c.blue);
			drawBadge(ctx, wafX, badgeIn, L.pass, c.greenFill, c.green, 1);
		} else if (step === 2) {
			const p = (t - s2) / (s3End - s2);
			drawDot(ctx, lerp(wafX, s3X, p), cyIn, c.blue);
			if (p > 0.35) drawBadge(ctx, cfX, badgeIn, L.signed, c.blueFill, c.blue, 1);
		} else if (step === 3) {
			const p = (t - s3End) / (s4 - s3End);
			drawBadge(ctx, s3X, badgeIn, L.allowed, c.greenFill, c.green, 1);
			// 파일은 네모로 그려 요청 점과 구분한다
			const x = lerp(s3X, clientX, Math.min(1, p * 1.15));
			ctx.beginPath();
			ctx.roundRect(x - 7, cyIn - 5, 14, 10, 2);
			ctx.fillStyle = c.amberFill;
			ctx.fill();
			ctx.strokeStyle = c.amber;
			ctx.lineWidth = 1;
			ctx.stroke();
		}
		ctx.restore();

		// 아래층: 바깥 인터넷. 위층이 끝난 뒤에 돈다.
		ctx.save();
		ctx.globalAlpha = outsideTurn ? 1 : 0.45;
		laneName(L.laneOutside, cyOut);
		drawLinks(cyOut);
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(clientX, cyOut + boxH / 2 + 4);
		ctx.lineTo(clientX, bypassY);
		ctx.lineTo(s3X, bypassY);
		ctx.lineTo(s3X, cyOut + boxH / 2 + 4);
		ctx.stroke();
		ctx.setLineDash([]);
		const wafBlocked = step === 4 && t >= s4 + 1000;
		const s3Denied = step === 5 && t >= s5 + 1000;
		drawBox(ctx, clientX, cyOut, boxW, boxH, L.outside, step === 5 ? L.direct : L.outsideSub, c);
		drawBox(ctx, wafX, cyOut, boxW, boxH, L.waf, L.wafSub, c, wafBlocked ? c.red : c.boxStroke);
		drawBox(ctx, cfX, cyOut, boxW, boxH, L.cf, L.cfSub, c);
		drawBox(ctx, s3X, cyOut, boxW, boxH, L.s3, L.s3Sub, c, s3Denied ? c.red : c.boxStroke);
		const badgeOut = cyOut - boxH / 2 - 13;
		if (step === 4) {
			const p = Math.min(1, (t - s4) / 1000);
			if (p < 1) drawDot(ctx, lerp(clientX, wafX - boxW / 2 - 4, p), cyOut, c.blue);
			else {
				drawCross(ctx, wafX - boxW / 2 - 4, cyOut, c.red);
				drawBadge(ctx, wafX, badgeOut, L.block, c.redFill, c.red, 1);
			}
		} else if (step === 5) {
			// 우회 경로: 아래로 내려가 가로지른 뒤 S3 앞에서 멈춘다
			const p = Math.min(1, (t - s5) / 1000);
			if (p < 0.15) drawDot(ctx, clientX, lerp(cyOut + boxH / 2 + 4, bypassY, p / 0.15), c.blue);
			else if (p < 0.85) drawDot(ctx, lerp(clientX, s3X, (p - 0.15) / 0.7), bypassY, c.blue);
			else if (p < 1) drawDot(ctx, s3X, lerp(bypassY, cyOut + boxH / 2 + 4, (p - 0.85) / 0.15), c.blue);
			else {
				drawCross(ctx, s3X, cyOut + boxH / 2 + 4, c.red);
				drawBadge(ctx, s3X, badgeOut, L.denied, c.redFill, c.red, 1);
			}
		}
		ctx.restore();

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 12px ${FONT}`;
		ctx.fillStyle = c.text;
		ctx.fillText(L.captions[step], w / 2, HEIGHT - 22);
	};
}

// 언어별 drawScene을 모듈 수준에서 고정해 훅이 안정된 참조를 캡처하게 한다.
const SCENES = { ko: makeScene("ko"), en: makeScene("en") };

export default function OacGateDemo({ lang = "ko" }: { lang?: Lang }) {
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

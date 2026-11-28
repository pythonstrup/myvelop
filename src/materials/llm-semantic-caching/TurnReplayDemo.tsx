import { type Colors, clamp01, FONT, palette, useCanvasScene } from "@/materials/shared";
import type { Lang } from "./data";

// 문턱값 0.8에서 상담 대화를 끝까지 이어 간 장면. 첫 답만 모델이 만들고 나머지는 모두 캐시에서 나온다.
// 유사도는 시스템 프롬프트 37토큰과 그때까지의 실제 대화를 bge-m3(q8)에 넣어 잰 값이다. 대화는 한국어로 쟀고 영어는 번역이다.
const SIMS = [null, "0.869", "0.838", "0.845", "0.845"]; // 첫 요청은 모델이 답한다

const LABELS = {
	ko: {
		reply: "주문 번호를 알려 주시면 확인해 드리겠습니다",
		users: ["주문한 운동화가 아직 안 왔어요", "주문 번호는 A-1001이에요", "그럼 주소를 바꿀 수 있나요?", "교환하면 배송비는 누가 내나요?", "그럼 그냥 환불해 주세요"],
		model: "모델이 답함",
		cache: "캐시",
		title: "문턱값 0.8",
		captions: [
			"① 저장된 답이 없어 모델이 답하고 저장한다",
			"② 0.869로 적중해 첫 요청의 답이 나간다",
			"③ 무엇을 물어도 같은 답이 나간다",
			"③ 무엇을 물어도 같은 답이 나간다",
			"④ 환불해 달라고 해도 같은 답이 나간다",
		],
		aria: "문턱값 0.8에서 이어지는 상담 대화를 재생하는 애니메이션. 첫 질문 「주문한 운동화가 아직 안 왔어요」에는 모델이 「주문 번호를 알려 주시면 확인해 드리겠습니다」라고 답하고 이 답이 저장된다. 이어서 주문 번호를 알려 줘도, 주소 변경을 물어도, 교환 배송비를 물어도, 환불해 달라고 해도 유사도가 각각 0.869, 0.838, 0.845, 0.845로 문턱값을 넘어 첫 답이 네 번 되풀이된다.",
	},
	en: {
		reply: "Tell me your order number and I'll check",
		users: ["The sneakers I ordered haven't arrived yet", "My order number is A-1001", "Then can I change the address?", "Who pays shipping for an exchange?", "Then just give me a refund"],
		model: "model answered",
		cache: "cache",
		title: "Threshold 0.8",
		captions: [
			"① Nothing stored yet: the model answers, and it is saved",
			"② Hits at 0.869, and the first answer goes out",
			"③ Whatever the user says, the same answer goes out",
			"③ Whatever the user says, the same answer goes out",
			"④ Even a refund request gets the same answer",
		],
		aria: "Animation of a support conversation at a threshold of 0.8. To the first message, \"The sneakers I ordered haven't arrived yet\", the model answers \"Tell me your order number and I'll check\", and that answer is stored. After that, whether the user gives the order number, asks to change the address, asks about the exchange shipping fee, or asks for a refund, the similarities of 0.869, 0.838, 0.845, and 0.845 clear the threshold, and the first answer repeats four times. The conversation was measured in Korean and is shown translated.",
	},
};
type Labels = (typeof LABELS)["ko"];
const TURNS = SIMS.map((sim) => ({ sim, cached: sim !== null }));
const TURN_MS = 1900;
const REPLY_AT = 0.45;
const CYCLE = TURN_MS * TURNS.length + 2600;
const ROW_H = 64;
const TOP = 26;
const HEIGHT = TOP + ROW_H * TURNS.length + 28;

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, fill: string, stroke: string) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, 25, 9);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.lineWidth = 1.2;
	ctx.stroke();
}

function drawTurn(ctx: CanvasRenderingContext2D, c: Colors, l: Labels, left: number, width: number, i: number, p: number) {
	const turn = { ...TURNS[i], user: l.users[i], badge: TURNS[i].sim === null ? l.model : `${l.cache} ${TURNS[i].sim}` };
	const REPLY = l.reply;
	const y = TOP + ROW_H * i;
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";

	// 사용자 말풍선은 오른쪽
	ctx.globalAlpha = clamp01(p / 0.15);
	ctx.font = `500 12px ${FONT}`;
	const uw = ctx.measureText(turn.user).width + 22;
	bubble(ctx, left + width - uw, y, uw, c.blueFill, c.blue);
	ctx.fillStyle = c.text;
	ctx.fillText(turn.user, left + width - uw + 11, y + 13);

	// 챗봇 말풍선은 왼쪽, 답이 나온 곳을 옆에 적는다
	ctx.globalAlpha = clamp01((p - REPLY_AT) / 0.15);
	const bw = ctx.measureText(REPLY).width + 22;
	bubble(ctx, left, y + 30, bw, turn.cached ? c.amberFill : c.boxFill, turn.cached ? c.amber : c.boxStroke);
	ctx.fillStyle = c.text;
	ctx.fillText(REPLY, left + 11, y + 43);
	ctx.font = `600 11px ${FONT}`;
	ctx.fillStyle = turn.cached ? c.amber : c.green;
	// 좁은 화면에서는 말풍선 옆에 자리가 없어 사용자 말풍선 줄의 왼쪽에 적는다
	const badgeW = ctx.measureText(turn.badge).width;
	if (bw + 8 + badgeW <= width) ctx.fillText(turn.badge, left + bw + 8, y + 43);
	else ctx.fillText(turn.badge, left + 2, y + 13);
	ctx.globalAlpha = 1;
}

const makeScene = (l: Labels) => (ctx: CanvasRenderingContext2D, w: number, t: number, dark: boolean) => {
	const c = palette(dark);
	const width = Math.min(440, w - 8);
	const left = (w - width) / 2;
	const idx = Math.min(TURNS.length - 1, Math.floor(t / TURN_MS));

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `700 12.5px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(l.title, left, 10);

	for (let i = 0; i <= idx; i++) drawTurn(ctx, c, l, left, width, i, i < idx ? 1 : clamp01((t - idx * TURN_MS) / TURN_MS));

	ctx.textAlign = "center";
	ctx.font = `500 12px ${FONT}`;
	ctx.fillStyle = c.text;
	ctx.fillText(l.captions[idx], w / 2, HEIGHT - 12);
};

const SCENES = { ko: makeScene(LABELS.ko), en: makeScene(LABELS.en) };

export default function TurnReplayDemo({ lang = "ko" }: { lang?: Lang }) {
	const { containerRef, canvasRef } = useCanvasScene(HEIGHT, CYCLE, SCENES[lang]);
	return (
		<div ref={containerRef} style={{ margin: "1.5rem 0" }}>
			<canvas ref={canvasRef} role="img" aria-label={LABELS[lang].aria} style={{ display: "block", width: "100%" }} />
		</div>
	);
}

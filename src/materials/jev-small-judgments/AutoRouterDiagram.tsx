import { SVG_STYLE } from "./colors";

// LiteLLM 자동 라우터가 Jev를 분류기로 두고 choice 질문 하나로 보낼 모델을 고르는 그림.
// 고른 모델은 예시일 뿐이라 확률은 적지 않는다. 정적 SVG로 SSR에서만 렌더링한다.
const LABELS = {
	ko: {
		title: "LiteLLM 자동 라우터",
		request: "요청",
		requestSub: "메시지",
		jev: "Jev 분류기",
		jevSub: "choice 질문 하나",
		question: ["어느 모델로", "보낼까?"],
		models: ["작은 모델", "중간 모델", "큰 모델"],
		note: "비싼 모델을 부르기 전에 작은 판단 하나를 둔다",
		aria: "LiteLLM 자동 라우터가 Jev를 분류기로 쓰는 그림. 요청이 들어오면 Jev 분류기가 어느 모델로 보낼지 묻는 choice 질문 하나에 답하고, 고른 모델로 요청을 보낸다. 예시에서는 작은 모델, 중간 모델, 큰 모델 가운데 작은 모델을 골랐다. 비싼 모델을 부르기 전에 작은 판단 하나를 두는 구조다.",
	},
	en: {
		title: "LiteLLM auto router",
		request: "Request",
		requestSub: "message",
		jev: "Jev classifier",
		jevSub: "one choice question",
		question: ["Which model", "should take it?"],
		models: ["Small model", "Mid model", "Large model"],
		note: "One small judgment before an expensive model is called",
		aria: "Diagram of the LiteLLM auto router using Jev as its classifier. When a request comes in, the Jev classifier answers one choice question about which model should take it, and the request goes to the chosen model. In this example it picks the small model out of a small, a mid, and a large model. The structure puts one small judgment before an expensive model is called.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 400;
const TOP = 30;
const REQ_X = 8;
const REQ_W = 76;
const REQ_H = 48;
const JEV_X = 112;
const JEV_W = 150;
const JEV_H = 116;
const MODEL_X = 296;
const MODEL_W = W - 8 - MODEL_X;
const MODEL_H = 32;
const MODEL_STEP = 42;
const CHOSEN = 0; // 예시로 고른 모델
const MID_Y = TOP + JEV_H / 2;
const NOTE_Y = TOP + JEV_H + 26;
const HEIGHT = NOTE_Y + 10;

export default function AutoRouterDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const fg = "var(--foreground)";
	const muted = "var(--muted-foreground)";
	const modelY = (i: number) => MID_Y - MODEL_H / 2 + (i - 1) * MODEL_STEP;

	return (
		<svg viewBox={`0 0 ${W} ${HEIGHT}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<defs>
				<marker id="jv-ar-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M0,0 L8,4 L0,8 z" fill={muted} />
				</marker>
			</defs>
			<text x={8} y={16} fontSize="13" fontWeight="700" fill={fg}>
				{L.title}
			</text>

			{/* 요청 */}
			<rect x={REQ_X} y={MID_Y - REQ_H / 2} width={REQ_W} height={REQ_H} rx={8} className="jv-box jv-box-line" strokeWidth={1.2} />
			<text x={REQ_X + REQ_W / 2} y={MID_Y - 3} fontSize="12.5" fontWeight="700" textAnchor="middle" fill={fg}>
				{L.request}
			</text>
			<text x={REQ_X + REQ_W / 2} y={MID_Y + 14} fontSize="11" textAnchor="middle" fill={muted}>
				{L.requestSub}
			</text>
			<line x1={REQ_X + REQ_W} x2={JEV_X - 2} y1={MID_Y} y2={MID_Y} stroke={muted} strokeWidth={1.4} markerEnd="url(#jv-ar-arrow)" />

			{/* Jev 분류기 */}
			<rect x={JEV_X} y={TOP} width={JEV_W} height={JEV_H} rx={10} className="jv-blue-soft jv-blue-line" strokeWidth={1.4} />
			<text x={JEV_X + JEV_W / 2} y={TOP + 22} fontSize="13" fontWeight="700" textAnchor="middle" className="jv-blue">
				{L.jev}
			</text>
			<text x={JEV_X + JEV_W / 2} y={TOP + 39} fontSize="11" textAnchor="middle" fill={muted}>
				{L.jevSub}
			</text>
			<rect x={JEV_X + 12} y={TOP + 52} width={JEV_W - 24} height={50} rx={6} fill="var(--background)" stroke={muted} strokeOpacity={0.4} />
			{L.question.map((line, i) => (
				<text key={line} x={JEV_X + JEV_W / 2} y={TOP + 73 + i * 16} fontSize="11.5" textAnchor="middle" fill={fg}>
					{line}
				</text>
			))}

			{/* 모델 */}
			{L.models.map((model, i) => {
				const y = modelY(i);
				const chosen = i === CHOSEN;
				return (
					<g key={model}>
						<line
							x1={JEV_X + JEV_W}
							x2={MODEL_X - 2}
							y1={MID_Y}
							y2={y + MODEL_H / 2}
							stroke={muted}
							strokeWidth={chosen ? 1.6 : 1.2}
							strokeOpacity={chosen ? 1 : 0.5}
							strokeDasharray={chosen ? undefined : "4 4"}
							markerEnd={chosen ? "url(#jv-ar-arrow)" : undefined}
						/>
						<rect
							x={MODEL_X}
							y={y}
							width={MODEL_W}
							height={MODEL_H}
							rx={8}
							className={chosen ? "jv-amber-soft jv-amber-line" : "jv-box jv-box-line"}
							strokeWidth={chosen ? 1.8 : 1.2}
							strokeDasharray={chosen ? undefined : "4 3"}
						/>
						<text x={MODEL_X + MODEL_W / 2} y={y + MODEL_H / 2 + 4} fontSize="12" fontWeight={chosen ? 700 : 500} textAnchor="middle" fill={chosen ? fg : muted}>
							{model}
						</text>
					</g>
				);
			})}

			<text x={W / 2} y={NOTE_Y} fontSize="11.5" textAnchor="middle" fill={muted}>
				{L.note}
			</text>
		</svg>
	);
}

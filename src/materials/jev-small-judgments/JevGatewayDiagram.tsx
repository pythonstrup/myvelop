import { SVG_STYLE } from "./colors";

// 서비스 → LiteLLM 프록시 → TypeSafe API 구조. 프록시 안의 두 경로(패스스루, 통합 경로)를 위아래로 둔다.
// 서비스는 LiteLLM 가상 키만 들고, TypeSafe 키는 프록시에만 있다. 정적 SVG로 SSR에서만 렌더링한다.
const LABELS = {
	ko: {
		service: "서비스",
		serviceSub: "LiteLLM 가상 키만 보낸다",
		proxy: "LiteLLM 프록시",
		keyNote: "프록시에만 둔다",
		passPath: "/typesafe/*",
		passName: " 패스스루",
		passNotes: ["요청을 그대로 TypeSafe API에 넘긴다", "비용과 로그를 다른 모델과 같은 자리에 남긴다", "스트리밍과 최종 사용자 추적은 지원하지 않는다"],
		unifiedPath: "/v1/systemone",
		unifiedName: " 통합 경로",
		unifiedNotes: ["model_list에 Jev를 올려 둔다", "배포 여러 개로 부하를 나누고 대체 모델로 넘긴다"],
		api: "TypeSafe API",
		apiSub: "Jev",
		aria: "서비스가 LiteLLM 프록시를 거쳐 TypeSafe API의 Jev를 부르는 구조를 그린 그림. 서비스는 LiteLLM 가상 키만 보내고, TYPESAFE_API_KEY는 프록시에만 둔다. 프록시에는 경로가 둘 있다. /typesafe/* 패스스루는 요청을 그대로 TypeSafe API에 넘기고, 비용과 로그를 다른 모델과 같은 자리에 남기며, 스트리밍과 최종 사용자 추적은 지원하지 않는다. /v1/systemone 통합 경로는 model_list에 Jev를 올려 두고, 배포 여러 개로 부하를 나누거나 대체 모델로 넘긴다.",
	},
	en: {
		service: "Service",
		serviceSub: "sends only a LiteLLM virtual key",
		proxy: "LiteLLM proxy",
		keyNote: "lives only here",
		passPath: "/typesafe/*",
		passName: " pass-through",
		passNotes: ["Forwards requests to the TypeSafe API as is", "Records cost and logs beside other models", "No streaming or per-end-user tracking"],
		unifiedPath: "/v1/systemone",
		unifiedName: " unified route",
		unifiedNotes: ["Lists Jev in model_list", "Spreads load across deployments and falls back"],
		api: "TypeSafe API",
		apiSub: "Jev",
		aria: "Diagram of a service calling Jev on the TypeSafe API through a LiteLLM proxy. The service sends only a LiteLLM virtual key, and TYPESAFE_API_KEY lives only on the proxy. The proxy has two routes. The /typesafe/* pass-through forwards requests to the TypeSafe API as is and records cost and logs beside other models, but does not support streaming or per-end-user tracking. The /v1/systemone unified route lists Jev in model_list to spread load across deployments or fall back to another model.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 400;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const END_X = 90;
const END_W = W - END_X * 2;
const END_H = 48;
const SVC_Y = 8;
const PROXY_Y = SVC_Y + END_H + 28;
const KEY_X = 232;
const KEY_W = W - 20 - KEY_X;
const KEY_Y = PROXY_Y + 8;
const KEY_H = 38;
const ROW_X = 20;
const ROW_W = W - ROW_X * 2;
const NOTE_STEP = 17;
const PASS_Y = KEY_Y + KEY_H + 10;
const PASS_H = 30 + 3 * NOTE_STEP;
const UNIFIED_Y = PASS_Y + PASS_H + 10;
const UNIFIED_H = 30 + 2 * NOTE_STEP;
const PROXY_BOTTOM = UNIFIED_Y + UNIFIED_H + 12;
const API_Y = PROXY_BOTTOM + 28;
const HEIGHT = API_Y + END_H + 8;

export default function JevGatewayDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const fg = "var(--foreground)";
	const muted = "var(--muted-foreground)";
	const box = { className: "jv-box jv-box-line", strokeWidth: 1.2 } as const;
	const arrow = { stroke: muted, strokeWidth: 1.4, markerEnd: "url(#jv-gw-arrow)" } as const;

	const route = (y: number, h: number, path: string, name: string, notes: readonly string[]) => (
		<g>
			<rect x={ROW_X} y={y} width={ROW_W} height={h} rx={8} fill="var(--background)" stroke={muted} strokeOpacity={0.5} strokeWidth={1.2} />
			<text x={ROW_X + 12} y={y + 20} fontSize="12.5" fill={fg}>
				<tspan fontFamily={MONO} fontWeight="700">
					{path}
				</tspan>
				<tspan fontWeight="600">{name}</tspan>
			</text>
			{notes.map((note, i) => (
				<text key={note} x={ROW_X + 12} y={y + 38 + i * NOTE_STEP} fontSize="11.5" fill={muted}>
					{note}
				</text>
			))}
		</g>
	);

	return (
		<svg viewBox={`0 0 ${W} ${HEIGHT}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{SVG_STYLE}</style>
			<defs>
				<marker id="jv-gw-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M0,0 L8,4 L0,8 z" fill={muted} />
				</marker>
			</defs>

			{/* 서비스 */}
			<rect x={END_X} y={SVC_Y} width={END_W} height={END_H} rx={8} {...box} />
			<text x={W / 2} y={SVC_Y + 20} fontSize="13.5" fontWeight="700" textAnchor="middle" fill={fg}>
				{L.service}
			</text>
			<text x={W / 2} y={SVC_Y + 37} fontSize="11.5" textAnchor="middle" fill={muted}>
				{L.serviceSub}
			</text>
			<line x1={W / 2} x2={W / 2} y1={SVC_Y + END_H} y2={PROXY_Y - 2} {...arrow} />

			{/* 프록시 */}
			<rect x={8} y={PROXY_Y} width={W - 16} height={PROXY_BOTTOM - PROXY_Y} rx={10} {...box} />
			<text x={ROW_X} y={KEY_Y + 24} fontSize="14" fontWeight="700" fill={fg}>
				{L.proxy}
			</text>
			<rect x={KEY_X} y={KEY_Y} width={KEY_W} height={KEY_H} rx={6} fill="var(--background)" stroke={muted} strokeOpacity={0.5} />
			<text x={KEY_X + KEY_W / 2} y={KEY_Y + 16} fontSize="11" fontFamily={MONO} fontWeight="700" textAnchor="middle" fill={fg}>
				TYPESAFE_API_KEY
			</text>
			<text x={KEY_X + KEY_W / 2} y={KEY_Y + 31} fontSize="11" textAnchor="middle" fill={muted}>
				{L.keyNote}
			</text>
			{route(PASS_Y, PASS_H, L.passPath, L.passName, L.passNotes)}
			{route(UNIFIED_Y, UNIFIED_H, L.unifiedPath, L.unifiedName, L.unifiedNotes)}
			<line x1={W / 2} x2={W / 2} y1={PROXY_BOTTOM} y2={API_Y - 2} {...arrow} />

			{/* TypeSafe API */}
			<rect x={END_X} y={API_Y} width={END_W} height={END_H} rx={8} className="jv-blue-soft jv-blue-line" strokeWidth={1.4} />
			<text x={W / 2} y={API_Y + 20} fontSize="13.5" fontWeight="700" textAnchor="middle" className="jv-blue">
				{L.api}
			</text>
			<text x={W / 2} y={API_Y + 37} fontSize="11.5" textAnchor="middle" fill={muted}>
				{L.apiSub}
			</text>
		</svg>
	);
}

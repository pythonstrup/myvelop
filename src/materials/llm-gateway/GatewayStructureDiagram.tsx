// 직접 호출과 게이트웨이를 거친 호출의 연결 구조를 위아래로 비교한다. 정적 SVG로 SSR에서만 렌더링한다.
// 게이트웨이 쪽 연결선만 흐르게 해서 요청이 한 곳으로 모이는 모습을 강조한다.
const LABELS = {
	ko: {
		directTitle: "직접 호출",
		gatewayTitle: "LLM 게이트웨이",
		services: ["요약 서비스", "세무 서비스", "재무 서비스"],
		directSub: "SDK·키·재시도 코드",
		gatewaySub: "OpenAI SDK 하나",
		providers: ["OpenAI", "Anthropic", "Gemini"],
		gateway: "게이트웨이",
		roles: ["형식 변환", "fallback·재시도", "제공자 키", "사용량 집계"],
		directNote: "실선은 지금 쓰는 연결, 점선은 fallback·모델 교체로 늘어나는 연결",
		gatewayNote: "서비스는 게이트웨이 하나만 알고, 나머지는 게이트웨이가 맡는다",
		aria: "직접 호출과 LLM 게이트웨이의 연결 구조를 비교한 그림. 직접 호출에서는 요약, 세무, 재무 서비스가 각자 SDK와 키, 재시도 코드를 갖고 OpenAI, Anthropic, Gemini에 연결된다. 지금은 요약이 OpenAI, 세무가 Anthropic, 재무가 Gemini를 쓰지만 fallback이나 모델 교체를 붙일 때마다 서비스와 제공자 사이의 연결이 최대 9개까지 늘어난다. 게이트웨이를 두면 세 서비스는 OpenAI SDK 하나로 게이트웨이에만 연결되고, 게이트웨이가 형식 변환, fallback과 재시도, 제공자 키, 사용량 집계를 맡아 세 제공자에 연결된다.",
	},
	en: {
		directTitle: "Direct calls",
		gatewayTitle: "LLM gateway",
		services: ["Summary", "Tax", "Finance"],
		directSub: "SDK, keys, retry code",
		gatewaySub: "one OpenAI SDK",
		providers: ["OpenAI", "Anthropic", "Gemini"],
		gateway: "Gateway",
		roles: ["Format translation", "Fallback, retries", "Provider keys", "Usage tracking"],
		directNote: "Solid: connections in use. Dashed: added by fallbacks and model swaps",
		gatewayNote: "Services know only the gateway; the gateway handles the rest",
		aria: "Diagram comparing the connections of direct calls and an LLM gateway. With direct calls, the summary, tax, and finance services each hold their own SDKs, keys, and retry code and connect to OpenAI, Anthropic, and Gemini. Today summary uses OpenAI, tax uses Anthropic, and finance uses Gemini, but every fallback or model swap adds a connection, up to nine between services and providers. With a gateway, the three services connect only to the gateway through one OpenAI SDK, and the gateway handles format translation, fallbacks and retries, provider keys, and usage tracking while connecting to the three providers.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 460;
const ROW_H = 48;
const ROW_GAP = 14;
const rowY = (top: number, i: number) => top + i * (ROW_H + ROW_GAP);
const rowMid = (top: number, i: number) => rowY(top, i) + ROW_H / 2;

// 직접 호출 구역
const D_TOP = 38;
const D_SVC_X = 8;
const D_SVC_W = 150;
const D_PRV_X = W - 8 - 130;
const D_PRV_W = 130;
// 게이트웨이 구역
const G_HEAD = 272;
const G_TOP = G_HEAD + 30;
const G_SVC_X = 8;
const G_SVC_W = 132;
const G_GW_X = 172;
const G_GW_W = 128;
const G_PRV_X = W - 8 - 120;
const G_PRV_W = 120;
const G_BOTTOM = rowY(G_TOP, 2) + ROW_H;
const HEIGHT = G_BOTTOM + 34;

export default function GatewayStructureDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45, strokeWidth: 1.2 } as const;
	const title = { fontSize: 15, fontWeight: 700, fill: "var(--foreground)" } as const;
	const name = { fontSize: 14, fontWeight: 600, fill: "var(--foreground)", textAnchor: "middle" } as const;
	const sub = { fontSize: 12, fill: "var(--muted-foreground)", textAnchor: "middle" } as const;
	const note = { fontSize: 12, fill: "var(--muted-foreground)", textAnchor: "middle" } as const;
	const wire = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, fill: "none" } as const;
	const roleH = (G_BOTTOM - G_TOP - 40) / L.roles.length;

	// 지금 쓰는 연결: 요약 → OpenAI, 세무 → Anthropic, 재무 → Gemini
	const inUse = (s: number, p: number) => s === p;

	return (
		<svg viewBox={`0 0 ${W} ${HEIGHT}`} role="img" aria-label={L.aria} style={{ display: "block", maxWidth: W, margin: "2rem auto" }}>
			<style>{`
				.gw-flow { stroke-dasharray: 6 6; animation: gw-dash 0.9s linear infinite; }
				@keyframes gw-dash { to { stroke-dashoffset: -12; } }
				@media (prefers-reduced-motion: reduce) { .gw-flow { animation: none; } }
			`}</style>

			{/* 직접 호출 */}
			<text x={8} y={20} {...title}>
				{L.directTitle}
			</text>
			{[0, 1, 2].map((s) =>
				[0, 1, 2].map((p) => (
					<line
						key={`d-${s}-${p}`}
						x1={D_SVC_X + D_SVC_W}
						y1={rowMid(D_TOP, s)}
						x2={D_PRV_X}
						y2={rowMid(D_TOP, p)}
						{...wire}
						strokeOpacity={inUse(s, p) ? 0.9 : 0.4}
						strokeDasharray={inUse(s, p) ? undefined : "4 4"}
					/>
				)),
			)}
			{L.services.map((svc, i) => (
				<g key={`d-svc-${svc}`}>
					<rect x={D_SVC_X} y={rowY(D_TOP, i)} width={D_SVC_W} height={ROW_H} rx={8} {...box} />
					<text x={D_SVC_X + D_SVC_W / 2} y={rowY(D_TOP, i) + 20} {...name}>
						{svc}
					</text>
					<text x={D_SVC_X + D_SVC_W / 2} y={rowY(D_TOP, i) + 37} {...sub}>
						{L.directSub}
					</text>
				</g>
			))}
			{L.providers.map((prv, i) => (
				<g key={`d-prv-${prv}`}>
					<rect x={D_PRV_X} y={rowY(D_TOP, i)} width={D_PRV_W} height={ROW_H} rx={8} {...box} />
					<text x={D_PRV_X + D_PRV_W / 2} y={rowMid(D_TOP, i) + 5} {...name}>
						{prv}
					</text>
				</g>
			))}
			<text x={W / 2} y={rowY(D_TOP, 2) + ROW_H + 24} {...note}>
				{L.directNote}
			</text>

			{/* 구역 구분선 */}
			<line x1={8} x2={W - 8} y1={G_HEAD - 22} y2={G_HEAD - 22} stroke="rgb(var(--gray))" strokeOpacity={0.25} />

			{/* 게이트웨이 */}
			<text x={8} y={G_HEAD} {...title}>
				{L.gatewayTitle}
			</text>
			{[0, 1, 2].map((i) => (
				<g key={`g-wire-${i}`}>
					<line className="gw-flow" x1={G_SVC_X + G_SVC_W} y1={rowMid(G_TOP, i)} x2={G_GW_X} y2={rowMid(G_TOP, i)} {...wire} />
					<line className="gw-flow" x1={G_GW_X + G_GW_W} y1={rowMid(G_TOP, i)} x2={G_PRV_X} y2={rowMid(G_TOP, i)} {...wire} />
				</g>
			))}
			{L.services.map((svc, i) => (
				<g key={`g-svc-${svc}`}>
					<rect x={G_SVC_X} y={rowY(G_TOP, i)} width={G_SVC_W} height={ROW_H} rx={8} {...box} />
					<text x={G_SVC_X + G_SVC_W / 2} y={rowY(G_TOP, i) + 20} {...name}>
						{svc}
					</text>
					<text x={G_SVC_X + G_SVC_W / 2} y={rowY(G_TOP, i) + 37} {...sub}>
						{L.gatewaySub}
					</text>
				</g>
			))}
			<rect
				x={G_GW_X}
				y={G_TOP}
				width={G_GW_W}
				height={G_BOTTOM - G_TOP}
				rx={10}
				fill="var(--background)"
				stroke="var(--accent)"
				strokeWidth={1.8}
			/>
			<text x={G_GW_X + G_GW_W / 2} y={G_TOP + 26} {...name} fill="var(--accent)">
				{L.gateway}
			</text>
			{L.roles.map((role, i) => (
				<g key={role}>
					<rect
						x={G_GW_X + 10}
						y={G_TOP + 38 + i * roleH}
						width={G_GW_W - 20}
						height={roleH - 6}
						rx={6}
						fill="var(--secondary)"
					/>
					<text x={G_GW_X + G_GW_W / 2} y={G_TOP + 38 + i * roleH + (roleH - 6) / 2 + 4} {...sub} fill="var(--foreground)">
						{role}
					</text>
				</g>
			))}
			{L.providers.map((prv, i) => (
				<g key={`g-prv-${prv}`}>
					<rect x={G_PRV_X} y={rowY(G_TOP, i)} width={G_PRV_W} height={ROW_H} rx={8} {...box} />
					<text x={G_PRV_X + G_PRV_W / 2} y={rowMid(G_TOP, i) + 5} {...name}>
						{prv}
					</text>
				</g>
			))}
			<text x={W / 2} y={G_BOTTOM + 24} {...note}>
				{L.gatewayNote}
			</text>
		</svg>
	);
}

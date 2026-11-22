// 같은 계정을 두 서비스가 쓸 때 한도를 나누는 네 방식에서 외부 API까지 가는 길.
// ① 계정 분리 ② 한도 배분(60/40) ③ 카운터 공유 ④ 발송 워커 공유.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: "같은 계정을 두 서비스가 쓸 때",
		panels: ["① 계정을 나눈다", "② 한도를 배분한다", "③ 카운터를 공유한다", "④ 발송 워커를 공유한다"],
		ours: "우리 서비스",
		theirs: "옆 서비스",
		api: "외부 API",
		accountOne: "계정 하나 · 100",
		accountA: "계정 A · 100",
		accountB: "계정 B · 100",
		share: ["60", "40"],
		agreement: "합의한 몫",
		counter: "공유 카운터",
		ask: "자리 받기",
		queue: "큐",
		worker: ["워커", "limiter"],
		message: "완성된 메시지",
		aria: "같은 계정을 우리 서비스와 옆 서비스가 함께 쓸 때 한도를 나누는 네 방식. 첫째, 계정을 나누면 우리 서비스는 계정 A, 옆 서비스는 계정 B로 보내고 계정마다 한도가 100이다. 둘째, 한도를 배분하면 두 서비스가 계정 하나로 보내되 합의한 몫 60과 40을 각자 지킨다. 셋째, 카운터를 공유하면 두 서비스가 보내기 전에 공유 카운터에서 자리를 받고 각자 계정 하나로 보낸다. 넷째, 발송 워커를 공유하면 두 서비스가 완성된 메시지를 큐 하나에 넣고, 워커 하나가 limiter를 지키며 계정 하나로 보낸다.",
	},
	en: {
		title: "Two services, one account",
		panels: ["① split the account", "② allocate the limit", "③ share the counter", "④ share the send worker"],
		ours: "our service",
		theirs: "other service",
		api: "external API",
		accountOne: "one account · 100",
		accountA: "account A · 100",
		accountB: "account B · 100",
		share: ["60", "40"],
		agreement: "agreed shares",
		counter: "shared counter",
		ask: "take a slot",
		queue: "queue",
		worker: ["worker", "limiter"],
		message: "ready messages",
		aria: "Four ways to divide one account's limit between our service and another service. First, splitting the account: our service sends through account A and the other through account B, each with a limit of 100. Second, allocating the limit: both send through one account, each keeping to an agreed share of 60 and 40. Third, sharing the counter: both take a slot from a shared counter before sending, then send through the one account themselves. Fourth, sharing the send worker: both put finished messages into one queue, and one worker keeps the limiter and sends through the one account.",
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 460;
const PANEL_H = 124;
const GAP = 10;
const TOP = 32;
const H = TOP + (PANEL_H + GAP) * 4;
const SVC_X = 16;
const SVC_W = 92;
const BOX_H = 28;
const API_X = 348;
const API_W = 96;

function Box({ x, y, w, h = BOX_H, title, sub, tone = "plain" }: { x: number; y: number; w: number; h?: number; title: string; sub?: string; tone?: "plain" | "accent" | "dashed" }) {
	return (
		<g>
			<rect
				x={x}
				y={y}
				width={w}
				height={h}
				rx="7"
				fill="var(--background)"
				stroke={tone === "accent" ? "var(--accent)" : "rgb(var(--gray))"}
				strokeOpacity={tone === "accent" ? 0.85 : 0.6}
				strokeWidth={tone === "accent" ? 1.5 : 1.1}
				strokeDasharray={tone === "dashed" ? "4 3" : undefined}
			/>
			<text x={x + w / 2} y={sub ? y + h / 2 - 3 : y + h / 2 + 4} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--foreground)">
				{title}
			</text>
			{sub ? (
				<text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize="10.5" fill={tone === "accent" ? "var(--accent)" : "var(--muted-foreground)"}>
					{sub}
				</text>
			) : null}
		</g>
	);
}

export default function SharedAccountDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.4, markerEnd: "url(#sa-arrow)" } as const;
	const panelY = (i: number) => TOP + i * (PANEL_H + GAP);
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.aria} style={{ display: "block", maxWidth: W, margin: "1.75rem auto" }}>
			<defs>
				<marker id="sa-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="20" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title}
			</text>

			{T.panels.map((name, i) => {
				const y = panelY(i);
				const s1 = y + 34;
				const s2 = y + 84;
				const c1 = s1 + BOX_H / 2;
				const c2 = s2 + BOX_H / 2;
				const apiY = y + 34;
				const apiH = 78;
				return (
					<g key={name}>
						<rect x="4" y={y} width={W - 8} height={PANEL_H} rx="10" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.25" />
						<text x="14" y={y + 21} fontSize="12.5" fontWeight="700" fill="var(--foreground)">
							{name}
						</text>
						<Box x={SVC_X} y={s1} w={SVC_W} title={T.ours} />
						<Box x={SVC_X} y={s2} w={SVC_W} title={T.theirs} />

						{i === 0 ? (
							<g>
								<Box x={API_X} y={s1} w={API_W} title={T.accountA} tone="accent" />
								<Box x={API_X} y={s2} w={API_W} title={T.accountB} tone="accent" />
								<line {...line} x1={SVC_X + SVC_W} y1={c1} x2={API_X - 3} y2={c1} />
								<line {...line} x1={SVC_X + SVC_W} y1={c2} x2={API_X - 3} y2={c2} />
								<text x={API_X + API_W / 2} y={y + 27} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
									{T.api}
								</text>
							</g>
						) : (
							<Box x={API_X} y={apiY} w={API_W} h={apiH} title={T.api} sub={T.accountOne} tone="accent" />
						)}

						{i === 1 ? (
							<g>
								<line {...line} x1={SVC_X + SVC_W} y1={c1} x2={API_X - 3} y2={c1} />
								<line {...line} x1={SVC_X + SVC_W} y1={c2} x2={API_X - 3} y2={c2} />
								<text x="228" y={c1 - 6} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--foreground)">
									{T.share[0]}
								</text>
								<text x="228" y={c2 - 6} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--foreground)">
									{T.share[1]}
								</text>
								<text x="228" y={(c1 + c2) / 2 + 4} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
									{T.agreement}
								</text>
							</g>
						) : null}

						{i === 2 ? (
							<g>
								<line {...line} x1={SVC_X + SVC_W} y1={c1} x2={API_X - 3} y2={c1} />
								<line {...line} x1={SVC_X + SVC_W} y1={c2} x2={API_X - 3} y2={c2} />
								<Box x={176} y={(c1 + c2) / 2 - 14} w={104} title={T.counter} tone="dashed" />
								<line x1={196} y1={c1} x2={196} y2={(c1 + c2) / 2 - 14} stroke="rgb(var(--gray))" strokeOpacity="0.7" strokeDasharray="3 3" />
								<line x1={196} y1={(c1 + c2) / 2 + 14} x2={196} y2={c2} stroke="rgb(var(--gray))" strokeOpacity="0.7" strokeDasharray="3 3" />
								<text x={288} y={(c1 + c2) / 2 + 4} fontSize="10.5" fill="var(--muted-foreground)">
									{T.ask}
								</text>
							</g>
						) : null}

						{i === 3 ? (
							<g>
								<Box x={164} y={(c1 + c2) / 2 - 22} w={86} h={44} title={T.queue} sub={T.message} />
								<Box x={266} y={(c1 + c2) / 2 - 22} w={62} h={44} title={T.worker[0]} sub={T.worker[1]} tone="accent" />
								<line {...line} x1={SVC_X + SVC_W} y1={c1} x2={161} y2={(c1 + c2) / 2 - 8} />
								<line {...line} x1={SVC_X + SVC_W} y1={c2} x2={161} y2={(c1 + c2) / 2 + 8} />
								<line {...line} x1={250} y1={(c1 + c2) / 2} x2={263} y2={(c1 + c2) / 2} />
								<line {...line} x1={328} y1={(c1 + c2) / 2} x2={API_X - 3} y2={(c1 + c2) / 2} />
							</g>
						) : null}
					</g>
				);
			})}
		</svg>
	);
}

// Kafka를 작업 큐로 쓸 때 맞지 않는 두 곳.
// ① 오프셋 3번만 실패하고 4, 5번은 성공해도 커밋할 수 있는 오프셋은 3에서 멈춘다.
// ② 파티션이 4개면 한 소비자 그룹에서 워커 6대 가운데 4대만 일한다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		titles: ["① 중간의 한 건이 실패하면", "② 파티션 4개, 워커 6대"],
		partition: "파티션 0",
		committed: "커밋된 오프셋: 3",
		groups: ["커밋됨", "실패", "커밋 못 함", "대기"],
		options: [
			{ lines: ["그 자리에서 멈추고", "3번을 다시 시도한다"], cost: "뒤의 메시지가 모두 기다린다" },
			{ lines: ["3번을 재시도 토픽으로", "옮기고 넘어간다"], cost: "재시도 토픽을 따로 운영한다" },
		],
		topic: "토픽",
		partitions: (i: number) => `파티션 ${i}`,
		worker: (i: number) => `워커 ${i}`,
		idle: "쉰다",
		notes: [
			["오프셋은 \"여기까지 읽었다\"만 기억한다", "실패한 한 건이 뒤의 커밋을 붙잡는다"],
			["한 소비자 그룹에서 한 파티션은 한 워커만 읽는다", "워커를 늘려도 파티션 수만큼만 일한다"],
		],
		aria: [
			"중간의 한 건이 실패할 때: 파티션 0에서 오프셋 0부터 2까지는 처리하고 커밋했고, 3번은 실패했으며, 4번과 5번은 처리했지만 커밋하지 못했고, 6번과 7번은 기다린다. 커밋된 오프셋은 3에서 멈춘다. 선택지는 그 자리에서 멈추고 3번을 다시 시도해 뒤의 메시지를 모두 기다리게 하거나, 3번을 재시도 토픽으로 옮기고 넘어가 재시도 토픽을 따로 운영하는 것이다.",
			"파티션 4개를 워커 6대가 읽을 때: 한 소비자 그룹에서 한 파티션은 한 워커만 읽으므로 워커 1부터 4까지가 파티션 0부터 3을 하나씩 맡고, 워커 5와 6은 쉰다.",
		],
	},
	en: {
		titles: ["① When one message in the middle fails", "② Four partitions, six workers"],
		partition: "partition 0",
		committed: "committed offset: 3",
		groups: ["committed", "failed", "not committed", "waiting"],
		options: [
			{ lines: ["stop here and", "retry offset 3"], cost: "everything behind it waits" },
			{ lines: ["move offset 3 to a", "retry topic, go on"], cost: "another topic to run" },
		],
		topic: "topic",
		partitions: (i: number) => `partition ${i}`,
		worker: (i: number) => `worker ${i}`,
		idle: "idle",
		notes: [
			["an offset only says \"read up to here\"", "one failure holds back every commit after it"],
			["in a consumer group, one partition has one reader", "more workers help only up to the partition count"],
		],
		aria: [
			"When one message in the middle fails: in partition 0, offsets 0 to 2 are processed and committed, offset 3 failed, offsets 4 and 5 are processed but cannot be committed, and offsets 6 and 7 are waiting. The committed offset stops at 3. The options are to stop and retry offset 3, making everything behind it wait, or to move offset 3 to a retry topic and go on, which means running another topic.",
			"Six workers reading four partitions: in a consumer group each partition is read by one worker, so workers 1 to 4 take partitions 0 to 3 and workers 5 and 6 sit idle.",
		],
	},
} as const;
type Lang = keyof typeof LABELS;
type Scene = 1 | 2;

const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
const HEIGHTS = { 1: 312, 2: 300 } as const;

// 오프셋 칸 8개: 0~2 커밋됨, 3 실패, 4~5 처리했지만 커밋 못 함, 6~7 대기
const CELL_W = 50;
const CELL_GAP = 4;
const CELL_X0 = 16;
const cellX = (i: number) => CELL_X0 + i * (CELL_W + CELL_GAP);
const GROUPS = [
	[0, 2],
	[3, 3],
	[4, 5],
	[6, 7],
] as const;

export default function KafkaDiagram({ scene, lang = "ko" }: { scene: Scene; lang?: Lang }) {
	const T = LABELS[lang];
	const H = HEIGHTS[scene];
	const arrowId = `kf-arrow-${scene}`;
	const line = { stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: `url(#${arrowId})` } as const;
	const notes = T.notes[scene - 1];
	const tones = ["var(--accent)", "var(--destructive)", "var(--muted-foreground)", "var(--muted-foreground)"];
	return (
		<svg viewBox={`0 0 460 ${H}`} role="img" aria-label={T.aria[scene - 1]} style={{ display: "block", maxWidth: 460, margin: "1.75rem auto" }}>
			<defs>
				<marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>
			<text x="8" y="18" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.titles[scene - 1]}
			</text>

			{scene === 1 && (
				<g>
					<text x="16" y="50" fontSize="12" fontWeight="600" fill="var(--muted-foreground)">
						{T.partition}
					</text>
					{/* 커밋된 오프셋 표시: 2번과 3번 사이 */}
					<line x1={cellX(3) - CELL_GAP / 2} y1="44" x2={cellX(3) - CELL_GAP / 2} y2="120" stroke="var(--accent)" strokeWidth="2" />
					<text x={cellX(3) - CELL_GAP / 2 + 6} y="50" fontSize="12" fontWeight="700" fill="var(--accent)">
						{T.committed}
					</text>
					{Array.from({ length: 8 }, (_, i) => {
						const g = GROUPS.findIndex(([a, b]) => i >= a && i <= b);
						const done = g === 0;
						const failed = g === 1;
						const pending = g === 2;
						return (
							<g key={i}>
								<rect
									x={cellX(i)}
									y="62"
									width={CELL_W}
									height="44"
									rx="6"
									fill={done ? "var(--accent)" : failed ? "var(--destructive)" : "var(--secondary)"}
									fillOpacity={done || failed ? 0.14 : 1}
									stroke={done ? "var(--accent)" : failed ? "var(--destructive)" : "rgb(var(--gray))"}
									strokeOpacity={done || failed ? 0.8 : 0.5}
									strokeDasharray={pending ? "4 3" : undefined}
								/>
								<text x={cellX(i) + CELL_W / 2} y="89" textAnchor="middle" fontSize="14" fontWeight="700" fill={failed ? "var(--destructive)" : "var(--foreground)"}>
									{i}
								</text>
							</g>
						);
					})}
					{GROUPS.map(([a, b], g) => {
						const x0 = cellX(a);
						const x1 = cellX(b) + CELL_W;
						return (
							<g key={a}>
								<path d={`M ${x0 + 2} 114 V 119 H ${x1 - 2} V 114`} fill="none" stroke={tones[g]} strokeOpacity="0.7" />
								<text x={(x0 + x1) / 2} y="136" textAnchor="middle" fontSize="11.5" fontWeight="600" fill={tones[g]}>
									{T.groups[g]}
								</text>
							</g>
						);
					})}

					{/* 선택지 둘 */}
					{T.options.map((o, k) => {
						const x = k === 0 ? 8 : 236;
						return (
							<g key={o.cost}>
								<rect x={x} y="160" width="216" height="76" rx="10" {...box} />
								{o.lines.map((s, j) => (
									<text key={s} x={x + 108} y={184 + j * 17} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
										{s}
									</text>
								))}
								<text x={x + 108} y="224" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--destructive)">
									{o.cost}
								</text>
							</g>
						);
					})}
				</g>
			)}

			{scene === 2 && (
				<g>
					{/* 토픽과 파티션 4개 */}
					<rect x="8" y="34" width="228" height="196" rx="10" {...box} />
					<text x="20" y="56" fontSize="13.5" fontWeight="700" fill="var(--foreground)">
						{T.topic}
					</text>
					{[0, 1, 2, 3].map((i) => {
						const y = 70 + i * 38;
						return (
							<g key={i}>
								<text x="20" y={y + 18.5} fontSize="11.5" fill="var(--foreground)">
									{T.partitions(i)}
								</text>
								{Array.from({ length: 6 }, (_, k) => (
									<rect key={k} x={110 + k * 19} y={y + 4} width="16" height="20" rx="3" fill="rgb(var(--gray))" fillOpacity="0.3" />
								))}
								<line {...line} x1="236" y1={y + 14} x2="282" y2={53 + i * 32} />
							</g>
						);
					})}
					{/* 워커 6대: 4대만 파티션을 맡는다 */}
					{[1, 2, 3, 4, 5, 6].map((n, k) => {
						const y = 40 + k * 32;
						const idle = n > 4;
						return (
							<g key={n}>
								<rect
									x="286"
									y={y}
									width="166"
									height="26"
									rx="8"
									fill={idle ? "none" : "var(--secondary)"}
									stroke={idle ? "rgb(var(--gray))" : "var(--accent)"}
									strokeOpacity={idle ? 0.6 : 0.8}
									strokeDasharray={idle ? "4 3" : undefined}
								/>
								<text x="369" y={y + 17.5} textAnchor="middle" fontSize="12" fontWeight="600" fill={idle ? "var(--muted-foreground)" : "var(--foreground)"}>
									{idle ? `${T.worker(n)} · ${T.idle}` : T.worker(n)}
								</text>
							</g>
						);
					})}
				</g>
			)}

			<text x="230" y={H - 42} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{notes[0]}
			</text>
			<text x="230" y={H - 18} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{notes[1]}
			</text>
		</svg>
	);
}

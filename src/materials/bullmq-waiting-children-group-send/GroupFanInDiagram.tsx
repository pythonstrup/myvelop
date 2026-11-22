// 알림 파이프라인 구조도. batch 서버 → 큐 → 워커들 → 서드파티 그룹의 fan-out·fan-in.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		batchTitle: "batch 서버",
		batchSub: "수백만 건을 청크로 잘라 job으로 적재",
		edge1: "청크 job × N",
		queueTitle: "BullMQ 큐",
		queueJob: "청크",
		queueSub: "비동기 · 도착 순서도 처리 시점도 보장하지 않는다",
		workerOuter: "notification 서버",
		worker: "워커",
		workerSub: "같은 묶음의 청크가 여러 워커에 흩어진다",
		fanIn: "여러 워커가 같은 그룹을 동시에 만진다",
		thirdTitle: "서드파티 그룹",
		thirdSub: "같은 분류는 그룹 하나에 담아 한 번에 발송",
		aria: "알림 파이프라인 구조: batch 서버가 수백만 건의 대상을 청크로 잘라 job으로 적재하고, BullMQ 큐는 비동기라 도착 순서도 처리 시점도 보장하지 않는다. notification 서버의 여러 워커가 청크 job을 나눠 소비하면서 같은 분류를 서드파티 그룹 하나에 담아 한 번에 발송한다. 여러 워커가 같은 그룹을 동시에 만지는 지점에서 경합이 난다.",
	},
	en: {
		batchTitle: "batch server",
		batchSub: "slices millions of targets into chunk jobs",
		edge1: "chunk jobs × N",
		queueTitle: "BullMQ queue",
		queueJob: "chunk",
		queueSub: "async · neither arrival order nor timing is guaranteed",
		workerOuter: "notification server",
		worker: "worker",
		workerSub: "chunks of one batch scatter across workers",
		fanIn: "several workers touch the same group at once",
		thirdTitle: "third-party group",
		thirdSub: "one category goes into one group, sent once",
		aria: "Notification pipeline: the batch server slices millions of targets into chunk jobs; the BullMQ queue is asynchronous and guarantees neither arrival order nor processing timing; several workers on the notification server consume the chunk jobs while collecting one category into a single third-party group that is sent once. Contention arises where several workers touch the same group at the same time.",
	},
} as const;
type Lang = keyof typeof LABELS;

export default function GroupFanInDiagram({ lang = "ko" }: { lang?: Lang }) {
	const T = LABELS[lang];
	const box = {
		fill: "var(--secondary)",
		stroke: "rgb(var(--gray))",
		strokeOpacity: 0.45,
	} as const;
	const halo = {
		paintOrder: "stroke",
		stroke: "var(--background, #fff)",
		strokeWidth: 8,
		strokeLinejoin: "round",
	} as const;
	const flow = {
		className: "gf-flow",
		stroke: "rgb(var(--gray))",
		strokeWidth: 1.5,
	} as const;
	const workerXs = [76, 184, 292];
	return (
		<svg
			viewBox="0 0 460 540"
			role="img"
			aria-label={T.aria}
			style={{ display: "block", maxWidth: 460, margin: "2rem auto" }}
		>
			<style>{`
				.gf-flow { stroke-dasharray: 5 5; animation: gf-dash 1s linear infinite; }
				@keyframes gf-dash { to { stroke-dashoffset: -10; } }
				@media (prefers-reduced-motion: reduce) { .gf-flow { animation: none; } }
			`}</style>
			<defs>
				<marker id="gf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<rect x="60" y="8" width="340" height="64" rx="10" {...box} />
			<text x="230" y="34" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{T.batchTitle}
			</text>
			<text x="230" y="56" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.batchSub}
			</text>

			<line {...flow} x1="230" y1="72" x2="230" y2="126" markerEnd="url(#gf-arrow)" />
			<text x="230" y="103" textAnchor="middle" fontSize="13" fill="var(--muted-foreground)" {...halo}>
				{T.edge1}
			</text>

			<rect x="60" y="132" width="340" height="92" rx="10" {...box} />
			<text x="230" y="158" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{T.queueTitle}
			</text>
			{[0, 1, 2, 3, 4].map((i) => (
				<g key={i}>
					<rect x={121 + i * 46} y="168" width="34" height="22" rx="4" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
					<text x={138 + i * 46} y="183" textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
						{T.queueJob}
					</text>
				</g>
			))}
			<text x="230" y="212" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.queueSub}
			</text>

			{workerXs.map((x) => (
				<line key={x} {...flow} x1="230" y1="224" x2={x + 46} y2="310" markerEnd="url(#gf-arrow)" />
			))}

			<rect x="60" y="280" width="340" height="96" rx="10" {...box} />
			<text x="230" y="302" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
				{T.workerOuter}
			</text>
			{workerXs.map((x) => (
				<g key={x}>
					<rect x={x} y="316" width="92" height="34" rx="6" fill="var(--background)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
					<text x={x + 46} y="338" textAnchor="middle" fontSize="12.5" fill="var(--foreground)">
						{T.worker}
					</text>
				</g>
			))}
			<text x="230" y="368" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.workerSub}
			</text>

			{workerXs.map((x) => (
				<line key={x} {...flow} x1={x + 46} y1="376" x2="230" y2="440" />
			))}
			<line {...flow} x1="230" y1="440" x2="230" y2="450" markerEnd="url(#gf-arrow)" />
			<text x="230" y="412" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--accent)" {...halo}>
				{T.fanIn}
			</text>

			<rect x="60" y="456" width="340" height="76" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.7" />
			<text x="230" y="486" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--accent)">
				{T.thirdTitle}
			</text>
			<text x="230" y="510" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{T.thirdSub}
			</text>
		</svg>
	);
}

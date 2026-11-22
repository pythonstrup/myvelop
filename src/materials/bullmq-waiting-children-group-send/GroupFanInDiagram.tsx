// 가상의 그룹 발송 구조도. 대상 2만 5천 건 → 청크 job 25개 → 큐 → 워커들 → 발송 API 그룹의 fan-out·fan-in.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		batchTitle: "대상 2만 5천 건 (가정)",
		batchSub: "한 번에 읽지 못해 1,000건씩 청크 job으로 나눈다",
		edge1: "청크 job × 25",
		queueTitle: "BullMQ 큐",
		queueJob: "청크",
		queueSub: "비동기라 도착 순서도 처리 시점도 보장하지 않는다",
		workerOuter: "워커 프로세스",
		worker: "워커",
		workerSub: "같은 묶음의 청크가 여러 워커에 흩어진다",
		fanIn: "여러 워커가 같은 그룹을 동시에 만진다",
		thirdTitle: "발송 API의 그룹 (가정)",
		thirdSub: "그룹당 최대 1만 건, 다 담은 뒤 한 번 발송",
		aria: "가상의 그룹 발송 구조: 대상 2만 5천 건을 한 번에 읽지 못해 1,000건씩 청크 job 25개로 나누고, BullMQ 큐는 비동기라 도착 순서도 처리 시점도 보장하지 않는다. 여러 워커가 청크 job을 나눠 소비하면서 발송 API의 그룹에 담는다. 그룹 하나에는 최대 1만 건이 담기고 다 담은 뒤 한 번에 발송한다. 여러 워커가 같은 그룹을 동시에 만지는 지점에서 경합이 난다.",
	},
	en: {
		batchTitle: "25,000 targets (hypothetical)",
		batchSub: "read 1,000 at a time into chunk jobs",
		edge1: "chunk jobs × 25",
		queueTitle: "BullMQ queue",
		queueJob: "chunk",
		queueSub: "async · neither arrival order nor timing is guaranteed",
		workerOuter: "worker processes",
		worker: "worker",
		workerSub: "chunks of one batch scatter across workers",
		fanIn: "several workers touch the same group at once",
		thirdTitle: "sending API group (hypothetical)",
		thirdSub: "up to 10,000 per group, sent once after staging",
		aria: "Hypothetical group-send structure: 25,000 targets are too many to read at once, so they are split into 25 chunk jobs of 1,000; the BullMQ queue is asynchronous and guarantees neither arrival order nor processing timing. Several workers consume the chunk jobs and stage them into a group on the sending API, which holds up to 10,000 messages and is sent once after staging. Contention arises where several workers touch the same group at the same time.",
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

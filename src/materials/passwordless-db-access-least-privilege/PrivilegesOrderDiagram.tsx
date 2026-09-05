// grant 스냅샷 vs default privileges 적용 순서 비교. 정적 SVG — SSR 전용.
const BOX = {
	fill: "var(--secondary)",
	stroke: "rgb(var(--gray))",
	strokeOpacity: 0.45,
} as const;

const LABELS = {
	ko: {
		before: "기존",
		after: "변경",
		createDb: "database 생성",
		schema: "스키마 적용",
		grantAll: "grant on all tables",
		adp: "계정 + default privileges",
		rerun: "↻ 테이블 추가할 때마다 재실행",
		auto: "✓ 이후 전부 자동",
		aria: "적용 순서 비교: 기존에는 database 생성과 스키마 적용 뒤 grant on all tables를 테이블 추가할 때마다 재실행해야 했다. 변경 후에는 database 생성, 계정과 default privileges, 스키마 적용 순서라서 이후 생기는 테이블 전부가 자동으로 커버된다.",
	},
	en: {
		before: "Before",
		after: "After",
		createDb: "create database",
		schema: "apply schema",
		grantAll: "grant on all tables",
		adp: "roles + default privileges",
		rerun: "↻ rerun after every new table",
		auto: "✓ everything later is covered",
		aria: "Order-of-application comparison: before, grant on all tables ran after creating the database and applying the schema, and had to be rerun after every new table. After the change the order is create database, then roles plus default privileges, then apply schema, so every table created later is covered automatically.",
	},
} as const;
type Lang = keyof typeof LABELS;

function Step({ x, y, w, label, accent = false }: { x: number; y: number; w: number; label: string; accent?: boolean }) {
	return (
		<>
			<rect
				x={x}
				y={y}
				width={w}
				height={44}
				rx={8}
				{...BOX}
				{...(accent ? { stroke: "var(--accent)", strokeOpacity: 0.7 } : {})}
			/>
			<text
				x={x + w / 2}
				y={y + 27}
				textAnchor="middle"
				fontSize="14"
				fontWeight={accent ? 600 : 400}
				fill={accent ? "var(--accent)" : "var(--foreground)"}
			>
				{label}
			</text>
		</>
	);
}

function Arrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
	return <line className="po-flow" x1={x1} y1={y} x2={x2} y2={y} stroke="rgb(var(--gray))" strokeWidth="1.5" markerEnd="url(#po-arrow)" />;
}

export default function PrivilegesOrderDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox="0 0 680 216"
				role="img"
				aria-label={t.aria}
				style={{ display: "block", minWidth: 560, maxWidth: 680, margin: "0 auto" }}
			>
				<style>{`
					.po-flow { stroke-dasharray: 5 5; animation: po-dash 1s linear infinite; }
					@keyframes po-dash { to { stroke-dashoffset: -10; } }
					@media (prefers-reduced-motion: reduce) { .po-flow { animation: none; } }
				`}</style>
				<defs>
					<marker id="po-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
					</marker>
				</defs>

				<text x="10" y="47" fontSize="13" fontWeight="700" fill="var(--muted-foreground)">
					{t.before}
				</text>
				<Step x={60} y={20} w={120} label={t.createDb} />
				<Arrow x1={182} x2={208} y={42} />
				<Step x={210} y={20} w={110} label={t.schema} />
				<Arrow x1={322} x2={348} y={42} />
				<Step x={350} y={20} w={170} label={t.grantAll} />
				<text x="435" y="86" textAnchor="middle" fontSize="12.5" fill="var(--destructive, #ef4444)">
					{t.rerun}
				</text>

				<text x="10" y="157" fontSize="13" fontWeight="700" fill="var(--muted-foreground)">
					{t.after}
				</text>
				<Step x={60} y={130} w={120} label={t.createDb} />
				<Arrow x1={182} x2={208} y={152} />
				<Step x={210} y={130} w={200} label={t.adp} accent />
				<Arrow x1={412} x2={438} y={152} />
				<Step x={440} y={130} w={110} label={t.schema} />
				<text x="495" y="196" textAnchor="middle" fontSize="12.5" fill="var(--accent)">
					{t.auto}
				</text>
			</svg>
		</div>
	);
}

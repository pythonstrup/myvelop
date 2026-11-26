// 한 행의 data 에서 jsonb_ops 와 jsonb_path_ops 가 떼어 내는 키를 나란히 그리고, kim 을 찾을 때 쓰는 키를 강조하는 그림. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const ROW = '{"status": "open", "assignees": ["kim", "lee"]}';

type Key = { label: string; hit: boolean };

const COLUMNS: { x: number; name: string; keys: Key[] }[] = [
	{
		x: 10,
		name: "jsonb_ops",
		keys: [
			{ label: "status", hit: false },
			{ label: "open", hit: false },
			{ label: "assignees", hit: true },
			{ label: "kim", hit: true },
			{ label: "lee", hit: false },
		],
	},
	{
		x: 230,
		name: "jsonb_path_ops",
		keys: [
			{ label: "status → open", hit: false },
			{ label: "assignees → kim", hit: true },
			{ label: "assignees → lee", hit: false },
		],
	},
];

const LABELS = {
	ko: {
		row: "1번 행의 data",
		how: ["필드 이름과 값을 따로 키로", "이름과 값을 섞어 해시 하나로"],
		hash: "해시",
		note: ["kim을 찾으려면 키 둘을 찾아 겹친다", "kim을 찾으려면 키 하나만 찾는다"],
		caption: "같은 행에서 jsonb_ops는 키 다섯 개, jsonb_path_ops는 키 세 개를 적는다",
		aria: '1번 행의 data {"status": "open", "assignees": ["kim", "lee"]}에서 두 연산자 클래스가 떼어 내는 키를 나란히 그린 그림. jsonb_ops는 필드 이름과 값을 따로 키로 적어 status, open, assignees, kim, lee 다섯 개를 적는다. jsonb_path_ops는 이름과 값을 섞어 해시 하나로 적어 status → open, assignees → kim, assignees → lee 세 개를 적는다. kim이 맡은 티켓을 찾을 때 jsonb_ops는 assignees와 kim 두 키를 찾아 겹치고, jsonb_path_ops는 assignees → kim 키 하나만 찾는다.',
	},
} as const;
type Lang = keyof typeof LABELS;

const COL_W = 200;
const BOX_Y = 132;
const ENTRY_H = 26;
const NOTE_Y = 296;

export default function OpsKeysDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
	const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)" } as const;
	return (
		<svg viewBox="0 0 440 334" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 440, margin: "2rem auto" }}>
			<defs>
				<marker id="ok-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<text x="10" y="18" fontSize="12.5" fill="var(--muted-foreground)">
				{t.row}
			</text>
			<rect x="10" y="28" width="420" height="30" rx="6" {...box} />
			<text x="220" y="48" textAnchor="middle" fontSize="11.5" fill="var(--foreground)" {...mono}>
				{ROW}
			</text>

			{COLUMNS.map((c, ci) => (
				<g key={c.name}>
					<line
						x1={c.x + COL_W / 2}
						y1="60"
						x2={c.x + COL_W / 2}
						y2="88"
						stroke="rgb(var(--gray))"
						strokeWidth="1.5"
						markerEnd="url(#ok-arrow)"
					/>
					<text x={c.x} y="106" fontSize="12.5" fontWeight="600" fill="var(--foreground)" {...mono}>
						{c.name}
					</text>
					<text x={c.x} y="122" fontSize="11" fill="var(--muted-foreground)">
						{t.how[ci]}
					</text>
					<rect x={c.x} y={BOX_Y} width={COL_W} height={c.keys.length * ENTRY_H + 12} rx="8" {...box} />
					{c.keys.map((k, i) => {
						const y = BOX_Y + 8 + i * ENTRY_H;
						return (
							<g key={k.label}>
								<rect
									x={c.x + 6}
									y={y}
									width={COL_W - 12}
									height={ENTRY_H - 4}
									rx="4"
									fill={k.hit ? "var(--accent)" : "var(--background)"}
									fillOpacity={k.hit ? 0.12 : 1}
									stroke={k.hit ? "var(--accent)" : "rgb(var(--gray))"}
									strokeOpacity={k.hit ? 1 : 0.3}
								/>
								<text x={c.x + 14} y={y + 15} fontSize="11.5" fontWeight={k.hit ? 600 : 400} fill="var(--foreground)" {...mono}>
									{k.label}
								</text>
								{ci === 1 ? (
									<text x={c.x + COL_W - 14} y={y + 15} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
										{t.hash}
									</text>
								) : null}
							</g>
						);
					})}
					<text x={c.x} y={NOTE_Y} fontSize="11" fill="var(--accent)">
						{t.note[ci]}
					</text>
				</g>
			))}

			<text x="220" y="324" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
				{t.caption}
			</text>
		</svg>
	);
}

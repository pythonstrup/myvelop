// CHECK 제약 측정 — 32개 연결이 동시에 UPDATE 할 때 제약 유무에 따른 초당 처리량. 막대 색은 dataviz 검사(밝은·어두운 화면)를 통과한 두 색이다.

const MAX = 80000;
const X0 = 212;
const PLOT_W = 400;
const BAR_H = 20;
const PAIR_GAP = 2;
const GROUP_GAP = 30;
const TOP = 70;
const xOf = (v: number) => X0 + (v / MAX) * PLOT_W;

const SERIES = [
	{ key: "plain", label: "제약 없음", cls: "cec-bench-a" },
	{ key: "checked", label: "CHECK 제약 있음", cls: "cec-bench-b" },
] as const;

// 10초씩 두 번 잰 값의 평균을 백 단위에서 반올림했다.
const GROUPS = [
	{ label: "10만 행에 흩어진 수정", values: { plain: 69600, checked: 71800 } },
	{ label: "행 10개에 몰린 수정", values: { plain: 25700, checked: 26100 } },
];

const GROUP_H = BAR_H * 2 + PAIR_GAP;
const PLOT_BOTTOM =
	TOP + GROUPS.length * GROUP_H + (GROUPS.length - 1) * GROUP_GAP + 8;
const H = PLOT_BOTTOM + 70;
const TICKS = [0, 20000, 40000, 60000, 80000];

// 바닥은 각지고 값 쪽 끝만 4px 둥근 막대.
const barPath = (x: number, y: number, w: number) => {
	const r = Math.min(4, w);
	return `M ${x} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + BAR_H - r} Q ${x + w} ${y + BAR_H} ${x + w - r} ${y + BAR_H} H ${x} Z`;
};

export default function CheckBenchDiagram() {
	return (
		<div style={{ overflowX: "auto", margin: "2rem 0" }}>
			<svg
				viewBox={`0 0 680 ${H}`}
				role="img"
				aria-label="PostgreSQL 17에서 32개 연결이 동시에 UPDATE 할 때 초당 처리한 건수. 10만 행에 흩어진 수정은 제약 없음 69,600건, CHECK 제약 있음 71,800건이다. 행 10개에 몰린 수정은 제약 없음 25,700건, CHECK 제약 있음 26,100건이다. 제약 유무에 따른 차이는 없고, 수정이 같은 행에 몰렸을 때 처리량이 크게 떨어진다."
				style={{
					display: "block",
					minWidth: 560,
					maxWidth: 680,
					margin: "0 auto",
				}}
			>
				<style>
					{
						".cec-bench-a{fill:#2a78d6}.cec-bench-b{fill:#eb6834}html.dark .cec-bench-a{fill:#3987e5}html.dark .cec-bench-b{fill:#d95926}"
					}
				</style>
				<rect
					x="8"
					y="8"
					width="664"
					height={H - 16}
					rx="12"
					fill="var(--background)"
					stroke="rgb(var(--gray))"
					strokeOpacity="0.45"
				/>

				{SERIES.map((s, i) => (
					<g key={s.key}>
						<rect
							x={24 + i * 110}
							y="27"
							width="12"
							height="12"
							rx="3"
							className={s.cls}
						/>
						<text
							x={42 + i * 110}
							y="37.5"
							fontSize="12"
							fill="var(--foreground)"
						>
							{s.label}
						</text>
					</g>
				))}

				{TICKS.map((t) => (
					<g key={t}>
						<line
							x1={xOf(t)}
							y1={TOP - 8}
							x2={xOf(t)}
							y2={PLOT_BOTTOM}
							stroke="rgb(var(--gray))"
							strokeOpacity={t === 0 ? 0.6 : 0.2}
						/>
						<text
							x={xOf(t)}
							y={PLOT_BOTTOM + 18}
							textAnchor="middle"
							fontSize="11"
							fill="var(--muted-foreground)"
						>
							{t === 0 ? "0" : `${t / 10000}만`}
						</text>
					</g>
				))}
				<text
					x={X0 + PLOT_W}
					y={PLOT_BOTTOM + 38}
					textAnchor="end"
					fontSize="11"
					fill="var(--muted-foreground)"
				>
					초당 처리한 UPDATE 건수
				</text>

				{GROUPS.map((g, gi) => {
					const top = TOP + gi * (GROUP_H + GROUP_GAP);
					return (
						<g key={g.label}>
							<text
								x="24"
								y={top + GROUP_H / 2 + 4.5}
								fontSize="12.5"
								fontWeight="600"
								fill="var(--foreground)"
							>
								{g.label}
							</text>
							{SERIES.map((s, si) => {
								const y = top + si * (BAR_H + PAIR_GAP);
								const v = g.values[s.key];
								return (
									<g key={s.key}>
										<path d={barPath(X0, y, xOf(v) - X0)} className={s.cls} />
										<text
											x={xOf(v) + 8}
											y={y + 14.5}
											fontSize="11.5"
											fill="var(--foreground)"
										>
											{v.toLocaleString("ko-KR")}
										</text>
									</g>
								);
							})}
						</g>
					);
				})}

				<text x="24" y={H - 24} fontSize="11" fill="var(--muted-foreground)">
					노트북 Docker의 PostgreSQL 17 · 32개 연결 · 10초씩 두 번 잰 평균
				</text>
			</svg>
		</div>
	);
}

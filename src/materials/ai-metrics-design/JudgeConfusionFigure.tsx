import { FIG_STYLE } from "@/materials/monitoring-design/figure";

// 판정 모델의 판정을 사람 라벨과 견주는 2×2 칸과, TPR·TNR 이 어느 칸으로 계산되는지 보이는 정적 그림.
// 사람 라벨 100개 가운데 실패 20개, 판정 모델이 실패 18개를 잡고 좋은 출력 72개를 통과시킨다는 값은 가정이다.
const W = 720;
const GRID_X = 196;
const CELL_W = 136;
const CELL_H = 60;
const GAP = 4;
const GRID_TOP = 72;
const TEXT_X = GRID_X + CELL_W * 2 + GAP + 24;
const ROWS = [
	{
		label: "실제 실패",
		count: 20,
		cells: [
			{ n: 18, note: "잡아냄", ok: true },
			{ n: 2, note: "놓침", ok: false },
		],
		pick: 0, // TPR 의 분자는 잡아낸 칸
		rate: "TPR",
		desc: "실제 실패 가운데 잡아낸 비율",
		tone: "blue",
	},
	{
		label: "좋은 출력",
		count: 80,
		cells: [
			{ n: 8, note: "잘못 막음", ok: false },
			{ n: 72, note: "통과", ok: true },
		],
		pick: 1, // TNR 의 분자는 통과시킨 칸
		rate: "TNR",
		desc: "좋은 출력 가운데 통과시킨 비율",
		tone: "green",
	},
] as const;
const H = GRID_TOP + ROWS.length * (CELL_H + GAP) + 20;
const ARIA =
	"판정 모델의 판정을 사람 라벨과 견주는 표. 사람이 라벨을 붙인 출력 100개 가운데 실제 실패가 20개, 좋은 출력이 80개라고 가정했다. 판정 모델은 실제 실패 20개 가운데 18개를 불합격으로 잡고 2개를 놓친다. TPR은 18을 20으로 나눈 90%다. 좋은 출력 80개 가운데 72개를 합격으로 통과시키고 8개를 잘못 막는다. TNR은 72를 80으로 나눈 90%다.";

export default function JudgeConfusionFigure() {
	const colX = (c: number) => GRID_X + c * (CELL_W + GAP);
	const rowY = (r: number) => GRID_TOP + r * (CELL_H + GAP);
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<text x={GRID_X + CELL_W + GAP / 2} y={30} textAnchor="middle" className="fg-sub" fontSize={13}>
				판정 모델의 판정
			</text>
			{["불합격", "합격"].map((h, c) => (
				<text key={h} x={colX(c) + CELL_W / 2} y={56} textAnchor="middle" className="fg-text" fontSize={14} fontWeight={700}>
					{h}
				</text>
			))}
			<text x={GRID_X - 14} y={56} textAnchor="end" className="fg-sub" fontSize={13}>
				사람 라벨
			</text>
			{ROWS.map((row, r) => {
				const cy = rowY(r) + CELL_H / 2;
				const num = row.cells[row.pick].n;
				return (
					<g key={row.label}>
						<text x={GRID_X - 14} y={cy - 2} textAnchor="end" className="fg-text" fontSize={14} fontWeight={700}>
							{row.label}
						</text>
						<text x={GRID_X - 14} y={cy + 17} textAnchor="end" className="fg-sub" fontSize={12.5}>
							{row.count}개
						</text>
						{row.cells.map((cell, c) => (
							<g key={cell.note}>
								<rect
									x={colX(c)}
									y={rowY(r)}
									width={CELL_W}
									height={CELL_H}
									rx={8}
									className={cell.ok ? `fg-${row.tone}-fill fg-${row.tone}` : "fg-red-fill fg-red"}
									strokeWidth={1.5}
								/>
								<text x={colX(c) + CELL_W / 2} y={cy - 2} textAnchor="middle" className={cell.ok ? `fg-${row.tone}-ink` : "fg-red-ink"} fontSize={15} fontWeight={700}>
									{cell.n}개
								</text>
								<text x={colX(c) + CELL_W / 2} y={cy + 17} textAnchor="middle" className="fg-sub" fontSize={12.5}>
									{cell.note}
								</text>
							</g>
						))}
						<text x={TEXT_X} y={cy - 2} className={`fg-${row.tone}-ink`} fontSize={14} fontWeight={700}>
							{row.rate} = {num} / {row.count} = {Math.round((num / row.count) * 100)}%
						</text>
						<text x={TEXT_X} y={cy + 17} className="fg-sub" fontSize={12.5}>
							{row.desc}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

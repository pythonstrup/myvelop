import { useState } from "react";
import { BGE_M3, GROUPS, type GroupKey, WRONG_PAIRS } from "./data";
import { MARK_STYLE, Mark } from "./marks";

// 문턱값을 움직이면 질문 14쌍 가운데 무엇이 적중하고 그중 무엇이 오답인지 보여준다. 값은 bge-m3로 잰 것이다.
const WRONG_SORTED = [...WRONG_PAIRS].sort((a, b) => b.sim - a.sim);
const X0 = 16;
const X1 = 384;
const MIN = 0.45;
const MAX = 1;
const x = (v: number) => X0 + ((X1 - X0) * (v - MIN)) / (MAX - MIN);
const ROW_Y: Record<GroupKey, number> = { same: 52, different: 104, unrelated: 156 };
const AXIS_Y = 186;
const TICKS = [0.5, 0.6, 0.7, 0.8, 0.9, 1];

const ARIA =
	"질문 14쌍의 유사도를 무리별로 한 줄씩 찍은 점 그래프. 뜻이 같은 질문은 0.699에서 0.959, 답이 다른 질문은 0.822에서 0.970, 상관없는 질문은 0.479와 0.560이다. 아래 막대로 문턱값을 움직이면 문턱값을 넘은 점이 채워진다. 문턱값 0.80에서는 뜻이 같은 질문 6쌍 가운데 5쌍, 답이 다른 질문 6쌍 전부가 적중하고, 0.95에서는 각각 1쌍씩만 적중한다. 0.98에서는 하나도 적중하지 않는다.";

export default function ThresholdDemo() {
	const [threshold, setThreshold] = useState(0.8);
	const hits = (group: GroupKey) => BGE_M3[group].filter((v) => v >= threshold).length;
	const wrong = hits("different") + hits("unrelated");
	const tx = x(threshold);

	return (
		<div style={{ margin: "2rem 0" }}>
			<div style={{ maxWidth: 480, margin: "0 auto" }}>
			<svg viewBox="0 0 400 216" role="img" aria-label={ARIA} style={{ display: "block", width: "100%" }}>
				<style>{MARK_STYLE}</style>

				{/* 문턱값을 넘은 영역 */}
				<rect x={tx} y="20" width={X1 - tx} height={AXIS_Y - 20} fill="var(--accent)" fillOpacity="0.08" />
				<text x={X1} y="14" textAnchor="end" fontSize="11.5" fill="var(--muted-foreground)">
					적중
				</text>

				{GROUPS.map(({ key, name }) => {
					const y = ROW_Y[key];
					const seen = new Map<number, number>();
					return (
						<g key={key}>
							<line x1={X0} x2={X1} y1={y} y2={y} stroke="var(--border)" />
							<Mark group={key} x={X0 + 5} y={y - 20} />
							<text x={X0 + 15} y={y - 16} fontSize="12" fill="var(--foreground)">
								{name}
							</text>
							{BGE_M3[key].map((v, i) => {
								// 값이 같은 점은 위아래로 조금 벌린다
								const n = seen.get(v) ?? 0;
								seen.set(v, n + 1);
								return <Mark key={i} group={key} x={x(v)} y={y + n * 11} filled={v >= threshold} />;
							})}
						</g>
					);
				})}

				{/* 문턱값 선 */}
				<line x1={tx} x2={tx} y1="20" y2={AXIS_Y} stroke="var(--accent)" strokeWidth="1.8" />

				{/* 가로축 */}
				<line x1={X0} x2={X1} y1={AXIS_Y} y2={AXIS_Y} stroke="rgb(var(--gray))" strokeOpacity="0.6" />
				{TICKS.map((v) => (
					<text key={v} x={x(v)} y={AXIS_Y + 15} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
						{v.toFixed(1)}
					</text>
				))}
				<text x={X0} y={AXIS_Y + 28} fontSize="11" fill="var(--muted-foreground)">
					유사도
				</text>
			</svg>

			<label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.9rem", marginTop: 4 }}>
				<span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>문턱값 {threshold.toFixed(2)}</span>
				<input
					type="range"
					min={0.5}
					max={0.99}
					step={0.01}
					value={threshold}
					onChange={(e) => setThreshold(Number(e.target.value))}
					style={{ flex: 1, minWidth: 0, accentColor: "var(--accent)" }}
				/>
			</label>
			<p aria-live="polite" style={{ margin: "0.4rem 0 0", fontSize: "0.9rem", fontVariantNumeric: "tabular-nums" }}>
				뜻이 같은 6쌍 가운데 <strong>{hits("same")}쌍</strong> 적중, 나머지 8쌍 가운데 <strong>{wrong}쌍</strong>에 엉뚱한 답
			</p>
			</div>

			{/* 엉뚱한 답이 나갈 수 있는 질문. 줄 높이가 바뀌지 않게 문장은 그대로 두고 상태만 바꾼다 */}
			<div
				role="list"
				style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "10px 16px", marginTop: 14, fontSize: "0.82rem", lineHeight: 1.5 }}
			>
				{WRONG_SORTED.map((p) => {
					const hit = p.sim >= threshold;
					return (
						<div
							key={p.incoming + p.stored}
							role="listitem"
							className={`sc-${p.group}`}
							style={{
								display: "flex",
								gap: 10,
								borderLeft: `3px solid ${hit ? "var(--sc)" : "var(--border)"}`,
								paddingLeft: 10,
								color: hit ? "var(--foreground)" : "var(--muted-foreground)",
							}}
						>
							<span style={{ flexShrink: 0, width: 46, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontWeight: hit ? 700 : 400 }}>
								{p.sim.toFixed(3)}
								<br />
								{hit ? "오답" : "놓침"}
							</span>
							<span>
								{p.incoming}
								<br />
								<span style={{ color: "var(--muted-foreground)" }}>저장된 질문: {p.stored}</span>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

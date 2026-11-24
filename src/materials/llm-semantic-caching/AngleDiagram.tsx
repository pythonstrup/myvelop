import { GROUPS, type GroupKey } from "./data";
import { MARK_STYLE, Mark } from "./marks";

// 저장된 질문과 들어온 질문의 벡터를 화살표 둘로 그려, 유사도가 두 벡터 사이의 각도임을 보여주는 정적 그림.
// 각도는 bge-m3로 잰 유사도의 arccos다. 벡터는 1,024차원이고, 두 벡터 사이의 각도만 평면에 옮겼다.
type Panel = { group: GroupKey; sim: number; stored: string; incoming: string };

const VARIANTS: Record<"basic" | "trap", { panels: Panel[]; aria: string }> = {
	basic: {
		panels: [
			{ group: "same", sim: 0.959, stored: "환불은 어떻게 하나요?", incoming: "환불하려면 어떻게 해야 하나요?" },
			{ group: "unrelated", sim: 0.56, stored: "환불은 어떻게 하나요?", incoming: "서울 매장 영업시간이 어떻게 되나요?" },
		],
		aria: "질문 벡터를 화살표로 그려 두 쌍의 각도를 견준 그림. 「환불은 어떻게 하나요?」와 「환불하려면 어떻게 해야 하나요?」는 각도가 약 16도이고 유사도는 0.959다. 「환불은 어떻게 하나요?」와 「서울 매장 영업시간이 어떻게 되나요?」는 각도가 약 56도이고 유사도는 0.560이다.",
	},
	trap: {
		panels: [
			{ group: "different", sim: 0.97, stored: "달러를 원화로 바꾸려면 어떻게…", incoming: "원화를 달러로 바꾸려면 어떻게…" },
			{ group: "same", sim: 0.699, stored: "회원 탈퇴는 어떻게 하나요?", incoming: "계정을 지우고 싶어요" },
		],
		aria: "질문 벡터를 화살표로 그려 두 쌍의 각도를 견준 그림. 답이 다른 「달러를 원화로 바꾸려면 어떻게 하나요?」와 「원화를 달러로 바꾸려면 어떻게 하나요?」는 각도가 약 14도이고 유사도는 0.970이다. 뜻이 같은 「회원 탈퇴는 어떻게 하나요?」와 「계정을 지우고 싶어요」는 각도가 약 46도이고 유사도는 0.699다.",
	},
};

const PANEL_H = 138;
const LEN = 122;
const OX = 14;

function Vector({ x, y, deg, color }: { x: number; y: number; deg: number; color: string }) {
	return (
		<g transform={`translate(${x} ${y}) rotate(${-deg})`}>
			<line x1="0" x2={LEN - 8} y1="0" y2="0" stroke={color} strokeWidth="2.2" />
			<path d={`M${LEN},0 l-11,-5.5 v11 z`} fill={color} />
		</g>
	);
}

export default function AngleDiagram({ variant }: { variant: keyof typeof VARIANTS }) {
	const { panels, aria } = VARIANTS[variant];
	return (
		<svg viewBox={`0 0 400 ${PANEL_H * panels.length + 14}`} role="img" aria-label={aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{MARK_STYLE}</style>
			{panels.map((p, i) => {
				const oy = PANEL_H * i + 118;
				const rad = Math.acos(p.sim);
				const tip = (r: number) => ({ x: OX + r * Math.cos(rad), y: oy - r * Math.sin(rad) });
				const arc = tip(44);
				return (
					<g key={p.incoming} className={`sc-${p.group}`}>
						<path d={`M${OX},${oy} L${OX + 44},${oy} A44,44 0 0 0 ${arc.x},${arc.y} z`} fill="var(--sc)" fillOpacity="0.16" />
						<Vector x={OX} y={oy} deg={0} color="var(--foreground)" />
						<Vector x={OX} y={oy} deg={(rad * 180) / Math.PI} color="var(--sc)" />

						<Mark group={p.group} x={178} y={PANEL_H * i + 36} />
						<text x="189" y={PANEL_H * i + 40} fontSize="12" fontWeight="600" fill="var(--foreground)">
							{GROUPS.find((g) => g.key === p.group)?.name}
						</text>
						<text x="172" y={PANEL_H * i + 64} fontSize="14" fontWeight="600" fill="var(--foreground)">
							{`약 ${Math.round((rad * 180) / Math.PI)}도, 유사도 ${p.sim.toFixed(3)}`}
						</text>
						<line x1="172" y1={PANEL_H * i + 84} x2="186" y2={PANEL_H * i + 84} stroke="var(--foreground)" strokeWidth="2.4" />
						<text x="191" y={PANEL_H * i + 88} fontSize="11.5" fill="var(--foreground)">
							{p.stored}
						</text>
						<line x1="172" y1={PANEL_H * i + 106} x2="186" y2={PANEL_H * i + 106} stroke="var(--sc)" strokeWidth="2.6" />
						<text x="191" y={PANEL_H * i + 110} fontSize="11.5" fill="var(--foreground)">
							{p.incoming}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

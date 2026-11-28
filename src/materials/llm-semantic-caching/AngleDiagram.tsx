import { GROUPS, type GroupKey, type Lang } from "./data";
import { MARK_STYLE, Mark } from "./marks";

// 저장된 질문과 들어온 질문의 벡터를 화살표 둘로 그려, 유사도가 두 벡터 사이의 각도임을 보여주는 정적 그림.
// 각도는 bge-m3로 잰 유사도의 arccos다. 벡터는 1,024차원이고, 두 벡터 사이의 각도만 평면에 옮겼다.
// 질문은 한국어로 쟀고, 영어 그림의 질문은 번역이다.
type Panel = { group: GroupKey; sim: number; stored: string; incoming: string };
type Variant = { panels: Panel[]; aria: string };

const VARIANTS: Record<Lang, Record<"basic" | "trap", Variant>> = {
	ko: {
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
	},
	en: {
		basic: {
			panels: [
				{ group: "same", sim: 0.959, stored: "How do I get a refund?", incoming: "What do I need to do to get a refund?" },
				{ group: "unrelated", sim: 0.56, stored: "How do I get a refund?", incoming: "What are the Seoul store's hours?" },
			],
			aria: "Question vectors drawn as arrows to compare the angles of two pairs. \"How do I get a refund?\" and \"What do I need to do to get a refund?\" are about 16 degrees apart, a similarity of 0.959. \"How do I get a refund?\" and \"What are the Seoul store's hours?\" are about 56 degrees apart, a similarity of 0.560. The questions were measured in Korean and are shown translated.",
		},
		trap: {
			panels: [
				{ group: "different", sim: 0.97, stored: "How do I convert dollars to won?", incoming: "How do I convert won to dollars?" },
				{ group: "same", sim: 0.699, stored: "How do I cancel my membership?", incoming: "I want to delete my account" },
			],
			aria: "Question vectors drawn as arrows to compare the angles of two pairs. \"How do I convert dollars to won?\" and \"How do I convert won to dollars?\" need different answers, yet they are about 14 degrees apart, a similarity of 0.970. \"How do I cancel my membership?\" and \"I want to delete my account\" mean the same thing, yet they are about 46 degrees apart, a similarity of 0.699. The questions were measured in Korean and are shown translated.",
		},
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

export default function AngleDiagram({ variant, lang = "ko" }: { variant: "basic" | "trap"; lang?: Lang }) {
	const { panels, aria } = VARIANTS[lang][variant];
	const headline = (deg: number, sim: number) => (lang === "ko" ? `약 ${deg}도, 유사도 ${sim.toFixed(3)}` : `About ${deg}°, similarity ${sim.toFixed(3)}`);
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
							{GROUPS.find((g) => g.key === p.group)?.name[lang]}
						</text>
						<text x="172" y={PANEL_H * i + 64} fontSize="14" fontWeight="600" fill="var(--foreground)">
							{headline(Math.round((rad * 180) / Math.PI), p.sim)}
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

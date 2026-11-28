import type { GroupKey } from "./data";

// 세 무리를 색과 모양으로 함께 가른다. 동그라미는 뜻이 같은 질문, 세모는 답이 다른 질문, 네모는 상관없는 질문이다.
export const MARK_STYLE = `
	.sc-same { --sc: #1971c2; } .sc-different { --sc: #e8590c; } .sc-unrelated { --sc: rgb(var(--gray)); }
	html.dark .sc-same { --sc: #339af0; }
`;

export function Mark({ group, x, y, filled = true }: { group: GroupKey; x: number; y: number; filled?: boolean }) {
	const paint = {
		fill: filled ? "var(--sc)" : "var(--background)",
		stroke: "var(--sc)",
		strokeWidth: 1.5,
		strokeOpacity: filled ? 1 : 0.55,
	};
	return (
		<g className={`sc-${group}`}>
			{group === "same" && <circle cx={x} cy={y} r="4.5" {...paint} />}
			{group === "different" && <path d={`M${x},${y - 5.5} l5.2,9.5 h-10.4 z`} {...paint} />}
			{group === "unrelated" && <rect x={x - 4.2} y={y - 4.2} width="8.4" height="8.4" {...paint} />}
		</g>
	);
}

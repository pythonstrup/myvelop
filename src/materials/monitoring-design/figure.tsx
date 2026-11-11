// 이 글의 정적 그림들이 같이 쓰는 색 클래스와 알약 모양 이름표.
// 색은 shared.ts 의 palette 와 같고, html.dark 에서 어두운 값으로 바뀐다.
export const FIG_STYLE = `
	.fg-bg { fill: var(--background); }
	.fg-text { fill: #343a40; } .fg-sub { fill: #868e96; } .fg-sub-line { stroke: #868e96; }
	.fg-frame { fill: none; stroke: #dee2e6; } .fg-box { fill: #f8f9fa; stroke: #dee2e6; }
	.fg-axis { stroke: #ced4da; } .fg-arrow { stroke: #adb5bd; } .fg-head { fill: #adb5bd; }
	.fg-blue { stroke: #1971c2; } .fg-blue-ink { fill: #1971c2; } .fg-blue-fill { fill: #d0ebff; }
	.fg-red { stroke: #e03131; } .fg-red-ink { fill: #e03131; } .fg-red-fill { fill: #ffe3e3; }
	.fg-amber { stroke: #e8590c; } .fg-amber-ink { fill: #e8590c; } .fg-amber-fill { fill: #ffe8cc; }
	.fg-green { stroke: #2f9e44; } .fg-green-ink { fill: #2f9e44; } .fg-green-fill { fill: #d3f9d8; }
	.fg-gray { stroke: #adb5bd; } .fg-gray-ink { fill: #868e96; } .fg-gray-fill { fill: #f1f3f5; }
	html.dark .fg-text { fill: #e9ecef; } html.dark .fg-sub { fill: #adb5bd; } html.dark .fg-sub-line { stroke: #adb5bd; }
	html.dark .fg-frame { stroke: rgba(255, 255, 255, 0.12); } html.dark .fg-box { fill: rgba(255, 255, 255, 0.05); stroke: rgba(255, 255, 255, 0.2); }
	html.dark .fg-axis { stroke: #495057; } html.dark .fg-arrow { stroke: #6c757d; } html.dark .fg-head { fill: #6c757d; }
	html.dark .fg-blue { stroke: #4dabf7; } html.dark .fg-blue-ink { fill: #4dabf7; } html.dark .fg-blue-fill { fill: rgba(77, 171, 247, 0.18); }
	html.dark .fg-red { stroke: #ff6b6b; } html.dark .fg-red-ink { fill: #ff6b6b; } html.dark .fg-red-fill { fill: rgba(255, 107, 107, 0.18); }
	html.dark .fg-amber { stroke: #ffa94d; } html.dark .fg-amber-ink { fill: #ffa94d; } html.dark .fg-amber-fill { fill: rgba(255, 169, 77, 0.18); }
	html.dark .fg-green { stroke: #69db7c; } html.dark .fg-green-ink { fill: #69db7c; } html.dark .fg-green-fill { fill: rgba(105, 219, 124, 0.18); }
	html.dark .fg-gray { stroke: #6c757d; } html.dark .fg-gray-ink { fill: #adb5bd; } html.dark .fg-gray-fill { fill: rgba(255, 255, 255, 0.05); }
`;

export type Tone = "blue" | "red" | "amber" | "green" | "gray";

// ponytail: 글자 폭은 어림값이다(한글 1em, 영숫자 0.6em). 이름표가 넘치면 여기 비율을 고친다.
const textWidth = (s: string, size: number) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? size * 0.6 : size), 0);

// cx, cy 가 가운데인 알약 이름표. maxX 를 주면 0 ~ maxX 안으로 밀어 넣는다.
export function Pill({ cx, cy, label, tone, maxX }: { cx: number; cy: number; label: string; tone: Tone; maxX?: number }) {
	const w = textWidth(label, 14) + 24;
	const x = maxX === undefined ? cx : Math.min(Math.max(cx, w / 2 + 2), maxX - w / 2 - 2);
	return (
		<g>
			{/* 어두운 테마의 반투명 바탕 뒤로 선이 비치지 않게 페이지 바탕색을 먼저 깐다 */}
			<rect x={x - w / 2} y={cy - 13} width={w} height={26} rx={13} className="fg-bg" />
			<rect x={x - w / 2} y={cy - 13} width={w} height={26} rx={13} className={`fg-${tone}-fill fg-${tone}`} strokeWidth={1.5} />
			<text x={x} y={cy + 5} textAnchor="middle" className={`fg-${tone}-ink`} fontSize={14} fontWeight={700}>
				{label}
			</text>
		</g>
	);
}

// 세로 점선. 이름표가 선을 덮도록 그림에서는 선을 모두 그린 뒤 이름표를 그린다.
export function VLine({ x, y1, y2, tone }: { x: number; y1: number; y2: number; tone: Tone }) {
	return <line x1={x} y1={y1} x2={x} y2={y2} className={`fg-${tone}`} strokeWidth={1.5} strokeDasharray="4 3" />;
}

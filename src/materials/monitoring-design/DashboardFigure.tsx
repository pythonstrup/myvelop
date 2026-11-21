// 「대시보드에 옮기면」의 서비스 대시보드 예시 그림. 정적 SVG로 SSR에서만 렌더링한다.
// 색은 shared.ts 의 palette 와 같고, html.dark 에서 어두운 값으로 바뀐다.
import type { ReactNode } from "react";

const W = 1200;
const H = 834;
const M = 40;
const GAP = 16;
const PH = 130;

const STYLE = `
	.db-text { fill: #343a40; } .db-sub { fill: #868e96; }
	.db-frame { fill: #f8f9fa; stroke: #dee2e6; } .db-panel { fill: #ffffff; stroke: #dee2e6; }
	.db-target { stroke: #adb5bd; } .db-badge { fill: #ffffff; }
	.db-blue { stroke: #1971c2; } .db-blue-fill { fill: #1971c2; }
	.db-red { stroke: #e03131; } .db-red-fill { fill: #e03131; }
	.db-amber { stroke: #e8590c; } .db-amber-fill { fill: #e8590c; }
	.db-green { stroke: #2f9e44; } .db-green-fill { fill: #2f9e44; }
	.db-gray { stroke: #adb5bd; } .db-gray-fill { fill: #adb5bd; }
	html.dark .db-text { fill: #e9ecef; } html.dark .db-sub { fill: #adb5bd; }
	html.dark .db-frame { fill: rgba(255, 255, 255, 0.02); stroke: rgba(255, 255, 255, 0.12); }
	html.dark .db-panel { fill: rgba(255, 255, 255, 0.05); stroke: rgba(255, 255, 255, 0.15); }
	html.dark .db-target { stroke: #6c757d; } html.dark .db-badge { fill: #0d1117; }
	html.dark .db-blue { stroke: #4dabf7; } html.dark .db-blue-fill { fill: #4dabf7; }
	html.dark .db-red { stroke: #ff6b6b; } html.dark .db-red-fill { fill: #ff6b6b; }
	html.dark .db-amber { stroke: #ffa94d; } html.dark .db-amber-fill { fill: #ffa94d; }
	html.dark .db-green { stroke: #69db7c; } html.dark .db-green-fill { fill: #69db7c; }
	html.dark .db-gray { stroke: #6c757d; } html.dark .db-gray-fill { fill: #6c757d; }
`;

const ARIA =
	"주문 서비스 대시보드 예시. 맨 위 서비스 상태 묶음에는 트래픽, 오류율, 성공과 실패를 나눈 지연, 목표선을 그은 포화, 지연 히트맵, 300ms 안에 끝난 비율이 있다. 가운데 리소스 묶음에는 CPU, 메모리, 앞으로 가득 찰 시점을 예측한 디스크가 있다. 맨 아래 사업과 배치 묶음에는 지난주 선을 점선으로 겹친 주문 완료 수와 배치가 마지막으로 성공한 뒤 지난 시간이 있다.";

type Tone = "blue" | "red" | "amber" | "green" | "gray";

// y 값(0 아래, 1 위)을 차트 영역 좌표로 바꾼다
const pts = (ys: readonly number[], w: number, h: number, from = 0, n = ys.length) =>
	ys.map((y, i) => `${(((from + i) / (n - 1)) * w).toFixed(1)},${(h - y * h).toFixed(1)}`).join(" ");

function Line({ ys, tone, w, h, dashed = false, opacity = 1, from, n }: { ys: readonly number[]; tone: Tone; w: number; h: number; dashed?: boolean; opacity?: number; from?: number; n?: number }) {
	return <polyline points={pts(ys, w, h, from, n)} fill="none" className={`db-${tone}`} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashed ? "6 5" : undefined} opacity={opacity} />;
}

function Target({ y, label, w, h }: { y: number; label: string; w: number; h: number }) {
	const yy = h - y * h;
	return (
		<g>
			<line x1={0} y1={yy} x2={w} y2={yy} className="db-target" strokeWidth={1.5} strokeDasharray="4 4" />
			<text x={w} y={yy - 5} textAnchor="end" className="db-sub" fontSize={12}>
				{label}
			</text>
		</g>
	);
}

function Legend({ items, w }: { items: readonly (readonly [string, Tone])[]; w: number }) {
	let x = w;
	const placed = [...items].reverse().map(([label, tone]) => {
		x -= label.length * 12 + 4 + 18;
		return { label, tone, x };
	});
	return (
		<g>
			{placed.map(({ label, tone, x: lx }) => (
				<g key={label}>
					<rect x={lx} y={-27} width={10} height={3} rx={1.5} className={`db-${tone}-fill`} />
					<text x={lx + 14} y={-22} className="db-sub" fontSize={12}>
						{label}
					</text>
				</g>
			))}
		</g>
	);
}

function Heatmap({ w, h }: { w: number; h: number }) {
	const cols = 16;
	const rows = 5;
	const weight = [0.15, 0.55, 0.95, 0.4, 0.12]; // 아래가 빠른 구간
	const cw = w / cols;
	const rh = h / rows;
	const cells = [];
	for (let c = 0; c < cols; c++) {
		for (let r = 0; r < rows; r++) {
			const wiggle = ((c * 7 + r * 3) % 5) / 10;
			const o = Math.min(1, weight[rows - 1 - r] * (0.75 + wiggle));
			cells.push(<rect key={`${c}-${r}`} x={c * cw + 1} y={r * rh + 1} width={cw - 2} height={rh - 2} rx={2} className="db-blue-fill" opacity={Number(o.toFixed(2))} />);
		}
	}
	return <g>{cells}</g>;
}

function Panel({ x, y, w, num, title, tone, body }: { x: number; y: number; w: number; num: number; title: string; tone: Tone; body: (cw: number, ch: number) => ReactNode }) {
	const cw = w - 32;
	const ch = PH - 66;
	return (
		<g transform={`translate(${x},${y})`}>
			<rect width={w} height={PH} rx={10} className="db-panel" />
			<circle cx={24} cy={24} r={12} className={`db-${tone}-fill`} />
			<text x={24} y={28.5} textAnchor="middle" className="db-badge" fontSize={13} fontWeight={700}>
				{num}
			</text>
			<text x={44} y={29} className="db-text" fontSize={15} fontWeight={700}>
				{title}
			</text>
			<g transform={`translate(16,${PH - ch - 16})`}>{body(cw, ch)}</g>
		</g>
	);
}

function Group({ y, tone, name, question }: { y: number; tone: Tone; name: string; question: string }) {
	return (
		<text x={M} y={y} className={`db-${tone}-fill`} fontSize={17} fontWeight={700}>
			{name}
			<tspan className="db-sub" fontSize={15} fontWeight={500} dx={10}>
				{question}
			</tspan>
		</text>
	);
}

const inner = W - 2 * M;
const w4 = (inner - 3 * GAP) / 4;
const w3 = (inner - 2 * GAP) / 3;
const w2 = (inner - GAP) / 2;
const xs = (w: number, k: number) => Array.from({ length: k }, (_, i) => M + i * (w + GAP));
const [r1, r2, r3, r4] = [xs(w4, 4), xs(w2, 2), xs(w3, 3), xs(w2, 2)];
// 묶음 제목과 줄의 y. 묶음 제목 16px 아래에 줄이 오고, 묶음 사이는 40, 같은 묶음의 줄 사이는 GAP 이다.
const G1 = 130;
const ROW1 = G1 + 16;
const ROW2 = ROW1 + PH + GAP;
const G2 = ROW2 + PH + 40;
const ROW3 = G2 + 16;
const G3 = ROW3 + PH + 40;
const ROW4 = G3 + 16;

export default function DashboardFigure() {
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} style={{ display: "block", width: "100%", margin: "1.5rem auto" }}>
			<style>{STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={14} className="db-frame" />
			<text x={M} y={58} className="db-text" fontSize={28} fontWeight={700} letterSpacing={-0.5}>
				서비스 대시보드 예시
			</text>
			<text x={M} y={86} className="db-sub" fontSize={15}>
				위에서 아래로 증상, 원인, 일의 순서로 놓는다. 번호는 본문 설명의 순서다.
			</text>

			<Group y={G1} tone="blue" name="서비스 상태" question="지금 사용자가 불편한가" />
			<Panel x={r1[0]} y={ROW1} w={w4} num={1} title="트래픽" tone="blue" body={(w, h) => <Line ys={[0.35, 0.42, 0.5, 0.6, 0.7, 0.76, 0.74, 0.68, 0.6, 0.52, 0.46, 0.42]} tone="blue" w={w} h={h} />} />
			<Panel x={r1[1]} y={ROW1} w={w4} num={2} title="오류율" tone="red" body={(w, h) => <Line ys={[0.1, 0.08, 0.11, 0.09, 0.1, 0.08, 0.09, 0.62, 0.2, 0.1, 0.09, 0.1]} tone="red" w={w} h={h} />} />
			<Panel
				x={r1[2]}
				y={ROW1}
				w={w4}
				num={3}
				title="지연"
				tone="blue"
				body={(w, h) => (
					<>
						<Legend items={[["성공", "blue"], ["실패", "red"]]} w={w} />
						<Line ys={[0.45, 0.48, 0.44, 0.5, 0.55, 0.52, 0.5, 0.58, 0.5, 0.47, 0.46, 0.48]} tone="blue" w={w} h={h} />
						<Line ys={[0.18, 0.2, 0.17, 0.22, 0.2, 0.19, 0.21, 0.24, 0.2, 0.18, 0.19, 0.2]} tone="red" w={w} h={h} opacity={0.85} />
					</>
				)}
			/>
			<Panel
				x={r1[3]}
				y={ROW1}
				w={w4}
				num={4}
				title="포화"
				tone="blue"
				body={(w, h) => (
					<>
						<Target y={0.8} label="목표" w={w} h={h} />
						<Line ys={[0.38, 0.42, 0.47, 0.55, 0.6, 0.64, 0.62, 0.58, 0.55, 0.5, 0.46, 0.44]} tone="blue" w={w} h={h} />
					</>
				)}
			/>
			<Panel x={r2[0]} y={ROW2} w={w2} num={5} title="지연 히트맵" tone="blue" body={(w, h) => <Heatmap w={w} h={h} />} />
			<Panel
				x={r2[1]}
				y={ROW2}
				w={w2}
				num={6}
				title="300ms 안에 끝난 비율"
				tone="blue"
				body={(w, h) => (
					<>
						<Target y={0.6} label="목표" w={w} h={h} />
						<Line ys={[0.86, 0.88, 0.87, 0.84, 0.86, 0.89, 0.88, 0.72, 0.83, 0.87, 0.88, 0.87]} tone="blue" w={w} h={h} />
					</>
				)}
			/>

			<Group y={G2} tone="amber" name="리소스" question="왜 느린가, 곧 바닥나는가" />
			<Panel x={r3[0]} y={ROW3} w={w3} num={7} title="CPU" tone="amber" body={(w, h) => <Line ys={[0.3, 0.34, 0.4, 0.48, 0.56, 0.6, 0.58, 0.52, 0.46, 0.4, 0.36, 0.33]} tone="amber" w={w} h={h} />} />
			<Panel x={r3[1]} y={ROW3} w={w3} num={8} title="메모리" tone="amber" body={(w, h) => <Line ys={[0.5, 0.52, 0.53, 0.55, 0.56, 0.58, 0.57, 0.58, 0.59, 0.6, 0.6, 0.61]} tone="amber" w={w} h={h} />} />
			<Panel
				x={r3[2]}
				y={ROW3}
				w={w3}
				num={9}
				title="디스크"
				tone="amber"
				body={(w, h) => (
					<>
						<Target y={1} label="가득 참" w={w} h={h} />
						<Line ys={[0.3, 0.34, 0.38, 0.42, 0.46, 0.5, 0.54, 0.58]} tone="amber" w={w} h={h} n={12} />
						<Line ys={[0.58, 0.68, 0.78, 0.88, 0.98]} tone="amber" w={w} h={h} dashed from={7} n={12} />
						<text x={(w * 7) / 11 + 6} y={h - 0.58 * h + 18} className="db-sub" fontSize={12}>
							예측
						</text>
					</>
				)}
			/>

			<Group y={G3} tone="green" name="사업과 배치" question="일이 잘 되고 있는가" />
			<Panel
				x={r4[0]}
				y={ROW4}
				w={w2}
				num={10}
				title="주문 완료 수"
				tone="green"
				body={(w, h) => (
					<>
						<Legend items={[["이번 주", "green"], ["지난주", "gray"]]} w={w} />
						<Line ys={[0.3, 0.36, 0.48, 0.6, 0.7, 0.66, 0.6, 0.68, 0.8, 0.74, 0.56, 0.42]} tone="gray" w={w} h={h} dashed />
						<Line ys={[0.32, 0.38, 0.5, 0.62, 0.72, 0.68, 0.2, 0.18, 0.78, 0.72, 0.58, 0.44]} tone="green" w={w} h={h} />
					</>
				)}
			/>
			<Panel
				x={r4[1]}
				y={ROW4}
				w={w2}
				num={11}
				title="배치 마지막 성공"
				tone="green"
				body={(_, h) => (
					<>
						<text x={0} y={h - 14} className="db-green-fill" fontSize={40} fontWeight={700} letterSpacing={-1}>
							2시간 전
						</text>
						<text x={168} y={h - 16} className="db-sub" fontSize={12}>
							마지막 성공 뒤 지난 시간
						</text>
					</>
				)}
			/>
		</svg>
	);
}

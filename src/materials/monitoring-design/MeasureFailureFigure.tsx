import { FIG_STYLE, Pill } from "./figure";

// 고장 난 곳에 따라 네 곳(브라우저 계측, 바깥 점검, 로드밸런서 지표, 서버 로그)이 실패를 잡는지 보여 주는 그림.
// 정적 SVG로 SSR에서만 렌더링한다. 색은 figure.tsx 의 FIG_STYLE 을 쓴다.
const W = 832;
const H = 214;
const BW = 150;
const BH = 52;
const XS = [95, 309, 523, 737] as const; // 사용자, DNS·인증서, 로드밸런서, 앱
const PROBE_Y = 56;
const MAIN_Y = 132;
const CHIP_Y = 184;
const HALF = BW / 2;

// caught 순서: 브라우저 계측, 바깥 점검, 로드밸런서 지표, 서버 로그
const SCENES = {
	1: {
		caught: [true, true, true, true],
		aria: "요청 길이 사용자, DNS·인증서, 로드밸런서, 앱 순서로 놓이고 바깥 점검은 DNS로 들어오는 그림. 앱 상자가 빨간 테두리이고 그 위에 500이 붙어 있으며, 네 곳이 모두 잡음이다.",
	},
	2: {
		caught: [true, true, true, false],
		aria: "흐려진 앱 상자로 가는 화살표에 X가 있고 로드밸런서 위에 5xx가 붙어 있는 그림. 브라우저 계측, 바깥 점검, 로드밸런서 지표는 잡음, 서버 로그는 놓침이다.",
	},
	3: {
		caught: [true, true, false, false],
		aria: "DNS·인증서 상자가 빨간 테두리이고 그리로 가는 화살표에 X가 있는 그림. 브라우저 계측과 바깥 점검은 잡음, 로드밸런서 지표와 서버 로그는 놓침이다.",
	},
	4: {
		caught: [true, false, false, false],
		aria: "사용자에서 DNS·인증서로 가는 화살표만 주황색이고 그 위에 느림이 붙어 있는 그림. 브라우저 계측만 잡음이고 나머지 세 곳은 놓침이다.",
	},
} as const;
type Scene = keyof typeof SCENES;

function Box({ cx, cy, h = BH, title, sub, failed = false, faded = false }: { cx: number; cy: number; h?: number; title: string; sub?: string; failed?: boolean; faded?: boolean }) {
	return (
		<g opacity={faded ? 0.45 : 1}>
			<rect x={cx - HALF} y={cy - h / 2} width={BW} height={h} rx={9} className={failed ? "fg-box fg-red" : "fg-box"} strokeWidth={failed ? 2.5 : 1.5} />
			{sub ? (
				<>
					<text x={cx} y={cy - 4} textAnchor="middle" className="fg-text" fontSize={17} fontWeight={700}>
						{title}
					</text>
					<text x={cx} y={cy + 16} textAnchor="middle" className="fg-sub" fontSize={14}>
						{sub}
					</text>
				</>
			) : (
				<text x={cx} y={cy + 6} textAnchor="middle" className="fg-text" fontSize={17} fontWeight={700}>
					{title}
				</text>
			)}
		</g>
	);
}

// 오른쪽(x1 → x2) 또는 아래(y1 → y2)로 가는 화살표
function Arrow({ x1, y1, x2, y2, amber = false, dashed = false }: { x1: number; y1: number; x2: number; y2: number; amber?: boolean; dashed?: boolean }) {
	const down = x1 === x2;
	const head = down ? `${x2 - 6},${y2 - 9} ${x2 + 6},${y2 - 9} ${x2},${y2}` : `${x2 - 9},${y2 - 6} ${x2 - 9},${y2 + 6} ${x2},${y2}`;
	return (
		<g>
			<line x1={x1} y1={y1} x2={down ? x2 : x2 - 8} y2={down ? y2 - 8 : y2} className={amber ? "fg-amber" : "fg-arrow"} strokeWidth={2} strokeDasharray={dashed ? "5 4" : undefined} />
			<polygon points={head} className={amber ? "fg-amber-ink" : "fg-head"} />
		</g>
	);
}

function Cross({ cx, cy }: { cx: number; cy: number }) {
	const d = 9;
	return <path d={`M${cx - d} ${cy - d}L${cx + d} ${cy + d}M${cx + d} ${cy - d}L${cx - d} ${cy + d}`} className="fg-red" strokeWidth={4} strokeLinecap="round" />;
}

const chip = (cx: number, cy: number, caught: boolean) => <Pill cx={cx} cy={cy} label={caught ? "잡음" : "놓침"} tone={caught ? "green" : "gray"} />;

export default function MeasureFailureFigure({ scene }: { scene: Scene }) {
	const s = SCENES[scene];
	const [ux, dx, lx, ax] = XS;
	const [byBrowser, byProbe, byLb, byLog] = s.caught;
	const count = s.caught.filter(Boolean).length;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={s.aria} style={{ display: "block", width: "100%", maxWidth: W, margin: "1.5rem auto" }}>
			<style>{FIG_STYLE}</style>
			<rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={12} className="fg-frame" />
			<text x={24} y={40} className="fg-sub" fontSize={16} fontWeight={700}>
				잡은 곳 {count} / 4
			</text>

			{/* 요청 길 */}
			<Arrow x1={ux + HALF} y1={MAIN_Y} x2={dx - HALF - 4} y2={MAIN_Y} amber={scene === 4} />
			<Arrow x1={dx + HALF} y1={MAIN_Y} x2={lx - HALF - 4} y2={MAIN_Y} />
			<Arrow x1={lx + HALF} y1={MAIN_Y} x2={ax - HALF - 4} y2={MAIN_Y} />
			<Arrow x1={dx} y1={PROBE_Y + 20} x2={dx} y2={MAIN_Y - BH / 2 - 4} dashed />

			{/* 상자 */}
			<Box cx={ux} cy={MAIN_Y} title="사용자" sub="브라우저 계측" />
			<Box cx={dx} cy={MAIN_Y} title="DNS·인증서" failed={scene === 3} />
			<Box cx={lx} cy={MAIN_Y} title="로드밸런서" sub="지표" />
			<Box cx={ax} cy={MAIN_Y} title="앱" sub="서버 로그" failed={scene <= 2} faded={scene === 2} />
			<Box cx={dx} cy={PROBE_Y} h={40} title="바깥 점검" sub="가상 머신" />

			{/* 고장 표시 */}
			{scene === 1 && <Pill cx={ax} cy={MAIN_Y - 44} label="500" tone="red" />}
			{scene === 2 && (
				<>
					<Cross cx={ax - HALF - 22} cy={MAIN_Y} />
					<Pill cx={lx} cy={MAIN_Y - 44} label="5xx" tone="red" />
				</>
			)}
			{scene === 3 && <Cross cx={dx - HALF - 22} cy={MAIN_Y} />}
			{scene === 4 && <Pill cx={(ux + dx) / 2} cy={MAIN_Y - 22} label="느림" tone="amber" />}

			{/* 네 곳이 잡았는지 */}
			{chip(ux, CHIP_Y, byBrowser)}
			{chip(dx + HALF + 40, PROBE_Y, byProbe)}
			{chip(lx, CHIP_Y, byLb)}
			{chip(ax, CHIP_Y, byLog)}
		</svg>
	);
}

// 고정 윈도우의 경계에서 외부 API가 한도보다 많이 보게 되는 상황.
// scene 1: 5초 칸 두 개의 경계 앞뒤에 100건씩 몰리면 3초부터 8초까지의 5초에 200건이 들어간다.
// scene 2: 1초 칸 20건으로 쪼개도 외부 API의 5초가 칸 여섯 개에 걸치면 120건이 들어간다.
// 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		title: ["5초 칸으로 셀 때", "1초 칸으로 쪼갰을 때"],
		ours: "우리 칸",
		sends: "보낸 시각",
		theirs: "외부 API의 5초",
		cell5: (n: number) => `칸 ${n} · 100건`,
		burst: "100건",
		seen1: "3초~8초 · 200건 → 429",
		seen2: "칸 6개에 걸친다 · 20 × 6 = 120건 → 429",
		note1: ["칸 안에서는 100건을 지켰다", "두 칸에 걸친 5초에는 두 배가 들어간다"],
		note2: ["칸당 16건으로 낮추면 16 × 6 = 96건", "걸치는 칸 수로 나눠야 넘치지 않는다"],
		sec: (t: number) => `${t}초`,
		aria: [
			"5초 칸으로 셀 때의 경계 문제. 우리 칸은 0초에서 5초, 5초에서 10초로 나뉜다. 첫 칸의 4초대에 100건, 둘째 칸이 열린 5초대에 100건을 보낸다. 칸 안에서는 100건을 지켰지만, 외부 API가 3초부터 8초까지를 한 칸으로 세면 200건이 들어가 429가 된다.",
			"1초 칸으로 쪼갰을 때의 경계 문제. 우리 칸은 1초마다 20건이다. 외부 API의 5초가 0.8초에서 5.8초라면 우리 칸 여섯 개에 걸친다. 첫 칸의 끝과 마지막 칸의 처음에 20건씩 몰리면 20 곱하기 6, 120건이 들어가 429가 된다. 칸당 16건으로 낮추면 96건으로 한도 안에 든다.",
		],
	},
	en: {
		title: ["Counting in 5-second windows", "Splitting into 1-second windows"],
		ours: "our windows",
		sends: "sends",
		theirs: "the API's 5 seconds",
		cell5: (n: number) => `window ${n} · 100`,
		burst: "100",
		seen1: "3s–8s · 200 → 429",
		seen2: "spans 6 windows · 20 × 6 = 120 → 429",
		note1: ["each window stayed at 100", "five seconds across the edge see twice that"],
		note2: ["at 16 per window, 16 × 6 = 96", "divide by the windows it can span"],
		sec: (t: number) => `${t}s`,
		aria: [
			"The edge problem with 5-second windows. Our windows run from 0 to 5 seconds and 5 to 10 seconds. We send 100 messages around second 4 and another 100 right after the second window opens at 5. Each window stays at 100, but if the API counts 3 to 8 seconds as one window, it sees 200 and returns 429.",
			"The edge problem with 1-second windows. Our windows allow 20 each second. If the API's 5 seconds run from 0.8 to 5.8 seconds, they span six of our windows. With 20 packed at the end of the first and 20 at the start of the last, the API sees 20 times 6, 120, and returns 429. Lowering each window to 16 keeps it at 96, inside the limit.",
		],
	},
} as const;
type Lang = keyof typeof LABELS;

const W = 460;
const L = 24;
const R = 436;

function Axis({ y, max, x, label }: { y: number; max: number; x: (t: number) => number; label: (t: number) => string }) {
	const ticks = Array.from({ length: max + 1 }, (_, i) => i);
	return (
		<g>
			<line x1={L} y1={y} x2={R} y2={y} stroke="rgb(var(--gray))" strokeOpacity="0.5" />
			{ticks.map((t) => (
				<g key={t}>
					<line x1={x(t)} y1={y} x2={x(t)} y2={y + 4} stroke="rgb(var(--gray))" strokeOpacity="0.6" />
					<text x={x(t)} y={y + 16} textAnchor="middle" fontSize="10.5" fill="var(--muted-foreground)">
						{label(t)}
					</text>
				</g>
			))}
		</g>
	);
}

function Bar({ x1, x2, y, count, h = 22 }: { x1: number; x2: number; y: number; count: number; h?: number }) {
	const n = Math.max(2, Math.round((x2 - x1) / 3));
	return (
		<g>
			{Array.from({ length: n }, (_, i) => {
				const cx = x1 + ((x2 - x1) * (i + 0.5)) / n;
				return <line key={i} x1={cx} y1={y} x2={cx} y2={y + h} stroke="var(--accent)" strokeWidth="1.4" strokeOpacity="0.85" />;
			})}
			<text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">
				{count}
			</text>
		</g>
	);
}

function Bracket({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
	return (
		<g>
			<rect x={x1} y={y} width={x2 - x1} height="26" rx="6" fill="var(--destructive)" fillOpacity="0.12" stroke="var(--destructive)" strokeOpacity="0.7" />
			<text x={(x1 + x2) / 2} y={y + 17} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--destructive)">
				{label}
			</text>
		</g>
	);
}

function RowLabel({ y, text }: { y: number; text: string }) {
	return (
		<text x={L} y={y} fontSize="11.5" fontWeight="600" fill="var(--muted-foreground)">
			{text}
		</text>
	);
}

export default function WindowEdgeDiagram({ lang = "ko", scene = 1 }: { lang?: Lang; scene?: 1 | 2 }) {
	const T = LABELS[lang];
	const one = scene === 1;
	const max = one ? 10 : 7;
	const x = (t: number) => L + (t / max) * (R - L);
	const H = 300;
	const yCells = 58;
	const ySends = 128;
	const yTheirs = 180;
	const yAxis = 222;
	const cells = one ? [0, 5] : [0, 1, 2, 3, 4, 5, 6];
	const span = one ? 5 : 1;
	return (
		<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.aria[scene - 1]} style={{ display: "block", maxWidth: W, margin: "1.75rem auto" }}>
			<text x="8" y="20" fontSize="14.5" fontWeight="700" fill="var(--foreground)">
				{T.title[scene - 1]}
			</text>

			<RowLabel y={yCells - 8} text={T.ours} />
			{cells.map((c, i) => (
				<g key={c}>
					<rect x={x(c) + 1} y={yCells} width={x(c + span) - x(c) - 2} height="26" rx="5" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.55" />
					<text x={(x(c) + x(c + span)) / 2} y={yCells + 17} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">
						{one ? T.cell5(i + 1) : "20"}
					</text>
				</g>
			))}

			<RowLabel y={ySends - 22} text={T.sends} />
			{one ? (
				<>
					<Bar x1={x(4.05)} x2={x(4.75)} y={ySends} count={100} />
					<Bar x1={x(5.05)} x2={x(5.75)} y={ySends} count={100} />
				</>
			) : (
				<>
					<Bar x1={x(0.82)} x2={x(0.98)} y={ySends} count={20} />
					{[1, 2, 3, 4].map((c) => (
						<Bar key={c} x1={x(c + 0.3)} x2={x(c + 0.7)} y={ySends} count={20} />
					))}
					<Bar x1={x(5.02)} x2={x(5.18)} y={ySends} count={20} />
					<Bar x1={x(6.3)} x2={x(6.7)} y={ySends} count={20} />
				</>
			)}

			<RowLabel y={yTheirs - 7} text={T.theirs} />
			{one ? <Bracket x1={x(3)} x2={x(8)} y={yTheirs} label={T.seen1} /> : <Bracket x1={x(0.8)} x2={x(5.8)} y={yTheirs} label={T.seen2} />}

			<Axis y={yAxis} max={max} x={x} label={T.sec} />

			<text x={W / 2} y={H - 30} textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				{(one ? T.note1 : T.note2)[0]}
			</text>
			<text x={W / 2} y={H - 10} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)">
				{(one ? T.note1 : T.note2)[1]}
			</text>
		</svg>
	);
}

import { PADDLE, PADDLE_LAST_STEP, PADDLE_PICK, TESSERACT, TESSERACT_LAST_STEP, TESSERACT_PICK } from "./learningCurve";

// 학습 곡선. 위 칸은 PaddleOCR이 학습하는 동안 잰 검증 정확도, 아래 칸은 Tesseract가 저장한 모델 10개를 val로 읽힌 줄 일치다.
// 한 걸음의 뜻이 달라(이미지 묶음 하나 / 줄 하나) x축은 칸마다 따로 두고, y축 범위만 같게 둔다. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
// 점과 숫자는 learningCurve.ts의 로그 값에서 계산한다. 옅은 띠는 본문이 말하는 구간이다.
type Point = { step: number; pct: number };

const paddle: Point[] = PADDLE.map(([step, acc]) => ({ step, pct: acc * 100 }));
const tess: Point[] = TESSERACT.map(([step, pct]) => ({ step, pct }));
const at = (points: Point[], step: number) => {
	const p = points.find((q) => q.step === step);
	if (!p) throw new Error(`학습 곡선에 ${step}걸음 점이 없다`);
	return p;
};
const paddleBest = Math.max(...paddle.map((p) => p.pct));
const paddleBestSteps = paddle.filter((p) => p.pct === paddleBest).map((p) => p.step);
const paddleReach = at(paddle, 6000);
const tessPick = at(tess, TESSERACT_PICK);
const pct = (v: number) => `${v.toFixed(1)}%`;
const steps = (v: number) => v.toLocaleString("ko-KR");

const PADDLE_BAND = { from: 6000, lo: 80, hi: 85 };
const TESS_BAND = { from: TESSERACT_PICK, lo: 69.7, hi: 71.8 };

const LABELS = {
	paddleTitle: "PaddleOCR · 학습 중 검증 정확도",
	paddleNote: "학습용 평가 기준이라 위 결과 표와 숫자가 다르다",
	paddleUnit: "걸음 (한 걸음 = 이미지 128장 묶음 하나)",
	tessTitle: "Tesseract · 저장된 모델 10개의 val 줄 일치",
	tessUnit: "걸음 (한 걸음 = 줄 하나)",
	pick: "고른 모델",
	aria: "학습 곡선 두 칸. 위 칸은 PaddleOCR이 학습하는 동안 500걸음마다 잰 검증 정확도다. 36.2%에서 출발해 6,000걸음에 80.4%가 되었고, 그 뒤로는 대부분 80~85% 사이를 오르내렸지만 8,000~11,000걸음 사이에 네 번 80% 아래로 내려갔고 가장 낮게는 11,000걸음의 72.2%였다. 가장 높은 85.5%가 14,000걸음과 16,000걸음에서 나왔고 16,000걸음 모델을 골랐다. 학습용 평가 기준이라 결과 표의 숫자와 다르다. 아래 칸은 Tesseract가 저장한 모델 10개를 val로 읽힌 줄 일치다. 100걸음 모델이 57.2%, 2만 3,500걸음(약 0.6바퀴) 모델이 74.0%로 가장 높아 이 모델을 골랐고, 그 뒤 모델들은 69.7~71.8%에 머물렀다.",
};

const X0 = 46;
const X1 = 466;
const Y_LO = 30;
const Y_HI = 100;
const PH = 120;
const Y_TICKS = [40, 60, 80, 100];
const TOP_P = 30;
const TOP_T = 218;
const FS = 10.5;

const xOf = (step: number, last: number) => X0 + (step / last) * (X1 - X0);
const yOf = (top: number, v: number) => top + ((Y_HI - v) / (Y_HI - Y_LO)) * PH;

// 칸 하나의 축·눈금·띠·선·점. 칸마다 다른 메모는 바깥에서 그린다.
function Plot({
	top,
	title,
	unit,
	last,
	ticks,
	points,
	band,
}: {
	top: number;
	title: string;
	unit: string;
	last: number;
	ticks: ReadonlyArray<readonly [number, string]>;
	points: Point[];
	band: { from: number; lo: number; hi: number };
}) {
	const bottom = top + PH;
	const bx = xOf(band.from, last);
	return (
		<g>
			<text x="20" y={top - 12} fontSize="12.5" fontWeight="600" fill="var(--muted-foreground)">
				{title}
			</text>
			{Y_TICKS.map((v) => (
				<g key={v}>
					<line x1={X0} y1={yOf(top, v)} x2={X1} y2={yOf(top, v)} stroke="rgb(var(--gray))" strokeOpacity="0.2" />
					<text x={X0 - 6} y={yOf(top, v) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
						{v}%
					</text>
				</g>
			))}
			<rect x={bx} y={yOf(top, band.hi)} width={X1 - bx} height={yOf(top, band.lo) - yOf(top, band.hi)} fill="var(--accent)" fillOpacity="0.12" />
			<line x1={X0} y1={bottom} x2={X1} y2={bottom} stroke="rgb(var(--gray))" strokeOpacity="0.7" />
			<line x1={X0} y1={top} x2={X0} y2={bottom} stroke="rgb(var(--gray))" strokeOpacity="0.7" />
			{ticks.map(([s, label]) => (
				<g key={s}>
					<line x1={xOf(s, last)} y1={bottom} x2={xOf(s, last)} y2={bottom + 4} stroke="rgb(var(--gray))" strokeOpacity="0.7" />
					<text x={xOf(s, last)} y={bottom + 15} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
						{label}
					</text>
				</g>
			))}
			<text x={X1} y={bottom + 30} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
				{unit}
			</text>
			<polyline
				points={points.map((p) => `${xOf(p.step, last)},${yOf(top, p.pct)}`).join(" ")}
				fill="none"
				stroke="var(--accent)"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			{points.map((p) => (
				<circle key={p.step} cx={xOf(p.step, last)} cy={yOf(top, p.pct)} r="2" fill="var(--accent)" />
			))}
		</g>
	);
}

// 눈여겨볼 점: 고른 모델은 채운 원, 나머지는 빈 원
const Mark = ({ x, y, picked = false }: { x: number; y: number; picked?: boolean }) => (
	<circle cx={x} cy={y} r={picked ? 4 : 3.5} fill={picked ? "var(--accent)" : "var(--background)"} stroke={picked ? "var(--background)" : "var(--accent)"} strokeWidth="1.5" />
);

export default function LearningCurveDiagram() {
	const t = LABELS;
	const px = (s: number) => xOf(s, PADDLE_LAST_STEP);
	const py = (v: number) => yOf(TOP_P, v);
	const tx = (s: number) => xOf(s, TESSERACT_LAST_STEP);
	const ty = (v: number) => yOf(TOP_T, v);
	const start = paddle[0];
	const tessFirst = tess[0];
	const [bestA, bestB] = paddleBestSteps;

	return (
		<svg viewBox="0 0 480 376" role="img" aria-label={t.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<Plot
				top={TOP_P}
				title={t.paddleTitle}
				unit={t.paddleUnit}
				last={PADDLE_LAST_STEP}
				ticks={[
					[0, "0"],
					[5000, "5,000"],
					[10000, "10,000"],
					[15000, "15,000"],
				]}
				points={paddle}
				band={PADDLE_BAND}
			/>
			<text x={px(start.step) + 7} y={py(start.pct) + 3} fontSize={FS} fill="var(--foreground)">
				출발 {pct(start.pct)}
			</text>
			<Mark x={px(paddleReach.step)} y={py(paddleReach.pct)} />
			<text x={px(paddleReach.step) - 7} y={py(paddleReach.pct) - 8} textAnchor="end" fontSize={FS} fill="var(--foreground)">
				{steps(paddleReach.step)}걸음 {pct(paddleReach.pct)}
			</text>
			<text x={X1} y={py(PADDLE_BAND.lo) + 12} textAnchor="end" fontSize={FS} fill="var(--muted-foreground)">
				{PADDLE_BAND.lo}~{PADDLE_BAND.hi}%
			</text>
			<Mark x={px(bestA)} y={py(paddleBest)} />
			<Mark x={px(bestB)} y={py(paddleBest)} picked={bestB === PADDLE_PICK} />
			<text x={px(bestA) - 7} y={py(paddleBest) - 8} textAnchor="end" fontSize={FS} fill="var(--foreground)">
				최고 {pct(paddleBest)} ({steps(bestA)}·{steps(bestB)}걸음)
			</text>
			<text x={px(PADDLE_PICK)} y={py(paddleBest) - 9} textAnchor="middle" fontSize={FS} fontWeight="600" fill="var(--accent)">
				{t.pick}
			</text>
			<text x={X1} y={TOP_P + PH - 6} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
				{t.paddleNote}
			</text>

			<Plot
				top={TOP_T}
				title={t.tessTitle}
				unit={t.tessUnit}
				last={TESSERACT_LAST_STEP}
				ticks={[
					[0, "0"],
					[40000, "4만"],
					[80000, "8만"],
					[120000, "12만"],
				]}
				points={tess}
				band={TESS_BAND}
			/>
			<text x={tx(tessFirst.step) + 4} y={ty(tessFirst.pct) + 14} fontSize={FS} fill="var(--foreground)">
				{pct(tessFirst.pct)}
			</text>
			<Mark x={tx(tessPick.step)} y={ty(tessPick.pct)} picked />
			<text x={tx(tessPick.step) - 6} y={ty(tessPick.pct) - 10} fontSize={FS} fill="var(--foreground)">
				최고 {pct(tessPick.pct)} · <tspan fontWeight="600" fill="var(--accent)">{t.pick}</tspan> (2만 3,500걸음, 약 0.6바퀴)
			</text>
			<text x={X1} y={ty(TESS_BAND.lo) + 14} textAnchor="end" fontSize={FS} fill="var(--muted-foreground)">
				{TESS_BAND.lo}~{TESS_BAND.hi}%
			</text>
		</svg>
	);
}

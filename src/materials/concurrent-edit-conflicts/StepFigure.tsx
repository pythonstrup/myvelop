// OT와 CRDT 그림이 함께 쓰는 단계별 움직이는 그림 틀. MDX 에서 client:visible 로 쓴다.
// 정해진 간격으로 다음 단계로 넘어가고, 단계 번호를 누르면 그 단계에서 멈춘다. 모션 최소화 설정이면 멈춘 채로 시작한다.
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

const STEP_MS = 3800;
const LAST_MS = 6500;

type Steps = ReturnType<typeof useSteps>;

export function useSteps(count: number) {
	const [step, setStep] = useState(0);
	const [playing, setPlaying] = useState(true);
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setPlaying(false);
		}
	}, []);
	useEffect(() => {
		if (!playing) return;
		const id = window.setTimeout(
			() => setStep((s) => (s + 1) % count),
			step === count - 1 ? LAST_MS : STEP_MS,
		);
		return () => window.clearTimeout(id);
	}, [playing, step, count]);
	return {
		step,
		playing,
		pick: (i: number) => {
			setStep(i);
			setPlaying(false);
		},
		toggle: () => setPlaying((p) => !p),
	};
}

const button = (on: boolean): CSSProperties => ({
	minWidth: 30,
	height: 30,
	padding: "0 9px",
	borderRadius: 6,
	border: "1px solid rgba(var(--gray), 0.45)",
	background: on ? "var(--accent)" : "var(--background)",
	color: on ? "var(--background)" : "var(--foreground)",
	fontSize: 12.5,
	fontWeight: 600,
	cursor: "pointer",
});

// 그림 틀과 단계 버튼, 단계 설명. 설명 칸은 단계가 바뀌어도 아래 글이 덜 움직이게 높이를 잡아 둔다.
export function StepFrame({
	h,
	label,
	captions,
	s,
	children,
}: {
	h: number;
	label: string;
	captions: string[];
	s: Steps;
	children: ReactNode;
}) {
	return (
		<div style={{ margin: "2rem 0" }}>
			<div style={{ overflowX: "auto" }}>
				<svg
					viewBox={`0 0 680 ${h}`}
					role="img"
					aria-label={label}
					style={{
						display: "block",
						minWidth: 560,
						maxWidth: 680,
						margin: "0 auto",
					}}
				>
					<style>
						{"@keyframes tm-in { from { opacity: 0 } to { opacity: 1 } }"}
					</style>
					<rect
						x="8"
						y="8"
						width="664"
						height={h - 16}
						rx="12"
						fill="var(--background)"
						stroke="rgb(var(--gray))"
						strokeOpacity="0.45"
					/>
					{children}
				</svg>
			</div>
			<div style={{ maxWidth: 680, margin: "0.75rem auto 0" }}>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
					<button type="button" onClick={s.toggle} style={button(false)}>
						{s.playing ? "멈춤" : "재생"}
					</button>
					{captions.map((caption, i) => (
						<button
							key={caption}
							type="button"
							aria-label={`${i + 1}단계`}
							aria-pressed={i === s.step}
							onClick={() => s.pick(i)}
							style={button(i === s.step)}
						>
							{i + 1}
						</button>
					))}
				</div>
				<p
					style={{
						margin: "0.6rem 0 0",
						minHeight: "5em",
						fontSize: "0.92rem",
						lineHeight: 1.65,
						color: "var(--foreground)",
					}}
				>
					{captions[s.step]}
				</p>
			</div>
		</div>
	);
}

// 단계가 바뀌면 자리와 투명도가 부드럽게 바뀐다. 안의 그림은 (0, 0) 기준으로 그린다.
export function Move({
	x,
	y,
	show = true,
	children,
}: {
	x: number;
	y: number;
	show?: boolean;
	children: ReactNode;
}) {
	return (
		<g
			style={{
				transform: `translate(${x}px, ${y}px)`,
				opacity: show ? 1 : 0,
				transition: "transform 0.7s ease, opacity 0.5s ease",
			}}
		>
			{children}
		</g>
	);
}

// 단계마다 새로 나타나는 글귀. key 가 바뀌면 다시 그려지며 서서히 나타난다.
export function FadeIn({ children }: { children: ReactNode }) {
	return <g style={{ animation: "tm-in 0.6s ease" }}>{children}</g>;
}

import { MONO } from "@/materials/aws-vpc-subnet-eni/canvas";
import type { Colors } from "@/materials/shared";

// 애니메이션 아래에 명령과 출력을 보여 주는 칸. 단계가 바뀌어도 그림이 밀리지 않게 줄 수를 고정한다.
type Tone = "cmd" | "out" | "ok" | "err";
export type TermLine = { tone: Tone; text: string };

export const cmd = (text: string): TermLine => ({ tone: "cmd", text });
export const out = (text: string): TermLine => ({ tone: "out", text });
export const ok = (text: string): TermLine => ({ tone: "ok", text });
export const err = (text: string): TermLine => ({ tone: "err", text });

const LINE = 17;
const PAD = 9;
const FONT_SIZE = 11;
const MAX_WIDTH = 600;

export const terminalHeight = (rows: number) => rows * LINE + PAD * 2;

export function terminal(ctx: CanvasRenderingContext2D, c: Colors, w: number, top: number, rows: number, lines: readonly TermLine[]) {
	const width = Math.min(MAX_WIDTH, w - 16);
	const x = (w - width) / 2;
	ctx.beginPath();
	ctx.roundRect(x, top, width, terminalHeight(rows), 8);
	ctx.fillStyle = c.boxFill;
	ctx.fill();
	ctx.strokeStyle = c.boxStroke;
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.font = `500 ${FONT_SIZE}px ${MONO}`;
	const widest = Math.max(...lines.map((line) => ctx.measureText(line.text).width));
	// 좁은 화면에서는 가장 긴 줄이 칸에 들어오도록 글자를 줄인다.
	const size = Math.min(FONT_SIZE, (FONT_SIZE * (width - PAD * 2)) / widest);
	ctx.font = `500 ${size}px ${MONO}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	const color: Record<Tone, string> = { cmd: c.text, out: c.sub, ok: c.green, err: c.red };
	lines.forEach((line, i) => {
		ctx.fillStyle = color[line.tone];
		ctx.fillText(line.text, x + PAD, top + PAD + LINE * i + LINE / 2);
	});
}

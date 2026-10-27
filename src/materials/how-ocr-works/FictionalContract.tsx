import type { ReactNode } from "react";

// 글 전체에서 쓰는 가상 계약서 한 장. DetectRecognizeDiagram과 MaskingDiagram이 같은 배치를 쓴다.
// 이름과 번호는 모두 임의로 만든 값이다. x는 viewBox 기준, y는 카드 윗변 기준이다.
export const CONTRACT = {
	ko: {
		title: "용역 계약서",
		rows: [
			["성명", "홍길동"],
			["주민등록번호", "000000-0000000"],
			["사업자등록번호", "000-00-00000"],
		],
		body: "갑과 을은 다음과 같이 계약을 체결한다.",
	},
	en: {
		title: "Service Agreement",
		rows: [
			["Name", "Jane Doe"],
			["Resident No.", "000000-0000000"],
			["Business No.", "000-00-00000"],
		],
		body: "Party A and Party B agree as follows.",
	},
} as const;
export type Lang = keyof typeof CONTRACT;

// SSR에서는 글자 폭을 잴 수 없으니 상자 크기는 Pretendard 실측 폭(em)으로 어림한다. 굵은 제목까지 덮도록 조금 넉넉히 잡았다.
function charWidth(ch: string) {
	if (/[ㄱ-힝]/.test(ch)) return 0.9;
	if (/[0-9A-Z]/.test(ch)) return 0.62;
	if (/[a-z]/.test(ch)) return 0.5;
	if (ch === "-") return 0.44;
	if (ch === "." || ch === " ") return 0.26;
	return 0.6;
}
export function textWidth(text: string, size: number, bold = false) {
	let width = 0;
	for (const ch of text) width += charWidth(ch) * size;
	return bold ? width * 1.06 : width;
}

const PAD_X = 6;
const PAD_Y = 5;
export const CARD_H = 198;
const TABLE_TOP = 66;
const ROW_H = 30;
const SPLIT_X = 184;

export type Box = { x: number; y: number; width: number; height: number };
export type Item = {
	key: string;
	text: string;
	x: number;
	y: number;
	size: number;
	bold: boolean;
	middle: boolean;
	box: Box;
	// 주민등록번호와 사업자등록번호의 값: 마스킹 대상
	sensitive: boolean;
};

// 텍스트 기준선 y와 글자 크기로 검출 상자를 만든다. middle이면 x는 중심이다.
function item(key: string, text: string, x: number, y: number, size: number, opts: { bold?: boolean; middle?: boolean; sensitive?: boolean } = {}): Item {
	const { bold = false, middle = false, sensitive = false } = opts;
	const width = textWidth(text, size, bold) + PAD_X * 2;
	const left = middle ? x - width / 2 : x - PAD_X;
	return { key, text, x, y, size, bold, middle, sensitive, box: { x: left, y: y - size - PAD_Y + 2, width, height: size + PAD_Y * 2 } };
}

// 카드 안쪽 y 기준 배치. 그리는 쪽에서 카드 top만큼 내린다.
export function contractItems(lang: Lang): Item[] {
	const c = CONTRACT[lang];
	const items = [item("title", c.title, 230, 38, 16, { bold: true, middle: true })];
	c.rows.forEach(([label, value], i) => {
		const y = TABLE_TOP + ROW_H * i + 20;
		items.push(item(`label-${i}`, label, (60 + SPLIT_X) / 2, y, 13, { middle: true }));
		items.push(item(`value-${i}`, value, SPLIT_X + 14, y, 13, { sensitive: i > 0 }));
	});
	items.push(item("body", c.body, 60, 182, 13));
	return items;
}

export const shift = (box: Box, top: number): Box => ({ ...box, y: box.y + top });

// 카드, 표 선, 글자를 그리고 children을 같은 좌표계 위에 얹는다. hidden에 든 항목은 글자를 그리지 않는다.
export function ContractCard({ lang, top, hidden = [], children }: { lang: Lang; top: number; hidden?: string[]; children?: ReactNode }) {
	const line = { stroke: "rgb(var(--gray))", strokeOpacity: 0.5 } as const;
	return (
		<g>
			<rect x="40" y={top} width="380" height={CARD_H} rx="8" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.45" />
			<rect x="60" y={top + TABLE_TOP} width="340" height={ROW_H * 3} fill="none" {...line} />
			<line x1={SPLIT_X} y1={top + TABLE_TOP} x2={SPLIT_X} y2={top + TABLE_TOP + ROW_H * 3} {...line} />
			{[1, 2].map((i) => (
				<line key={i} x1="60" y1={top + TABLE_TOP + ROW_H * i} x2="400" y2={top + TABLE_TOP + ROW_H * i} {...line} />
			))}
			{contractItems(lang)
				.filter((it) => !hidden.includes(it.key))
				.map((it) => (
					<text
						key={it.key}
						x={it.x}
						y={top + it.y}
						textAnchor={it.middle ? "middle" : undefined}
						fontSize={it.size}
						fontWeight={it.bold ? 700 : undefined}
						fill="var(--foreground)"
					>
						{it.text}
					</text>
				))}
			{children}
		</g>
	);
}

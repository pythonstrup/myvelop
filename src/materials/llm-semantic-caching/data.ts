// 질문 14쌍의 코사인 유사도. 글을 쓰며 공개 임베딩 모델로 로컬에서 잰 값이다(질문 문장은 글의 표에 있다).
// 순서는 글의 표와 같다. 뜻이 같은 6쌍, 답이 다른 6쌍, 상관없는 2쌍.
export type Sims = { same: number[]; different: number[]; unrelated: number[] };

// Xenova/bge-m3(q8), 질문만
export const BGE_M3: Sims = {
	same: [0.959, 0.881, 0.849, 0.827, 0.699, 0.849],
	different: [0.921, 0.931, 0.822, 0.97, 0.944, 0.898],
	unrelated: [0.56, 0.479],
};

// 같은 모델, 앞에 시스템 프롬프트 37토큰
export const BGE_M3_SHORT_SYSTEM: Sims = {
	same: [0.977, 0.94, 0.954, 0.933, 0.89, 0.925],
	different: [0.964, 0.961, 0.887, 0.99, 0.98, 0.959],
	unrelated: [0.781, 0.816],
};

// 같은 모델, 앞에 시스템 프롬프트 261토큰
export const BGE_M3_LONG_SYSTEM: Sims = {
	same: [0.992, 0.985, 0.987, 0.986, 0.981, 0.983],
	different: [0.991, 0.993, 0.973, 0.992, 0.993, 0.992],
	unrelated: [0.974, 0.976],
};

// Xenova/multilingual-e5-small(fp32), "query: " 접두어, 질문만
export const E5_SMALL: Sims = {
	same: [0.972, 0.872, 0.946, 0.901, 0.835, 0.901],
	different: [0.973, 0.971, 0.935, 0.994, 0.959, 0.97],
	unrelated: [0.799, 0.81],
};

// Xenova/paraphrase-multilingual-MiniLM-L12-v2(fp32), 질문만
export const MINILM: Sims = {
	same: [0.805, 0.623, 0.89, 0.466, 0.587, 0.711],
	different: [0.914, 0.918, 0.9, 0.983, 0.93, 0.991],
	unrelated: [0.244, 0.375],
};

export const GROUPS = [
	{ key: "same", name: "뜻이 같은 질문" },
	{ key: "different", name: "답이 다른 질문" },
	{ key: "unrelated", name: "상관없는 질문" },
] as const;
export type GroupKey = (typeof GROUPS)[number]["key"];

// 엉뚱한 답이 나갈 수 있는 8쌍의 문장. 순서는 BGE_M3의 different 6쌍, unrelated 2쌍과 같다.
export const WRONG_PAIRS: { group: GroupKey; stored: string; incoming: string; sim: number }[] = [
	...[
		["반품이 되는 상품은 무엇인가요?", "반품이 안 되는 상품은 무엇인가요?"],
		["3일 안에 취소하면 수수료가 얼마인가요?", "30일 안에 취소하면 수수료가 얼마인가요?"],
		["서울 매장 영업시간이 어떻게 되나요?", "부산 매장 영업시간이 어떻게 되나요?"],
		["달러를 원화로 바꾸려면 어떻게 하나요?", "원화를 달러로 바꾸려면 어떻게 하나요?"],
		["지난달 결제 금액 알려 주세요", "이번 달 결제 금액 알려 주세요"],
		["자동 결제를 켜는 방법 알려 주세요", "자동 결제를 끄는 방법 알려 주세요"],
	].map(([stored, incoming], i) => ({ group: "different" as const, stored, incoming, sim: BGE_M3.different[i] })),
	...[
		["환불은 어떻게 하나요?", "서울 매장 영업시간이 어떻게 되나요?"],
		["비밀번호를 잊어버렸어요", "배송은 며칠 걸려요?"],
	].map(([stored, incoming], i) => ({ group: "unrelated" as const, stored, incoming, sim: BGE_M3.unrelated[i] })),
];

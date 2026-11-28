import type { Lang } from "./data";

// 캐시를 키 하나로 함께 쓸 때와 사용자마다 나눌 때, 같은 질문에 누구의 답이 나가는지 견주는 정적 그림. 금액은 가정한 값이다.
const LABELS = {
	ko: {
		aria: "같은 질문 「이번 달 결제 금액 알려 주세요」를 사용자 A와 B가 차례로 묻는 두 경우를 위아래로 견준 그림. 위는 키 하나로 캐시를 함께 쓰는 기본 설정이다. A가 먼저 물어 A의 금액 42,000원이 저장되고, B가 같은 질문을 하면 적중해 A의 42,000원을 받는다. 아래는 사용자마다 캐시를 나눈 설정이다. B의 캐시는 비어 있어 놓치고, 모델이 새로 답해 B의 금액 15,000원을 받는다. 금액은 가정한 값이다.",
		shared: "키 하나로 함께 쓸 때",
		split: "사용자마다 나눌 때",
		userA: "사용자 A",
		userB: "사용자 B",
		sharedBucket: "모두의 캐시: 이번 달 결제 금액",
		aBucket: "A의 캐시",
		bBucket: "B의 캐시: 비어 있었다",
		aAmount: "A의 42,000원",
		bAmount: "B의 15,000원",
		askStore: "① 묻고 저장한다",
		ask: "② 묻는다",
		miss: "② 놓친다",
		seesA: "A의 금액을 본다",
		seesOwn: "자기 금액을 본다",
		footer: "금액은 그림을 위해 가정한 값이다",
	},
	en: {
		aria: "Two cases compared top and bottom, in which users A and B ask the same question, \"Tell me this month's payment amount\", one after the other. The top is the default setup, where one key shares the cache. A asks first, so A's amount of ₩42,000 is stored. When B asks the same question, it hits and B gets A's ₩42,000. The bottom splits the cache per user. B's cache is empty, so the request misses, the model answers again, and B gets B's own amount of ₩15,000. The amounts are assumed.",
		shared: "Sharing the cache under one key",
		split: "Splitting the cache per user",
		userA: "User A",
		userB: "User B",
		sharedBucket: "Shared: this month's payment",
		aBucket: "A's cache",
		bBucket: "B's cache: was empty",
		aAmount: "A's ₩42,000",
		bAmount: "B's ₩15,000",
		askStore: "① asks, stored",
		ask: "② asks",
		miss: "② misses",
		seesA: "sees A's amount",
		seesOwn: "sees own amount",
		footer: "The amounts are assumed for this figure",
	},
};

const USER_X = 8;
const USER_W = 78;
const BOX_X = 196;
const BOX_W = 196;

function Arrow({ y, label, tone, back = false }: { y: number; label: string; tone: "ok" | "bad" | "plain"; back?: boolean }) {
	const color = tone === "bad" ? "var(--scope-bad)" : tone === "ok" ? "var(--accent)" : "rgb(var(--gray))";
	const [from, to] = back ? [BOX_X - 4, USER_X + USER_W + 6] : [USER_X + USER_W + 4, BOX_X - 6];
	return (
		<g>
			<line x1={from} x2={back ? to + 8 : to - 8} y1={y} y2={y} stroke={color} strokeWidth="1.8" />
			<path d={`M${to},${y} l${back ? 10 : -10},-5 v10 z`} fill={color} />
			<text x={(from + to) / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight={tone === "bad" ? 600 : 400} fill={tone === "plain" ? "var(--muted-foreground)" : color}>
				{label}
			</text>
		</g>
	);
}

function User({ y, name }: { y: number; name: string }) {
	return (
		<g>
			<rect x={USER_X} y={y} width={USER_W} height="50" rx="8" fill="var(--secondary)" />
			<text x={USER_X + USER_W / 2} y={y + 30} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
				{name}
			</text>
		</g>
	);
}

function Bucket({ y, h, title, value, empty = false }: { y: number; h: number; title: string; value: string; empty?: boolean }) {
	return (
		<g>
			<rect x={BOX_X} y={y} width={BOX_W} height={h} rx="8" fill="none" stroke="rgb(var(--gray))" strokeDasharray={empty ? "4 3" : undefined} strokeWidth="1.4" />
			<text x={BOX_X + BOX_W / 2} y={y + h / 2 - 6} textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{title}
			</text>
			<text x={BOX_X + BOX_W / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
				{value}
			</text>
		</g>
	);
}

export default function CacheScopeDiagram({ lang = "ko" }: { lang?: Lang }) {
	const l = LABELS[lang];
	return (
		<svg viewBox="0 0 400 372" role="img" aria-label={l.aria} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<style>{`:root { --scope-bad: #c92a2a; } html.dark { --scope-bad: #ff8787; }`}</style>

			<text x="8" y="16" fontSize="13" fontWeight="600" fill="var(--foreground)">
				{l.shared}
			</text>
			<User y={28} name={l.userA} />
			<User y={104} name={l.userB} />
			<Bucket y={28} h={126} title={l.sharedBucket} value={l.aAmount} />
			<Arrow y={54} label={l.askStore} tone="plain" />
			<Arrow y={119} label={l.ask} tone="plain" />
			<Arrow y={143} label={l.seesA} tone="bad" back />

			<line x1="8" x2="392" y1="178" y2="178" stroke="var(--border)" />

			<text x="8" y="202" fontSize="13" fontWeight="600" fill="var(--foreground)">
				{l.split}
			</text>
			<User y={214} name={l.userA} />
			<User y={290} name={l.userB} />
			<Bucket y={214} h={50} title={l.aBucket} value={l.aAmount} />
			<Bucket y={290} h={50} title={l.bBucket} value={l.bAmount} empty />
			<Arrow y={240} label={l.askStore} tone="plain" />
			<Arrow y={305} label={l.miss} tone="plain" />
			<Arrow y={329} label={l.seesOwn} tone="ok" back />
			<text x="200" y="364" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				{l.footer}
			</text>
		</svg>
	);
}

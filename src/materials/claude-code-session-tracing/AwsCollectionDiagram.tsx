// Claude Code 세션 텔레메트리를 AWS 에서 수집하는 배치도. 정적 SVG — client 디렉티브 없이 SSR로만 렌더링한다.
const LABELS = {
	ko: {
		laptops: "구성원 노트북 × N",
		cc: "Claude Code",
		ccSub: "세션 = 프로세스",
		sdk: "OTel SDK",
		note1: "managed settings 로",
		note2: "endpoint·토큰 배포",
		note3: "본문 범위는",
		note4: "OTEL_LOG_* 로 결정",
		req1: "모델 요청 · claude.ai 로그인",
		req2: "api.anthropic.com 직행",
		api1: "Anthropic",
		api2: "API",
		push1: "OTLP push",
		push2: "https · 토큰",
		vpc: "AWS · VPC",
		alb: "ALB · TLS",
		collector: "OTel Collector",
		ecs: "ECS Fargate",
		collectorDo: "토큰 검증 · batch · 마스킹",
		trace1: "트레이스",
		trace2: "otlphttp · Basic 인증",
		log1: "로그 이벤트",
		log2: "본문 포함",
		cw1: "CloudWatch",
		cw2: "Logs",
		lf: "Langfuse",
		lfSub: "ECS Fargate · 트레이스 저장",
		lfPath: "/api/public/otel",
		rds: "RDS",
		ch: "ClickHouse",
		s3: "S3",
		legend1: "OTel SDK 표식 = 프로세스 안에서 스팬·이벤트를 만드는 곳 · Collector = 회사가 운영하는 유일한 OTel 서비스",
		legend2: "모델 요청은 VPC 를 거치지 않는다",
		aria: "AWS 배치도. 구성원 노트북의 Claude Code 에는 OTel SDK 가 내장돼 있고, managed settings 로 endpoint 와 토큰을 받으며 본문 범위는 OTEL_LOG 환경변수로 정한다. 모델 요청은 claude.ai 로그인으로 api.anthropic.com 에 직행하고 VPC 를 거치지 않는다. Claude Code 의 OTLP push 는 ALB 를 지나 VPC 안 ECS Fargate 의 OTel Collector 로 가고, Collector 가 토큰 검증·batch·마스킹을 한 뒤 트레이스는 otlphttp 로 Langfuse 의 /api/public/otel 에, 응답과 원문 본문이 실린 로그 이벤트는 CloudWatch Logs 에 보낸다. Langfuse 는 RDS·ClickHouse·S3 에 저장한다.",
	},
	en: {
		laptops: "Developer laptops × N",
		cc: "Claude Code",
		ccSub: "session = process",
		sdk: "OTel SDK",
		note1: "managed settings push",
		note2: "endpoint + token",
		note3: "content scope set by",
		note4: "OTEL_LOG_* flags",
		req1: "model requests · claude.ai login",
		req2: "straight to api.anthropic.com",
		api1: "Anthropic",
		api2: "API",
		push1: "OTLP push",
		push2: "https · token",
		vpc: "AWS · VPC",
		alb: "ALB · TLS",
		collector: "OTel Collector",
		ecs: "ECS Fargate",
		collectorDo: "auth · batch · redaction",
		trace1: "traces",
		trace2: "otlphttp · Basic auth",
		log1: "log events",
		log2: "with bodies",
		cw1: "CloudWatch",
		cw2: "Logs",
		lf: "Langfuse",
		lfSub: "ECS Fargate · trace store",
		lfPath: "/api/public/otel",
		rds: "RDS",
		ch: "ClickHouse",
		s3: "S3",
		legend1: "OTel SDK marker = where spans and events are made inside a process · Collector = the only OTel service you run",
		legend2: "model requests never enter the VPC",
		aria: "AWS deployment diagram. Claude Code on developer laptops has the OTel SDK built in, receives its endpoint and token through managed settings, and the OTEL_LOG flags decide how much content is included. Model requests go straight to api.anthropic.com with the claude.ai login and never enter the VPC. Claude Code's OTLP push passes an ALB into the OTel Collector on ECS Fargate inside the VPC; the Collector checks tokens, batches, redacts, then sends traces over otlphttp to Langfuse at /api/public/otel and sends log events carrying responses and raw bodies to CloudWatch Logs. Langfuse stores into RDS, ClickHouse, and S3.",
	},
} as const;
type Lang = keyof typeof LABELS;

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export default function AwsCollectionDiagram({ lang = "ko" }: { lang?: Lang }) {
	const t = LABELS[lang];
	const box = { fill: "var(--secondary)", stroke: "rgb(var(--gray))", strokeOpacity: 0.45 } as const;
	const halo = { paintOrder: "stroke", stroke: "var(--background, #fff)", strokeWidth: 8, strokeLinejoin: "round" } as const;
	const edge = { className: "ac-flow", fill: "none", stroke: "rgb(var(--gray))", strokeWidth: 1.5, markerEnd: "url(#ac-arrow)" } as const;
	const muted = { fill: "var(--muted-foreground)" } as const;
	return (
		<svg
			viewBox="0 0 640 558"
			role="img"
			aria-label={t.aria}
			style={{ display: "block", maxWidth: 640, margin: "2rem auto" }}
		>
			<style>{`
				.ac-flow { stroke-dasharray: 5 5; animation: ac-dash 1s linear infinite; }
				@keyframes ac-dash { to { stroke-dashoffset: -10; } }
				@media (prefers-reduced-motion: reduce) { .ac-flow { animation: none; } }
			`}</style>
			<defs>
				<marker id="ac-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			{/* 영역 */}
			<rect x="12" y="44" width="152" height="270" rx="12" fill="none" stroke="rgb(var(--gray))" strokeOpacity="0.5" strokeDasharray="4 4" />
			<text x="24" y="64" fontSize="12" {...muted}>{t.laptops}</text>
			<rect x="170" y="176" width="370" height="328" rx="12" fill="none" stroke="rgb(var(--gray))" strokeOpacity="0.5" strokeDasharray="4 4" />
			<text x="212" y="196" fontSize="12" {...muted}>{t.vpc}</text>

			{/* 선 (상자보다 먼저 그려서 ALB 막대 아래로 지나가게) */}
			<line x1="154" y1="104" x2="550" y2="104" {...edge} />
			<path d="M154,140 H166 V248 H338" {...edge} />
			<line x1="410" y1="284" x2="410" y2="354" {...edge} />
			<line x1="480" y1="248" x2="550" y2="248" {...edge} />
			<path d="M410,420 V440 H298 V454 M410,440 V454 M410,440 H486 V454" fill="none" stroke="rgb(var(--gray))" strokeWidth="1.5" />

			{/* 선 라벨 */}
			<text x="352" y="90" textAnchor="middle" fontSize="11.5" {...muted} {...halo}>{t.req1}</text>
			<text x="352" y="121" textAnchor="middle" fontSize="11.5" {...muted} {...halo}>{t.req2}</text>
			<text x="266" y="234" textAnchor="middle" fontSize="11.5" {...muted} {...halo}>{t.push1}</text>
			<text x="266" y="264" textAnchor="middle" fontSize="11.5" {...muted} {...halo}>{t.push2}</text>
			<text x="418" y="313" fontSize="11.5" {...muted} {...halo}>{t.trace1}</text>
			<text x="418" y="329" fontSize="11" {...muted} {...halo}>{t.trace2}</text>
			<text x="516" y="236" textAnchor="middle" fontSize="10.5" {...muted} {...halo}>{t.log1}</text>
			<text x="516" y="266" textAnchor="middle" fontSize="10.5" {...muted} {...halo}>{t.log2}</text>

			{/* Claude Code */}
			<rect x="22" y="84" width="132" height="72" rx="10" {...box} />
			<text x="88" y="108" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">{t.cc}</text>
			<text x="88" y="125" textAnchor="middle" fontSize="11.5" {...muted}>{t.ccSub}</text>
			<rect x="56" y="134" width="64" height="16" rx="8" fill="var(--background)" stroke="var(--accent)" strokeOpacity="0.8" />
			<text x="88" y="145.5" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--accent)">{t.sdk}</text>
			<text x="88" y="192" textAnchor="middle" fontSize="11" {...muted}>{t.note1}</text>
			<text x="88" y="208" textAnchor="middle" fontSize="11" {...muted}>{t.note2}</text>
			<text x="88" y="240" textAnchor="middle" fontSize="11" {...muted}>{t.note3}</text>
			<text x="88" y="256" textAnchor="middle" fontSize="11" fontFamily={MONO} {...muted}>{t.note4}</text>

			{/* Anthropic API (VPC 밖) */}
			<rect x="552" y="70" width="80" height="68" rx="10" {...box} />
			<text x="592" y="98" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">{t.api1}</text>
			<text x="592" y="115" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">{t.api2}</text>

			{/* ALB 막대 */}
			<rect x="176" y="204" width="24" height="88" rx="6" {...box} />
			<text transform="rotate(-90 188 248)" x="188" y="252" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--foreground)">{t.alb}</text>

			{/* Collector */}
			<rect x="340" y="212" width="140" height="72" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="1.5" />
			<text x="410" y="236" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--accent)">{t.collector}</text>
			<text x="410" y="253" textAnchor="middle" fontSize="11.5" {...muted}>{t.ecs}</text>
			<text x="410" y="271" textAnchor="middle" fontSize="10.5" {...muted}>{t.collectorDo}</text>

			{/* CloudWatch Logs (관리형, VPC 밖) */}
			<rect x="552" y="214" width="80" height="68" rx="10" {...box} />
			<text x="592" y="243" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">{t.cw1}</text>
			<text x="592" y="260" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">{t.cw2}</text>

			{/* Langfuse */}
			<rect x="340" y="356" width="140" height="64" rx="10" {...box} />
			<text x="410" y="378" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">{t.lf}</text>
			<text x="410" y="395" textAnchor="middle" fontSize="11.5" {...muted}>{t.lfSub}</text>
			<text x="410" y="411" textAnchor="middle" fontSize="10.5" fontFamily={MONO} {...muted}>{t.lfPath}</text>

			{/* 저장소 */}
			<rect x="262" y="456" width="72" height="28" rx="7" {...box} />
			<text x="298" y="474" textAnchor="middle" fontSize="11.5" fill="var(--foreground)">{t.rds}</text>
			<rect x="344" y="456" width="100" height="28" rx="7" {...box} />
			<text x="394" y="474" textAnchor="middle" fontSize="11.5" fill="var(--foreground)">{t.ch}</text>
			<rect x="454" y="456" width="64" height="28" rx="7" {...box} />
			<text x="486" y="474" textAnchor="middle" fontSize="11.5" fill="var(--foreground)">{t.s3}</text>

			<text x="12" y="530" fontSize="10.5" {...muted}>{t.legend1}</text>
			<text x="12" y="546" fontSize="10.5" {...muted}>{t.legend2}</text>
		</svg>
	);
}

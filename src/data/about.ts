export type AboutLocale = 'en' | 'ko';

export interface AboutIntroduction {
	title: string;
	body: string;
}

export interface AboutLinkLabels {
	github: string;
	linkedin: string;
	blog: string;
}

export interface AboutHeroContent {
	eyebrow: string;
	name: string;
	introAriaLabel: string;
	introductions: AboutIntroduction[];
	linksAriaLabel: string;
	links: AboutLinkLabels;
	profileAlt: string;
}

export interface AboutMetric {
	value: string;
	label: string;
}

export interface AboutMetricsContent {
	label: string;
	items: AboutMetric[];
}

export interface AboutProjectHighlight {
	value: string;
	label: string;
}

export interface AboutProjectLink {
	href: string;
	label: string;
	external?: boolean;
}

export interface AboutProjectVisual {
	key: 'notification' | 'lohasmeal' | 'cache' | 'zeppelin';
	alt: string;
	caption: string;
	linkLabel: string;
}

export interface AboutFeaturedProjectContent {
	eyebrow: string;
	title: string;
	summary: string;
	highlights: AboutProjectHighlight[];
	stack: string[];
	links: AboutProjectLink[];
	visual?: AboutProjectVisual;
}

export interface AboutFeaturedProjectsContent {
	label: string;
	items: AboutFeaturedProjectContent[];
}

export interface AboutExperience {
	company: string;
	period: string;
	role: string;
	summary: string;
	bullets: string[];
}

export interface AboutExperienceContent {
	label: string;
	meta: string;
	items: AboutExperience[];
}

export interface AboutEducation {
	school: string;
	period: string;
	major: string;
	detail: string;
}

export interface AboutEducationContent {
	label: string;
	item: AboutEducation;
}

export interface AboutSkillsContent {
	label: string;
	items: string[];
}

export interface AboutDatedItem {
	year: string;
	text: string;
}

export interface AboutDatedListContent {
	label: string;
	items: AboutDatedItem[];
}

export interface AboutContent {
	meta: {
		title: string;
		description: string;
	};
	hero: AboutHeroContent;
	metrics: AboutMetricsContent;
	projects: AboutFeaturedProjectsContent;
	experience: AboutExperienceContent;
	education: AboutEducationContent;
	skills: AboutSkillsContent;
	activities: AboutDatedListContent;
	awards: AboutDatedListContent;
}

const aboutContent: Record<AboutLocale, AboutContent> = {
	ko: {
		meta: {
			title: 'About | 박종혁',
			description:
				'서비스의 성장을 안정적인 시스템으로 뒷받침하고, AI로 개발의 속도를 높이는 백엔드 개발자 박종혁입니다.',
		},
		hero: {
			eyebrow: 'SOFTWARE ENGINEER · BACKEND',
			name: '박종혁',
			introAriaLabel: '소개',
			introductions: [
				{
					title: 'AI Agent의 원리를 파고들고, 활용 방식을 확장합니다',
					body: 'GitHub Stars 23만+ 오픈소스 ECC에서 Top 10 Contributor로 활동하고 있습니다.',
				},
				{
					title: 'AI로 속도를 더합니다.',
					body: 'Git Worktree와 Claude Code를 활용하여 컬리 3PL 연동, 정기식단 & 식단 스케줄링 구축, 가격·할인 시스템 일원화까지 3개 프로젝트를 병렬 진행하여 3주 만에 개발을 완료했습니다.',
				},
				{
					title: '서비스와 함께 성장하는 개발자',
					body: '유닛블랙 세무자동화팀에서 전년 대비 20배 이상 규모의 유저 트래픽을 처리하고, 매출 645% 상승에 기여했습니다. 이유식 판매 플랫폼 로하스밀의 A to Z를 경험하고, 매출이 700% 증가 및 MAU 약 6배 증가의 성과를 기록했습니다. 서비스 확장과 함께 복잡해지는 기술적 과제를 기회삼아, 스터디와 기술 블로그를 통해 끊임없이 학습하며 성장하고 있습니다.',
				},
			],
			linksAriaLabel: '외부 링크',
			links: { github: 'GitHub', linkedin: 'LinkedIn', blog: '기술 블로그' },
			profileAlt: '박종혁 프로필 사진',
		},
		metrics: {
			label: '대표 성과',
			items: [
				{ value: '3천만 건', label: '한 달간 안정적으로 처리한 알림톡' },
				{ value: '3.3초→63ms', label: 'ECC 오픈소스 formatter hook 실행 시간' },
				{ value: '500→10ms', label: '캐시 계층 설계로 줄인 API 응답 시간' },
				{ value: '연 3천만 원+', label: '자동화 내재화로 절감한 외부 도구 비용' },
			],
		},
		projects: {
			label: '대표 프로젝트',
			items: [
				{
					eyebrow: 'NOTIFICATION PLATFORM · 2026',
					title: '한 달간 3천만 건을 처리한\n알림 발송 플랫폼',
					summary:
						'알림 발송이 API 서버·어드민·배치에 흩어져 외부 API의 rate limit을 강제할 곳이 없었고, 예약 발송과 벌크 실패 추적도 경로마다 따로 구현해야 했습니다. **아키텍처 설계를 전담해**, 흩어진 발송 경로를 유량 제어·지연·재시도가 내장된 Redis/BullMQ 큐 하나로 묶었고, 수평 확장 가능한 Worker로 한 달간 3천만 건의 알림톡을 안정적으로 처리했습니다.\n\n발송 이력·관측 데이터는 전달 경로와 분리해 Firehose·SQS/DLQ·Lambda·S3로 보관·분석하는 인프라를 Pulumi로 구축했습니다.',
					highlights: [
						{ value: '3천만 건', label: '한 달간 처리한 알림톡' },
						{ value: '약 15만 건', label: '알림 발송으로 이어진 신고 완료' },
						{ value: '151억 원', label: '알림 발송으로 이어진 매출 전환' },
					],
					stack: ['BullMQ', 'Redis', 'Kubernetes', 'AWS', 'Pulumi', 'BigQuery', 'Elastic', 'OpenTelemetry'],
					links: [{ href: '/ko/blog/20/', label: '기술 글 읽기' }],
					visual: {
						key: 'notification',
						alt: 'GitHub Actions가 이미지를 ECR에 게시하고 GitOps 브랜치를 갱신하면 Argo CD가 EKS에 배포하며, 내부 서비스의 Redis·BullMQ 작업과 Pulumi로 배포한 발송 이력 저장 인프라, 관측 파이프라인을 연결한 아키텍처',
						caption:
							'발송 처리와 이력 보관·분석을 분리하고, 이력 저장 인프라는 Pulumi로 배포한 구성입니다.',
						linkLabel: '아키텍처 크게 보기',
					},
				},
				{
					eyebrow: 'LOHASMEAL COMMERCE PLATFORM · 2023–2025',
					title: '매출 700% 성장과 함께 확장한\n로하스밀 커머스 플랫폼',
					summary:
						'10년 운영된 ASP/VB 시스템은 비즈니스 로직이 699개 스토어드 프로시저에 묶여 서비스 성장 속도를 따라가기 어려웠습니다. 프로시저를 전수 분석해 주문·결제·회원·상품·포인트·SCM 도메인을 Spring Boot 멀티모듈로 재구축하고 2개월 만에 마이그레이션했습니다. 서버사이드 Conversion API로 광고 전환 효율을 168% 높였고, 오픈 1년 만에 매출 700% 성장, 누적 회원 15만 명·MAU 3만 명으로 커졌습니다.',
					highlights: [
						{ value: '700%', label: '오픈 1년 내 매출 성장' },
						{ value: '누적 15만 명', label: '회원 규모 · MAU 3만 명' },
						{ value: '전환 효율 168%↑', label: '서버사이드 Conversion API 구축' },
					],
					stack: [
						'Spring Boot',
						'Nuxt',
						'Meta Conversion API',
						'Naver Cloud',
						'Kubernetes',
						'Jenkins',
						'Docker Hub',
						'MySQL',
						'Redis Sentinel',
						'Elastic Stack',
					],
					links: [
						{ href: '/ko/blog/10/', label: '외부 API 장애 대응 글 읽기' },
					],
					visual: {
						key: 'lohasmeal',
						alt: 'Jenkins에서 빌드한 이미지를 Docker Hub에 게시해 Naver Cloud의 Kubernetes 클러스터로 배포하고, Nuxt·Spring과 Redis Sentinel·MySQL 복제 구성, Object Storage, Sentry·Elastic 관측 계층을 연결한 로하스밀 서비스 구조',
						caption:
							'Jenkins와 Docker Hub를 거쳐 Kubernetes에 배포하고, Nuxt·Spring·Redis·MySQL을 Sentry·Elastic Stack으로 관측한 구조입니다.',
						linkLabel: '서비스 아키텍처 크게 보기',
					},
				},
				{
					eyebrow: 'KURLY 3PL INTEGRATION · 2025',
					title: '컬리 3PL 전환을 위한\n주문·배송·재고 연동',
					summary:
						'자체 보관 중심 물류는 배송사 상차 제약으로 익일 새벽배송 주문을 17시에 마감해야 했습니다. 컬리 3PL로 이관해 주문 등록·취소와 재고·배송 조회를 연동하고 마감을 19시로 늦췄습니다.\n\n한 화면에서 40~60건의 날짜별 배송 일정 조회에 외부 API로는 500ms~1초가 걸렸는데, 예측 가능하고 실시간성이 낮은 데이터라 캐시를 택했습니다. Redis만으로는 왕복·직렬화로 50~100ms가 남아, Caffeine L1을 앞단에 두고 Redis Pub/Sub 무효화로 인스턴스 정합성을 지키며 L1 응답을 약 10ms로 줄였습니다.\n\n외부 API 장애는 서킷 브레이커·폴백으로 격리해 주문 흐름이 끊기지 않게 했습니다.',
					highlights: [
						{ value: '17시→19시', label: '익일 새벽배송 주문 마감 연장' },
						{ value: '자체 보관→컬리 3PL', label: '물류 운영 전환' },
						{ value: '500ms~1초→약 10ms', label: '외부 API 대비 L1 캐시 응답' },
					],
					stack: ['Java', 'Spring Cache', 'Caffeine', 'Redis', 'Redis Pub/Sub'],
					links: [{ href: '/ko/blog/6/', label: '캐시 설계 글 읽기' }],
					visual: {
						key: 'cache',
						alt: '애플리케이션이 CompositeCache를 통해 Caffeine L1과 Redis L2를 차례로 조회하고, 모두 미스이면 서킷 브레이커를 거쳐 컬리 API를 호출하며, 회로가 열리면 폴백으로 처리하고 Redis Pub/Sub 무효화 이벤트를 다른 인스턴스의 로컬 캐시에 전파하는 구조',
						caption:
							'Caffeine L1, Redis L2와 Pub/Sub 무효화로 조회 속도와 정합성을 보완하고, 서킷 브레이커와 폴백으로 외부 API 장애가 주문 과정 전체로 번지는 것을 막았습니다.',
						linkLabel: '캐시 아키텍처 크게 보기',
					},
				},
				{
					eyebrow: 'OPEN SOURCE · APACHE ZEPPELIN · 2024',
					title: '인터프리터 자원을 격리한\nApache Zeppelin 컨테이너화',
					summary:
						'Flink·JDBC·Spark 등 여러 인터프리터가 한 컨테이너에서 자원을 공유해, 한 작업의 부하가 다른 작업의 성능·안정성까지 흔드는 구조였습니다. 인터프리터를 Kubernetes Pod 단위로 분리하는 컨테이너화에 기여해 자원·장애 영향 범위를 나누고 독립 실행·확장 기반을 마련했습니다.\n\n이 기여로 오픈소스 컨트리뷰션 아카데미 최우수상(정보통신산업진흥원장상)을 받았습니다. 팀 기여 기간에 Zeppelin은 Kafka·Spark 등 Apache TLP 가운데 커뮤니티 건강 지수 10/10으로 가장 높았고, 사용자 토론과 PR 리뷰도 각각 246%, 858% 늘었습니다.',
					highlights: [
						{ value: '최우수상', label: '정보통신산업진흥원장상' },
						{ value: '10/10', label: 'Apache TLP 최고 커뮤니티 건강 지수' },
						{ value: '246%↑', label: '사용자 토론 활동' },
					],
					stack: ['Apache Zeppelin', 'Kubernetes', 'Docker'],
					links: [{ href: '/ko/blog/1/', label: '오픈소스 기여 회고 읽기' }],
					visual: {
						key: 'zeppelin',
						alt: '하나의 Kubernetes Pod에서 Zeppelin Server와 여러 인터프리터가 자원을 공유하던 구조를 Zeppelin Server와 인터프리터별 독립 Pod 구조로 분리한 전후 비교',
						caption:
							'하나의 Pod에 모여 있던 인터프리터를 각각 분리해 자원과 장애 영향 범위를 나누고 독립 확장이 가능한 구조로 바꿨습니다.',
						linkLabel: '컨테이너화 구조 크게 보기',
					},
				},
				{
					eyebrow: 'OPEN SOURCE · ECC · 2026',
					title: 'formatter hook을 52배 빠르게 만든\nECC 오픈소스 기여',
					summary:
						'ECC의 formatter hook은 파일 편집마다 실행돼 매번 약 3.3초로 편집 흐름을 끊었습니다. 프로젝트 설정에 맞춰 Biome·Prettier를 자동 선택하는 감지 로직을 넣고, 로컬 바이너리 우선 사용과 중복 검사·프로세스 호출 제거로 실행 경로를 줄였습니다. 로컬 벤치마크 기준 실행 시간을 약 3.3초에서 63ms로 52배 단축했습니다.',
					highlights: [
						{ value: '3.3초→63ms', label: '로컬 벤치마크 기준 hook 실행' },
					],
					stack: ['Node.js', 'Biome', 'Prettier', 'Claude Code', 'Codex'],
					links: [
						{
							href: 'https://github.com/affaan-m/ECC/pull/252',
							label: 'formatter 자동 감지 PR',
							external: true,
						},
						{
							href: 'https://github.com/affaan-m/ECC/pull/359',
							label: '52배 최적화 PR',
							external: true,
						},
						{
							href: 'https://github.com/affaan-m/ECC',
							label: 'ECC 저장소',
							external: true,
						},
					],
				},
			],
		},
		experience: {
			label: '경력',
			meta: '총 4년',
			items: [
				{
					company: '(주)유닛블랙',
					period: '2026.01 — 현재',
					role: 'Software Engineer · 세무자동화',
					summary: '세무자동화 도메인에서 대규모 메시징, 외부 서비스 연동, 비용 최적화를 담당합니다.',
					bullets: [
						'알림 발송 플랫폼의 아키텍처 설계를 전담하고, BullMQ의 재시도·중복 제거·유량 제어로 한 달간 3천만 건의 알림톡을 안정적으로 발송했습니다. 알림을 받은 사용자 중 약 15만 명이 신고를 완료했고, 151억 원의 매출 전환으로 이어졌습니다.',
						'자리톡·카카오페이 연동을 개발해 일일 가입자 10만 명 달성과 사용자 규모 100% 성장에 기여했습니다.',
						'Zapier·Make 워크플로우를 내재화해 연간 3천만 원 이상의 외부 도구 비용을 절감했습니다.',
						'종합소득세 수수료율·할인·할증 정책을 5영업일 안에 설계하고 개발해 일정에 맞춰 출시했습니다.',
					],
				},
				{
					company: '주식회사 플라잉닥터',
					period: '2023.03 — 2025.12',
					role: 'Developer · 로하스밀 커머스',
					summary: '커머스 핵심 기능과 성능을 개선하며 서비스의 매출 성장과 운영 효율화를 경험했습니다.',
					bullets: [
						'L1/L2 캐시 계층을 설계해 외부 API 응답 시간을 500ms에서 10ms로 단축하고, Redis Pub/Sub 무효화와 TTL 정책으로 인스턴스 간 최종 일관성을 보완했습니다.',
						'블로킹 I/O에 Virtual Thread를 도입해 스레드 풀 고갈 문제를 해결하고 처리량을 10배 높였습니다.',
						'서버사이드 Conversion API를 구축해 광고 전환 효율을 168% 개선하고 매출 20% 상승에 기여했습니다.',
						'무료체험·정기 식단·3PL 연동 등 구매 전환 기능을 개발하고, 수작업 운영을 자동화해 투입 인력을 2명에서 1명으로 줄였습니다.',
						'Elastic Stack과 Slack 기반 모니터링을 구축해 장애 탐지와 대응 체계를 마련했습니다.',
					],
				},
			],
		},
		education: {
			label: '학력',
			item: {
				school: '인천대학교',
				period: '2015 — 2023',
				major: '문헌정보학과 · 컴퓨터공학부 학사',
				detail: '4.23 / 4.5 · 수석 졸업',
			},
		},
		skills: {
			label: '기술',
			items: [
				'Java',
				'Spring',
				'Node.js',
				'TypeScript',
				'Redis',
				'SQL',
				'JPA',
				'Docker',
				'Kubernetes',
				'AWS',
				'ELK',
				'Vue',
			],
		},
		activities: {
			label: '활동',
			items: [
				{ year: '2025', text: 'IT 연합 동아리 넥스터즈 26–27기 · PM, 챗봇 프롬프팅' },
				{ year: '2024', text: '오픈소스 컨트리뷰션 · Apache Zeppelin' },
				{ year: '2023', text: '글또 · 회차 베스트 글 3회 선정' },
				{ year: '2022', text: '네이버 부스트캠프 7기 · 풀스택 과정' },
			],
		},
		awards: {
			label: '수상',
			items: [
				{ year: '2025', text: '넥스터즈 27기 대상' },
				{ year: '2024', text: '오픈소스 컨트리뷰션 아카데미 최우수상' },
				{ year: '2023', text: '인천대학교 학장상 · 수석 졸업' },
			],
		},
	},
	en: {
		meta: {
			title: 'About | Jonghyeok Park',
			description:
				'Jonghyeok Park, a backend engineer who turns service growth into reliable systems and uses AI to move faster.',
		},
		hero: {
			eyebrow: 'SOFTWARE ENGINEER · BACKEND',
			name: 'Jonghyeok Park',
			introAriaLabel: 'Introduction',
			introductions: [
				{
					title: 'I explore how AI agents work and expand how they can be used',
					body: 'I am a Top 10 contributor to ECC, an open-source project with 230,000+ GitHub stars.',
				},
				{
					title: 'I move faster with AI.',
					body: 'Using Git Worktree and Claude Code, I completed three projects in parallel within three weeks: Kurly 3PL integration, recurring meal and meal scheduling, and price and discount system consolidation.',
				},
				{
					title: 'A developer who grows with the service',
					body: 'At Unitblack’s tax automation team, I handled more than 20 times the previous year’s user traffic and contributed to 645% revenue growth. I experienced Lohasmeal, a baby food sales platform, from A to Z, recording 700% revenue growth and approximately sixfold MAU growth. I treat the technical challenges that come with service expansion as opportunities and continue to learn through study groups and my technical blog.',
				},
			],
			linksAriaLabel: 'External links',
			links: { github: 'GitHub', linkedin: 'LinkedIn', blog: 'Tech blog' },
			profileAlt: 'Portrait of Jonghyeok Park',
		},
		metrics: {
			label: 'Selected impact',
			items: [
				{ value: '30M', label: 'Kakao notifications delivered in one month' },
				{ value: '3.3s→63ms', label: 'ECC open-source formatter hook runtime' },
				{ value: '500→10ms', label: 'API latency after layered caching' },
				{ value: '₩30M+/yr', label: 'Automation tooling cost saved with in-house workflows' },
			],
		},
		projects: {
			label: 'Featured projects',
			items: [
				{
					eyebrow: 'NOTIFICATION PLATFORM · 2026',
					title: 'A notification platform that handled\n30M Kakao messages in one month',
					summary:
						'Notification delivery was scattered across API servers, admin tools, and batch jobs, so nothing enforced the external API’s rate limits consistently, and scheduled sends and bulk-failure tracking had to be rebuilt in every path. I **owned the architecture design**, gathering the scattered delivery paths into a single Redis/BullMQ queue with built-in rate limiting, delays, and retries, controlled by horizontally scalable workers—handling 30 million Kakao notifications in a single month.\n\nDelivery history and observability data were separated from the delivery path, with archival and analytics pipelines on Firehose, SQS/DLQ, Lambda, and S3, defined and deployed with Pulumi.',
					highlights: [
						{ value: '30M', label: 'Kakao notifications handled in one month' },
						{ value: '150K', label: 'Tax filings completed after notification delivery' },
						{ value: '₩15.1B', label: 'Revenue converted after notification delivery' },
					],
					stack: ['BullMQ', 'Redis', 'Kubernetes', 'AWS', 'Pulumi', 'BigQuery', 'Elastic', 'OpenTelemetry'],
					links: [{ href: '/blog/20/', label: 'Read the technical write-up' }],
					visual: {
						key: 'notification',
						alt: 'Architecture showing GitHub Actions publishing images to ECR and updating GitOps branches for Argo CD deployment, internal services enqueueing work in Redis and BullMQ, and Pulumi-deployed delivery-history infrastructure alongside observability pipelines',
						caption:
							'The system separates delivery from history archival and analytics, with the history infrastructure deployed through Pulumi.',
						linkLabel: 'View the architecture',
					},
				},
				{
					eyebrow: 'LOHASMEAL COMMERCE PLATFORM · 2023–2025',
					title: 'A commerce platform that scaled alongside\n700% revenue growth',
					summary:
						'A decade-old ASP/VB system kept its business logic locked inside 699 stored procedures, making it hard to keep pace with a growing service. I analyzed every procedure and rebuilt orders, payments, accounts, catalog, points, and SCM as a Spring Boot multi-module platform, completing the migration in two months. I built a server-side Conversion API that improved ad conversion efficiency by 168%, and the service grew 700% in revenue within a year, reaching 150K cumulative members and 30K MAU.',
					highlights: [
						{ value: '700%', label: 'Revenue growth within the first year' },
						{ value: '150K members', label: 'Cumulative users · 30K MAU' },
						{ value: '168%↑', label: 'Conversion efficiency after server-side CAPI' },
					],
					stack: [
						'Spring Boot',
						'Nuxt',
						'Meta Conversion API',
						'Naver Cloud',
						'Kubernetes',
						'Jenkins',
						'Docker Hub',
						'MySQL',
						'Redis Sentinel',
						'Elastic Stack',
					],
					links: [
						{ href: '/blog/10/', label: 'Read the external API resilience post' },
					],
					visual: {
						key: 'lohasmeal',
						alt: 'Lohasmeal architecture where Jenkins publishes an image to Docker Hub for deployment to a Kubernetes cluster on Naver Cloud, with Nuxt, Spring, Redis Sentinel, replicated MySQL, Object Storage, Sentry, and Elastic services',
						caption:
							'Jenkins and Docker Hub deliver the application to Kubernetes, while Sentry and the Elastic Stack provide observability across Nuxt, Spring, Redis, and MySQL.',
						linkLabel: 'View the service architecture',
					},
				},
				{
					eyebrow: 'KURLY 3PL INTEGRATION · 2025',
					title: 'Order, delivery, and inventory integration\nfor the move to Kurly 3PL',
					summary:
						'In-house fulfillment kept the next-day dawn-delivery order cutoff at 5 PM because of the previous carrier’s loading constraint. Moving to Kurly 3PL, I integrated order registration and cancellation, inventory lookup, and delivery eligibility checks, extending the cutoff to 7 PM.\n\nA single screen needed 40–60 per-date delivery-schedule lookups that took 500 ms–1 s against the external API; the data was predictable by date and tolerated some staleness, so caching was the right fit. Redis alone still cost 50–100 ms in network round-trips and serialization, so I placed Caffeine L1 in front with Redis Pub/Sub invalidation for cross-instance consistency, serving L1 hits in about 10 ms.\n\nA circuit breaker and fallback isolated external API failures so the ordering flow could continue without interruption.',
					highlights: [
						{ value: '5 PM→7 PM', label: 'Next-day dawn-delivery order cutoff' },
						{ value: 'In-house→Kurly 3PL', label: 'Fulfillment operation migrated' },
						{ value: '500ms–1s→~10ms', label: 'L1 latency versus the external API' },
					],
					stack: ['Java', 'Spring Cache', 'Caffeine', 'Redis', 'Redis Pub/Sub'],
					links: [{ href: '/blog/6/', label: 'Read the cache design' }],
					visual: {
						key: 'cache',
						alt: 'The application reading Caffeine L1 and Redis L2 through CompositeCache, calling the Kurly API through a circuit breaker after both miss, falling back when the circuit is open, and propagating Redis Pub/Sub invalidation events to local caches across application instances',
						caption:
							'Caffeine L1, Redis L2, and Pub/Sub invalidation improve read performance and consistency, while a circuit breaker and fallback keep external API failures from disrupting the ordering flow.',
						linkLabel: 'View the cache architecture',
					},
				},
				{
					eyebrow: 'OPEN SOURCE · APACHE ZEPPELIN · 2024',
					title: 'Containerized Apache Zeppelin\nwith isolated interpreter resources',
					summary:
						'Flink, JDBC, Spark, and other interpreters shared resources in one container, so one interpreter’s heavy workload could shake the performance and stability of everything else. I contributed to moving interpreters into separate Kubernetes Pods, dividing their resource and failure boundaries and enabling independent execution and scaling.\n\nThis work earned the Excellence Award (NIPA President’s Award) at the Open Source Contribution Academy. During the team’s contribution period, Zeppelin recorded a 10/10 community health score—the highest among Apache TLPs including Kafka and Spark—while user discussion and PR review activity grew 246% and 858%, respectively.',
					highlights: [
						{ value: 'Excellence Award', label: 'NIPA President’s Award' },
						{ value: '10/10', label: 'Highest community health score among Apache TLPs' },
						{ value: '+246%', label: 'User discussion activity' },
					],
					stack: ['Apache Zeppelin', 'Kubernetes', 'Docker'],
					links: [{ href: '/blog/1/', label: 'Read the open-source retrospective' }],
					visual: {
						key: 'zeppelin',
						alt: 'A before-and-after comparison of Zeppelin Server and multiple interpreters sharing one Kubernetes Pod versus Zeppelin Server and each interpreter running in separate Pods',
						caption:
							'Separating interpreters into individual Pods divided their resource and failure boundaries and enabled independent scaling.',
						linkLabel: 'View the containerized architecture',
					},
				},
				{
					eyebrow: 'OPEN SOURCE · ECC · 2026',
					title: 'Made ECC formatter hooks\n52× faster',
					summary:
						'ECC’s formatter hook runs after every file edit, and each run took about 3.3 seconds—breaking the editing flow every time. I added project-aware Biome and Prettier detection, then shortened the execution path by preferring local binaries, removing duplicate checks, and invoking hooks in-process. In a local benchmark, runtime fell from about 3.3 seconds to 63 ms—52× faster.',
					highlights: [
						{ value: '3.3s→63ms', label: 'Hook runtime in a local benchmark' },
					],
					stack: ['Node.js', 'Biome', 'Prettier', 'Claude Code', 'Codex'],
					links: [
						{
							href: 'https://github.com/affaan-m/ECC/pull/252',
							label: 'Formatter detection PR',
							external: true,
						},
						{
							href: 'https://github.com/affaan-m/ECC/pull/359',
							label: '52× optimization PR',
							external: true,
						},
						{
							href: 'https://github.com/affaan-m/ECC',
							label: 'ECC repository',
							external: true,
						},
					],
				},
			],
		},
		experience: {
			label: 'Experience',
			meta: '4 years',
			items: [
				{
					company: 'Unitblack',
					period: 'Jan 2026 — Present',
					role: 'Software Engineer · Tax Automation',
					summary: 'Building large-scale messaging, external integrations, and cost-efficient systems for tax automation.',
					bullets: [
						'Owned the architecture design of the notification platform, using BullMQ retries, deduplication, and rate limiting to deliver 30 million Kakao notifications in one month. Recipients completed about 150K filings, leading to ₩15.1B in converted revenue.',
						'Built JariTalk and Kakao Pay integrations that helped reach 100K daily signups and double the user base.',
						'Replaced Zapier and Make workflows with in-house automation, saving more than ₩30M annually.',
						'Designed and shipped tax fee, discount, and surcharge policies within five working days.',
					],
				},
				{
					company: 'Flying Doctor',
					period: 'Mar 2023 — Dec 2025',
					role: 'Developer · Lohasmeal Commerce',
					summary: 'Built core commerce features and performance improvements that supported revenue growth and leaner operations.',
					bullets: [
						'Designed L1/L2 caching that cut external API latency from 500ms to 10ms, using Redis Pub/Sub invalidation and TTL policies to maintain eventual consistency across instances.',
						'Resolved thread-pool exhaustion with virtual threads and increased I/O throughput tenfold.',
						'Built server-side Conversion API tracking, improving conversion efficiency by 168% and contributing to 20% revenue growth.',
						'Delivered free trials, meal subscriptions, and 3PL integrations, then automated manual operations to reduce staffing from two people to one.',
						'Established incident detection and response monitoring with Elastic Stack and Slack.',
					],
				},
			],
		},
		education: {
			label: 'Education',
			item: {
				school: 'Incheon National University',
				period: '2015 — 2023',
				major: 'B.A. in Library & Information Science · B.S. in Computer Science',
				detail: '4.23 / 4.5 · Valedictorian',
			},
		},
		skills: {
			label: 'Skills',
			items: [
				'Java',
				'Spring',
				'Node.js',
				'TypeScript',
				'Redis',
				'SQL',
				'JPA',
				'Docker',
				'Kubernetes',
				'AWS',
				'ELK',
				'Vue',
			],
		},
		activities: {
			label: 'Activities',
			items: [
				{ year: '2025', text: 'NEXTERS 26–27 · PM and chatbot prompting' },
				{ year: '2024', text: 'Open Source Contribution · Apache Zeppelin' },
				{ year: '2023', text: 'Geultto · Best article, three rounds' },
				{ year: '2022', text: 'Naver Boostcamp 7 · Full-stack program' },
			],
		},
		awards: {
			label: 'Awards',
			items: [
				{ year: '2025', text: 'Grand Prize · NEXTERS 27' },
				{ year: '2024', text: 'Excellence Award · Open Source Contribution Academy' },
				{ year: '2023', text: "Dean's Award · Valedictorian" },
			],
		},
	},
};

export function getAboutContent(lang: AboutLocale): AboutContent {
	return aboutContent[lang];
}

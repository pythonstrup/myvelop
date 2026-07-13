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
					body: 'Stars 220,000+ 오픈소스 everything-claude-code에 Top 10 Contributor로 활동하고 있습니다.',
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
				{ value: '10배', label: 'Virtual Thread 도입 후 I/O 처리량' },
				{ value: '500→10ms', label: '캐시 계층 설계로 줄인 API 응답 시간' },
				{ value: '연 3천만 원+', label: '워크플로우 내재화로 절감한 비용' },
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
						'BullMQ의 재시도·중복 제거·유량 제어를 활용해 한 달간 3천만 건의 알림톡을 안정적으로 발송하고, 약 15만 건의 신고와 151억 원 규모의 매출 전환을 뒷받침했습니다.',
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
						'L1/L2 캐시 계층과 Redis Pub/Sub을 설계해 외부 API 응답 시간을 500ms에서 10ms로 단축하고 캐시 정합성을 보장했습니다.',
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
					body: 'I am a Top 10 contributor to everything-claude-code, an open-source project with 220,000+ stars.',
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
				{ value: '10×', label: 'I/O throughput after adopting virtual threads' },
				{ value: '500→10ms', label: 'API latency after layered caching' },
				{ value: '₩30M+/yr', label: 'Saved by bringing workflows in-house' },
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
						'Designed a BullMQ pipeline with retries, deduplication, and rate limiting to deliver 30 million Kakao notifications in one month, supporting 150K filings and ₩15.1B in converted revenue.',
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
						'Designed L1/L2 caching with Redis Pub/Sub, cutting external API latency from 500ms to 10ms while preserving cache consistency.',
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

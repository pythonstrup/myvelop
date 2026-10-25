// Homepage copy and the hand-kept first-visit list.
// Topic hubs name series that already exist. They do not invent a theme.

import { LLM_GATEWAY_GUIDE_PATH } from './llm-gateway-guide';

export type Lang = 'en' | 'ko';

/** Latest posts on the homepage. Blog pagination stays five per page. */
export const HOME_RECENT_POSTS = 3;

/** Notes shown under Recent notes. The notes index stays a hand-written keyword index. */
export const HOME_RECENT_NOTES = 5;

export interface TopicHub {
	title: Record<Lang, string>;
	summary: Record<Lang, string>;
	/** Series frontmatter value, per language. */
	series: Record<Lang, string>;
	/** Locale-less path of a guide page. Omit when the series list itself is the entry. */
	href?: string;
	hrefLabel?: Record<Lang, string>;
	/** Posts that share the theme and are not in the series. */
	related?: string[];
}

export const topicHubs: TopicHub[] = [
	{
		title: { en: 'LLM gateway and proxy', ko: 'LLM 게이트웨이와 프록시' },
		summary: {
			en: 'How a gateway gathers repeated provider calls into one layer, what a LiteLLM proxy shows once calls go through it, and when prompt caching pays off.',
			ko: '프로바이더 API를 직접 부를 때 반복되는 일을 게이트웨이가 어디로 모으는지, LiteLLM 프록시에 호출을 모으면 무엇이 보이는지, 프롬프트 캐시가 언제 이득인지를 이어서 읽습니다.',
		},
		series: { en: 'Running LLM APIs', ko: 'LLM API 운영' },
		href: LLM_GATEWAY_GUIDE_PATH,
		hrefLabel: { en: 'Reading path', ko: '읽기 순서' },
	},
	{
		title: { en: 'Concurrency control and database locking', ko: '동시성 제어와 DB 락' },
		summary: {
			en: 'The series runs from a single UPDATE through pessimistic locks, Lettuce distributed locks, AOP, and a ticketing system. A post on blocking overlapping bookings with a PostgreSQL exclusion constraint sits beside it.',
			ko: 'UPDATE 한 줄부터 비관적 락, Lettuce 분산 락, AOP, 티켓팅까지 이어지는 연재입니다. 겹치는 예약을 PostgreSQL EXCLUDE 제약으로 막는 글은 연재 밖에 있어서 옆에 두었습니다.',
		},
		series: { en: 'Concurrency Control', ko: '동시성 제어' },
		related: ['exclusion-constraint-booking'],
	},
	{
		title: { en: 'Notifications with BullMQ', ko: 'BullMQ로 알림 시스템 운영하기' },
		summary: {
			en: 'The series on running notification delivery with BullMQ: what the queue takes on, rate limits, where delivery history lives and how to read it, and group sends that do not keep order.',
			ko: '알림 발송을 BullMQ로 운영하는 연재입니다. 큐가 맡는 일, rate limit, 발송 이력을 쌓고 읽는 방법, 순서가 섞이는 그룹 발송을 다룹니다.',
		},
		series: { en: 'Running a Notification System with BullMQ', ko: 'BullMQ로 알림 시스템 운영하기' },
	},
	{
		title: { en: 'Parquet and S3', ko: 'Parquet와 S3' },
		summary: {
			en: 'A walk through the inside of a Parquet file, and an experiment querying JSONL on S3 without Parquet.',
			ko: 'Parquet 파일의 안쪽을 따라간 글과, Parquet 없이 S3의 JSONL을 조회해 본 글입니다.',
		},
		series: { en: 'Parquet and S3', ko: 'Parquet와 S3' },
	},
];

/**
 * REVIEW: seeded by hand. There are no page analytics, so this is not a popularity ranking.
 * The order here is the order on the homepage. Edit the slugs, or replace them, when you know
 * which posts you want a first-time reader to open.
 *
 * Seeded to cover the themes a new reader actually finds here:
 * - llm-gateway: opens the LLM gateway comparison (series order 1)
 * - concurrency-single-update: the first post in the concurrency series
 * - bullmq-notification-part-1-what-is-bullmq: opens the notification series
 * - exclusion-constraint-booking: database locking, outside that series
 * - passwordless-db-access-least-privilege: a pod reaching RDS without a password
 */
export const startHereSlugs = [
	'llm-gateway',
	'concurrency-single-update',
	'bullmq-notification-part-1-what-is-bullmq',
	'exclusion-constraint-booking',
	'passwordless-db-access-least-privilege',
] as const;

export const homeCopy = {
	en: {
		eyebrow: 'pythonstrup',
		title: 'Notes from a journey of growing one step at a time',
		intro:
			'A place where I write down what I learn and the problems I run into while building things — the daily questions, how I solved them, and notes worth revisiting.',
		blog: 'Blog',
		notes: 'Notes',
		about: 'About',
		startTitle: 'Start here',
		startLead: 'A short list I keep by hand for a first visit.',
		topicsTitle: 'Topics',
		topicsLead: 'Series already on the site, grouped as places to start.',
		related: 'Alongside',
		postsTitle: 'Recent posts',
		postsAll: 'View all posts',
		notesTitle: 'Recent notes',
		notesIndex: 'Notes index',
		notesRss: 'Notes RSS',
	},
	ko: {
		eyebrow: 'pythonstrup',
		title: '한 걸음씩 성장하는 개발 여정을 기록합니다',
		intro:
			'개발하며 배우고 부딪힌 것들을 남기는 공간입니다. 그날그날의 고민과 해결 과정, 그리고 다시 꺼내 볼 만한 내용을 차곡차곡 정리합니다.',
		blog: '블로그',
		notes: '노트',
		about: '소개',
		startTitle: '여기서 시작',
		startLead: '처음 온 분을 위해 직접 골라 둔 글입니다.',
		topicsTitle: '주제',
		topicsLead: '이미 연재로 묶여 있는 글들입니다. 어디서 들어갈지 고르게 모아 두었습니다.',
		related: '옆에 둔 글',
		postsTitle: '최근 글',
		postsAll: '글 전체 보기',
		notesTitle: '최근 노트',
		notesIndex: '노트 색인',
		notesRss: '노트 RSS',
	},
} as const;

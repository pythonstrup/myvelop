import {
	HOME_RECENT_NOTES,
	HOME_RECENT_POSTS,
	homeCopy,
	startHereSlugs,
	topicHubs,
	type Lang,
} from '../data/home';
import { getBlogPosts, postHref, postSlug, sortSeries } from './blog';
import { getNotesByDate, noteHref, notesFeedInfo, noteTitle } from './notes';

export interface HomePost {
	title: string;
	href: string;
	date: Date;
}

export async function getHomePage(lang: Lang) {
	const posts = await getBlogPosts(lang);
	const bySlug = new Map(posts.map((post) => [postSlug(post), post]));
	const copy = homeCopy[lang];
	const base = lang === 'ko' ? '/ko' : '';

	function toHomePost(slug: string): HomePost {
		const post = bySlug.get(slug);
		if (!post) throw new Error(`Homepage references a missing ${lang} post: ${slug}`);
		return { title: post.data.title, href: postHref(post), date: post.data.pubDate };
	}

	// 주제는 연재 글을 다시 나열하지 않는다. 시작 글·최근 글과 같은 제목이 겹치기 때문이다.
	const topics = topicHubs.map((topic) => {
		const seriesName = topic.series[lang];
		const seriesPosts = sortSeries(posts.filter((post) => post.data.series === seriesName));
		if (seriesPosts.length === 0) {
			throw new Error(`Homepage topic "${topic.title.en}" has no ${lang} posts in series "${seriesName}"`);
		}
		const entry =
			topic.href && topic.hrefLabel
				? { href: `${base}${topic.href}`, label: topic.hrefLabel[lang] }
				: { href: postHref(seriesPosts[0]), label: copy.startSeries };
		return {
			title: topic.title[lang],
			summary: topic.summary[lang],
			countLabel: lang === 'ko' ? `${seriesPosts.length}편` : `${seriesPosts.length} posts`,
			entry,
		};
	});

	const notes = (await getNotesByDate(lang)).slice(0, HOME_RECENT_NOTES).map(({ note, published }) => ({
		title: noteTitle(note),
		href: noteHref(note),
		date: published,
	}));

	return {
		copy,
		lang,
		blogHref: `${base}/blog/`,
		notesHref: `${base}/notes/`,
		aboutHref: `${base}/about/`,
		notesFeedHref: notesFeedInfo(lang).href,
		startHere: startHereSlugs.map((slug) => toHomePost(slug)),
		topics,
		recentPosts: posts.slice(0, HOME_RECENT_POSTS).map((post) => ({
			title: post.data.title,
			href: postHref(post),
			date: post.data.pubDate,
		})),
		notes,
	};
}

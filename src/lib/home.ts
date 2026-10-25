import {
	HOME_RECENT_NOTES,
	HOME_RECENT_POSTS,
	homeCopy,
	startHereSlugs,
	topicHubs,
	type Lang,
} from '../data/home';
import { getBlogPosts } from './blog';
import { getNotesByDate, noteHref, noteTitle } from './notes';
import { localePath, postHref, postSlug, sortSeries } from './posts';

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

	function requirePost(slug: string) {
		const post = bySlug.get(slug);
		if (!post) throw new Error(`Homepage references a missing ${lang} post: ${slug}`);
		return post;
	}

	function toHomePost(slug: string): HomePost {
		const post = requirePost(slug);
		return { title: post.data.title, href: postHref(post), date: post.data.pubDate };
	}

	const topics = topicHubs.map((topic) => {
		const seriesName = topic.series[lang];
		const seriesPosts = sortSeries(posts.filter((post) => post.data.series === seriesName));
		if (seriesPosts.length === 0) {
			throw new Error(`Homepage topic "${topic.title.en}" has no ${lang} posts in series "${seriesName}"`);
		}
		const seriesSlugs = new Set(seriesPosts.map(postSlug));
		const related = (topic.related ?? []).map((slug) => {
			if (seriesSlugs.has(slug)) {
				throw new Error(`${slug} is already in series "${seriesName}"; drop it from related`);
			}
			return toHomePost(slug);
		});
		return {
			title: topic.title[lang],
			summary: topic.summary[lang],
			href: topic.href ? localePath(lang, topic.href) : undefined,
			hrefLabel: topic.hrefLabel?.[lang],
			posts: seriesPosts.map((post) => ({ title: post.data.title, href: postHref(post) })),
			related,
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
		notesFeedHref: lang === 'ko' ? '/ko/notes/rss.xml' : '/notes/rss.xml',
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

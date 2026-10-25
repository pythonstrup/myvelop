import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_DESCRIPTION_KO, SITE_TITLE } from '../consts';
import { getBlogPosts, postHref } from './blog';
import { getNotesByDate, noteDescription, noteHref, notesFeedInfo, noteTitle } from './notes';

type Site = NonNullable<APIContext['site']>;

function requireSite(site: APIContext['site']): Site {
	if (!site) throw new Error('astro.config site is required to build RSS feeds');
	return site;
}

export async function blogFeed(lang: 'en' | 'ko', site: APIContext['site']) {
	const resolved = requireSite(site);
	const posts = await getBlogPosts(lang);
	const self = new URL(lang === 'ko' ? 'ko/rss.xml' : 'rss.xml', resolved);
	return rss({
		title: SITE_TITLE,
		description: lang === 'ko' ? SITE_DESCRIPTION_KO : SITE_DESCRIPTION,
		site: resolved,
		xmlns: { atom: 'http://www.w3.org/2005/Atom' },
		customData: `<language>${lang}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
		items: posts.map((post) => ({
			...post.data,
			categories: post.data.tags,
			link: postHref(post),
		})),
	});
}

export async function notesFeed(lang: 'en' | 'ko', site: APIContext['site']) {
	const resolved = requireSite(site);
	const info = notesFeedInfo(lang);
	const self = new URL(info.path, resolved);
	const notes = await getNotesByDate(lang);
	return rss({
		title: info.title,
		description: info.description,
		site: resolved,
		xmlns: { atom: 'http://www.w3.org/2005/Atom' },
		customData: `<language>${lang}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
		items: notes.map(({ note, published }) => ({
			title: noteTitle(note),
			description: noteDescription(note),
			pubDate: published,
			link: noteHref(note),
		})),
	});
}

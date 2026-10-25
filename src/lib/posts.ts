import type { CollectionEntry } from 'astro:content';

export type Lang = 'en' | 'ko';

export function postSlug(post: CollectionEntry<'blog'>) {
	return post.id.replace(/^(en|ko)\//, '');
}

export function postHref(post: CollectionEntry<'blog'>) {
	const lang = post.id.startsWith('ko/') ? 'ko' : 'en';
	const base = lang === 'ko' ? '/ko/blog' : '/blog';
	return `${base}/${postSlug(post)}/`;
}

/** seriesOrder가 있으면 그 오름차순, 없으면 발행일 오름차순. 읽는 순서다. */
export function sortSeries(posts: CollectionEntry<'blog'>[]) {
	return [...posts].sort((a, b) => {
		const ao = a.data.seriesOrder;
		const bo = b.data.seriesOrder;
		if (ao != null && bo != null && ao !== bo) return ao - bo;
		return a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
	});
}

export function localePath(lang: Lang, path: string) {
	return lang === 'ko' ? `/ko${path}` : path;
}

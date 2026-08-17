import { getCollection } from 'astro:content';

export const BLOG_PAGE_SIZE = 5;

export async function getBlogPosts(lang: 'en' | 'ko') {
	return (await getCollection('blog', ({ id }) => id.startsWith(`${lang}/`))).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
}

export async function getBlogPageCount(lang: 'en' | 'ko') {
	return Math.max(1, Math.ceil((await getBlogPosts(lang)).length / BLOG_PAGE_SIZE));
}

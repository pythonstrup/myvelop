import { getCollection } from 'astro:content';

export const BLOG_PAGE_SIZE = 5;

export async function getBlogPosts(lang: 'en' | 'ko') {
	return (await getCollection('blog', ({ id }) => id.startsWith(`${lang}/`))).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
}

import { getCollection } from 'astro:content';

export const BLOG_PAGE_SIZE = 5;

export async function getBlogPosts(lang: 'en' | 'ko') {
	return (await getCollection('blog', ({ id }) => id.startsWith(`${lang}/`))).sort(
		(a, b) => postNumber(b.id) - postNumber(a.id),
	);
}

function postNumber(id: string): number {
	return Number.parseInt(id.split('/')[1], 10);
}

export async function getBlogPostsByDate(lang: 'en' | 'ko') {
	return [...(await getBlogPosts(lang))].sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
}

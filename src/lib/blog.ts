import { type CollectionEntry, getCollection } from 'astro:content';

export const BLOG_PAGE_SIZE = 5;

export async function getBlogPosts(lang: 'en' | 'ko') {
	return (await getCollection('blog', ({ id }) => id.startsWith(`${lang}/`))).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
}

export async function getBlogPageCount(lang: 'en' | 'ko') {
	return Math.max(1, Math.ceil((await getBlogPosts(lang)).length / BLOG_PAGE_SIZE));
}

// "pub/sub", "@Transactional", "Nexters 27기"처럼 URL에 못 쓰는 문자가 태그에 있어서
// 글자·숫자(한글 포함)만 남기고 하이픈으로 잇는다. 대소문자만 다른 태그는 하나로 합친다.
export function tagSlug(tag: string) {
	return tag
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

export interface TagGroup {
	label: string;
	posts: CollectionEntry<'blog'>[];
}

export async function getBlogTags(lang: 'en' | 'ko') {
	const tags = new Map<string, TagGroup>();
	for (const post of await getBlogPosts(lang)) {
		for (const tag of post.data.tags ?? []) {
			const slug = tagSlug(tag);
			const group = tags.get(slug);
			if (!group) tags.set(slug, { label: tag, posts: [post] });
			else if (!group.posts.includes(post)) group.posts.push(post);
		}
	}
	return tags;
}

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

export interface PostLink {
	title: string;
	href: string;
}

export interface PostNav {
	prev?: PostLink;
	next?: PostLink;
	series?: { name: string; index: number; posts: (PostLink & { current: boolean })[] };
	related: CollectionEntry<'blog'>[];
}

function toLink(post: CollectionEntry<'blog'>): PostLink {
	const slug = post.id.replace(/^(en|ko)\//, '');
	const base = post.id.startsWith('ko/') ? '/ko/blog' : '/blog';
	return { title: post.data.title, href: `${base}/${slug}/` };
}

export async function getPostNav(post: CollectionEntry<'blog'>): Promise<PostNav> {
	const lang = post.id.startsWith('ko/') ? 'ko' : 'en';
	const posts = await getBlogPosts(lang); // newest first
	const seriesName = post.data.series;
	const seriesPosts = seriesName
		? posts.filter((p) => p.data.series === seriesName).reverse() // oldest first
		: [];

	// 시리즈 글은 시리즈 안에서, 나머지 글은 전체에서 이전/다음을 찾는다.
	const pool = seriesPosts.length > 0 ? [...seriesPosts].reverse() : posts;
	const i = pool.findIndex((p) => p.id === post.id);
	const newer = pool[i - 1];
	const older = pool[i + 1];

	const tags = new Set((post.data.tags ?? []).map(tagSlug));
	const related = posts
		.filter((p) => p.id !== post.id && (!seriesName || p.data.series !== seriesName))
		.map((p) => ({
			post: p,
			score: (p.data.tags ?? []).filter((t) => tags.has(tagSlug(t))).length,
		}))
		.filter((r) => r.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 3)
		.map((r) => r.post);

	return {
		prev: older && toLink(older),
		next: newer && toLink(newer),
		series: seriesName
			? {
					name: seriesName,
					index: seriesPosts.findIndex((p) => p.id === post.id) + 1,
					posts: seriesPosts.map((p) => ({ ...toLink(p), current: p.id === post.id })),
				}
			: undefined,
		related,
	};
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

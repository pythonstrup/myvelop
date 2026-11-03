import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_DESCRIPTION_KO, SITE_TITLE } from '../consts';

export const GET: APIRoute = async ({ site }) => {
	const origin = site ?? new URL('https://pythonstrup.com');
	const posts = (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);

	const lines = [
		`# ${SITE_TITLE}`,
		'',
		'> Bilingual blog on backend engineering, databases, and LLM infrastructure. English pages live at /, Korean pages under /ko/.',
		'',
		SITE_DESCRIPTION,
		SITE_DESCRIPTION_KO,
		'',
		'Notes, separate from these posts, are indexed at /notes/ and /ko/notes/.',
		'',
	];

	for (const [lang, heading] of [
		['en', 'English posts'],
		['ko', 'Korean posts'],
	] as const) {
		lines.push(`## ${heading}`, '');
		for (const post of posts.filter((entry) => entry.id.startsWith(`${lang}/`))) {
			const slug = post.id.slice(lang.length + 1);
			const path = lang === 'ko' ? `/ko/blog/${slug}/` : `/blog/${slug}/`;
			lines.push(`- [${post.data.title}](${new URL(path, origin).href}): ${post.data.description}`);
		}
		lines.push('');
	}

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};

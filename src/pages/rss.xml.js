import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getBlogPostsByDate } from '../lib/blog';

export async function GET(context) {
	const posts = await getBlogPostsByDate('en');
	const self = new URL('rss.xml', context.site);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		xmlns: { atom: 'http://www.w3.org/2005/Atom' },
		customData: `<language>en</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
		items: posts.map((post) => ({
			...post.data,
			categories: post.data.tags,
			link: `/blog/${post.id.replace(/^en\//, '')}/`,
		})),
	});
}

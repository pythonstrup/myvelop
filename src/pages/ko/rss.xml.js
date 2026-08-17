import rss from '@astrojs/rss';
import { SITE_DESCRIPTION_KO, SITE_TITLE } from '../../consts';
import { getBlogPosts } from '../../lib/blog';

export async function GET(context) {
	const posts = await getBlogPosts('ko');
	const self = new URL('ko/rss.xml', context.site);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION_KO,
		site: context.site,
		xmlns: { atom: 'http://www.w3.org/2005/Atom' },
		customData: `<language>ko</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
		items: posts.map((post) => ({
			...post.data,
			categories: post.data.tags,
			link: `/ko/blog/${post.id.replace(/^ko\//, '')}/`,
		})),
	});
}

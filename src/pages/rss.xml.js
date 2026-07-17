import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getBlogPostsByDate } from '../lib/blog';

export async function GET(context) {
	const posts = await getBlogPostsByDate('en');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id.replace(/^en\//, '')}/`,
		})),
	});
}

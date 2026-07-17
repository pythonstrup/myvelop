import rss from '@astrojs/rss';
import { SITE_DESCRIPTION_KO, SITE_TITLE } from '../../consts';
import { getBlogPostsByDate } from '../../lib/blog';

export async function GET(context) {
	const posts = await getBlogPostsByDate('ko');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION_KO,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/ko/blog/${post.id.replace(/^ko\//, '')}/`,
		})),
	});
}

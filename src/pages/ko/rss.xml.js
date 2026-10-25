import { blogFeed } from '../../lib/rss';

export function GET(context) {
	return blogFeed('ko', context.site);
}

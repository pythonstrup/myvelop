import { notesFeed } from '../../lib/rss';

export function GET(context) {
	return notesFeed('en', context.site);
}

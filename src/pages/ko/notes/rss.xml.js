import { notesFeed } from '../../../lib/rss';

export function GET(context) {
	return notesFeed('ko', context.site);
}

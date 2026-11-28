import { llmGatewayGuide } from '../data/llm-gateway-guide';
import { getBlogPosts, postHref, postSlug } from './blog';

export interface GuideEntry {
	title: string;
	href: string;
	date: Date;
	blurb: string;
}

export async function getLlmGatewayGuide(lang: 'en' | 'ko') {
	const guide = llmGatewayGuide;
	const posts = await getBlogPosts(lang);
	const bySlug = new Map(posts.map((post) => [postSlug(post), post]));
	const seriesName = guide.series[lang];
	const seriesPosts = posts.filter((post) => post.data.series === seriesName);

	const steps: GuideEntry[] = guide.steps.map((step, index) => {
		const post = bySlug.get(step.slug);
		const order = index + 1;
		if (!post) throw new Error(`LLM gateway guide is missing ${lang} post ${step.slug}`);
		if (post.data.series !== seriesName) {
			throw new Error(`${step.slug} is not in the ${lang} series "${seriesName}"`);
		}
		if (post.data.seriesOrder !== order) {
			throw new Error(
				`${step.slug} has seriesOrder ${String(post.data.seriesOrder)}, but the guide lists it as step ${order}`,
			);
		}
		return {
			title: post.data.title,
			href: postHref(post),
			date: post.data.pubDate,
			blurb: step.blurb[lang],
		};
	});

	const stepSlugs = new Set(guide.steps.map((step) => step.slug));
	for (const post of seriesPosts) {
		const slug = postSlug(post);
		if (!stepSlugs.has(slug)) {
			throw new Error(
				`Series "${seriesName}" includes ${slug}, which has no guide blurb. Add a step in src/data/llm-gateway-guide.ts.`,
			);
		}
	}

	const relatedPost = bySlug.get(guide.related.slug);
	if (!relatedPost) throw new Error(`LLM gateway guide is missing ${lang} post ${guide.related.slug}`);
	if (relatedPost.data.series === seriesName) {
		throw new Error(`${guide.related.slug} is part of "${seriesName}"; make it a numbered step`);
	}

	return {
		lang,
		title: guide.title[lang],
		description: guide.description[lang],
		lead: guide.lead[lang],
		orderNote: guide.orderNote[lang],
		homeHref: lang === 'ko' ? '/ko/#topics' : '/#topics',
		backLabel: lang === 'ko' ? '← 홈' : '← Home',
		steps,
		related: {
			heading: guide.related.heading[lang],
			note: guide.related.note[lang],
			title: relatedPost.data.title,
			href: postHref(relatedPost),
			date: relatedPost.data.pubDate,
			blurb: guide.related.blurb[lang],
		},
	};
}

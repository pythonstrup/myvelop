import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// Required: every post needs an OG card. heroImage stays optional
			// because it renders as the post's LCP image.
			socialImage: image(),
			tags: z.array(z.string()).optional(),
			// Same series string groups posts into a series; order follows pubDate.
			series: z.string().optional(),
		}),
});

export const collections = { blog };

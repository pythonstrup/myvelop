import { access, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const failures = [];

function fail(message) {
	failures.push(message);
}

async function exists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function isFile(path) {
	try {
		return (await stat(path)).isFile();
	} catch {
		return false;
	}
}

async function walk(directory, predicate = () => true) {
	const files = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await walk(path, predicate)));
		else if (predicate(path)) files.push(path);
	}
	return files;
}

function displayPath(path) {
	return relative(root, path) || '.';
}

function decodeXml(value) {
	return value.replaceAll('&amp;', '&');
}

function localPath(value) {
	if (!value.startsWith('/') || value.startsWith('//')) return;
	const pathname = value.split(/[?#]/, 1)[0];
	try {
		return decodeURIComponent(pathname);
	} catch {
		return pathname;
	}
}

async function builtTargetExists(pathname) {
	const target = resolve(dist, `.${pathname}`);
	const relativeTarget = relative(dist, target);
	if (relativeTarget === '..' || relativeTarget.startsWith(`..${sep}`) || isAbsolute(relativeTarget)) return false;

	const candidates = extname(pathname)
		? [target]
		: [join(target, 'index.html'), `${target}.html`];
	return (await Promise.all(candidates.map(isFile))).some(Boolean);
}

async function verifyMarkdownLinks() {
	const files = [
		join(root, 'AGENTS.md'),
		join(root, 'README.md'),
		...(await walk(join(root, 'docs'), (path) => path.endsWith('.md'))),
	];

	for (const file of files) {
		const source = await readFile(file, 'utf8');
		for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
			let target = match[1].trim().replace(/^<|>$/g, '');
			if (/^(?:https?:|mailto:|#)/.test(target)) continue;
			target = target.split('#', 1)[0];
			if (!target) continue;
			const path = resolve(dirname(file), decodeURIComponent(target));
			if (!(await exists(path))) fail(`${displayPath(file)}: broken Markdown link ${match[1]}`);
		}
	}
}

async function verifyPostNumbers() {
	const counts = {};
	for (const lang of ['en', 'ko']) {
		const directory = join(root, 'src/content/blog', lang);
		const names = (await readdir(directory))
			.filter((name) => /\.(?:md|mdx)$/.test(name))
			.map((name) => name.replace(/\.(?:md|mdx)$/, ''));
		const invalid = names.filter((name) => !/^[1-9]\d*$/.test(name));
		if (invalid.length) fail(`${displayPath(directory)}: non-numeric post names: ${invalid.join(', ')}`);

		const numbers = names.filter((name) => /^[1-9]\d*$/.test(name)).map(Number).sort((a, b) => a - b);
		for (let index = 0; index < numbers.length; index += 1) {
			if (numbers[index] !== index + 1) {
				fail(`${displayPath(directory)}: post numbers must be contiguous from 1; found ${numbers.join(', ')}`);
				break;
			}
		}
		counts[lang] = names.length;
	}
	return counts;
}

async function verifyRequiredOutput() {
	const required = [
		'index.html',
		'ko/index.html',
		'404.html',
		'ko/404/index.html',
		'rss.xml',
		'ko/rss.xml',
		'sitemap-index.xml',
		'sitemap-0.xml',
		'robots.txt',
		'pagefind/pagefind.js',
	];
	for (const path of required) {
		if (!(await isFile(join(dist, path)))) fail(`dist/${path}: required build output is missing`);
	}
}

async function verifyHtml() {
	const htmlFiles = await walk(dist, (path) => path.endsWith('.html'));
	const canonicalUrls = new Set();

	for (const file of htmlFiles) {
		const html = await readFile(file, 'utf8');
		const name = displayPath(file);
		const titleCount = [...html.matchAll(/<title(?:\s[^>]*)?>/gi)].length;
		const headingCount = [...html.matchAll(/<h1(?:\s[^>]*)?>/gi)].length;
		const canonicalTags = [...html.matchAll(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi)];
		const resourceTags = [...html.matchAll(/<(?:a|area|audio|base|embed|iframe|image|img|input|link|script|source|track|use|video)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)];

		if (titleCount !== 1) fail(`${name}: expected one <title>, found ${titleCount}`);
		if (headingCount !== 1) fail(`${name}: expected one <h1>, found ${headingCount}`);
		if (canonicalTags.length !== 1) fail(`${name}: expected one canonical link, found ${canonicalTags.length}`);
		if (!/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i.test(html)) fail(`${name}: missing meta description`);

		const lang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
		const expectedLang = relative(dist, file).startsWith('ko/') ? 'ko' : 'en';
		if (lang !== expectedLang) fail(`${name}: expected html lang=${expectedLang}, found ${lang ?? 'none'}`);

		if (!/<link\b(?=[^>]*\brel=["']preload["'])(?=[^>]*\bas=["']style["'])[^>]*>/i.test(html)) {
			fail(`${name}: missing non-blocking font preload`);
		}
		if (!/<noscript>\s*<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>\s*<\/noscript>/i.test(html)) {
			fail(`${name}: missing no-JavaScript font fallback`);
		}

		const canonical = canonicalTags[0]?.[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
		const isNoIndex = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i.test(html);
		if (!isNoIndex && canonical) {
			if (canonicalUrls.has(canonical)) fail(`${name}: duplicate canonical URL ${canonical}`);
			canonicalUrls.add(canonical);
		}

		const values = [];
		for (const match of resourceTags) {
			const tag = match[0];
			const attributes = new Map(
				[...tag.matchAll(/\s([^\s=/>]+)\s*=\s*(["'])(.*?)\2/gs)].map((attribute) => [attribute[1].toLowerCase(), attribute[3]]),
			);
			for (const attribute of ['href', 'src']) {
				const value = attributes.get(attribute);
				if (value) values.push(value);
			}

			const srcset = attributes.get('srcset');
			if (srcset !== undefined) {
				if (!srcset.trim()) fail(`${name}: contains an empty srcset`);
				for (const candidate of srcset.split(',')) values.push(candidate.trim().split(/\s+/, 1)[0]);
			}

			const src = attributes.get('src') ?? '';
			if (/^<img\b/i.test(tag) && attributes.get('data-astro-image') === 'constrained' && !/\.svg(?:[?#]|$)/i.test(src)) {
				const missing = ['width', 'height', 'srcset'].filter((attribute) => !attributes.get(attribute)?.trim());
				if (missing.length) fail(`${name}: responsive Astro bitmap image is missing ${missing.join(', ')}: ${src || 'unknown source'}`);
			}
		}
		for (const value of values) {
			const pathname = localPath(decodeXml(value));
			if (pathname && !(await builtTargetExists(pathname))) fail(`${name}: missing local target ${value}`);
		}

		for (const tag of html.matchAll(/<link\b(?=[^>]*\bhreflang=["'][^"']+["'])[^>]*>/gi)) {
			const href = tag[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
			if (!href) continue;
			const url = new URL(decodeXml(href));
			if (url.origin === 'https://pythonstrup.com' && !(await builtTargetExists(url.pathname))) {
				fail(`${name}: hreflang target does not exist: ${href}`);
			}
		}
	}

	return { htmlCount: htmlFiles.length, canonicalUrls };
}

async function verifySitemap(canonicalUrls) {
	const xml = await readFile(join(dist, 'sitemap-0.xml'), 'utf8');
	const sitemapUrls = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeXml(match[1])));

	for (const url of sitemapUrls) {
		const parsed = new URL(url);
		if (!(await builtTargetExists(parsed.pathname))) fail(`dist/sitemap-0.xml: missing page for ${url}`);
	}

	for (const url of canonicalUrls) {
		if (!sitemapUrls.has(url)) fail(`dist/sitemap-0.xml: canonical URL is missing: ${url}`);
	}
	for (const url of sitemapUrls) {
		if (!canonicalUrls.has(url)) fail(`dist/sitemap-0.xml: URL has no canonical page: ${url}`);
	}
}

async function verifyRss(postCounts) {
	for (const lang of ['en', 'ko']) {
		const path = lang === 'en' ? join(dist, 'rss.xml') : join(dist, 'ko/rss.xml');
		const xml = await readFile(path, 'utf8');
		const items = [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map((match) => match[1]);
		if (items.length !== postCounts[lang]) {
			fail(`${displayPath(path)}: expected ${postCounts[lang]} items, found ${items.length}`);
		}

		const links = new Set(items.map((item) => item.match(/<link>([^<]+)<\/link>/)?.[1]).filter(Boolean));
		const prefix = lang === 'en' ? '/blog' : '/ko/blog';
		for (let number = 1; number <= postCounts[lang]; number += 1) {
			const expected = `https://pythonstrup.com${prefix}/${number}/`;
			if (!links.has(expected)) fail(`${displayPath(path)}: missing item ${expected}`);
		}

		const dates = items.map((item) => Date.parse(item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? ''));
		if (dates.some(Number.isNaN)) fail(`${displayPath(path)}: contains an invalid pubDate`);
		for (let index = 1; index < dates.length; index += 1) {
			if (dates[index] > dates[index - 1]) {
				fail(`${displayPath(path)}: items are not sorted newest-first`);
				break;
			}
		}
	}
}

async function verifyFontCss() {
	const cssFiles = await walk(join(dist, '_astro'), (path) => path.endsWith('.css'));
	let pretendardFaces = 0;
	for (const file of cssFiles) {
		const css = await readFile(file, 'utf8');
		for (const match of css.matchAll(/@font-face\{[^}]+\}/g)) {
			if (!match[0].includes('Pretendard Variable')) continue;
			pretendardFaces += 1;
			if (!match[0].includes('font-display:optional')) {
				fail(`${displayPath(file)}: Pretendard must use font-display: optional`);
			}
		}
	}
	if (pretendardFaces === 0) fail('dist/_astro: Pretendard font CSS was not generated');
}

await verifyMarkdownLinks();
const postCounts = await verifyPostNumbers();
await verifyRequiredOutput();
const { htmlCount, canonicalUrls } = await verifyHtml();
await verifySitemap(canonicalUrls);
await verifyRss(postCounts);
await verifyFontCss();

if (failures.length) {
	console.error(`\nBuild verification failed with ${failures.length} problem(s):`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Verified ${htmlCount} HTML pages, ${canonicalUrls.size} canonical URLs, and ${postCounts.en + postCounts.ko} posts.`);

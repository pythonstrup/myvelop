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

async function builtTargetExists(encodedPathname) {
	// URL의 pathname은 퍼센트 인코딩되어 있고 dist 디렉터리는 디코딩된 이름(한글 태그 등)을 쓴다.
	let pathname;
	try {
		pathname = decodeURIComponent(encodedPathname);
	} catch {
		pathname = encodedPathname;
	}
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

async function verifyPostNames() {
	// 파일명이 URL slug가 된다. 소문자 kebab-case만 허용하고, 번역쌍은 같은 이름을 쓴다.
	const names = {};
	for (const lang of ['en', 'ko']) {
		const directory = join(root, 'src/content/blog', lang);
		names[lang] = (await readdir(directory))
			.filter((name) => /\.(?:md|mdx)$/.test(name))
			.map((name) => name.replace(/\.(?:md|mdx)$/, ''));
		const invalid = names[lang].filter((name) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name));
		if (invalid.length) fail(`${displayPath(directory)}: post names must be lowercase kebab-case slugs: ${invalid.join(', ')}`);
	}
	return names;
}

async function verifySeriesOrder() {
	// seriesOrder는 한 시리즈의 글 전부에 넣거나 전부 빼고, 같은 번호를 두 번 쓰지 않는다. 번역쌍은 같은 번호를 쓴다.
	const orders = {};
	for (const lang of ['en', 'ko']) {
		const directory = join(root, 'src/content/blog', lang);
		const series = new Map();
		orders[lang] = new Map();
		for (const file of (await readdir(directory)).filter((name) => /\.(?:md|mdx)$/.test(name))) {
			const frontmatter = (await readFile(join(directory, file), 'utf8')).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
			const slug = file.replace(/\.(?:md|mdx)$/, '');
			const name = frontmatter.match(/^series:\s*["']?(.*?)["']?\s*$/m)?.[1];
			const order = frontmatter.match(/^seriesOrder:\s*(\S+)\s*$/m)?.[1];
			orders[lang].set(slug, order);
			if (order !== undefined && !name) fail(`${displayPath(join(directory, file))}: seriesOrder is set without series`);
			if (!name) continue;
			if (!series.has(name)) series.set(name, []);
			series.get(name).push({ slug, order });
		}
		for (const [name, posts] of series) {
			const ordered = posts.filter((post) => post.order !== undefined);
			if (ordered.length && ordered.length !== posts.length) {
				const missing = posts.filter((post) => post.order === undefined).map((post) => post.slug);
				fail(`${displayPath(directory)}: series "${name}" is missing seriesOrder on ${missing.join(', ')}`);
			}
			const counts = new Map();
			for (const post of ordered) counts.set(post.order, (counts.get(post.order) ?? 0) + 1);
			const duplicates = [...counts].filter(([, count]) => count > 1).map(([order]) => order);
			if (duplicates.length) fail(`${displayPath(directory)}: series "${name}" repeats seriesOrder ${duplicates.join(', ')}`);
		}
	}
	for (const [slug, order] of orders.ko) {
		if (orders.en.has(slug) && orders.en.get(slug) !== order) {
			fail(`src/content/blog: ${slug} has seriesOrder ${order ?? 'unset'} in ko but ${orders.en.get(slug) ?? 'unset'} in en`);
		}
	}
}

async function verifyRedirects() {
	// public/_redirects의 목적지가 실제로 빌드됐는지 확인한다. slug를 바꾸면 이 파일도 따라가야 한다.
	const source = await readFile(join(root, 'public/_redirects'), 'utf8');
	for (const line of source.split('\n')) {
		const [from, to] = line.trim().split(/\s+/);
		if (!from || from.startsWith('#')) continue;
		if (!to || !(await builtTargetExists(to))) fail(`public/_redirects: ${from} points to a missing page ${to ?? ''}`);
	}
}

async function verifyRequiredOutput() {
	const required = [
		'index.html',
		'ko/index.html',
		'404.html',
		'ko/404/index.html',
		'rss.xml',
		'ko/rss.xml',
		'notes/rss.xml',
		'ko/notes/rss.xml',
		'sitemap-index.xml',
		'sitemap-0.xml',
		'robots.txt',
		'llms.txt',
		'pagefind/pagefind.js',
	];
	for (const path of required) {
		if (!(await isFile(join(dist, path)))) fail(`dist/${path}: required build output is missing`);
	}
}

function internalPathname(value) {
	if (value.startsWith('/') && !value.startsWith('//')) return localPath(value);
	try {
		const url = new URL(value);
		if (url.origin !== 'https://pythonstrup.com') return;
		try {
			return decodeURIComponent(url.pathname);
		} catch {
			return url.pathname;
		}
	} catch {
		return;
	}
}

async function directoryLinkMissesSlash(pathname) {
	if (!pathname || pathname.endsWith('/')) return false;
	const last = pathname.slice(pathname.lastIndexOf('/') + 1);
	if (last.includes('.')) return false;
	const target = resolve(dist, `.${pathname}`);
	const relativeTarget = relative(dist, target);
	if (relativeTarget === '..' || relativeTarget.startsWith(`..${sep}`) || isAbsolute(relativeTarget)) return false;
	return isFile(join(target, 'index.html'));
}

function verifyJsonLd(name, html, { isBlogPost, isHome }) {
	const scripts = [
		...html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi),
	];
	if (scripts.length === 0) {
		fail(`${name}: missing JSON-LD`);
		return;
	}

	const nodes = [];
	for (const script of scripts) {
		let data;
		try {
			data = JSON.parse(script[1]);
		} catch {
			fail(`${name}: JSON-LD is not valid JSON`);
			return;
		}
		if (data?.['@context'] !== 'https://schema.org') fail(`${name}: JSON-LD @context must be https://schema.org`);
		if (Array.isArray(data?.['@graph'])) nodes.push(...data['@graph']);
		else if (Array.isArray(data)) nodes.push(...data);
		else nodes.push(data);
	}

	if (isHome) {
		const website = nodes.find((node) => node['@type'] === 'WebSite');
		if (!website) fail(`${name}: missing WebSite JSON-LD`);
		else if (website.publisher?.['@type'] !== 'Person' || !website.publisher.name || !website.publisher.url) {
			fail(`${name}: WebSite publisher should be a Person with a name and url`);
		}
	}

	if (!isBlogPost) return;
	const posting = nodes.find((node) => node['@type'] === 'BlogPosting');
	const crumbs = nodes.find((node) => node['@type'] === 'BreadcrumbList');
	if (!posting) fail(`${name}: missing BlogPosting JSON-LD`);
	if (!crumbs) fail(`${name}: missing BreadcrumbList JSON-LD`);
	if (posting) {
		if (Number.isNaN(Date.parse(posting.datePublished)) || Number.isNaN(Date.parse(posting.dateModified))) {
			fail(`${name}: BlogPosting dates must be valid`);
		}
		const modifiedMeta = html.match(/<meta\b(?=[^>]*\bproperty=["']article:modified_time["'])[^>]*>/i)?.[0];
		const modifiedContent = modifiedMeta?.match(/\bcontent=["']([^"']+)["']/i)?.[1];
		if (modifiedContent) {
			if (posting.dateModified !== modifiedContent) {
				fail(`${name}: dateModified does not match article:modified_time`);
			}
		} else if (posting.dateModified !== posting.datePublished) {
			fail(`${name}: dateModified should fall back to datePublished when the post has no updated date`);
		}
		if (posting.author?.['@type'] !== 'Person') fail(`${name}: BlogPosting author should be a Person`);
	}
	const items = crumbs?.itemListElement;
	if (!Array.isArray(items) || items.length < 3) {
		fail(`${name}: BreadcrumbList needs Home, Blog, and the post`);
	} else {
		for (const [index, item] of items.entries()) {
			if (item['@type'] !== 'ListItem' || item.position !== index + 1 || !item.name || typeof item.item !== 'string') {
				fail(`${name}: BreadcrumbList item ${index + 1} is not a positioned ListItem with a URL`);
			}
		}
	}
}

async function verifyHtml() {
	const htmlFiles = await walk(dist, (path) => path.endsWith('.html'));
	const canonicalUrls = new Set();

	for (const file of htmlFiles) {
		const html = await readFile(file, 'utf8');
		const name = displayPath(file);
		// 개발용 편집 페이지(src/lib/dev-editor.ts)가 개발 서버에서만 다는 줄 번호다.
		if (html.includes('data-src-line')) fail(`${name}: dev editor source-line attributes leaked into the build`);
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

		const titleText = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
		const rel = relative(dist, file);
		if ((rel === 'index.html' || rel === 'ko/index.html') && titleText === 'pythonstrup') {
			fail(`${name}: home title should describe the site, not only the brand`);
		}

		const locale = expectedLang === 'ko' ? 'ko_KR' : 'en_US';
		const otherLocale = expectedLang === 'ko' ? 'en_US' : 'ko_KR';
		if (!new RegExp(`<meta\\b(?=[^>]*\\bproperty=["']og:locale["'])(?=[^>]*\\bcontent=["']${locale}["'])[^>]*>`, 'i').test(html)) {
			fail(`${name}: missing og:locale ${locale}`);
		}
		const hasEnglishHreflang = /<link\b(?=[^>]*\bhreflang=["']en["'])[^>]*>/i.test(html);
		const alternateLocale = new RegExp(
			`<meta\\b(?=[^>]*\\bproperty=["']og:locale:alternate["'])(?=[^>]*\\bcontent=["']${otherLocale}["'])[^>]*>`,
			'i',
		);
		if (hasEnglishHreflang && !alternateLocale.test(html)) {
			fail(`${name}: missing og:locale:alternate ${otherLocale}`);
		}

		const isBlogPost = /^(?:ko\/)?blog\/(?!page\/|tags\/)[^/]+\/index\.html$/.test(rel);
		const isHome = rel === 'index.html' || rel === 'ko/index.html';
		if (isBlogPost || isHome || /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])/i.test(html)) {
			verifyJsonLd(name, html, { isBlogPost, isHome });
		}

		for (const tag of html.matchAll(/<a\b[^>]*>/gi)) {
			const href = tag[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
			if (!href) continue;
			const pathname = internalPathname(decodeXml(href));
			if (pathname && (await directoryLinkMissesSlash(pathname))) {
				fail(`${name}: internal link would redirect to add a trailing slash: ${href}`);
			}
		}

		if (rel.endsWith('blog/llm-gateway/index.html') && /<th(?:\s[^>]*)?>\s*<\/th>/i.test(html)) {
			fail(`${name}: table header cell is empty`);
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

async function verifyNoteDates() {
	// 노트에는 frontmatter가 없다. 날짜는 전체 git 이력에서 뽑아 커밋한 JSON이 단일 소스다.
	// 얕은 checkout에서는 git log로 다시 만들지 않는다. scripts/note-dates.mjs를 본다.
	// 노트를 넣거나 제목을 바꾸기만 해도 배포되도록, 빠진 항목과 남은 항목은 경고로만 알린다.
	const manifest = JSON.parse(await readFile(join(root, 'src/data/note-dates.json'), 'utf8'));
	const recorded = manifest.notes;
	if (!recorded || typeof recorded !== 'object' || Array.isArray(recorded)) {
		fail('src/data/note-dates.json: expected a notes object');
		return;
	}

	const expected = new Set();
	for (const lang of ['en', 'ko']) {
		const directory = join(root, 'src/content/notes', lang);
		for (const file of await readdir(directory)) {
			if (file.endsWith('.md')) expected.add(`${lang}/${file}`.normalize('NFC'));
		}
	}

	for (const key of expected) {
		const entry = recorded[key];
		if (!entry) {
			console.warn(`Warning: src/data/note-dates.json has no entry for ${key}, so it is dated at build time. Run npm run note-dates on a full clone.`);
			continue;
		}
		const published = Date.parse(entry.published);
		const updated = Date.parse(entry.updated);
		if (Number.isNaN(published) || Number.isNaN(updated)) {
			fail(`src/data/note-dates.json: invalid date for ${key}`);
		} else if (published > updated) {
			fail(`src/data/note-dates.json: ${key} is published after it was updated`);
		}
	}
	for (const key of Object.keys(recorded)) {
		if (!expected.has(key.normalize('NFC'))) {
			console.warn(`Warning: src/data/note-dates.json has a stale entry ${key}. Run npm run note-dates on a full clone.`);
		}
	}
}

function itemLinks(xml) {
	return [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map((match) => {
		const item = match[1];
		const raw = item.match(/<link>([^<]+)<\/link>/)?.[1];
		let link = '';
		if (raw) {
			const url = new URL(decodeXml(raw));
			link = `${url.origin}${decodeURIComponent(url.pathname)}`;
		}
		return {
			link,
			published: Date.parse(item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? ''),
		};
	});
}

async function notePageUrls(lang) {
	const directory = lang === 'en' ? join(dist, 'notes') : join(dist, 'ko', 'notes');
	const urls = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (!(await isFile(join(directory, entry.name, 'index.html')))) continue;
		const pathname = lang === 'en' ? `/notes/${entry.name}/` : `/ko/notes/${entry.name}/`;
		urls.push(`https://pythonstrup.com${pathname.normalize('NFC')}`);
	}
	return new Set(urls);
}

async function verifyRss(postNames) {
	for (const lang of ['en', 'ko']) {
		const path = lang === 'en' ? join(dist, 'rss.xml') : join(dist, 'ko/rss.xml');
		const xml = await readFile(path, 'utf8');
		const items = [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map((match) => match[1]);
		if (items.length !== postNames[lang].length) {
			fail(`${displayPath(path)}: expected ${postNames[lang].length} items, found ${items.length}`);
		}

		const links = new Set(items.map((item) => item.match(/<link>([^<]+)<\/link>/)?.[1]).filter(Boolean));
		const prefix = lang === 'en' ? '/blog' : '/ko/blog';
		for (const name of postNames[lang]) {
			const expected = `https://pythonstrup.com${prefix}/${name}/`;
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

async function verifyNotesRss() {
	// 노트 피드는 블로그 피드와 별도다. 항목은 그 언어의 노트 페이지와 같고, 처음 커밋된 날의 최신순이다.
	for (const lang of ['en', 'ko']) {
		const path = lang === 'en' ? join(dist, 'notes/rss.xml') : join(dist, 'ko/notes/rss.xml');
		const items = itemLinks(await readFile(path, 'utf8'));
		const expected = await notePageUrls(lang);
		if (items.length !== expected.size) {
			fail(`${displayPath(path)}: expected ${expected.size} items, found ${items.length}`);
		}
		const links = new Set(items.map((item) => item.link).filter(Boolean));
		for (const url of expected) {
			if (!links.has(url)) fail(`${displayPath(path)}: missing item ${url}`);
		}
		for (const item of items) {
			if (item.link && !expected.has(item.link)) fail(`${displayPath(path)}: unexpected item ${item.link}`);
		}
		if (items.some((item) => Number.isNaN(item.published))) fail(`${displayPath(path)}: contains an invalid pubDate`);
		for (let index = 1; index < items.length; index += 1) {
			if (items[index].published > items[index - 1].published) {
				fail(`${displayPath(path)}: items are not sorted newest-first`);
				break;
			}
		}
	}
}

async function verifyLlms(postNames) {
	const text = await readFile(join(dist, 'llms.txt'), 'utf8');
	if (!text.startsWith('# pythonstrup\n')) fail('dist/llms.txt: missing site heading');
	if (!text.includes('## English posts') || !text.includes('## Korean posts')) {
		fail('dist/llms.txt: missing a language section');
	}
	for (const lang of ['en', 'ko']) {
		const prefix = lang === 'en' ? '/blog' : '/ko/blog';
		for (const name of postNames[lang]) {
			const url = `https://pythonstrup.com${prefix}/${name}/`;
			if (!text.includes(url)) fail(`dist/llms.txt: missing ${url}`);
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
const postNames = await verifyPostNames();
await verifySeriesOrder();
await verifyNoteDates();
await verifyRequiredOutput();
const { htmlCount, canonicalUrls } = await verifyHtml();
await verifySitemap(canonicalUrls);
await verifyRss(postNames);
await verifyNotesRss();
await verifyLlms(postNames);
await verifyRedirects();
await verifyFontCss();

if (failures.length) {
	console.error(`\nBuild verification failed with ${failures.length} problem(s):`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Verified ${htmlCount} HTML pages, ${canonicalUrls.size} canonical URLs, and ${postNames.en.length + postNames.ko.length} posts.`);

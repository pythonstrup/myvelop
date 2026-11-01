// Single source of truth for navigation shared by Header.astro (desktop),
// MobileNav.astro (mobile dialog), and HeaderLink.astro (active-route styling).

const LOCALE_PREFIXES = ["ko"];

/** Drop a leading locale segment (/ko) so routes compare language-independently. */
export function stripLocale(path: string): string {
	const segs = path.split("/").filter(Boolean);
	if (segs[0] && LOCALE_PREFIXES.includes(segs[0])) segs.shift();
	return "/" + segs.join("/");
}

/** Whether `current` is the active route for a link pointing at `target`. */
export function isActivePath(current: string, target: string): boolean {
	const c = stripLocale(current);
	const t = stripLocale(target);
	return t === "/" ? c === "/" : c === t || c.startsWith(t + "/");
}

/**
 * Directory URLs keep a trailing slash so Cloudflare Pages does not 308 them.
 * A dot in the last segment means a file (`/rss.xml`, `/favicon.svg`) and stays as written.
 */
export function withTrailingSlash(href: string): string {
	if (!href.startsWith("/") || href.startsWith("//")) return href;
	const splitAt = href.search(/[?#]/);
	const pathname = splitAt === -1 ? href : href.slice(0, splitAt);
	const suffix = splitAt === -1 ? "" : href.slice(splitAt);
	if (pathname === "/" || pathname.endsWith("/")) return href;
	const last = pathname.slice(pathname.lastIndexOf("/") + 1);
	if (last.includes(".")) return href;
	return `${pathname}/${suffix}`;
}

const navItems = [
	{ label: { en: "Home", ko: "홈" }, path: "/" },
	{ label: { en: "Blog", ko: "블로그" }, path: "/blog/" },
	{ label: { en: "Notes", ko: "노트" }, path: "/notes/" },
	{ label: { en: "About", ko: "소개" }, path: "/about/" },
	{ label: { en: "Search", ko: "검색" }, path: "/search/" },
];

/** Nav links with the locale base applied (Home resolves to "/" or "/ko/"). */
export function navLinks(isKo: boolean): { label: string; href: string }[] {
	const base = isKo ? "/ko" : "";
	return navItems.map(({ label, path }) => ({
		label: isKo ? label.ko : label.en,
		href: withTrailingSlash(path === "/" ? `${base}/` : `${base}${path}`),
	}));
}

export const externalLinks = [
	{ label: "GitHub", href: "https://github.com/pythonstrup" },
	{
		label: "LinkedIn",
		href: "https://www.linkedin.com/in/%EC%A2%85%ED%98%81-%EB%B0%95-6b062821a/",
	},
];

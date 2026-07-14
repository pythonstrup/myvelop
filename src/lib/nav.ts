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

const navItems = [
	{ label: "Home", path: "" },
	{ label: "Blog", path: "/blog" },
	{ label: "About", path: "/about" },
	{ label: "Search", path: "/search" },
];

/** Nav links with the locale base applied (Home resolves to "/" or "/ko"). */
export function navLinks(isKo: boolean): { label: string; href: string }[] {
	const base = isKo ? "/ko" : "";
	return navItems.map(({ label, path }) => ({
		label,
		href: path ? `${base}${path}` : base || "/",
	}));
}

export const externalLinks = [
	{ label: "GitHub", href: "https://github.com/pythonstrup" },
	{
		label: "LinkedIn",
		href: "https://www.linkedin.com/in/%EC%A2%85%ED%98%81-%EB%B0%95-6b062821a/",
	},
];

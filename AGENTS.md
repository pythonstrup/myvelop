# Repository guide

This file is a map, not the full manual. Read the linked document before changing the related area.

## Start here

- [Architecture and boundaries](docs/architecture.md)
- [Writing and translating posts](docs/content-authoring.md)
- [Lighthouse performance decisions](docs/lighthouse-performance.md)

## Project facts

- Astro 7 static site deployed at `https://pythonstrup.com`.
- Node.js `>=22.12.0`; use npm and the committed `package-lock.json`.
- English routes live at `/`; Korean routes live under `/ko`.
- Posts live in `src/content/blog/{en,ko}`. Matching filenames are translation pairs.
- Blog lists are newest-first, five posts per page; each home page shows the latest three.
- Astro components and native browser APIs are the default. React, Tailwind, and shadcn are limited to search UI unless interactivity requires them elsewhere.

## Commands

```sh
npm ci
astro dev --background
astro dev status
astro dev logs
astro dev stop
npm run check
npm run preview
```

Always start the development server in background mode. `npm run check` type-checks Astro, builds the static site, creates the Pagefind index, and verifies repository and output invariants.

## Working rules

- Keep shared SEO metadata in `src/components/BaseHead.astro`.
- Put shared behavior in `src/components`, `src/layouts`, or `src/lib`; do not copy it across English and Korean route files.
- Keep content images in `src/assets/blog/<slug>` so Astro can optimize them. Use `public` only for files that must retain a fixed URL.
- Preserve the performance choices recorded in `docs/lighthouse-performance.md` unless a new measurement justifies changing them.
- Never store credentials in the repository. `.mcp.json` may contain tool configuration, but not tokens or secrets.
- Do not commit or push unless the user explicitly asks.

## Verification

Run `npm run check` before handing off a code or content change. For visible UI changes, also inspect:

- English and Korean routes;
- 375px mobile and desktop widths;
- light and dark themes;
- mobile navigation and search dialog behavior;
- horizontal overflow and keyboard focus.

## Astro documentation

Consult the relevant official guide before changing that area:

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling and Tailwind](https://docs.astro.build/en/guides/styling/)
- [Internationalization](https://docs.astro.build/en/guides/internationalization/)

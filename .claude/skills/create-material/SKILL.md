---
name: create-material
description: Create a diagram or animated demo component (material) that explains a concept in a blog post. Use for requests like "draw an explanatory diagram", "make an animation demo", "turn this into a diagram component", "animate this SVG". Covers two types - static SSR SVG diagrams and Canvas animation demos.
argument-hint: "[post number and the concept to explain]"
---

# Create a blog material (explanatory component)

Build a concept-explaining component under `src/materials/<post number>/` and wire it into the post's MDX.

## User input

$ARGUMENTS

## Workflow

1. Identify the target post and the concept. Read the post body first and decide which paragraph the component belongs to.
2. **Pick the type.** If the concept has a time axis (state changes, flows, before/after comparisons), build an animated demo; if it is a still concept (structure, relationships, boundaries), build a static diagram. When in doubt, confirm with the user via AskUserQuestion (static diagram vs. looping animation).
3. Write the component and wire it into the MDX.
4. Finish with `npm run check` plus a visual check on the dev server (light/dark themes, desktop and 375px widths).

## File conventions

- Location: `src/materials/<post number>/ComponentName.tsx`, default export.
- Naming: `~Demo` suffix for animations, `~Diagram` suffix for static diagrams.
- Shared helpers: `@/materials/shared` — `palette(dark)`, `ease`, `lerp`, `clamp01`, `drawBadge`, `useCanvasScene`.
- MDX wiring: if the post is `.md`, rename it to `.mdx` (the build verifier accepts `.mdx`). Put imports right below the frontmatter.

```mdx
import FooDemo from "@/materials/25/FooDemo";

<FooDemo client:visible />   <!-- animation: client:visible is required -->
<BarDiagram />               <!-- static: SSR only, no client directive -->
```

- Precede the component with a one-sentence paragraph saying what it shows. Do not copy the same lead-in phrasing across multiple components.

## Type 1 — static diagram (SSR-only SVG)

**Template: `src/materials/24/TrustChainDiagram.tsx`**

- Draw an inline `<svg>` in JSX. No client directive — it renders with zero bytes of JS.
- Never hardcode colors; use the site's CSS variables: `var(--foreground)`, `var(--muted-foreground)`, `var(--secondary)`, `var(--accent)`, `var(--background)`, `rgb(var(--gray))`. Theme switching is then handled by CSS automatically.
- For labels sitting on lines, use `paintOrder: "stroke"` with a background-colored stroke halo for legibility.
- Decorative animation (dashed flow lines etc.) goes in CSS `@keyframes`, disabled under `@media (prefers-reduced-motion: reduce)`.
- `role="img"` plus a descriptive `aria-label` in the post's language is required.
- Handle responsiveness with `viewBox` plus a `maxWidth` style.

## Type 2 — animated demo (Canvas 2D)

**Templates: `src/materials/24/PasswordlessAuthDemo.tsx`, `PrivilegesTimingDemo.tsx`**

- No external chart/animation libraries. Canvas 2D plus the `useCanvasScene` hook only.
- Deterministic timeline: `STEPS = [{ until, caption }, …]` plus a `CYCLE` constant (ms) so every cycle replays the same scene. No `Math.random()` or wall-clock dependence.
- Write `drawScene(ctx, w, t, dark)` as a module-level pure function (the hook captures it once on mount).
- Colors must come from `palette(dark)`. Text uses the `FONT` constant (Pretendard).
- Draw the current step caption (①–⑥) at the bottom. Keep captions short enough to fit one line at 375px width.
- DPR, resize, `prefers-reduced-motion` (renders the final scene as a still), and unmount cleanup are handled by the hook — do not reimplement them.
- Lay out with container-width-based ratios and guaranteed minimum font sizes. Verify nothing overlaps at 375px.
- `role="img"` plus a descriptive `aria-label` in the post's language is required.

## Verification (required)

1. `npm run check` — types, build, output invariants.
2. `npx astro dev --background`, then inspect the post: light/dark themes (header toggle), desktop and 375px, caption/label overlap, and that the animation starts when scrolled into view.
3. `npx astro dev stop` when done.

## Cautions

- When replacing an existing static image (SVG/PNG) with a component, never delete the original file even if it becomes unreferenced. Leave it in `src/assets/blog/<number>/` until the user says otherwise.
- When an English translation of a post appears, reuse the component but render labels in the target language — add a `lang` prop at that point.

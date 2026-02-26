# Emboss Website — Astro Project Brief

## What This Is

Convert the single-file `emboss-brand-v4.html` (929 lines) into a multi-page Astro static site. The HTML file is the **source of truth** for all design — every color, font, spacing value, and visual treatment. Don't improvise design. Extract it.

## Source File

The v4 HTML file should be placed at `reference/emboss-brand-v4.html` in this repo. Copy it there from wherever Gloria provides it. This file contains:
- All CSS custom properties (design tokens)
- Full nav, hero, 9 content sections, footer
- Interactive Gantt chart preview with grayscale/vivid toggle
- Dark mode toggle with localStorage persistence
- D1 logo SVG (dipped corner gradient, no glow)
- Complete responsive styles

## Stack

- **Astro 5** — static output, no SSR needed
- **Zero frameworks** — plain Astro components, no React/Vue/Svelte
- **Google Fonts** — DM Serif Display, Hanken Grotesk, JetBrains Mono (link in layout head)
- **No Tailwind** — the design system uses CSS custom properties exclusively
- **Deploy target**: Static files served from Coolify behind Cloudflare

## Project Structure

```
emboss-site/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── CLAUDE.md              ← this file
├── reference/
│   └── emboss-brand-v4.html   ← design source of truth
├── public/
│   └── favicon.svg        ← D1 logo as favicon
├── src/
│   ├── layouts/
│   │   └── Base.astro     ← html/head/body, fonts, global CSS, theme script
│   ├── components/
│   │   ├── Logo.astro     ← D1 dipped-corner SVG, accepts size prop
│   │   ├── Nav.astro      ← fixed top nav with logo, links, theme toggle
│   │   ├── Footer.astro   ← footer with tagline and links
│   │   ├── Hero.astro     ← hero section from v4
│   │   ├── Mission.astro  ← mission quote section
│   │   ├── HowItWorks.astro  ← 3-column feature grid
│   │   ├── Preview.astro  ← gantt chart preview with grayscale/vivid toggle
│   │   ├── Brand.astro    ← logo showcase section
│   │   ├── Colors.astro   ← color system swatches
│   │   ├── Typography.astro ← type specimens
│   │   ├── Voice.astro    ← voice & tone principles
│   │   ├── Pricing.astro  ← pricing cards (free/organize/coming soon)
│   │   └── CTA.astro      ← bottom call-to-action
│   ├── pages/
│   │   ├── index.astro    ← homepage, composes all components above
│   │   ├── docs.astro     ← placeholder: "Documentation coming soon"
│   │   ├── extensions.astro ← placeholder: "Extensions marketplace coming soon"
│   │   ├── pricing.astro  ← full pricing page (can reuse Pricing component)
│   │   └── blog/
│   │       ├── index.astro     ← blog listing page
│   │       └── [...slug].astro ← dynamic blog post pages
│   ├── content/
│   │   ├── config.ts      ← content collection schema for blog
│   │   └── blog/
│   │       └── hello-world.md  ← sample blog post
│   └── styles/
│       └── global.css     ← all CSS custom properties + resets + primitives
```

## Component Extraction Rules

Each component gets its own `<style>` block with scoped CSS. The styles come directly from v4 — don't redesign anything.

### Base.astro (Layout)
- `<html lang="en">` with `data-theme` attribute
- Google Fonts preconnect + stylesheet link
- Import and apply `global.css`
- Meta tags: charset, viewport, title (from prop), description (from prop)
- Open Graph meta tags (og:title, og:description, og:image)
- Theme initialization script (check localStorage before paint to prevent flash)
- Slot for page content

### Logo.astro
- Props: `size` (default 30)
- SVG with dark block `#1e1c19`, radial gradient overlay (blue→cyan from bottom-right corner), white E
- Gradient def: cx="0.85" cy="0.75" r="1.2" fx="0.95" fy="0.95"
  - Stop 0%: #22d3ee opacity 0.8
  - Stop 30%: #38bdf8 opacity 0.5
  - Stop 55%: #3b82f6 opacity 0.22
  - Stop 80%: #3b82f6 opacity 0
- NO filter, NO glow — clean white E text, no effects

### Nav.astro
- Fixed position, backdrop blur, semi-transparent background
- Left: Logo component + "emboss" wordmark
- Center: Docs, Extensions, Pricing, Blog, GitHub links
- Right: Theme toggle button (☀/☾)
- Dark mode swaps background opacity
- Mobile: hide nav links (we can add hamburger later)

### Preview.astro (the Gantt chart)
- This is the most complex component — it contains the interactive chart preview
- Has a grayscale/vivid toggle button pair
- Renders a mock Gantt chart with phases, tasks, milestones, today marker
- All the chart JS is inline in v4 — extract it into a `<script>` block in this component
- The chart renders on mount, responds to toggle clicks

### Placeholder Pages
Style them consistently with the brand. Each should have:
- Nav + Footer (via Base layout)
- Centered content with section-title styling
- A brief "coming soon" message
- A back-to-home link

### Blog Setup
- Content collection with schema: `title`, `description`, `date`, `author`, `tags`
- Blog index: list posts sorted by date, styled with the brand's typography and colors
- Blog post layout: readable width (~680px), DM Serif Display for title, Hanken Grotesk for body
- Style markdown elements (h1-h4, p, code, blockquote, lists, links) to match the brand
- Sample post: "Hello World — Introducing Emboss" with a brief intro to the project

## Design Tokens (from v4)

### Light mode (`:root`)
```css
--emboss-coal: #1e1c19
--emboss-graphite: #2e2b26
--emboss-slate: #574f45
--emboss-ash: #736a61          /* WCAG AA compliant — 5.00:1 on white, 4.74:1 on cream */
--emboss-fog: #cdc6bb
--emboss-cloud: #e3ddd4
--emboss-snow: #f0ebe4
--emboss-cream: #f5f2ec
--emboss-white: #faf8f4
```

### Dark mode (`[data-theme="dark"]`)
```css
--emboss-ash: #9d9488          /* swaps back to lighter value for dark backgrounds */
--emboss-surface: #131210
--emboss-surface-raised: #1e1c19
--emboss-surface-inset: #181613
```

### Vivid accents (blue→cyan only, no green/purple/pink)
```css
--emboss-vivid-1: #3b82f6      /* Deep Blue */
--emboss-vivid-2: #38bdf8      /* Sky */
--emboss-vivid-3: #22d3ee      /* Cyan */
--emboss-gradient: linear-gradient(135deg, #3b82f6, #38bdf8, #22d3ee)
```

### Fonts
- Display: `'DM Serif Display', Georgia, serif` — headings, hero
- Body: `'Hanken Grotesk', -apple-system, sans-serif` — everything else
- Mono: `'JetBrains Mono', monospace` — labels, code

## Critical Details

1. **Ash color is WCAG AA compliant** — `#736a61` in light mode, `#9d9488` in dark mode. Don't change these values.

2. **Logo has NO glow effect** — the v4 file may still have a glow filter defined in SVG defs. Ignore it. The logo E element should have NO filter attribute.

3. **Hero blur is minimal** — single radial gradient at 3% opacity (6% dark mode). Don't add more.

4. **Gradient is blue→cyan only** — every gradient instance uses `#3b82f6 → #38bdf8 → #22d3ee`. No emerald, purple, or pink anywhere.

5. **Theme toggle must not flash** — the Base layout needs an inline script in `<head>` that checks `localStorage('emboss-theme')` and sets `data-theme` before the page renders.

## Build & Deploy

```bash
npm install
npm run dev      # local development
npm run build    # outputs to dist/
```

The `dist/` folder is what Coolify serves. Static files, nothing else.

## SEO Checklist

Each page should have:
- Unique `<title>` tag
- `<meta name="description">` 
- `<link rel="canonical">`
- Open Graph tags (og:title, og:description, og:type, og:url)
- Proper heading hierarchy (one h1 per page)
- Semantic HTML (nav, main, section, article, footer)

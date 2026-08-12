# DESIGN.md

> Quiet luxury: the hush of a boutique attar counter — warm ivory light, aged gold, and a serif whisper — rendered with editorial restraint borrowed from fine fragrance retail.

## 1. Visual Theme & Atmosphere

**Style**: Luxury Editorial (Arabic perfumery heritage × modern minimal e-commerce)
**Keywords**: opulent, hushed, tactile, warm, editorial, artisanal, spacious, timeless
**Tone**: Confident quiet luxury, generous whitespace, product-as-hero — NOT loud, NOT discount-y, NOT playful/rounded, NOT tech/SaaS
**Feel**: Like walking into a dim, warmly-lit attar boutique — every surface is soft ivory or deep navy velvet, every label is engraved in gold, and nothing rushes you.

**Interaction Tier**: L2 — flowing interaction (scroll reveal, hover polish, nav state change, subtle parallax). No pin-scroll, no WebGL/3D, no cursor replacement — this is a catalog-heavy storefront + admin console, not a marketing microsite; L3 theatrics would hurt usability and performance across 40+ pages.
**Dependencies**: CSS only + IntersectionObserver (no new JS animation library — the codebase already achieves L2-grade motion with pure Tailwind/CSS keyframes; stay consistent, don't add GSAP/Lenis).

**Reference synthesis**: Primary identity is the existing Al Ahad Attars system (navy `#121c2a` + antique gold `#d4af37` + Playfair Display/Inter) — it's already strong and brand-correct, so it is kept as the source of truth rather than replaced. From sugandhya.com (crawled via static token extraction) we borrow *editorial discipline*, not color: generous section padding, wide breathing room around product grids, muted soft shadows (`0 4px 15px rgba(0,0,0,.1)` / `0 8px 30px rgba(0,0,0,.15)` class values), restrained letter-spacing on labels (~0.06–0.13em), and serif-heading/sans-body pairing logic (they use Baskervville/Muli; we keep Playfair/Inter, already equivalent in role). No colors were borrowed from the reference — its palette (stark black/white/sage) doesn't fit an Arabic-attar brand and the existing gold/navy is stronger.

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg: #fbf9f5;                 /* warm ivory page background */
  --surface: #ffffff;            /* cards, product tiles, modals */
  --surface-alt: #f5f1e8;        /* alternating section band (warm sand) */
  --surface-hover: #f1ead9;      /* hovered list rows, table stripes */

  /* Borders */
  --border: #e4dcc8;             /* hairlines, dividers, input borders */
  --border-hover: #d4af37;       /* focused/hovered border → gold */

  /* Text */
  --text: #121c2a;               /* headings, primary copy — deep navy-charcoal */
  --text-secondary: #5b5346;     /* body copy, descriptions — warm taupe */
  --text-tertiary: #8a8171;      /* meta labels, placeholders, timestamps */
  --text-inverse: #fbf9f5;       /* text on navy/dark or image overlays */

  /* Accent */
  --accent: #d4af37;             /* antique gold — CTAs, active nav, prices, icons */
  --accent-hover: #b8860b;       /* darker goldenrod on hover/press */
  --accent-soft: #f7ecc9;        /* gold tint for badges/highlights on light bg */
  --ink: #121c2a;                /* deep navy — dark sections, footer, primary buttons */
  --ink-hover: #1e2b3d;

  /* Secondary (rare, editorial accent — muted sage, used sparingly for success/eco cues) */
  --secondary: #7c8363;

  /* RGB variants for rgba() */
  --bg-rgb: 251, 249, 245;
  --accent-rgb: 212, 175, 55;
  --ink-rgb: 18, 28, 42;

  /* Semantic */
  --success: #4b6c4b;
  --success-bg: #eaf0e6;
  --error: #ba1a1a;
  --error-bg: #ffdad6;
  --warning: #b8860b;
  --warning-bg: #fbf1d9;
}
```

**Color Rules:**
- All colors are referenced via these CSS variables (or the matching Tailwind tokens in `tailwind.config.js`) — no new hardcoded hex in components; existing one-off hexes (`#d4af37`, `#121c2a`, `#faf9f8`, `#f5f2eb`, `#fcfaf8`, etc.) get consolidated onto this palette.
- Gold (`--accent`) is a precious accent, not a fill color: use it for CTAs, active states, prices, icons, hairline dividers — never as a large background.
- Exactly one accent per view; `--secondary` sage is reserved for rare eco/heritage badges, never combined with gold in the same component.
- Dark sections (hero overlays, footer, promo banners) use `--ink`/`--ink-hover`, not pure black.

## 3. Typography Rules

**Font Stack:**
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
```
Fallbacks: `font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;` / `font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;`

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1 | Playfair Display | `clamp(2.75rem, 6vw, 5rem)` | 600 | 1.1 | -0.01em |
| Section H2 | Playfair Display | `clamp(1.75rem, 3.5vw, 2.75rem)` | 500 | 1.2 | 0 |
| H3 | Playfair Display | 1.5rem | 500 | 1.3 | 0 |
| Body | Inter | 1rem | 400 | 1.7 | 0 |
| Body small | Inter | 0.875rem | 400 | 1.6 | 0 |
| Label/Eyebrow | Inter | 0.6875rem (11px) | 600 | 1.4 | 0.25em, uppercase |
| Button label | Inter | 0.6875rem (11px) | 600 | 1 | 0.2em, uppercase |
| Mono (order #, SKU) | ui-monospace, Menlo | 0.8125rem | 500 | 1.4 | 0.02em |

**Typography Rules:**
- Only Playfair Display is used for anything that reads as a "headline" (h1–h3, quote/testimonial text, price on hero/PDP). Everything else is Inter.
- Body copy line-height stays ≥ 1.6 — this is the one deliberate departure from the current codebase's tighter body leading, adopted from the reference's editorial density.
- Eyebrows/labels are always uppercase + wide-tracked (0.2–0.3em) — this is already the site's signature move (`THE COLLECTIONS`, `OUR HERITAGE`) and must stay consistent everywhere, including admin.
- **NEVER use**: system-ui as a primary brand font, condensed/geometric sans for headings, any rounded/playful display font.

**Text Decoration:**
- Hero H1 on dark image overlay: soft shadow only — `text-shadow: 0 2px 12px rgba(0,0,0,.25)` (readability aid, not decoration). No gradient text anywhere — quiet-luxury tone forbids it.
- Section H2 on light bg: no shadow, no gradient — clean ink color.
- Eyebrow labels may use a 1px gold underline/border-bottom accent instead of any text-shadow.

## 4. Component Stylings

### Buttons
```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  padding: 1rem 2.5rem;
  font: 600 11px/1 'Inter', sans-serif; text-transform: uppercase; letter-spacing: .2em;
  border: 1px solid transparent; border-radius: 2px;
  cursor: pointer; transition: background-color .4s ease, color .4s ease, border-color .4s ease, transform .15s ease;
}
.btn:active { transform: scale(.97); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.btn:disabled { opacity: .45; cursor: not-allowed; }

.btn-primary { background: var(--ink); color: var(--text-inverse); }
.btn-primary:hover:not(:disabled) { background: var(--accent); color: var(--ink); }

.btn-gold { background: var(--accent); color: var(--ink); }
.btn-gold:hover:not(:disabled) { background: var(--accent-hover); }

.btn-outline { background: transparent; color: var(--text); border-color: var(--text); }
.btn-outline:hover:not(:disabled) { background: var(--text); color: var(--text-inverse); }

.btn-outline-inverse { background: transparent; color: var(--text-inverse); border-color: rgba(255,255,255,.4); }
.btn-outline-inverse:hover:not(:disabled) { background: rgba(255,255,255,.12); border-color: var(--text-inverse); }

.btn-ghost { background: transparent; color: var(--text-secondary); padding: .5rem .75rem; }
.btn-ghost:hover:not(:disabled) { color: var(--accent); }
```

### Cards
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(18,28,42,.04);
  transition: box-shadow .4s ease, transform .4s ease, border-color .4s ease;
}
.card:hover {
  box-shadow: 0 16px 40px rgba(18,28,42,.09);
  transform: translateY(-3px);
  border-color: var(--border-hover);
}
.card:focus-within { border-color: var(--accent); }

/* Product tile image crop + zoom, used across grids everywhere */
.product-media { overflow: hidden; position: relative; }
.product-media img { transition: transform 1.2s cubic-bezier(.16,1,.3,1); }
.card:hover .product-media img { transform: scale(1.06); }
```

### Navigation
```css
.nav {
  position: sticky; top: 0; z-index: 40;
  background: rgba(251,249,245,.85); backdrop-filter: blur(8px);
  border-bottom: 1px solid transparent;
  transition: background-color .35s ease, border-color .35s ease, box-shadow .35s ease;
}
.nav.is-scrolled {
  background: rgba(251,249,245,.97);
  border-color: var(--border);
  box-shadow: 0 2px 20px rgba(18,28,42,.05);
}
.nav-link { font: 600 13px/1 'Inter'; letter-spacing: .15em; text-transform: uppercase; color: var(--text-secondary); transition: color .3s ease; }
.nav-link:hover, .nav-link.active { color: var(--accent); }
.nav-link.active { border-bottom: 1px solid var(--accent); padding-bottom: 4px; }
```

### Links
```css
.link-underline {
  position: relative; color: var(--text); text-decoration: none;
  background-image: linear-gradient(var(--accent), var(--accent));
  background-position: 0 100%; background-repeat: no-repeat; background-size: 0% 1px;
  transition: background-size .35s ease, color .35s ease;
}
.link-underline:hover { background-size: 100% 1px; color: var(--accent-hover); }
```

### Tags / Badges
```css
.badge { display: inline-flex; align-items: center; gap: .375rem; padding: .25rem .625rem; border-radius: 999px; font: 600 10px/1 'Inter'; letter-spacing: .08em; text-transform: uppercase; }
.badge-gold { background: var(--accent-soft); color: #7a5b00; }
.badge-success { background: var(--success-bg); color: var(--success); }
.badge-error { background: var(--error-bg); color: var(--error); }
.badge-warning { background: var(--warning-bg); color: var(--warning); }
.badge-neutral { background: var(--surface-alt); color: var(--text-secondary); }
```

### Inputs (storefront + admin forms)
```css
.field-input {
  width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
  padding: .875rem 1rem; font: 400 15px/1.4 'Inter'; color: var(--text);
  transition: border-color .25s ease, box-shadow .25s ease;
}
.field-input::placeholder { color: var(--text-tertiary); }
.field-input:hover { border-color: #cbbfa0; }
.field-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), .15); }
.field-input:disabled { background: var(--surface-alt); color: var(--text-tertiary); cursor: not-allowed; }
.field-input.is-error { border-color: var(--error); box-shadow: 0 0 0 3px rgba(186,26,26,.1); }
.field-label { font: 600 11px/1 'Inter'; letter-spacing: .12em; text-transform: uppercase; color: var(--text-secondary); margin-bottom: .5rem; display: block; }
```

### Modals / Dialogs
```css
.modal-overlay { background: rgba(18,28,42,.55); backdrop-filter: blur(4px); animation: fadeIn .3s ease both; }
.modal-panel {
  background: var(--surface); border-radius: 12px; box-shadow: 0 25px 60px rgba(18,28,42,.25);
  animation: modalIn .35s cubic-bezier(.16,1,.3,1) both;
}
@keyframes modalIn { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
```

### Admin data table (dashboard/orders/products consistency)
```css
.table-shell { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.table-shell thead th { background: var(--surface-alt); font: 600 10px/1 'Inter'; letter-spacing: .1em; text-transform: uppercase; color: var(--text-secondary); padding: .875rem 1.25rem; text-align: left; }
.table-shell tbody tr { border-top: 1px solid var(--border); transition: background-color .2s ease; }
.table-shell tbody tr:hover { background: var(--surface-hover); }
.table-shell td { padding: 1rem 1.25rem; font-size: .875rem; color: var(--text); }

.kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(18,28,42,.04); transition: transform .3s ease, box-shadow .3s ease; }
.kpi-card:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(18,28,42,.08); }
```

## 5. Layout Principles

**Container:**
- Max width: `1280px` (`max-w-7xl`, unchanged from current codebase — matches Sugandhya's disciplined content width rather than its full page-shell width, since 1280 already reads spacious with this typography scale)
- Padding: `1rem` mobile / `2rem` desktop (`px-4 md:px-8`)
- Narrow variant (auth forms, checkout steps, text-heavy legal pages): `480px`

**Spacing Scale:**
- Section padding: `6rem` mobile / `8rem` desktop between major homepage-style sections (`py-24 md:py-32`, existing convention — keep); inner content pages (Product, Cart, admin) use tighter `py-10 md:py-16`
- Component gap: `2rem` (grid gutters), `1rem` (form fields), `.75rem` (inline icon+text)
- Card internal padding: `1.5rem`–`2.5rem` depending on density (admin KPI card vs. testimonial card)

**Grid:**
```css
.grid-products { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
@media (min-width: 640px) { .grid-products { grid-template-columns: repeat(3, 1fr); gap: 2rem; } }
@media (min-width: 1024px) { .grid-products { grid-template-columns: repeat(4, 1fr); } }

.grid-kpi { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 768px) { .grid-kpi { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .grid-kpi { grid-template-columns: repeat(5, 1fr); } }
```

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | no shadow, 1px `--border` | table rows, list dividers, admin sidebar |
| Subtle | `0 10px 30px rgba(18,28,42,.04)` | product cards, KPI tiles at rest |
| Elevated | `0 16px 40px rgba(18,28,42,.09)` | hovered cards, dropdowns, search overlay |
| Overlay | `0 25px 60px rgba(18,28,42,.25)` | modals, dialogs, mobile drawer |

## 7. Animation & Interaction

**Motion Philosophy**: Slow, deliberate, opacity+transform only — motion should feel like a curtain lifting, never a bounce.
**Tier**: L2

### Dependencies
None — pure CSS keyframes + a shared `useInView` IntersectionObserver hook (no GSAP/Lenis).

### Base Setup
```ts
// src/hooks/useInView.ts
import { useEffect, useRef, useState } from 'react';

export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}
```

### Entrance Animation
```css
@keyframes fade-up { 0% { opacity: 0; transform: translateY(28px); } 100% { opacity: 1; transform: translateY(0); } }
.reveal { opacity: 0; }
.reveal.in-view { animation: fade-up .9s cubic-bezier(.16,1,.3,1) forwards; }
.reveal.in-view.stagger-1 { animation-delay: .08s; }
.reveal.in-view.stagger-2 { animation-delay: .16s; }
.reveal.in-view.stagger-3 { animation-delay: .24s; }
```

### Scroll Behavior
```css
/* Nav background swap — toggled by the existing scroll listener in Navbar.tsx */
.nav { transition: background-color .35s ease, box-shadow .35s ease; }

/* Hero/banner slow zoom (already present as animate-subtle-zoom, keep as-is) */
```

### Hover & Focus States
- Every interactive element (button, card, link, input, nav item, table row) must define both `:hover` and `:focus-visible` — see Component Stylings above; none may rely on `:hover` alone for keyboard users.

### Special Effects
- Product card image crossfade to a secondary product photo on hover, where a second image exists (falls back to zoom-only otherwise).
- Toast/inline success uses a single 200ms fade+slide, no bounce.

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .reveal, .card, .product-media img, .btn, .nav { animation: none !important; transition: none !important; }
  .reveal { opacity: 1; transform: none; }
}
```

## 8. Do's and Don'ts

### Do
- Keep gold (`--accent`) rare and intentional — it should read as precious, not decorative wallpaper.
- Use Playfair Display exclusively for headings/quotes; Inter for everything else, including all-caps labels.
- Give every section generous vertical breathing room (`py-24`+ on marketing sections) — density is the enemy of "luxury."
- Reuse the `.reveal` + `useInView` pattern for scroll-triggered entrances everywhere, including admin lists, not just the homepage.
- Bring admin screens (Dashboard, Products, Orders, Customers, Promotions, etc.) onto the same card/table/badge/button components as the storefront so the whole app reads as one product.
- Keep motion slow (`.35s`–`1.2s`) and eased with `cubic-bezier(.16,1,.3,1)` or `ease` — never linear, never < 150ms for anything but micro press feedback.

### Don't
- ❌ Don't introduce a second display/serif font, or any rounded/geometric "friendly" typeface — breaks the quiet-luxury tone.
- ❌ Don't use gradient text or neon glows anywhere — forbidden by the style's restraint rule.
- ❌ Don't fill large backgrounds with gold — it becomes gaudy instead of precious.
- ❌ Don't add bounce/elastic easing, confetti, or playful micro-interactions — wrong emotional register for the brand.
- ❌ Don't ship a hover-only interactive state without a matching `:focus-visible` treatment.
- ❌ Don't add WebGL, scroll-jacking/pin, or custom cursors — out of scope for an L2, catalog-heavy, admin-inclusive app.
- ❌ Don't hardcode a new hex color in a component — extend the palette in section 2 first if something is missing.
- ❌ Don't let admin screens drift back to generic Bootstrap-blue badges/buttons — route every status pill through `.badge-*`.
- ❌ Don't reduce body line-height below 1.6 for paragraph copy — readability over density.

## 9. Responsive Behavior

**Breakpoints:**
| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | > 1024px | full nav, 4-col product grid, 5-col KPI grid, sidebar admin nav |
| Tablet | 640–1024px | 2–3 col product grid, 3-col KPI grid, admin sidebar collapses to icons |
| Mobile | < 640px | hamburger nav, 2-col product grid, 1-col KPI/table→card list, sticky bottom CTA on PDP |

**Touch Targets:** minimum 44×44px for all buttons, nav items, and admin table row actions.
**Collapsing Strategy:** admin data tables convert to stacked label/value cards below 768px; multi-column forms (checkout, address, product edit) collapse to single column below 640px; the desktop mega-style category grid stacks to a vertical scroll list on mobile.

```css
@media (max-width: 639px) {
  .grid-products { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  .table-shell thead { display: none; }
  .table-shell tbody tr { display: block; border: 1px solid var(--border); border-radius: 10px; margin: .75rem; padding: 1rem; }
  .table-shell td { display: flex; justify-content: space-between; padding: .375rem 0; border: none; }
}
```

# NUUz palette and typeface (visual authority, part 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark "glass on purple" look with the university palette (indigo and sand on warm paper, plus a matching dark theme), solid surfaces, theme-aware data colours and the Onest typeface, with tests that keep text and data colours readable.

**Architecture:** Components already read colours from CSS variables (`--glass-*`, `--text-*`, `--status-*`, `--sensor-*`, `--chart-*`, shadcn tokens), so the palette is a token swap in `globals.css`; only ECharts (which cannot read variables at draw time) and the sensor icon tints need code changes. A vitest test parses the tokens and enforces WCAG contrast.

**Tech Stack:** Tailwind v4 tokens, `@fontsource-variable/onest`, ECharts, Vitest, Playwright for browser checks.

**Spec:** the palette preview agreed in chat on 2026-10-10 (`.superpowers/palette-preview.html`, values reproduced below).

## Global Constraints

- Light is the primary theme; theme default stays "system".
- Palette (light): paper `#F4F0EC`, surface `#FFFFFF`, surface-2 `#FAF7F3`, border `#E0DAD3`, ink `#1E2347`, ink-2 `#4B5075`, ink-3 `#666B8C`, brand `#232856`, link `#243978`, sand `#BEA587`, sand-ink `#7A6240`, status safe `#1F7A52` / warn `#94620A` / critical `#B0342C` / info `#2A5DA8`.
- Palette (dark): paper `#0D1128`, surface `#151A3D`, surface-2 `#1B2149`, border `#2B3260`, ink `#EEF1FA`, ink-2 `#B4BBDD`, ink-3 `#8E96C0`, brand/link `#A5BCED`, sand `#D4BFA0`, status safe `#4CC38A` / warn `#E3A93B` / critical `#F27B72` / info `#7DA7F0`.
- Series colours (light / dark), after the colour-vision check: temperature `#C4553B`/`#F2866B`, humidity `#3A86C8`/`#4A94EC`, pressure `#41309A`/`#CABCFF`, PM2.5 `#9B3E9E`/`#E27FD0`, PM10 `#6B5110`/`#B8860B`, MQ-5 `#D9731A`/`#FFB45E`, MQ-3 `#2F855A`/`#58C48C`; every pair stays at least 9.4 (CIE76 delta E) apart under protanopia, deuteranopia and tritanopia.
- AQI category colours and their tests stay as they are (EPA meaning).
- Contrast: text tokens at least 4.5:1 on the surface, data series and status marks at least 3:1.
- `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test`, `pnpm build` pass after every task. Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Every `bg-white/…`, `text-white`, `border-white/…` left in components renders unreadably on the light paper (the live-streams block and stream cards still use them): they must move to tokens.
- ECharts series, axis text and tooltips after a live theme switch (the wave): colours must follow the new theme without a reload.
- Sensor icon tints in the chart selector (light and dark) and the active-tab fill.
- Light-theme legibility of the AQI card (gradient bar, category badge) on a white surface.
- Layout shift from the font swap (line heights of the big numbers, uppercase labels) at 375 px.

## File Structure

```
package.json                                       Onest in, Geist out
src/app/styles/globals.css                         tokens, font, background, shadows
src/app/styles/palette-tokens.test.ts              contrast test
src/shared/lib/chart/chart-colors.ts               read series colours from CSS variables
src/features/chart-selector/ui/ChartSelector.tsx   tints from variables
src/widgets/sensor-charts/model/chart-option.ts + ui/SensorCharts.tsx   theme-aware colours
src/components/{LiveStreams,StreamCard,StreamModal}.tsx and card components   remove white/blur hard-codes
docs/PROJECT_REPORT.md                             short note
```

---

### Task 1: Onest typeface

- [ ] **Step 1:** `pnpm add @fontsource-variable/onest`, `pnpm remove @fontsource-variable/geist`; in `globals.css` import Onest instead of Geist and set `--font-sans: "Onest Variable", ui-sans-serif, system-ui, sans-serif`; add `font-variant-numeric: tabular-nums` on `body`.
- [ ] **Step 2:** Build; check in the browser that Cyrillic, Latin and the Uzbek letters `ʻ` (U+02BB) render in Onest at 1440 and 375 px; commit `Switch the typeface to Onest`.

### Task 2: Palette tokens with a contrast test

**Files:** `globals.css`, create `src/app/styles/palette-tokens.test.ts`.

- [ ] **Step 1:** Write the test first: it reads `globals.css`, extracts blocks marked `/* PALETTE:light */` and `/* PALETTE:dark */`, requires hex values for `--text-primary`, `--text-secondary`, `--text-muted`, `--status-safe`, `--status-warning`, `--status-critical`, `--status-info`, `--sensor-temp|hum|press|pm25|pm10|mq5|mq3` and `--surface` (the card colour), and asserts: the three text tokens at least 4.5:1 against `--surface`, status tokens at least 4.5:1, sensor tokens at least 3:1.
- [ ] **Step 2:** Run it — Expected: FAIL (blocks missing).
- [ ] **Step 3:** In `globals.css` add the two marked blocks with the palette from Global Constraints and rewire: `--glass-surface` = surface, `--glass-surface-hover`/`soft` = surface-2, `--glass-border` = border, `--topbar-bg` = paper at 90%, `--control-*` for each theme, `--dash-base` = paper with the three radial accents set to transparent, shadow tokens soft indigo, shadcn tokens (`--background`, `--card`, `--primary`, `--ring`, …) mapped to the palette, `--chart-*` tokens from ink at low alpha, `--text-*` as solid hex. Remove the old per-theme duplicates of the status and sensor tokens.
- [ ] **Step 4:** Test passes; `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; commit `Apply the NUUz palette as design tokens`.

### Task 3: Remove glass and white hard-codes

- [ ] **Step 1:** `grep` components for `backdrop-blur`, `bg-white/`, `border-white/`, `text-white`: remove the blur from cards and panels (keep it only on the sticky bar), and move the live-streams block and stream cards to the surface/border/text tokens (video overlays that must stay dark keep their own black).
- [ ] **Step 2:** `--shadow-card`, `--shadow-panel` in `@theme` point to the token shadows; drop the green glow shadow if unused. Browser check of both themes at 1440 and 375; commit `Use solid surfaces instead of glass`.

### Task 4: Theme-aware series colours

**Files:** `chart-colors.ts`, `ChartSelector.tsx`, `chart-option.ts`/`SensorCharts.tsx`.

- [ ] **Step 1:** `getSensorColor(sensor): string` reads `--sensor-<id>` from `document.documentElement` (fallback to the light hex); the chart option memo depends on `resolvedTheme` so a theme switch rebuilds the series. ChartSelector icons use `var(--sensor-<id>)` and the active fill `color-mix(in srgb, var(--sensor-<id>) 14%, transparent)`.
- [ ] **Step 2:** Colour-vision check: simulate protanopia, deuteranopia and tritanopia on the seven series per theme (Machado matrices), compute pairwise ΔE (CIE76) and require at least 12 for every pair that can appear on the same chart (all series are shown one at a time, so the check is for the legend/selector row); adjust any pair below the bar and update the tokens and the Global Constraints list.
- [ ] **Step 3:** Browser check: switch theme live on a chart, no stale colours; commit `Make chart colours follow the theme`.

### Task 5: Verification and report

- [ ] **Step 1:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; Playwright screenshots of Room and Street, both themes, 1440 and 375 px, dialogs/menus open; console without errors; check layout shift from the new font.
- [ ] **Step 2:** One short paragraph in `docs/PROJECT_REPORT.md` section 13.1 (palette, typeface, contrast test); push the branch, give the PR link, list what only a human eye can judge.

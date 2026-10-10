# Tailwind v4 migration (PR 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the frontend from Tailwind v3.4 to v4 with no visible change, so the shadcn components generated for v4 (`data-open:`, `data-closed:`, `var(--radius-*)`) work as designed and the dust card can be written in v4 syntax.

**Architecture:** The official upgrade tool does the mechanical work (dependencies, `@import "tailwindcss"`, config → CSS, renamed utilities); we then hand-port what it cannot (custom colors/radii/shadows into `@theme`, the `dark` variant, two custom utilities, base-layer rules) and prove "no visible change" with a computed-style snapshot diff taken before and after, not by eye.

**Tech Stack:** Tailwind v4 (`@tailwindcss/vite`), Vite 6, React 19, shadcn/ui (Radix), tw-animate-css, Vitest, pnpm.

**Spec:** the outline `docs/superpowers/plans/2026-10-10-tailwind-v4-migration-outline.md` (replaced by this plan) and the design spec `docs/superpowers/specs/2026-10-10-dust-card-and-air-quality-scales-design.md` (which depends on this migration for PR 3).

## Global Constraints

- No visible change: every computed-style difference between the before and after snapshots must be explained and either accepted (listed in the PR) or fixed.
- Browser floor with v4: Chrome 111+, Safari 16.4+, Firefox 128+ (accepted for a university dashboard).
- Dark mode stays class-based (`.dark` on `<html>`, set by `ThemeProvider`); light is `html:not(.dark)`.
- Keep the current radius scale: `rounded-lg` = `var(--radius)` (10px), `rounded-md` = `calc(var(--radius) - 2px)`, `rounded-sm` = `calc(var(--radius) - 4px)`, `rounded-card` 20px, `rounded-panel` 28px.
- Package manager pnpm; `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test`, `pnpm build` must pass after every task that touches code.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Default changes in v4: border color (`currentColor`), `ring` width (3px → 1px), shadow/rounded scale shifts (`shadow-sm` → `shadow-xs`, `rounded-sm` → `rounded-xs`): visible only in the snapshot diff, so the diff is the test.
- Custom color tokens with opacity modifiers (`bg-status-safe/10`, `border-status-warning/30`): must still resolve, because the config defined them as plain `var(--x)`.
- Overlays rendered in portals (dropdown, dialog, popover, tooltip) lose their background or animation if their theme tokens (`popover`, `accent`) are missing.
- Light and dark themes both, and the 375 px layout (the dashboard grid changes at breakpoints).
- ECharts and `backdrop-filter` surfaces: canvas is not in the diff, so check container sizes and the `backdrop-blur` classes explicitly.

## File Structure

```
scripts/style-snapshot/   capture.js (runs in the page), receiver.mjs (saves posted snapshots), diff.mjs (compares two folders), README.md
src/app/styles/globals.css, vite.config.ts, package.json, pnpm-lock.yaml
tailwind.config.ts, postcss.config.js            (removed)
src/components/ui/*.tsx                          (only if a v4 class needs a fix)
README.md, docs/PROJECT_REPORT.md                (wording)
```

---

### Task 1: Style-snapshot harness and the "before" baseline

**Files:** Create `scripts/style-snapshot/capture.js`, `receiver.mjs`, `diff.mjs`, `README.md`.

**Interfaces — Produces:** `node scripts/style-snapshot/receiver.mjs <outDir>` listens on `localhost:5199` and writes each `POST /snap/<name>` body to `<outDir>/<name>.json`; `capture.js` exports a function `captureStyles(): Record<string, Record<string, string>>` keyed by a stable DOM path; `node scripts/style-snapshot/diff.mjs <beforeDir> <afterDir>` prints, per snapshot, the number of changed elements and a count per changed CSS property, with the first 5 examples per property.

- [ ] **Step 1:** Write the three scripts. `capture.js` walks `document.body.querySelectorAll('*')` (skipping `script`, `style`, `canvas` children) and records, per element, `getComputedStyle` values for: `display, position, width, height, marginTop/Right/Bottom/Left, paddingTop/Right/Bottom/Left, gap, color, backgroundColor, backgroundImage, borderTopColor/RightColor/BottomColor/LeftColor, borderTopWidth, borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius, boxShadow, outlineColor, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, opacity, backdropFilter, zIndex`; key = `tag:nth-of-type` path from `body`. Width/height come from `getBoundingClientRect` rounded to 0.5 px.
- [ ] **Step 2: Self-test the harness (RED/GREEN for the tool).** Run the receiver, post the same snapshot twice, run `diff.mjs` on them — Expected: 0 changed elements. Then change one element's inline style in the page, post again, diff — Expected: exactly that element and property reported.
- [ ] **Step 3: Capture "before".** Start the local stack without the simulator and with fresh static data (`docker compose -f docker-compose.dev.yml up -d --build --wait`, then `exec api pnpm db:seed --force`), run `pnpm dev`, and capture on `main` (v3): for `room` and `street` × light and dark × widths 1440, 768, 375 (12 snapshots), plus on room at 1440 in both themes: the export dropdown open, the month dialog open, the date-range popover open, the language menu open (8 more). Wait 6 s per scenario for entrance animations; save to `.superpowers/style-snapshots/before/`.
- [ ] **Step 4:** Record the v3 production CSS size (`pnpm build`, size of `dist/assets/index-*.css`) in the ledger; commit the tooling `Add a computed-style snapshot tool for visual regression checks`.

### Task 2: Run the upgrade tool and switch to the Vite plugin

**Files:** Modify `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `src/app/styles/globals.css`, class names across `src/`; Delete `tailwind.config.ts` (after Task 3 ports it), `postcss.config.js`.

- [ ] **Step 1:** On a clean branch `chore/tailwind-v4` run `pnpm dlx @tailwindcss/upgrade` and read its report; do not accept its output blindly.
- [ ] **Step 2:** Replace the PostCSS integration with the Vite plugin: add `@tailwindcss/vite`, register it in `vite.config.ts` next to `react()`, remove `autoprefixer`/`postcss` dev dependencies and `postcss.config.js` if nothing else uses them.
- [ ] **Step 3:** Run `pnpm build` — Expected: it may fail on unported config; note every error in the ledger and continue to Task 3 without committing a broken tree. Commit together with Task 3.

### Task 3: Port the configuration into CSS

**Files:** Modify `src/app/styles/globals.css`.

- [ ] **Step 1:** In `globals.css`: `@import "tailwindcss";` first, keep `@import "tw-animate-css";`, `@import "shadcn/tailwind.css";` and the font import; add `@custom-variant dark (&:is(.dark *));` (class-based dark mode).
- [ ] **Step 2:** Add `@theme inline { … }` carrying every extension from the old `tailwind.config.ts`: colors `border, input, ring, background, foreground, primary(-foreground), secondary(-foreground), muted(-foreground), card(-foreground), destructive, popover(-foreground), accent(-foreground), sensor-{temp,hum,press,mq5,mq3}, status-{safe,warning,critical,info}` as `--color-*: var(--*)`; radii `--radius-lg: var(--radius)`, `--radius-md: calc(var(--radius) - 2px)`, `--radius-sm: calc(var(--radius) - 4px)`, `--radius-panel: 28px`, `--radius-card: 20px`; `--font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif`; shadows `--shadow-panel`, `--shadow-card`, `--shadow-glow` with the exact old values; `--blur-panel: 20px`.
- [ ] **Step 3:** Port the custom utilities with `@utility` (`dash-bg`, `text-primary-themed`, `text-secondary-themed`, `text-muted-themed`) and keep the base rules (`* { border-color }`, outline color, `body`, `html` font) in `@layer base`; v4's default border color is `currentColor`, so keep `* { @apply border-border; … }` exactly as now.
- [ ] **Step 4:** Delete `tailwind.config.ts`. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — Expected: all pass (169+ tests, 0 lint errors). Compare the CSS size with the v3 number from Task 1.
- [ ] **Step 5:** Commit `Migrate to Tailwind v4` (dependencies, upgrade-tool class renames, CSS config).

### Task 4: Make the shadcn components use v4 as designed

**Files:** Modify `src/components/ui/{dialog,dropdown-menu,popover,tooltip,radio-group,button}.tsx` only where needed.

- [ ] **Step 1:** Grep the compiled CSS (`dist/assets/index-*.css`) for the rules produced by `data-open:`, `data-closed:`, `data-checked:` and `radius-md`; Expected: present (in v3 they were absent).
- [ ] **Step 2:** For each overlay (dropdown, dialog, popover, tooltip) confirm in the browser that opening animates (fade/zoom) and closing animates; where a v4 class is still not taking effect, fix the class, not the tool.
- [ ] **Step 3:** Revert our v3 workarounds only if v4 makes them redundant and the snapshot stays identical: keep `rounded-md` in `button.tsx` (identical result) and `data-[state=checked]:` in `radio-group.tsx` (valid in v4 too).
- [ ] **Step 4:** Commit `Let the shadcn components use their Tailwind v4 variants`.

### Task 5: "After" snapshots and the diff

**Files:** none (produces the review table).

- [ ] **Step 1:** Capture the same 20 scenarios on the migrated branch (same data, same viewport sizes) into `.superpowers/style-snapshots/after/`.
- [ ] **Step 2:** Run `diff.mjs before after`. Classify every changed property: expected (e.g. dropdown/dialog now get their animation or radius) vs regression. Fix each regression in CSS/classes and re-capture only the affected scenarios until the only remaining differences are accepted ones.
- [ ] **Step 3:** Spot-check visually in the browser: Room and Street in both themes at 1440 and 375, the three overlays, the chart area (container sizes), and `backdrop-blur` surfaces; no console errors.
- [ ] **Step 4:** Commit any fixes `Fix visual regressions found by the style snapshot diff`.

### Task 6: Docs, checks and PR

**Files:** Modify `README.md`, `docs/PROJECT_REPORT.md`, delete the outline plan.

- [ ] **Step 1:** README: replace the "Tailwind here is v3" note with "Tailwind v4: config lives in `src/app/styles/globals.css` (`@theme`); no `tailwind.config.ts`"; note the browser floor. PROJECT_REPORT: section 5.9 and the tech-debt mentions of the v3/v4 mismatch become "resolved by migration (date)". Remove `2026-10-10-tailwind-v4-migration-outline.md`.
- [ ] **Step 2:** Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; Expected: all pass. Push the branch and give the PR link; list the accepted style differences in the PR description.
- [ ] **Step 3:** Commit `Document the Tailwind v4 setup`.

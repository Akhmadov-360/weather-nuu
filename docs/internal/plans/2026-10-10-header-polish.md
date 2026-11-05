# Header polish (visual authority, part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A header that does not re-mount when switching Room/Street, a one-click theme toggle with a circular reveal from the click point, a hover-open language menu with a sliding highlight, a proper mobile layout, and a logo served at the right size.

**Architecture:** The header moves into a shared router layout (`AppShell`) so only the title text changes between pages. The theme change runs inside `document.startViewTransition` with a CSS clip-path animation seeded by the click point (instant when the API is missing or motion is reduced). Pure decisions (next theme, reveal radius) live in small tested functions; components only wire them up.

**Tech Stack:** React 19, react-router 6, framer-motion 12 (already installed), Tailwind v4, View Transitions API, `vite-imagetools`, Vitest, Playwright for browser checks.

**Spec:** the design agreed in chat on 2026-10-10 (no written spec: bounded change). Scope is the header only; palette, cards and charts are later parts.

## Global Constraints

- No visual change outside the header and its controls.
- Respect `prefers-reduced-motion`: no wave, no arrow/underline animations, instant changes.
- Theme default stays "system"; the first click stores an explicit `light`/`dark` and flips to the opposite of what is shown.
- Keyboard and screen readers: every control keeps a visible focus ring and an accurate `aria-label`; the language menu opens by click/Enter/Space too, and Escape closes it.
- All new texts in ru, uz and en (parity test enforces it).
- `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test`, `pnpm build` pass after every task. Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Theme toggle while the OS is in the opposite scheme to the stored mode, and `system` mode with the OS switching live: the click must flip what is *shown* (test: `nextTheme`).
- View Transitions unsupported or reduced motion: theme still changes, no thrown error, no stuck `::view-transition` overlay.
- Rapid double click on the theme button: the second click must not start a transition on top of a running one.
- Language menu: pointer leaves the trigger toward the content (grace period), touch tap, keyboard; focus returns to the trigger on close.
- Navigating Room → Street → browser Back: title and `document.title`-independent state stay correct, header DOM node is the same element.
- Mobile 375 px: no horizontal scroll, controls reachable (44 px targets), long Uzbek/Russian titles do not clip.

## File Structure

```
src/shared/lib/theme/reveal.ts (+test)            nextTheme(), revealRadius()
src/app/providers/theme/ThemeProvider.tsx         toggleTheme(origin), view transition
src/app/styles/globals.css                        ::view-transition rules
src/widgets/topbar/ui/TopBar.tsx                  compact/mobile layout, uses route titles
src/widgets/topbar/ui/ThemeToggle.tsx             new: one-button toggle
src/widgets/topbar/ui/SwapArrows.tsx              new: animated two-arrow icon
src/widgets/language-switcher/ui/LanguageSwitcher.tsx   hover menu + sliding highlight
src/app/providers/router/router.tsx + AppShell.tsx      shared layout with the header
src/widgets/dashboard-layout/ui/DashboardLayout.tsx     header removed from the page
src/components/Logo.tsx, vite.config.ts, src/vite-env.d.ts   responsive logo
src/assets/locales/{ru,uz,en}/common.json
```

---

### Task 1: Theme decision helpers

**Files:** Create `src/shared/lib/theme/reveal.ts`, `reveal.test.ts`.

**Interfaces — Produces:**
`nextTheme(resolved: 'light' | 'dark'): 'light' | 'dark'` — the opposite of what is shown.
`revealRadius(x: number, y: number, width: number, height: number): number` — distance from the point to the farthest viewport corner (the circle that covers the page).

- [ ] **Step 1:** Write tests: `nextTheme('dark') === 'light'` and the reverse; `revealRadius(0,0,300,400) === 500`; `revealRadius(150,200,300,400) === 250`; a point at the bottom-right corner reaches the top-left (`revealRadius(300,400,300,400) === 500`); a point outside the viewport still returns the distance to the farthest corner.
- [ ] **Step 2:** Run `pnpm vitest run src/shared/lib/theme` — Expected: FAIL (module missing).
- [ ] **Step 3:** Implement both functions (`Math.hypot` of the larger horizontal and vertical distances).
- [ ] **Step 4:** Tests pass; commit `Add theme decision helpers`.

### Task 2: One-button theme toggle with a circular reveal

**Files:** Modify `ThemeProvider.tsx`, `globals.css`, locale files; Create `src/widgets/topbar/ui/ThemeToggle.tsx`; Modify `TopBar.tsx` (use it).

**Interfaces — Consumes:** `nextTheme`, `revealRadius`. **Produces:** `useTheme().toggle(origin?: { x: number; y: number }): void` replacing the three-way menu in the UI (`setMode` stays for storage restore).

- [ ] **Step 1:** `ThemeProvider.toggle`: next = `nextTheme(resolvedTheme)`; if `document.startViewTransition` exists, reduced motion is off and no transition is running, set CSS variables `--reveal-x`, `--reveal-y`, `--reveal-r` on `<html>` and call `startViewTransition(() => { apply class; flushSync(setMode(next)) })`, clearing the running flag on `finished`; otherwise apply directly.
- [ ] **Step 2:** `globals.css`: disable the default root cross-fade (`::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal }`), keep new above old, and animate `::view-transition-new(root)` with `clip-path: circle(0 at var(--reveal-x) var(--reveal-y))` → `circle(var(--reveal-r) at …)` in 600 ms `cubic-bezier(0.22, 1, 0.36, 1)`.
- [ ] **Step 3:** `ThemeToggle.tsx`: a single ghost icon button (sun when dark is shown and vice versa shows the target), icon turns on change, `aria-label` = `theme_switch_to_dark` / `theme_switch_to_light`; click passes the pointer position. Add those keys in ru/uz/en and remove `theme_light`, `theme_dark`, `theme_system`, `theme_toggle_label` if no longer used.
- [ ] **Step 4:** `pnpm typecheck && pnpm lint && pnpm test`; browser check: toggle both ways, wave starts at the click, instant when `matchMedia('(prefers-reduced-motion: reduce)')` is emulated; commit `Make the theme toggle a single button with a circular reveal`.

### Task 3: Persistent header via a shared layout

**Files:** Create `src/app/providers/router/AppShell.tsx`, `src/widgets/topbar/ui/SwapArrows.tsx`; Modify `router.tsx`, `TopBar.tsx`, `DashboardLayout.tsx`.

**Interfaces — Produces:** `AppShell(): JSX.Element` renders `<TopBar …/>` (config chosen from the current path: room/street) and `<Outlet/>`; `TopBar` props unchanged (`titleKey`, `switchPath`, `switchLabelKey`).

- [ ] **Step 1:** Route table becomes one layout route (`element: <AppShell/>`) with children room, street and `*`; `AppShell` resolves the page config from `useLocation()` (`ROOM_CONFIG`/`STREET_CONFIG`, nothing for NotFound → no top bar).
- [ ] **Step 2:** Remove `<TopBar>` from `DashboardLayout`; the page keeps its own grid below. The title uses `AnimatePresence mode="wait"` keyed by `titleKey` (short fade/slide); the header's own mount animation runs only once.
- [ ] **Step 3:** `SwapArrows`: two arrows (right on top, left below) that move apart and back when the link is clicked (framer-motion `animate` on a `key` bump), static when reduced motion; used inside `SwitchSectionLink`.
- [ ] **Step 4:** Browser check (Playwright): evaluate the header element handle before and after navigating Room → Street; they must be the same node; Back works; commit `Keep the header mounted across pages and animate the section switch`.

### Task 4: Language menu on hover with a sliding highlight

**Files:** Modify `LanguageSwitcher.tsx`.

- [ ] **Step 1:** Keep Radix `DropdownMenu` but make it controlled: open on pointer enter of trigger or content (fine pointers only), close 120 ms after both are left, toggle on click, Escape closes, focus returns to the trigger.
- [ ] **Step 2:** Sliding highlight: a single `motion.span` with `layoutId="lang-highlight"` rendered inside the currently hovered/focused item (spring, no flash between items); active language keeps the check mark.
- [ ] **Step 3:** Browser check: hover opens, moving between items glides the highlight, leaving closes, keyboard Arrow/Enter/Escape work, touch tap (emulated `hasTouch`) opens and selects; commit `Open the language menu on hover with a gliding highlight`.

### Task 5: Mobile header

**Files:** Modify `TopBar.tsx`, locale files.

- [ ] **Step 1:** Below 640 px: top row logo + full title (wraps to two lines), second row the section switch (flex-1) plus theme and language icon buttons, all targets at least 40×40 px; the sticky bar shows logo, short title and icon buttons. Add `title_short_room` / `title_short_street` ("Аудитория"/"Улица" and uz/en) used only by the sticky bar.
- [ ] **Step 2:** Browser check at 375 px light and dark: no horizontal scroll, no clipping in ru/uz/en; commit `Lay out the header for phones`.

### Task 6: Responsive logo

**Files:** Modify `package.json`, `vite.config.ts`, `src/vite-env.d.ts` (or `vite-imagetools` client types), `src/components/Logo.tsx`.

- [ ] **Step 1:** Add `vite-imagetools` (dev), register it. In `Logo.tsx` import `...png?w=64;96;128&format=webp&as=srcset` and a `?w=64&format=png` fallback; render `<picture>` with width/height attributes and the existing hover scale.
- [ ] **Step 2:** `pnpm build`; Expected: three small WebP files plus a PNG fallback in `dist/assets`, the original 373 KB PNG no longer shipped for the header; Playwright confirms the logo request is the small file at 1x and a larger one at 2x (emulated `deviceScaleFactor`). Commit `Serve the logo at the size it is shown`.

### Task 7: Final checks and report

- [ ] **Step 1:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; measure the entry and layout chunk sizes against the numbers before this branch and note them; check the console for errors at 1440/768/375.
- [ ] **Step 2:** Push the branch, give the PR link, list what could only be judged by eye (wave feel, highlight spring).

# Value cards: humidity, pressure, temperature (visual authority, part 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three value cards (humidity, pressure, temperature) with the chosen designs: a water-level humidity card whose scale labels sit at the level they mark, an isobar pressure card whose rings and motion encode the data, and a thermometer temperature card with an atmosphere background (snow, heat shimmer, calm).

**Architecture:** Pure functions decide everything that carries data (pressure tendency from history, isobar ring geometry, the atmosphere kind and the temperature tint); components only draw it. Water levels and scale labels share one CSS formula so they cannot drift apart. Motion respects `prefers-reduced-motion` and pauses on hidden tabs.

**Tech Stack:** React 19, Tailwind v4, CSS animations and SVG, a small 2D canvas for particles (no particle library), framer-motion (already installed), Vitest, headless Edge for screenshots.

**Spec:** the option page agreed in chat on 2026-10-11 (H1 refined, P2 refined, T1 + T3) and the `dataviz` skill rules: direct labels at the mark, no legend for a single series, thin marks, text in text colours, hover titles on marks.

## Global Constraints

- Humidity: the water surface, the scale ticks (0, 30, 60, 100) and the level flag use one inset formula; the flag shows the value ("41,0 %") at the level; the norm band 30–60 is shaded and named; no list legend.
- Pressure: rings are isobars every 10 hPa between 940 and 1040, higher pressure nearer the centre; the ring of the current value is emphasised and carries its number, a dashed ring marks the value 3 hours ago; ripples run outward when the pressure rises and inward when it falls, faster for bigger changes, and stop when steady. Tendency thresholds: |Δ3h| under 1 hPa steady, 1–3 slowly, 3–6 plain, 6 and above rapidly.
- Temperature: thermometer scale −20…40 °C with the day's minimum and maximum on it; atmosphere only on Street (snow at 2 °C and below, heat shimmer from 29 °C); Room gets only calm dust motes (snow indoors would be wrong); particle count at most 46, device pixel ratio capped at 2.
- Phones: nothing overflows at 320–375 px, text at least 12 px, the card heights are minimums (content may grow), no hover-only information.
- Big numerals use proportional figures (`dataviz`: tabular only in columns); status stays a dot and text.
- All new texts in ru, uz and en. `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test`, `pnpm build` pass after every task. Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Humidity at 0 %, 100 %, and values next to a tick (29, 31, 59, 61): flag, tick labels and water must not collide or leave the card.
- Pressure outside 940–1040 (930, 1050) and exactly on a ring (960): the current ring clamps and still reads; empty or short history gives no tendency, not NaN.
- Temperature at −20, 0, 2, 2.1, 28.9, 29, 40 and above 40 / below −20 (mercury clamps); Street versus Room atmosphere; reduced motion and a hidden tab stop the canvas.
- Tint behind the temperature text stays readable at every temperature in both themes (test).
- Light and dark theme, 320 / 375 / 768 / 1440 px.

## File Structure

```
src/entities/weather/model/pressure-tendency.ts (+test)    pressureTendency()
src/widgets/weather-summary/model/isobars.ts (+test)       isobarRings()
src/widgets/weather-summary/model/atmosphere.ts (+test)    atmosphereFor(), temperatureTint()
src/widgets/weather-summary/ui/{HumidityCard,PressureCard,TemperatureCard,AtmosphereCanvas}.tsx
src/widgets/weather-summary/ui/{MetricCard,TempHeroCard}.tsx   removed
src/widgets/dashboard-layout/ui/{DashboardLayout,WeatherSummarySkeleton}.tsx
src/app/styles/globals.css                                 water, ripple keyframes
src/app/styles/temperature-tint.test.ts                    contrast of the tint
src/assets/locales/{ru,uz,en}/common.json
docs/PROJECT_REPORT.md
```

---

### Task 1: Pressure tendency (pure, tested)

**Interfaces — Produces:** `type TendencyKind = 'steady' | 'rising_slow' | 'rising' | 'rising_fast' | 'falling_slow' | 'falling' | 'falling_fast'`; `pressureTendency(history: WeatherHistoryItem[], nowMs: number): { delta: number; kind: TendencyKind } | null` — change between the mean of the readings in the last 15 minutes and the mean of those in the 15 minutes ending 3 hours ago; `null` when either window has fewer than 10 readings.

- [ ] **Step 1:** Tests with synthetic history: steady (Δ 0.4), +1.5 → `rising_slow`, +4 → `rising`, +7 → `rising_fast`, the same negative, boundaries 0.99 / 1.0 / 2.99 / 3.0 / 5.99 / 6.0, a window with 9 readings → `null`, empty history → `null`, readings with unparsable dates ignored.
- [ ] **Step 2:** Run — FAIL; **Step 3:** implement; **Step 4:** pass; commit `Add the pressure tendency calculation`.

### Task 2: Isobar geometry (pure, tested)

**Interfaces — Produces:** `isobarRings(pressure: number, delta: number | null): { rings: { level: number; r: number; labelled: boolean }[]; current: { level: number; r: number; clamped: boolean }; previous: { level: number; r: number } | null }` with `r` between 36 and 150 (units of a 340-wide viewBox), `r(level) = 150 − (level − 940)/100 × 114`, rings every 10 hPa from 940 to 1040, `labelled` every 20 hPa; `current.level` is the pressure clamped to 940–1040 (`clamped` says so); `previous` is the value 3 h ago (pressure − delta) clamped, `null` without delta.

- [ ] **Step 1–4:** test 940 → r 150, 1040 → r 36, 960 → 127.2, 930 clamps with `clamped: true`, `delta` null → `previous` null, delta 4 at 962 → previous level 958; implement; commit `Add the isobar ring geometry`.

### Task 3: Atmosphere kind and temperature tint (pure, tested) + contrast test

**Interfaces — Produces:** `atmosphereFor(temp: number, source: 'room' | 'street'): 'snow' | 'heat' | 'calm'` (Room is always `calm`; Street `snow` at 2 and below, `heat` at 29 and above); `temperatureTint(temp: number, theme: 'light' | 'dark'): { from: string; to: string }` — hex colours for a gradient behind the upper part of the card, hue moving from icy blue (below 5) through slate and warm paper to amber (above 27), light colours for the light theme and dark colours for the dark theme.

- [ ] **Step 1:** Tests for the thresholds (1.9/2/2.1, 28.9/29/29.1, Room never snow or heat); the tint returns valid hex, differs between −10 and 35, and the light tints are lighter than the dark ones.
- [ ] **Step 2:** `temperature-tint.test.ts`: for temperatures −25…45 step 5 and both themes, the tint stops keep `--text-primary` and `--text-secondary` of that theme at 4.5:1 or better (tokens read from `globals.css`).
- [ ] **Step 3:** FAIL → implement → pass (tune lightness if a contrast case fails); commit `Add the atmosphere kind and the temperature tint`.

### Task 4: HumidityCard

**Interfaces — Consumes:** `getSensorStatus`, `StatusText`. **Produces:** `HumidityCard({ value: number | null | undefined }): JSX.Element`.

- [ ] **Step 1:** Locale keys (ru/uz/en): `hum_zone_dry`, `hum_zone_ok`, `hum_zone_humid`, `hum_norm_band` ("норма 30–60 %"), `hum_level_flag` ("Влажность {{value}} %" for the tooltip).
- [ ] **Step 2:** Implement per the constraints: CSS custom properties `--inset` (18 px) and `--pct` (0–1) drive `height` of the water and the `bottom` of ticks, band and flag with `calc(var(--inset) + var(--pct) * (100% - 2 * var(--inset)))`; two wave layers in a seamless double-width SVG (keyframes in `globals.css`, off under reduced motion), tick labels right-aligned in a 28 px column, the flag left of it with a leader across the surface, band shaded with the word "норма" beside it; text block (label, value in proportional figures, status) top-left; no value state shows an empty tank and "—".
- [ ] **Step 3:** checks; commit `Add the humidity card with a water level and aligned scale`.

### Task 5: PressureCard

**Interfaces — Consumes:** `pressureTendency`, `isobarRings`. **Produces:** `PressureCard({ value, history }): JSX.Element`.

- [ ] **Step 1:** Locale keys: `press_trend_<kind>` (seven), `press_delta_3h` ("{{sign}}{{value}} гПа за 3 часа"), `press_iso_caption` ("линии через 10 гПа; пунктир — 3 часа назад"), `press_norm` ("норма 940–1040 гПа").
- [ ] **Step 2:** Implement: blob-shaped rings (seeded noise, stable between renders) in an SVG sized by `viewBox` and positioned at the right and behind the text; current ring emphasised and numbered, labelled rings numbered every 20 hPa, dashed previous ring, a station dot on the current ring; three ripple rings with CSS animation direction and speed from the tendency (none when steady or unknown or reduced motion); big value with unit, tendency as an arrow icon plus text, 3-hour change, caption; hover titles on rings.
- [ ] **Step 3:** checks; commit `Add the pressure card with data-driven isobars`.

### Task 6: TemperatureCard with atmosphere

**Interfaces — Consumes:** `atmosphereFor`, `temperatureTint`, `getSensorStatus`, `getTempDeltaFromNorm`, `useTheme`. **Produces:** `TemperatureCard({ source, temp, history }): JSX.Element`, `AtmosphereCanvas({ kind }): JSX.Element`.

- [ ] **Step 1:** Locale keys: `temp_minmax_day` ("за сутки"), `temp_min`, `temp_max` (tooltip texts) if missing.
- [ ] **Step 2:** Implement the thermometer (SVG tube, ticks −20…40 every 10, mercury and bulb in the temperature colour, soft bulb glow, min and max markers from the last 1000 readings, clamped), the tinted background, the word and status as before; `AtmosphereCanvas`: snow, heat shimmer or calm motes drawn on a 2D canvas, `pointer-events-none`, particle count scaled to area and capped at 46, DPR capped at 2, one `requestAnimationFrame` loop that stops when `prefers-reduced-motion` is set or the tab is hidden and is cancelled on unmount.
- [ ] **Step 3:** checks; commit `Add the temperature card with a thermometer and atmosphere`.

### Task 7: Layout, cleanup, verification

- [ ] **Step 1:** Replace `MetricCard`/`TempHeroCard` in `DashboardLayout` (humidity and pressure take the two wide cells of row 1, temperature the narrow cell of row 2), update the skeleton, delete `MetricCard.tsx`, `TempHeroCard.tsx` and sensor-format helpers that nothing uses any more, remove locale keys that became unused (`indoor_*`, `range_hum_*` zone lines and so on only if truly unused).
- [ ] **Step 2:** Headless Edge screenshots (dev server, local backend, `?time=` not needed): Room and Street, both themes, 1440 / 768 / 375 / 320 px, with temperature extremes on Street through the simulator values or a dev query parameter if needed; console clean; check the card heights of the first row and that nothing overflows horizontally.
- [ ] **Step 3:** One paragraph in `docs/PROJECT_REPORT.md`; push; give the PR link; list what only the eye can judge.

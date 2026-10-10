# Dust card and gas strip UI (PR 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show real PM2.5/PM10 dust on the Room dashboard (card with 10-minute mean, AQI, category, 24 h line), an explicit "sensor not installed" state on Street, a compact gas strip, and dust tabs in the charts for Room only.

**Architecture:** All decisions live in small pure functions with tests (`dust-card` view-model in `entities`, zone stops and chart thresholds in `shared/lib/air-quality`); components only render the model. Colours come from `--aqi-<id>` / `--aqi-<id>-text` CSS tokens per theme, with a test that every category has both tokens and that text contrast is at least 4.5:1.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (PR 2, branch `chore/tailwind-v4`), shadcn Slider, ECharts, i18next, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-10-dust-card-and-air-quality-scales-design.md` (sections 4 colours, 6 UI, 7 texts, 8 tests). The logic layer (PR 1) is already in this branch's history.

## Global Constraints

- Branch `feature/dust-card-ui` is cut from `chore/tailwind-v4`; PR 3 targets `main` after PR 2 merges.
- `src/shared/lib/air-quality/**` stays pure (no React, i18n, entities imports); the ESLint guard must stay green.
- Every new i18n key exists in ru, uz and en (`locales.test.ts` enforces parity).
- Street never shows a number, bar or badge for dust: only "Датчик не установлен".
- Category is always shown as text plus the AQI number; colour is never the only signal.
- `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test`, `pnpm build` pass after every task.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Street page: no dust query fires, no number appears, state text is "Датчик не установлен" (model test `street → no_sensor`).
- Room before the first dust reading ever arrived (`pm25` all `null` in history): "Нет показаний пыли", never `0`.
- Room with fewer than 60 points in 10 minutes (device restart): no_data, not a mean of a few points (reuses `recentMean`).
- 24 h query loading, failing or covering under 75%: only the "за 24 ч" line degrades, the 10-minute block stays (model test).
- Active chart tab is a dust tab and the user navigates Room → Street: the tab must reset to a sensor Street has (component guard, checked in the browser).
- Light theme: category text colours readable on the light glass surface (contrast test on tokens, checked visually).

## File Structure

```
src/shared/lib/air-quality/zones.ts (+test)         zoneStops(), chartThresholds()
src/entities/weather/model/dust-card.ts (+test)     buildDustCardModel()
src/app/styles/globals.css                          --aqi-* tokens (+ test src/app/styles/aqi-tokens.test.ts)
src/widgets/weather-summary/ui/AirQualityCard.tsx   new
src/widgets/weather-summary/ui/GasStrip.tsx         new
src/widgets/weather-summary/ui/MetricCard.tsx       hum/press only
src/widgets/dashboard-layout/ui/DashboardLayout.tsx, WeatherSummarySkeleton.tsx
src/features/chart-selector/ui/ChartSelector.tsx    sensors prop
src/widgets/sensor-charts/ui/SensorCharts.tsx       dust thresholds, sensor list, tab guard
src/entities/weather/api/weather.queries.ts         refetchInterval
src/entities/weather/model/weather.constants.ts     remove SENSOR_ORDER
src/assets/locales/{ru,uz,en}/common.json
docs/PROJECT_REPORT.md
```

---

### Task 1: Chart thresholds and zone stops from the standard

**Files:** Create `src/shared/lib/air-quality/zones.ts`, `zones.test.ts`; Modify `index.ts`.

**Interfaces — Produces:**
`zoneStops(standard: Standard, pollutant: Pollutant, max: number): { category: CategoryId; fromPct: number; toPct: number }[]` — each category's share of a bar scaled 0..`max`, rows starting at or above `max` dropped, the last kept row clipped to 100.
`chartThresholds(standard: Standard, pollutant: Pollutant): { value: number; category: CategoryId }[]` — the `cHigh` of every row except the last, i.e. the boundaries between categories (PM2.5: 9, 35.4, 55.4, 125.4, 225.4; PM10: 54, 154, 254, 354, 424).

- [ ] **Step 1:** Write tests: PM2.5 `zoneStops(US_EPA_2024,'pm25',150)` gives (good 0–6 %, moderate 6–23.6 %, unhealthy_sensitive 23.6–37 %, unhealthy 37–83.6 %, very_unhealthy 83.6–100 %): assert 5 stops, first `fromPct 0`, last `toPct 100`, stops contiguous (`stops[i].fromPct === stops[i-1].toPct`); `chartThresholds` PM2.5 equals the five values above and PM10 the five values above; `chartThresholds(...,'pm10')[0].category === 'good'`.
- [ ] **Step 2:** Run `pnpm vitest run src/shared/lib/air-quality/zones.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3:** Implement both functions; export from `index.ts`.
- [ ] **Step 4:** Run the same test — Expected: PASS; run `pnpm lint` (guard stays green).
- [ ] **Step 5:** Commit `Add zone stops and chart thresholds derived from the standard`.

### Task 2: AQI colour tokens with a contrast test

**Files:** Modify `src/app/styles/globals.css`; Create `src/app/styles/aqi-tokens.test.ts`.

- [ ] **Step 1:** Write the test: read `globals.css`, extract the two marked blocks (`/* AQI:dark */ .dark { … }` and `/* AQI:light */ html:not(.dark) { … }`); for each of the six `CategoryId`s assert both `--aqi-<id>` and `--aqi-<id>-text` exist as `#rrggbb` in both blocks; assert contrast of every `-text` token against the theme base (dark `#0f172a`, light `#ffffff`) is at least 4.5 using the WCAG relative-luminance formula.
- [ ] **Step 2:** Run `pnpm vitest run src/app/styles/aqi-tokens.test.ts` — Expected: FAIL (blocks missing).
- [ ] **Step 3:** Add the blocks. Dark fill/text: good `#22c55e/#4ade80`, moderate `#eab308/#facc15`, unhealthy_sensitive `#f97316/#fb923c`, unhealthy `#ef4444/#f87171`, very_unhealthy `#a855f7/#c084fc`, hazardous `#be123c/#fda4af`. Light fill/text: good `#22c55e/#15803d`, moderate `#eab308/#a16207`, unhealthy_sensitive `#f97316/#c2410c`, unhealthy `#ef4444/#b91c1c`, very_unhealthy `#a855f7/#7e22ce`, hazardous `#9f1239/#7f1d1d`. Adjust any text value that fails 4.5:1.
- [ ] **Step 4:** Test passes; commit `Add AQI category colour tokens for both themes`.

### Task 3: Dust card view-model

**Files:** Create `src/entities/weather/model/dust-card.ts`, `dust-card.test.ts`.

**Interfaces — Consumes:** `recentMean`, `hasEnoughDayCoverage` (`dust.ts`); `aqi`, `categorize`, `getStandard`, `DEFAULT_STANDARD_ID` (air-quality); `SENSORS_BY_SOURCE`, `WeatherHistoryItem`.
**Produces:**
```ts
type DustReading = { mean: number; aqi: number | null; category: CategoryId | null };
type DustCardModel =
  | { kind: 'no_sensor' }
  | { kind: 'no_data'; lastSeen: string | null }
  | { kind: 'ready'; pm25: DustReading; pm10: DustReading | null; day: DustReading | null; windowPoints: number };
buildDustCardModel(input: {
  source: 'room' | 'street'; history: WeatherHistoryItem[];
  dayMean: { mean: number; coverage: number } | null | undefined; nowMs?: number;
}): DustCardModel
```
`day` is `null` when `dayMean` is null/undefined or coverage below 0.75; `pm10` is `null` when its 10-minute window has too few points; `lastSeen` is the `date` of the newest history item with a numeric `pm25`.

- [ ] **Step 1:** Write tests (fixed `nowMs`, helper that builds N points one per 5 s): street → `no_sensor` even with dust values in history; room with 59 points → `no_data` and `lastSeen` equal to the newest dust point date; room with all `pm25` null → `no_data` with `lastSeen null`; room with 60 points of 12.5 → `ready`, `pm25.mean 12.5`, `aqi 52`, category `moderate`; `pm10` null when only pm25 has points; `dayMean {mean: 8, coverage: 0.74}` → `day null`, coverage 0.75 → `day.category 'good'`; `dayMean undefined` → `day null` and `kind` still `ready`.
- [ ] **Step 2:** Run `pnpm vitest run src/entities/weather/model/dust-card.test.ts` — Expected: FAIL.
- [ ] **Step 3:** Implement `buildDustCardModel` composing the existing functions with `getStandard(DEFAULT_STANDARD_ID)`.
- [ ] **Step 4:** Tests pass, then the full suite; commit `Add the dust card view-model`.

### Task 4: AirQualityCard, locale keys and refetch interval

**Files:** Create `src/widgets/weather-summary/ui/AirQualityCard.tsx`; Modify `weather.queries.ts` (add `refetchInterval: 5 * 60_000` to `useDustDayMeanQuery`), the three locale files.

**Interfaces — Consumes:** `buildDustCardModel`, `zoneStops`, `categoryCssVar`, `categoryTextCssVar`, `WHO_2021_GUIDELINES`, `AnimateNumber`, `StatusBadge`, shadcn `Slider`. **Produces:** `AirQualityCard({ source, history, dayMean }): JSX.Element`.

- [ ] **Step 1:** Add keys to ru/uz/en (all three): `lbl_pm25_title` (card title "Качество воздуха · PM2.5"), `dust_no_sensor` ("Датчик не установлен"), `dust_no_sensor_hint` ("На этой станции нет датчика пыли"), `dust_no_data` ("Нет показаний пыли"), `dust_no_data_since` ("Последние показания: {{time}}"), `dust_avg_10m` ("среднее за 10 мин"), `dust_avg_24h` ("за 24 ч"), `dust_insufficient_24h` ("за 24 ч: недостаточно данных"), `dust_who_guideline` ("Ориентир ВОЗ: до {{value}} за сутки"), `aqi_label` ("AQI"), `unit_ugm3` ("мкг/м³"), `dust_pm10_line` ("PM10"). Run `pnpm vitest run src/assets/locales` — Expected: parity test passes.
- [ ] **Step 2:** Implement the card for the four states of the spec table: `ready` shows the PM2.5 mean large (`AnimateNumber`, 1 decimal) with unit, "AQI N" and a category badge coloured from the `--aqi-*` tokens, a Slider-based zone bar 0–150 built from `zoneStops` (marker clamped to 150), a small PM10 line (value, unit, category), the "за 24 ч" line (value + category, or `dust_insufficient_24h`), caption `dust_avg_10m` and the WHO guideline; `no_sensor` and `no_data` render only title and text, no bar or badge. Same card chrome as `MetricCard` (rounded-card, glass surface, shadow-card).
- [ ] **Step 3:** Run `pnpm typecheck && pnpm lint`; commit `Add the air quality card with dust states and texts`.

### Task 5: GasStrip, dashboard layout and MetricCard cleanup

**Files:** Create `GasStrip.tsx`; Modify `DashboardLayout.tsx`, `WeatherSummarySkeleton.tsx`, `MetricCard.tsx`, locale files.

- [ ] **Step 1:** Add keys (all three languages): `gas_estimate_lpg` ("оценка, эквивалент LPG"), `gas_estimate` ("оценка"). `GasStrip({ mq5, mq3 })` renders two equal-height tiles: "Горючий газ · MQ-5" with value in ppm, badge from `getSensorStatus('mq5')` and the LPG note; "Пары спирта · MQ-3" with value, badge `status_reference` and the estimate note; no bar, no legend.
- [ ] **Step 2:** `MetricCard` supports `hum` and `press` only (drop the mq icons and types). `DashboardLayout` (lg: three columns): row 1 time, humidity, pressure; row 2 temperature + `AirQualityCard` spanning two columns; row 3 `GasStrip` spanning three. Call `useDustDayMeanQuery(config.key)` and pass `data` as `dayMean`; tablet/phone: single/two columns with the card full width. Update `WeatherSummarySkeleton` to the same grid.
- [ ] **Step 3:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; commit `Rearrange the dashboard: air quality card and gas strip`.

### Task 6: Charts — dust tabs for Room only and dust threshold lines

**Files:** Modify `ChartSelector.tsx`, `SensorCharts.tsx`, `weather.constants.ts`.

- [ ] **Step 1:** `ChartSelector` takes `sensors: SensorType[]` instead of reading `SENSOR_ORDER`; remove `SENSOR_ORDER` from constants. `SensorCharts` passes `SENSORS_BY_SOURCE[type]`, resets `activeSensor` to `temp` when it is not in that list, and `buildThresholdLines` for `pm25`/`pm10` maps `chartThresholds(getStandard(DEFAULT_STANDARD_ID), sensor)` to the same dashed lines as the scale sensors. Replace the hardcoded `"мкг/м³"` unit by `t('unit_ugm3')`.
- [ ] **Step 2:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; commit `Offer dust charts for Room and draw category thresholds`.

### Task 7: Documentation and browser verification

**Files:** Modify `docs/PROJECT_REPORT.md` (section 11.3 status table, stage table row 3).

- [ ] **Step 1:** Update the report: stage 3 "выполнено" for the frontend card, describe states and tokens briefly; remove the "after Tailwind migration" wording.
- [ ] **Step 2:** With the local stack running (`weather-backend`, `docker compose -f docker-compose.dev.yml up -d --wait` and seed), open Room and Street in the browser pane; verify: all four card states (no_sensor on Street; ready with seed data; no_data by loading with the dust field emptied via a request override; insufficient 24 h), both themes, widths 1440/768/375, chart tabs (PM2.5/PM10 on Room only, tab reset on Street), console without errors. Save screenshots under `docs/screenshots/pr3/` only if requested by the user; otherwise describe the findings in the PR text.
- [ ] **Step 3:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; commit `Document the dust card UI`; push the branch and report the PR link.

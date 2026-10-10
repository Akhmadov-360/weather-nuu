# Air-quality logic (PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land everything under the dust card that is not CSS or layout: a pure, data-driven air-quality scale module, dust fields through the data layer, honest sensor names and statuses, and the 10-minute / 24-hour means.

**Architecture:** `shared/lib/air-quality/` holds standards as data (US EPA 2024 now, regional later) plus generic `categorize`/`aqi`. `entities/weather` gains `pm25`/`pm10` (nullable) end to end, pure mean helpers in `dust.ts`, and statuses that delegate to the scale module. No new visible card yet: the only user-visible change is honest MQ-5 / MQ-3 wording and a neutral MQ-3 scale.

**Tech Stack:** React 19, TypeScript, Vite, Vitest (`pnpm test`), ESLint, i18next (ru/uz/en), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-10-dust-card-and-air-quality-scales-design.md` (sections 4, 5 and the status/ranges part of 6; sections 6 UI, CSS tokens and chart tabs belong to PR 3 after the Tailwind v4 migration).

## Spec amendments (applied in Task 8)

1. `recentMean` ends its window at `now` (a parameter, default `Date.now()`), not at the last point, so a silent device yields "no reading" instead of stale numbers.
2. The 24 h query uses the bucket `getWeatherAggregate` already requests (`auto`), not `bucket=1h`; `dayMeanFromAggregate` is bucket-agnostic.
3. The ESLint import guard is scoped to `src/shared/lib/air-quality/**`: five existing files in `src/shared/` import from `entities`/`app` and stay as recorded debt.

## Global Constraints

- Dust field names: `pm25`, `pm10` (API and DB names); `null` means "no reading", never `0`.
- US EPA 2024, 24 h, µg/m³ (AQI): PM2.5 good 0.0–9.0 (0–50), moderate 9.1–35.4 (51–100), unhealthy_sensitive 35.5–55.4 (101–150), unhealthy 55.5–125.4 (151–200), very_unhealthy 125.5–225.4 (201–300), hazardous 225.5–325.4 (301–500). PM10: 0–54, 55–154, 155–254, 255–354, 355–424 (same AQI bands), hazardous 425–604 (301–500). Values above the last row cap at AQI 500.
- Concentration is **truncated** (floor), not rounded: PM2.5 to 1 decimal, PM10 to integer. AQI result is rounded to an integer.
- Category ids: `good | moderate | unhealthy_sensitive | unhealthy | very_unhealthy | hazardous`. Tones: good → `good`; moderate, unhealthy_sensitive → `warn`; unhealthy, very_unhealthy, hazardous → `bad`.
- Means: `DUST_WINDOW_MS = 600_000`, `MIN_POINTS_10M = 60`, `EXPECTED_DAY_POINTS = 17_280`, `MIN_DAY_COVERAGE = 0.75`.
- `shared/lib/air-quality/` imports nothing from `entities`, `features`, `widgets`, `pages`, `app`, React or i18next.
- Every new locale key exists in ru, uz and en. No sensor label may claim CO₂, PM2.5 or aerosol for MQ-5 / MQ-3.
- Every task ends green on `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Float truncation at exact breakpoints (`35.4`, `0.3`, `125.4`): property loop over every 0.1 step. (Task 2)
- Device stopped 20 minutes ago but older points exist: `recentMean` must return `null`. (Task 6)
- Window with 60+ rows but half of them `null` (failed PMS reads): below `MIN_POINTS_10M`, returns `null`. (Task 6)
- Old backend or payload without dust fields: mapper yields `null`, 24 h aggregate without `pm25` yields `null`, nothing throws. (Tasks 5, 6)
- Locale drift: a key present in one language only, or old CO₂/aerosol wording left in MQ labels. (Task 7)

## File Structure

```
src/shared/lib/air-quality/   types.ts, standards/us-epa-2024.ts, guidelines.ts, registry.ts, calc.ts, colors.ts, index.ts (+ *.test.ts)
src/entities/weather/model/   weather.types.ts, weather.mapper.ts, dust.ts, weather-thresholds.ts (+ tests)
src/entities/weather/api/     weather.queries.ts (useDustDayMeanQuery)
src/shared/lib/               weather-ranges.ts, sensor-format.ts
src/assets/locales/{ru,uz,en}/common.json, src/assets/locales/locales.test.ts
eslint.config.js
docs/                         spec amendments, PROJECT_REPORT.md 11.3, tasks/SPATIAL_VISUALIZATION.md T2
```

---

### Task 1: Standards as data

**Files:** Create `src/shared/lib/air-quality/types.ts`, `standards/us-epa-2024.ts`, `guidelines.ts`, `registry.ts`, `index.ts`; Test `standards/us-epa-2024.test.ts`.

**Interfaces — Produces:**
```ts
export type Pollutant = 'pm25' | 'pm10';
export type CategoryId = 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
export type Breakpoint = { category: CategoryId; cLow: number; cHigh: number; aqiLow: number; aqiHigh: number };
export type Standard = { id: string; nameKey: string; averaging: Record<Pollutant, '24h'>;
  decimals: Record<Pollutant, number>; breakpoints: Record<Pollutant, Breakpoint[]> };
export const US_EPA_2024: Standard;                       // standards/us-epa-2024.ts
export const WHO_2021_GUIDELINES: { pollutant: Pollutant; period: '24h' | 'year'; value: number }[];
export const STANDARDS: Record<string, Standard>; export const DEFAULT_STANDARD_ID = 'us-epa-2024';
export function getStandard(id?: string): Standard;       // unknown id falls back to the default
```

- [ ] **Step 1: Write `us-epa-2024.test.ts`.** Tests: `PM2.5 table matches the EPA 2024 AQS table` (all six rows asserted verbatim from Global Constraints, `decimals.pm25 === 1`); `PM10 table matches` (six rows, `decimals.pm10 === 0`); `rows are contiguous` (for each pollutant: `row[i+1].cLow - row[i].cHigh` equals `10^-decimals` within 1e-9, and `row[i+1].aqiLow === row[i].aqiHigh + 1`); `WHO 2021 values` (pm25 24h 15, year 5; pm10 24h 45, year 15); `getStandard falls back` (`getStandard('nope') === US_EPA_2024`, `getStandard() === US_EPA_2024`).
- [ ] **Step 2:** Run `pnpm test src/shared/lib/air-quality` — Expected: FAIL (modules missing).
- [ ] **Step 3:** Create the files with the interfaces above. `nameKey` = `'standard_us_epa_2024'`; `index.ts` re-exports everything public (later tasks append to it).
- [ ] **Step 4:** Run the same command — Expected: PASS.
- [ ] **Step 5:** Commit `Add air-quality standards data (US EPA 2024, WHO 2021 reference)`.

### Task 2: `categorize` and `aqi`

**Files:** Create `src/shared/lib/air-quality/calc.ts`; Test `calc.test.ts`; Modify `index.ts`.

**Interfaces — Consumes:** `Standard`, `Pollutant`, `CategoryId`, `US_EPA_2024` (Task 1). **Produces:**
```ts
export function categorize(standard: Standard, pollutant: Pollutant, value: number | null | undefined): CategoryId | null;
export function aqi(standard: Standard, pollutant: Pollutant, value: number | null | undefined): number | null;
```

- [ ] **Step 1: Write the failing tests** (`const S = US_EPA_2024`):
  - `it.each` PM2.5 `[value, category, aqi]`: `[0,'good',0] [9.0,'good',50] [9.09,'good',50] [9.1,'moderate',51] [35.49,'moderate',100] [35.5,'unhealthy_sensitive',101] [55.4,'unhealthy_sensitive',150] [55.5,'unhealthy',151] [125.4,'unhealthy',200] [125.5,'very_unhealthy',201] [225.4,'very_unhealthy',300] [225.5,'hazardous',301] [325.4,'hazardous',500] [325.5,'hazardous',500] [1000,'hazardous',500]`.
  - Interior values: `aqi(S,'pm25',22.25) === 75`, `aqi(S,'pm25',37) === 105`.
  - `it.each` PM10: `[54,'good',50] [54.9,'good',50] [55,'moderate',51] [424,'very_unhealthy',300] [425,'hazardous',301] [604,'hazardous',500] [605,'hazardous',500]`.
  - `invalid input → null` for `null, undefined, NaN, Infinity, -1` on both functions and both pollutants.
  - **Review Focus:** `categorize matches an integer reference for every 0.1 step`: for `k` in `0..3300`, `categorize(S,'pm25',k/10)` equals the category found by comparing the integer `k` against `[90, 354, 554, 1254, 2254]` upper bounds (a float-safe truncation).
  - `aqi is non-decreasing` over `k/10`, `k` in `0..3300`.
- [ ] **Step 2:** Run `pnpm test src/shared/lib/air-quality/calc.test.ts` — Expected: FAIL.
- [ ] **Step 3:** Implement in `calc.ts`. Truncate with `Math.floor(value * 10^d + 1e-9) / 10^d`; find the row where `cLow <= truncated <= cHigh`, else if above the last row use the last row's `cHigh` and `aqiHigh`; interpolate `(aqiHigh − aqiLow) / (cHigh − cLow) × (c − cLow) + aqiLow`, `Math.round`, cap at `aqiHigh` of the last row.
- [ ] **Step 4:** Run the file — Expected: PASS.
- [ ] **Step 5:** Commit `Add categorize and aqi for the air-quality scale module`.

### Task 3: Category colors and tones

**Files:** Create `src/shared/lib/air-quality/colors.ts`; Test `colors.test.ts`; Modify `index.ts`.

**Interfaces — Produces:**
```ts
export type AqiTone = 'good' | 'warn' | 'bad';
export function categoryTone(id: CategoryId): AqiTone;
export function categoryCssVar(id: CategoryId): string;      // `--aqi-${id}` with underscores kept
export function categoryTextCssVar(id: CategoryId): string;  // `--aqi-${id}-text`
```

- [ ] **Step 1: Tests:** `tones` — the six ids map to `good, warn, warn, bad, bad, bad` in category order; `css vars` — `categoryCssVar('unhealthy_sensitive') === '--aqi-unhealthy_sensitive'`, `categoryTextCssVar('good') === '--aqi-good-text'`.
- [ ] **Step 2:** Run `pnpm test src/shared/lib/air-quality/colors.test.ts` — FAIL.
- [ ] **Step 3:** Implement (pure string/union code, no imports from outside the module). The CSS variables themselves are defined in PR 3.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `Add category tones and CSS variable names for AQI`.

### Task 4: ESLint import guard

**Files:** Modify `eslint.config.js`.

- [ ] **Step 1:** Add a config block `files: ['src/shared/lib/air-quality/**/*.{ts,tsx}']` with `'no-restricted-imports': ['error', { patterns: [{ group: ['@/entities/*','@/features/*','@/widgets/*','@/pages/*','@/app/*'], message }], paths: [{ name: 'react', message }, { name: 'react-dom', message }, { name: 'react-i18next', message }, { name: 'i18next', message }] }]`, where `message` says the module must stay pure so the map and other projects can reuse it.
- [ ] **Step 2: Verify the guard bites.** Create a throwaway `src/shared/lib/air-quality/_tmp.ts` containing `import type { SensorType } from '@/entities/weather/model/weather.types'; export type X = SensorType;`; run `pnpm lint` — Expected: 1 error for `no-restricted-imports`. Delete the file.
- [ ] **Step 3:** Run `pnpm lint` — Expected: 0 errors (the 4 existing warnings stay).
- [ ] **Step 4:** Commit `Guard the air-quality module against imports from upper layers`.

### Task 5: Dust fields through types and mapper

**Files:** Modify `src/entities/weather/model/weather.types.ts`, `weather.mapper.ts`, `src/shared/lib/weather-ranges.ts`, `src/shared/lib/sensor-format.ts`, `src/shared/lib/chart/chart-colors.ts`, `src/features/chart-selector/ui/ChartSelector.tsx`, `src/widgets/sensor-charts/ui/SensorCharts.tsx`, `src/widgets/weather-summary/ui/MetricCard.tsx`; Test `weather.mapper.test.ts` plus helper updates in `weather-freshness.test.ts`, `append-history-point.test.ts`, `filter-by-range.test.ts`.

**Interfaces — Produces:**
```ts
export type SensorType = 'temp'|'hum'|'press'|'mq5'|'mq3'|'pm25'|'pm10';
export type ScaleSensor = Exclude<SensorType, 'pm25'|'pm10'>;       // sensors with a SENSOR_RANGES entry
export function isScaleSensor(s: SensorType): s is ScaleSensor;
export const SENSORS_BY_SOURCE: Record<'room'|'street', SensorType[]>; // room: temp,hum,press,pm25,pm10,mq5,mq3; street: temp,hum,press,mq5,mq3
// WeatherLatest gains: pm25: number | null; pm10: number | null
// AggregateBucketRow gains: pm25?: MetricStats; pm10?: MetricStats
```

- [ ] **Step 1: Write failing mapper tests:** `maps pm25 and pm10 from the new payload` (`{...row, pm25: 38, pm10: 45}` → `38`, `45`); `keeps null` (`pm25: null` → `null`, not `0`); `missing dust fields (old backend) → null`; `history items carry pm fields` (`{items:[{...row, pm25: 12, pm10: 20}]}`); and update the existing full-object `toEqual` in the mapper tests to expect `pm25: null, pm10: null`. Add `pm25: null, pm10: null` to the object builders in the three other test files so they type-check.
- [ ] **Step 2:** Run `pnpm test src/entities/weather/model/weather.mapper.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Mapper schema: `pm25: z.number().nullish()` (never `z.coerce`, it turns `null` into `0`), result `raw.pm25 ?? null`. Keep the tree compiling: `SENSOR_RANGES: Record<ScaleSensor, SensorRangeConfig>`; `SENSOR_COLORS` gains `pm25: '#a855f7'`, `pm10: '#fb923c'`; `SENSOR_UNITS` (SensorCharts) gains `pm25`/`pm10: 'мкг/м³'`; `ChartSelector` `SENSOR_ICONS` gains `CloudFog` (pm25) and `Cloudy` (pm10), `MOBILE_LABELS` gains `btn_pm25_short`/`btn_pm10_short`; `MetricCard` `MetricSensor = Exclude<ScaleSensor,'temp'>`; `SensorCharts.buildThresholdLines` returns `[]` when `!isScaleSensor(sensor)` (PR 3 replaces this with standard-based lines). `SENSOR_ORDER` is unchanged, so no dust tab appears yet. `RangeZoneColor` gains `'gray'` mapped to `bg-slate-400` / `#94a3b8` in `sensor-format.ts`.
- [ ] **Step 4:** Run `pnpm typecheck && pnpm test` — Expected: PASS (all prior tests plus the new ones).
- [ ] **Step 5:** Commit `Carry pm25 and pm10 through types and the API mapper`.

### Task 6: Means over dust readings

**Files:** Create `src/entities/weather/model/dust.ts`; Test `dust.test.ts`.

**Interfaces — Consumes:** `WeatherHistoryItem`, `AggregateBucketData` (Task 5). **Produces:**
```ts
export const DUST_WINDOW_MS = 600_000, MIN_POINTS_10M = 60, EXPECTED_DAY_POINTS = 17_280, MIN_DAY_COVERAGE = 0.75;
export type DustField = 'pm25' | 'pm10';
export function recentMean(history: WeatherHistoryItem[], field: DustField, nowMs?: number, windowMs?: number, minPoints?: number): { mean: number; count: number } | null;
export function dayMeanFromAggregate(data: AggregateBucketData | null | undefined, field: DustField): { mean: number; coverage: number } | null; // null when no bucket has a value
export function hasEnoughDayCoverage(coverage: number): boolean;  // coverage >= MIN_DAY_COVERAGE
```

- [ ] **Step 1: Write failing tests** (helper builds one point per 5 s ending at `now = Date.parse('2026-10-10T12:00:00Z')`, `pm25` supplied by a function):
  - `mean over a full window`: 120 points of value 40 → `{ mean: 40, count: 120 }`.
  - `59 points → null, 60 points → mean` (boundary of `MIN_POINTS_10M`).
  - `ignores null points and counts only real ones`: 120 points, every second one `null` → `count: 60`, still returned; every second plus one more `null` → 59 → `null`. **(Review Focus)**
  - `silent device`: 200 valid points all older than 20 minutes → `null`. **(Review Focus)**
  - `points outside the window are excluded`: points at `now − 11 min` don't change the mean.
  - `dayMeanFromAggregate`: two buckets `{count: 8640, pm25: {avg: 10}}`, `{count: 4320, pm25: {avg: 40}}` → `mean 20` (weighted), `coverage 12960 / 17280 = 0.75`; `hasEnoughDayCoverage(0.75) === true`, `(0.7499) === false`; buckets whose `pm25.avg` is `null` add nothing to count or mean; **no buckets with a value, or `data` `null`/`undefined`, or items without `pm25` (old backend) → `null`**. **(Review Focus)**
- [ ] **Step 2:** Run `pnpm test src/entities/weather/model/dust.test.ts` — FAIL.
- [ ] **Step 3:** Implement. Window is `[nowMs − windowMs, nowMs]` inclusive; point time from `date`; a point counts only when the field is a finite number.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit `Add dust means for the 10-minute and 24-hour views`.

### Task 7: Statuses, scales and honest sensor names

**Files:** Modify `src/entities/weather/model/weather-thresholds.ts`, `src/shared/lib/weather-ranges.ts`, `src/assets/locales/{ru,uz,en}/common.json`; Test `weather-thresholds.test.ts` (update), create `src/assets/locales/locales.test.ts`.

**Interfaces — Consumes:** `categorize`, `categoryTone`, `getStandard`, `DEFAULT_STANDARD_ID` (Tasks 1–3). `getSensorStatus(sensor: SensorType, value: number | null): MetricStatus` keeps its signature.

- [ ] **Step 1: Write failing tests.**
  - Thresholds: `pm25 categories` via `it.each` `[8,'aqi_cat_good','good'] [9.09,'aqi_cat_good','good'] [20,'aqi_cat_moderate','warn'] [37,'aqi_cat_unhealthy_sensitive','warn'] [60,'aqi_cat_unhealthy','bad'] [130,'aqi_cat_very_unhealthy','bad'] [300,'aqi_cat_hazardous','bad']`; `pm10` e.g. `[40,'aqi_cat_good','good'] [200,'aqi_cat_unhealthy_sensitive','warn']`; `pm25 null/NaN → status_reference/neutral`; `mq3 is reference only` (`getSensorStatus('mq3', 0)` and `(…, 900)` → `status_reference`/`neutral`); mq5 zone tests unchanged. Remove `mq3` from the existing `it.each(['mq5','mq3'])` zone-boundary test.
  - Ranges: `every zone color has a class and gradient color` (iterate `SENSOR_RANGES` zones, `getZoneBgClass(color)` is a non-empty string and `buildZoneGradient` contains no `undefined`); `mq3 is one gray zone, unit ppm, max 500`; `mq5 unit ppm, max 3000`.
  - `locales.test.ts`: `ru, uz, en have identical key sets`; `each required key exists in all three` for `aqi_cat_good|moderate|unhealthy_sensitive|unhealthy|very_unhealthy|hazardous`, `btn_pm25`, `btn_pm10`, `btn_pm25_short`, `btn_pm10_short`, `lbl_pm25`, `lbl_pm10`, `standard_us_epa_2024`; **no value of any key starting with `btn_mq`, `lbl_mq` or `range_mq` matches `/CO₂|CO2|PM2\.5|аэрозол|aerosol|aerozol|углекисл|karbonat|carbon/i`**. **(Review Focus)**
- [ ] **Step 2:** Run `pnpm test src/entities/weather/model/weather-thresholds.test.ts src/assets/locales` — FAIL.
- [ ] **Step 3: Implement.** `getSensorStatus`: `pm25`/`pm10` → `categorize(getStandard(DEFAULT_STANDARD_ID), field, value)`; `null` → reference; else `{ labelKey: 'aqi_cat_' + id, tone: categoryTone(id) }`; `mq3` → reference/neutral. `weather-ranges.ts`: `mq5` zones numbers unchanged, `unit: 'ppm'`; `mq3`: `min 0, max 500, unit 'ppm', normLabelKey 'range_mq3_norm'`, one zone `{from: 0, to: 500, color: 'gray', labelKey: 'range_mq3_ref'}`. Locale copy (exact):

  | key | ru | uz | en |
  |---|---|---|---|
  | `btn_mq5` | Горючий газ | Yonuvchi gaz | Combustible gas |
  | `btn_mq3` | Пары спирта | Spirt bug'lari | Alcohol vapour |
  | `lbl_mq5` | Горючий газ (MQ-5) | Yonuvchi gaz (MQ-5) | Combustible gas (MQ-5) |
  | `lbl_mq3` | Пары спирта (MQ-3) | Spirt bug'lari (MQ-3) | Alcohol vapour (MQ-3) |
  | `btn_mq5_short` / `btn_mq3_short` | Газ / Спирт | Gaz / Spirt | Gas / Alcohol |
  | `range_mq5_norm` | до 1000 ppm (оценка) | 1000 ppm gacha (taxminiy) | up to 1000 ppm (estimate) |
  | `range_mq5_ok` / `_warn` / `_bad` | 0–1000 — в пределах нормы / 1000–2000 — повышено / >2000 — опасно | 0–1000 — me'yorda / 1000–2000 — oshgan / >2000 — xavfli | 0–1000 — within limits / 1000–2000 — elevated / >2000 — dangerous |
  | `range_mq3_norm` | нормы нет (оценка) | me'yor yo'q (taxminiy) | no norm (estimate) |
  | `range_mq3_ref` | оценка, без нормы | taxminiy, me'yorsiz | estimate, no norm |
  | `btn_pm25` / `btn_pm10` | Пыль PM2.5 / Пыль PM10 | Chang PM2.5 / Chang PM10 | Dust PM2.5 / Dust PM10 |
  | `lbl_pm25` / `lbl_pm10` | Пыль PM2.5 / Пыль PM10 | Chang PM2.5 / Chang PM10 | Dust PM2.5 / Dust PM10 |
  | `btn_pm25_short` / `btn_pm10_short` | PM2.5 / PM10 | PM2.5 / PM10 | PM2.5 / PM10 |
  | `aqi_cat_good` … `hazardous` | хорошо, умеренно, вредно для чувствительных групп, вредно, очень вредно, опасно | yaxshi, o'rtacha, sezgir guruhlar uchun zararli, zararli, juda zararli, xavfli | good, moderate, unhealthy for sensitive groups, unhealthy, very unhealthy, hazardous |
  | `standard_us_epa_2024` | US EPA AQI (ред. 2024) | US EPA AQI (2024) | US EPA AQI (2024 revision) |

  Delete the keys `range_mq3_ok`, `range_mq3_warn`, `range_mq3_bad` from all three files.
- [ ] **Step 4:** Run `pnpm typecheck && pnpm test` — PASS.
- [ ] **Step 5:** Commit `Use the air-quality scale for dust statuses and name MQ sensors honestly`.

### Task 8: 24-hour query, spec amendments, docs, verification

**Files:** Modify `src/entities/weather/api/weather.queries.ts`; the spec file; `docs/PROJECT_REPORT.md` (section 11.3, stage 3 row); `docs/tasks/SPATIAL_VISUALIZATION.md` (T2).

**Interfaces — Consumes:** `getWeatherAggregate`, `dayMeanFromAggregate`, `SENSORS_BY_SOURCE`. **Produces:** `export function useDustDayMeanQuery(type: WeatherPageType): UseQueryResult<{ mean: number; coverage: number } | null>` — enabled only when `SENSORS_BY_SOURCE[type]` includes `'pm25'`, `staleTime` 5 min, `retry: 1`; last 24 h, field `pm25`.

- [ ] **Step 1:** Implement `useDustDayMeanQuery` (`select`-style mapping of the aggregate through `dayMeanFromAggregate(data, 'pm25')`); the key is `['weather', type, 'dust-day']`.
- [ ] **Step 2:** Apply the three spec amendments from this plan's header to the spec file (window end at `now`; bucket `auto`; ESLint scope + the five existing shared files recorded as debt).
- [ ] **Step 3:** Docs: PROJECT_REPORT 11.3 row 3 becomes "в работе (логика готова, интерфейс после миграции на Tailwind v4)"; in `SPATIAL_VISUALIZATION.md` T2 replace the scale-module text with "модуль `shared/lib/air-quality` уже есть (границы EPA, `categorize`, `aqi`, цвета); задача — легенда и показ на карте".
- [ ] **Step 4: Full checks.** Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — Expected: typecheck clean, lint 0 errors, all tests pass, build succeeds.
- [ ] **Step 5: Verify against the local stack.** In `weather-backend`: `docker compose -f docker-compose.dev.yml --profile live up -d --build --wait`; here `pnpm dev`; open `/room` and `/street`. Expected: no console errors; Room MQ cards read «Горючий газ (MQ-5)» / «Пары спирта (MQ-3)» with ppm and the MQ-3 bar gray; no «CO₂» / «Аэрозоль» text anywhere; the Network tab shows `pm25`/`pm10` numbers in `/api/room/latest` for Room and `null` for Street. Stop the stack afterwards.
- [ ] **Step 6:** Commit `Add the 24-hour dust query and update docs`; push the branch and open PR 1.

# Сезонная тема «Атмосфера»: план реализации

> **Для исполнителей:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans. Шаги отмечены чекбоксами (`- [ ]`).

**Цель:** сцена на весь дашборд (небо, частицы, осадки садятся на верхние грани карточек), сезонная палитра и праздники, реальная погода Open-Meteo на «Улице», три уровня и защита слабых устройств.

**Архитектура:** чистая логика в `entities/atmosphere` (календарь, погода, сцена, уровни, физика поверхностей) с тестами; тонкий слой React и один ленивый `<canvas>` в `shared/ui/atmosphere`; управление в `features/atmosphere-settings`; сезонные токены в CSS через `html[data-season]`.

**Стек:** React 19, TypeScript, Vite, Vitest (только `src/**/*.test.ts`, окружение node), Tailwind v4, framer-motion, react-query, i18next (ru/uz/en), pnpm. Новые зависимости: `canvas-confetti` (ленивый), `ogl` (ленивый).

**Спецификация:** `docs/superpowers/specs/2026-10-12-seasonal-atmosphere-design.md` (читать целиком перед началом).

## Глобальные ограничения

* Проверки перед каждым коммитом: `pnpm typecheck`, `pnpm lint` (0 ошибок), `pnpm test`; перед PR ещё `pnpm build`.
* Правила слоёв FSD: `shared` не импортирует из верхних слоёв; `entities/atmosphere/model` без React.
* Станция: `STATION = { lat: 41.343, lon: 69.205, timeZone: 'Asia/Tashkent', utcOffsetMinutes: 300 }` (`@/shared/config/station`).
* Бюджет: частиц не больше 120 («Полный»), вдвое меньше на телефоне; DPR не выше 2; основной бандл не растёт (сцена, confetti, ogl подгружаются лениво только на «Полном»).
* Уровни: `'off' | 'calm' | 'full'`; «Спокойный» не подгружает тяжёлые чанки; «Выкл» отключает и палитру, и приветствия.
* Статусные цвета и цвета серий графиков не меняются сезонами.
* Узбекские строки: апостроф только типографский `‘` (U+2018).
* Файлы редактируются с сохранением CRLF (проект на Windows); скрипты правок писать через Write, не heredoc, если в тексте есть кавычки.
* Деплой только по просьбе пользователя; PR создаёт пользователь, исполнитель пушит ветку.

## Review Focus

* Датчик «Улицы» молчит или данные архивные: жара и мороз берутся из `temperature_2m`, эффект не пропадает (тест `effectiveTemperature`).
* Open-Meteo недоступен или вернул мусор: сцена строится без погоды, интерфейс не ломается (тест маппера и хука).
* Прокрутка и ресайз: координаты поверхностей актуальны, частицы не рисуются поверх содержимого карточек.
* Скрытая вкладка, `prefers-reduced-motion`, слабое устройство: ни одного кадра на «Спокойном», пауза без утечек `requestAnimationFrame`.
* Граничные даты окон событий (20 и 23 марта, 31 августа, 7 января, високосный год) и часовой пояс станции, не посетителя.

---

### Task 1: Правки интерфейса (вкладки и полосы прокрутки)

**Files:**
- Modify: `src/features/chart-selector/ui/ChartSelector.tsx`
- Modify: `src/app/styles/globals.css`

**Interfaces:**
- Produces: утилита `.themed-scroll` (тонкая полоса в токенах), `ChartSelector` без перетаскивания ползунка.

- [ ] **Step 1:** в `ChartSelector` передать `draggable={false}` в `RubberSegment`; убрать `touch-pan-y` не нужно (компонент сам разрешает вертикальную прокрутку), горизонтальная прокрутка контейнера `overflow-x-auto` должна работать пальцем.
- [ ] **Step 2:** в `globals.css` добавить глобально `* { scrollbar-width: thin; scrollbar-color: var(--text-muted) transparent; }` и `::-webkit-scrollbar` (высота 6 px, ползунок `var(--control-track)` скругление 999px); для контейнера вкладок класс `.tabs-scroll` скрывает полосу (`scrollbar-width: none; &::-webkit-scrollbar { display: none; }`) и добавляет маску `mask-image: linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)`.
- [ ] **Step 3:** применить `tabs-scroll` к `div` с `overflow-x-auto` в `ChartSelector`.
- [ ] **Step 4:** проверить в браузере 375 и 768 px: вкладки прокручиваются до «Пары спирта», белой полосы нет. Expected: прокрутка пальцем доходит до последней вкладки.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint`, коммит `fix: tabs scroll, themed scrollbars`.

### Task 2: Календарь сезонов и событий

**Files:**
- Create: `src/entities/atmosphere/model/calendar.ts`, `calendar.test.ts`

**Interfaces:**
- Produces: `type Season`, `type EventId`, `sceneFor(date: Date, tz: string): { season: Season; event: EventId | null }`, `EVENT_WINDOWS` (для документации и тестов).

- [ ] **Step 1 (тест):** `calendar.test.ts`, падающие тесты: `it.each` по таблице окон спецификации (20 и 23 марта → `navruz`, 19 и 24 марта → `null`; 31 августа и 1 сентября → `independence`; 1 октября → `teachers`; 7 и 8 декабря → `constitution`; 25 декабря, 31 декабря и 1, 7 января → `new_year`, 8 января → `null`); сезоны на границах (28 февраля и 1 марта, 29 февраля 2028, 31 мая и 1 июня, 31 августа и 1 сентября, 30 ноября и 1 декабря); «дата берётся в часовом поясе станции»: `2026-12-31T20:00:00Z` (01:00 1 января в Ташкенте) → `new_year` и `winter`.
- [ ] **Step 2:** запуск `pnpm exec vitest run src/entities/atmosphere/model/calendar.test.ts`. Expected: FAIL (модуля нет).
- [ ] **Step 3:** реализовать `sceneFor`: месяц и день в `tz` через `Intl.DateTimeFormat` (`en-CA`, части `month`, `day`), окна как массив `{ id, from: [m,d], to: [m,d] }` (окно Нового года переходит через год), сезон по месяцу.
- [ ] **Step 4:** тесты зелёные. Коммит `feat: season and event calendar`.

### Task 3: Условия погоды и температура

**Files:**
- Create: `src/entities/atmosphere/model/weather.ts`, `weather.test.ts`

**Interfaces:**
- Produces: `type Condition`, `type Weather`, `describeWeather(code: number, temp: number, input: { precipitation: number; cloud: number; windKmh: number; windDirDeg: number; isDay: boolean }): Weather`, `effectiveTemperature(streetTemp: number | null, weather: Weather | null): number | null`. Подписи из спецификации §3.1 и §6.

- [ ] **Step 1 (тест):** падающие тесты: коды WMO → условия (0 `clear`; 2 `clouds`; 45 `fog`; 53 `drizzle`; 63 `rain`; 82 `shower`; 73 `snow`; 86 `blizzard`; 95 `thunder`; 96 `hail`); 56, 57, 66, 67 → `sleet`; код дождя при температуре ≤ 0 → `sleet`, при ≤ −2 → `snow`; `intensity` из `precipitation` в диапазоне 0..1; `windX` знак по направлению ветра (ветер с запада даёт положительное смещение), `cloud` из процентов; неизвестный код → `clear`. `effectiveTemperature`: свежий датчик побеждает, `null` датчик → `weather.temp`, оба `null` → `null`.
- [ ] **Step 2:** запуск, FAIL. **Step 3:** реализовать по таблице; приоритет условий вынести в `CONDITION_PRIORITY` (гроза, град, метель, снег, мокрый снег, ливень, дождь, морось, туман, облачность, ясно). **Step 4:** зелёные, коммит `feat: weather conditions and effective temperature`.

### Task 4: Описание сцены

**Files:**
- Create: `src/entities/atmosphere/model/scene.ts`, `scene.test.ts`

**Interfaces:**
- Consumes: `sceneFor`, `Weather`, `effectiveTemperature` (задачи 2 и 3).
- Produces: `type LayerSpec = { kind: 'snow' | 'rain' | 'hail' | 'petals' | 'leaves' | 'motes' | 'fog' | 'frost' | 'shimmer' | 'stars' | 'rays' | 'clouds' | 'lightning'; intensity: number; windX: number }`, `type AtmosphereScene = { season: Season; event: EventId | null; layers: LayerSpec[]; sky: { cloud: number; isDay: boolean }; lights: boolean; confetti: boolean; greeting: EventId | null }`, `describeScene(input: { date: Date; source: 'room' | 'street'; weather: Weather | null; streetTemp: number | null }): AtmosphereScene`.

- [ ] **Step 1 (тест):** падающие тесты: «Аудитория» не получает погодных слоёв даже при `weather` дождя, но получает сезонный слой (весна даёт `petals`, осень `leaves`, зима `snow` малой интенсивности, лето `motes`); «Улица» с `thunder` даёт `rain` и `lightning`, приоритет гроза выше дождя; снег по `streetTemp ≤ 2` без погоды (поведение карточки температуры сохраняется); жара `shimmer` при эффективной температуре ≥ 29 и `frost` при ≤ −5 (датчик молчит, `weather.temp` 31 → `shimmer`); событие `new_year` включает `lights`, `confetti: true` и усиливает `snow`; `greeting` совпадает с событием; ясный день даёт `rays`, ясная ночь `stars`.
- [ ] **Step 2:** FAIL. **Step 3:** реализовать чистую функцию (без `Date.now` внутри). **Step 4:** зелёные, коммит `feat: describe the atmosphere scene`.

### Task 5: Уровни, устройство, страж FPS

**Files:**
- Create: `src/entities/atmosphere/model/tier.ts`, `tier.test.ts`

**Interfaces:**
- Produces: `type Level = 'off' | 'calm' | 'full'`, `type DeviceSignals = { reducedMotion: boolean; saveData: boolean; effectiveType?: string; memoryGb?: number; cores?: number; isPhone: boolean }`, `deviceCap(s: DeviceSignals): Level`, `effectiveLevel(userChoice: Level | null, cap: Level, governorDrop: boolean): Level`, `particleBudget(level: Level, isPhone: boolean): number`, `createFpsGovernor(): { sample(frameMs: number): 'ok' | 'drop' }` (окна по 2 секунды, два подряд окна хуже 25 мс на кадр дают `'drop'`).

- [ ] **Step 1 (тест):** падающие тесты по правилам §8: `reducedMotion`, `saveData`, `2g/3g`, память ≤ 2, ядра ≤ 2 дают `calm`; нормальный десктоп `full`; пользовательский `off` сильнее всего; пользовательский `full` на слабом устройстве остаётся `full` (страж только предлагает, `governorDrop` не понижает при ручном выборе `full`); без выбора и с `governorDrop` уровень `calm`; `particleBudget('full', false) === 120`, `('full', true) === 60`, `calm`/`off` дают 0; страж: 80 кадров по 30 мс в двух окнах подряд дают `'drop'`, а одно плохое окно и потом хорошее нет.
- [ ] **Step 2:** FAIL. **Step 3:** реализовать. **Step 4:** зелёные, коммит `feat: atmosphere levels and fps governor`.

### Task 6: Open-Meteo

**Files:**
- Create: `src/entities/atmosphere/api/open-meteo.ts`, `open-meteo.test.ts`, `use-weather.ts`

**Interfaces:**
- Consumes: `describeWeather` (задача 3).
- Produces: `mapOpenMeteo(raw: unknown): Weather | null`, `useOpenMeteoWeather(enabled: boolean)` (react-query, `staleTime` и `refetchInterval` 15 минут, `retry: 1`, ошибка даёт `data: undefined`).

- [ ] **Step 1 (тест):** фикстуры реального ответа (`current: { weather_code, temperature_2m, precipitation, cloud_cover, wind_speed_10m, wind_direction_10m, is_day }`): корректный ответ → `Weather`; нет `current`, строковые значения, `NaN` и неожиданные поля → `null`; URL содержит координаты станции и все поля `current`.
- [ ] **Step 2:** FAIL. **Step 3:** реализовать `buildOpenMeteoUrl()`, маппер и хук; запрос через `fetch`, без ключа. **Step 4:** зелёные, коммит `feat: open-meteo client`.

### Task 7: Сезонная палитра и состояние атмосферы

**Files:**
- Modify: `src/app/styles/globals.css` (блоки `html[data-season='…']` в светлой и тёмной палитре, помечены `/* PALETTE:season */`)
- Create: `src/app/styles/season-palette.test.ts`, `src/entities/atmosphere/model/use-atmosphere.ts`

**Interfaces:**
- Consumes: `sceneFor`, `describeScene`, `deviceCap`, `effectiveLevel`, `useOpenMeteoWeather`, `useConnection`.
- Produces: `useAtmosphere(source: 'room' | 'street'): { level: Level; scene: AtmosphereScene | null; userChoice: Level | null; setUserChoice(l: Level | null): void; limitedBy: 'device' | 'governor' | null; dropFromGovernor(): void }`; на `<html>` ставятся `data-season` и `data-event`; в режиме разработки читаются `?season=`, `?event=`, `?weather=` (условие) и `?level=`.

- [ ] **Step 1 (тест):** `season-palette.test.ts` в стиле существующего `temperature-tint.test.ts`: парсит токены сезонов; текст (`--text-primary` и `--text-secondary`) на `--season-sky-from` и `--season-sky-to` и на `--season-header-tint` не ниже 4,5:1 для 4 сезонов × 2 темы.
- [ ] **Step 2:** FAIL. **Step 3:** добавить токены (значения подобрать так, чтобы тест проходил; акценты из §5 спецификации). **Step 4:** реализовать `useAtmosphere` (чтение и запись `localStorage` с try/catch, `sessionStorage` для понижения стражем, сигналы устройства из `navigator` и `matchMedia`, `streetTemp` из последнего значения `latest` только если связь не «архив»). **Step 5:** `pnpm test`, коммит `feat: seasonal palette and atmosphere state`.

### Task 8: Переключатель уровней и подсказки

**Files:**
- Create: `src/features/atmosphere-settings/ui/AtmosphereControl.tsx`
- Modify: `src/widgets/topbar/ui/TopBar.tsx`, locales ru/uz/en

**Interfaces:**
- Consumes: `useAtmosphere`, `RubberSegment`.
- Produces: компонент `AtmosphereControl` (кнопка в шапке открывает поповер с тремя уровнями «Полный / Спокойный / Выкл» и подсказкой «Авто: Спокойный (экономия трафика)»); ключи `atm_*` в локалях.

- [ ] **Step 1:** создать компонент: иконка-кнопка (lucide `Sparkles`) в шапке рядом с темой, поповер с `RubberSegment` (size sm), состояние из `useAtmosphere`, подсказка при `limitedBy`. **Step 2:** локали (скрипт `.superpowers/addkeys.py` или правка вручную): `atm_title`, `atm_level_full`, `atm_level_calm`, `atm_level_off`, `atm_auto_device`, `atm_auto_governor`, `atm_governor_toast`, `atm_governor_restore`. **Step 3:** встроить в `TopBar`; на телефоне помещается рядом с темой и языком без переноса (проверить 320 и 375 px). **Step 4:** `pnpm typecheck && pnpm lint`, проверка в браузере в двух темах. Коммит `feat: atmosphere level control`.

### Task 9: Физика поверхностей

**Files:**
- Create: `src/shared/ui/atmosphere/engine/surfaces.ts`, `surfaces.test.ts`

**Interfaces:**
- Produces: `type Surface = { x: number; width: number; top: number }`, `landOn(surfaces: Surface[], prev: { x: number; y: number }, next: { x: number; y: number }): { surface: Surface; x: number } | null` (частица пересекла верхнюю грань сверху вниз), `createCap(width: number)`, `growCap(cap, x: number, amount: number)`, `meltCap(cap, dtSeconds: number, ratePerSecond: number)`, `capHeight(cap, x: number): number` (максимум 5 px).

- [ ] **Step 1 (тест):** падающие тесты: частица, пересекающая грань внутри ширины, садится; мимо ширины нет; движущаяся вверх не садится; пересечение двух граней выбирает ближайшую сверху; `growCap` не превышает 5 px и сглаживает соседей; `meltCap` убирает шапку за ~60 секунд при `ratePerSecond = 5/60`.
- [ ] **Step 2:** FAIL. **Step 3:** реализовать чистые функции. **Step 4:** зелёные, коммит `feat: surface landing and snow caps`.

### Task 10: Движок и сцена на странице

**Files:**
- Create: `src/shared/ui/atmosphere/AtmosphereStage.tsx`, `engine/loop.ts`, `engine/layers/*.ts` (snow, rain, hail, petals, leaves, motes, fog, frost, shimmer, stars, rays, clouds, lightning, lights), `engine/measure-surfaces.ts`
- Modify: `src/app/providers/router/AppShell.tsx` (сцена и небо), карточки сводки и история (`data-atmosphere-surface` на корневых элементах), `globals.css` (небо `.atmosphere-sky`)

**Interfaces:**
- Consumes: `AtmosphereScene`, `Level`, `particleBudget`, `landOn` и функции шапок (задача 9), `createFpsGovernor` (задача 5).
- Produces: `<AtmosphereStage scene level onGovernorDrop />` (лениво импортируется из `AppShell` через `lazy`, рендерится только при `level === 'full'`); `<AtmosphereSky scene level />` (статичный градиент неба для `calm` и `full`, без canvas).

- [ ] **Step 1:** `measure-surfaces.ts`: собрать `[data-atmosphere-surface]`, вернуть `Surface[]` в координатах окна; обновлять по `scroll` (с `requestAnimationFrame`-троттлингом) и `ResizeObserver`; не вызывать `getBoundingClientRect` каждый кадр.
- [ ] **Step 2:** `loop.ts`: один `requestAnimationFrame`, дельта времени ограничена 50 мс, пауза на `visibilitychange`, замер кадров в страж, DPR не выше 2, `canvas` `position: fixed; inset: 0; pointer-events: none; z-index` выше страницы и ниже диалогов.
- [ ] **Step 3:** слои по спецификации: снег и лепестки садятся на грани (шапки только у снега), листья лежат на грани и скатываются, дождь и град делают всплески, туман вдоль нижних краёв карточек, изморозь на гранях, дрожание, звёзды, лучи, облака, молния (вспышки неба), гирлянды вдоль граней (статичны на `calm`).
- [ ] **Step 4:** `AtmosphereSky`: градиент из `--season-sky-*` с затемнением по `sky.cloud`, высота ~220 px за шапкой, плавно растворяется в фон страницы.
- [ ] **Step 5:** `AppShell`: поставить `useAtmosphere`, небо при `calm` и `full`, `lazy(AtmosphereStage)` при `full`; при `off` ничего.
- [ ] **Step 6:** проверка в браузере (все сезоны через `?season=`, погода через `?weather=`): частицы не рисуются над содержимым карточек, на 320–1440 px без горизонтальной прокрутки, на «Спокойном» нет ни одного кадра canvas (DevTools). Замер FPS и размера чанка. Коммит `feat: atmosphere stage and sky`.

### Task 11: Конфетти и приветствия

**Files:**
- Create: `src/shared/ui/atmosphere/confetti.ts`, `src/widgets/topbar/ui/GreetingBar.tsx`, `src/entities/atmosphere/model/greeting-seen.ts`, `greeting-seen.test.ts`, `src/assets/locales/locale-typography.test.ts`
- Modify: locales ru/uz/en, `AppShell.tsx`, `package.json` (`canvas-confetti`)

**Interfaces:**
- Produces: `shouldShowGreeting(event: EventId | null, today: string, seen: Record<string, string>): boolean`, `markGreetingSeen(...)`, `burstConfetti(event: EventId): Promise<void>` (динамический `import('canvas-confetti')`, цвета по событию, `disableForReducedMotion: true`), `<GreetingBar event onClose />`.

- [ ] **Step 1 (тест):** `greeting-seen.test.ts`: показывается один раз в сутки на событие, на следующий день снова, `null` событие не показывается, повреждённое хранилище не ломает. `locale-typography.test.ts`: в ключах `greeting_*` узбекской локали нет прямого апострофа `'` и есть `‘` там, где он нужен.
- [ ] **Step 2:** FAIL. **Step 3:** реализовать логику, `GreetingBar` (закрываемая тонкая полоса, `role="status"`), ключи `greeting_navruz`, `greeting_independence`, `greeting_teachers`, `greeting_constitution`, `greeting_new_year` по таблице спецификации §9. **Step 4:** показывать приветствие на `calm` и `full`, конфетти только на `full` при первом заходе за сутки для событий с конфетти (Навруз, независимость, Новый год). **Step 5:** зелёные тесты, коммит `feat: event greetings and confetti`.

### Task 12: Дождь на стекле (шейдер)

**Files:**
- Create: `src/shared/ui/atmosphere/glass-shader.tsx`
- Modify: `AtmosphereStage.tsx`, `package.json` (`ogl`)

**Interfaces:**
- Consumes: `Weather` (`rain`, `shower`, `thunder`), `Level`, `isPhone`.
- Produces: ленивый компонент, который рисует капли и стекающие дорожки поверх верхней части страницы; не рендерится на телефоне, на `calm`, при `prefers-reduced-motion` и без поддержки WebGL.

- [ ] **Step 1:** динамический `import('ogl')`, один полноэкранный quad с шейдером капель (основа: общеизвестный приём «heartfelt» с шумом и градиентом), прозрачный, `pointer-events: none`. **Step 2:** условия включения в `AtmosphereStage` (десктоп, `full`, осадки дождя), корректное освобождение контекста при размонтировании. **Step 3:** проверка: чанк `ogl` не попадает в основной бандл (`pnpm build` и сравнение размера), на «Спокойном» не грузится. Коммит `feat: rain-on-glass shader`.

### Task 13: Документы, проверка, итоговый обзор

**Files:**
- Modify: `docs/PROJECT_REPORT.md`, при необходимости `CONTRIBUTING.md`

- [ ] **Step 1:** добавить в §13.1 и §14 отчёта абзац про атмосферу (модель сцены как чистые функции с тестами, три уровня, страж FPS, осадки на гранях карточек, Open-Meteo с фоллбэком температуры, расчётные размеры чанков).
- [ ] **Step 2:** полный прогон: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; проверить размеры чанков.
- [ ] **Step 3:** визуальная проверка в браузере: 4 сезона × 5 событий × (светлая и тёмная), погодные условия через `?weather=`, уровни, `prefers-reduced-motion`, скрытая вкладка, 320 / 375 / 768 / 1440 px. Скриншоты в PR.
- [ ] **Step 4:** итоговый обзор всей ветки свежим ревьюером; Critical и Important исправить одним проходом.
- [ ] **Step 5:** запушить ветку и сообщить ссылку; деплой только по просьбе.

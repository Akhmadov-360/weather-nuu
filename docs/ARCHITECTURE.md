# Архитектура фронтенда (для разработчиков и ИИ-агентов)

Этот документ описывает, как устроено приложение и по каким правилам в него добавляют код. Читать
вместе с [CONTRIBUTING.md](../CONTRIBUTING.md) (процесс), [README.md](../README.md) (запуск) и
[docs/PROJECT_REPORT.md](PROJECT_REPORT.md) (история решений). Бэкенд описан в репозитории
`weather-backend`: `docs/ARCHITECTURE.md`. Если задание касается обеих частей, прочитайте оба документа.

## 1. Что это

Дашборд микроклимата weather.nuu.uz (НУУз): две страницы, `/room` («Аудитория») и `/street`
(«Улица»), с текущими показаниями, графиками истории, экспортом и состояниями связи. Языки: ru, uz, en.
Темы: светлая (основная) и тёмная. Работает на телефоне от 320 px.

Стек: React 19, TypeScript, Vite 6, TanStack Query, ECharts (по частям), Tailwind CSS v4, shadcn/ui
(Radix), i18next, React Router, framer-motion, `@number-flow/react`, suncalc. Менеджер пакетов: pnpm.

## 2. Как запустить обе части

Нужно: Node.js 20+, pnpm (`corepack enable`), Docker Desktop. Два терминала.

```bash
# 1. Бэкенд (папка weather-backend): база с тестовыми данными, API :8002, имитатор датчиков
docker compose -f docker-compose.dev.yml --profile live up --build

# 2. Фронтенд (эта папка): http://localhost:5173
pnpm install
pnpm dev
```

Vite проксирует `/api` на `http://localhost:8002` (`API_PROXY_TARGET` меняет адрес). Проверки перед
любым PR: `pnpm typecheck`, `pnpm lint` (0 ошибок), `pnpm test`, `pnpm build`.

Заново заполнить локальную базу, пока стек запущен (папка `weather-backend`):
`docker compose -f docker-compose.dev.yml exec -T api pnpm db:seed --force`.

### Параметры предпросмотра (только `pnpm dev`)

В боевой сборке они отключены (`import.meta.env.DEV`). Работают на путях `/room` и `/street`
(с корневого `/` редирект теряет параметры).

| Параметр | Что делает |
|----------|-----------|
| `?time=18:20` | фиксирует время на карточке времени (фазы неба) |
| `?conn=archive` или `?conn=delayed` | показывает состояния «архив» и «задерживается» |
| `?date=2026-12-31` | подставляет дату станции (сезон и праздники сцены) |
| `?weather=rain` | подставляет погоду: `clear clouds fog drizzle rain shower sleet snow blizzard hail thunder` |
| `?level=full` | принудительно уровень сцены: `off calm full` |

## 3. Слои (Feature-Sliced Design)

`app` → `pages` → `widgets` → `features` → `entities` → `shared`. Слой импортирует только нижележащие;
для `shared` это проверяет ESLint (единственное исключение: `shared/hooks/useTheme.ts`).

```
src/
  app/            провайдеры (query, i18n, тема, router, toaster), глобальные стили, AppShell
  pages/          dashboard-room, dashboard-street, not-found: тонкие обёртки над виджетами
  widgets/        dashboard-layout (сетка и состояния), weather-summary (карточки значений),
                  time-card, sensor-charts, topbar, language-switcher
  features/       time-range-selector, chart-selector, date-range-picker, export-data,
                  atmosphere-settings (уровень сцены)
  entities/
    weather/      api/ (запросы, WebSocket), model/ (типы, маппер, пороги, связь, пыль, давление)
    atmosphere/   model/ (календарь, погода, сцена, уровни), api/ (Open-Meteo)
  shared/
    api/ config/ hooks/ types/ assets/
    lib/          air-quality/ (шкалы AQI), chart/, date/, sky/, theme/, weather-ranges.ts
    ui/           общие компоненты (status-text, animate-number, page-loader, atmosphere/ ...)
  components/ui/  примитивы shadcn и скопированные компоненты (см. §8)
```

Правила размещения: домен-специфичный код идёт в `entities`; виджет собирает сущности и
показывает; фича отвечает за одно действие пользователя; `shared` ничего не знает о домене.

## 4. Данные и состояния

* **Источник правды:** react-query. Ключи: `['weather', source, 'latest' | 'history' | 'aggregate'...]`.
  Опрос `latest` каждые 10 с, `history` каждые 5 минут (`shared/config`).
* **WebSocket** (`entities/weather/api/useWeatherSocket.ts`) дописывает новые точки в тот же кэш
  (`append-history-point.ts`, потолок 3000 точек); опрос остаётся запасным путём.
* **Маппер** (`weather.mapper.ts`) переводит ответ API в типы `weather.types.ts`; `null` значит «нет
  показания» и никогда не ноль. Типы контракта копируются вручную из `packages/contracts` бэкенда:
  меняете схему на сервере, меняйте и здесь.
* **Связь с датчиками** (`entities/weather/model/connection.ts`): `computeConnection` даёт уровень
  `live` (замер моложе минуты), `delayed` (от минуты) и `archive` (10 минут без данных, «залипшие»
  значения или данные старше 3 часов), плюс флаг `linkOk` (сеть и API). Состояние раздаётся через
  `ConnectionProvider`; карточки читают `useConnection()` и в режиме `archive` приглушаются
  (CSS-класс `vc-live`, атрибут `data-conn` на контейнере), анимации останавливаются.
* **Станция:** `shared/config/station.ts` (`STATION`: имя, широта, долгота, часовой пояс). Время и
  даты всегда в часовом поясе станции, а не посетителя.

## 5. Ключевые модули (чистая логика с тестами)

| Модуль | Назначение |
|--------|-----------|
| `shared/lib/air-quality/` | шкалы и AQI (US EPA 2024), без React и i18n; стандарт описан данными, региональная норма добавляется файлом |
| `shared/lib/weather-ranges.ts`, `entities/weather/model/weather-thresholds.ts` | зоны нормы и статусы: единственное место для порогов |
| `entities/weather/model/dust-card.ts`, `dust.ts` | состояния карточки пыли (нет датчика, молчит, есть) и усреднение (10 мин, 24 ч) |
| `entities/weather/model/pressure-tendency.ts` | тенденция давления за 3 часа |
| `entities/weather/model/reliability.ts` | лента надёжности (60 минут) |
| `entities/atmosphere/model/*` | календарь событий, погода, описание сцены, уровни и страж FPS (см. §7) |
| `shared/lib/sky/` | фаза суток, солнце и луна по координатам станции (suncalc) |
| `widgets/sensor-charts/model/` | ряды, пороги, статистика и настройки ECharts |

Логика пишется чистыми функциями; компонент только показывает результат. Тесты (`*.test.ts`) лежат
рядом, запускаются в Node без DOM (Vitest, `src/**/*.test.ts`).

## 6. Дизайн-система

* **Токены** в `src/app/styles/globals.css`: блоки `/* PALETTE:light */` и `/* PALETTE:dark */`
  (цвета, поверхности, статусы, серии графиков), `/* SEASON:<сезон>:<тема> */` (акцент и небо сезона).
  Тесты парсят эти блоки и проверяют контраст: текст и статусы не ниже 4,5:1, серии графиков не ниже
  3:1 и различимы при нарушениях цветового зрения. Меняете цвет, запустите `pnpm test`.
* **Tailwind v4:** настройки в `globals.css` (`@theme`, `@utility`), файла `tailwind.config.ts` нет.
  Классы не собираются из кусков строк.
* **Карточка:** `rounded-card border border-(--glass-border) bg-(--glass-surface) shadow-card`,
  подпись `text-[11px] uppercase tracking-[0.14em] text-muted-themed`, крупное число 44 px (48 px от
  `sm`) с пропорциональными цифрами; табличные цифры только в колонках.
* **Статус** это точка и текст (`shared/ui/status-text.tsx`); заливка-плашка только у категории AQI.
* **Шрифт** Onest; **иконки** lucide; **анимации** framer-motion, числа `@number-flow/react`.
  Любое движение уважает `prefers-reduced-motion`.
* **Метки поверхностей:** корневой элемент карточки получает атрибут `data-atmosphere-surface`:
  по нему сцена знает, где у карточки верхний край.

## 7. Сезонная тема «Атмосфера»

Три уровня: `off` (нет сцены и сезонной палитры), `calm` (палитра и статичное небо, без canvas),
`full` (частицы, конфетти, шейдер дождя на стекле на десктопе). Выбор пользователя хранится в
`localStorage` (`atmosphere-level`) и сильнее автоматики; без выбора действует потолок устройства
(`deviceCap`: reduced motion, экономия трафика, медленная сеть, мало памяти и ядер) и страж FPS
(`createFpsGovernor`, на сессию в `sessionStorage`).

* **Логика:** `entities/atmosphere/model/` (`calendar`, `weather`, `scene`, `tier`, `greeting-seen`),
  Open-Meteo в `entities/atmosphere/api/` (без ключа, кэш 15 минут, при ошибке сцена живёт без погоды).
* **Состояние страницы:** `features/atmosphere-settings/model/use-atmosphere.ts` (контекст читает
  переключатель в шапке и `AppShell`).
* **Отрисовка:** `shared/ui/atmosphere/`: `AtmosphereSky` (статичное небо), `AtmosphereStage` (canvas,
  грузится лениво только на `full`), `engine/` (два холста: фиксированный для падающих частиц и неба, и «декор» внутри документа,
  который скроллится вместе с карточками: снежные «шапки», гирлянды, иней, лепестки на краях; координаты
  граней хранятся относительно страницы, поэтому прокрутка их не сдвигает), `GlassShader` (ogl, лениво), `confetti.ts` (лениво).
* **Погода только на «Улице»;** «Аудитория» получает сезон и праздники. Температура для жары, мороза
  и выбора снег или дождь берётся с датчика станции, а когда он молчит, из `temperature_2m` Open-Meteo.
* **Тяжёлые чанки** (`ogl`, `canvas-confetti`, сцена) не попадают в основной бандл; не импортируйте их
  статически из основного кода.

## 8. Компоненты: откуда берутся

`components/ui/` содержит примитивы shadcn и скопированные из реестров компоненты: добавляются
командой `pnpm dlx shadcn@latest add @<реестр>/<имя>`, реестры в `components.json` (`@magicui`,
`@loading-ui`, `@react-bits`). После добавления проверьте: файл лежит в `src/components/ui/`, нет
лишних зависимостей в `package.json` (для анимаций у нас `framer-motion`, пакет `motion` не нужен),
иконки только lucide. Скопированный код правится под проект (типографика, токены, `eslint`).

## 9. Интернационализация и доступность

* Тексты только через i18n: `src/assets/locales/{ru,uz,en}/common.json`, новый ключ сразу во все три
  языка (тест проверяет соответствие). Узбекский на латинице с типографским апострофом `‘` (`bo‘lsin`).
* Минимум: видимый фокус, подписи `aria-label` у иконок-кнопок, `role="status"` у сообщений о состоянии,
  `aria-hidden` у декора, текст от 12 px, никакой информации только цветом.

## 10. Бюджеты и ограничения

* Основной бандл не растёт без причины; ECharts подключается по частям (`widgets/sensor-charts/lib`),
  графики грузятся лениво.
* Сцена: не более 120 частиц (60 на телефоне), DPR не выше 2, пауза на скрытой вкладке.
* Работает от 320 px без горизонтальной прокрутки страницы; проверять 320, 375, 768, 1440.

## 11. Как добавить

**Карточку значения:** чистая логика в `entities/` или `shared/lib/` с тестом, виджет в
`widgets/weather-summary/ui/`, токены цвета в `globals.css`, строки во все языки, режим `archive`
(`useConnection`, класс `vc-live`), метка `data-atmosphere-surface`, место в `DashboardLayout`.

**Датчик на графике:** тип в `entities/weather/model/weather.types.ts` (`SENSORS_BY_SOURCE`), ряд в
`widgets/sensor-charts/model/chart-series.ts`, порог в `weather-ranges.ts`, цвет серии в палитре
(контраст проверит тест), подписи в локалях.

**Страницу (например, карту):** страница в `pages/<имя>/ui/`, маршрут в
`app/providers/router/router.tsx` через `lazy`, константа в `shared/config/routes.ts`, пункт в
`widgets/topbar`. Новый домен: `entities/<имя>/` с `api/`, `model/` и тестами по образцу `entities/weather`.
Карта обязана использовать общий модуль шкал AQI и цвета `--aqi-*`, а не дублировать их.

**Состояния «нет данных»:** `null` это «нет показания», а не ноль; явная подпись (нет датчика, датчик
молчит), приглушённый вид в `archive`.

## 12. Чего не делать

Не пушить в `main`, не добавлять зависимости без нужды, не класть секреты в репозиторий, не
использовать `npm`, не править `pnpm-lock.yaml` руками, не обращаться к боевому серверу, не
дублировать пороги и цвета, не писать тексты без перевода, не импортировать вверх по слоям, не
отправлять скриншоты и данные пользователей наружу.

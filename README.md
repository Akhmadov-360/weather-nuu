# Weather NUU — Frontend

Веб-дашборд системы мониторинга микроклимата (weather.nuu.uz): текущие показания датчиков
с цветовыми зонами нормы, интерактивные графики за любой период, экспорт данных,
индикатор «датчик живой / данные устарели». Языки интерфейса: русский, узбекский, английский.

**Стек:** React 19, TypeScript, Vite, TanStack Query, ECharts, Tailwind CSS **v4**,
shadcn/ui (Radix), i18next, React Router.

## Проект целиком: репозитории и документы

Система состоит из двух репозиториев. **Этот README — единая точка входа для обоих**: здесь
запуск всей системы и карта документов, README бэкенда содержит только справочник по API.

| Репозиторий | Что внутри | Где читать |
|-------------|-----------|-----------|
| `weather-nuu` (этот) | веб-дашборд, карта, аналитика (React) | этот README, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| `weather-backend` | API, база, приём данных с датчиков (Node.js, Fastify, PostgreSQL) | README и `docs/ARCHITECTURE.md` бэкенда |

| Документ | Для кого и зачем |
|----------|-----------------|
| [docs/tasks/README.md](docs/tasks/README.md) | **участникам**: зоны, правила работы, календарь, задания |
| [CONTRIBUTING.md](CONTRIBUTING.md) | правила кода и pull request |
| [AGENTS.md](AGENTS.md) | ИИ-помощникам: что читать и чего не делать |
| [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md) | технический отчёт для диплома: проблемы, решения, замеры |

## Быстрый старт (локально, без доступа к серверу)

Нужно: **Node.js 20+**, **pnpm** (включается командой `corepack enable`) и **Docker Desktop**
для бэкенда. Два терминала.

**1. Бэкенд** (в папке репозитория `weather-backend`):

```bash
docker compose -f docker-compose.dev.yml --profile live up --build
```

Поднимется база с тестовыми данными, API на `localhost:8002` и «фейковые датчики»,
которые шлют показания каждые 5 секунд (подробности — в README бэкенда).

**2. Фронтенд** (в папке этого репозитория):

```bash
pnpm install
pnpm dev
```

Откройте http://localhost:5173 — дашборд покажет данные и статус LIVE.

Как это устроено: фронтенд обращается к `/api/...`, а Vite перенаправляет эти запросы на
локальный бэкенд (`vite.config.ts`) по тем же правилам, что nginx на боевом сервере.
Поэтому никаких проблем с CORS и ничего настраивать не нужно.

## Команды

| Команда | Что делает |
|---------|-----------|
| `pnpm dev` | dev-сервер с горячей перезагрузкой, http://localhost:5173 |
| `pnpm typecheck` | проверка типов (обязательна перед PR) |
| `pnpm lint` | ESLint |
| `pnpm test` | модульные тесты (Vitest); `pnpm test:watch` — режим наблюдения |
| `pnpm build` | проверка типов + боевая сборка в `dist/` |
| `pnpm preview` | посмотреть собранную версию |

## Настройки окружения

Файлы `.env.development` (для `pnpm dev`) и `.env.production` (для `pnpm build`) уже лежат в
репозитории и **не содержат секретов** — только адреса. Менять их обычно не нужно.

| Переменная | Назначение |
|-----------|-----------|
| `VITE_API_BASE_URL` | базовый адрес API (`/api` локально, полный адрес в проде) |
| `VITE_EXPORT_BASE_URL` | адрес для экспорта и агрегатов (если пусто — кнопка скачивания отключена) |
| `VITE_WS_URL` | адрес WebSocket (если пусто — данные идут только опросом) |
| `API_PROXY_TARGET` | куда Vite-прокси шлёт `/api` (по умолчанию `http://localhost:8002`) |

Свои значения — в файл `.env.local` (он в `.gitignore`), образец в `.env.example`.

## Структура (Feature-Sliced Design)

```
src/
  app/        провайдеры (query, i18n, тема, router, toaster), глобальные стили
  pages/      страницы: dashboard-room, dashboard-street, not-found
  widgets/    крупные блоки: dashboard-layout, weather-summary, time-card, sensor-charts, topbar
  features/   пользовательские сценарии: time-range-selector, date-range-picker,
              chart-selector, export-data, atmosphere-settings
  entities/   домены: weather (api/, model/: типы, пороги, связь), atmosphere (сезонная тема)
  shared/     http, конфиг, утилиты дат и форматирования, общие UI-компоненты
  components/ui/   примитивы shadcn/ui (button, dialog, radio-group, ...)
```

Правило зависимостей: слой может импортировать только из слоёв ниже
(pages → widgets → features → entities → shared). Новый домен-специфичный код — в `entities`.

Правила работы с кодом и PR — в [CONTRIBUTING.md](CONTRIBUTING.md).

## Параметры предпросмотра (только `pnpm dev`)

На `/room` и `/street`: `?time=18:20` (время), `?conn=archive|delayed` (состояния связи),
`?date=2026-12-31` (сезон и праздник), `?weather=rain` (погода сцены), `?level=full|calm|off`
(уровень сцены). В боевой сборке отключены. Подробнее — в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Важно знать

- **Tailwind v4.** Файла `tailwind.config.ts` нет: токены (цвета, радиусы, тени, шрифт) и свои
  утилиты (`dash-bg`, `text-*-themed`) описаны в `src/app/styles/globals.css` (`@theme`, `@utility`),
  тёмная тема — по классу `.dark` на `<html>`. Компоненты `shadcn add` написаны под v4 и работают как
  есть. Минимальные браузеры: Chrome 111, Safari 16.4, Firefox 128.
  Если у компонента shadcn есть вариант `data-horizontal:h-1`, а вы передаёте `h-2` через
  `className`, победит вариант — передавайте `data-horizontal:h-2`.
  Проверка «ничего не поехало» — `scripts/style-snapshot/` (снимок вычисленных стилей до/после).
- Тесты лежат рядом с кодом (`*.test.ts`). Меняете логику в `entities/` или `shared/lib/` — добавьте или обновите тест.
- Менеджер пакетов — **pnpm** (файл `pnpm-lock.yaml`). Не запускайте `npm install`.
- Цвета и пороги зон нормы — в одном месте: `src/shared/lib/weather-ranges.ts`.
- Все строки интерфейса — в `src/assets/locales/{ru,uz,en}/common.json`; добавляя текст,
  добавляйте ключ во все три файла.

## Если что-то не работает

| Симптом | Причина и решение |
|---------|-------------------|
| Страница «Не удалось загрузить данные» | не запущен бэкенд: проверьте http://localhost:8002/v1/health |
| `port 5173 is already in use` | порт занят — закройте другой Vite или запустите `pnpm dev --port 5180` |
| Бэкенд на другом порту | задайте `API_PROXY_TARGET=http://localhost:НОВЫЙ_ПОРТ` перед `pnpm dev` |
| Статус «данные устарели» | в БД нет свежих точек: запускайте бэкенд с `--profile live` (имитатор датчиков) |
| `corepack`/`pnpm` не найден | `corepack enable` (нужен Node 20+) или `npm i -g pnpm` |

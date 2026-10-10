# Weather NUU — Frontend

Веб-дашборд системы мониторинга микроклимата (weather.nuu.uz): текущие показания датчиков
с цветовыми зонами нормы, интерактивные графики за любой период, экспорт данных,
индикатор «датчик живой / данные устарели». Языки интерфейса: русский, узбекский, английский.

**Стек:** React 19, TypeScript, Vite, TanStack Query, ECharts, Tailwind CSS **v3**,
shadcn/ui (Radix), i18next, React Router.

Бэкенд — отдельный репозиторий `weather-backend`. Подробный технический отчёт по обеим частям:
[docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md).

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
  widgets/    крупные блоки: dashboard-layout, weather-summary, sensor-charts, topbar
  features/   пользовательские сценарии: time-range-selector, date-range-picker,
              chart-selector, export-data
  entities/   домен «weather»: api/ (запросы, WebSocket), model/ (типы, пороги, свежесть данных)
  shared/     http, конфиг, утилиты дат и форматирования, общие UI-компоненты
  components/ui/   примитивы shadcn/ui (button, dialog, radio-group, ...)
```

Правило зависимостей: слой может импортировать только из слоёв ниже
(pages → widgets → features → entities → shared). Новый домен-специфичный код — в `entities`.

## Важно знать

- **Tailwind здесь v3, а не v4.** Компоненты, сгенерированные `shadcn add`, нередко написаны под
  v4 (`data-checked:`, `data-open:`, `var(--radius-md)`) — на v3 такие классы молча не работают.
  Используйте v3-синтаксис: `data-[state=checked]:`, `rounded-md`. Проверяйте результат глазами.
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

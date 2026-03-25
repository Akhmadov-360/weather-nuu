# Weather NUU Frontend (React + TypeScript)

Современная основа для миграции учебного weather-dashboard проекта с vanilla JS на React.

## Stack
- React + TypeScript + Vite
- React Router
- TanStack Query
- Recharts
- Tailwind CSS + shadcn/ui-style primitives
- i18next + react-i18next

## Архитектура
Проект организован по слоям:
- `app` — провайдеры, глобальные стили, entrypoint
- `pages` — роутовые страницы (`room`, `street`, `404`)
- `widgets` — составные UI-блоки dashboard
- `features` — переключатель типа графика
- `entities` — weather-домен: типы, API, мапперы, карточки статистики
- `shared` — инфраструктура, ui-primitives, утилиты и config

## Быстрый старт
```bash
npm install
npm run dev
```

## Важные env-переменные
```bash
VITE_API_BASE_URL=https://example.com/api
VITE_ROOM_LATEST_PATH=/room/latest
VITE_ROOM_HISTORY_PATH=/room/history
VITE_STREET_LATEST_PATH=/street/latest
VITE_STREET_HISTORY_PATH=/street/history
VITE_LATEST_POLLING_MS=10000
```

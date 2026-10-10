# Tailwind v4 migration (PR 2): outline

Статус: набросок. Подробный пошаговый план пишется перед началом, после PR 1. Миграция идёт
отдельной веткой от обновлённого `main`, до интерфейсной части (PR 3).

## Зачем

Компоненты shadcn (`dialog`, `dropdown-menu`, `popover`, `tooltip`, `radio-group`, `button`) написаны
под v4. На v3 их стили `data-open:`, `data-closed:`, `data-checked:`, `var(--radius-md)` молча не
работают; часть мы уже обошли вручную. Карточки пыли и токены цветов AQI проще сразу писать в `@theme`.

## Что меняется (по официальному руководству v3 → v4)

- Зависимости: `tailwindcss@4`, плагин `@tailwindcss/vite`; убрать `postcss.config.js`, `autoprefixer`.
- `src/app/styles/globals.css`: вместо `@tailwind base/components/utilities` один `@import "tailwindcss"`;
  токены (`--status-*`, `--glass-*`, `--sensor-*`, радиусы, тени) переезжают в `@theme`.
- `tailwind.config.ts` удаляется; кастомные цвета и утилиты (`status-*`, `rounded-card`, `shadow-card`,
  `text-primary-themed`, `text-muted-themed` и др.) переносятся в `@theme` и `@utility`.
- Тёмная тема: переопределить вариант `dark` под текущий механизм (класс `.dark`).
- Изменившиеся умолчания: ширина `ring`, цвет границ, масштаб теней и скруглений (`shadow-sm` →
  `shadow-xs` и т. п.), удалённые `bg-opacity-*`; проходим автоматическим инструментом
  `npx @tailwindcss/upgrade`, затем вручную.
- Вернуть в shadcn-компоненты варианты v4 (`data-open:`, `data-closed:`) и убрать наши обходные правки.

## Риски и проверка

- Визуальных тестов нет: до и после делаем скриншоты Room и Street, светлая и тёмная тема, ширины
  1440, 768, 375, диалог выбора месяцев, меню «Скачать», календарь, все вкладки графика.
- Совместимость браузеров v4: Chrome 111+, Safari 16.4+, Firefox 128+.
- Проверки перед PR: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, сборка работает на
  локальном стеке, консоль без ошибок.
- Откат прост: PR откатывается целиком, данные и API не затронуты.

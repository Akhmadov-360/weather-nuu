// Базовый адрес API. Локально это "/api" (Vite-прокси на localhost:8002, см.
// vite.config.ts), для боевой сборки — полный адрес сервера (.env.production).
// Если переменная не задана, остаётся боевой адрес, как было раньше.
const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "https://weather.nuu.uz/api"
).replace(/\/$/, "");

export const ENV = {
  latestPollingMs: 10_000,
  historyPollingMs: 5 * 60_000, // 5 минут — полный refetch истории

  endpoints: {
    room: {
      latest: `${API_BASE}/room/latest`,
      history: `${API_BASE}/room/all`,
    },
    street: {
      latest: `${API_BASE}/street/latest`,
      history: `${API_BASE}/street/all`,
    },
  },

  // Не задано по умолчанию — текущий production-бэк (weather.nuu.uz)
  // ещё не отдаёт WebSocket, только новый Fastify-бэк (apps/api,
  // /v1/ws/sensors) после деплоя. useWeatherSocket сам не подключается,
  // если это пусто — поллинг остаётся единственным источником данных.
  wsUrl: (import.meta.env.VITE_WS_URL as string | undefined) || null,

  // Тот же принцип — старый бэк не умеет отдавать CSV/ndjson-экспорт с
  // gap-маркерами вообще, эта возможность есть только в новом apps/api
  // (/v1/export/:source). Пока не задеплоен — null, кнопка скачивания
  // выключается сама, без падений.
  exportBaseUrl: (import.meta.env.VITE_EXPORT_BASE_URL as string | undefined) || null,
} as const;

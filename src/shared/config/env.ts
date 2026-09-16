export const ENV = {
  latestPollingMs: 10_000,
  historyPollingMs: 5 * 60_000, // 5 минут — полный refetch истории

  endpoints: {
    room: {
      latest: "https://weather.nuu.uz/api/room/latest",
      history: "https://weather.nuu.uz/api/room/all",
    },
    street: {
      latest: "https://weather.nuu.uz/api/street/latest",
      history: "https://weather.nuu.uz/api/street/all",
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

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
} as const;

export const ENV = {
  latestPollingMs: 2000,

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

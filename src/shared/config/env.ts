export const ENV = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://example.com/api',
  roomLatestPath: import.meta.env.VITE_ROOM_LATEST_PATH ?? '/room/latest',
  roomHistoryPath: import.meta.env.VITE_ROOM_HISTORY_PATH ?? '/room/history',
  streetLatestPath: import.meta.env.VITE_STREET_LATEST_PATH ?? '/street/latest',
  streetHistoryPath: import.meta.env.VITE_STREET_HISTORY_PATH ?? '/street/history',
  latestPollingMs: Number(import.meta.env.VITE_LATEST_POLLING_MS ?? 10_000),
} as const;

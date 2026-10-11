import { createContext, useContext, useEffect, useState } from 'react';

import { computeConnection, LIVE_CONNECTION, type ConnectionState } from './connection';
import type { WeatherHistoryItem } from './weather.types';

const ConnectionContext = createContext<ConnectionState>(LIVE_CONNECTION);

export const ConnectionProvider = ConnectionContext.Provider;

/** What every card needs to know about the feed: how old the last reading is and whether the link works. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConnection(): ConnectionState {
  return useContext(ConnectionContext);
}

function useBrowserOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

/** Recomputed every 10 s so ages and levels move on without a new reading arriving. `apiFailing`: the last request failed. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConnectionState(history: WeatherHistoryItem[] | undefined, apiFailing: boolean): ConnectionState {
  const online = useBrowserOnline();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return computeConnection(history ?? [], now, online && !apiFailing);
}

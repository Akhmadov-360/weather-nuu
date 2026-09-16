import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ENV } from '@/shared/config/env';
import { appendHistoryPoint } from '../model/append-history-point';
import { mapWeatherLatest } from '../model/weather.mapper';
import type { WeatherPageType } from '@/shared/types/common';
import type { WeatherHistoryItem } from '../model/weather.types';

const RECONNECT_DELAY_MS = 3000;

function isSensorUpdate(parsed: unknown, source: WeatherPageType): unknown | null {
  if (typeof parsed !== 'object' || parsed === null) return null;
  if ((parsed as { type?: unknown }).type !== 'sensor.update') return null;
  const payload = (parsed as { payload?: unknown }).payload;
  if (typeof payload !== 'object' || payload === null) return null;
  if ((payload as { source?: unknown }).source !== source) return null;
  return payload;
}

/**
 * Подписывается на push-обновления с /v1/ws/sensors (apps/api) и пишет их
 * в тот же react-query кэш, что и REST-поллинг — компоненты не знают,
 * откуда пришли данные, ECharts и Slider реагируют на любое изменение
 * `latest`/`history` одинаково.
 *
 * useLatestWeatherQuery (поллинг) остаётся включённым и работающим —
 * это осознанный safety net: WS может быть недоступен (ENV.wsUrl не
 * задан, пока новый бэк не задеплоен) или обрываться, тогда данные всё
 * равно идут через поллинг, просто на латентности poll-интервала.
 */
export function useWeatherSocket(type: WeatherPageType): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ENV.wsUrl) return;

    // A monotonically increasing generation guards against a stale retry
    // outliving a server restart: if the socket was briefly unreachable
    // (killed and restarted) several queued `onerror`/`onclose` retries
    // can each independently succeed, leaving more than one live socket
    // pushing into the same cache — observed as duplicate/overlapping
    // points in the chart during manual reconnect testing. Only the
    // latest generation's reconnect attempts are allowed to proceed.
    let generation = 0;
    let currentSocket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let stopped = false;

    function connect() {
      const myGeneration = ++generation;
      currentSocket?.close();

      const socket = new WebSocket(ENV.wsUrl!);
      currentSocket = socket;

      socket.onmessage = (event) => {
        if (stopped || myGeneration !== generation) return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data as string);
        } catch {
          return; // malformed frame — ignore, polling will catch up
        }

        const payload = isSensorUpdate(parsed, type);
        if (!payload) return;

        let latest;
        try {
          latest = mapWeatherLatest(payload);
        } catch {
          return;
        }

        queryClient.setQueryData(['weather', type, 'latest'], latest);
        queryClient.setQueryData<WeatherHistoryItem[]>(['weather', type, 'history'], (prev) =>
          appendHistoryPoint(prev, latest),
        );
      };

      socket.onclose = () => {
        if (stopped || myGeneration !== generation) return;
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      stopped = true;
      generation++; // invalidates any in-flight reconnect from this instance
      window.clearTimeout(reconnectTimer);
      currentSocket?.close();
    };
  }, [type, queryClient]);
}

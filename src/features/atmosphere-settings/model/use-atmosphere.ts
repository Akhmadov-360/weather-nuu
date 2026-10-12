import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useOpenMeteoWeather } from '@/entities/atmosphere/api/use-weather';
import { dateFromParam, weatherFromParam } from '@/entities/atmosphere/model/dev-preview';
import { describeScene, type AtmosphereScene } from '@/entities/atmosphere/model/scene';
import { deviceCap, effectiveLevel, type DeviceSignals, type Level } from '@/entities/atmosphere/model/tier';
import { useLatestWeatherQuery } from '@/entities/weather/api/weather.queries';
import type { WeatherPageType } from '@/shared/types/common';

const CHOICE_KEY = 'atmosphere-level';
const GOVERNOR_KEY = 'atmosphere-governor-drop';
/** A reading older than this no longer says what the street is like: the weather service takes over. */
const FRESH_SENSOR_MS = 10 * 60_000;

const LEVELS: readonly Level[] = ['off', 'calm', 'full'];
const isLevel = (v: unknown): v is Level => LEVELS.includes(v as Level);

function readChoice(): Level | null {
  try {
    const v = localStorage.getItem(CHOICE_KEY);
    return isLevel(v) ? v : null;
  } catch {
    return null;
  }
}

function readGovernorDrop(): boolean {
  try {
    return sessionStorage.getItem(GOVERNOR_KEY) === '1';
  } catch {
    return false;
  }
}

type NavigatorExtras = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };

function readSignals(): DeviceSignals {
  const nav = navigator as NavigatorExtras;
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: nav.connection?.saveData === true,
    effectiveType: nav.connection?.effectiveType,
    memoryGb: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    isPhone: window.matchMedia('(max-width: 639px)').matches,
  };
}

export type AtmosphereState = {
  /** What actually runs. */
  level: Level;
  /** Null when the level is off. */
  scene: AtmosphereScene | null;
  /** The user's own choice; null means "automatic". */
  userChoice: Level | null;
  setUserChoice: (level: Level | null) => void;
  /** Why an automatic level is lower than full, for the hint in the control. */
  limitedBy: 'device' | 'governor' | null;
  isPhone: boolean;
  /** Called by the stage when frames keep dropping: lowers an automatic level for this session. */
  dropForSession: () => void;
};

/**
 * The state of the seasonal scene for one page: the user's choice, the
 * device's ceiling, the scene built from the calendar, real weather (street
 * only) and the street sensor. In development `?date=`, `?weather=` and
 * `?level=` override the inputs for review.
 */
export function useAtmosphere(source: WeatherPageType): AtmosphereState {
  const [params] = useSearchParams();
  const [userChoice, setChoice] = useState<Level | null>(readChoice);
  const [governorDrop, setGovernorDrop] = useState<boolean>(readGovernorDrop);
  const [signals, setSignals] = useState<DeviceSignals>(readSignals);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const phone = window.matchMedia('(max-width: 639px)');
    const update = () => setSignals(readSignals());
    motion.addEventListener('change', update);
    phone.addEventListener('change', update);
    return () => {
      motion.removeEventListener('change', update);
      phone.removeEventListener('change', update);
    };
  }, []);

  const devLevel = import.meta.env.DEV ? params.get('level') : null;
  const cap = deviceCap(signals);
  const level: Level = isLevel(devLevel) ? devLevel : effectiveLevel(userChoice, cap, governorDrop);

  const street = source === 'street';
  const latest = useLatestWeatherQuery(source).data;
  const liveWeather = useOpenMeteoWeather(street && level !== 'off');
  const weather = (import.meta.env.DEV ? weatherFromParam(params.get('weather')) : null) ?? liveWeather ?? null;

  const lastReading = latest ? Date.parse(latest.date) : NaN;
  const sensorFresh = Number.isFinite(lastReading) && Date.now() - lastReading < FRESH_SENSOR_MS;
  const streetTemp = street && latest && sensorFresh ? latest.temp : null;

  const devDate = import.meta.env.DEV ? dateFromParam(params.get('date')) : null;
  const minute = Math.floor(Date.now() / 60_000);
  const scene = useMemo(
    () => (level === 'off' ? null : describeScene({ date: devDate ?? new Date(), source, weather, streetTemp })),
    // `minute` re-evaluates the calendar once a minute without a timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, devDate, source, weather, streetTemp, minute],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (scene) {
      root.dataset.season = scene.season;
      if (scene.event) root.dataset.event = scene.event;
      else delete root.dataset.event;
    } else {
      delete root.dataset.season;
      delete root.dataset.event;
    }
  }, [scene]);

  const setUserChoice = useCallback((next: Level | null) => {
    setChoice(next);
    try {
      if (next === null) localStorage.removeItem(CHOICE_KEY);
      else localStorage.setItem(CHOICE_KEY, next);
    } catch {
      // Storage can be blocked (private window): the choice then lasts until the tab closes.
    }
  }, []);

  const dropForSession = useCallback(() => {
    setGovernorDrop(true);
    try {
      sessionStorage.setItem(GOVERNOR_KEY, '1');
    } catch {
      // Same as above.
    }
  }, []);

  const limitedBy = userChoice !== null ? null : governorDrop && cap === 'full' ? 'governor' : cap !== 'full' ? 'device' : null;

  return { level, scene, userChoice, setUserChoice, limitedBy, isPhone: signals.isPhone, dropForSession };
}

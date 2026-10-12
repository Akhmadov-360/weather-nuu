import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { loadSeen, markGreetingSeen, shouldShowGreeting } from '@/entities/atmosphere/model/greeting-seen';
import type { EventId } from '@/entities/atmosphere/model/calendar';
import { createFpsGovernor, particleBudget } from '@/entities/atmosphere/model/tier';
import { ROOM_CONFIG, STREET_CONFIG } from '@/entities/weather/model/weather.constants';
import { ROUTES } from '@/shared/config/routes';
import { useTheme } from '@/shared/hooks/useTheme';
import { AtmosphereSky } from '@/shared/ui/atmosphere/AtmosphereSky';
import { burstConfetti } from '@/shared/ui/atmosphere/confetti';
import { GreetingBar } from '@/widgets/topbar/ui/GreetingBar';
import { AtmosphereProvider } from '@/features/atmosphere-settings/model/atmosphere-context';
import { useAtmosphere } from '@/features/atmosphere-settings/model/use-atmosphere';
import { TopBar } from '@/widgets/topbar/ui/TopBar';

const GlassShader = lazy(() => import('@/shared/ui/atmosphere/GlassShader'));
const GREETING_KEY = 'atmosphere-greetings';
const AtmosphereStage = lazy(() => import('@/shared/ui/atmosphere/AtmosphereStage'));

/**
 * Shared frame of the dashboard pages. The header lives here, not in each
 * page, so switching Room <-> Street keeps the same header element and only
 * its title changes.
 */
export function AppShell(): React.JSX.Element {
  const { pathname } = useLocation();
  const config = pathname === ROUTES.street ? STREET_CONFIG : ROOM_CONFIG;
  const atmosphere = useAtmosphere(config.key);
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const { scene, level, isPhone, userChoice, setUserChoice, dropForSession, today } = atmosphere;

  // Frame times go to the governor; when it calls for a lighter scene the level steps down and the user is told.
  const governor = useRef(createFpsGovernor());
  const dropped = useRef(false);
  const onFrame = useCallback(
    (frameMs: number) => {
      if (dropped.current || governor.current.sample(frameMs) !== 'drop') return;
      dropped.current = true;
      if (userChoice === null) dropForSession();
      toast(t('atm_governor_toast'), {
        action: { label: t('atm_governor_restore'), onClick: () => setUserChoice('full') },
      });
    },
    [dropForSession, setUserChoice, t, userChoice],
  );
  const layers = useMemo(() => scene?.layers ?? [], [scene]);
  // Rain on the glass: the full level, on a desktop, when real rain falls (never for the classroom's seasonal scene).
  const rain = layers.find((l) => l.kind === 'rain');
  const showGlass = level === 'full' && !isPhone && Boolean(rain) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A holiday greeting shows once a day per event (it is counted as seen the moment it appears); confetti only on the full level.
  const [greeting, setGreeting] = useState<EventId | null>(null);
  const greetingEvent = level === 'off' ? null : (scene?.greeting ?? null);
  useEffect(() => {
    if (!greetingEvent) {
      setGreeting(null);
      return;
    }
    let seen = {};
    try {
      seen = loadSeen(localStorage.getItem(GREETING_KEY));
    } catch {
      // Blocked storage: the greeting simply shows on every visit.
    }
    if (!shouldShowGreeting(greetingEvent, today, seen)) return;
    setGreeting(greetingEvent);
    try {
      localStorage.setItem(GREETING_KEY, JSON.stringify(markGreetingSeen(greetingEvent, today, seen)));
    } catch {
      // Same as above.
    }
    if (level === 'full' && scene?.confetti && (greetingEvent === 'navruz' || greetingEvent === 'independence' || greetingEvent === 'new_year')) {
      void burstConfetti(greetingEvent);
    }
    // `scene` and `level` are read only to decide on the confetti; the greeting is keyed to the event and the day.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetingEvent, today]);

  return (
    <AtmosphereProvider value={atmosphere}>
    <div className="relative min-h-screen overflow-hidden text-primary-themed">
      <div className="dash-bg absolute inset-0" />
      {scene ? <AtmosphereSky cloud={scene.sky.cloud} /> : null}
      {showGlass && rain ? (
        <Suspense fallback={null}>
          <GlassShader amount={Math.min(1, 0.25 + rain.intensity * 0.6)} dark={resolvedTheme === 'dark'} />
        </Suspense>
      ) : null}
      {scene && level === 'full' ? (
        <Suspense fallback={null}>
          <AtmosphereStage layers={layers} budget={particleBudget(level, isPhone)} dark={resolvedTheme === 'dark'} lights={scene.lights} onFrame={onFrame} />
        </Suspense>
      ) : null}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {greeting ? <GreetingBar event={greeting} onClose={() => setGreeting(null)} /> : null}
        <TopBar
          titleKey={config.titleKey}
          sectionKey={config.navKey}
          switchPath={config.oppositePath}
          switchLabelKey={config.oppositeNavKey}
        />
        <Outlet />
      </div>
    </div>
    </AtmosphereProvider>
  );
}

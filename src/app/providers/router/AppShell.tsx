import { Outlet, useLocation } from 'react-router-dom';

import { ROOM_CONFIG, STREET_CONFIG } from '@/entities/weather/model/weather.constants';
import { ROUTES } from '@/shared/config/routes';
import { TopBar } from '@/widgets/topbar/ui/TopBar';

/**
 * Shared frame of the dashboard pages. The header lives here, not in each
 * page, so switching Room <-> Street keeps the same header element and only
 * its title changes.
 */
export function AppShell(): React.JSX.Element {
  const { pathname } = useLocation();
  const config = pathname === ROUTES.street ? STREET_CONFIG : ROOM_CONFIG;

  return (
    <div className="relative min-h-screen overflow-hidden text-primary-themed">
      <div className="dash-bg absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <TopBar
          titleKey={config.titleKey}
          sectionKey={config.navKey}
          switchPath={config.oppositePath}
          switchLabelKey={config.oppositeNavKey}
        />
        <Outlet />
      </div>
    </div>
  );
}

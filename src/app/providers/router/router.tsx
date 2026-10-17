import { lazy, Suspense } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { PageLoader } from '@/shared/ui/page-loader';
import { AppShell } from './AppShell';

const DashboardRoomPage = lazy(() => import('@/pages/dashboard-room/ui/DashboardRoomPage'));
const DashboardStreetPage = lazy(() => import('@/pages/dashboard-street/ui/DashboardStreetPage'));
const MapPage = lazy(() => import('@/pages/map/ui/MapPage'));
const AnalyticsPage = lazy(() => import('@/pages/analytics/ui/AnalyticsPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/ui/NotFoundPage'));

const withSuspense = (component: React.JSX.Element): React.JSX.Element => (
  <Suspense fallback={<PageLoader />}>{component}</Suspense>
);

export const appRouter = createBrowserRouter([
  {
    path: ROUTES.root,
    element: <Navigate to={ROUTES.room} replace />,
  },
  {
    // The header lives in the shell, so it stays mounted when the page changes.
    element: <AppShell />,
    children: [
      { path: ROUTES.room, element: withSuspense(<DashboardRoomPage />) },
      { path: ROUTES.street, element: withSuspense(<DashboardStreetPage />) },
      { path: ROUTES.map, element: withSuspense(<MapPage />) },
      { path: ROUTES.analytics, element: withSuspense(<AnalyticsPage />) },
    ],
  },
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
  },
]);

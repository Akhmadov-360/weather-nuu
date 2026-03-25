import { lazy, Suspense } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { PageLoader } from '@/shared/ui/page-loader';

const DashboardRoomPage = lazy(() => import('@/pages/dashboard-room/ui/DashboardRoomPage'));
const DashboardStreetPage = lazy(() => import('@/pages/dashboard-street/ui/DashboardStreetPage'));
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
    path: ROUTES.room,
    element: withSuspense(<DashboardRoomPage />),
  },
  {
    path: ROUTES.street,
    element: withSuspense(<DashboardStreetPage />),
  },
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
  },
]);

import { RouterProvider } from 'react-router-dom';
import { appRouter } from '@/app/providers/router/router';

export function App(): React.JSX.Element {
  return <RouterProvider router={appRouter} />;
}

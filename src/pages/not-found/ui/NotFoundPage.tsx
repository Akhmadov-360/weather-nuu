import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { ROUTES } from '@/shared/config/routes';

export default function NotFoundPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Button asChild>
        <Link to={ROUTES.room}>Go to dashboard</Link>
      </Button>
    </main>
  );
}

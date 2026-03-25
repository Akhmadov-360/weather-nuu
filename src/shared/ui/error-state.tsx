import { Button } from '@/shared/ui/button';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
      <p className="mb-4 text-sm text-destructive">{message ?? 'Failed to load data'}</p>
      {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

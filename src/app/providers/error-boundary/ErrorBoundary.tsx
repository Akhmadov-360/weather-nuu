import { Component, type ErrorInfo, type ReactNode } from 'react';
import { i18n } from '@/app/providers/i18n/i18n';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { ErrorState } from '@/shared/ui/error-state';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors anywhere below it so a bug in one widget doesn't
 * take down the whole page with React's default white screen. Class
 * component because getDerivedStateFromError/componentDidCatch have no
 * hook equivalent yet.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="dash-bg flex min-h-screen items-center justify-center p-4">
          <GlassPanel className="w-full max-w-md p-6">
            <ErrorState message={i18n.t('error_boundary_title')} onRetry={this.handleReset} />
          </GlassPanel>
        </div>
      );
    }
    return this.props.children;
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { ErrorBoundary } from '@/app/providers/error-boundary/ErrorBoundary';
import { QueryProvider } from '@/app/providers/query-client/QueryProvider';
import { ThemeProvider } from '@/app/providers/theme/ThemeProvider';
import { AppToaster } from '@/app/providers/toaster/AppToaster';
import '@/app/providers/i18n/i18n';
import '@/app/styles/globals.css';
import { TooltipProvider } from '../components/ui/tooltip';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <TooltipProvider>
            <App />
            <AppToaster />
          </TooltipProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

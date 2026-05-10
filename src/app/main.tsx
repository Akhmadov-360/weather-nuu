import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { QueryProvider } from '@/app/providers/query-client/QueryProvider';
import { ThemeProvider } from '@/app/providers/theme/ThemeProvider';
import '@/app/providers/i18n/i18n';
import '@/app/styles/globals.css';
import { TooltipProvider } from '../components/ui/tooltip';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>,
);

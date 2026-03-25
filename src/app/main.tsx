import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { QueryProvider } from '@/app/providers/query-client/QueryProvider';
import '@/app/providers/i18n/i18n';
import '@/app/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
);

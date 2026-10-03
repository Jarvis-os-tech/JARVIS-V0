import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from './components/ErrorBoundary';

function RootApp() {
  useEffect(() => {
    try {
      localStorage.removeItem('jarvis_ui_mode');
    } catch (_) {}
  }, []);

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <App />
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);

registerServiceWorker();

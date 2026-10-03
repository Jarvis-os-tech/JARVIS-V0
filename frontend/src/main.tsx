import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import { Toaster } from 'sonner';

function RootApp() {
  useEffect(() => {
    try {
      localStorage.removeItem('jarvis_ui_mode');
    } catch (_) {}
  }, []);

  return (
    <>
      <App />
      <Toaster position="bottom-right" richColors />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);

registerServiceWorker();

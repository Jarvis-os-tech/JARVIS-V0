import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { JarvisApp } from './components/jarvis/JarvisApp';
import './aurora.css';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import { Toaster } from 'sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JarvisApp />
    <Toaster position="bottom-right" richColors />
  </StrictMode>,
);

registerServiceWorker();

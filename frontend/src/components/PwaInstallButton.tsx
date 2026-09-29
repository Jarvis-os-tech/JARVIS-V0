import React, { useState, useEffect } from 'react';
import { Download, Check, Share, PlusSquare, X, MonitorCheck, Smartphone } from 'lucide-react';
import { isStandalone } from '../serviceWorkerRegistration';

export const PwaInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for beforeinstallprompt event (Linux Chrome, Android, Edge, Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[JARVIS PWA] beforeinstallprompt captured');
      setDeferredPrompt(e);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('[JARVIS PWA] Application successfully installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      console.log('[JARVIS PWA] User choice:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      setShowInfoModal(true);
    }
  };

  // If already running standalone, show subtle green indicator or hide on narrow screens
  if (isInstalled) {
    return (
      <div
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
        title="Running in Standalone PWA Mode (Linux / Mobile)"
      >
        <MonitorCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>PWA ACTIVE</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-mono font-semibold tracking-wider text-cyan-300 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 hover:from-cyan-900/70 hover:to-blue-900/70 border border-cyan-400/40 hover:border-cyan-300 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_22px_rgba(6,182,212,0.4)] cursor-pointer group shrink-0"
        title="Install J.A.R.V.I.S. as a native app on Linux or Mobile"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
        <span className="hidden sm:inline">INSTALL APP</span>
        <span className="sm:hidden">APP</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#040c1a] border border-cyan-500/40 rounded-2xl p-5 shadow-[0_0_40px_rgba(6,182,212,0.25)] text-slate-100 font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>INSTALL ON IOS</span>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Install J.A.R.V.I.S. on your iPhone or iPad for fullscreen mode and background audio:
            </p>

            <ol className="text-xs space-y-2.5 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                <span>Tap the <strong className="text-cyan-300">Share</strong> icon <Share className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> at bottom of Safari</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                <span>Scroll down and tap <strong className="text-cyan-300">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                <span>Launch <strong className="text-cyan-300">J.A.R.V.I.S.</strong> directly from your Home Screen</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* Linux / Desktop Info Modal (if beforeinstallprompt didn't trigger automatically) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#040c1a] border border-cyan-500/40 rounded-2xl p-5 shadow-[0_0_40px_rgba(6,182,212,0.25)] text-slate-100 font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Download className="w-4 h-4 text-cyan-400" />
                <span>INSTALL J.A.R.V.I.S. PWA</span>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              J.A.R.V.I.S. supports full standalone PWA operation on Linux (Chrome / Chromium / Edge / Brave) and Android:
            </p>

            <ul className="text-xs space-y-2 text-slate-300 list-disc list-inside">
              <li>Look for the <strong className="text-cyan-300">Install icon</strong> in your browser's address bar (right side).</li>
              <li>Or click the browser menu <strong className="text-cyan-300">(⋮) → "Save and share" → "Install J.A.R.V.I.S."</strong>.</li>
              <li>On Linux, this integrates directly into your desktop application launcher (GNOME, KDE, Wayland) with the Arc-Reactor icon.</li>
            </ul>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}
    </>
  );
};

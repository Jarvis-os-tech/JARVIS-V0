import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Terminal,
  Globe,
  Lock
} from 'lucide-react';

interface OAuthTroubleshooterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OAuthTroubleshooterModal: React.FC<OAuthTroubleshooterModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'redirect' | 'publishing' | 'testusers'>('redirect');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentDevOrigin = window.location.origin;
  const firebaseHandler = 'https://gen-lang-client-0509942846.firebaseapp.com/__/auth/handler';
  const devAppUrl = 'https://ais-dev-zsu33xgoebp5uutq6m5ikv-83765131071.asia-southeast1.run.app';
  const preAppUrl = 'https://ais-pre-zsu33xgoebp5uutq6m5ikv-83765131071.asia-southeast1.run.app';

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-[0_0_80px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide flex items-center gap-2">
                GOOGLE CLOUD OAUTH CONFIGURATION &amp; RESOLUTION GUIDE
              </h2>
              <p className="text-[11px] text-cyan-400 font-mono">
                Resolving Error 400 (redirect_uri_mismatch) &amp; Error 403 (access_denied)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('redirect')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'redirect'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            1. Fix Error 400 (Redirect URIs)
          </button>

          <button
            onClick={() => setActiveTab('publishing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'publishing'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            2. Transition to Production
          </button>

          <button
            onClick={() => setActiveTab('testusers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'testusers'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            3. Testing Mode (Alternative)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-slate-200 text-xs leading-relaxed">
          
          {/* TAB 1: FIX ERROR 400 (REDIRECT_URI_MISMATCH) */}
          {activeTab === 'redirect' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-amber-300 font-mono">
                    Cause of Error 400: redirect_uri_mismatch
                  </div>
                  <p className="text-slate-300 text-xs">
                    Firebase Google Auth uses a dedicated authentication handler path (<code className="text-amber-300 font-mono">/__/auth/handler</code>). If the exact URI with the handler suffix is missing or truncated in your OAuth Web Client, Google blocks the sign-in with Error 400.
                  </p>
                </div>
              </div>

              {/* Action Link to Google Cloud Console Credentials */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-700">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-white text-xs font-bold">
                    Step 1: Open Google Cloud Console Credentials
                  </span>
                </div>
                <a
                  href="https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0509942846"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  Open Credentials <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Exact Copyable URIs */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                  <span>Step 2: Edit your Web client &amp; paste these EXACT URIs:</span>
                </div>

                {/* Redirect URI 1: Firebase Handler (CRITICAL) */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-amber-300 font-bold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Mandatory Authorized redirect URI (Handler):
                    </span>
                    <button
                      onClick={() => copyToClipboard(firebaseHandler, 'handler')}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono flex items-center gap-1 transition-colors"
                    >
                      {copiedField === 'handler' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === 'handler' ? 'Copied!' : 'Copy URI'}
                    </button>
                  </div>
                  <code className="text-xs font-mono text-cyan-300 bg-black/60 p-2 rounded-lg break-all border border-slate-800 select-all">
                    {firebaseHandler}
                  </code>
                </div>

                {/* Additional App URIs */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-300">
                      Authorized JavaScript Origins:
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${devAppUrl}\n${preAppUrl}\nhttps://gen-lang-client-0509942846.firebaseapp.com`, 'origins')}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono flex items-center gap-1 transition-colors"
                    >
                      {copiedField === 'origins' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === 'origins' ? 'Copied All' : 'Copy All'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <code className="text-[11px] font-mono text-slate-300 bg-black/60 p-1.5 rounded block break-all border border-slate-800">
                      {devAppUrl}
                    </code>
                    <code className="text-[11px] font-mono text-slate-300 bg-black/60 p-1.5 rounded block break-all border border-slate-800">
                      {preAppUrl}
                    </code>
                    <code className="text-[11px] font-mono text-slate-300 bg-black/60 p-1.5 rounded block break-all border border-slate-800">
                      https://gen-lang-client-0509942846.firebaseapp.com
                    </code>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Click <strong>SAVE</strong> at the bottom of the Google Cloud page and wait ~30 seconds for propagation.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP TRANSITION TO PRODUCTION */}
          {activeTab === 'publishing' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-3">
                <Globe className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-cyan-300 font-mono">
                    Transitioning OAuth Consent Screen: Testing &rarr; Production
                  </div>
                  <p className="text-slate-300 text-xs">
                    Switching your OAuth consent screen to <strong>Production</strong> removes the 403 &quot;User not approved / Testing mode&quot; restriction, allowing any user account to authenticate.
                  </p>
                </div>
              </div>

              {/* Step by step cards */}
              <div className="space-y-3">
                
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono text-xs flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">1</span>
                      Open the OAuth Consent Screen
                    </span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0509942846"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] flex items-center gap-1"
                    >
                      Console Page <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-400 text-xs">
                    Navigate to <strong>APIs &amp; Services &gt; OAuth consent screen</strong> in project <code className="text-cyan-300">gen-lang-client-0509942846</code>.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono text-xs flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">2</span>
                      Click &quot;PUBLISH APP&quot;
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    Under the <strong>Publishing status</strong> card at the top, click the button labeled <strong>PUBLISH APP</strong>.
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                    Status: <span className="text-amber-400 font-bold">Testing</span> &rarr; Click <span className="text-cyan-400 font-bold">[PUBLISH APP]</span> &rarr; Status: <span className="text-emerald-400 font-bold">In production</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono text-xs flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">3</span>
                      Confirm Verification Notice
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    A modal will appear: <em>&quot;Push to production? Because your app uses sensitive scopes (Gmail/Calendar), it may show an Unverified App screen until verified.&quot;</em> Click <strong>CONFIRM</strong>.
                  </p>
                </div>

                {/* Step 4: Signing in with Unverified Screen */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono text-xs flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">4</span>
                      How to Bypass &quot;Google hasn&apos;t verified this app&quot; Popup
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs">
                    When you sign in with your Google account, Google may show a warning screen.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] font-mono">
                    <li>Click <strong className="text-cyan-300">&quot;Advanced&quot;</strong> in the bottom left corner.</li>
                    <li>Click <strong className="text-cyan-300">&quot;Go to gen-lang-client-0509942846 (unsafe)&quot;</strong>.</li>
                    <li>Check the permissions boxes and click <strong className="text-emerald-300">&quot;Continue&quot;</strong>.</li>
                  </ol>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: TESTING MODE ALTERNATIVE */}
          {activeTab === 'testusers' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-emerald-300 font-mono">
                    Testing Mode with Explicit Test Users
                  </div>
                  <p className="text-slate-300 text-xs">
                    If you prefer keeping the OAuth consent screen in <strong>Testing</strong> mode, you simply need to add your personal email addresses as approved test users.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                  <span className="font-bold text-white font-mono text-xs">
                    1. Open OAuth Consent Screen
                  </span>
                  <a
                    href="https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0509942846"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-xs"
                  >
                    Open OAuth Consent Screen in Cloud Console <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                  <span className="font-bold text-white font-mono text-xs">
                    2. Add Your Emails to &quot;Test Users&quot;
                  </span>
                  <p className="text-slate-400 text-xs">
                    Scroll down to the <strong>Test users</strong> section and click <strong>+ ADD USERS</strong>.
                  </p>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-slate-800">
                      <code className="text-xs text-cyan-300 font-mono">sgjarvisos@gmail.com</code>
                      <button
                        onClick={() => copyToClipboard('sgjarvisos@gmail.com', 'email1')}
                        className="text-[10px] text-slate-400 hover:text-white font-mono"
                      >
                        {copiedField === 'email1' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-slate-800">
                      <code className="text-xs text-cyan-300 font-mono">ppenchalagopi@gmail.com</code>
                      <button
                        onClick={() => copyToClipboard('ppenchalagopi@gmail.com', 'email2')}
                        className="text-[10px] text-slate-400 hover:text-white font-mono"
                      >
                        {copiedField === 'email2' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-400 text-[11px] font-mono pt-1">
                    Click <strong>SAVE</strong>. Your accounts will now have instant authorization without 403 blocks.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            J.A.R.V.I.S. OAuth Diagnostic &amp; Guide Matrix
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            Got It, Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};

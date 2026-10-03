import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Cpu } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[J.A.R.V.I.S. Core Exception]', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#060a12] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_50%_-10%,#0c1829,#060a12_65%)] pointer-events-none" />
          <div className="hud-grid absolute inset-0 opacity-40 pointer-events-none" />

          <div className="relative z-10 max-w-lg w-full bg-[#0a1628]/95 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] backdrop-blur-2xl text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
              <Cpu className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>

            <h2 className="text-xl font-bold tracking-widest text-cyan-200 font-mono mb-2 uppercase">
              J.A.R.V.I.S. Neural Core Recovery
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-mono leading-relaxed">
              A UI rendering anomaly was intercepted by the diagnostic subsystem. System core remains stable.
            </p>

            {this.state.error && (
              <div className="w-full bg-[#060a12]/80 border border-red-500/30 rounded-xl p-3 mb-5 text-left overflow-auto max-h-36">
                <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-semibold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{this.state.error.name}: {this.state.error.message}</span>
                </div>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-initialize UI
              </button>
              <button
                onClick={this.handleReset}
                className="py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-semibold rounded-xl text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

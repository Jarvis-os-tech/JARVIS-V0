import React, { useState, useEffect } from 'react';
import { Shield, Lock, Cpu, Terminal, CheckCircle2, AlertTriangle, X, RefreshCw, Layers } from 'lucide-react';

interface SecurityStatusData {
  status: string;
  timestamp: string;
  openshellAvailable: boolean;
  binaryPath: string | null;
  gatewayReady: boolean;
  mode: string;
  policy: string;
  activeBackgroundTasksCount: number;
  activeBackgroundTasks: Array<{
    id: string;
    command: string;
    toolName: string;
    startedAt: string;
    status: 'running' | 'completed' | 'failed';
    result?: any;
  }>;
  policyEngine?: {
    name: string;
    version: string;
    description: string;
    sandbox: {
      default_mode: string;
      runtime: string;
      image: string;
      resource_limits: {
        memory_max_mb: number;
        cpu_quota_percent: number;
        pids_max: number;
        timeout_seconds: number;
      };
      security_profile: {
        no_new_privileges: boolean;
        seccomp: string;
        drop_capabilities: string[];
        readonly_rootfs: boolean;
      };
    };
    filesystem: {
      read_write: string[];
      read_only: string[];
      denied: string[];
    };
    network: {
      default_action: string;
      allowed_egress_domains: string[];
      allowed_local_ports: number[];
    };
    credentials: {
      protected_keys: string[];
      injection_policy: string;
      allow_direct_read: boolean;
    };
  };
}

interface SecurityHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityHUDModal: React.FC<SecurityHUDModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<SecurityStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'policy' | 'credentials'>('overview');

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/security/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch security status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden font-mono text-slate-200">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-emerald-500/20 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                NVIDIA OPENSHELL SECURITY MATRIX
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-widest">
                  {data?.mode || 'HYBRID KERNEL ISOLATION'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Zero-Trust Agent Supervisor & Spliced Worker Governance</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh security status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex gap-2">
          {(['overview', 'tasks', 'policy', 'credentials'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" /> Kernel Runtime
                  </div>
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    {data?.openshellAvailable ? (
                      <span className="text-emerald-400 flex items-center gap-1 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> OpenShell 0.1.2 Active
                      </span>
                    ) : (
                      <span className="text-amber-400 text-sm">Fallback Container Sandbox</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-1">
                    {data?.binaryPath || 'Kernel Musl Runtime'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" /> Credential Isolation
                  </div>
                  <div className="text-sm font-bold text-cyan-300">
                    Protected Supervised Injection
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Environment scrubbed from untrusted agent code
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" /> Spliced Workers
                  </div>
                  <div className="text-lg font-bold text-white">
                    {data?.activeBackgroundTasksCount ?? 0} Running
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Long-running sandboxed execution queue
                  </div>
                </div>
              </div>

              {/* Status details */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Active Sandbox Parameters
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Execution Mode</span>
                    <span className="text-slate-200 font-semibold">{data?.mode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Gateway Control Plane</span>
                    <span className="text-emerald-400 font-semibold">127.0.0.1:17670</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Seccomp Profile</span>
                    <span className="text-slate-200 font-semibold">Strict Agent Filter</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fast-Path Telemetry</span>
                    <span className="text-emerald-400 font-semibold">Sub-10ms Native Bypass</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Spliced Background Tasks execute asynchronously inside OpenShell sandboxes while the AI replies immediately.
              </div>
              {(!data?.activeBackgroundTasks || data.activeBackgroundTasks.length === 0) ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No background tasks currently executing. All commands nominal.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.activeBackgroundTasks.map((task) => (
                    <div key={task.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400">{task.toolName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          task.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : task.status === 'running'
                            ? 'bg-blue-500/20 text-blue-300 animate-pulse'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-mono bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
                        {task.command}
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>Task ID: {task.id}</span>
                        <span>Started: {new Date(task.startedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: POLICY */}
          {activeTab === 'policy' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400">Allowed Read/Write Filesystem:</span>
                <ul className="list-disc pl-5 text-slate-300 space-y-1">
                  {data?.policyEngine?.filesystem?.read_write?.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-red-500/20 space-y-2">
                <span className="font-bold text-red-400">Strictly Denied Filesystem Paths:</span>
                <ul className="list-disc pl-5 text-slate-300 space-y-1">
                  {data?.policyEngine?.filesystem?.denied?.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="font-bold text-cyan-400">Allowed Outbound Network Domains:</span>
                <div className="flex flex-wrap gap-1.5">
                  {data?.policyEngine?.network?.allowed_egress_domains?.map((d, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 text-[11px]">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CREDENTIALS */}
          {activeTab === 'credentials' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Protected Secret Variables
                </h4>
                <p className="text-slate-400">
                  These environment variables are scrubbed and withheld from unprivileged agent scripts and untrusted child processes:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data?.policyEngine?.credentials?.protected_keys?.map((k, i) => (
                    <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[11px] flex items-center gap-2">
                      <Lock className="w-3 h-3 text-emerald-500" />
                      {k}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Enforcement: NVIDIA Open Agent Safety Platform</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/40 font-semibold"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
};

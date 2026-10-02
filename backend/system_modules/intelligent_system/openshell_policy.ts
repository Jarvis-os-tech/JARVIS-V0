import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface OpenShellPolicyConfig {
  name: string;
  version: string;
  description: string;
  sandbox: {
    default_mode: 'strict' | 'hybrid' | 'disabled';
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
    default_action: 'allow' | 'deny';
    allowed_egress_domains: string[];
    allowed_local_ports: number[];
  };
  credentials: {
    protected_keys: string[];
    injection_policy: 'supervised_endpoint_only' | 'sandbox_injected' | 'blocked';
    allow_direct_read: boolean;
  };
  execution_rules: {
    fast_path_allowed: string[];
    sandbox_required: string[];
    long_running_async: string[];
  };
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  requiresSandbox: boolean;
  isLongRunning: boolean;
  reason: string;
  sanitizedEnv?: Record<string, string>;
}

export class OpenShellPolicyEngine {
  private policy: OpenShellPolicyConfig;
  private policyPath: string;

  constructor(customPolicyPath?: string) {
    this.policyPath = customPolicyPath || path.resolve(__dirname, 'openshell_policy.json');
    this.policy = this.loadPolicy();
  }

  public loadPolicy(): OpenShellPolicyConfig {
    try {
      if (fs.existsSync(this.policyPath)) {
        const raw = fs.readFileSync(this.policyPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err: any) {
      console.warn(`[OpenShell Policy] Warning loading policy file (${err.message}). Using fallback defaults.`);
    }

    return {
      name: 'jarvis-fallback-policy',
      version: '1.0.0',
      description: 'Fallback safety policy',
      sandbox: {
        default_mode: 'hybrid',
        runtime: 'docker',
        image: 'ubuntu:24.04',
        resource_limits: {
          memory_max_mb: 4096,
          cpu_quota_percent: 100,
          pids_max: 256,
          timeout_seconds: 60
        },
        security_profile: {
          no_new_privileges: true,
          seccomp: 'strict-agent',
          drop_capabilities: ['CAP_SYS_ADMIN', 'CAP_NET_ADMIN'],
          readonly_rootfs: true
        }
      },
      filesystem: {
        read_write: [process.cwd()],
        read_only: ['/usr/lib', '/lib'],
        denied: ['/etc/shadow', '/etc/passwd', '/root']
      },
      network: {
        default_action: 'deny',
        allowed_egress_domains: ['generativelanguage.googleapis.com', 'api.groq.com', 'integrate.api.nvidia.com'],
        allowed_local_ports: [3000, 17670]
      },
      credentials: {
        protected_keys: ['GEMINI_API_KEY', 'GROQ_API_KEY', 'NVIDIA_API_KEY', 'GITHUB_TOKEN'],
        injection_policy: 'supervised_endpoint_only',
        allow_direct_read: false
      },
      execution_rules: {
        fast_path_allowed: ['get_system_telemetry', 'get_pc_specs', 'read_file'],
        sandbox_required: ['write_file', 'execute_skill_script', 'install_skills'],
        long_running_async: ['install_skills', 'execute_skill_script', 'package_install']
      }
    };
  }

  public getPolicy(): OpenShellPolicyConfig {
    return this.policy;
  }

  /**
   * Evaluates an intended tool call or command against security policy.
   */
  public evaluateToolExecution(toolName: string, args: Record<string, any> = {}): PolicyEvaluationResult {
    const rules = this.policy.execution_rules;
    const mode = (process.env.OPENSHELL_MODE as any) || this.policy.sandbox.default_mode || 'hybrid';

    if (mode === 'disabled') {
      return {
        allowed: true,
        requiresSandbox: false,
        isLongRunning: false,
        reason: 'OpenShell security sandbox disabled via OPENSHELL_MODE=disabled'
      };
    }

    const isLongRunning = rules.long_running_async.includes(toolName) ||
      (toolName === 'execute_skill_script' && Boolean(args.is_long_task)) ||
      Boolean(args.run_in_background);

    // Check filesystem constraints if a path argument is present
    const pathCandidate = args.path || args.filePath || args.target || args.folder_path;
    if (pathCandidate && typeof pathCandidate === 'string') {
      const normalized = path.normalize(pathCandidate);
      for (const deniedPath of this.policy.filesystem.denied) {
        if (deniedPath.endsWith('*')) {
          const prefix = deniedPath.slice(0, -1);
          if (normalized.startsWith(prefix)) {
            return {
              allowed: false,
              requiresSandbox: true,
              isLongRunning,
              reason: `CRITICAL POLICY VIOLATION: Access to ${normalized} is denied by policy pattern: ${deniedPath}`
            };
          }
        } else if (normalized === deniedPath || normalized.startsWith(deniedPath + '/')) {
          return {
            allowed: false,
            requiresSandbox: true,
            isLongRunning,
            reason: `CRITICAL POLICY VIOLATION: Access to protected path ${normalized} is explicitly blocked`
          };
        }
      }
    }

    // In Strict mode, every operation requires sandbox isolation
    if (mode === 'strict') {
      return {
        allowed: true,
        requiresSandbox: true,
        isLongRunning,
        reason: 'Strict security mode: All executions must be isolated in OpenShell kernel sandbox',
        sanitizedEnv: this.createSanitizedEnvironment()
      };
    }

    // In Hybrid mode:
    // 1. Fast path allowed tools execute natively (sub-10ms)
    if (rules.fast_path_allowed.includes(toolName)) {
      return {
        allowed: true,
        requiresSandbox: false,
        isLongRunning: false,
        reason: 'Hybrid security mode: Read-only safe telemetry routed to native fast path'
      };
    }

    // 2. Mutating, file write, skill script, or external commands require sandbox
    return {
      allowed: true,
      requiresSandbox: true,
      isLongRunning,
      reason: 'Hybrid security mode: Mutating or script execution quarantined inside OpenShell sandbox',
      sanitizedEnv: this.createSanitizedEnvironment()
    };
  }

  /**
   * Scrubs sensitive secrets from child process environment.
   * Protected credentials are NOT leaked to untrusted agent processes.
   */
  public createSanitizedEnvironment(customEnv: Record<string, string> = {}): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const protectedKeys = new Set(this.policy.credentials.protected_keys);

    // Copy allowed host environment variables, scrubbing any protected keys
    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue;
      if (protectedKeys.has(key)) {
        // Redact or mask secret
        sanitized[key] = `[OPENSHELL_SUPERVISED_CREDENTIAL:${key}]`;
      } else {
        sanitized[key] = value;
      }
    }

    // Apply allowed custom environment overrides
    for (const [k, v] of Object.entries(customEnv)) {
      if (!protectedKeys.has(k)) {
        sanitized[k] = v;
      }
    }

    sanitized['OPENSHELL_SECURED'] = '1';
    sanitized['OPENSHELL_POLICY'] = this.policy.name;
    return sanitized;
  }

  /**
   * Formally verifies a proposed policy update before applying it.
   * Rejects policies that open root filesystem or expose protected credentials.
   */
  public verifyPolicyUpdate(proposedPolicy: Partial<OpenShellPolicyConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (proposedPolicy.filesystem) {
      if (proposedPolicy.filesystem.read_write?.some(p => p === '/' || p === '/root' || p === '/etc')) {
        errors.push('Formal verification rejected: Cannot grant read_write access to root filesystem');
      }
    }

    if (proposedPolicy.credentials) {
      if (proposedPolicy.credentials.allow_direct_read === true) {
        errors.push('Formal verification rejected: Direct credential reading by agent process is forbidden');
      }
    }

    if (proposedPolicy.network) {
      if (proposedPolicy.network.default_action === 'allow' && (!proposedPolicy.network.allowed_egress_domains || proposedPolicy.network.allowed_egress_domains.length === 0)) {
        errors.push('Formal verification warning: Unrestricted wildcard network egress violates zero-trust principles');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const openShellPolicyEngine = new OpenShellPolicyEngine();

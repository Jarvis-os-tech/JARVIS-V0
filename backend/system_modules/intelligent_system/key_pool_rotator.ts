/**
 * J.A.R.V.I.S. Multi-Account API Key Pooling & Auto-Failover
 * 
 * Automatically manages multiple API keys across Google, Groq, NVIDIA NIM, and OmniRoute.
 * Supports comma-separated keys and suffixed env vars (e.g. NVIDIA_API_KEY-1, GROQ_API_KEY_2).
 * Automatically rotates and quarantines keys when rate-limited (HTTP 429).
 */

export interface KeyEntry {
  key: string;
  masked: string;
  rateLimitedUntil: number;
  failureCount: number;
  successCount: number;
}

export class KeyPoolRotator {
  private poolName: string;
  private keys: KeyEntry[] = [];
  private currentIndex: number = 0;
  private cooldownDurationMs: number = 60_000; // 1 minute quarantine on 429

  constructor(poolName: string, explicitKeys?: string | string[]) {
    this.poolName = poolName;
    if (explicitKeys) {
      const list = Array.isArray(explicitKeys) ? explicitKeys : explicitKeys.split(',');
      for (const k of list) {
        this.addKey(k.trim());
      }
    } else {
      this.discoverEnvironmentKeys();
    }
  }

  private mask(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  public addKey(rawKey: string): void {
    const k = rawKey.trim();
    if (!k || k.startsWith('MY_') || k.length < 3) return;
    if (this.keys.some(entry => entry.key === k)) return;

    this.keys.push({
      key: k,
      masked: this.mask(k),
      rateLimitedUntil: 0,
      failureCount: 0,
      successCount: 0
    });
  }

  private discoverEnvironmentKeys(): void {
    const prefix = this.poolName.toUpperCase();
    const env = process.env;

    // 1. Direct variable (e.g. GROQ_API_KEY)
    if (env[prefix]) {
      const parts = env[prefix]!.split(',');
      for (const p of parts) this.addKey(p);
    }

    // 2. Discover suffixed variations: PREFIX_1, PREFIX-1, PREFIX_2, etc.
    for (const [key, val] of Object.entries(env)) {
      if (!val) continue;
      const upper = key.toUpperCase();
      if (
        upper.startsWith(`${prefix}_`) ||
        upper.startsWith(`${prefix}-`) ||
        upper.startsWith(`${prefix}2`) ||
        upper.startsWith(`${prefix}3`)
      ) {
        const parts = val.split(',');
        for (const p of parts) this.addKey(p);
      }
    }
  }

  public getKeyCount(): number {
    return this.keys.length;
  }

  public getActiveKey(): string {
    if (this.keys.length === 0) {
      return '';
    }

    const now = Date.now();
    // Try to find the next healthy (non-rate-limited) key starting from currentIndex
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const entry = this.keys[idx];
      if (entry.rateLimitedUntil <= now) {
        this.currentIndex = idx;
        return entry.key;
      }
    }

    // All keys currently rate limited; return key with earliest expiration
    let bestIdx = 0;
    let earliest = Infinity;
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i].rateLimitedUntil < earliest) {
        earliest = this.keys[i].rateLimitedUntil;
        bestIdx = i;
      }
    }

    this.currentIndex = bestIdx;
    return this.keys[bestIdx].key;
  }

  public nextKey(): string {
    if (this.keys.length <= 1) return this.getActiveKey();
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return this.getActiveKey();
  }

  public reportSuccess(key: string): void {
    const entry = this.keys.find(e => e.key === key);
    if (entry) {
      entry.successCount++;
      entry.failureCount = 0;
    }
  }

  public reportRateLimit(key: string, cooldownMs?: number): void {
    const entry = this.keys.find(e => e.key === key);
    const duration = cooldownMs || this.cooldownDurationMs;
    if (entry) {
      entry.failureCount++;
      entry.rateLimitedUntil = Date.now() + duration;
      console.warn(
        `⚠️ [KeyPoolRotator] Pool '${this.poolName}' rate-limited key ${entry.masked}. Quarantining for ${Math.round(
          duration / 1000
        )}s. Rotating to next available key...`
      );
    }
    this.nextKey();
  }

  public reportFailure(key: string): void {
    const entry = this.keys.find(e => e.key === key);
    if (entry) {
      entry.failureCount++;
      if (entry.failureCount >= 3) {
        entry.rateLimitedUntil = Date.now() + 30_000;
        this.nextKey();
      }
    }
  }

  public getStatus(): Record<string, any> {
    const now = Date.now();
    return {
      pool: this.poolName,
      totalKeys: this.keys.length,
      activeKeyMasked: this.keys[this.currentIndex]?.masked || 'none',
      keys: this.keys.map(k => ({
        masked: k.masked,
        isAvailable: k.rateLimitedUntil <= now,
        rateLimitedSecondsRemaining: Math.max(0, Math.round((k.rateLimitedUntil - now) / 1000)),
        successCount: k.successCount,
        failureCount: k.failureCount
      }))
    };
  }
}

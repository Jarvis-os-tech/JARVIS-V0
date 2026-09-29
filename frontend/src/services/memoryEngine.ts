import {
  JarvisMemoryState,
  ShortTermMemory,
  LongTermMemoryItem,
  SemanticMemoryItem,
  EpisodicMemoryItem,
  WorkingTurn,
  TriadMemoryItem,
  TriadMemoryCategory
} from '../types';

const MEMORY_STORAGE_KEY = 'jarvis_memory_engine_v1';

const INITIAL_LONG_TERM_MEMORIES: LongTermMemoryItem[] = [
  {
    id: 'ltm-core-01',
    category: 'core_protocol',
    title: 'J.A.R.V.I.S. System Identity & Mission Directive',
    content: 'Autonomous AI Operating System and Virtual Assistant. Prioritize crisp intelligence, proactive assistance, concise verbal delivery, and uncompromising execution fidelity.',
    importance: 'critical',
    isPinned: true,
    createdAt: new Date().toISOString(),
    lastRecalledAt: new Date().toISOString()
  },
  {
    id: 'ltm-user-01',
    category: 'user_profile',
    title: 'User Profile & Developer Directives',
    content: 'Primary engineer building next-generation AI interfaces. Prefers clean TypeScript, modular architecture, responsive real-time voice latency, and holographic cyan UI visuals.',
    importance: 'high',
    isPinned: true,
    createdAt: new Date().toISOString(),
    lastRecalledAt: new Date().toISOString()
  },
  {
    id: 'ltm-arch-01',
    category: 'project',
    title: 'Voice Architecture & Live API Standard',
    content: 'Full-duplex bidirectional streaming powered by Gemini Live API over WebSocket with 16kHz PCM audio and Puck voice profile.',
    importance: 'high',
    isPinned: false,
    createdAt: new Date().toISOString(),
    lastRecalledAt: new Date().toISOString()
  }
];

const INITIAL_SEMANTIC_MEMORIES: SemanticMemoryItem[] = [
  {
    id: 'sem-01',
    subject: 'J.A.R.V.I.S.',
    predicate: 'operates as',
    object: 'Autonomous AI Assistant & Voice Operating System',
    domain: 'system',
    confidence: 1.0,
    tags: ['identity', 'assistant', 'gemini-live'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'sem-02',
    subject: 'Default Voice',
    predicate: 'is set to',
    object: 'Puck (natural, charismatic, clear audio timbre)',
    domain: 'system',
    confidence: 1.0,
    tags: ['voice', 'puck', 'audio'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'sem-03',
    subject: 'Memory Architecture',
    predicate: 'implements',
    object: 'Hierarchical 4-Tier Memory (Short-Term, Episodic, Semantic, Long-Term)',
    domain: 'coding',
    confidence: 0.98,
    tags: ['memory', 'architecture', 'protocols'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'sem-04',
    subject: 'UI Interface',
    predicate: 'is styled in',
    object: 'Electric Cyan & Arc-Reactor Blue Holographic Aesthetics',
    domain: 'preferences',
    confidence: 0.95,
    tags: ['ui', 'theme', 'blue', 'arc-reactor'],
    createdAt: new Date().toISOString()
  }
];

const INITIAL_EPISODIC_MEMORIES: EpisodicMemoryItem[] = [
  {
    id: 'epi-01',
    sessionDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    title: 'J.A.R.V.I.S. Core Initialization & Memory Matrix Activation',
    summary: 'Activated autonomous J.A.R.V.I.S. core engine, established four memory tiers, and locked default Puck voice.',
    keyDecisions: [
      'Renamed AI workspace system to J.A.R.V.I.S.',
      'Configured default voice to Puck with electric cyan arc-reactor HUD',
      'Established 4-tier safe persistent memory pipeline'
    ],
    milestones: ['Memory Matrix Online', 'Puck Voice Protocol Active', 'Arc-Reactor Visualizer Online'],
    interactionCount: 4,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_SHORT_TERM_MEMORY: ShortTermMemory = {
  currentGoal: 'Standby mode. Ready for user voice or text instructions.',
  activeContext: 'J.A.R.V.I.S. core interface is online and synchronized with Gemini Live audio pipeline.',
  recentTurns: [],
  activeEntities: ['J.A.R.V.I.S.', 'Puck Voice', 'Memory Core', 'Arc Reactor'],
  lastUpdated: new Date().toISOString()
};

export const INITIAL_PERSONAL_DATA: TriadMemoryItem[] = [
  {
    id: 'pd-01',
    category: 'personal_data',
    content: '**User Name**: Gopi',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'pd-02',
    category: 'personal_data',
    content: '**Environment Focus**: Enterprise Node.js / Python Full-Stack Engineering Workspace',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'pd-03',
    category: 'personal_data',
    content: '**Host Target Architecture**: Windows Host Runtimes (Windows 11 / i5 laptop)',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'pd-04',
    category: 'personal_data',
    content: '**Work Cycle Window**: 09:00 AM - 18:30 PM IST',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'pd-05',
    category: 'personal_data',
    content: 'User is studying BTech',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'pd-06',
    category: 'personal_data',
    content: 'User is studying to implement multi-system agents',
    learnedDate: '2026-09-28T09:00:00.000Z'
  }
];

export const INITIAL_PREFERENCES: TriadMemoryItem[] = [
  {
    id: 'pref-01',
    category: 'preferences',
    content: "User wants a full agent log to track each agent's steps.",
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'pref-02',
    category: 'preferences',
    content: 'User suggests a "console team" concept: agents debate, create documents, and vote on outcomes.',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'pref-03',
    category: 'preferences',
    content: '**UI Interface**: Electric Cyan & Arc-Reactor Blue Holographic Aesthetics',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'pref-04',
    category: 'preferences',
    content: '**Architecture**: Prefers clean modular TypeScript architecture and minimal verbal latency',
    learnedDate: '2026-09-28T09:00:00.000Z'
  }
];

export const INITIAL_INSTRUCTIONS: TriadMemoryItem[] = [
  {
    id: 'inst-01',
    category: 'instructions',
    content: 'Always verify port availability and execute tests before finalizing code',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'inst-02',
    category: 'instructions',
    content: 'Never push to main branch directly; use dev branch for all active engineering',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'inst-03',
    category: 'instructions',
    content: 'Ensure J.A.R.V.I.S. speaks crisply, concisely, and with uncompromising execution fidelity',
    learnedDate: '2026-09-28T09:00:00.000Z'
  },
  {
    id: 'inst-04',
    category: 'instructions',
    content: 'Full-duplex bidirectional streaming powered by Gemini Live API over WebSocket',
    learnedDate: '2026-09-28T09:00:00.000Z'
  }
];

class MemoryEngine {
  private state: JarvisMemoryState;
  private vaultTelemetry: any = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadFromStorage();
    if (typeof window !== 'undefined') {
      this.fetchTriadMemory().catch(() => {});
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('[MemoryEngine] Listener error:', e);
      }
    });
  }

  public async fetchTriadMemory(): Promise<{ personal_data: TriadMemoryItem[]; preferences: TriadMemoryItem[]; instructions: TriadMemoryItem[] } | null> {
    try {
      const res = await fetch('/api/memory/triad');
      if (!res.ok) return null;
      const data = await res.json();
      if (data && typeof data === 'object') {
        let changed = false;
        if (Array.isArray(data.personal_data)) {
          this.state.personalData = data.personal_data;
          changed = true;
        }
        if (Array.isArray(data.preferences)) {
          this.state.preferences = data.preferences;
          changed = true;
        }
        if (Array.isArray(data.instructions)) {
          this.state.instructions = data.instructions;
          changed = true;
        }
        if (changed) {
          this.saveToStorage();
          this.notifyListeners();
        }
        return data;
      }
    } catch (e) {
      console.warn('[MemoryEngine] Failed to fetch triad memory:', e);
    }
    return null;
  }

  public getVaultTelemetry(): any {
    return this.vaultTelemetry;
  }

  public async syncWithServer(): Promise<{ success: boolean; vaultStatus?: any; contextSummary?: string }> {
    try {
      const [statusRes, contextRes] = await Promise.all([
        fetch('/api/memory/status').then(r => r.json()),
        fetch('/api/memory/context').then(r => r.json()),
        this.fetchTriadMemory()
      ]);

      if (statusRes && !statusRes.error) {
        this.vaultTelemetry = statusRes;
      }

      if (contextRes?.context) {
        this.state.shortTerm.activeContext = `Sovereign Vault Connected (SQLite WAL + Markdown). Active Operator: Gopi.`;
        this.state.lastSyncTime = new Date().toISOString();
        this.saveToStorage();
      }

      return {
        success: true,
        vaultStatus: statusRes,
        contextSummary: contextRes?.context
      };
    } catch (e) {
      console.warn('[MemoryEngine] Server sync warning:', e);
      return { success: false };
    }
  }

  private loadFromStorage(): JarvisMemoryState {
    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          shortTerm: parsed.shortTerm || INITIAL_SHORT_TERM_MEMORY,
          longTerm: Array.isArray(parsed.longTerm) ? parsed.longTerm : INITIAL_LONG_TERM_MEMORIES,
          semantic: Array.isArray(parsed.semantic) ? parsed.semantic : INITIAL_SEMANTIC_MEMORIES,
          episodic: Array.isArray(parsed.episodic) ? parsed.episodic : INITIAL_EPISODIC_MEMORIES,
          personalData: Array.isArray(parsed.personalData) ? parsed.personalData : INITIAL_PERSONAL_DATA,
          preferences: Array.isArray(parsed.preferences) ? parsed.preferences : INITIAL_PREFERENCES,
          instructions: Array.isArray(parsed.instructions) ? parsed.instructions : INITIAL_INSTRUCTIONS,
          memoryHealthIndex: parsed.memoryHealthIndex || 100,
          lastSyncTime: parsed.lastSyncTime || new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn('[MemoryEngine] Failed to parse stored memories:', e);
    }

    return {
      shortTerm: INITIAL_SHORT_TERM_MEMORY,
      longTerm: INITIAL_LONG_TERM_MEMORIES,
      semantic: INITIAL_SEMANTIC_MEMORIES,
      episodic: INITIAL_EPISODIC_MEMORIES,
      personalData: INITIAL_PERSONAL_DATA,
      preferences: INITIAL_PREFERENCES,
      instructions: INITIAL_INSTRUCTIONS,
      memoryHealthIndex: 100,
      lastSyncTime: new Date().toISOString()
    };
  }

  private saveToStorage(): void {
    try {
      this.state.lastSyncTime = new Date().toISOString();
      this.recalculateHealthIndex();
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('[MemoryEngine] Failed to save memories to localStorage:', e);
    }
  }

  private recalculateHealthIndex(): void {
    const ltmCount = this.state.longTerm.length;
    const semCount = this.state.semantic.length;
    const epiCount = this.state.episodic.length;
    const total = ltmCount + semCount + epiCount;
    // Health metric calculation
    this.state.memoryHealthIndex = Math.min(100, 75 + Math.min(25, total * 2));
  }

  public getState(): JarvisMemoryState {
    return { ...this.state };
  }

  // ----------------------------------------------------
  // Triad Memory Methods (Personal Data, Preferences, Instructions)
  // ----------------------------------------------------
  public getPersonalData(): TriadMemoryItem[] {
    return Array.isArray(this.state.personalData) ? this.state.personalData : INITIAL_PERSONAL_DATA;
  }

  public addPersonalData(content: string): TriadMemoryItem {
    return this.addTriadItem('personal_data', content);
  }

  public removePersonalData(idOrContent: string): void {
    this.removeTriadItem('personal_data', idOrContent);
  }

  public getPreferences(): TriadMemoryItem[] {
    return Array.isArray(this.state.preferences) ? this.state.preferences : INITIAL_PREFERENCES;
  }

  public addPreference(content: string): TriadMemoryItem {
    return this.addTriadItem('preferences', content);
  }

  public removePreference(idOrContent: string): void {
    this.removeTriadItem('preferences', idOrContent);
  }

  public getInstructions(): TriadMemoryItem[] {
    return Array.isArray(this.state.instructions) ? this.state.instructions : INITIAL_INSTRUCTIONS;
  }

  public addInstruction(content: string): TriadMemoryItem {
    return this.addTriadItem('instructions', content);
  }

  public removeInstruction(idOrContent: string): void {
    this.removeTriadItem('instructions', idOrContent);
  }

  public clearTriadMemory(category?: TriadMemoryCategory | 'all'): void {
    if (!category || category === 'all') {
      this.state.personalData = [];
      this.state.preferences = [];
      this.state.instructions = [];
    } else if (category === 'personal_data') {
      this.state.personalData = [];
    } else if (category === 'preferences') {
      this.state.preferences = [];
    } else if (category === 'instructions') {
      this.state.instructions = [];
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  public addTriadItem(category: TriadMemoryCategory, content: string): TriadMemoryItem {
    const item: TriadMemoryItem = {
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category,
      content: content.trim(),
      learnedDate: new Date().toISOString().split('T')[0]
    };

    if (category === 'personal_data') {
      this.state.personalData = [item, ...(this.state.personalData || [])];
    } else if (category === 'preferences') {
      this.state.preferences = [item, ...(this.state.preferences || [])];
    } else if (category === 'instructions') {
      this.state.instructions = [item, ...(this.state.instructions || [])];
    }

    this.saveToStorage();
    this.notifyListeners();

    // Persist to backend SQLite & Markdown vault
    fetch(`/api/memory/${category}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    }).catch(err => console.warn(`[MemoryEngine] Failed to persist new ${category} to server:`, err));

    return item;
  }

  public removeTriadItem(category: TriadMemoryCategory, idOrContent: string): void {
    let targetContent = idOrContent;

    if (category === 'personal_data') {
      const match = (this.state.personalData || []).find(i => i.id === idOrContent || i.content === idOrContent);
      if (match) targetContent = match.content;
      this.state.personalData = (this.state.personalData || []).filter(i => i.id !== idOrContent && i.content !== idOrContent);
    } else if (category === 'preferences') {
      const match = (this.state.preferences || []).find(i => i.id === idOrContent || i.content === idOrContent);
      if (match) targetContent = match.content;
      this.state.preferences = (this.state.preferences || []).filter(i => i.id !== idOrContent && i.content !== idOrContent);
    } else if (category === 'instructions') {
      const match = (this.state.instructions || []).find(i => i.id === idOrContent || i.content === idOrContent);
      if (match) targetContent = match.content;
      this.state.instructions = (this.state.instructions || []).filter(i => i.id !== idOrContent && i.content !== idOrContent);
    }

    this.saveToStorage();
    this.notifyListeners();

    // Persist removal to backend SQLite & Markdown vault
    fetch(`/api/memory/${category}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: targetContent })
    }).catch(err => console.warn(`[MemoryEngine] Failed to delete ${category} on server:`, err));
  }

  public rewriteTriadItem(category: TriadMemoryCategory, oldContent: string, newContent: string): void {
    const updateList = (list?: TriadMemoryItem[]) => {
      if (!list) return [];
      let replaced = false;
      const updated = list.map(item => {
        if (item.content.trim() === oldContent.trim() || item.id === oldContent) {
          replaced = true;
          return { ...item, content: newContent.trim() };
        }
        return item;
      });
      if (!replaced && updated.length > 0) {
        // Fallback: check substring match
        const idx = updated.findIndex(i => i.content.toLowerCase().includes(oldContent.toLowerCase()));
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], content: newContent.trim() };
        }
      }
      return updated;
    };

    if (category === 'personal_data') {
      this.state.personalData = updateList(this.state.personalData);
    } else if (category === 'preferences') {
      this.state.preferences = updateList(this.state.preferences);
    } else if (category === 'instructions') {
      this.state.instructions = updateList(this.state.instructions);
    }

    this.saveToStorage();
    this.notifyListeners();

    // Persist rewrite to backend SQLite & Markdown vault
    fetch(`/api/memory/${category}/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldContent, newContent })
    }).catch(err => console.warn(`[MemoryEngine] Failed to rewrite ${category} on server:`, err));
  }

  public getStats(): { totalItems: number; ltm: number; sem: number; epi: number; shortTermTurns: number; health: number } {
    return {
      totalItems: this.state.longTerm.length + this.state.semantic.length + this.state.episodic.length + this.state.shortTerm.recentTurns.length,
      ltm: this.state.longTerm.length,
      sem: this.state.semantic.length,
      epi: this.state.episodic.length,
      shortTermTurns: this.state.shortTerm.recentTurns.length,
      health: this.state.memoryHealthIndex
    };
  }

  public recordSessionEpisode(title: string, summary: string, milestones: string[] = []): void {
    if (this.state.shortTerm.recentTurns.length === 0) return;
    this.logEpisode({
      sessionDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title,
      summary,
      keyDecisions: [
        `Processed ${this.state.shortTerm.recentTurns.length} dialogue turns`,
        `Preserved state in persistent memory core`
      ],
      milestones: milestones.length ? milestones : ['Dialogue Turn Completed', 'Cognitive Sync OK'],
      interactionCount: this.state.shortTerm.recentTurns.length
    });
  }

  // ----------------------------------------------------
  // Short-Term Memory Methods
  // ----------------------------------------------------
  public recordTurn(speaker: 'user' | 'jarvis', content: string): void {
    if (!content.trim()) return;

    const newTurn: WorkingTurn = {
      id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      speaker,
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    // Keep rolling buffer of last 10 turns
    const updatedTurns = [...this.state.shortTerm.recentTurns, newTurn].slice(-10);

    // Auto-update active context
    let activeContext = this.state.shortTerm.activeContext;
    if (speaker === 'user') {
      if (content.length > 5) {
        this.state.shortTerm.currentGoal = `Responding to: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`;
      }
    }

    this.state.shortTerm = {
      ...this.state.shortTerm,
      recentTurns: updatedTurns,
      lastUpdated: new Date().toISOString()
    };

    this.saveToStorage();

    // Async sync with backend sovereign memory vault and dynamic pattern miner
    try {
      fetch('/api/memory/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speaker: speaker === 'user' ? 'Operator Gopi' : 'JARVIS',
          text: content.trim(),
          role: speaker === 'user' ? 'user' : 'assistant'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data?.extracted_facts && data.extracted_facts.length > 0) {
          for (const f of data.extracted_facts) {
            this.addSemanticFact({
              subject: 'User Directive',
              predicate: f.kind || 'fact',
              object: f.content,
              domain: 'preferences',
              confidence: 0.95,
              tags: ['mined', f.kind || 'fact']
            });
          }
        }
      })
      .catch(() => {});
    } catch (e) {
      // ignore offline fetch errors
    }
  }

  public clearWorkingMemory(): void {
    this.state.shortTerm = {
      currentGoal: 'Standby mode. Memory cleared.',
      activeContext: 'Working buffer refreshed.',
      recentTurns: [],
      activeEntities: ['J.A.R.V.I.S.'],
      lastUpdated: new Date().toISOString()
    };
    this.saveToStorage();
  }

  // ----------------------------------------------------
  // Semantic Memory Methods
  // ----------------------------------------------------
  public addSemanticFact(fact: Omit<SemanticMemoryItem, 'id' | 'createdAt'>): SemanticMemoryItem {
    const item: SemanticMemoryItem = {
      ...fact,
      id: `sem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.state.semantic = [item, ...this.state.semantic];
    this.saveToStorage();
    return item;
  }

  public removeSemanticFact(id: string): void {
    this.state.semantic = this.state.semantic.filter(f => f.id !== id);
    this.saveToStorage();
  }

  // ----------------------------------------------------
  // Episodic Memory Methods
  // ----------------------------------------------------
  public logEpisode(episode: Omit<EpisodicMemoryItem, 'id' | 'createdAt'>): EpisodicMemoryItem {
    const item: EpisodicMemoryItem = {
      ...episode,
      id: `epi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.state.episodic = [item, ...this.state.episodic];
    this.saveToStorage();
    return item;
  }

  public removeEpisode(id: string): void {
    this.state.episodic = this.state.episodic.filter(e => e.id !== id);
    this.saveToStorage();
  }

  // ----------------------------------------------------
  // Long-Term Memory Methods
  // ----------------------------------------------------
  public addLongTermMemory(item: Omit<LongTermMemoryItem, 'id' | 'createdAt' | 'lastRecalledAt'>): LongTermMemoryItem {
    const newItem: LongTermMemoryItem = {
      ...item,
      id: `ltm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      lastRecalledAt: new Date().toISOString()
    };
    this.state.longTerm = [newItem, ...this.state.longTerm];
    this.saveToStorage();
    return newItem;
  }

  public togglePinLongTerm(id: string): void {
    this.state.longTerm = this.state.longTerm.map(m =>
      m.id === id ? { ...m, isPinned: !m.isPinned } : m
    );
    this.saveToStorage();
  }

  public removeLongTermMemory(id: string): void {
    this.state.longTerm = this.state.longTerm.filter(m => m.id !== id);
    this.saveToStorage();
  }

  // ----------------------------------------------------
  // Real-Time Memory Auto-Extraction Engine
  // ----------------------------------------------------
  public extractAndMemorize(userText: string, jarvisResponse?: string): void {
    if (!userText || userText.length < 4) return;
    const lower = userText.toLowerCase();

    // 1. Explicit remember command (e.g. "Remember that...", "Please note...", "Keep in mind that...")
    const rememberMatch = userText.match(/(?:remember that|remember|please note that|keep in mind that|memorize that)\s+(.+)/i);
    if (rememberMatch && rememberMatch[1]) {
      const memoryContent = rememberMatch[1].trim();
      const title = `User Directive: "${memoryContent.slice(0, 30)}..."`;
      this.addLongTermMemory({
        category: 'user_profile',
        title,
        content: memoryContent,
        importance: 'high',
        isPinned: true
      });
      fetch('/api/memory/fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: title, value: memoryContent, category: 'directive' })
      }).catch(() => {});
      return;
    }

    // 2. Identity facts (e.g. "My name is...", "I am a...", "I work at...")
    const nameMatch = userText.match(/my name is ([a-zA-Z\s]+)/i);
    if (nameMatch && nameMatch[1]) {
      const val = nameMatch[1].trim();
      this.addSemanticFact({
        subject: 'User',
        predicate: 'name is',
        object: val,
        domain: 'identity',
        confidence: 0.99,
        tags: ['user', 'name', 'identity']
      });
      fetch('/api/memory/fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'Operator Name', value: val, category: 'identity' })
      }).catch(() => {});
    }

    // 3. User Preferences (e.g. "I prefer...", "I like...", "My favorite...")
    const preferMatch = userText.match(/I (?:prefer|like|love|always use) ([a-zA-Z0-9\s,.-]+)/i);
    if (preferMatch && preferMatch[1]) {
      const val = preferMatch[1].trim();
      this.addSemanticFact({
        subject: 'User',
        predicate: 'prefers',
        object: val,
        domain: 'preferences',
        confidence: 0.90,
        tags: ['preference', 'user']
      });
      fetch('/api/memory/fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'User Preference', value: val, category: 'preference' })
      }).catch(() => {});
    }

    // 4. Project/Coding facts
    if (lower.includes('project') || lower.includes('developing') || lower.includes('building')) {
      const buildMatch = userText.match(/(?:building|developing|working on)\s+([a-zA-Z0-9\s,.-]+)/i);
      if (buildMatch && buildMatch[1]) {
        const val = buildMatch[1].trim();
        this.addSemanticFact({
          subject: 'Current Project',
          predicate: 'involves',
          object: val,
          domain: 'coding',
          confidence: 0.88,
          tags: ['project', 'development']
        });
        fetch('/api/memory/fact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'Project Architecture', value: val, category: 'project' })
        }).catch(() => {});
      }
    }
  }

  // ----------------------------------------------------
  // Hierarchical Prompt Synthesis (Exact Order: Short -> Episodic -> Semantic -> Long-Term)
  // ----------------------------------------------------
  public buildJarvisHierarchicalMemoryPrompt(): string {
    const s = this.state;

    // 1. Short-Term Working Buffer
    const recentWorkingLines = s.shortTerm.recentTurns
      .slice(-6)
      .map(t => `  • [${t.speaker.toUpperCase()}]: ${t.content}`)
      .join('\n');

    const workingMemorySection = `
=== [TIER 1: WORKING / SHORT-TERM MEMORY (ACTIVE SESSION)] ===
• Current Objective: ${s.shortTerm.currentGoal}
• Context: ${s.shortTerm.activeContext}
• Active Entity Focus: ${s.shortTerm.activeEntities.join(', ')}
${recentWorkingLines ? `• Recent Dialogue Turns:\n${recentWorkingLines}` : '• No prior turns in working buffer.'}`;

    // 2. Episodic Memory Timeline
    const episodicLines = s.episodic
      .slice(0, 3)
      .map(e => `  • [${e.sessionDate}] ${e.title}: ${e.summary} | Decisions: ${e.keyDecisions.join('; ')}`)
      .join('\n');

    const episodicSection = `
=== [TIER 2: EPISODIC MEMORY (SESSION EPISODES & MILESTONES)] ===
${episodicLines || '  • No recorded historical episodes.'}`;

    // 3. Semantic Memory Graph
    const semanticLines = s.semantic
      .slice(0, 8)
      .map(fact => `  • [${fact.domain.toUpperCase()}] ${fact.subject} -> ${fact.predicate} -> ${fact.object} (Conf: ${Math.round(fact.confidence * 100)}%)`)
      .join('\n');

    const semanticSection = `
=== [TIER 3: SEMANTIC MEMORY (FACTS, ENTITIES & KNOWLEDGE GRAPH)] ===
${semanticLines || '  • No semantic triples.'}`;

    // 4. Long-Term Consolidated Memory
    const longTermLines = s.longTerm
      .map(ltm => `  • [${ltm.importance.toUpperCase()} - ${ltm.category}] ${ltm.title}: ${ltm.content}`)
      .join('\n');

    const longTermSection = `
=== [TIER 4: LONG-TERM ENDURING PROTOCOLS & USER DIRECTIVES] ===
${longTermLines || '  • No long-term protocols.'}`;

    return `
--- J.A.R.V.I.S. MEMORY MATRIX (HIERARCHICALLY ORDERED) ---
${workingMemorySection}
${episodicSection}
${semanticSection}
${longTermSection}
-----------------------------------------------------------
`;
  }
}

export const jarvisMemoryEngine = new MemoryEngine();

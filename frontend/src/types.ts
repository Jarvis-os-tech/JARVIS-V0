export type PrebuiltVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede';

export interface VoicePersona {
  id: string;
  name: string;
  role: string;
  avatarIcon: string;
  voiceName: PrebuiltVoiceName;
  systemInstruction: string;
  description: string;
  tagline: string;
  accentColor: string;
  bgGradient: string;
  personalityTraits: string[];
}

export interface ConversationMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  isFinal?: boolean;
  isStreaming?: boolean;
  personaId?: string;
  imageUrl?: string;
}

export type Message = ConversationMessage;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

export interface AudioStats {
  latencyMs: number;
  inputVolume: number; // 0 to 100
  outputVolume: number; // 0 to 100
  packetsReceived: number;
  packetsSent: number;
  connectedTimeSeconds: number;
}

export interface AgentConfig {
  selectedPersonaId: string;
  voiceName: PrebuiltVoiceName;
  customInstruction: string;
  micSensitivity: number; // 1-10
  enableTranscription: boolean;
  enableNoiseFilter: boolean;
  model: string;
}

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
  iconName: string;
}

// ----------------------------------------------------
// J.A.R.V.I.S. Multi-Tiered Memory Architecture Types
// ----------------------------------------------------

export type MemoryTier = 'all' | 'short_term' | 'semantic' | 'episodic' | 'long_term';

export interface WorkingTurn {
  id: string;
  speaker: 'user' | 'jarvis';
  content: string;
  timestamp: string;
}

export interface ShortTermMemory {
  currentGoal: string;
  activeContext: string;
  recentTurns: WorkingTurn[];
  activeEntities: string[];
  lastUpdated: string;
}

export interface LongTermMemoryItem {
  id: string;
  category: 'core_protocol' | 'user_profile' | 'preference' | 'project' | 'directive';
  title: string;
  content: string;
  importance: 'critical' | 'high' | 'medium' | 'standard';
  isPinned: boolean;
  createdAt: string;
  lastRecalledAt: string;
}

export interface SemanticMemoryItem {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  domain: 'identity' | 'coding' | 'workflow' | 'preferences' | 'knowledge' | 'system';
  confidence: number; // 0.0 to 1.0
  tags: string[];
  createdAt: string;
  sourceContext?: string;
}

export interface EpisodicMemoryItem {
  id: string;
  sessionDate: string;
  title: string;
  summary: string;
  keyDecisions: string[];
  milestones: string[];
  interactionCount: number;
  createdAt: string;
}

export type TriadMemoryCategory = 'personal_data' | 'preferences' | 'instructions';

export interface TriadMemoryItem {
  id: string;
  category: TriadMemoryCategory;
  content: string;
  learnedDate: string;
}

export interface JarvisMemoryState {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemoryItem[];
  semantic: SemanticMemoryItem[];
  episodic: EpisodicMemoryItem[];
  personalData?: TriadMemoryItem[];
  preferences?: TriadMemoryItem[];
  instructions?: TriadMemoryItem[];
  memoryHealthIndex: number; // 0-100
  lastSyncTime: string;
}

export interface SkillItem {
  name: string;
  slug: string;
  description: string;
  source?: string;
  path?: string;
  scripts?: string[];
  installedAt?: string;
}

// ----------------------------------------------------
// Parallel Task & Sub-Agent HUD Types
// ----------------------------------------------------

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type TaskCategory =
  | 'hermes'
  | 'prime_agent'
  | 'ultron'
  | 'system'
  | 'weather'
  | 'news'
  | 'productivity'
  | 'obsidian'
  | 'research'
  | 'calculation'
  | 'data_fetch';

export interface SkillDisplayCard {
  type: string;
  title: string;
  data: any;
}

export interface BackgroundTask {
  id: string;
  type: TaskCategory;
  title: string;
  prompt?: string;
  status: TaskStatus;
  startTime: number;
  completedTime?: number;
  durationMs?: number;
  progressPercent?: number;
  progressMessage?: string;
  verbalAcknowledgment?: string;
  speechSummary?: string;
  result?: any;
  displayCard?: SkillDisplayCard;
  sources?: any[];
  error?: string;
}

export interface AgentCardItem {
  name: string;
  description: string;
  url: string;
  version: string;
  domain: 'cli' | 'ide' | 'web' | 'core';
  status?: string;
  capabilities?: {
    openShell?: {
      enabled: boolean;
      mode?: string;
      policy?: string;
    };
  };
  skills?: Array<{ id: string; name: string; description: string }>;
}


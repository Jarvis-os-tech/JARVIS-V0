export interface MemoryFact {
  id: string;
  category: 'preference' | 'personal_fact' | 'work_context' | 'topic' | 'custom';
  key: string;
  value: string;
  updatedAt: string;
  source: 'auto_extracted' | 'user_added';
}

export interface AgentMemoryState {
  enabled: boolean;
  facts: MemoryFact[];
  recentTopicsSummary: string;
  lastUpdated: string;
}

export interface VoicePersona {
  id: string;
  name: string;
  role: string;
  avatarIcon: string;
  voiceName: string;
  tagline: string;
  description: string;
  systemInstruction: string;
  accentColor: string;
  bgGradient: string;
  personalityTraits: string[];
}

export interface VoiceTransferResult {
  isTransfer: boolean;
  targetPersona?: VoicePersona;
  cleanText: string;
  source: 'user' | 'agent';
}

export interface WorkspaceToolCallResult {
  toolName: string;
  args: Record<string, any>;
  result: Record<string, any>;
  error?: string;
}

export interface LiveSessionConfig {
  voiceName?: string;
  systemInstruction?: string;
  model?: string;
  googleAccessToken?: string;
}

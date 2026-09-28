// ============================================================================
// CONNECTOR TYPES
// Shared TypeScript interfaces for JARVIS MCP Connectors (Google, GitHub)
// ============================================================================

export interface ConnectorTool {
  name: string;
  description: string;
  parameters?: any;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  category: "connectors" | "skills" | "plugins";
  author: string;
  authorUrl: string;
  connectorUrl: string;
  tools: ConnectorTool[];
  docsUrl?: string;
  supportUrl?: string;
  privacyUrl?: string;
  isNew?: boolean;
  requiresAuth: boolean;
}

export interface StoredToken {
  accessToken: string;   // AES-256-GCM encrypted, base64
  refreshToken?: string; // AES-256-GCM encrypted, base64
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
}

export interface ConnectorState {
  id: string;
  connected: boolean;
  connectedAt?: string;
  token?: StoredToken;
}

export interface ConnectorStore {
  connectors: Record<string, ConnectorState>;
  encrypted?: boolean;
}

export interface ConnectorStatus {
  id: string;
  connected: boolean;
  connectedAt?: string;
}

export interface OAuthPendingState {
  connectorId: string;
  codeVerifier?: string;
  createdAt: number;
}

export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnvKey: string;
  clientSecretEnvKey: string;
  usePkce: boolean;
}

// ============================================================================
// CONNECTOR UI TYPES
// Type definitions for UI components, cards, detail views, and connector state.
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

export interface ConnectorStatus {
  id: string;
  connected: boolean;
  connectedAt?: string;
}

export interface ConnectorWithStatus extends ConnectorDefinition {
  status: ConnectorStatus;
}

export type DirectoryTab = "skills" | "connectors" | "plugins";

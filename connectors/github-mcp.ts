// ============================================================================
// GITHUB MCP CONNECTOR (Python Bridge)
// Delegates all GitHub MCP calls directly to connectors.py.
// ============================================================================

import { ConnectorService } from "./connector-service.js";

export const GITHUB_MCP_TOOLS = [
  "list_repos",
  "search_issues",
  "get_pull_request",
  "create_issue",
  "list_notifications",
] as const;

export type GitHubMcpToolName = typeof GITHUB_MCP_TOOLS[number];

export async function callGitHubMcp(
  toolName: string,
  args: any = {}
): Promise<any> {
  return ConnectorService.callTool(toolName, args);
}

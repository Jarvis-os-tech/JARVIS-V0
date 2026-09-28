// ============================================================================
// GOOGLE MCP CONNECTOR (Python Bridge)
// Delegates all Google Workspace MCP calls directly to connectors.py.
// ============================================================================

import { ConnectorService } from "./connector-service.js";

export const GOOGLE_MCP_TOOLS = [
  "search_emails",
  "read_email",
  "send_email",
  "create_draft",
  "list_labels",
  "list_events",
  "create_event",
  "update_event",
  "delete_event",
  "find_free_time",
  "list_tasks",
  "create_task",
  "complete_google_task",
  "create_document",
  "get_document",
  "append_document_text",
  "create_presentation",
  "get_presentation",
  "add_slide",
  "list_drive_files",
  "get_drive_file",
] as const;

export type GoogleMcpToolName = typeof GOOGLE_MCP_TOOLS[number];

export async function callGoogleMcp(
  toolName: string,
  args: any = {}
): Promise<any> {
  return ConnectorService.callTool(toolName, args);
}

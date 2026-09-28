// ============================================================================
// CONNECTOR REGISTRY
// Static definitions, tools schemas, and metadata for Google and GitHub MCPs.
// ============================================================================

import type { ConnectorDefinition } from "./types.js";

export const CONNECTOR_REGISTRY: ConnectorDefinition[] = [
  {
    id: "google",
    name: "Google",
    icon: "google",
    tagline: "Access Gmail & Google Calendar through a single login",
    description:
      "Connect your Google Account to JARVIS to allow managing your inbox, composing emails, searching messages, and checking or updating calendar events.",
    category: "connectors",
    author: "Google",
    authorUrl: "https://google.com",
    connectorUrl: "https://google.com",
    tools: [
      {
        name: "search_emails",
        description: "Search Gmail inbox by query, sender, date range, or labels",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query (e.g. 'from:boss', 'subject:report', 'is:unread')" }
          },
          required: ["query"]
        }
      },
      {
        name: "read_email",
        description: "Read a specific email thread by ID with full message bodies",
        parameters: {
          type: "object",
          properties: {
            messageId: { type: "string", description: "The unique ID of the email/thread to read" }
          },
          required: ["messageId"]
        }
      },
      {
        name: "send_email",
        description: "Compose and send an email with subject, body, and recipients",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient's email address" },
            subject: { type: "string", description: "Subject of the email" },
            body: { type: "string", description: "Plain text body content of the email" }
          },
          required: ["to", "subject", "body"]
        }
      },
      {
        name: "create_draft",
        description: "Create an email draft without sending it",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient's email address" },
            subject: { type: "string", description: "Subject of the email draft" },
            body: { type: "string", description: "Plain text body content of the email draft" }
          },
          required: ["to", "subject", "body"]
        }
      },
      {
        name: "list_labels",
        description: "List all Gmail labels and categories"
      },
      {
        name: "list_events",
        description: "List calendar events within a date range",
        parameters: {
          type: "object",
          properties: {
            timeMin: { type: "string", description: "Start time in ISO 8601 format (defaults to current time)" },
            timeMax: { type: "string", description: "End time in ISO 8601 format (defaults to 7 days from now)" }
          }
        }
      },
      {
        name: "create_event",
        description: "Create a new calendar event with title, time, and attendees",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "The title or summary of the calendar event" },
            description: { type: "string", description: "Description or notes for the event" },
            start: { type: "string", description: "Start date-time in ISO 8601 format (e.g. 2026-06-21T09:00:00Z)" },
            end: { type: "string", description: "End date-time in ISO 8601 format (e.g. 2026-06-21T10:00:00Z)" },
            attendees: {
              type: "array",
              items: { type: "string" },
              description: "Email addresses of the invitees/attendees"
            }
          },
          required: ["summary", "start", "end"]
        }
      },
      {
        name: "update_event",
        description: "Update an existing calendar event",
        parameters: {
          type: "object",
          properties: {
            eventId: { type: "string", description: "The unique ID of the event to update" },
            summary: { type: "string", description: "The updated title or summary" },
            description: { type: "string", description: "The updated description" },
            start: { type: "string", description: "Updated start date-time in ISO 8601 format" },
            end: { type: "string", description: "Updated end date-time in ISO 8601 format" },
            attendees: {
              type: "array",
              items: { type: "string" },
              description: "Updated email addresses of the attendees"
            }
          },
          required: ["eventId"]
        }
      },
      {
        name: "delete_event",
        description: "Delete a calendar event by ID",
        parameters: {
          type: "object",
          properties: {
            eventId: { type: "string", description: "The unique ID of the calendar event to delete" }
          },
          required: ["eventId"]
        }
      },
      {
        name: "find_free_time",
        description: "Find available time slots in a given date range",
        parameters: {
          type: "object",
          properties: {
            timeMin: { type: "string", description: "Start of search range in ISO 8601 format" },
            timeMax: { type: "string", description: "End of search range in ISO 8601 format" }
          },
          required: ["timeMin", "timeMax"]
        }
      },
      {
        name: "list_tasks",
        description: "List tasks in the user's Google Tasks",
        parameters: {
          type: "object",
          properties: {
            tasklist: { type: "string", description: "The ID of the tasklist (defaults to '@default')" }
          }
        }
      },
      {
        name: "create_task",
        description: "Create a new task in Google Tasks",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "The title of the task" },
            notes: { type: "string", description: "Optional description or notes for the task" },
            tasklist: { type: "string", description: "The ID of the tasklist (defaults to '@default')" }
          },
          required: ["title"]
        }
      },
      {
        name: "complete_google_task",
        description: "Mark a Google Task as completed",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "The unique ID of the task to mark as completed" },
            tasklist: { type: "string", description: "The ID of the tasklist (defaults to '@default')" }
          },
          required: ["taskId"]
        }
      },
      {
        name: "create_document",
        description: "Create a new Google Document",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "The title of the new document" }
          },
          required: ["title"]
        }
      },
      {
        name: "get_document",
        description: "Retrieve content from an existing Google Document by ID",
        parameters: {
          type: "object",
          properties: {
            documentId: { type: "string", description: "The unique ID of the Google Document" }
          },
          required: ["documentId"]
        }
      },
      {
        name: "append_document_text",
        description: "Append text to an existing Google Document",
        parameters: {
          type: "object",
          properties: {
            documentId: { type: "string", description: "The unique ID of the Google Document" },
            text: { type: "string", description: "The text content to append" }
          },
          required: ["documentId", "text"]
        }
      },
      {
        name: "create_presentation",
        description: "Create a new Google Slides presentation",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "The title of the new presentation" }
          },
          required: ["title"]
        }
      },
      {
        name: "get_presentation",
        description: "Get metadata/structure of a presentation by ID",
        parameters: {
          type: "object",
          properties: {
            presentationId: { type: "string", description: "The unique ID of the presentation" }
          },
          required: ["presentationId"]
        }
      },
      {
        name: "add_slide",
        description: "Add a slide to a Google Slides presentation with title and body text",
        parameters: {
          type: "object",
          properties: {
            presentationId: { type: "string", description: "The unique ID of the presentation" },
            title: { type: "string", description: "The title text for the new slide" },
            body: { type: "string", description: "Optional body or bullets text for the new slide" }
          },
          required: ["presentationId", "title"]
        }
      },
      {
        name: "list_drive_files",
        description: "List or search files in Google Drive",
        parameters: {
          type: "object",
          properties: {
            pageSize: { type: "number", description: "Max files to return (defaults to 10)" },
            query: { type: "string", description: "Search query (e.g. name contains 'Report')" }
          }
        }
      },
      {
        name: "get_drive_file",
        description: "Get Google Drive file details (exports content if Google Doc/Sheet/Slide)",
        parameters: {
          type: "object",
          properties: {
            fileId: { type: "string", description: "The unique ID of the file" }
          },
          required: ["fileId"]
        }
      },
    ],
    docsUrl: "https://developers.google.com/workspace",
    supportUrl: "https://support.google.com",
    privacyUrl: "https://policies.google.com/privacy",
    isNew: true,
    requiresAuth: true,
  },
  {
    id: "github",
    name: "GitHub",
    icon: "github",
    tagline: "Manage repos, issues, pull requests, & code",
    description:
      "Connect GitHub to JARVIS to interact with your repositories through voice. JARVIS can list your repos, search issues, review pull request details, and help you stay on top of your development workflow. Ask things like 'Show my open pull requests' or 'Create an issue in the JARVIS repo.'",
    category: "connectors",
    author: "GitHub",
    authorUrl: "https://github.com",
    connectorUrl: "https://api.github.com",
    tools: [
      { name: "list_repos", description: "List GitHub repositories for the authenticated user" },
      { name: "search_issues", description: "Search issues and pull requests across repositories" },
      { name: "get_pull_request", description: "Get details of a specific pull request" },
      { name: "create_issue", description: "Create a new issue in a repository" },
      { name: "list_notifications", description: "List unread GitHub notifications" },
    ],
    docsUrl: "https://docs.github.com/en/rest",
    supportUrl: "https://support.github.com",
    privacyUrl: "https://docs.github.com/en/site-policy/privacy-policies",
    isNew: true,
    requiresAuth: true,
  },
];

export default CONNECTOR_REGISTRY;

import { Type } from '@google/genai';
import { google } from 'googleapis';

export const workspaceFunctionDeclarations = [
  // Drive
  {
    name: 'drive_list_files',
    description: 'List or search files in Google Drive. You can specify a query (e.g. name contains "report").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Optional Drive search query (e.g. "name contains \'meeting\'")' }
      }
    }
  },
  {
    name: 'drive_delete_file',
    description: 'Delete a file or folder from Google Drive by ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: { type: Type.STRING }
      },
      required: ['fileId']
    }
  },
  {
    name: 'drive_rename_file',
    description: 'Rename a file or folder in Google Drive by ID. Works for Docs and Sheets.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: { type: Type.STRING },
        newName: { type: Type.STRING }
      },
      required: ['fileId', 'newName']
    }
  },
  {
    name: 'drive_create_file',
    description: 'Create a new Google Doc or Google Sheet.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        type: { type: Type.STRING, description: '"doc" for Google Docs or "sheet" for Google Sheets' }
      },
      required: ['name', 'type']
    }
  },
  // Calendar
  {
    name: 'calendar_list_events',
    description: 'List upcoming events on the primary calendar.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        timeMin: { type: Type.STRING, description: 'Optional RFC3339 timestamp (e.g. 2026-08-14T00:00:00Z)' }
      }
    }
  },
  {
    name: 'calendar_create_event',
    description: 'Create a new calendar event. Times must be RFC3339 strings.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        start: { type: Type.STRING, description: 'Start time in RFC3339' },
        end: { type: Type.STRING, description: 'End time in RFC3339' }
      },
      required: ['summary', 'start', 'end']
    }
  },
  {
    name: 'calendar_delete_event',
    description: 'Delete a calendar event by ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: { type: Type.STRING }
      },
      required: ['eventId']
    }
  },
  // Gmail
  {
    name: 'gmail_list_messages',
    description: 'List recent Gmail messages, optionally filtering by query.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Optional Gmail search query (e.g. "is:unread")' }
      }
    }
  },
  {
    name: 'gmail_send_message',
    description: 'Send an email message.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING },
        subject: { type: Type.STRING },
        body: { type: Type.STRING }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'gmail_delete_message',
    description: 'Trash an email message by ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        messageId: { type: Type.STRING }
      },
      required: ['messageId']
    }
  },
  // Tasks
  {
    name: 'tasks_list_tasks',
    description: 'List tasks from the default task list.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'tasks_create_task',
    description: 'Create a new task in the default list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING }
      },
      required: ['title']
    }
  },
  {
    name: 'tasks_delete_task',
    description: 'Delete a task by ID from the default list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskId: { type: Type.STRING }
      },
      required: ['taskId']
    }
  }
];

export async function handleWorkspaceToolCall(name: string, args: any, accessToken: string): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  try {
    switch (name) {
      // DRIVE
      case 'drive_list_files': {
        const drive = google.drive({ version: 'v3', auth });
        const res = await drive.files.list({
          q: args.query,
          pageSize: 10,
          fields: 'files(id, name, mimeType)'
        });
        return { files: res.data.files };
      }
      case 'drive_delete_file': {
        const drive = google.drive({ version: 'v3', auth });
        await drive.files.delete({ fileId: args.fileId });
        return { status: 'success' };
      }
      case 'drive_rename_file': {
        const drive = google.drive({ version: 'v3', auth });
        const res = await drive.files.update({
          fileId: args.fileId,
          requestBody: { name: args.newName }
        });
        return { id: res.data.id, name: res.data.name, status: 'renamed' };
      }
      case 'drive_create_file': {
        const drive = google.drive({ version: 'v3', auth });
        const mimeType = args.type === 'sheet' ? 'application/vnd.google-apps.spreadsheet' : 'application/vnd.google-apps.document';
        const res = await drive.files.create({
          requestBody: {
            name: args.name,
            mimeType: mimeType
          }
        });
        return { id: res.data.id, status: 'created' };
      }

      // CALENDAR
      case 'calendar_list_events': {
        const calendar = google.calendar({ version: 'v3', auth });
        const res = await calendar.events.list({
          calendarId: 'primary',
          timeMin: args.timeMin || new Date().toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
        });
        return { events: res.data.items?.map(i => ({ id: i.id, summary: i.summary, start: i.start?.dateTime })) };
      }
      case 'calendar_create_event': {
        const calendar = google.calendar({ version: 'v3', auth });
        const res = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: args.summary,
            start: { dateTime: args.start },
            end: { dateTime: args.end },
          }
        });
        return { id: res.data.id, status: 'created' };
      }
      case 'calendar_delete_event': {
        const calendar = google.calendar({ version: 'v3', auth });
        await calendar.events.delete({ calendarId: 'primary', eventId: args.eventId });
        return { status: 'deleted' };
      }

      // GMAIL
      case 'gmail_list_messages': {
        const gmail = google.gmail({ version: 'v1', auth });
        const res = await gmail.users.messages.list({ userId: 'me', q: args.query, maxResults: 5 });
        if (!res.data.messages) return { messages: [] };
        
        const details = await Promise.all(res.data.messages.map(async m => {
          const mRes = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'metadata', metadataHeaders: ['Subject', 'From'] });
          const subject = mRes.data.payload?.headers?.find(h => h.name === 'Subject')?.value;
          const from = mRes.data.payload?.headers?.find(h => h.name === 'From')?.value;
          return { id: m.id, subject, from, snippet: mRes.data.snippet };
        }));
        return { messages: details };
      }
      case 'gmail_send_message': {
        const gmail = google.gmail({ version: 'v1', auth });
        const emailLines = [];
        emailLines.push(`To: ${args.to}`);
        emailLines.push(`Subject: ${args.subject}`);
        emailLines.push('');
        emailLines.push(args.body);
        const email = emailLines.join('\n');
        const encoded = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });
        return { id: res.data.id, status: 'sent' };
      }
      case 'gmail_delete_message': {
        const gmail = google.gmail({ version: 'v1', auth });
        await gmail.users.messages.trash({ userId: 'me', id: args.messageId });
        return { status: 'trashed' };
      }

      // TASKS
      case 'tasks_list_tasks': {
        const tasks = google.tasks({ version: 'v1', auth });
        const lists = await tasks.tasklists.list({ maxResults: 1 });
        const listId = lists.data.items?.[0]?.id;
        if (!listId) return { tasks: [] };
        const res = await tasks.tasks.list({ tasklist: listId });
        return { tasks: res.data.items?.map(t => ({ id: t.id, title: t.title, status: t.status })) };
      }
      case 'tasks_create_task': {
        const tasks = google.tasks({ version: 'v1', auth });
        const lists = await tasks.tasklists.list({ maxResults: 1 });
        const listId = lists.data.items?.[0]?.id;
        if (!listId) return { error: 'No task list found' };
        const res = await tasks.tasks.insert({ tasklist: listId, requestBody: { title: args.title } });
        return { id: res.data.id, status: 'created' };
      }
      case 'tasks_delete_task': {
        const tasks = google.tasks({ version: 'v1', auth });
        const lists = await tasks.tasklists.list({ maxResults: 1 });
        const listId = lists.data.items?.[0]?.id;
        if (!listId) return { error: 'No task list found' };
        await tasks.tasks.delete({ tasklist: listId, task: args.taskId });
        return { status: 'deleted' };
      }

      default:
        return null;
    }
  } catch (error: any) {
    console.error(`[Workspace Tool] Error running ${name}:`, error.message);
    return { error: error.message };
  }
}

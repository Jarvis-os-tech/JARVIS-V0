import { getCachedAccessToken } from './authService';

export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  htmlLink?: string;
}

export interface ContactItem {
  resourceName: string;
  name: string;
  email: string;
  phoneNumber?: string;
  photoUrl?: string;
}

/**
 * Encodes string to base64url for Gmail API RFC 2822
 */
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  utf8Bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class WorkspaceService {
  private getAuthHeader(): { Authorization: string } {
    const token = getCachedAccessToken();
    if (!token) {
      throw new Error("No active Google Workspace authorization found. Please sign in via the Connectors hub.");
    }
    return { Authorization: `Bearer ${token}` };
  }

  public isAuthorized(): boolean {
    return !!getCachedAccessToken();
  }

  // ==========================================
  // GMAIL METHODS
  // ==========================================
  public async listRecentEmails(maxResults: number = 8, query: string = ''): Promise<EmailMessage[]> {
    const headers = this.getAuthHeader();
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', maxResults.toString());
    if (query) {
      url.searchParams.set('q', query);
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to fetch messages: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.messages || data.messages.length === 0) {
      return [];
    }

    // Fetch individual email header summaries
    const messagePromises = data.messages.slice(0, maxResults).map(async (item: { id: string }) => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          { headers }
        );
        if (!msgRes.ok) return null;
        const msgData = await msgRes.json();
        
        const getHeader = (name: string) =>
          msgData.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        return {
          id: msgData.id,
          threadId: msgData.threadId,
          snippet: msgData.snippet || '',
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject') || '(No Subject)',
          date: getHeader('Date')
        } as EmailMessage;
      } catch (e) {
        return null;
      }
    });

    const results = await Promise.all(messagePromises);
    return results.filter((r): r is EmailMessage => r !== null);
  }

  public async sendEmail(to: string, subject: string, bodyText: string): Promise<{ id: string; threadId: string }> {
    const headers = {
      ...this.getAuthHeader(),
      'Content-Type': 'application/json'
    };

    const rawMessage = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      bodyText
    ].join('\r\n');

    const encodedRaw = base64UrlEncode(rawMessage);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({ raw: encodedRaw })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to send email: ${res.statusText}`);
    }

    return await res.json();
  }

  // ==========================================
  // GOOGLE CALENDAR METHODS
  // ==========================================
  public async listUpcomingEvents(maxResults: number = 8): Promise<CalendarEventItem[]> {
    const headers = this.getAuthHeader();
    const now = new Date().toISOString();
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', now);
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch calendar events: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: item.id,
      summary: item.summary || '(Untitled Event)',
      description: item.description,
      location: item.location,
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      htmlLink: item.htmlLink
    }));
  }

  public async createCalendarEvent(
    summary: string,
    description: string,
    startTime: string,
    endTime: string,
    location?: string
  ): Promise<CalendarEventItem> {
    const headers = {
      ...this.getAuthHeader(),
      'Content-Type': 'application/json'
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        summary,
        description,
        location,
        start: { dateTime: startTime },
        end: { dateTime: endTime }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create calendar event: ${res.statusText}`);
    }

    const item = await res.json();
    return {
      id: item.id,
      summary: item.summary,
      description: item.description,
      location: item.location,
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      htmlLink: item.htmlLink
    };
  }

  // ==========================================
  // GOOGLE CONTACTS (PEOPLE API) METHODS
  // ==========================================
  public async listContacts(pageSize: number = 20): Promise<ContactItem[]> {
    const headers = this.getAuthHeader();
    const url = new URL('https://people.googleapis.com/v1/people/me/connections');
    url.searchParams.set('pageSize', pageSize.toString());
    url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,photos');

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch contacts: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.connections) return [];

    return data.connections.map((c: any) => {
      const name = c.names?.[0]?.displayName || 'Unnamed Contact';
      const email = c.emailAddresses?.[0]?.value || '';
      const phoneNumber = c.phoneNumbers?.[0]?.value;
      const photoUrl = c.photos?.[0]?.url;

      return {
        resourceName: c.resourceName,
        name,
        email,
        phoneNumber,
        photoUrl
      };
    }).filter((c: ContactItem) => c.email || c.name !== 'Unnamed Contact');
  }
}

export const workspaceInstance = new WorkspaceService();

#!/usr/bin/env python3
"""
JARVIS MCP Connectors — Python Engine
Handles Google Workspace & GitHub MCP tools, token vault, and OAuth flows.
"""

import os
import sys
import json
import time
import base64
import hashlib
import email.message
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
STORE_FILE = DATA_DIR / "connectors.json"
VAULT_KEY_FILE = DATA_DIR / ".vault-key"

# Registry definitions
REGISTRY = [
    {
        "id": "google",
        "name": "Google",
        "icon": "google",
        "tagline": "Access Gmail, Calendar, Docs, Slides, Drive & Tasks",
        "description": "Connect your Google Account to JARVIS to manage inbox, compose emails, calendar events, tasks, documents, slides, and drive files.",
        "category": "connectors",
        "author": "Google",
        "authorUrl": "https://google.com",
        "connectorUrl": "https://google.com",
        "requiresAuth": True,
        "isNew": True,
        "docsUrl": "https://developers.google.com/workspace",
        "supportUrl": "https://support.google.com",
        "privacyUrl": "https://policies.google.com/privacy",
        "tools": [
            {"name": "search_emails", "description": "Search Gmail inbox by query, sender, date range, or labels", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
            {"name": "read_email", "description": "Read a specific email thread by ID", "parameters": {"type": "object", "properties": {"messageId": {"type": "string"}}, "required": ["messageId"]}},
            {"name": "send_email", "description": "Compose and send an email", "parameters": {"type": "object", "properties": {"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}}, "required": ["to", "subject", "body"]}},
            {"name": "create_draft", "description": "Create an email draft without sending", "parameters": {"type": "object", "properties": {"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}}, "required": ["to", "subject", "body"]}},
            {"name": "list_labels", "description": "List all Gmail labels"},
            {"name": "list_events", "description": "List calendar events within a date range", "parameters": {"type": "object", "properties": {"timeMin": {"type": "string"}, "timeMax": {"type": "string"}}}},
            {"name": "create_event", "description": "Create a new calendar event", "parameters": {"type": "object", "properties": {"summary": {"type": "string"}, "description": {"type": "string"}, "start": {"type": "string"}, "end": {"type": "string"}, "attendees": {"type": "array", "items": {"type": "string"}}}, "required": ["summary", "start", "end"]}},
            {"name": "update_event", "description": "Update an existing calendar event", "parameters": {"type": "object", "properties": {"eventId": {"type": "string"}, "summary": {"type": "string"}, "description": {"type": "string"}, "start": {"type": "string"}, "end": {"type": "string"}, "attendees": {"type": "array", "items": {"type": "string"}}}, "required": ["eventId"]}},
            {"name": "delete_event", "description": "Delete a calendar event by ID", "parameters": {"type": "object", "properties": {"eventId": {"type": "string"}}, "required": ["eventId"]}},
            {"name": "find_free_time", "description": "Find available time slots in date range", "parameters": {"type": "object", "properties": {"timeMin": {"type": "string"}, "timeMax": {"type": "string"}}, "required": ["timeMin", "timeMax"]}},
            {"name": "list_tasks", "description": "List Google Tasks", "parameters": {"type": "object", "properties": {"tasklist": {"type": "string"}}}},
            {"name": "create_task", "description": "Create a task in Google Tasks", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "notes": {"type": "string"}, "tasklist": {"type": "string"}}, "required": ["title"]}},
            {"name": "complete_google_task", "description": "Mark a Google Task as completed", "parameters": {"type": "object", "properties": {"taskId": {"type": "string"}, "tasklist": {"type": "string"}}, "required": ["taskId"]}},
            {"name": "create_document", "description": "Create a new Google Document", "parameters": {"type": "object", "properties": {"title": {"type": "string"}}, "required": ["title"]}},
            {"name": "get_document", "description": "Retrieve content from Google Document", "parameters": {"type": "object", "properties": {"documentId": {"type": "string"}}, "required": ["documentId"]}},
            {"name": "append_document_text", "description": "Append text to a Google Document", "parameters": {"type": "object", "properties": {"documentId": {"type": "string"}, "text": {"type": "string"}}, "required": ["documentId", "text"]}},
            {"name": "create_presentation", "description": "Create a Google Slides presentation", "parameters": {"type": "object", "properties": {"title": {"type": "string"}}, "required": ["title"]}},
            {"name": "get_presentation", "description": "Get presentation structure by ID", "parameters": {"type": "object", "properties": {"presentationId": {"type": "string"}}, "required": ["presentationId"]}},
            {"name": "add_slide", "description": "Add slide with title and body text", "parameters": {"type": "object", "properties": {"presentationId": {"type": "string"}, "title": {"type": "string"}, "body": {"type": "string"}}, "required": ["presentationId", "title"]}},
            {"name": "list_drive_files", "description": "List or search files in Google Drive", "parameters": {"type": "object", "properties": {"pageSize": {"type": "number"}, "query": {"type": "string"}}}},
            {"name": "get_drive_file", "description": "Get Google Drive file metadata and export", "parameters": {"type": "object", "properties": {"fileId": {"type": "string"}}, "required": ["fileId"]}},
        ],
    },
    {
        "id": "github",
        "name": "GitHub",
        "icon": "github",
        "tagline": "Manage repos, issues, pull requests, & notifications",
        "description": "Connect GitHub to JARVIS to inspect repos, browse and create issues, check PR details, and track notifications.",
        "category": "connectors",
        "author": "GitHub",
        "authorUrl": "https://github.com",
        "connectorUrl": "https://api.github.com",
        "requiresAuth": True,
        "isNew": True,
        "docsUrl": "https://docs.github.com/en/rest",
        "supportUrl": "https://support.github.com",
        "privacyUrl": "https://docs.github.com/en/site-policy/privacy-policies",
        "tools": [
            {"name": "list_repos", "description": "List GitHub repositories for the authenticated user", "parameters": {"type": "object", "properties": {"sort": {"type": "string"}, "per_page": {"type": "number"}}}},
            {"name": "search_issues", "description": "Search issues and pull requests", "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "per_page": {"type": "number"}}}},
            {"name": "get_pull_request", "description": "Get details of a specific pull request", "parameters": {"type": "object", "properties": {"owner": {"type": "string"}, "repo": {"type": "string"}, "pull_number": {"type": "number"}}, "required": ["owner", "repo", "pull_number"]}},
            {"name": "create_issue", "description": "Create a new issue in a repository", "parameters": {"type": "object", "properties": {"owner": {"type": "string"}, "repo": {"type": "string"}, "title": {"type": "string"}, "body": {"type": "string"}, "labels": {"type": "array", "items": {"type": "string"}}}, "required": ["owner", "repo", "title"]}},
            {"name": "list_notifications", "description": "List unread GitHub notifications", "parameters": {"type": "object", "properties": {"per_page": {"type": "number"}}}},
        ],
    },
]

OAUTH_CONFIGS = {
    "google": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "client_id_env": "GOOGLE_CLIENT_ID",
        "client_secret_env": "GOOGLE_CLIENT_SECRET",
        "scopes": [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.labels",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/tasks",
            "https://www.googleapis.com/auth/documents",
            "https://www.googleapis.com/auth/presentations",
            "https://www.googleapis.com/auth/drive.readonly",
        ],
    },
    "github": {
        "auth_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "client_id_env": "GITHUB_CLIENT_ID",
        "client_secret_env": "GITHUB_CLIENT_SECRET",
        "scopes": ["repo", "read:user", "notifications"],
    },
}

# ─── HTTP Stdlib Helper ────────────────────────────────────────────────────────

def _http(url: str, headers: dict = None, method: str = "GET", body: any = None) -> dict:
    req = urllib.request.Request(url, method=method)
    headers = headers or {}
    for k, v in headers.items():
        req.add_header(k, str(v))
    
    data = None
    if body is not None:
        if isinstance(body, (bytes, bytearray)):
            data = body
        else:
            data = json.dumps(body).encode("utf-8")
            if "Content-Type" not in headers:
                req.add_header("Content-Type", "application/json")
    
    try:
        with urllib.request.urlopen(req, data=data, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            content_type = resp.headers.get("Content-Type", "")
            if "json" in content_type or raw.strip().startswith(("{", "[")):
                return json.loads(raw)
            # GitHub access_token returns urlencoded by default if accept header isn't application/json
            if "=" in raw and "&" in raw:
                parsed = urllib.parse.parse_qs(raw)
                return {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
            return {"raw": raw}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return {"error": f"HTTP {e.code}: {err_body}"}
    except Exception as e:
        return {"error": str(e)}

# ─── Vault & Store ─────────────────────────────────────────────────────────────

# ponytail: XOR keystream cipher; switch to cryptography/AES-GCM if compliance demands it.
def _keystream(key: bytes, length: int) -> bytes:
    stream = bytearray()
    counter = 0
    while len(stream) < length:
        stream.extend(hashlib.sha256(key + counter.to_bytes(4, "big")).digest())
        counter += 1
    return bytes(stream[:length])

def _get_vault_key() -> bytes:
    env_key = os.environ.get("JARVIS_VAULT_KEY")
    if env_key:
        return base64.b64decode(env_key)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if VAULT_KEY_FILE.exists():
        return base64.b64decode(VAULT_KEY_FILE.read_text().strip())
    new_key = os.urandom(32)
    VAULT_KEY_FILE.write_text(base64.b64encode(new_key).decode("utf-8"))
    try:
        os.chmod(VAULT_KEY_FILE, 0o600)
    except Exception:
        pass
    return new_key

def _encrypt(secret: str) -> str:
    if not secret:
        return ""
    key = _get_vault_key()
    raw = secret.encode("utf-8")
    stream = _keystream(key, len(raw))
    xored = bytes(a ^ b for a, b in zip(raw, stream))
    return base64.b64encode(xored).decode("utf-8")

def _decrypt(cipher_b64: str) -> str:
    if not cipher_b64:
        return ""
    key = _get_vault_key()
    raw = base64.b64decode(cipher_b64)
    stream = _keystream(key, len(raw))
    xored = bytes(a ^ b for a, b in zip(raw, stream))
    return xored.decode("utf-8", errors="replace")

def load_store() -> dict:
    if not STORE_FILE.exists():
        return {}
    try:
        return json.loads(STORE_FILE.read_text())
    except Exception:
        return {}

def save_store(store: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORE_FILE.write_text(json.dumps(store, indent=2))
    try:
        os.chmod(STORE_FILE, 0o600)
    except Exception:
        pass

def get_status(connector_id: str) -> dict:
    store = load_store()
    state = store.get(connector_id, {})
    return {
        "id": connector_id,
        "connected": state.get("connected", False),
        "connectedAt": state.get("connectedAt"),
    }

def get_statuses() -> list:
    return [get_status(c["id"]) for c in REGISTRY]

def get_registry() -> list:
    statuses = {s["id"]: s for s in get_statuses()}
    return [{**c, "status": statuses.get(c["id"], {"id": c["id"], "connected": False})} for c in REGISTRY]

def disconnect(connector_id: str) -> dict:
    store = load_store()
    if connector_id in store:
        store[connector_id] = {"id": connector_id, "connected": False}
        save_store(store)
    return {"success": True}

# ─── OAuth Flow ────────────────────────────────────────────────────────────────

def get_oauth_url(connector_id: str, callback_url: str) -> dict:
    cfg = OAUTH_CONFIGS.get(connector_id)
    if not cfg:
        return {"error": f"Connector {connector_id} has no OAuth configuration"}
    client_id = os.environ.get(cfg["client_id_env"]) or os.environ.get(f"VITE_{cfg['client_id_env']}") or ""
    if not client_id:
        return {"error": f"Missing {cfg['client_id_env']} in environment"}

    params = {
        "client_id": client_id,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": " ".join(cfg["scopes"]) if connector_id == "google" else ",".join(cfg["scopes"]),
        "state": connector_id,
    }
    if connector_id == "google":
        params["access_type"] = "offline"
        params["prompt"] = "consent"

    auth_url = f"{cfg['auth_url']}?{urllib.parse.urlencode(params)}"
    return {"authUrl": auth_url}

def handle_oauth_callback(connector_id: str, code: str, callback_url: str) -> dict:
    cfg = OAUTH_CONFIGS.get(connector_id)
    if not cfg:
        return {"error": f"Unknown connector {connector_id}"}
    client_id = os.environ.get(cfg["client_id_env"]) or os.environ.get(f"VITE_{cfg['client_id_env']}") or ""
    client_secret = os.environ.get(cfg["client_secret_env"]) or os.environ.get(f"VITE_{cfg['client_secret_env']}") or ""
    if not client_id or not client_secret:
        return {"error": f"Missing credentials for {connector_id} in environment"}

    token_data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": callback_url,
        "grant_type": "authorization_code",
    }
    headers = {"Accept": "application/json"}
    resp = _http(cfg["token_url"], headers=headers, method="POST", body=token_data)
    if "error" in resp and not resp.get("access_token"):
        return {"error": resp["error"]}

    access_token = resp.get("access_token")
    if not access_token:
        return {"error": f"No access token in response: {resp}"}

    refresh_token = resp.get("refresh_token")
    expires_in = resp.get("expires_in")
    expires_at = (int(time.time() * 1000) + int(expires_in) * 1000) if expires_in else None

    store = load_store()
    existing = store.get(connector_id, {}).get("token", {})
    store[connector_id] = {
        "id": connector_id,
        "connected": True,
        "connectedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "token": {
            "accessToken": _encrypt(access_token),
            "refreshToken": _encrypt(refresh_token) if refresh_token else existing.get("refreshToken"),
            "expiresAt": expires_at,
            "tokenType": resp.get("token_type", "Bearer"),
            "scope": resp.get("scope"),
        },
    }
    save_store(store)
    return {"success": True}

def get_valid_token(connector_id: str) -> str:
    store = load_store()
    state = store.get(connector_id)
    if not state or not state.get("connected") or not state.get("token"):
        return ""
    tok = state["token"]
    expires_at = tok.get("expiresAt")

    # Refresh if expired or expiring within 5 minutes
    if expires_at and (time.time() * 1000) >= (expires_at - 300000):
        refresh_cipher = tok.get("refreshToken")
        if refresh_cipher:
            refresh_token = _decrypt(refresh_cipher)
            cfg = OAUTH_CONFIGS.get(connector_id)
            if cfg and refresh_token:
                client_id = os.environ.get(cfg["client_id_env"], "")
                client_secret = os.environ.get(cfg["client_secret_env"], "")
                refresh_body = {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
                resp = _http(cfg["token_url"], headers={"Accept": "application/json"}, method="POST", body=refresh_body)
                new_access = resp.get("access_token")
                if new_access:
                    tok["accessToken"] = _encrypt(new_access)
                    if resp.get("expires_in"):
                        tok["expiresAt"] = int(time.time() * 1000) + int(resp["expires_in"]) * 1000
                    save_store(store)
                    return new_access

    return _decrypt(tok.get("accessToken", ""))

# ─── Google Workspace Functions ───────────────────────────────────────────────

def _google_api(endpoint: str, token: str, method: str = "GET", body: any = None) -> dict:
    url = f"https://www.googleapis.com/{endpoint.lstrip('/')}"
    return _http(url, headers={"Authorization": f"Bearer {token}"}, method=method, body=body)

def google_search_emails(token: str, query: str = "in:inbox") -> dict:
    encoded = urllib.parse.quote_plus(query or "in:inbox")
    url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={encoded}&maxResults=10"
    return _http(url, headers={"Authorization": f"Bearer {token}"})

def google_read_email(token: str, message_id: str) -> dict:
    url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}?format=full"
    return _http(url, headers={"Authorization": f"Bearer {token}"})

def google_send_email(token: str, to: str, subject: str, body: str) -> dict:
    msg = email.message.EmailMessage()
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    return _http(url, headers={"Authorization": f"Bearer {token}"}, method="POST", body={"raw": raw})

def google_create_draft(token: str, to: str, subject: str, body: str) -> dict:
    msg = email.message.EmailMessage()
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
    url = "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
    return _http(url, headers={"Authorization": f"Bearer {token}"}, method="POST", body={"message": {"raw": raw}})

def google_list_labels(token: str) -> dict:
    return _http("https://gmail.googleapis.com/gmail/v1/users/me/labels", headers={"Authorization": f"Bearer {token}"})

def google_list_events(token: str, time_min: str = None, time_max: str = None) -> dict:
    params = {"singleEvents": "true", "orderBy": "startTime"}
    if time_min:
        params["timeMin"] = time_min
    if time_max:
        params["timeMax"] = time_max
    url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events?{urllib.parse.urlencode(params)}"
    return _http(url, headers={"Authorization": f"Bearer {token}"})

def google_create_event(token: str, summary: str, description: str = "", start: str = None, end: str = None, attendees: list = None) -> dict:
    body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start} if start else {},
        "end": {"dateTime": end} if end else {},
    }
    if attendees:
        body["attendees"] = [{"email": a} for a in attendees]
    return _http("https://www.googleapis.com/calendar/v3/calendars/primary/events", headers={"Authorization": f"Bearer {token}"}, method="POST", body=body)

def google_update_event(token: str, event_id: str, summary: str = None, description: str = None, start: str = None, end: str = None, attendees: list = None) -> dict:
    body = {}
    if summary: body["summary"] = summary
    if description: body["description"] = description
    if start: body["start"] = {"dateTime": start}
    if end: body["end"] = {"dateTime": end}
    if attendees: body["attendees"] = [{"email": a} for a in attendees]
    return _http(f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}", headers={"Authorization": f"Bearer {token}"}, method="PATCH", body=body)

def google_delete_event(token: str, event_id: str) -> dict:
    return _http(f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}", headers={"Authorization": f"Bearer {token}"}, method="DELETE")

def google_find_free_time(token: str, time_min: str, time_max: str) -> dict:
    body = {"timeMin": time_min, "timeMax": time_max, "items": [{"id": "primary"}]}
    return _http("https://www.googleapis.com/calendar/v3/freeBusy", headers={"Authorization": f"Bearer {token}"}, method="POST", body=body)

def google_list_tasks(token: str, tasklist: str = "@default") -> dict:
    url = f"https://tasks.googleapis.com/tasks/v1/lists/{tasklist or '@default'}/tasks?showCompleted=false"
    return _http(url, headers={"Authorization": f"Bearer {token}"})

def google_create_task(token: str, title: str, notes: str = "", tasklist: str = "@default") -> dict:
    url = f"https://tasks.googleapis.com/tasks/v1/lists/{tasklist or '@default'}/tasks"
    return _http(url, headers={"Authorization": f"Bearer {token}"}, method="POST", body={"title": title, "notes": notes})

def google_complete_task(token: str, task_id: str, tasklist: str = "@default") -> dict:
    url = f"https://tasks.googleapis.com/tasks/v1/lists/{tasklist or '@default'}/tasks/{task_id}"
    return _http(url, headers={"Authorization": f"Bearer {token}"}, method="PATCH", body={"status": "completed"})

def google_create_document(token: str, title: str) -> dict:
    return _http("https://docs.googleapis.com/v1/documents", headers={"Authorization": f"Bearer {token}"}, method="POST", body={"title": title})

def google_get_document(token: str, document_id: str) -> dict:
    return _http(f"https://docs.googleapis.com/v1/documents/{document_id}", headers={"Authorization": f"Bearer {token}"})

def google_append_document_text(token: str, document_id: str, text: str) -> dict:
    body = {"requests": [{"insertText": {"endOfSegmentLocation": {}, "text": text}}]}
    return _http(f"https://docs.googleapis.com/v1/documents/{document_id}:batchUpdate", headers={"Authorization": f"Bearer {token}"}, method="POST", body=body)

def google_create_presentation(token: str, title: str) -> dict:
    return _http("https://slides.googleapis.com/v1/presentations", headers={"Authorization": f"Bearer {token}"}, method="POST", body={"title": title})

def google_get_presentation(token: str, presentation_id: str) -> dict:
    return _http(f"https://slides.googleapis.com/v1/presentations/{presentation_id}", headers={"Authorization": f"Bearer {token}"})

def google_add_slide(token: str, presentation_id: str, title: str, body: str = "") -> dict:
    requests = [{"createSlide": {}}]
    return _http(f"https://slides.googleapis.com/v1/presentations/{presentation_id}:batchUpdate", headers={"Authorization": f"Bearer {token}"}, method="POST", body={"requests": requests})

def google_list_drive_files(token: str, page_size: int = 10, query: str = None) -> dict:
    params = {"pageSize": page_size or 10}
    if query: params["q"] = query
    return _http(f"https://www.googleapis.com/drive/v3/files?{urllib.parse.urlencode(params)}", headers={"Authorization": f"Bearer {token}"})

def google_get_drive_file(token: str, file_id: str) -> dict:
    return _http(f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=*", headers={"Authorization": f"Bearer {token}"})

def google_mcp_call(tool_name: str, args: dict, token: str) -> dict:
    if tool_name == "search_emails": return google_search_emails(token, args.get("query", "in:inbox"))
    if tool_name == "read_email": return google_read_email(token, args.get("messageId") or args.get("query", ""))
    if tool_name == "send_email": return google_send_email(token, args.get("to", ""), args.get("subject", ""), args.get("body", ""))
    if tool_name == "create_draft": return google_create_draft(token, args.get("to", ""), args.get("subject", ""), args.get("body", ""))
    if tool_name == "list_labels": return google_list_labels(token)
    if tool_name == "list_events": return google_list_events(token, args.get("timeMin"), args.get("timeMax"))
    if tool_name == "create_event": return google_create_event(token, args.get("summary", ""), args.get("description", ""), args.get("start"), args.get("end"), args.get("attendees"))
    if tool_name == "update_event": return google_update_event(token, args.get("eventId", ""), args.get("summary"), args.get("description"), args.get("start"), args.get("end"), args.get("attendees"))
    if tool_name == "delete_event": return google_delete_event(token, args.get("eventId", ""))
    if tool_name == "find_free_time": return google_find_free_time(token, args.get("timeMin", ""), args.get("timeMax", ""))
    if tool_name == "list_tasks": return google_list_tasks(token, args.get("tasklist", "@default"))
    if tool_name == "create_task": return google_create_task(token, args.get("title", ""), args.get("notes", ""), args.get("tasklist", "@default"))
    if tool_name == "complete_google_task": return google_complete_task(token, args.get("taskId", ""), args.get("tasklist", "@default"))
    if tool_name == "create_document": return google_create_document(token, args.get("title", "Untitled Document"))
    if tool_name == "get_document": return google_get_document(token, args.get("documentId", ""))
    if tool_name == "append_document_text": return google_append_document_text(token, args.get("documentId", ""), args.get("text", ""))
    if tool_name == "create_presentation": return google_create_presentation(token, args.get("title", "Untitled Presentation"))
    if tool_name == "get_presentation": return google_get_presentation(token, args.get("presentationId", ""))
    if tool_name == "add_slide": return google_add_slide(token, args.get("presentationId", ""), args.get("title", ""), args.get("body", ""))
    if tool_name == "list_drive_files": return google_list_drive_files(token, args.get("pageSize", 10), args.get("query"))
    if tool_name == "get_drive_file": return google_get_drive_file(token, args.get("fileId", ""))
    return {"error": f"Unknown Google tool: {tool_name}"}

# ─── GitHub Functions ─────────────────────────────────────────────────────────

def _github_api(endpoint: str, token: str, method: str = "GET", body: any = None) -> dict:
    url = f"https://api.github.com/{endpoint.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "JARVIS-MCP-Agent",
    }
    return _http(url, headers=headers, method=method, body=body)

def github_list_repos(token: str, sort: str = "updated", per_page: int = 10) -> dict:
    params = urllib.parse.urlencode({"sort": sort or "updated", "per_page": per_page or 10})
    res = _github_api(f"user/repos?{params}", token)
    if isinstance(res, list):
        return {"repos": [{"name": r.get("full_name"), "description": r.get("description"), "stars": r.get("stargazers_count"), "language": r.get("language"), "updatedAt": r.get("updated_at")} for r in res]}
    return res

def github_search_issues(token: str, query: str = "is:open", per_page: int = 10) -> dict:
    encoded = urllib.parse.quote_plus(query or "is:open")
    res = _github_api(f"search/issues?q={encoded}&per_page={per_page or 10}", token)
    if "items" in res:
        return {"issues": [{"number": i.get("number"), "title": i.get("title"), "repo": (i.get("repository_url") or "").split("/")[-1], "state": i.get("state"), "author": (i.get("user") or {}).get("login")} for i in res["items"]]}
    return res

def github_get_pull_request(token: str, owner: str, repo: str, pull_number: int) -> dict:
    if "/" in repo:
        owner, repo = repo.split("/", 1)
    return _github_api(f"repos/{owner}/{repo}/pulls/{pull_number}", token)

def github_create_issue(token: str, owner: str, repo: str, title: str, body: str = "", labels: list = None) -> dict:
    if "/" in repo:
        owner, repo = repo.split("/", 1)
    data = {"title": title, "body": body}
    if labels:
        data["labels"] = labels if isinstance(labels, list) else [l.strip() for l in str(labels).split(",")]
    return _github_api(f"repos/{owner}/{repo}/issues", token, method="POST", body=data)

def github_list_notifications(token: str, per_page: int = 10) -> dict:
    res = _github_api(f"notifications?per_page={per_page or 10}", token)
    if isinstance(res, list):
        return {"notifications": [{"reason": n.get("reason"), "title": (n.get("subject") or {}).get("title"), "type": (n.get("subject") or {}).get("type"), "repo": (n.get("repository") or {}).get("full_name"), "updatedAt": n.get("updated_at")} for n in res]}
    return res

def github_mcp_call(tool_name: str, args: dict, token: str) -> dict:
    if tool_name == "list_repos": return github_list_repos(token, args.get("sort", "updated"), args.get("per_page", 10))
    if tool_name == "search_issues": return github_search_issues(token, args.get("query", "is:open"), args.get("per_page", 10))
    if tool_name == "get_pull_request":
        return github_get_pull_request(token, args.get("owner", ""), args.get("repo", ""), args.get("pull_number") or args.get("number") or 1)
    if tool_name == "create_issue":
        return github_create_issue(token, args.get("owner", ""), args.get("repo", ""), args.get("title", ""), args.get("body", ""), args.get("labels"))
    if tool_name == "list_notifications": return github_list_notifications(token, args.get("per_page", 10))
    return {"error": f"Unknown GitHub tool: {tool_name}"}

# ─── Unified Tool Execution ───────────────────────────────────────────────────

def call_tool(tool_name: str, args: dict = None) -> dict:
    args = args or {}
    # Determine connector
    target_connector = None
    for c in REGISTRY:
        if any(t["name"] == tool_name for t in c["tools"]):
            target_connector = c["id"]
            break

    if not target_connector:
        return {"error": f"Tool '{tool_name}' not registered in any connector"}

    token = get_valid_token(target_connector)
    if not token:
        status = get_status(target_connector)
        if not status["connected"]:
            return {"error": f"Connector '{target_connector}' is not connected. Authenticate via the Connectors panel."}
        return {"error": f"No valid access token available for '{target_connector}'"}

    if target_connector == "google":
        return google_mcp_call(tool_name, args, token)
    elif target_connector == "github":
        return github_mcp_call(tool_name, args, token)
    return {"error": f"No execution engine for connector '{target_connector}'"}

# ─── Runnable Check ────────────────────────────────────────────────────────────

def run_tests():
    # Test encryption & decryption roundtrip
    secret = "ya29.test_token_string_12345"
    encrypted = _encrypt(secret)
    decrypted = _decrypt(encrypted)
    assert secret == decrypted, "Vault encryption/decryption failed"

    # Test registry integrity
    assert len(REGISTRY) == 2, "Expected 2 connectors (Google, GitHub)"
    tool_names = [t["name"] for c in REGISTRY for t in c["tools"]]
    assert "search_emails" in tool_names, "Missing search_emails tool"
    assert "list_repos" in tool_names, "Missing list_repos tool"

    # Test OAuth URL generation
    os.environ["GOOGLE_CLIENT_ID"] = "dummy_google_id"
    os.environ["GITHUB_CLIENT_ID"] = "dummy_github_id"
    g_url = get_oauth_url("google", "http://localhost:3000/api/connectors/callback")
    assert "authUrl" in g_url and "dummy_google_id" in g_url["authUrl"], "Google OAuth URL generation failed"
    gh_url = get_oauth_url("github", "http://localhost:3000/api/connectors/callback")
    assert "authUrl" in gh_url and "dummy_github_id" in gh_url["authUrl"], "GitHub OAuth URL generation failed"

    # Test store disconnect
    save_store({"test": {"id": "test", "connected": True}})
    disconnect("test")
    assert get_status("test")["connected"] is False, "Disconnect state test failed"

    print("ALL_TESTS_PASSED")

# ─── CLI Entrypoint ────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        return

    cmd = sys.argv[1]

    if cmd == "test":
        run_tests()
    elif cmd == "list":
        print(json.dumps(get_registry()))
    elif cmd == "statuses":
        print(json.dumps(get_statuses()))
    elif cmd == "status" and len(sys.argv) >= 3:
        print(json.dumps(get_status(sys.argv[2])))
    elif cmd == "auth_url" and len(sys.argv) >= 4:
        print(json.dumps(get_oauth_url(sys.argv[2], sys.argv[3])))
    elif cmd == "callback" and len(sys.argv) >= 5:
        print(json.dumps(handle_oauth_callback(sys.argv[2], sys.argv[3], sys.argv[4])))
    elif cmd == "disconnect" and len(sys.argv) >= 3:
        print(json.dumps(disconnect(sys.argv[2])))
    elif cmd == "call" and len(sys.argv) >= 3:
        tool_name = sys.argv[2]
        args = json.loads(sys.argv[3]) if len(sys.argv) >= 4 else {}
        print(json.dumps(call_tool(tool_name, args)))
    else:
        print(json.dumps({"error": f"Unknown command: {cmd}"}))

if __name__ == "__main__":
    main()

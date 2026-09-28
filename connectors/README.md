# JARVIS MCP Connectors

This directory contains the entire end-to-end implementation for **Model Context Protocol (MCP) Connectors** in JARVIS:
- **Full UI Module** (`connectors/ui/`)
- **Backend Function Codes & Routes** (`connector-routes.ts`, `connector-service.ts`, `connector-registry.ts`, `connector-agent.ts`)
- **Cloud MCP Implementations** (`google-mcp.ts`, `github-mcp.ts`)
- **Comprehensive Master Build Guide** ([`BUILD_GUIDE.md`](./BUILD_GUIDE.md))

---

## Architecture & Directory Layout

```
connectors/
├── ui/                              # Complete Frontend UI Module
│   ├── ConnectorCard.tsx            # Card component (status LED, icon, metadata)
│   ├── ConnectorDetail.tsx          # Full-panel detail view (tools, OAuth connect/disconnect)
│   ├── ConnectorsView.tsx           # Standalone & embeddable Connectors directory view
│   ├── ConnectorMenu.tsx            # Floating popover menu for input bars & toolbars
│   ├── useConnectors.ts             # Custom React hook (state, auth redirect & polling)
│   ├── connector-types.ts           # UI TypeScript type definitions
│   └── index.ts                     # UI Barrel export
├── connector-routes.ts              # Express HTTP API router (/api/connectors/*)
├── connector-service.ts             # Token Vault (AES-256-GCM), OAuth state & persistence
├── connector-registry.ts           # Tool declarations, JSON schemas, metadata
├── connector-agent.ts               # MCP execution dispatcher & agent runtime
├── google-mcp.ts                    # Google Workspace MCP tools (Gmail, Calendar, Drive, Docs, etc.)
├── github-mcp.ts                    # GitHub MCP tools (Repos, Issues, PRs, Notifications)
├── types.ts                         # Shared backend & core connector types
├── index.ts                         # Unified root barrel export
├── BUILD_GUIDE.md                   # Comprehensive step-by-step master guide for building connectors
└── README.md                        # This summary file
```

---

## Key Features

1. **Self-Contained UI**:
   - `ConnectorCard`: Displays branding, status badge, and tagline.
   - `ConnectorDetail`: In-depth inspector showing all tool schemas, developer information, and connect/disconnect buttons.
   - `ConnectorsView`: Full directory with real-time search, category tabs (All / Connected / Available), and live counts.
   - `useConnectors`: Autonomous React hook managing polling, OAuth flows, and notifications.

2. **Cryptographic Token Vault**:
   - Stored in `data/.vault-key` with **AES-256-GCM** encryption.
   - Fresh 12-byte IV for every token, backed by 16-byte authentication tags.
   - Automatic pre-expiry refresh for OAuth access tokens.

3. **Production MCP Integrations**:
   - **Google Workspace MCP**: Gmail search/send, Calendar event scheduling, Google Tasks, Google Docs, Slides creation, Google Drive file search.
   - **GitHub MCP**: Repository listing, issue search/creation, pull request inspection, notifications.

4. **Complete Build Guide**:
   - Read [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) for architectural diagrams, sequence flows, security specifications, and a step-by-step tutorial on building new connectors from scratch.

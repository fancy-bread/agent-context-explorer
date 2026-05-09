# Data Model: Single MCP Server Registration

**Feature**: 009-single-mcp-server
**Date**: 2026-05-09

---

## No new types

This feature removes behaviour rather than adding it. No new interfaces, types, or data structures are introduced.

---

## Changed behaviour (not types)

### `McpServerProvider.cursorServerNames: string[]`

- **Before**: Holds N names (`['ace-agent-context-explorer', 'ace-agency']` for multi-folder)
- **After**: Always holds at most one entry: `['ace']`
- **Type**: unchanged (`string[]`)

### Server env object

| Key | Before | After |
|-----|--------|-------|
| `ACE_EXTENSION_PORT` | Set in bridge mode | Set in bridge mode ✅ unchanged |
| `ACE_PROJECT_PATHS` | Set in standalone fallback | Set in standalone fallback ✅ unchanged |
| `ACE_WORKSPACE_PATH` | Set per-folder | **Removed** |

### Server args

| | Before | After |
|-|--------|-------|
| `provideMcpServerDefinitions` | `['node', serverScript, folder.uri.fsPath]` | `['node', serverScript]` |
| `syncCursorRegistration` | `['node', serverScript, folder.uri.fsPath]` | `['node', serverScript]` |

### Server name / label

| | Single folder | Multiple folders |
|-|--------------|-----------------|
| `syncCursorRegistration` — before | `'ace'` | `'ace-{folderName}'` per folder |
| `syncCursorRegistration` — after | `'ace'` | `'ace'` (single) |
| `provideMcpServerDefinitions` label — before | `'ACE: {folderName}'` | `'ACE: {folderName}'` per folder |
| `provideMcpServerDefinitions` label — after | `'Agent Context Explorer'` | `'Agent Context Explorer'` (single) |

---

## External MCP contract: unchanged

All tool names, input schemas, and output types are identical. Agents that already use `list_projects` + `projectKey` work without modification. The only visible change to an agent is that there is now one server named `ace` (or `Agent Context Explorer` in the VS Code MCP panel) instead of N.

# Quickstart: MCP Server Integration

## 1. Prerequisites

- Node.js installed (version compatible with the ACE extension toolchain).
- This repository checked out with dependencies installed:

```bash
npm install
```

## 2. Running the MCP Server via Cursor Extension API (Preferred)

1. Open this repository in Cursor / VS Code with the ACE extension installed.
2. Ensure the extension activates and registers the MCP server via:
   - `src/extension.ts` using `vscode.mcp.registerServer('ace', { ... })`.
3. In Cursor chat, the `ace` MCP server tools (`list_projects`, `list_rules`, etc.) should be available automatically.

This mode runs the MCP server inside the extension host; no separate process is required.

## 3. Running the Standalone MCP Server (Fallback)

The standalone MCP server is bundled to `out/mcp/server.js` and runs over stdio transport.

```bash
npm run build   # or the appropriate build command for MCP bundling
node out/mcp/server.js /absolute/path/to/workspace
```

Then, configure `.cursor/mcp.json` or `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ace": {
      "command": "node",
      "args": ["<extension-dir>/out/mcp/server.js", "<workspace-root>"]
    }
  }
}
```

## 4. Using MCP Tools from an Agent

The ACE MCP server exposes **tools only** (no MCP resources such as `ace://` URIs). Agents get context by calling tools.

Typical flows:

- Discover projects:

  - Call `list_projects` → pick a `projectKey`.

- Get rules for a project:

  - Call `list_rules` with `{ projectKey }`.
  - Call `get_rule` with `{ name, projectKey }` for full content.

- Get complete project context:

  - Call `get_project_context` with `{ projectKey }` (or omit for current workspace).

All tools:

- Are stateless (no caching).
- Return JSON-serializable typed objects.
- Treat missing artifacts as empty results, not errors.

## 5. Development Loop

- Modify MCP-related code in `src/mcp/server.ts`, `src/mcp/tools.ts`, or `src/mcp/types.ts`.
- Rebuild the MCP bundle as needed.
- Run or reload the extension in the VS Code Extension Host.
- From Cursor chat, exercise tools and verify responses match the spec (`specs/mcp/spec.md`).


# Research: Agents View MCP Registration

## ACE MCP Server Transport and Registration Entry

**Decision**: Use stdio transport for the `~/.claude.json` entry.

**Rationale**: `McpServerProvider.provideMcpServerDefinitions()` returns a `McpStdioServerDefinition` running `node [extensionPath]/out/mcp/server.js`. The same command+args used for Cursor registration (`syncCursorRegistration`) is the correct basis for the Claude Code entry. The extension path is available from `vscode.ExtensionContext.extensionPath` at registration time.

**Entry written to `~/.claude.json`**:
```json
{
  "mcpServers": {
    "agent-context-explorer": {
      "type": "stdio",
      "command": "node",
      "args": ["<context.extensionPath>/out/mcp/server.js"]
    }
  }
}
```

**Server name**: `"agent-context-explorer"` — descriptive, unique, matches the extension's published ID. Distinct from the Cursor internal name `"ace"` to avoid collisions in multi-agent configs.

**Path stability**: The `extensionPath` changes with each version install (VS Code appends the version to the extension directory). The entry written at registration time reflects the installed version at that moment. If the extension updates and the path changes, the user can re-register via the Add ACE action — the old entry remains harmless (Claude Code will fail to connect to it but will not error on startup). A future spec can address auto-update.

**Alternatives considered**:
- HTTP transport: ACE does not expose a stable HTTP port; the extension backend port is dynamic.
- `npx` wrapper: ACE is not currently published as a standalone npm CLI package; adding one is out of scope.

---

## Reading `mcpServers` from `~/.claude.json`

**Decision**: Read the top-level `mcpServers` key only (user-scoped). Ignore per-project entries under `projects[path].mcpServers`.

**Rationale**: The spec explicitly targets user-scoped registration. Project-scoped and local-scoped entries are out of scope.

**Structure**:
```json
{
  "mcpServers": {
    "server-name": { "type": "stdio"|"http"|"sse"|"ws", ... }
  },
  "projects": { ... }
}
```
Extract `Object.keys(json.mcpServers ?? {})` for the list of server names.

---

## Reading `~/.cursor/mcp.json`

**Decision**: Read `mcpServers` from `~/.cursor/mcp.json` directly (Cursor's global MCP config).

**Structure**:
```json
{
  "mcpServers": {
    "server-name": { "command": "...", "args": [...], "env": {} }
  }
}
```
Extract `Object.keys(json.mcpServers ?? {})` for the list of server names.

**No `type` field**: Cursor's `mcp.json` does not use the `type` field (stdio is implied). This does not affect the scanner — we only need the names.

---

## File Watcher Pattern for Single Files Outside Workspace

**Decision**: Use `vscode.RelativePattern(vscode.Uri.file(os.homedir()), '.claude.json')` and `vscode.RelativePattern(vscode.Uri.file(os.homedir()), '.cursor/mcp.json')`.

**Rationale**: The existing global watchers (e.g. `setupGlobalClaudeCommandsWatcher`) already use `vscode.RelativePattern(vscode.Uri.file(dir), glob)` for paths outside the workspace. The same pattern works for a specific filename by using an exact name as the glob. This is consistent with the established watcher approach in `extension.ts`.

---

## Atomic Write to `~/.claude.json`

**Decision**: Read → parse → merge → serialize → `vscode.workspace.fs.writeFile`.

**Rationale**: `vscode.workspace.fs.writeFile` replaces the file atomically on all platforms VS Code supports. The read-modify-write sequence is:
1. Read file (if it exists); parse JSON; if parse fails or file missing, start from `{}`.
2. Merge: set `json.mcpServers["agent-context-explorer"] = { type: "stdio", command: "node", args: [scriptPath] }`.
3. Serialize: `JSON.stringify(json, null, 2)`.
4. Write: `vscode.workspace.fs.writeFile(uri, Buffer.from(serialized, 'utf8'))`.

No partial write is possible with `writeFile` (it replaces the whole file). If the write throws, the original file is untouched.

**ACE_EXTENSION_PORT env**: The backend bridge port is dynamic and session-specific. It is intentionally omitted from the static `~/.claude.json` entry — Claude Code will start the server in standalone mode via `ACE_PROJECT_PATHS` or without env, which is the same fallback the extension already handles.

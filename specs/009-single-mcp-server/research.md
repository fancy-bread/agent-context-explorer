# Research: Single MCP Server Registration

**Feature**: 009-single-mcp-server
**Date**: 2026-05-09

---

## Finding 1: Both registration paths need the same fix

**Decision**: Fix both `provideMcpServerDefinitions()` (VS Code path) and `syncCursorRegistration()` (Cursor path) identically — remove per-folder loop, always register one server.

**Rationale**: The two paths have symmetric bugs. In VS Code, `provideMcpServerDefinitions` returns N `McpStdioServerDefinition` objects. In Cursor, `syncCursorRegistration` calls `registerServer` N times with names like `ace-{folderName}`. Both result in N independent MCP processes that each see only one project.

**Alternatives considered**: Fixing only the Cursor path — rejected; VS Code MCP panel would still show N servers. Fixing only the VS Code path — rejected; same reason for Cursor.

---

## Finding 2: `ACE_WORKSPACE_PATH` serves no purpose in bridge mode and is harmful in standalone

**Decision**: Remove `ACE_WORKSPACE_PATH` from the server env entirely.

**Rationale**: In bridge mode (`ACE_EXTENSION_PORT` set), the stdio server forwards all tool calls to the extension backend, which builds the project list from `getProjects()` and `vscode.workspace.workspaceFolders`. `ACE_WORKSPACE_PATH` is ignored. In standalone mode (`ACE_PROJECT_PATHS` set), passing `ACE_WORKSPACE_PATH` for one specific folder would incorrectly override the multi-project path list. The variable was only sensible in the per-folder world being removed.

**Alternatives considered**: Keeping `ACE_WORKSPACE_PATH` as a hint for the default project — rejected; it conflicts with `ACE_PROJECT_PATHS` semantics and would silently break multi-project standalone mode.

---

## Finding 3: Positional folder path arg in server startup can be removed

**Decision**: Remove `folder.uri.fsPath` positional arg from server definition args (`['node', serverScript, folder.uri.fsPath]` → `['node', serverScript]`).

**Rationale**: The positional arg was used in standalone mode to set the working directory/project root for a single-folder server. In a single-server world, project resolution goes through `ACE_PROJECT_PATHS` (standalone) or the backend (bridge). The `server.ts` code handles a missing positional arg by falling back to `process.env.ACE_PROJECT_PATHS` or `vscode.workspace.workspaceFolders[0]` — confirmed in `src/mcp/server.ts`.

**Alternatives considered**: Keeping the first workspace folder as a positional arg — rejected; it would silently scope the standalone server to one folder, exactly the bug being fixed.

---

## Finding 4: `cursorServerNames` array still needed but simplified

**Decision**: Keep `cursorServerNames: string[]` array but it will only ever hold `['ace']` after this fix.

**Rationale**: `syncCursorRegistration()` unregisters previous names before re-registering. The array is needed to clean up stale registrations on workspace folder changes. With a single server the cleanup is trivial but the pattern is preserved for consistency.

**Alternatives considered**: Replace with a single `cursorServerName: string | undefined` field — possible but a larger refactor than necessary; the array works fine with one entry.

---

## Finding 5: Extension backend already handles multi-project without workspace path env var

**Decision**: No changes to `extensionBackend.ts`.

**Rationale**: `buildProjectList()` in `extensionBackend.ts` is called with `getProjects` (the `ProjectManager.getProjects()` callback) and `vscode.workspace.workspaceFolders`. It does not read `ACE_WORKSPACE_PATH`. The backend already produces a complete multi-project list independently. Confirmed by reading `src/mcp/extensionBackend.ts`.

---

## Finding 6: Zero-folder guard in `provideMcpServerDefinitions` can be removed

**Decision**: Remove the separate zero-folder code path in `provideMcpServerDefinitions`.

**Rationale**: Currently the method has a guard: "if definitions is empty AND workspaceFolders is undefined, push a generic definition." After the fix, the method always returns a single definition regardless of folder count — the guard becomes redundant.

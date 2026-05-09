# Implementation Plan: Single MCP Server Registration

**Branch**: `009-single-mcp-server` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/009-single-mcp-server/spec.md`

---

## Summary

Remove the per-workspace-folder loop in `McpServerProvider` that registers one MCP server per open folder. Replace with a single `ace` server in both the VS Code `McpServerDefinitionProvider` path and the Cursor `cursor.mcp` registration path. Remove `ACE_WORKSPACE_PATH` from the server env — it was only meaningful per-folder and is incorrect in a single multi-project server. Update `specs/mcp/spec.md` with a single-server invariant in the Regression Guardrails.

---

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode
**Primary Dependencies**: VS Code Extension API (`vscode.lm.registerMcpServerDefinitionProvider`, `McpStdioServerDefinition`), Cursor `cursor.mcp` API (`registerServer`, `unregisterServer`)
**Storage**: N/A
**Testing**: Mocha, `@vscode/test-electron`, VS Code stub (`test/vscode-stub`)
**Target Platform**: VS Code / Cursor extension host
**Project Type**: VS Code extension
**Performance Goals**: No change — single registration is simpler and faster than N registrations
**Constraints**: No new dependencies; must not break standalone fallback mode
**Scale/Scope**: Two methods in `src/mcp/mcpServerProvider.ts`; ~30 lines changed; 1 living spec update

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Viewer-only, explicit artifacts | ✅ PASS | MCP registration is infrastructure; no artifact mutation |
| Safety and operational boundaries | ✅ PASS | No file ops; no workspace boundary changes |
| Strict TypeScript and code quality | ✅ PASS | Simplification — removing loops, not adding complexity |
| ASDLC-native workflows | ✅ PASS | Grounded in spec 009; mcp living spec updated same-commit |
| Simplicity and performance | ✅ PASS | This change IS the simplification; fewer processes, cleaner Cursor panel |

**Post-Phase-1 re-check**: No design decisions alter the above. PASS maintained.

---

## Current State (what the code does today)

**`provideMcpServerDefinitions()` in `src/mcp/mcpServerProvider.ts`**:
```typescript
for (const folder of workspaceFolders) {
    const env = { ACE_WORKSPACE_PATH: folder.uri.fsPath, ...envBase };
    definitions.push(new vscode.McpStdioServerDefinition(
        `ACE: ${folder.name}`, 'node', [serverScript, folder.uri.fsPath], env, '1.0.0'
    ));
}
```
→ Registers N definitions (`ACE: agent-context-explorer`, `ACE: agency`, …).

**`syncCursorRegistration()` in `src/mcp/mcpServerProvider.ts`**:
```typescript
for (const folder of folders) {
    const name = folders.length === 1 ? 'ace' : `ace-${folder.name}`;
    const env = { ACE_WORKSPACE_PATH: folder.uri.fsPath, ...envBase };
    cursorMcp.registerServer({ name, server: { command: 'node', args: [serverScript, folder.uri.fsPath], env } });
    this.cursorServerNames.push(name);
}
```
→ Registers N Cursor servers (`ace-agent-context-explorer`, `ace-agency`, …).

**Net result**: Agents see N MCP surfaces. Each scopes to one folder. `list_projects` returns one project. `projectKey` is useless.

---

## Project Structure

### Documentation (this feature)
```text
specs/009-single-mcp-server/
├── spec.md       ← feature spec
├── plan.md       ← this file
├── research.md   ← Phase 0 output
└── data-model.md ← Phase 1 output (minimal — no new types)
```

### Source Code (affected files)
```text
src/mcp/
└── mcpServerProvider.ts   ← replace per-folder loops with single registration

specs/mcp/
└── spec.md                ← add single-server invariant to Regression Guardrails

test/suite/unit/
└── mcpServerProvider.test.ts  ← add 0/1/N folder single-server assertions
```

---

## Implementation Approach

### `provideMcpServerDefinitions()` — replace loop with single definition

**Before**: loops over `workspaceFolders`, produces N definitions, each with `ACE_WORKSPACE_PATH`.

**After**: always returns exactly one definition named `'Agent Context Explorer'`:

```typescript
async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
    const serverScript = path.join(this.context.extensionPath, 'out', 'mcp', 'server.js');
    let env: Record<string, string> = {};
    try {
        const result = await this.ensureBackendOrFallback();
        env = result.env;
    } catch (e) {
        this.outputChannel?.appendLine(`MCP: provideMcpServerDefinitions error: ${e}`);
    }
    return [
        new vscode.McpStdioServerDefinition('Agent Context Explorer', 'node', [serverScript], env, '1.0.0')
    ];
}
```

Key changes:
- Remove `workspaceFolders` iteration
- Remove `ACE_WORKSPACE_PATH` from env
- Remove positional `folder.uri.fsPath` arg passed to the server script (was only meaningful per-folder)
- Single definition always returned (even when zero workspace folders — previously needed a separate zero-folder guard; now unified)

### `syncCursorRegistration()` — replace loop with single registration

**Before**: loops over folders, registers `ace-{name}` per folder (or `ace` for single-folder).

**After**: always registers one server named `ace`:

```typescript
async syncCursorRegistration(): Promise<void> {
    const cursorMcp = getCursorMcp();
    if (!cursorMcp?.registerServer) { return; }
    try {
        const serverScript = path.join(this.context.extensionPath, 'out', 'mcp', 'server.js');
        const { env: envBase } = await this.ensureBackendOrFallback();

        for (const name of this.cursorServerNames) {
            try { cursorMcp.unregisterServer(name); } catch { /* ignore */ }
        }
        this.cursorServerNames = [];

        cursorMcp.registerServer({
            name: 'ace',
            server: { command: 'node', args: [serverScript], env: envBase }
        });
        this.cursorServerNames.push('ace');
    } catch (err) {
        console.warn('ACE MCP: syncCursorRegistration failed', err);
    }
}
```

Key changes:
- Remove `folders` variable and iteration
- Always register `name: 'ace'`
- Remove `ACE_WORKSPACE_PATH` from env
- Remove positional folder path from `args`

### `specs/mcp/spec.md` — add single-server invariant

Add to Regression Guardrails:

> **7. Single server**: ACE MUST register exactly one MCP server (`ace`) regardless of the number of open workspace folders. Multi-project access is provided via `list_projects` + `projectKey`, not via multiple server registrations.

---

## Tasks (for `/speckit-tasks`)

- T001: Rewrite `provideMcpServerDefinitions()` in `src/mcp/mcpServerProvider.ts` — remove per-folder loop; return single `McpStdioServerDefinition('Agent Context Explorer', ...)` with `envBase` only; remove `ACE_WORKSPACE_PATH`; remove positional folder path arg
- T002: Rewrite `syncCursorRegistration()` in `src/mcp/mcpServerProvider.ts` — remove per-folder loop; always register `{ name: 'ace', server: { command: 'node', args: [serverScript], env: envBase } }`; remove `ACE_WORKSPACE_PATH`
- T003: Add unit tests in `test/suite/unit/mcpServerProvider.test.ts` asserting: (a) `provideMcpServerDefinitions()` returns exactly 1 definition for 0, 1, and 2 workspace folders; (b) `syncCursorRegistration()` calls `registerServer` exactly once with `name: 'ace'` for 0, 1, and 2 folders; (c) neither registers `ACE_WORKSPACE_PATH` in the server env
- T004: Update `specs/mcp/spec.md` Regression Guardrails — add single-server invariant (item 7) in same commit

---

## Complexity Tracking

No constitution violations. No new dependencies. This change reduces complexity — two loops become two single-call code paths. The only non-obvious aspect is confirming the bridge-mode backend (`extensionBackend.ts`) already handles multi-project without needing `ACE_WORKSPACE_PATH` as input — confirmed: `buildProjectList` in `extensionBackend.ts` reads from `getProjects()` callback and workspace folders directly, not from env.

# Implementation Plan: Agents View MCP Registration

**Branch**: `010-agents-view-mcp` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)

## Summary

Add a read-only MCP section to each agent root in the Agents view (alphabetical: Agents, Commands, MCP, Skills). The section lists registered MCP servers by name. On activation, if Claude Code is detected and ACE is not registered (or the path is stale), show a notification prompt: "Set up ACE for Claude Code MCP?" — "Set up" writes the stdio entry to `~/.claude.json`; "Not now" dismisses for the session. File watchers on `~/.claude.json` and `~/.cursor/mcp.json` keep the view live. The tree view itself has no write actions.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode
**Primary Dependencies**: VS Code Extension API, `vscode.workspace.fs`, Node.js `os`, `path` — no new dependencies
**Storage**: `~/.claude.json` (read/write via startup prompt only), `~/.cursor/mcp.json` (read-only)
**Testing**: Mocha (existing unit test suite)
**Target Platform**: VS Code / Cursor extension host
**Project Type**: VS Code extension
**Performance Goals**: Tree refresh < 100ms; file read is a single JSON parse
**Constraints**: Must not block main thread; must not corrupt `~/.claude.json` on partial write

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| 1. Viewer-Only | PASS: The tree view is fully read-only. The `~/.claude.json` write is triggered exclusively by an explicit user confirmation prompt at activation — not a tree view action. No exception to viewer-only required. |
| 2. Safety | PASS: File write uses `vscode.workspace.fs.writeFile` (atomic replace). Path validated to `os.homedir()`. Prompt only shown when Claude Code dir is detected. Error surfaces as VS Code error notification. |
| 3. TypeScript strict | PASS: All new types declare explicit return types. No `any`. |
| 4. ASDLC-Native | PASS: Grounded in spec.md. Plan and tasks kept in sync. |
| 5. Simplicity | PASS: No new dependencies. New scanner and service follow existing project patterns. |

## Project Structure

### Documentation (this feature)

```text
specs/010-agents-view-mcp/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   └── ace-setup-prompt.md
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code

```text
src/
├── providers/
│   └── agentsTreeProvider.ts          ← add read-only MCP section and named children
├── scanner/
│   └── mcpRegistrationScanner.ts      ← new: read mcpServers from ~/.claude.json and ~/.cursor/mcp.json
├── services/
│   └── mcpRegistrationService.ts      ← new: check registration state, write ACE entry, show prompt
└── extension.ts                       ← wire MCP data into AgentRootDefinition, watchers, call prompt check

test/
└── unit/
    ├── mcpRegistrationScanner.test.ts  ← new
    └── mcpRegistrationService.test.ts  ← new
```

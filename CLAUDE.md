See [AGENTS.md](AGENTS.md) and [VISION.md](VISION.md).

## Active Technologies
- TypeScript 5.x, strict mode + VS Code Extension API (`vscode.workspace.createFileSystemWatcher`) (007-agents-view-watchers)
- TypeScript 5.x, strict mode + VS Code Extension API, `vscode.workspace.fs`, Node.js `os`, `path` — no new dependencies (010-agents-view-mcp)
- `~/.claude.json` (read/write via startup prompt only), `~/.cursor/mcp.json` (read-only) (010-agents-view-mcp)
- `McpRegistrationScanner` (`src/scanner/mcpRegistrationScanner.ts`): reads `mcpServers` keys from JSON config files; returns `[]` on any error (010-agents-view-mcp)
- `McpRegistrationService` (`src/services/mcpRegistrationService.ts`): checks ACE registration state, writes ACE stdio entry to `~/.claude.json` on explicit user consent, shows session-scoped prompt (010-agents-view-mcp)

## Recent Changes
- 007-agents-view-watchers: Added TypeScript 5.x, strict mode + VS Code Extension API (`vscode.workspace.createFileSystemWatcher`)

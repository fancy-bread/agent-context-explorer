# Contract: ACE MCP Setup Prompt

## Purpose

On extension activation, if Claude Code is detected and ACE is not registered (or the path is stale), show a VS Code notification prompt offering to write the ACE stdio entry to `~/.claude.json`. Strictly scoped to the ACE server — no general MCP management.

## Trigger Conditions

All three must be true for the prompt to appear:
1. `~/.claude/` directory exists (Claude Code detected)
2. `~/.claude.json` does not contain `mcpServers["agent-context-explorer"]`, OR the existing entry's `args[0]` does not match `context.extensionPath + '/out/mcp/server.js'`
3. The user has not dismissed the prompt in the current session

## Prompt

```
vscode.window.showInformationMessage(
  'Set up ACE for Claude Code MCP?',
  'Set up',
  'Not now'
)
```

## "Set up" Behaviour

1. Reads `~/.claude.json`; parses JSON (starts from `{}` if missing or malformed).
2. Merges entry under `mcpServers["agent-context-explorer"]`:
   ```json
   { "type": "stdio", "command": "node", "args": ["<extensionPath>/out/mcp/server.js"] }
   ```
3. Writes the updated JSON back to `~/.claude.json` (atomic replace, 2-space indent).
4. Does NOT trigger a manual tree refresh — the `~/.claude.json` file watcher fires and refreshes automatically.

## "Not now" Behaviour

- No file is written.
- A session-scoped flag is set so the prompt does not reappear during this activation session.
- The prompt will appear again on next extension activation if the entry is still absent or stale.

## Error Contract

- If write fails: `vscode.window.showErrorMessage('ACE: Failed to register MCP server. <reason>')`. File left unchanged.
- If file contains malformed JSON: proceeds with `{}` as base (adds the entry and writes valid JSON).
- If entry already exists with current path: `isRegistered()` returns true, prompt is suppressed.

## Invariants

- All pre-existing keys in `~/.claude.json` are preserved.
- Only `mcpServers["agent-context-explorer"]` is written or updated.
- No other `mcpServers` entries are modified.
- The prompt is shown at most once per session.

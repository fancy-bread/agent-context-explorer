# Data Model: Claude Code Project-Level Artifact Support

**Feature**: 006-claude-code-project-support
**Date**: 2026-04-04

## Entities

### ClaudeMdFile

Represents a CLAUDE.md instruction file, either at project root or global home.

| Field    | Type                          | Description                          |
|----------|-------------------------------|--------------------------------------|
| uri      | vscode.Uri                    | Absolute file URI                    |
| path     | string                        | Absolute filesystem path             |
| scope    | `'workspace' \| 'global'`     | Whether project-local or global      |

**Validation**: File must exist at `{projectRoot}/CLAUDE.md` or `{homeDir}/.claude/CLAUDE.md`. No content parsing.

### ClaudeCommand

Represents a `.md` file in `.claude/commands/`. Structurally identical to the existing `Command` type; scope distinguishes workspace vs. global.

| Field    | Type                          | Description                          |
|----------|-------------------------------|--------------------------------------|
| uri      | vscode.Uri                    | Absolute file URI                    |
| content  | string                        | Raw file content                     |
| fileName | string                        | Basename without `.md` extension     |
| scope    | `'workspace' \| 'global'`     | Whether project-local or `~/.claude` |

**Validation**: File must be a `.md` file in a flat (non-recursive) scan of `{root}/.claude/commands/`. `README.md` is excluded.

### ClaudeCodeArtifacts

Aggregates all Claude Code artifacts for a single project workspace.

| Field           | Type               | Description                                      |
|-----------------|--------------------|--------------------------------------------------|
| claudeMd        | ClaudeMdFile?      | Project-level CLAUDE.md, or undefined if absent  |
| globalClaudeMd  | ClaudeMdFile?      | Global `~/.claude/CLAUDE.md`, or undefined       |
| commands        | ClaudeCommand[]    | Project-level commands from `.claude/commands/`  |
| globalCommands  | ClaudeCommand[]    | Global commands from `~/.claude/commands/`       |
| hasAnyArtifacts | boolean            | True if any of the above are present             |

## Scanner Contract

```
ClaudeCodeScanner(workspaceRoot: vscode.Uri)
  scan(): Promise<ClaudeCodeArtifacts>
  watchAll(callback: () => void): vscode.Disposable[]
```

**scan()** performs:
1. Parallel check for `{projectRoot}/CLAUDE.md` (stat only)
2. Parallel check for `{homeDir}/.claude/CLAUDE.md` (stat only)
3. Flat scan of `{projectRoot}/.claude/commands/*.md` (excluding README.md)
4. Flat scan of `{homeDir}/.claude/commands/*.md` (reuses existing agent root scan)

**watchAll()** registers file watchers for:
- `{workspaceRoot}/.claude/commands/*.md`
- `{workspaceRoot}/CLAUDE.md`

(Global `~/.claude/` watching is out of scope for this feature.)

## Tree View Extensions

### New tree item category

`'claude-code'` added to `TreeItemCategory` union.

### New tree item context values

| Context value      | Usage                                        |
|--------------------|----------------------------------------------|
| `'claude-md'`      | CLAUDE.md file item (opens file on click)    |
| `'claude-command'` | Command item (opens file on click)           |

### Display mapping

| Artifact          | Icon          | Label                    | Description       |
|-------------------|---------------|--------------------------|-------------------|
| Claude Code group | `symbol-file` | "Claude Code" + count    | —                 |
| CLAUDE.md (ws)    | `file-text`   | "CLAUDE.md"              | "workspace"       |
| CLAUDE.md (global)| `file-text`   | "CLAUDE.md"              | "global"          |
| Commands group    | `terminal`    | "Commands" + count       | —                 |
| Command (ws)      | `terminal`    | fileName (no .md)        | —                 |
| Command (global)  | `terminal`    | fileName (no .md)        | "global"          |

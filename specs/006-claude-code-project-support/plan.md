# Implementation Plan: Claude Code Project-Level Artifact Support

**Branch**: `006-claude-code-project-support` | **Date**: 2026-04-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/006-claude-code-project-support/spec.md`

## Summary

Add a "Claude Code" tree section per project that mirrors the existing "Cursor" section. Scans `{projectRoot}/CLAUDE.md`, `{projectRoot}/.claude/commands/`, `~/.claude/CLAUDE.md`, and `~/.claude/commands/`. Adds a `ClaudeCodeScanner`, extends `ProjectTreeProvider` with the new section, and wires file watchers for project-level artifacts.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 18+
**Primary Dependencies**: VS Code Extension API, existing scanner infrastructure (`scanAgentCommandsCore`, `VSCodeFsAdapter`, `NodeFsAdapter`), `os.homedir()`
**Storage**: N/A — read-only file viewer
**Testing**: Mocha + `@vscode/test-electron`; unit tests for core scanner logic via `NodeFsAdapter`
**Target Platform**: VS Code / Cursor IDE extension
**Project Type**: VS Code Extension
**Performance Goals**: All Claude Code artifacts visible within 2 seconds of extension activation; file change reflection within 3 seconds
**Constraints**: No synchronous blocking; no mutation of scanned files; paths validated against workspace boundaries
**Scale/Scope**: Per-workspace; multi-root workspace support consistent with existing scanners

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Viewer-only, explicit artifacts | ✅ Pass | Read-only scan; no mutation of CLAUDE.md or commands |
| Safety and operational boundaries | ✅ Pass | Uses `vscode.workspace.fs`; errors gracefully handled per missing dirs |
| Strict TypeScript and quality | ✅ Pass | New scanner and types follow existing patterns; unit tests required |
| ASDLC alignment | ✅ Pass | Spec + plan + tasks in sync; grounded in spec before implementation |
| Simplicity and performance | ✅ Pass | Flat scans only; reuses existing infrastructure; no new dependencies |

No violations. Complexity tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/006-claude-code-project-support/
├── plan.md              ← this file
├── research.md          ← codebase findings and decisions
├── data-model.md        ← entities, scanner contract, tree display mapping
├── contracts/
│   └── claude-code-artifacts.md   ← on-disk layout + UI contract
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (affected paths)

```text
src/
├── scanner/
│   ├── claudeCodeScanner.ts         ← NEW: VSCode-layer scanner (wraps core)
│   └── core/
│       └── scanClaudeCodeCore.ts    ← NEW: vscode-agnostic scan logic
├── providers/
│   └── projectTreeProvider.ts       ← MODIFY: add Claude Code section
├── extension.ts                     ← MODIFY: instantiate scanner, add file watchers
└── types.ts (or equivalent)         ← MODIFY: add ClaudeCodeArtifacts, ClaudeMdFile,
                                         ClaudeCommand types; extend TreeItemCategory

test/
└── suite/
    └── scanner/
        └── scanClaudeCodeCore.test.ts   ← NEW: unit tests for core scanner
```

## Implementation Phases

### Phase 1: Core Scanner

1. **Define types** (`ClaudeMdFile`, `ClaudeCommand`, `ClaudeCodeArtifacts`) following existing type conventions.
2. **Implement `scanClaudeCodeCore`** — vscode-agnostic function accepting `IFileSystem`, `projectRoot`, `userRoot`:
   - Parallel: stat `{projectRoot}/CLAUDE.md` and `{userRoot}/.claude/CLAUDE.md`
   - Parallel: flat scan `{projectRoot}/.claude/commands/*.md` and `{userRoot}/.claude/commands/*.md`
   - Returns `ClaudeCodeArtifacts`
3. **Implement `ClaudeCodeScanner`** — wraps core with `VSCodeFsAdapter`, exposes `scan()` and `watchAll()`.
4. **Write unit tests** for `scanClaudeCodeCore` using fixture directories and `NodeFsAdapter`.

### Phase 2: Tree View Integration

1. **Extend `TreeItemCategory`** with `'claude-code'` and new context values `'claude-md'`, `'claude-command'`.
2. **Extend `ProjectTreeProvider`**:
   - Accept `ClaudeCodeArtifacts` per project in project data map
   - Render "Claude Code" group node with child items per data-model.md display mapping
   - Hide section when `hasAnyArtifacts === false`
3. **Extend `ProjectTreeItem`** with `claudeMdData` and `claudeCommandData` fields as needed.

### Phase 3: Extension Wiring

1. **Instantiate `ClaudeCodeScanner`** in `extension.ts` alongside existing scanners.
2. **Include in `refreshData()`** — run `claudeCodeScanner.scan()` in parallel with existing scans; pass results to tree provider.
3. **Add file watchers** in `setupFileWatcher()`:
   - `{workspaceRoot}/.claude/commands/*.md`
   - `{workspaceRoot}/CLAUDE.md`
   - Both trigger `refreshData()` on create/change/delete.

# Implementation Plan: Claude Code Project-Level Artifact Support

**Branch**: `006-claude-code-project-support` | **Date**: 2026-04-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/006-claude-code-project-support/spec.md`

## Summary

Add a "Claude Code" tree section per project that fully mirrors the existing "Cursor" section. Scans `{projectRoot}/CLAUDE.md`, `.claude/rules/`, `.claude/commands/`, and `.claude/skills/` using the same parsers as the Cursor equivalents (same YAML frontmatter schemas confirmed). Both sections render independently — a project may show Cursor, Claude Code, or both depending on what artifacts are present. Adds `ClaudeCodeScanner`, extends `ProjectTreeProvider`, and wires four file watchers.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js 18+
**Primary Dependencies**: VS Code Extension API, existing scanners (`scanRulesCore`, `scanSkillsCore`, `scanCommandsCore` patterns), `VSCodeFsAdapter`, `NodeFsAdapter`, `gray-matter` (already bundled)
**Storage**: N/A — read-only file viewer
**Testing**: Mocha + `@vscode/test-electron`; unit tests for core scanner logic via `NodeFsAdapter`
**Target Platform**: VS Code / Cursor IDE extension
**Project Type**: VS Code Extension
**Performance Goals**: All Claude Code artifacts visible within 2 seconds of activation; file changes reflected within 3 seconds
**Constraints**: No synchronous blocking; no mutation of scanned files; paths validated against workspace boundaries
**Scale/Scope**: Per-workspace; multi-root workspace support consistent with existing scanners

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Viewer-only, explicit artifacts | ✅ Pass | Read-only scan of `.claude/` artifacts; no mutation |
| Safety and operational boundaries | ✅ Pass | Uses `vscode.workspace.fs`; errors gracefully handled for missing dirs |
| Strict TypeScript and quality | ✅ Pass | New scanner and types follow existing patterns; unit tests required |
| ASDLC alignment | ✅ Pass | Spec + plan + tasks in sync; clarifications recorded before implementation |
| Simplicity and performance | ✅ Pass | Reuses existing parsers; four parallel scans; no new dependencies |

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
└── tasks.md             ← Phase 2 output (/speckit.tasks — regenerate after this plan)
```

### Source Code (affected paths)

```text
src/
├── scanner/
│   ├── claudeCodeScanner.ts          ← NEW: VSCode-layer scanner (wraps core)
│   └── core/
│       └── scanClaudeCodeCore.ts     ← NEW: vscode-agnostic scan logic
├── providers/
│   └── projectTreeProvider.ts        ← MODIFY: add Claude Code section
├── extension.ts                      ← MODIFY: instantiate scanner, add 4 file watchers
└── types.ts (or equivalent)          ← MODIFY: add ClaudeCodeArtifacts, ClaudeMdFile,
                                           ClaudeRule, ClaudeCommand, ClaudeSkill types;
                                           extend TreeItemCategory

test/
└── suite/
    └── scanner/
        └── scanClaudeCodeCore.test.ts  ← NEW: unit tests for core scanner
```

## Implementation Phases

### Phase 1: Types & Core Scanner

1. **Define types**: `ClaudeMdFile`, `ClaudeRule`, `ClaudeCommand`, `ClaudeSkill`, `ClaudeCodeArtifacts` following existing type conventions. Extend `TreeItemCategory` with `'claude-code'`; add context values `'claude-md'`, `'claude-rule'`, `'claude-command'`, `'claude-skill'`.

2. **Implement `scanClaudeCodeCore`** — vscode-agnostic function accepting `IFileSystem` and `projectRoot`:
   - Parallel: stat `{projectRoot}/CLAUDE.md`
   - Parallel: recursive scan `{projectRoot}/.claude/rules/` for `.md`/`.mdc` — reuse `parseRuleFromString`
   - Parallel: flat scan `{projectRoot}/.claude/commands/*.md` (excl. README.md)
   - Parallel: one-level scan `{projectRoot}/.claude/skills/*/SKILL.md` — reuse `parseSKILLMetadata`
   - Returns `ClaudeCodeArtifacts`

3. **Implement `ClaudeCodeScanner`** — wraps core with `VSCodeFsAdapter`, exposes `scan()` and `watchAll()`.

4. **Write unit tests** for `scanClaudeCodeCore` using fixture directories and `NodeFsAdapter`. Cover: each artifact type present/absent, empty directories, missing directories, mixed state.

### Phase 2: Tree View Integration

1. **Extend `ProjectTreeProvider`**:
   - Accept `ClaudeCodeArtifacts` per project in project data map
   - Render "Claude Code" group with children: CLAUDE.md item, Rules group, Commands group, Skills group
   - Each group shows count badge; hidden when count is zero (consistent with Cursor behavior)
   - Hide top-level Claude Code section when `hasAnyArtifacts === false`

2. **Extend `ProjectTreeItem`** with `claudeMdData`, `claudeRuleData`, `claudeCommandData`, `claudeSkillData` fields.

3. **Wire open-file commands** for each context value (`'claude-md'`, `'claude-rule'`, `'claude-command'`, `'claude-skill'`) — reuse generic open-file pattern from Cursor items.

### Phase 3: Extension Wiring

1. **Instantiate `ClaudeCodeScanner`** in `extension.ts` alongside existing scanners.

2. **Include in `refreshData()`** — run `claudeCodeScanner.scan()` in parallel with existing scans; pass results to `ProjectTreeProvider`.

3. **Add four file watchers** in `setupFileWatcher()`:
   - `{workspaceRoot}/.claude/rules/**/*.{mdc,md}`
   - `{workspaceRoot}/.claude/commands/*.md`
   - `{workspaceRoot}/.claude/skills/*/SKILL.md`
   - `{workspaceRoot}/CLAUDE.md`
   - All wire `onDidCreate`, `onDidChange`, `onDidDelete` to `refreshData()`

4. **Dispose** new watchers and scanner in `deactivate()`.

# Implementation Plan: Agents View File Watchers

**Branch**: `007-agents-view-watchers` | **Date**: 2026-04-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-agents-view-watchers/spec.md`

## Summary

Add file watchers for the Claude (`~/.claude/`) and Global (`~/.agents/`) agent roots in the Agents view, mirroring the three existing Cursor global watcher functions (`setupGlobalCommandsWatcher`, `setupGlobalSkillsWatcher`, `setupGlobalAgentsWatcher`). Each new watcher triggers `refreshData()` on create/change/delete and is registered in `context.subscriptions` for automatic cleanup.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode
**Primary Dependencies**: VS Code Extension API (`vscode.workspace.createFileSystemWatcher`)
**Storage**: N/A
**Testing**: Mocha, @vscode/test-electron
**Target Platform**: VS Code / Cursor IDE extension host
**Project Type**: VS Code extension
**Performance Goals**: Watcher callbacks must not block the main thread; `refreshData()` is async
**Constraints**: Watchers must fail gracefully if directories don't exist; no new npm dependencies
**Scale/Scope**: 6 new watcher functions (3 artifact types × 2 new roots), ~60 lines of code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Viewer-only, explicit artifacts | ✅ PASS | Watchers only call `refreshData()` — no mutation |
| Safety and operational boundaries | ✅ PASS | Uses VS Code API, graceful error handling, registered in `context.subscriptions` |
| Strict TypeScript and code quality | ✅ PASS | Follows existing function signatures; unit tests required |
| ASDLC-native workflows | ✅ PASS | Grounded in spec 007; plan and tasks kept in sync |
| Simplicity and performance | ✅ PASS | No new abstractions; mirrors existing 3-function pattern |

**Post-Phase-1 re-check**: No design decisions alter the above. PASS maintained.

## Project Structure

### Documentation (this feature)

```text
specs/007-agents-view-watchers/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (affected files)

```text
src/
└── extension.ts         ← add 6 new watcher functions; wire into ensureDataLoaded()

test/
└── suite/
    └── integration/
        └── fileWatcherSetup.test.ts   ← extend with Claude and Global watcher pattern tests
```

**Structure Decision**: Single-file change — all watcher functions live in `src/extension.ts` alongside the three existing Cursor global watcher functions. No new files needed.

## Implementation Approach

### Reference Pattern

Each new function follows the exact shape of the existing `setupGlobalCommandsWatcher()`:

```
function setupGlobal{Root}{ArtifactType}Watcher(): vscode.FileSystemWatcher | undefined {
    try {
        const pattern = path.join(os.homedir(), '{root}', '{artifactDir}', '{glob}');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        watcher.onDidCreate(() => { outputChannel.appendLine('...'); refreshData(); });
        watcher.onDidChange(() => { outputChannel.appendLine('...'); refreshData(); });
        watcher.onDidDelete(() => { outputChannel.appendLine('...'); refreshData(); });
        outputChannel.appendLine('... watcher created successfully');
        return watcher;
    } catch (error) {
        outputChannel.appendLine(`Unable to watch ...: ${error instanceof Error ? error.message : String(error)}`);
        return undefined;
    }
}
```

### New Functions (6 total)

| Function | Path watched | Artifact type |
|----------|-------------|---------------|
| `setupGlobalClaudeCommandsWatcher` | `~/.claude/commands/*.md` | Claude commands |
| `setupGlobalClaudeSkillsWatcher` | `~/.claude/skills/*/SKILL.md` | Claude skills |
| `setupGlobalClaudeAgentDefinitionsWatcher` | `~/.claude/agents/*.md` | Claude agent defs |
| `setupGlobalDotAgentsCommandsWatcher` | `~/.agents/commands/*.md` | Global commands |
| `setupGlobalDotAgentsSkillsWatcher` | `~/.agents/skills/*/SKILL.md` | Global skills |
| `setupGlobalDotAgentsAgentDefinitionsWatcher` | `~/.agents/agents/*.md` | Global agent defs |

### Wiring in `ensureDataLoaded()`

Six new calls added alongside the existing three, with the same guard pattern:

```typescript
const claudeCommandsWatcher = setupGlobalClaudeCommandsWatcher();
if (claudeCommandsWatcher) { extensionContext.subscriptions.push(claudeCommandsWatcher); }
// ... (repeat for all 6)
```

## Tasks (for `/speckit.tasks`)

- T001: Add `setupGlobalClaudeCommandsWatcher()` in `src/extension.ts`
- T002: Add `setupGlobalClaudeSkillsWatcher()` in `src/extension.ts`
- T003: Add `setupGlobalClaudeAgentDefinitionsWatcher()` in `src/extension.ts`
- T004: Add `setupGlobalDotAgentsCommandsWatcher()` in `src/extension.ts`
- T005: Add `setupGlobalDotAgentsSkillsWatcher()` in `src/extension.ts`
- T006: Add `setupGlobalDotAgentsAgentDefinitionsWatcher()` in `src/extension.ts`
- T007: Wire all six new watchers into `ensureDataLoaded()` with `context.subscriptions.push`
- T008: Add integration tests for the six new watcher patterns in `test/suite/integration/fileWatcherSetup.test.ts`

## Complexity Tracking

No constitution violations. No complexity justification needed.

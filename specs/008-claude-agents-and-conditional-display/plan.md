# Implementation Plan: Claude Project Agents + Conditional Platform Display

**Branch**: `008-claude-agents-and-conditional-display` | **Date**: 2026-05-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/008-claude-agents-and-conditional-display/spec.md`

---

## Summary

Two targeted changes to ACE's Workspaces tree:

**Feature A** — Add `.claude/agents/*.md` scanning to `scanClaudeCodeCore.ts` and surface the results as an Agents subsection inside the Claude Code tree section (parallel to how `.cursor/agents/*.md` appears under Cursor).

**Feature B** — Gate Workspaces tree platform sections on *folder existence*, not artifact presence. Cursor section: visible only if `.cursor/` exists at project root. Claude Code section: visible only if `.claude/` exists. The Agents view already correctly gates roots on folder existence via `vscode.workspace.fs.stat()` — no change needed there.

---

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode
**Primary Dependencies**: VS Code Extension API (`vscode.workspace.fs`), existing scanner/provider patterns
**Storage**: N/A
**Testing**: Mocha, @vscode/test-electron
**Target Platform**: VS Code / Cursor extension host
**Project Type**: VS Code extension
**Performance Goals**: Folder stat checks MUST run in parallel with other scans; no sequential blocking per project
**Constraints**: No new npm dependencies; must use `vscode.workspace.fs.stat()` not `fs.existsSync()`
**Scale/Scope**: Changes across 4 source files + 3 living spec updates + tests

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Viewer-only, explicit artifacts | ✅ PASS | New Agents subsection opens files; no mutation |
| Safety and operational boundaries | ✅ PASS | All FS checks use `vscode.workspace.fs`; graceful on missing dirs |
| Strict TypeScript and code quality | ✅ PASS | New categories added to union types; explicit return types; tests required |
| ASDLC-native workflows | ✅ PASS | Grounded in spec 008; living specs updated same-commit |
| Simplicity and performance | ✅ PASS | No new abstractions; mirrors existing patterns; parallel stat calls |

**Post-Phase-1 re-check**: No design decisions alter the above. PASS maintained.

---

## Current State (what the code does today)

**Agents view** (no change needed):
`resolveAgentRootsWithData()` in `extension.ts:406-451` already calls `vscode.workspace.fs.stat()` on each root (`~/.cursor/`, `~/.claude/`, `~/.agents/`) and skips missing directories via the catch block. Feature B does **not** touch the Agents view.

**Workspaces tree** (needs both changes):
- `projectTreeProvider.ts:150-175` — always adds a Cursor section; gates Claude Code section on `claudeCodeArtifacts?.hasAnyArtifacts`. Neither is folder-gated.
- `claudeCodeScanner.ts` / `scanClaudeCodeCore.ts` — scans CLAUDE.md, `.claude/rules/`, `.claude/commands/`, `.claude/skills/*/SKILL.md` but **not** `.claude/agents/*.md`. `ClaudeCodeArtifacts` has no `agentDefinitions` field.
- `projectTreeProvider.ts:364-459` — `claude-code` handler builds CLAUDE.md + Rules/Commands/Skills nodes but has no Agents subsection.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-claude-agents-and-conditional-display/
├── spec.md              ← feature spec
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (affected files)

```text
src/
├── scanner/
│   ├── core/
│   │   └── scanClaudeCodeCore.ts     ← add scanClaudeAgentDefs(); claudeFolderExists
│   └── claudeCodeScanner.ts          ← add agentDefinitions, claudeFolderExists, watchAll pattern
├── providers/
│   └── projectTreeProvider.ts        ← add claude-agent-* categories; folder-gated sections
└── extension.ts                      ← add cursorFolderExists to project data map

specs/
├── providers/spec.md                 ← update category table; revise Guardrail #5
├── tree-view/spec.md                 ← add Claude Code to Workspaces diagram; folder-gating docs
└── scanners/spec.md                  ← add .claude/agents/ as scanned path

test/
└── suite/
    ├── unit/
    │   └── scanClaudeCodeCore.test.ts   ← add agent defs + claudeFolderExists tests
    └── integration/
        └── claudeCodeSection.test.ts    ← conditional display + Agents subsection tests
```

---

## Implementation Approach

### Feature A: Claude project agent definitions

**Step 1 — Core scanner** (`scanClaudeCodeCore.ts`):

Add `scanClaudeAgentDefs(fs, projectRoot)` — flat scan of `{projectRoot}/.claude/agents/*.md`, using the same `listFilesFlat` + content-read pattern as `scanClaudeCommands`. Each result is a `CoreAgentDefinition` (minimal: `path`, `fileName`, `content`).

Include the new scan in the existing `Promise.all` in `scanClaudeCodeCore()`:

```typescript
const [claudeMdPath, rules, commands, skills, agentDefinitions] = await Promise.all([
    statClaudeMd(fs, projectRoot),
    scanClaudeRules(fs, projectRoot),
    scanClaudeCommands(fs, projectRoot),
    scanClaudeSkills(fs, projectRoot),
    scanClaudeAgentDefs(fs, projectRoot)   // NEW
]);
```

`hasAnyArtifacts` updated to include `agentDefinitions.length > 0`.

**Step 2 — VS Code scanner** (`claudeCodeScanner.ts`):

Add `agentDefinitions: AgentDefinition[]` to `ClaudeCodeArtifacts`. Map `core.agentDefinitions` using existing `AgentDefinition` type (same as `agentsScanner.ts` produces). Add `.claude/agents/*.md` to `watchAll()` patterns.

**Step 3 — Tree provider** (`projectTreeProvider.ts`):

Add to `category` union: `'claude-agent-definitions' | 'claude-agent-definition'`

In `claude-code` handler (currently lines 364-411): add Agents subsection node alongside Rules/Commands/Skills. Nodes are always created (empty state shows "No agents found" when `agentDefinitions.length === 0`) and sorted alphabetically by label with siblings. No special-casing — mirrors the `agent-definitions` handler under Cursor.

Add handlers for the two new categories — pattern mirrors the `agent-definitions` / `agent-definition` handlers at lines 298-330.

### Feature B: Conditional platform section display (Workspaces view)

**Step 4 — Folder existence in core scanner** (`scanClaudeCodeCore.ts`):

Add `claudeFolderExists: boolean` to `CoreClaudeCodeArtifacts`. Check via `fs.stat('{projectRoot}/.claude')` — run in parallel with the existing scans. This is the canonical existence check; it does not re-use `hasAnyArtifacts`.

**Step 5 — Surface in VS Code scanner** (`claudeCodeScanner.ts`):

Add `claudeFolderExists: boolean` to `ClaudeCodeArtifacts`. Pass through from core result.

**Step 6 — Cursor folder check** (`extension.ts`):

Add `cursorFolderExists: boolean` to the project data map type in both `extension.ts` and `projectTreeProvider.ts`. In `refreshData()`, stat `{projectRoot}/.cursor` in parallel with the existing scanner calls and store the result per project.

```typescript
const [currentRules, currentCommands, currentSkills, currentAsdlcArtifacts,
       currentAgentDefs, currentClaudeCode, cursorFolderExists] = await Promise.all([
    ...,
    statFolderExists(workspaceRoot, '.cursor')   // NEW: returns boolean
]);
```

`statFolderExists` is a module-private helper:
```typescript
async function statFolderExists(root: vscode.Uri, subdir: string): Promise<boolean> {
    try {
        const stat = await vscode.workspace.fs.stat(vscode.Uri.joinPath(root, subdir));
        return stat.type === vscode.FileType.Directory;
    } catch {
        return false;
    }
}
```

**Step 7 — Gate sections in tree provider** (`projectTreeProvider.ts:150-175`):

Replace the current section-building logic:

```typescript
// BEFORE
sections = [Cursor, Specs];
if (claudeCodeArtifacts?.hasAnyArtifacts) sections.push(Claude);

// AFTER
if (currentProjectData?.cursorFolderExists) sections.push(Cursor);
sections.push(Specs);   // always shown if specs exist (not platform-gated)
if (claudeCodeArtifacts?.claudeFolderExists) sections.push(Claude);
```

Note: The Specs node visibility is unchanged — it continues to show if `specs/*/spec.md` files exist, independent of platform folders.

---

## Tasks (for `/speckit.tasks`)

### Feature A — Claude project agent definitions

- T001: Add `scanClaudeAgentDefs()` to `scanClaudeCodeCore.ts`; add `agentDefinitions: CoreAgentDefinition[]` to `CoreClaudeCodeArtifacts`; include in `Promise.all`
- T002: Add `agentDefinitions: AgentDefinition[]` to `ClaudeCodeArtifacts` in `claudeCodeScanner.ts`; map core results; add `.claude/agents/*.md` to `watchAll()`
- T003: Add `'claude-agent-definitions' | 'claude-agent-definition'` to `category` union and `claudeAgentDefinitionData?: AgentDefinition` to `ProjectTreeItem` in `projectTreeProvider.ts`
- T004: Add Agents subsection node to `claude-code` handler in `projectTreeProvider.ts` (alphabetical among Rules/Commands/Skills)
- T005: Add `claude-agent-definitions` and `claude-agent-definition` leaf handlers in `projectTreeProvider.ts` (mirrors `agent-definitions` / `agent-definition` handlers)

### Feature B — Conditional platform section display

- T006: Add `claudeFolderExists: boolean` to `CoreClaudeCodeArtifacts` and `ClaudeCodeArtifacts`; implement stat check in `scanClaudeCodeCore.ts` (parallel with existing scans)
- T007: Add `statFolderExists()` helper in `extension.ts`; add `cursorFolderExists: boolean` to project data map type in `extension.ts` and `projectTreeProvider.ts`; wire into `refreshData()` parallel scan
- T008: Replace section-gating logic in `projectTreeProvider.ts:150-175` — Cursor on `cursorFolderExists`, Claude Code on `claudeFolderExists`, Specs unchanged

### Living spec updates (same-commit)

- T009: Update `specs/providers/spec.md` — add `claude-agent-definitions` / `claude-agent-definition` to category table; revise Regression Guardrail #5 to distinguish platform-level hide (folder absent) from artifact-level empty state
- T010: Update `specs/tree-view/spec.md` — add Claude Code section to Workspaces branch description and diagram; document folder-gating rule for platform sections; update Scenarios
- T011: Update `specs/scanners/spec.md` — add `.claude/agents/` as a scanned path

### Tests

- T012: Unit tests in `scanClaudeCodeCore.test.ts` — agent defs scan with files present/absent; `claudeFolderExists` true/false
- T013: Integration/provider tests — Claude Code → Agents subsection renders correctly; leaf opens file; empty state when folder absent
- T014: Provider tests — Cursor section hidden when `.cursor/` absent; Claude Code section hidden when `.claude/` absent; both shown when both present; Specs node unaffected

---

## Complexity Tracking

No constitution violations. No new dependencies. No new abstractions beyond the existing scanner/provider/category patterns. The only non-obvious design decision is using `claudeFolderExists` (folder presence) rather than `hasAnyArtifacts` as the display gate — this is intentional and documented in spec 008 FR-006/FR-007.

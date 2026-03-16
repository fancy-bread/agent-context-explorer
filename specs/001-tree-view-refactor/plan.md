# Implementation Plan: Tree View (Two Views — Workspaces + Agents)

**Branch**: `001-tree-view-refactor` | **Date**: 2026-03-12 | **Spec**: [specs/tree-view/spec.md](../tree-view/spec.md) (living spec)

**Input**: Feature specification from living spec `specs/tree-view/spec.md`. This plan implements the two-view refactor (Workspaces + Agents) and related workspace/agent scope changes.

**Workflow**: Specify (this branch) → plan & task → clarify/analyze if needed → commit & PR to merge this implementation spec to main → create PBIs from tasks → implement (code) per PBI.

## Summary

Deliver two **separate sidebar views**: (1) **Workspaces** — root = project list, toolbar Add + Refresh; per project: Cursor (local commands/skills only), Specs + ASDLC, Speckit (constitution only). (2) **Agents** — root = agent roots (Cursor, Claude, Global) when directories exist; toolbar Refresh only. Remove global commands/skills from under each project’s Cursor section. Rename project-level “Agents” section to “Specs + ASDLC”. Speckit shows only constitution link (remove “Open .specify folder”). All changes stay viewer-only and use existing scanners; no new dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x (strict)  
**Primary Dependencies**: VS Code Extension API, existing scanners (RulesScanner, CommandsScanner, SkillsScanner, AsdlcArtifactScanner), ProjectManager  
**Storage**: N/A (in-memory project data; workspace state for added projects via VS Code API)  
**Testing**: Mocha, @vscode/test-electron; existing tree/provider unit and integration tests  
**Target Platform**: VS Code / Cursor IDE (extension host)  
**Project Type**: VS Code extension  
**Performance Goals**: Lazy load tree; refresh on file watchers; no blocking on main thread  
**Constraints**: Viewer-only (no CRUD from tree); `vscode.workspace.fs` only; paths validated against workspace / known home subdirs  
**Scale/Scope**: Multiple workspace projects; multiple agent roots (~/.cursor, ~/.claude, ~/.agents)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Viewer-only, explicit-artifact behavior**: Plan only changes how artifacts are **displayed** and **organized** (two views, scope split). No create/edit/delete of rules, commands, skills, or specs from the tree. Pass.
- **Safety and operational boundaries**: File access remains via existing scanners and `vscode.workspace.fs`; agent roots limited to known home subdirs (~/.cursor, ~/.claude, ~/.agents). Pass.
- **Strict TypeScript and quality**: Changes in existing provider/extension code; tests updated for new tree structure and view split. Pass.
- **ASDLC alignment**: Spec in `specs/tree-view/spec.md`; plan and tasks in this feature folder. Pass.
- **Simplicity and performance**: Two views and one additional provider (or split provider); no new heavy deps; same lazy-load and refresh model. Pass.

**No constitution violations.** Complexity Tracking table left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-tree-view-refactor/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 (view contributions)
└── tasks.md             # Phase 2 (/speckit.tasks — not created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── extension.ts                    # Register second view, second provider (or split), view-specific commands
├── providers/
│   └── projectTreeProvider.ts      # Refactor: workspace tree vs agents tree; category handling
├── scanner/                        # Existing; extend for agent roots if needed
│   ├── commandsScanner.ts
│   ├── skillsScanner.ts
│   └── ...
├── commands/
│   └── projectCommands.ts          # Add/Refresh already; ensure Add only in workspace view context
└── mcp/                            # No change for this feature

test/
├── suite/
│   ├── unit/
│   │   └── projectTreeProvider.test.ts   # Update for two views, new categories
│   ├── ui/
│   │   └── ruleLabels.test.ts            # Update for new structure
│   └── integration/
│       └── realRulesIntegration.test.ts  # Update for new structure
```

**Structure Decision**: Single extension codebase; tree view logic in `src/providers/projectTreeProvider.ts` (possibly split into WorkspaceTreeProvider and AgentsTreeProvider, or one provider with view-id parameter). Second view contributed in `package.json` under same `views.ace` container. Scanners remain shared; data for Agents view comes from existing global scan plus optional agent-root scans (~/.cursor, ~/.claude, ~/.agents).

## Complexity Tracking

> No constitution violations. Table not used.

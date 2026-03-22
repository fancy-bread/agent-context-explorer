# Implementation Plan: Agent definitions in Workspaces and Agents views

**Branch**: `004-agents-view-scan` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/004-agents-view-scan/spec.md`

## Summary

Add discovery and display of **agent definition files** (Markdown profiles in per-root `agents/` folders) in:

1. **Workspaces** tree — under each project’s **Cursor** section, as an **Agent definitions** subsection alongside Commands, Rules, and Skills.
2. **Agents** tree — under each **agent root** (Cursor, Claude, Global), as **Agent definitions** parallel to Commands and Skills.

Implementation follows existing ACE patterns: **scanner core** (`IFileSystem`) + **VS Code scanner wrapper**, **ProjectTreeProvider** / **AgentsTreeProvider** updates, optional **file watchers** for `.cursor/agents/**/*.md`, and **MCP** tools as thin adapters over the same scanner (see [research.md](./research.md)). **Living specs** for tree-view, scanners, providers, and MCP are updated in the same delivery (FR-007, FR-008).

## Technical Context

**Language/Version**: TypeScript **strict** (project standard), Node **≥24** (see `package.json` / CI).  
**Primary Dependencies**: VS Code Extension API (`vscode`), existing ACE scanners (`VSCodeFsAdapter`, `scan*Core` in `src/scanner/core/`), MCP SDK (stdio server + tools in `src/mcp/`).  
**Storage**: N/A (files on disk only; no DB).  
**Testing**: Mocha unit tests (`npm run test:unit` / `test:coverage`); colocated tests under `test/suite/unit/` for scanner core and providers where applicable.  
**Target Platform**: VS Code / Cursor extension host; MCP stdio server (Node).  
**Project Type**: Desktop IDE extension + MCP context server.  
**Performance Goals**: Discovery cost comparable to existing **commands/skills** scans for the same roots; no unbounded deep recursion; alphabetical sort for stable UI.  
**Constraints**: `vscode.workspace.fs` for I/O; paths validated to workspace / known agent roots; **viewer-only** (no writes from tree or MCP tools except opening files).  
**Scale/Scope**: Typical &lt;100 agent files per root; handle missing `agents/` directories gracefully.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|-----------|--------|
| Viewer-only, explicit artifacts | **Pass** — list/open only; no create/edit/delete of agent files from ACE. |
| Safety & boundaries | **Pass** — reuse path validation patterns from rules/commands/skills; agent roots are known home paths. |
| Strict TypeScript & tests | **Pass** — new types for `AgentDefinition`; unit tests for core scanner and MCP mapping. |
| ASDLC alignment | **Pass** — feature spec + this plan + contracts + living spec updates (FR-007/FR-008). |
| Simplicity & bundling | **Pass** — thin scanner + tree + optional MCP; no new heavy dependencies. |

**Post-design**: No violations; **Complexity Tracking** not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-agents-view-scan/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── agent-definitions.md
└── tasks.md             # /speckit.tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── scanner/
│   ├── core/
│   │   └── scanAgentDefinitionsCore.ts   # NEW: IFileSystem scan of agents/*.md
│   ├── agentsScanner.ts                  # NEW: VS Code wrapper (workspace + optional global)
│   └── types.ts                          # EXTEND: AgentDefinition types if not colocated
├── providers/
│   ├── projectTreeProvider.ts            # EXTEND: Cursor → Agent definitions
│   └── agentsTreeProvider.ts             # EXTEND: AgentRootDefinition + Agent definitions section
├── mcp/
│   └── toolsImpl.ts                      # EXTEND: list/get agent definitions (if shipping MCP)
├── extension.ts                          # EXTEND: load agent defs per project; resolveAgentRootsWithData; watchers
└── ...

test/suite/unit/
└── scanAgentDefinitionsCore.unit.test.ts # NEW (and provider/MCP tests as needed)
```

**Structure Decision**: Mirror **commands/skills** split — **core** scanner has no `vscode` import; extension and `AgentsScanner` adapt URIs. **Agent roots** for the Agents view reuse `resolveAgentRootsWithData` paths (`~/.cursor`, `~/.claude`, `~/.agents`).

## Complexity Tracking

> Not used — no constitution violations.

## Phase 0 & Phase 1 Outputs

| Artifact | Path |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| Contract | [contracts/agent-definitions.md](./contracts/agent-definitions.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

## Living Spec Updates (FR-007 / FR-008)

Concurrent documentation updates (same PR / release):

- `specs/tree-view/spec.md` — **Agent definitions** nodes in both views; icons; empty states.
- `specs/scanners/spec.md` — new scanner module and path rules.
- `specs/providers/spec.md` — `ProjectTreeProvider` / `AgentsTreeProvider` behavior.
- `specs/mcp/spec.md` & `specs/mcp/data-model.md` — new tools **or** explicit deferral per [contracts/agent-definitions.md](./contracts/agent-definitions.md).

---

**Next command**: `/speckit.tasks` to generate `tasks.md` from this plan.

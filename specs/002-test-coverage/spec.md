# Feature Specification: Test Coverage — Complete Untested

**Feature Branch**: `002-test-coverage`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: `.plans/untested.txt` (output of `npm run audit:untested`)

## Clarifications

### Session 2026-03-19

- Primary scope → **Test implementation only** (use the known list as input; no new audit tooling required in this epic)

## Epic Summary

This epic is about **completing test coverage for the known untested set** of source files that were not imported by any test at the time of the audit.

Work is intentionally split into **3 small stories** grouped by subsystem:

- **Story A (MCP)**: cover MCP layer files (schemas/tools/server glue)
- **Story B (Scanner)**: cover scanner core + Node FS adapter code paths
- **Story C (Commands, Extension, Services, Utils)**: cover extension entrypoints, commands, services, and utilities

### Known Gap File List (authoritative scope)

From `.plans/untested.txt`:

#### MCP

- `src/mcp/mcpServerProvider.ts`
- `src/mcp/resources.ts`
- `src/mcp/server.ts`
- `src/mcp/tools.ts`

#### Scanner

- `src/scanner/adapters/nodeFsAdapter.ts`
- `src/scanner/core/index.ts`
- `src/scanner/core/listFiles.ts`
- `src/scanner/core/ruleParsing.ts`
- `src/scanner/core/scanRulesCore.ts`

#### Commands, Extension, Services, Utils

- `src/commands/projectCommands.ts`
- `src/extension.ts`
- `src/services/projectManager.ts`
- `src/types/vscode-cursor.d.ts`
- `src/utils/fileWatcher.ts`

## User Scenarios & Testing *(mandatory)*

### Story A — MCP coverage (Priority: P1)

As a maintainer, I want the MCP layer files in the known gap list to be exercised by tests so that MCP regressions are caught without requiring a VS Code integration runner.

**Scope**: MCP files listed above (4 files).

**Acceptance Criteria**:

- **AC-A1**: `npm run test:unit` passes.
- **AC-A2**: `npm run test:coverage` completes (no hang) and shows **non-zero coverage** for each scoped MCP file (they must appear in the NYC table with >0% lines).
- **AC-A3**: Tests are deterministic (no timers/sleeps, no reliance on real network beyond loopback / in-memory).

### Story B — Scanner coverage (Priority: P2)

As a maintainer, I want scanner core codepaths and the Node FS adapter to be exercised by tests so that artifact discovery and rule parsing changes don’t silently regress.

**Scope**: scanner files listed above (5 files).

**Acceptance Criteria**:

- **AC-B1**: `npm run test:unit` passes.
- **AC-B2**: `npm run test:coverage` completes (no hang) and shows **non-zero coverage** for each scoped scanner file.
- **AC-B3**: Tests use the VS Code stub / adapters (no direct real filesystem scanning outside test fixtures).

### Story C — Commands, Extension, Services, Utils coverage (Priority: P3)

As a maintainer, I want core non-scanner/non-MCP entrypoints and utilities to be exercised by tests so that extension behavior changes are covered by fast feedback.

**Scope**: Commands, extension, services, and utils list above (5 files).

**Acceptance Criteria**:

- **AC-C1**: `npm run test:unit` passes.
- **AC-C2**: `npm run test:coverage` completes (no hang) and shows **non-zero coverage** for each scoped file **except** `src/types/vscode-cursor.d.ts` (see exclusions).

## Edge Cases

- **Type-only files**: `.d.ts` may be excluded from “must have non-zero coverage” because it is not runtime JS.
- **Hanging tests**: open handles (servers/watchers) must be avoided or `unref()`/dispose must be used so coverage runs exit cleanly.
- **Inversion boundaries**: where code uses `vscode.workspace.fs`, tests should use the existing VS Code stub overrides rather than hitting disk.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: This epic MUST be delivered as 3 stories: **MCP**, **Scanner**, **Commands, Extension, Services, Utils** (aligned to the file list above).
- **FR-002**: Each story MUST add/adjust tests such that each in-scope `.ts` file is imported and exercised by at least one test (resulting in non-zero NYC coverage).
- **FR-003**: Test runs MUST NOT hang: `npm run test:coverage` must complete reliably.
- **FR-004**: `src/types/vscode-cursor.d.ts` MAY be excluded from coverage requirements and should be documented as an explicit exception.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After each story lands, the NYC summary shows **non-zero coverage** for each in-scope runtime `.ts` file for that story.
- **SC-002**: `npm run test:coverage` completes without hanging.

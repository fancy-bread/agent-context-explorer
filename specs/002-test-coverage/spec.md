# Feature Specification: Test Coverage — Complete Untested

**Feature Branch**: `002-test-coverage`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: `.plans/untested.txt` (output of `npm run audit:untested`)

## Clarifications

### Session 2026-03-19

- Primary scope → **Test implementation only** (use the known list as input; no new audit tooling required in this epic)
- **Story D (P4)** → **Per-file line coverage**: each instrumented `src/**/*.ts` file (per project NYC `include` / `exclude`) MUST have **`% Lines` ≥ 80** in the NYC table, enforced via NYC **check-coverage** with **per-file** thresholds. *How* contributors or agents close gaps per file (iterative tests, refactors, documented exclusions) is **not specified** in the spec.

### Session 2026-03-21

- **Clarification**: “All files” in the NYC summary means the **set** of instrumented sources, not a single aggregate row only — **Story D** requires **each** included file to meet the **≥ 80% lines** bar (per-file mode), not merely **≥ 80%** on the combined **All files** row.

## Epic Summary

This epic is about **completing test coverage for the known untested set** of source files that were not imported by any test at the time of the audit, and **raising overall unit-test line coverage** to a sustained minimum.

Work is split into **4 stories**:

- **Story A (P1)**: MCP — cover MCP layer files (schemas/tools/server glue)
- **Story B (P2)**: Scanner — cover scanner core + Node FS adapter code paths
- **Story C (P3)**: Commands, Extension, Services, Utils — cover extension entrypoints, commands, services, and utilities
- **Story D (P4)**: **Line coverage gate** — **≥ 80% lines per file** (each instrumented `src/**/*.ts` row in NYC) after `npm run test:coverage`; **per-file** check-coverage so any file below threshold fails the command

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

### Story D — Line coverage gate (Priority: P4)

As a maintainer, I want **each** instrumented source file’s **line coverage** to stay at or above **80%** so that weak spots are not hidden inside a healthy aggregate.

**Scope**: All `src/**/*.ts` files included by the project’s NYC configuration (excluding generated/type-only paths that config already excludes). Coverage is evaluated **per file**, not only as a single combined total.

**Acceptance Criteria**:

- **AC-D1**: `npm run test:unit` passes.
- **AC-D2**: `npm run test:coverage` completes (no hang) and **every** included file row in the NYC table shows **`% Lines` ≥ 80** (not merely the **All files** aggregate).
- **AC-D3**: NYC **check-coverage** uses **per-file** mode with **line** threshold **80** so that **any** file below **80%** lines causes a **non-zero exit** from the coverage command (regressions fail locally/CI).
- **AC-D4**: Any intentional exclusion from the gate (if allowed by project policy) MUST be documented with rationale; default is **no** file-specific carve-outs beyond existing `.nycrc` excludes.

## Edge Cases

- **Type-only files**: `.d.ts` may be excluded from “must have non-zero coverage” because it is not runtime JS.
- **Hanging tests**: open handles (servers/watchers) must be avoided or `unref()`/dispose must be used so coverage runs exit cleanly.
- **Inversion boundaries**: where code uses `vscode.workspace.fs`, tests should use the existing VS Code stub overrides rather than hitting disk.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: This epic MUST be delivered as **4 stories**: **MCP**, **Scanner**, **Commands, Extension, Services, Utils**, and **Line coverage gate (P4)** (aligned to the file list above for A–C).
- **FR-002**: Stories A–C MUST add/adjust tests such that each in-scope `.ts` file is imported and exercised by at least one test (resulting in non-zero NYC coverage), subject to **FR-004**.
- **FR-003**: Test runs MUST NOT hang: `npm run test:coverage` must complete reliably.
- **FR-004**: `src/types/vscode-cursor.d.ts` MAY be excluded from per-file “non-zero” expectations in A–C and should be documented as an explicit exception where relevant.
- **FR-005** (P4): **Per-file** **line** coverage for each NYC-instrumented `src/**/*.ts` file MUST be **≥ 80%** after `npm run test:coverage`, and the project MUST enforce that minimum via NYC **check-coverage** with **per-file** thresholds (or equivalent) so any file below the bar fails the command.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After stories A–C land, the NYC summary shows **non-zero coverage** for each in-scope runtime `.ts` file for each story (subject to **FR-004**).
- **SC-002**: `npm run test:coverage` completes without hanging.
- **SC-003** (P4): **Each** instrumented file’s **`% Lines` ≥ 80** with check-coverage in **per-file** mode and **lines** threshold **80**; `npm run test:coverage` exits **0** only when every included file satisfies the gate.

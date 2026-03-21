# Implementation Plan: Test Coverage — Complete Untested

**Branch**: `002-test-coverage` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/002-test-coverage/spec.md`

## Summary

Fill in test coverage for the known set of `src/**` files that were not imported by any test at the time of the audit. Deliver as **4 stories**: three subsystem slices (MCP / Scanner / Commands+Extension+Services+Utils) with **non-zero** per-file line coverage for declared targets, plus **Story D (P4)**: **≥ 80% aggregate `% Lines`** on NYC **All files** for instrumented `src/**/*.ts`, with NYC **check-coverage** enforcing the line floor. *How* agents or humans iterate tests to reach 80% is not prescribed by this plan.

## Technical Context

**Language/Version**: TypeScript (strict)  
**Primary Dependencies**: VS Code Extension API, Mocha, NYC, ESLint, Vite bundling  
**Storage**: N/A (test and tooling changes only)  
**Testing**: Mocha (`npm run test:unit`), VS Code integration tests (`npm test`), coverage via NYC (`npm run test:coverage`)  
**Target Platform**: macOS/Linux/Windows dev environments (Node runtime in extension host)  
**Project Type**: VS Code / Cursor extension + bundled MCP server  
**Performance Goals**: Keep unit tests fast (sub-second to low seconds locally); avoid introducing slow integration tests for pure logic  
**Constraints**:
- No new dependencies unless strictly necessary (prefer existing tooling)
- Avoid flaky tests and “hanging” test runs (open handles)
- Maintain viewer-only philosophy (no behavior changes beyond testing/tooling)
**Scale/Scope**: Fixed known-gap list in `.plans/untested.txt` (stories A–C); **P4** applies to **full** instrumented `src/**` per `.nycrc` (aggregate line gate at 80%)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify this plan complies with the project constitution, at minimum:

- Viewer-only, explicit-artifact behavior (no hidden mutation of specs/rules/skills)
- Safety and operational boundaries (workspace-only file access, error handling)
- Strict TypeScript and quality expectations (tests, patterns, explicit types)
- ASDLC alignment (specs, plans, tasks kept in sync)
- Simplicity and performance constraints (avoid unnecessary complexity or regressions)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
src/
├── commands/
├── mcp/
├── providers/
├── scanner/
├── services/
├── types/
└── utils/

test/
└── suite/
    ├── unit/
    ├── integration/
    ├── commands/
    └── ui/
```

**Structure Decision**: Single project repo. Coverage work is primarily in `test/suite/unit/` for pure logic and wrappers; integration tests in `test/suite/integration/` only when VS Code host behavior is required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Phase 0: Research

No additional research is required for this epic beyond reading the existing test anatomy docs and following established patterns:

- `test/README.md` for where to put tests
- VS Code stub patterns in `test/vscode-stub/index.js`
- Existing unit tests that already cover most of MCP/scanner surface area

## Phase 1: Design & Contracts

### Data model

This feature introduces no persistent runtime data model. The “entities” are documentation-level artifacts used to structure incremental coverage PBIs:

- Untested file list (input)
- Coverage work item (scope)
- Coverage gate (definition)

**Output**: `data-model.md`

### Contracts

No public API contracts change. The “contract” is the **story acceptance criteria** in `spec.md`: stories A–C = non-zero per-file coverage + no hang; **story D** = **≥ 80% lines** aggregate + enforced **check-coverage**. See [contracts/coverage-pbi.md](./contracts/coverage-pbi.md).

**Output**: `contracts/coverage-pbi.md`

### Quickstart

Use the existing project test documentation as the quickstart source of truth (`test/README.md`). Verification:

- `npm run test:unit`
- `npm run test:coverage` — stories A–C: confirm target rows in the text report; **story D**: confirm **All files** `% Lines` ≥ **80** and command exits **0** with check-coverage enabled.

**Output**: [quickstart.md](./quickstart.md)

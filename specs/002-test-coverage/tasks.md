# Tasks: Test Coverage — Complete Untested

**Input**: Design documents from `specs/002-test-coverage/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks grouped into 3 stories (MCP / Scanner / Commands+Extension+Services+Utils). Each story is an independently shippable slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Source: `src/**`
- Tests: `test/suite/unit/**` (default), `test/suite/integration/**` (only when VS Code host required)

---

## Phase 0: Baseline verification (shared)

**Purpose**: Ensure we can measure “done” reliably for each story.

- [ ] T001 Verify baseline: `npm run test:unit` passes from repo root
- [ ] T002 Verify coverage runner completes (no hang): `npm run test:coverage`

---

## Story A (P1): MCP

**Scope**:

- `src/mcp/mcpServerProvider.ts`
- `src/mcp/resources.ts`
- `src/mcp/server.ts`
- `src/mcp/tools.ts`

**Done when**: story AC-A1..AC-A3 in `spec.md` are satisfied.

- [ ] T010 Add/adjust unit tests so each scoped MCP file is imported and exercised by at least one test
- [ ] T011 Ensure any server/socket behavior does not hang coverage runs (dispose/unref as needed)
- [ ] T012 Run `npm run test:coverage` and confirm each scoped MCP file shows non-zero coverage in the NYC table

---

## Story B (P2): Scanner

**Scope**:

- `src/scanner/adapters/nodeFsAdapter.ts`
- `src/scanner/core/index.ts`
- `src/scanner/core/listFiles.ts`
- `src/scanner/core/ruleParsing.ts`
- `src/scanner/core/scanRulesCore.ts`

**Done when**: story AC-B1..AC-B3 in `spec.md` are satisfied.

- [ ] T020 Add/adjust unit tests so each scoped scanner file is imported and exercised by at least one test
- [ ] T021 Prefer VS Code stub overrides / adapters over direct disk scanning outside fixtures
- [ ] T022 Run `npm run test:coverage` and confirm each scoped scanner file shows non-zero coverage in the NYC table

---

## Story C (P3): Commands, Extension, Services, Utils

**Scope**:

- `src/commands/projectCommands.ts`
- `src/extension.ts`
- `src/services/projectManager.ts`
- `src/types/vscode-cursor.d.ts` (explicit exception: type-only)
- `src/utils/fileWatcher.ts`

**Done when**: story AC-C1..AC-C2 in `spec.md` are satisfied.

- [ ] T030 Add/adjust unit tests so each scoped runtime `.ts` file is imported and exercised by at least one test
- [ ] T031 Document/confirm the explicit exception for `src/types/vscode-cursor.d.ts` (type-only) in the story notes / PR description
- [ ] T032 Run `npm run test:coverage` and confirm each scoped runtime `.ts` file shows non-zero coverage in the NYC table

---

## Dependencies & Execution Order

- Story A depends on T001–T002 (baseline).
- Stories B and C depend on T001–T002 (baseline) but not on each other.

## Parallel Opportunities

- Story B and Story C can be implemented in parallel once baseline is confirmed.


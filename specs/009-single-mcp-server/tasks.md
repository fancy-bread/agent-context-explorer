# Tasks: Single MCP Server Registration

**Input**: Design documents from `specs/009-single-mcp-server/`
**Feature**: 009-single-mcp-server | **Branch**: `009-single-mcp-server`

**Organization**: Two user stories (US1 = single server, US2 = no ACE_WORKSPACE_PATH) are tightly coupled — both are implemented in the same two methods of `mcpServerProvider.ts`. They are separated logically but implemented together. No foundational phase needed; all changes are in one file plus a living spec update.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no intra-phase dependency)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Foundational — Read and Understand Current Implementation

**Purpose**: Confirm exact line ranges and current behaviour before modifying. Both US1 and US2 touch the same methods; understanding the full shape prevents merge conflicts and missed call sites.

- [ ] T001 Read `src/mcp/mcpServerProvider.ts` in full — locate `provideMcpServerDefinitions()` (the per-folder `definitions` loop) and `syncCursorRegistration()` (the per-folder `cursorMcp.registerServer` loop); note all references to `ACE_WORKSPACE_PATH` and positional `folder.uri.fsPath` args; confirm `buildProjectList` in `src/mcp/extensionBackend.ts` does not read `ACE_WORKSPACE_PATH`

**Checkpoint**: Both methods and all env/arg usages located. Proceed to US1 and US2 together (same file, same edit session).

---

## Phase 2: User Story 1 — Single Server Regardless of Folder Count (Priority: P1) 🎯 MVP

**Goal**: `provideMcpServerDefinitions()` returns exactly one `McpStdioServerDefinition` named `'Agent Context Explorer'`; `syncCursorRegistration()` registers exactly one Cursor server named `'ace'` — for 0, 1, or N workspace folders.

**Independent Test**: Open a Cursor workspace with two folders. Verify the MCP panel shows exactly one server `ace`. Invoke `list_projects` — both projects are returned.

### Implementation for User Story 1

- [ ] T002 [US1] Rewrite `provideMcpServerDefinitions()` in `src/mcp/mcpServerProvider.ts`: remove the `for (const folder of workspaceFolders)` loop and the zero-folder guard; replace with a single `return [new vscode.McpStdioServerDefinition('Agent Context Explorer', 'node', [serverScript], env, '1.0.0')]` where `env` comes from `ensureBackendOrFallback()` only; preserve the try/catch around `ensureBackendOrFallback` and the `outputChannel` logging
- [ ] T003 [US1] Rewrite `syncCursorRegistration()` in `src/mcp/mcpServerProvider.ts`: remove the `folders` variable, `folders.length === 1` ternary, and the `for (const folder of folders)` loop; replace with a single `cursorMcp.registerServer({ name: 'ace', server: { command: 'node', args: [serverScript], env: envBase } })`; push `'ace'` to `this.cursorServerNames`; preserve the unregister loop for cleanup of stale names and the outer try/catch

**Checkpoint**: US1 independently testable — with 2 workspace folders, `provideMcpServerDefinitions` returns 1 item and `syncCursorRegistration` registers 1 server.

---

## Phase 3: User Story 2 — No ACE_WORKSPACE_PATH in Server Env (Priority: P2)

**Goal**: Neither registration path passes `ACE_WORKSPACE_PATH` in the server env; neither passes a positional `folder.uri.fsPath` arg to the server script.

**Independent Test**: Inspect the registered server env in a multi-folder workspace — `ACE_WORKSPACE_PATH` is absent; `ACE_EXTENSION_PORT` (bridge) or `ACE_PROJECT_PATHS` (standalone) is present.

### Implementation for User Story 2

- [ ] T004 [US2] Verify T002 and T003 outputs contain no `ACE_WORKSPACE_PATH` reference and no `folder.uri.fsPath` positional arg — these should have been removed as part of the loop removal; if any remain, remove them now; confirm `envBase` from `ensureBackendOrFallback()` is the only env source for both methods

**Checkpoint**: US2 complete — env contains only `ACE_EXTENSION_PORT` (bridge) or `ACE_PROJECT_PATHS` (standalone); `ACE_WORKSPACE_PATH` absent in all code paths.

---

## Phase 4: Tests + Living Spec (Polish & Cross-Cutting)

**Purpose**: Assert the single-server invariant holds for 0/1/N folders; document in the MCP living spec.

- [ ] T005 [P] Add unit tests in `test/suite/unit/mcpServerProvider.test.ts`: (a) `provideMcpServerDefinitions()` returns exactly 1 definition when workspace has 0 folders; (b) returns exactly 1 definition when workspace has 1 folder; (c) returns exactly 1 definition when workspace has 2 folders; (d) the single definition label is `'Agent Context Explorer'`; (e) `ACE_WORKSPACE_PATH` is not present in the definition env for any folder count — follow the existing test patterns in that file using the VS Code stub and mock `workspaceFolders`
- [ ] T006 [P] Add unit tests in `test/suite/unit/mcpServerProvider.test.ts` for `syncCursorRegistration()`: (a) calls `registerServer` exactly once with `name: 'ace'` when workspace has 0 folders; (b) exactly once with `name: 'ace'` for 1 folder; (c) exactly once with `name: 'ace'` for 2 folders; (d) `ACE_WORKSPACE_PATH` not present in the registered server env — mock `getCursorMcp` return value and capture `registerServer` call args
- [ ] T007 [P] Update `specs/mcp/spec.md` Regression Guardrails section: add item "**7. Single server**: ACE MUST register exactly one MCP server (`ace`) regardless of the number of open workspace folders. Multi-project access is provided via `list_projects` + `projectKey`, not via multiple server registrations."
- [ ] T008 Run `npm run test:unit` — all tests pass including T005 and T006; confirm 0 references to `ACE_WORKSPACE_PATH` remain in `src/mcp/mcpServerProvider.ts` via `grep -n ACE_WORKSPACE_PATH src/mcp/mcpServerProvider.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: T001 read-only — must complete before T002/T003
- **Phase 2 (US1)**: T002 and T003 can run in parallel (same file but non-overlapping method bodies); both depend on T001
- **Phase 3 (US2)**: T004 depends on T002 and T003 (verifies their output)
- **Phase 4**: T005, T006, T007 can run in parallel after T004; T008 depends on all three

### User Story Dependencies

- **US1 (P1)**: Independently testable after T002 + T003
- **US2 (P2)**: Depends on US1 (T004 verifies US1 output); not independently testable in isolation

### Parallel Opportunities

- T002 and T003 can run in parallel (different method bodies in same file)
- T005, T006, T007 can all run in parallel (T005/T006 are separate test blocks; T007 is a different file)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Read current implementation (T001)
2. Rewrite `provideMcpServerDefinitions()` (T002)
3. Rewrite `syncCursorRegistration()` (T003)
4. **STOP and VALIDATE**: Open a two-folder Cursor workspace; confirm only one `ace` server appears in the MCP panel; invoke `list_projects` — both folders returned
5. Proceed to T004–T008 once MVP confirmed

### Incremental Delivery

1. T001 → understand current code ✅
2. T002 + T003 → single server registered ✅
3. T004 → env verified clean ✅
4. T005 + T006 + T007 → tested and spec updated ✅
5. T008 → CI gate passes ✅

---

## Notes

- `ensureBackendOrFallback()` must not be called more than once per `provideMcpServerDefinitions` invocation — it has an early-return guard for `this.backendPort !== undefined`, so this is safe but worth verifying the call pattern after rewrite
- The `cursorServerNames` array will hold `['ace']` after a successful `syncCursorRegistration` — the cleanup loop in `dispose()` and `syncCursorRegistration()` itself remains correct with a single-element array
- `grep -rn ACE_WORKSPACE_PATH src/` should return zero results after T002–T004
- T007 (mcp spec update) must be in the same PR as the implementation per the same-commit rule in `specs/README.md`

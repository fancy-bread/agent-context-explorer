---

description: "Task list for Claude Code project-level artifact support"
---

# Tasks: Claude Code Project-Level Artifact Support

**Input**: Design documents from `/specs/006-claude-code-project-support/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/claude-code-artifacts.md, research.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Foundational — Types & Core Scanner (Blocking Prerequisites)

**Purpose**: Define types and implement the core scanner logic that all user story phases depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Add `ClaudeMdFile`, `ClaudeCommand`, and `ClaudeCodeArtifacts` types to `src/types.ts` (or equivalent shared types file) per `data-model.md`
- [ ] T002 Extend `TreeItemCategory` union in `src/types.ts` with `'claude-code'`; add context value strings `'claude-md'` and `'claude-command'`
- [ ] T003 Implement `scanClaudeCodeCore` in `src/scanner/core/scanClaudeCodeCore.ts`: accept `IFileSystem`, `projectRoot`, `userRoot`; parallel-stat `{projectRoot}/CLAUDE.md` and `{userRoot}/.claude/CLAUDE.md`; flat-scan `{projectRoot}/.claude/commands/*.md` and `{userRoot}/.claude/commands/*.md` (exclude `README.md`); return `ClaudeCodeArtifacts`
- [ ] T004 Implement `ClaudeCodeScanner` class in `src/scanner/claudeCodeScanner.ts`: constructor accepts `workspaceRoot: vscode.Uri`; `scan()` wraps `scanClaudeCodeCore` with `VSCodeFsAdapter` and `os.homedir()`; expose `watchAll(callback)` returning disposables
- [ ] T005 Write unit tests for `scanClaudeCodeCore` in `test/suite/scanner/scanClaudeCodeCore.test.ts` using `NodeFsAdapter` and fixture directories: cover project CLAUDE.md present/absent, global CLAUDE.md present/absent, commands in both scopes, empty dirs, missing dirs

**Checkpoint**: Scanner is independently testable — run `npm test` to verify T005 passes before proceeding.

---

## Phase 2: User Story 1 — View Claude Code Artifacts in Tree (Priority: P1) 🎯 MVP

**Goal**: A "Claude Code" section appears in the per-project tree, listing CLAUDE.md and commands from both project and global scopes.

**Independent Test**: Open a workspace with `CLAUDE.md` and `.claude/commands/` containing at least one `.md` file. Verify the "Claude Code" section appears in the tree with correct children.

### Implementation for User Story 1

- [ ] T006 [US1] Extend `ProjectTreeProvider` in `src/providers/projectTreeProvider.ts` to accept `ClaudeCodeArtifacts` in the per-project data map (add field alongside existing Cursor/ASDLC data)
- [ ] T007 [US1] Add `getClaudeCodeChildren()` method (or equivalent) to `ProjectTreeProvider`: render "Claude Code" group node with icon `symbol-file` and artifact count; hide group when `hasAnyArtifacts === false`
- [ ] T008 [P] [US1] Render CLAUDE.md items in `ProjectTreeProvider`: label `CLAUDE.md`, description `"workspace"` or `"global"`, icon `file-text`, context `'claude-md'`
- [ ] T009 [P] [US1] Render "Commands" group and command leaf items in `ProjectTreeProvider`: group shows count, leaf label = filename without `.md`, description `"global"` for global scope, icon `terminal`, context `'claude-command'`
- [ ] T010 [US1] Extend `ProjectTreeItem` in `src/providers/projectTreeProvider.ts` with `claudeMdData?: ClaudeMdFile` and `claudeCommandData?: ClaudeCommand` fields

**Checkpoint**: Extension loads; Claude Code section appears with correct items and counts.

---

## Phase 3: User Story 2 — View Global Claude Code Artifacts (Priority: P2)

**Goal**: Global `~/.claude/CLAUDE.md` and `~/.claude/commands/` items appear in the Claude Code section, visually distinguished from workspace-scope items.

**Independent Test**: With `~/.claude/commands/` containing at least one file, verify those items appear under the Commands group labeled `"global"`.

### Implementation for User Story 2

- [ ] T011 [US2] Verify `scanClaudeCodeCore` (T003) correctly resolves global artifacts via `userRoot`; adjust if `~/.claude/` does not exist (graceful skip, no error)
- [ ] T012 [US2] Confirm tree rendering from T008–T009 correctly applies `"global"` description to items with `scope === 'global'`; add scope-distinguishing display if not already handled by T008/T009
- [ ] T013 [US2] Manual smoke test: confirm both project and global commands with the same filename both appear in the tree with distinct scope labels

**Checkpoint**: Global and workspace commands both visible, clearly scope-labeled.

---

## Phase 4: User Story 3 — Open Artifact Files from Tree (Priority: P3)

**Goal**: Clicking any Claude Code artifact in the tree opens the file in the editor.

**Independent Test**: Click a CLAUDE.md item and a command item — each opens the correct file in the editor with no errors.

### Implementation for User Story 3

- [ ] T014 [US3] Register `openClaudeMd` command in `src/extension.ts` (or reuse generic open-file command) that calls `vscode.window.showTextDocument(item.claudeMdData.uri)` for `'claude-md'` context items
- [ ] T015 [US3] Register `openClaudeCommand` command in `src/extension.ts` (or reuse generic open-file command) that calls `vscode.window.showTextDocument(item.claudeCommandData.uri)` for `'claude-command'` context items
- [ ] T016 [US3] Wire `onDidChangeSelection` or `command` property on `ProjectTreeItem` for `'claude-md'` and `'claude-command'` items to trigger file open

**Checkpoint**: All Claude Code tree items open correct files on click.

---

## Phase 5: User Story 4 — Tree Refreshes on File Changes (Priority: P4)

**Goal**: File system changes to `.claude/commands/` and `CLAUDE.md` at project root automatically refresh the tree.

**Independent Test**: Add a new `.md` to `.claude/commands/` without reloading the extension — verify it appears in the tree within 3 seconds.

### Implementation for User Story 4

- [ ] T017 [US4] Add file watcher for `{workspaceRoot}/.claude/commands/*.md` in `setupFileWatcher()` in `src/extension.ts`: wire `onDidCreate`, `onDidChange`, `onDidDelete` to `refreshData()`
- [ ] T018 [US4] Add file watcher for `{workspaceRoot}/CLAUDE.md` in `setupFileWatcher()` in `src/extension.ts`: wire `onDidCreate`, `onDidChange`, `onDidDelete` to `refreshData()`
- [ ] T019 [US4] Dispose new watchers in extension `deactivate()` alongside existing watchers

**Checkpoint**: Creating/deleting `.claude/commands/` files and `CLAUDE.md` refresh the tree without reload.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Wire everything together, connect scanner to refresh cycle, verify error handling.

- [ ] T020 Instantiate `ClaudeCodeScanner` in `src/extension.ts` alongside `RulesScanner`, `CommandsScanner`, etc.; pass `workspaceRoot` on activation
- [ ] T021 Include `claudeCodeScanner.scan()` in `refreshData()` in `src/extension.ts`, running in parallel with existing scans; pass results to `ProjectTreeProvider`
- [ ] T022 [P] Verify graceful error handling: missing `.claude/` directory does not throw; logs to output channel consistent with existing scanner error handling
- [ ] T023 [P] Confirm `ClaudeCodeScanner` disposables are registered for cleanup in `deactivate()`
- [ ] T024 [P] Manual end-to-end test: workspace with no Claude Code artifacts → section hidden; add `CLAUDE.md` → section appears; add command → command listed; remove command → command removed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately; BLOCKS all user story phases
- **Phase 2–5 (User Stories)**: All depend on Phase 1 completion; can proceed in priority order or in parallel
- **Phase 6 (Polish)**: Depends on Phase 2 (T006–T010) and Phase 1 (T003–T004) for wiring

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 complete — no dependencies on other stories
- **US2 (P2)**: Depends on Phase 1 complete — builds on US1 rendering (T008, T009 must be done)
- **US3 (P3)**: Depends on US1 complete (tree items must exist to attach commands to)
- **US4 (P4)**: Depends on Phase 1 complete (`ClaudeCodeScanner` must exist) — independent of US1–US3

### Within Each Phase

- Types (T001–T002) before scanner (T003–T004)
- Core scanner (T003) before VS Code scanner wrapper (T004)
- Scanner (T004) before tree provider extension (T006–T010)
- Tree items (T010) before open-file commands (T014–T016)
- Scanner instantiation (T020) before refresh wiring (T021)

### Parallel Opportunities

- T001 and T002 can run in parallel (both in types file but non-conflicting additions)
- T003 and T005 can start independently (tests for T003 can be written alongside)
- T008 and T009 can run in parallel (different item types in same provider)
- T017 and T018 can run in parallel (different file watcher registrations)
- T022, T023, T024 can run in parallel (different concerns)

---

## Parallel Example: Phase 1 (Foundational)

```
Parallel:
  Task T003: Implement scanClaudeCodeCore in src/scanner/core/scanClaudeCodeCore.ts
  Task T005: Write unit tests for scanClaudeCodeCore (fixture dirs can be set up ahead of T003 completion)

Sequential after T003:
  Task T004: Implement ClaudeCodeScanner in src/scanner/claudeCodeScanner.ts
```

## Parallel Example: Phase 2 (User Story 1)

```
Sequential first:
  Task T006: Extend ProjectTreeProvider data map

Parallel after T006:
  Task T008: Render CLAUDE.md items
  Task T009: Render Commands group and leaf items

Sequential after T008+T009:
  Task T010: Extend ProjectTreeItem with data fields
  Task T007: Add getClaudeCodeChildren() and group hide logic
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Types + core scanner + tests
2. Complete Phase 2: Tree section renders correctly
3. Complete Phase 6 wiring tasks (T020–T021)
4. **STOP and VALIDATE**: Claude Code section visible in tree with correct items
5. Demo/validate before proceeding to US2–US4

### Incremental Delivery

1. Phase 1 → Scanner ready and tested
2. Phase 2 + Phase 6 wiring → Claude Code section visible (MVP)
3. Phase 3 → Global artifacts clearly scoped
4. Phase 4 → File navigation works
5. Phase 5 → Live refresh completes parity with Cursor section

---

## Notes

- [P] tasks = different files or non-conflicting additions, no blocking dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks generated — spec does not request TDD; T005 is a unit test for the core logic as per constitution quality requirements
- Existing Cursor scanning and tree behavior must not regress — run existing tests after each phase
- US2 implementation is largely validation that T003/T008/T009 already handle global scope correctly

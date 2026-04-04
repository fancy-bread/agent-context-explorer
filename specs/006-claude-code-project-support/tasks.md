---

description: "Task list for Claude Code project-level artifact support (full scope: CLAUDE.md, Rules, Commands, Skills)"
---

# Tasks: Claude Code Project-Level Artifact Support

**Input**: Design documents from `specs/006-claude-code-project-support/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/claude-code-artifacts.md, research.md

**Organization**: Tasks grouped by user story. Phase 1 (Foundational) blocks all stories; stories deliver incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Foundational — Types & Core Scanner (Blocking Prerequisites)

**Purpose**: Define all new types and implement the vscode-agnostic scanner logic that all user story phases depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 [P] Add `ClaudeMdFile`, `ClaudeRule`, `ClaudeCommand`, `ClaudeSkill`, `ClaudeCodeArtifacts` types to `src/types.ts`; extend `TreeItemCategory` union with `'claude-code'`; add context value strings `'claude-md'`, `'claude-rule'`, `'claude-command'`, `'claude-skill'`
- [ ] T002 Implement `scanClaudeCodeCore(fs: IFileSystem, projectRoot: string): Promise<ClaudeCodeArtifacts>` in `src/scanner/core/scanClaudeCodeCore.ts`: parallel stat for `{projectRoot}/CLAUDE.md`; recursive scan of `.claude/rules/` for `.md`/`.mdc` via `parseRuleFromString`; flat scan of `.claude/commands/*.md` (exclude README.md); one-level scan of `.claude/skills/*/SKILL.md` via `parseSKILLMetadata`; returns `ClaudeCodeArtifacts`
- [ ] T003 Implement `ClaudeCodeScanner` class in `src/scanner/claudeCodeScanner.ts`: constructor accepts `workspaceRoot: vscode.Uri`; `scan()` wraps `scanClaudeCodeCore` with `VSCodeFsAdapter`; `watchAll(callback: () => void): vscode.Disposable[]`
- [ ] T004 [P] Write unit tests for `scanClaudeCodeCore` in `test/suite/scanner/scanClaudeCodeCore.test.ts` using `NodeFsAdapter` and fixture directories — cover: each artifact type present/absent, empty directories, missing directories, mixed state, README.md exclusion from commands

**Checkpoint**: Core scanner independently tested — run `npm test` to verify T004 passes before proceeding.

---

## Phase 2: User Story 1 — View Claude Code Artifacts in Tree (Priority: P1) 🎯 MVP

**Goal**: A "Claude Code" section appears in the per-project tree displaying all four artifact groups — CLAUDE.md, Rules, Commands, Skills.

**Independent Test**: Open a workspace with a `CLAUDE.md`, `.claude/rules/` with at least one rule, `.claude/commands/` with at least one command, and `.claude/skills/` with at least one skill. Verify the "Claude Code" section appears with all groups and correct item labels. Then open a workspace with no `.claude/` artifacts and verify the section is hidden.

- [ ] T005 [US1] Extend `ProjectTreeItem` in `src/providers/projectTreeProvider.ts` with `claudeMdData?: ClaudeMdFile`, `claudeRuleData?: ClaudeRule`, `claudeCommandData?: ClaudeCommand`, `claudeSkillData?: ClaudeSkill` fields
- [ ] T006 [US1] Accept `ClaudeCodeArtifacts` in the per-project data map in `ProjectTreeProvider`; add Claude Code group node (icon: `symbol-file`, label: "Claude Code") that is hidden when `hasAnyArtifacts === false`
- [ ] T007 [P] [US1] Render CLAUDE.md child item in `src/providers/projectTreeProvider.ts`: label `CLAUDE.md`, icon `file-text`, context value `'claude-md'`
- [ ] T008 [P] [US1] Render Rules group and rule leaf items in `src/providers/projectTreeProvider.ts`: group label `Rules (N)`, icon `bookmark`; each rule leaf label = `fileName`, tooltip = `rule.metadata.description`, context value `'claude-rule'`; group hidden when count is zero
- [ ] T009 [P] [US1] Render Commands group and command leaf items in `src/providers/projectTreeProvider.ts`: group label `Commands (N)`, icon `terminal`; each command leaf label = `fileName` without `.md`, context value `'claude-command'`; group hidden when count is zero
- [ ] T010 [P] [US1] Render Skills group and skill leaf items in `src/providers/projectTreeProvider.ts`: group label `Skills (N)`, icon `play-circle`; each skill leaf label = `skill.metadata?.title ?? fileName`, tooltip = `skill.metadata?.overview`, context value `'claude-skill'`; group hidden when count is zero

**Checkpoint**: US1 complete — Claude Code section visible in tree with all four artifact groups, independently testable.

---

## Phase 3: User Story 2 — Open Artifact Files from Tree (Priority: P2)

**Goal**: Clicking any Claude Code artifact item in the tree opens the correct file in the editor.

**Independent Test**: Click a CLAUDE.md item, a rule, a command, and a skill in the tree. Verify each opens the corresponding file in the VS Code editor with no errors.

- [ ] T011 [US2] Wire open-file commands in `src/extension.ts` for all four Claude Code context values (`'claude-md'`, `'claude-rule'`, `'claude-command'`, `'claude-skill'`) — reuse the generic open-file pattern already used for Cursor items; register each via `vscode.commands.registerCommand`

**Checkpoint**: US2 complete — all four Claude Code artifact types are clickable and open their files.

---

## Phase 4: User Story 3 — Tree Refreshes on File Changes (Priority: P3)

**Goal**: File system changes to any `.claude/` artifact path trigger an automatic tree refresh.

**Independent Test**: Add a new `.md` file to `.claude/commands/` without reloading the extension. Verify the new command appears in the tree within 3 seconds.

- [ ] T012 [US3] Add four file watchers in `setupFileWatcher()` in `src/extension.ts`: `{workspaceRoot}/.claude/rules/**/*.{mdc,md}`, `{workspaceRoot}/.claude/commands/*.md`, `{workspaceRoot}/.claude/skills/*/SKILL.md`, `{workspaceRoot}/CLAUDE.md` — wire `onDidCreate`, `onDidChange`, `onDidDelete` to `refreshData()` for each
- [ ] T013 [US3] Register new watcher disposables in `context.subscriptions` (or the existing disposables array) in `src/extension.ts` to ensure cleanup on deactivation

**Checkpoint**: US3 complete — tree auto-refreshes within 3 seconds on all Claude Code artifact file changes.

---

## Phase 5: Polish & Extension Wiring

**Purpose**: Integrate scanner into the extension lifecycle; verify end-to-end behavior and no Cursor regression.

- [ ] T014 [P] Instantiate `ClaudeCodeScanner` in `src/extension.ts` `activate()` alongside existing scanners, passing the workspace root URI
- [ ] T015 Include `claudeCodeScanner.scan()` in `refreshData()` in `src/extension.ts`, running it in parallel with existing scans; pass `ClaudeCodeArtifacts` results to `ProjectTreeProvider`
- [ ] T016 [P] Register `ClaudeCodeScanner` in `context.subscriptions` in `src/extension.ts`; verify `deactivate()` disposes scanner cleanly
- [ ] T017 [P] Manual smoke test: workspace with Cursor artifacts only → only Cursor section shows; workspace with Claude Code artifacts only → only Claude Code section shows; workspace with both → both sections show independently with no cross-contamination

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately. BLOCKS all user story phases.
- **Phase 2 (US1)**: Depends on Phase 1 complete (types + scanner must exist).
- **Phase 3 (US2)**: Depends on Phase 2 complete (tree items must exist before open-file commands can be wired).
- **Phase 4 (US3)**: Depends on Phase 1 complete (`ClaudeCodeScanner` must exist); independent of US1–US2.
- **Phase 5 (Polish)**: Depends on Phases 2–4 complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 — no dependency on US2 or US3.
- **US2 (P2)**: Depends on US1 — tree items must exist to have commands wired.
- **US3 (P3)**: Depends on Phase 1 only — can be worked in parallel with US1.

### Within Each Phase

- T001 (types) must precede T002 (scanner) and T003 (VS Code scanner wrapper).
- T002 (core scanner) must precede T003 (wrapper).
- T003 (scanner) must precede T005–T010 (tree provider extension).
- T005 (extend ProjectTreeItem) must precede T006–T010.
- T014 (instantiate scanner) must precede T015 (wire refresh).

### Parallel Opportunities

```
Phase 1:  T001 + T004 in parallel (types vs. test scaffolding)
          T002 → T003 sequential

Phase 2:  T006 first, then T007 + T008 + T009 + T010 in parallel

Phase 5:  T014 + T016 + T017 in parallel; T015 after T014
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Types + core scanner + unit tests
2. Complete Phase 2: All four artifact groups visible in tree
3. Wire scanner into extension (T014–T015 from Phase 5)
4. **STOP and VALIDATE**: Claude Code section visible with all artifact groups
5. Proceed to US2, US3, and remaining Polish tasks

### Incremental Delivery

1. Phase 1 → Scanner ready and tested
2. Phase 2 + Phase 5 wiring → Claude Code section visible in tree (MVP)
3. Phase 3 → Artifact items clickable
4. Phase 4 → Live refresh active → full parity with Cursor section
5. Phase 5 remaining → clean disposal and smoke test

---

## Summary

- **17 tasks total**: 4 foundational + 6 US1 + 1 US2 + 2 US3 + 4 polish
- **No new external dependencies** — `gray-matter` already bundled; existing `parseRuleFromString` and `parseSKILLMetadata` reused
- **Unit test included** (T004) per plan.md requirement for `scanClaudeCodeCore`; no additional test tasks (spec does not request TDD)
- **Cursor section must not regress** — verify via T017 smoke test after each phase

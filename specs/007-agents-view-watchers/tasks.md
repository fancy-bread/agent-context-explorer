# Tasks: Agents View File Watchers

**Input**: Design documents from `/specs/007-agents-view-watchers/`
**Feature**: 007-agents-view-watchers | **Branch**: `007-agents-view-watchers`

**Organization**: Tasks are grouped by user story. US1 (Claude watchers) and US2 (Global watchers) can be implemented independently after the existing codebase patterns are understood. US3 (consistent pattern) is verified by completing US1+US2 and adding integration tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different logical blocks in same file, no intra-phase dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 3: User Story 1 — Claude Global Watchers (Priority: P1) 🎯 MVP

**Goal**: The Agents view auto-refreshes when files change under `~/.claude/commands/`, `~/.claude/skills/`, or `~/.claude/agents/`.

**Independent Test**: Add `~/.claude/commands/test-cmd.md`, verify it appears in the Agents view Claude root within 3 seconds. Delete it, verify it disappears. No extension reload required.

### Implementation for User Story 1

- [ ] T001 Read the three existing global watcher functions (`setupGlobalCommandsWatcher`, `setupGlobalSkillsWatcher`, `setupGlobalAgentsWatcher`) in `src/extension.ts` and confirm the implementation pattern to replicate
- [ ] T002 [P] [US1] Add `setupGlobalClaudeCommandsWatcher()` function to `src/extension.ts`, watching `~/.claude/commands/*.md`, mirroring `setupGlobalCommandsWatcher` exactly
- [ ] T003 [P] [US1] Add `setupGlobalClaudeSkillsWatcher()` function to `src/extension.ts`, watching `~/.claude/skills/*/SKILL.md`, mirroring `setupGlobalSkillsWatcher` exactly
- [ ] T004 [P] [US1] Add `setupGlobalClaudeAgentDefinitionsWatcher()` function to `src/extension.ts`, watching `~/.claude/agents/*.md`, mirroring `setupGlobalAgentsWatcher` exactly
- [ ] T005 [US1] Wire the three Claude watchers into `ensureDataLoaded()` in `src/extension.ts`, pushing each to `extensionContext.subscriptions` using the same guard pattern as the existing Cursor watchers (T002–T004 must be complete)

**Checkpoint**: User Story 1 is independently functional — Claude global artifacts auto-refresh the Agents view.

---

## Phase 4: User Story 2 — Global (`.agents`) Watchers (Priority: P2)

**Goal**: The Agents view auto-refreshes when files change under `~/.agents/commands/`, `~/.agents/skills/`, or `~/.agents/agents/`.

**Independent Test**: Add `~/.agents/commands/test-cmd.md`, verify it appears in the Agents view Global root within 3 seconds. Delete it, verify it disappears. No extension reload required.

### Implementation for User Story 2

- [ ] T006 [P] [US2] Add `setupGlobalDotAgentsCommandsWatcher()` function to `src/extension.ts`, watching `~/.agents/commands/*.md`, mirroring `setupGlobalCommandsWatcher` exactly
- [ ] T007 [P] [US2] Add `setupGlobalDotAgentsSkillsWatcher()` function to `src/extension.ts`, watching `~/.agents/skills/*/SKILL.md`, mirroring `setupGlobalSkillsWatcher` exactly
- [ ] T008 [P] [US2] Add `setupGlobalDotAgentsAgentDefinitionsWatcher()` function to `src/extension.ts`, watching `~/.agents/agents/*.md`, mirroring `setupGlobalAgentsWatcher` exactly
- [ ] T009 [US2] Wire the three DotAgents watchers into `ensureDataLoaded()` in `src/extension.ts`, immediately after the Claude watcher wiring added in T005 (T006–T008 must be complete)

**Checkpoint**: User Stories 1 AND 2 are both functional — Claude and Global roots auto-refresh independently.

---

## Phase 5: User Story 3 — Consistent Watcher Pattern (Priority: P3)

**Goal**: All three roots (Cursor, Claude, Global) have symmetric watcher coverage for all artifact types. Verified by integration tests and code review.

**Independent Test**: Run `npm test` — all watcher pattern tests pass. Manually trigger changes in `~/.cursor/commands/`, `~/.claude/commands/`, and `~/.agents/commands/` and confirm all three roots refresh.

### Implementation for User Story 3

- [ ] T010 [US3] Add integration tests for all six new watcher patterns (Claude: commands, skills, agents; DotAgents: commands, skills, agents) in `test/suite/integration/fileWatcherSetup.test.ts`, following the existing watcher test structure (T005 and T009 must be complete)
- [ ] T011 [US3] Run the full test suite (`npm test`) and confirm all tests pass including the new watcher tests
- [ ] T012 [US3] Run the manual quickstart test scenarios from `specs/007-agents-view-watchers/quickstart.md` to confirm graceful handling of missing directories and no regression in Cursor watcher behaviour

**Checkpoint**: All three roots have symmetric watcher coverage. All user stories complete and independently verifiable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 3 (US1)**: T001 read-only. T002–T004 can run in parallel after T001. T005 depends on T002–T004.
- **Phase 4 (US2)**: T006–T008 can run in parallel after T001. T009 depends on T005, T006–T008.
- **Phase 5 (US3)**: Depends on Phase 4 (T009 complete). T010–T012 are sequential.

### User Story Dependencies

- **US1 (P1)**: No dependencies on US2 or US3 — independently testable after T005.
- **US2 (P2)**: No dependencies on US1 — independently testable after T009. (T009 wires after T005 in the same block, but the US2 functions are independent of US1 functions.)
- **US3 (P3)**: Depends on US1 and US2 being complete — validates symmetric coverage.

### Parallel Opportunities

- T002, T003, T004 can all be implemented in parallel (separate function bodies in the same file, no cross-dependencies)
- T006, T007, T008 can all be implemented in parallel (same reasoning)
- Once T005 and T009 are both done, US3 can proceed

---

## Parallel Example: User Story 1

```bash
# These three function implementations can run in parallel:
Task: "Add setupGlobalClaudeCommandsWatcher() in src/extension.ts"   # T002
Task: "Add setupGlobalClaudeSkillsWatcher() in src/extension.ts"     # T003
Task: "Add setupGlobalClaudeAgentDefinitionsWatcher() in src/extension.ts"  # T004

# Then sequentially:
Task: "Wire Claude watchers into ensureDataLoaded() in src/extension.ts"  # T005
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Read existing pattern (T001)
2. Implement three Claude watcher functions (T002–T004)
3. Wire into `ensureDataLoaded()` (T005)
4. **STOP and VALIDATE**: Add `~/.claude/commands/test.md`, confirm Agents view refreshes
5. Proceed to US2 once MVP is confirmed working

### Incremental Delivery

1. Complete Phase 2 → Pattern confirmed
2. Add US1 → Test independently → Claude root auto-refreshes ✅
3. Add US2 → Test independently → Global root auto-refreshes ✅
4. Add US3 → Run integration tests → Symmetric pattern verified ✅
5. Each story adds value without breaking previous stories

---

## Notes

- All 6 new functions live in `src/extension.ts` alongside the 3 existing `setupGlobal*Watcher()` functions — no new files needed
- Log messages should follow the existing pattern: `"Global Claude commands watcher created successfully"` etc.
- `undefined` return from a watcher function means the watcher was skipped — `ensureDataLoaded()` must guard with `if (watcher) { subscriptions.push(watcher); }`
- Integration tests in `fileWatcherSetup.test.ts` should verify glob patterns only (not live file system events), consistent with existing tests in that file

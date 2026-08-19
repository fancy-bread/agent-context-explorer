# Tasks: Unify Artifact Scanning Across MCP Tools and Tree View

**Input**: Design documents from `specs/011-unify-artifact-scanning/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: No new project structure needed — extending existing scanner/MCP layers. No tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type changes and exported helpers that every downstream task depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Add `platform: 'cursor' | 'claude'` field to `CoreRule`, `CoreCommand`, `CoreSkill`, `CoreAgentDefinition` in `src/scanner/core/types.ts`
- [ ] T002 Export `scanClaudeRules`, `scanClaudeCommands`, `scanClaudeSkills`, `scanClaudeAgentDefs` from `src/scanner/core/scanClaudeCodeCore.ts` (remove the `private`-by-convention lack of `export`; keep `scanClaudeCodeCore()`'s aggregate behavior for CLAUDE.md/`claudeFolderExists` unchanged)

**Checkpoint**: Core types and reusable Claude-scan helpers exist — per-type core scan work can begin.

---

## Phase 3: User Story 1 — Agent gets complete results regardless of project's directory convention (Priority: P1) 🎯 MVP

**Goal**: MCP `list_rules`/`list_commands`/`list_skills`/`list_agents`/`get_*`/`get_project`, in both the standalone (`server.ts`) and bridge (`toolsImpl.ts`) implementations, return artifacts from both `.cursor/<type>/` and `.claude/<type>/`.

**Independent Test**: For a project with artifacts only under `.claude/skills/` (e.g. Bureau), call `list_skills` with that project's `projectKey` (standalone) and via a running extension (bridge) — verify the full `.claude/skills/*/SKILL.md` contents are returned in both.

### Core scan unification (per artifact type — parallelizable, different files)

- [ ] T003 [P] [US1] Merge `.claude/rules` workspace scan into `scanRulesCore` in `src/scanner/core/scanRulesCore.ts` (calls `scanClaudeRules` from T002); tag cursor-sourced results `platform: 'cursor'`, claude-sourced `platform: 'claude'`; concatenate cursor-first
- [ ] T004 [P] [US1] Merge `.claude/commands` workspace scan into `scanCommandsCore` in `src/scanner/core/scanCommandsCore.ts` (calls `scanClaudeCommands`); tag `platform`; concatenate cursor-first within each `location` tier
- [ ] T005 [P] [US1] Merge `.claude/skills` workspace scan into `scanSkillsCore` in `src/scanner/core/scanSkillsCore.ts` (calls `scanClaudeSkills`); tag `platform`; concatenate cursor-first within each `location` tier
- [ ] T006 [P] [US1] Merge `.claude/agents` workspace scan into `scanAgentDefinitionsCore` in `src/scanner/core/scanAgentDefinitionsCore.ts` (calls `scanClaudeAgentDefs`); tag `platform`
- [ ] T007 [P] [US1] Unit tests for cross-platform merge in `test/suite/unit/scannerSharedCore.test.ts` (existing file — rules-core scanning is tested here, not in a dedicated `scanRulesCore.test.ts`) — fixture project with both `.cursor/rules/` and `.claude/rules/`; assert both present, tagged, cursor-first ordering
- [ ] T008 [P] [US1] Unit tests for cross-platform merge in `test/suite/unit/scanCommandsCore.test.ts` — same pattern as T007, plus `location` tier ordering; also assert `location: 'global'` results remain `platform: 'cursor'` only (FR-007 — no new global-claude scanning introduced)
- [ ] T009 [P] [US1] Unit tests for cross-platform merge in `test/suite/unit/scanSkillsCore.test.ts` — same pattern as T007, plus `location` tier ordering; also assert `location: 'global'` results remain `platform: 'cursor'` only (FR-007 — no new global-claude scanning introduced)
- [ ] T010 [P] [US1] Unit tests for cross-platform merge in `test/suite/unit/scanAgentDefinitionsCore.unit.test.ts` (note the `.unit.` infix — matches the existing file's actual name) — same pattern as T007

All of T007–T010 MUST also cover the single-platform-missing case (FR-006): when only one of `.cursor/<type>/` / `.claude/<type>/` exists for a fixture, assert the other platform contributes no entries and no error is thrown.

**Checkpoint**: Core scans return merged, tagged results — safe to build both scanner-class and MCP-layer changes on top.

### Scanner class unfiltered methods (per class — parallelizable, different files; depends on T003–T006)

- [ ] T011 [P] [US1] Add unfiltered method (e.g. `scanAllRules()`) to `RulesScanner` in `src/scanner/rulesScanner.ts` returning the full unified, platform-tagged result from `scanRulesCore`; existing `scanRules()` unchanged, still filters to `platform === 'cursor'`
- [ ] T012 [P] [US1] Add unfiltered methods (e.g. `scanAllWorkspaceCommands()`, `scanAllGlobalCommands()`) to `CommandsScanner` in `src/scanner/commandsScanner.ts`; existing `scanWorkspaceCommands()`/`scanGlobalCommands()` unchanged, still filter to `platform === 'cursor'`
- [ ] T013 [P] [US1] Add unfiltered methods (e.g. `scanAllWorkspaceSkills()`, `scanAllGlobalSkills()`) to `SkillsScanner` in `src/scanner/skillsScanner.ts`; existing `scanWorkspaceSkills()`/`scanGlobalSkills()` unchanged, still filter to `platform === 'cursor'`
- [ ] T014 [P] [US1] Add unfiltered method (e.g. `scanAllWorkspaceAgentDefinitions()`) to `AgentsScanner` in `src/scanner/agentsScanner.ts`; existing `scanWorkspaceAgentDefinitions()` unchanged, still filters to `platform === 'cursor'`
- [ ] T015 [P] [US1] Unit tests for new unfiltered methods in `test/suite/unit/rulesScanner.test.ts`, `commandsScanner.test.ts`, `skillsScanner.test.ts`, `agentsScanner.test.ts` — assert existing methods remain cursor-only (regression guard for US2/NFR-002); assert new methods return both platforms tagged

**Checkpoint**: Scanner layer exposes both a cursor-only (existing) and unfiltered (new) read path per type.

### MCP output types (depends on T011–T014)

- [ ] T016 [P] [US1] Add `platform: 'cursor' | 'claude'` to `RuleInfo`, `CommandInfo`, `SkillInfo`, `AgentDefinitionInfo` in `src/mcp/types.ts`; propagate through `toRuleInfo`, `toCommandInfo`, `toSkillInfo`, `toAgentDefinitionInfo`
- [ ] T017 [P] [US1] Add `platform: 'cursor' | 'claude'` to the local `RuleInfo`, `CommandInfo`, `SkillInfo` interfaces in `src/mcp/server.ts`; propagate through `coreRuleToRuleInfo`, `coreCommandToCommandInfo`, `coreSkillToSkillInfo`

### Standalone MCP tools — `src/mcp/server.ts` (depends on T016/T017)

- [ ] T018 [US1] Update `list_rules`, `list_commands`, `list_skills`, `list_agents` tool handlers in `src/mcp/server.ts` to consume the unified core scans (already merged as of T003–T006 — verify no residual filtering) and return `platform`-tagged output
- [ ] T019 [US1] Update `get_rule`, `get_command`, `get_skill`, `get_agent` tool handlers in `src/mcp/server.ts` to resolve name collisions via fixed precedence (workspace before global, then cursor before claude — per data-model.md) instead of implicit first-match
- [ ] T020 [US1] Update `get_project` in `src/mcp/server.ts` — verify it reflects the same unified results via its existing calls to the `list_*` helper functions (no separate merge logic should be needed; add a test asserting parity if not already covered)
- [ ] T021 [US1] Update tool description strings in `src/mcp/server.ts` in **both** of the two locations where they're duplicated (FR-009): the `server.tool('list_rules', 'List all Cursor rules with metadata', ...)`-style registration calls (~lines 266, 297, 328, 359), AND the separate `BRIDGE_TOOLS` array (~lines 506, 508, 510, 512) — both need the same wording change, e.g. `"List all Cursor rules with metadata"` → `"List all rules with metadata"`; update `list_agents`'s description in both places to mention `.claude/agents`

### Bridge-mode MCP tools — `src/mcp/toolsImpl.ts` (depends on T011–T017)

- [ ] T022 [US1] Update `McpTools.listRules`, `listCommands`, `listSkills`, `listAgentDefinitions` in `src/mcp/toolsImpl.ts` to call each scanner's new unfiltered method (T011–T014) instead of the cursor-only ones
- [ ] T023 [US1] Update `McpTools.getRule`, `getCommand`, `getSkill`, `getAgentDefinition` in `src/mcp/toolsImpl.ts` to resolve name collisions via the same fixed precedence as T019 (reuse a shared helper if practical to avoid duplicating the sort logic between `server.ts` and `toolsImpl.ts`)
- [ ] T024 [US1] Update `McpTools.getProject` in `src/mcp/toolsImpl.ts` — verify it reflects the same unified results via its existing calls to `listRules`/`listCommands`/`listSkills`/`listAgentDefinitions`

### Tests for both MCP implementations

- [ ] T025 [P] [US1] Unit tests in `test/suite/unit/mcpServer*.test.ts` — assert `list_*`/`get_*`/`get_project` output includes both platforms, `platform` field present, `get_*` precedence resolves as documented, tool descriptions no longer imply Cursor-only
- [ ] T026 [P] [US1] Unit tests in `test/suite/unit/mcpTools.test.ts` (existing file — tests `McpTools` imported from `src/mcp/tools`) — same assertions as T025 for the bridge-mode `McpTools` class

**Checkpoint**: US1 fully functional and testable — both MCP implementations return complete, cross-platform, precedence-resolved results.

---

## Phase 4: User Story 2 — Tree view keeps its current display, sourced from one scan (Priority: P2)

**Goal**: The Workspaces tree view's Cursor and Claude Code sections show identical contents to today, now sourced from the unified scan via `ClaudeCodeScanner` filtering to `platform === 'claude'` instead of its own independent scan.

**Independent Test**: For a project with artifacts under both `.cursor/` and `.claude/`, open the Workspaces tree before and after the change — Cursor and Claude Code sections show identical contents.

- [ ] T027 [US2] Repoint `ClaudeCodeScanner.scan()` in `src/scanner/claudeCodeScanner.ts` to source `rules`/`commands`/`skills`/`agentDefinitions` from the new unfiltered scanner methods (T011–T014), filtered to `platform === 'claude'`, instead of `scanClaudeCodeCore()`'s per-type helpers; keep `claudeMd`/`claudeFolderExists`/`hasAnyArtifacts` sourced from `scanClaudeCodeCore()` unchanged
- [ ] T028 [US2] Run and extend existing tree-view/scanner unit tests covering the Cursor and Claude Code sections (e.g. tests exercising `RulesScanner`, `CommandsScanner`, `SkillsScanner`, `AgentsScanner`, `ClaudeCodeScanner` output as consumed by tree providers) to assert byte-identical section contents pre/post refactor for fixture projects with both platforms present (NFR-002, SC-002); also assert an artifact with an unrecognized/missing `platform` value is excluded from both sections rather than crashing or defaulting into one (spec.md Edge Cases)
- [ ] T029 [US2] Manually verify via `quickstart.md` "Tree view verification" steps: open Workspaces tree for a project with both platforms, and for a `.claude/`-only project (e.g. Bureau) — confirm section contents and folder-gated hiding are unchanged

**Checkpoint**: US1 + US2 both functional — MCP tools complete, tree view unchanged.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T030 Run full test suite (`npm test`) including the VS Code Electron integration host, not just `npm run test:unit` — confirm no regressions in tree view or MCP integration tests
- [ ] T031 Run `quickstart.md` end-to-end against a live project (e.g. Bureau) for both standalone and bridge-mode MCP paths
- [ ] T032 Review whether `scanClaudeCodeCore()`'s now-unused per-type internal logic (rules/commands/skills/agents, superseded by T002's exports being called from `scan*Core.ts` instead) can be simplified now that its only remaining callers are `scanClaudeCodeCore()` itself, calling the exported T002 functions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately; BLOCKS all user story work
- **US1 (Phase 3)**: Depends on Phase 2 (T001, T002)
- **US2 (Phase 4)**: Depends on T011–T014 (US1's scanner-class work) — `ClaudeCodeScanner` needs the new unfiltered methods to exist before it can be repointed
- **Polish (Phase 5)**: Depends on both user story phases

### User Story Dependencies

- **US1**: Requires Phase 2 — independently testable once T003–T026 are complete (does not require US2)
- **US2**: Requires T011–T014 from US1's scanner-class layer — not independent of US1 at the code level, but independently *testable* per its own acceptance scenarios once its dependency is met

### Parallel Opportunities

- T003–T006 (core scan merges, four different files) run in parallel once T001/T002 are done
- T007–T010 (core scan tests) run in parallel with each other, after their respective T003–T006
- T011–T014 (scanner class unfiltered methods, four different files) run in parallel once T003–T006 are done
- T015's four test files run in parallel
- T016/T017 (MCP output types, two different files) run in parallel
- T025/T026 (MCP implementation tests, two different files) run in parallel
- T027–T029 (US2) only depend on T011–T014, not on T016–T026 — they can start as soon as the scanner-class work lands, in parallel with the rest of US1's MCP-layer tasks, rather than waiting for all of Phase 3 to finish

---

## Parallel Example: User Story 1, Core Scan Phase

```
After T001 + T002 complete:
  Agent A → T003 (scanRulesCore) + T007 (its tests)
  Agent B → T004 (scanCommandsCore) + T008 (its tests)
  Agent C → T005 (scanSkillsCore) + T009 (its tests)
  Agent D → T006 (scanAgentDefinitionsCore) + T010 (its tests)
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 2 (T001–T002)
2. Core scan merges + tests (T003–T010)
3. Scanner class unfiltered methods + tests (T011–T015)
4. MCP output types (T016–T017)
5. Both MCP implementations updated (T018–T026)
6. **STOP and VALIDATE**: Run `quickstart.md` MCP tool verification against Bureau — confirm `list_skills` returns 15, not 4

### Incremental Delivery

1. Foundation (T001–T002) → per-type core scans unified (T003–T010) → scanner classes gain unfiltered methods (T011–T015)
2. US1 (T016–T026) → both MCP implementations fixed and tested → the confirmed bug is closed
3. US2 (T027–T029) → tree view repointed to the same unified scan, verified unchanged
4. Polish (T030–T032) → full suite green, live verification, optional cleanup

---

## Notes

- The scanner-class split (existing methods stay `platform === 'cursor'`-filtered; new methods return everything) is the key device that lets US1 (MCP completeness) and US2 (tree view parity) both hold simultaneously without either implementation re-filtering the other's data.
- `get_*` precedence logic (T019, T023) is small enough to consider factoring into one shared helper used by both `server.ts` and `toolsImpl.ts`, rather than implementing the sort twice — flagged as a judgment call for whoever picks up those tasks, not mandated by the spec.
- T032 is speculative cleanup, not required for any FR/SC — only pursue if it doesn't risk NFR-002 (tree view parity) or delay the rest of the feature.

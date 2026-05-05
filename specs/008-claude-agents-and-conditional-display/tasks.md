# Tasks: Claude Project Agents + Conditional Platform Display

**Input**: Design documents from `specs/008-claude-agents-and-conditional-display/`
**Feature**: 008-claude-agents-and-conditional-display | **Branch**: `008-claude-agents-and-conditional-display`

**Organization**: Phase 1 (Foundational scanner changes) blocks both user stories. US1 (Claude project agents) and US2 (conditional display) are then independently implementable. US3 (Agents view gating) requires **no code changes** — already correct per research.md Finding 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files or independent blocks, no intra-phase dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Foundational — Scanner Type Changes (Blocking Prerequisites)

**Purpose**: Extend the core Claude Code scanner to emit `agentDefinitions` and `claudeFolderExists`. All user story phases depend on these fields propagating through to the provider.

**⚠️ CRITICAL**: US1 and US2 provider work cannot begin until this phase is complete and compiling.

- [ ] T001 Implement `scanClaudeAgentDefs(fs: IFileSystem, projectRoot: string): Promise<CoreAgentDefinition[]>` in `src/scanner/core/scanClaudeCodeCore.ts` using `listFilesFlat` with `['.md']` extension — flat scan of `{projectRoot}/.claude/agents/`; add `CoreAgentDefinition { path: string; fileName: string; content: string }` interface; add `statClaudeFolder(fs, projectRoot): Promise<boolean>` (stat `.claude/` dir, return false on error); add `agentDefinitions: CoreAgentDefinition[]` and `claudeFolderExists: boolean` to `CoreClaudeCodeArtifacts`; include both in the existing `Promise.all` in `scanClaudeCodeCore()`; update `hasAnyArtifacts` to include `agentDefinitions.length > 0`
- [ ] T002 Add `agentDefinitions: AgentDefinition[]` and `claudeFolderExists: boolean` to `ClaudeCodeArtifacts` interface in `src/scanner/claudeCodeScanner.ts`; map `core.agentDefinitions` to `AgentDefinition[]` using same pattern as the existing `agentsScanner.ts` mapping (uri, fileName, displayName, content); pass `core.claudeFolderExists` through; add `'.claude/agents/*.md'` to the `patterns` array in `watchAll()`; update the error-return fallback to include `agentDefinitions: [], claudeFolderExists: false`

**Checkpoint**: `npm run build` (or `npx tsc --noEmit`) passes with no type errors before proceeding to US1/US2.

---

## Phase 2: User Story 1 — Claude Project Agent Definitions (Priority: P1) 🎯 MVP

**Goal**: `.claude/agents/*.md` files appear in the Claude Code section of the Workspaces tree under an "Agents" subsection (hubot icon, alphabetical, click-to-open).

**Independent Test**: Create `.claude/agents/my-agent.md` at a project root. Expand the project's Claude Code section in the Workspaces tree. Verify "Agents" appears alongside Commands/Rules/Skills with a hubot icon, and `my-agent.md` is listed. Click it — the file opens in the editor. Delete the file, refresh — the leaf disappears.

### Implementation for User Story 1

- [ ] T003 Add `'claude-agent-definitions' | 'claude-agent-definition'` to the `category` union type and `claudeAgentDefinitionData?: AgentDefinition` to the `ProjectTreeItem` interface in `src/providers/projectTreeProvider.ts` (complete before T006 since both modify this file's types)
- [ ] T004 [US1] In the `claude-code` category handler in `src/providers/projectTreeProvider.ts` (currently around line 364), add an Agents subsection node alongside the existing CLAUDE.md leaf and Rules/Commands/Skills group nodes: `category: 'claude-agent-definitions'`, icon `'hubot'`, description `"${agentsCount} agents"`, collapsible when `agentsCount > 0`; ensure the final `items` array is sorted alphabetically by label (CLAUDE.md leaf first as a direct child, then the group nodes sorted: Agents, Commands, Rules, Skills)
- [ ] T005 [US1] Add a `claude-agent-definitions` category handler to `getChildren()` in `src/providers/projectTreeProvider.ts`: read `projectData?.claudeCodeArtifacts?.agentDefinitions`; if empty return a single placeholder item `{ label: 'No agents found', description: 'Add Markdown files to .claude/agents/' }`; if non-empty, map each `AgentDefinition` to a leaf item with `category: 'claude-agent-definition'`, icon `'hubot'`, tooltip showing `ad.uri.fsPath`, and `command: { command: 'vscode.open', arguments: [ad.uri] }` — mirrors the `agent-definitions` handler at line 298

**Checkpoint**: US1 is independently functional. A project with `.claude/agents/*.md` shows the Agents subsection; a project without it shows the empty state.

---

## Phase 3: User Story 2 — Conditional Platform Section Display (Priority: P2)

**Goal**: Cursor section is hidden when `.cursor/` is absent at project root; Claude Code section is hidden when `.claude/` is absent. Folder presence (not artifact presence) is the gate.

**Independent Test**: Open a workspace where `.cursor/` exists but `.claude/` does not. Verify only the Cursor section appears (no Claude Code section). Open a workspace with only `.claude/`. Verify only the Claude Code section appears. Open a workspace with neither — verify neither platform section appears (only Specs if populated).

### Implementation for User Story 2

- [ ] T006 Add `statFolderExists(root: vscode.Uri, subdir: string): Promise<boolean>` module-private helper to `src/extension.ts` — wraps `vscode.workspace.fs.stat(vscode.Uri.joinPath(root, subdir))`, returns `true` only if `stat.type === vscode.FileType.Directory`, returns `false` on any error; add `cursorFolderExists: boolean` to the project data map type annotation in `src/extension.ts`; in `refreshData()`, include `statFolderExists(workspaceRoot, '.cursor')` in the existing `Promise.all` for the current workspace scan, and the equivalent for each added project; store the result as `cursorFolderExists` in the project data map entry
- [ ] T007 [US2] Add `cursorFolderExists: boolean` to the project data map type in the `ProjectTreeProvider` constructor and `updateData()` signature in `src/providers/projectTreeProvider.ts`; replace the section-building logic in the `'projects'` category handler (currently around line 150–175): add Cursor section only if `currentProjectData?.cursorFolderExists === true`; add Claude Code section only if `claudeCodeArtifacts?.claudeFolderExists === true`; keep Specs section gated on its existing `specs.length > 0` check (unchanged); keep alphabetical sort of the resulting sections array

**Checkpoint**: US2 is independently functional. Switch between workspaces with/without `.cursor/` and `.claude/` and confirm sections appear and disappear correctly.

---

## Phase 4: User Story 3 — Agents View Conditional Display (Priority: P2)

**Goal**: Agents view shows only roots whose home directory exists.

**Verification only — no code changes required.** `resolveAgentRootsWithData()` in `src/extension.ts:406–451` already calls `vscode.workspace.fs.stat()` on each candidate (`~/.cursor/`, `~/.claude/`, `~/.agents/`) and skips missing directories via the catch block. This was confirmed in `research.md` Finding 1.

- [ ] T008 [US3] Manually verify Agents view conditional display: remove or rename `~/.claude/` temporarily and confirm the Claude root disappears from the Agents view after Refresh; restore it and confirm reappearance — **if behaviour is incorrect** (roots shown even when directory absent), add an explicit `directoryExists` guard to the `candidates` loop in `resolveAgentRootsWithData()` in `src/extension.ts` and re-run T014 before proceeding

**Checkpoint**: All three user stories verified. US1 and US2 implemented and tested; US3 confirmed correct by inspection.

---

## Phase 5: Living Spec Updates + Tests

**Purpose**: Same-commit living spec updates (required by same-commit rule in `specs/README.md`) and test coverage for the new behavior.

- [ ] T009 [P] Update `specs/providers/spec.md`: add `'claude-agent-definitions'` and `'claude-agent-definition'` rows to the Category System table; revise Regression Guardrail #5 to distinguish platform-level hiding (Cursor/Claude sections hidden when folder absent) from artifact-level empty state (subsections within a present platform use empty-state messaging, not hiding); update the Definition of Done checklist
- [ ] T010 [P] Update `specs/tree-view/spec.md`: add Claude section to the Workspaces branch architecture description and Mermaid diagram (label: "Claude", id: `claude-code`); add a "Platform section gating" note: sections shown iff root folder exists; add Scenarios for "Claude section hidden when .claude/ absent" and "Cursor section hidden when .cursor/ absent"; update the Definition of Done checklist
- [ ] T011 [P] Update `specs/scanners/spec.md`: add `.claude/agents/` (flat `*.md` scan) as a scanned path under the Claude Code scanner section
- [ ] T012 Write unit tests for `scanClaudeCodeCore` additions in `test/suite/unit/scanClaudeCodeCore.test.ts` (or nearest existing scanner test file): (a) agent defs scan — files present: returns correct `CoreAgentDefinition[]`; files absent/directory missing: returns `[]`; (b) `claudeFolderExists` — true when `.claude/` is a directory; false when absent; false on stat error
- [ ] T013 Write integration or provider-level tests in `test/suite/unit/projectTreeProvider.test.ts` or `test/suite/integration/claudeCodeSection.test.ts`: (a) Claude → Agents subsection renders with hubot icon when `agentDefinitions` is non-empty; (b) empty state message when `agentDefinitions` is empty; (c) Cursor section absent when `cursorFolderExists: false`; (d) Claude section absent when `claudeFolderExists: false`; (e) both sections present when both folder flags are true; (f) project with neither `.cursor/` nor `.claude/` — Specs node still visible (FR-008); (g) Agents view with all three home directories absent — empty-state placeholder, zero root nodes, no error (SC-004)
- [ ] T014 Run `npm test` (full test suite including coverage gate) — all tests pass; no regression in existing Claude Code, Cursor, or Agents view behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: T001 → T002 (T002 depends on T001's core types). Both must complete before any US1/US2 work.
- **Phase 2 (US1)**: T003 is independent of T006/T007. T004 depends on T001/T002/T003. T005 depends on T004.
- **Phase 3 (US2)**: T006 depends on T001/T002 (needs `claudeFolderExists` in `ClaudeCodeArtifacts`). T007 depends on T006.
- **Phase 4 (US3)**: T008 depends on T007 (verify after conditional display is wired).
- **Phase 5**: T009/T010/T011 can run in parallel with each other and with T012/T013. T014 depends on all of T009–T013.

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 complete. Independently testable after T005.
- **US2 (P2)**: Depends on Phase 1 complete. Independently testable after T007. Can run in parallel with US1 (different files: T006 touches `extension.ts`, T007 touches a different section of `projectTreeProvider.ts` than T003–T005).
- **US3 (P2)**: No implementation dependency — verified after US2 complete.

### Parallel Opportunities

- T003 must complete before T006 (both modify `projectTreeProvider.ts` types); T006's `extension.ts` changes can run while T004/T005 are in progress
- T004 and T006 can run in parallel for same reason
- T009, T010, T011 can all run in parallel (separate spec files)
- T012 and T013 can run in parallel (separate test files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001–T002) — scanner foundation
2. Add type scaffolding (T003)
3. Add Agents subsection to tree (T004–T005)
4. **STOP and VALIDATE**: Create `.claude/agents/test.md` in a project, confirm it appears in the tree with hubot icon, click opens the file
5. Proceed to US2 once MVP is confirmed working

### Incremental Delivery

1. Phase 1 complete → scanner types ready, build passes ✅
2. US1 complete (T003–T005) → Claude project agents visible in tree ✅
3. US2 complete (T006–T007) → platform sections folder-gated ✅
4. US3 verified (T008) → Agents view confirmed correct ✅
5. Living specs + tests + CI gate (T009–T014) → ready to merge ✅

---

## Notes

- `statFolderExists()` in `extension.ts` MUST use `vscode.workspace.fs.stat()` + `vscode.FileType.Directory`, not `fs.existsSync()` — constitution Principle 2 (`vscode.workspace.fs` for all file ops)
- The `claude-agent-definitions` handler mirrors `agent-definitions` exactly (lines 298–330 of `projectTreeProvider.ts`) — read that handler before implementing T005
- `claudeFolderExists` is distinct from `hasAnyArtifacts` — an empty `.claude/` folder sets `claudeFolderExists: true` but `hasAnyArtifacts: false`; do not conflate
- `cursorFolderExists` check in `refreshData()` must cover both the current workspace path and each added project path (same loop structure as the existing scanner calls)
- T009–T011 must be committed in the same PR as the implementation (same-commit rule from `specs/README.md`)
- After T014, verify `npm run test:coverage` also passes the NYC branch+function gate from spec 003

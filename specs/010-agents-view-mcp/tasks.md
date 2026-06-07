# Tasks: Agents View MCP Registration

**Input**: Design documents from `specs/010-agents-view-mcp/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: No new project structure needed — extending existing extension. No tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New scanner and type extension required by all three user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Create `src/scanner/mcpRegistrationScanner.ts` — `McpRegistrationScanner` class with `scanServerNames(): Promise<string[]>`, reads top-level `mcpServers` key from a JSON config file path, returns `[]` on missing file or parse error
- [ ] T002 Add `mcpServers: string[]` field to `AgentRootDefinition` interface in `src/providers/agentsTreeProvider.ts`

**Checkpoint**: Scanner exists and type is updated — user story work can begin.

---

## Phase 3: User Story 1 — Read-Only MCP Section in Agents View (Priority: P1) 🎯 MVP

**Goal**: Each agent root (Claude Code and Cursor) shows a read-only MCP section listing registered server names as children, in alphabetical order alongside Agents, Commands, and Skills.

**Independent Test**: Open the Agents view — both Claude and Cursor roots show an MCP section. The section lists server names matching the keys in `~/.claude.json` `mcpServers` and `~/.cursor/mcp.json` `mcpServers` respectively.

- [ ] T003 [US1] Add MCP section node (`label: 'MCP'`, `contextValue: 'agent-mcp'`, `iconPath: ThemeIcon('plug')`) and server name leaf nodes (`contextValue: 'mcp-server'`) to `AgentsTreeProvider.getChildren()` in `src/providers/agentsTreeProvider.ts` — section collapses when empty, sorts alphabetically with existing sections
- [ ] T004 [US1] Populate `mcpServers` for Claude Code root from `~/.claude.json` and for Cursor root from `~/.cursor/mcp.json` in `resolveAgentRootsWithData()` in `src/extension.ts` using `McpRegistrationScanner`
- [ ] T005 [P] [US1] Unit tests for `McpRegistrationScanner` in `test/suite/unit/mcpRegistrationScanner.test.ts` — covers: file present with servers, file absent, malformed JSON, empty mcpServers object
- [ ] T006 [P] [US1] Unit tests for MCP section in `AgentsTreeProvider` in `test/suite/unit/agentsTreeProvider.test.ts` — extend existing file: covers MCP section present, children list server names, alphabetical ordering with other sections, empty section state

**Checkpoint**: US1 fully functional — Agents view shows read-only MCP lists for both agent roots.

---

## Phase 4: User Story 2 — Startup Prompt to Register ACE (Priority: P2)

**Goal**: On activation, if Claude Code is detected and ACE is absent or stale in `~/.claude.json`, show a notification prompt. "Set up" writes the stdio entry; "Not now" dismisses for the session.

**Independent Test**: Remove ACE entry from `~/.claude.json`, reload the extension window — prompt appears. Click "Set up" — `~/.claude.json` gains the `agent-context-explorer` stdio entry and the Agents view MCP section updates.

- [ ] T007 [US2] Create `src/services/mcpRegistrationService.ts` — `McpRegistrationService` with `isRegistered(): Promise<boolean>` (checks entry exists and path matches current `extensionPath`), `register(): Promise<void>` (read-merge-write `~/.claude.json`), and `promptIfNeeded(): Promise<void>` (shows `showInformationMessage` prompt with session-scoped dismissal flag)
- [ ] T008 [US2] Wire `promptIfNeeded()` call in `activate()` in `src/extension.ts` — instantiate `McpRegistrationService` using `context.extensionPath` and `os.homedir()`, call after Claude Code dir detection, add disposable to subscriptions
- [ ] T009 [US2] Unit tests for `McpRegistrationService` in `test/suite/unit/mcpRegistrationService.test.ts` — covers: `isRegistered()` true/false/stale path, `register()` creates file when absent, `register()` preserves existing keys, `register()` overwrites stale entry, write failure surfaces error

**Checkpoint**: US1 + US2 functional — read-only view plus one-time setup prompt on activation.

---

## Phase 5: User Story 3 — Live Refresh After External Config Change (Priority: P3)

**Goal**: Editing `~/.claude.json` or `~/.cursor/mcp.json` externally causes the Agents view MCP section to refresh automatically within 2 seconds.

**Independent Test**: Manually add or remove an entry in either file — the Agents view MCP section updates without a manual refresh.

- [ ] T010 [US3] Add file watchers for `~/.claude.json` and `~/.cursor/mcp.json` in `ensureDataLoaded()` in `src/extension.ts` — follow the existing `setupGlobalClaudeCommandsWatcher()` pattern using `vscode.RelativePattern(vscode.Uri.file(homeDir), '.claude.json')` and `vscode.RelativePattern(vscode.Uri.file(homeDir), '.cursor/mcp.json')`; add both watchers to `context.subscriptions`

**Checkpoint**: All three user stories functional and live.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T011 Update `CLAUDE.md` Active Technologies section to reflect 010-agents-view-mcp: `~/.claude.json` (read/write), `~/.cursor/mcp.json` (read-only), `McpRegistrationScanner`, `McpRegistrationService`
- [ ] T012 Run full test suite (`npm run test:unit`) and fix any regressions introduced by `AgentRootDefinition` type change

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Depends on T001 and T002
- **US2 (Phase 4)**: Depends on T001 (uses `McpRegistrationScanner` indirectly via `McpRegistrationService`)
- **US3 (Phase 5)**: Depends on T004 (watchers trigger `refreshData()` which calls `resolveAgentRootsWithData()` which uses the scanner)
- **Polish (Phase 6)**: Depends on all user story phases

### User Story Dependencies

- **US1**: Requires T001, T002 — independent of US2 and US3
- **US2**: Requires T001 — independent of US1 and US3 (can be developed in parallel with US1 after foundational)
- **US3**: Requires T004 (US1) — watcher wires into the scanner population added in US1

### Parallel Opportunities

- T005 and T006 (US1 tests) can run in parallel with each other and alongside T003/T004
- T007 (US2 service) can start as soon as T001 is done, in parallel with T003/T004
- T009 (US2 tests) can run in parallel with T008

---

## Parallel Example: User Story 1

```
After T001 + T002 complete:
  Agent A → T003 (AgentsTreeProvider MCP section rendering)
  Agent B → T004 (extension.ts scanner wiring)
  Agent C → T005 (McpRegistrationScanner unit tests)
  Agent D → T006 (AgentsTreeProvider MCP section unit tests)
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001 → T002 (foundational)
2. T003 → T004 → T005, T006 (US1)
3. **STOP and VALIDATE**: Open Agents view, confirm MCP sections appear for both Claude and Cursor with correct server names

### Incremental Delivery

1. Foundation (T001–T002) → US1 (T003–T006) → read-only view ships
2. US2 (T007–T009) → startup prompt ships
3. US3 (T010) → live refresh ships
4. Polish (T011–T012) → done

---

## Notes

- `McpRegistrationScanner` is intentionally generic (path is a constructor arg) — same class serves both `~/.claude.json` and `~/.cursor/mcp.json`
- `McpRegistrationService` uses a session-scoped in-memory flag for "Not now" dismissal — no persistent storage needed
- The `AgentRootDefinition.mcpServers` type change is additive; existing callers need to supply `mcpServers: []` — catch all affected call sites when completing T002
- Watcher pattern for single files outside workspace: `vscode.RelativePattern(vscode.Uri.file(dir), filename)` — consistent with existing global watchers in `extension.ts`

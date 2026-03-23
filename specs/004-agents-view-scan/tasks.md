# Tasks: Agent definitions in Workspaces and Agents views

**Input**: Design documents from `/specs/004-agents-view-scan/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/agent-definitions.md](./contracts/agent-definitions.md), [quickstart.md](./quickstart.md)

**Tests**: Unit tests included for scanner core per project constitution and [plan.md](./plan.md) (strict TS + tests).

**Organization**: Phases follow user stories P1 → P2 → P3 from [spec.md](./spec.md), then MCP and living-spec polish. **Branches**: open one branch per phase below, or one branch per Jira user story (US1 / US2 / US3), merging in dependency order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story label ([US1], [US2], [US3]) only on story phases

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core scanner, types, and provider data shape—**must complete before User Stories 1–3**. Good candidate for its own branch (e.g. `004-agents-foundational`).

**⚠️ CRITICAL**: No user story UI work until this phase completes.

- [x] T001 Implement `src/scanner/core/scanAgentDefinitionsCore.ts` scanning flat `*.md` in `agents/` per `specs/004-agents-view-scan/contracts/agent-definitions.md` (workspace `.cursor/agents`, agent roots including `~/.agents/agents` for Global)
- [x] T002 Add `test/suite/unit/scanAgentDefinitionsCore.unit.test.ts` with fixtures for populated `agents/`, missing directory, and alphabetical ordering
- [x] T003 Implement `src/scanner/agentsScanner.ts` wrapping core with `VSCodeFsAdapter` for workspace project roots
- [x] T004 Add exported `AgentDefinition` (or equivalent) types in `src/scanner/agentsScanner.ts` and/or `src/scanner/types.ts` aligned with `specs/004-agents-view-scan/data-model.md`
- [x] T005 Extend `src/providers/projectTreeProvider.ts` `updateData` map type and `ProjectTreeItem` to support `agentDefinitions: AgentDefinition[]` and new categories/context for agent-definition leaves

**Checkpoint**: Core scan tested; tree provider can accept agent definition arrays.

---

## Phase 2: User Story 1 — Workspaces tree (Priority: P1) 🎯 MVP

**Goal**: **Agents** subsection under each project’s **Cursor** branch in the Workspaces sidebar (alphabetically ordered with Commands, Rules, Skills). **Branch**: e.g. `feat/FB-119` or `004-agents-us1-workspaces`.

**Independent Test**: Create `project/.cursor/agents/test-agent.md`, expand Workspaces → project → Cursor → **Agents**, open file (see `specs/004-agents-view-scan/quickstart.md`).

- [x] T006 [US1] Wire `AgentsScanner` in `src/extension.ts` so each `projectData.set` entry includes `agentDefinitions` for that project’s workspace root
- [x] T007 [US1] Update `src/providers/projectTreeProvider.ts` Cursor section (`getChildren` for `cursor`) to add collapsible **Agents** node and leaves with `ThemeIcon('hubot')`, `vscode.open`, tooltips for duplicate names per spec edge cases
- [x] T008 [US1] Implement empty behavior for workspace scope: show empty child per FR-005 in `src/providers/projectTreeProvider.ts` (**No agents found**)

**Checkpoint**: User Story 1 complete — MVP demoable without Agents view.

---

## Phase 3: User Story 2 — Agents view (Priority: P2)

**Goal**: **Agents** subsection under each agent root (Cursor, Claude, Global) parallel to Commands and Skills (alphabetical). **Branch**: e.g. `feat/FB-120` or `004-agents-us2-agents-view`.

**Independent Test**: Add `~/.cursor/agents/home-agent.md` (or Claude/Global paths per contract), expand Agents view → root → **Agents**, open file.

- [x] T009 [US2] Extend `AgentRootDefinition` in `src/providers/agentsTreeProvider.ts` with `agentDefinitions: AgentDefinition[]`
- [x] T010 [US2] Populate `agentDefinitions` in `src/extension.ts` `resolveAgentRootsWithData()` using `scanAgentDefinitionsForAgentRoot` and paths for `~/.cursor`, `~/.claude`, `~/.agents` per `specs/004-agents-view-scan/research.md`
- [x] T011 [US2] Update `src/providers/agentsTreeProvider.ts` `getChildren` for agent roots to add **Agents** sibling to Commands/Skills with empty-state copy and `hubot` leaves

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 4: User Story 3 — Refresh & watchers (Priority: P3)

**Goal**: Disk changes reflected after refresh; workspace edits trigger refresh. **Branch**: e.g. `004-agents-us3-watchers` or Jira story for US3.

**Independent Test**: Add/remove `.md` under `.cursor/agents/`, run refresh and/or rely on watcher; list updates without IDE restart.

- [ ] T012 [US3] Register `vscode.FileSystemWatcher` for `.cursor/agents/**/*.md` in `src/extension.ts` `setupFileWatcher()` with create/change/delete → same refresh path as rules/commands/skills
- [ ] T013 [US3] Verify `ace.refresh` in `src/extension.ts` re-runs agent definition scans for all projects and agent roots

**Checkpoint**: User Story 3 satisfied — stale-tree risk mitigated.

---

## Phase 5: MCP tools & project context

**Goal**: Thin MCP adapters per constitution and [contracts/agent-definitions.md](./contracts/agent-definitions.md) (FR-008 option 1). **Branch**: e.g. `004-agents-mcp`.

- [ ] T014 Extend `src/mcp/types.ts` with `AgentDefinitionInfo`, `AgentDefinitionContent`, and add `agentDefinitions` to `ProjectContext` (and mappers if any)
- [ ] T015 Implement `listAgentDefinitions` and `getAgentDefinition` in `src/mcp/toolsImpl.ts`; add name resolution helper in `src/mcp/toolsFind.ts` if needed
- [ ] T016 Register `list_agent_definitions` and `get_agent_definition` in `src/mcp/server.ts` tool schemas and `src/mcp/extensionBackend.ts` dispatch switch
- [ ] T017 Update `get_project_context` in `src/mcp/toolsImpl.ts` to include `agentDefinitions` consistent with workspace tree

**Checkpoint**: MCP exposes agent definitions; `get_project_context` remains coherent.

---

## Phase 6: Polish & cross-cutting

**Purpose**: Living specs (FR-007/FR-008), coverage, quickstart validation. **Branch**: e.g. `004-agents-docs` or fold into final integration branch.

- [ ] T018 [P] Update `specs/tree-view/spec.md` with **Agent definitions** nodes, icons, and terminology cross-links
- [ ] T019 [P] Update `specs/scanners/spec.md` with `scanAgentDefinitionsCore` / `AgentsScanner` and path table
- [ ] T020 [P] Update `specs/providers/spec.md` with Workspaces + Agents view behavior for agent definitions
- [ ] T021 Update `specs/mcp/spec.md` and `specs/mcp/data-model.md` with new tools, types, and `ProjectContext` fields
- [ ] T022 Run `npm run compile:test` and `npm run test:coverage`; manually step through `specs/004-agents-view-scan/quickstart.md`

---

## Dependencies & Execution Order

### Phase dependencies

| Phase | Depends on | Notes |
|-------|------------|--------|
| 1 Foundational | — | Blocks all stories; merge first |
| 2 US1 | Phase 1 | MVP |
| 3 US2 | Phase 1 | Recommended after US1 merged |
| 4 US3 | Phase 1 | Best after US1 paths exist; can follow US2 |
| 5 MCP | Phase 1 + US1 data paths | After workspace scan works |
| 6 Polish | Phases 2–5 desired scope | Docs last |

### User story order

1. **US1 (P1)** — after Foundational  
2. **US2 (P2)** — after Foundational (recommended after US1)  
3. **US3 (P3)** — after US1/US2 or in parallel once Foundational done  

### Parallel opportunities

- **T018–T020** marked **[P]**: different files; run together after implementation stabilizes  
- **T014** then **T015** (types before impl); **T016** depends on **T015**

### Parallel example: Polish docs

```bash
# After code complete, launch in parallel:
T018 specs/tree-view/spec.md
T019 specs/scanners/spec.md
T020 specs/providers/spec.md
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Complete Phase 1 (Foundational) — **T001–T005**  
2. Complete Phase 2 (US1) — **T006–T008**  
3. **STOP**: Validate Workspaces **Agent definitions** via `quickstart.md`  
4. Demo before building Agents view or MCP  

### Incremental delivery

1. Foundational → US1 → US2 → US3 → MCP → living specs + coverage  

### Suggested MVP scope

- **T001–T008** (Phases 1–2) delivers spec **User Story 1** and matches **MVP** definition.

---

## Notes

- Every task references at least one concrete path; adjust if files are split during implementation.  
- If MCP slips, **T021** must document explicit deferral per FR-008 option 2 instead of new tools.  
- **[P]** tasks: verify no shared-file merge conflicts before parallelizing.

---

## Task summary

| Metric | Value |
|--------|--------|
| **Total tasks** | 22 |
| **Phase 1 Foundational** | 5 |
| **US1** | 3 |
| **US2** | 3 |
| **US3** | 2 |
| **MCP** | 4 |
| **Polish** | 5 |
| **Parallel [P] tasks** | 3 (T018–T020) |

**Format validation**: All tasks use `- [ ] T### …` with file path in description; story phases use **[US#]** labels.

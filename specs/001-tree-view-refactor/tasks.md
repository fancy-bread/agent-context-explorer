# Tasks: Tree View (Two Views — Workspaces + Agents)

**Input**: Design documents from `specs/001-tree-view-refactor/` and living spec `specs/tree-view/spec.md`
**Prerequisites**: plan.md, spec (tree-view), research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story so each story can be implemented and tested independently.

## Process (before implementation)

Workflow for this feature:

1. **Specify** — New branch created (e.g. via create-new-feature or refactor branch).
2. **Plan & task** — Run `/speckit.plan`, then `/speckit.tasks` (and clarify/analyze if needed).
3. **Clarify / analyze** — Run `/speckit.clarify` or `/speckit.analyze` when required.
4. **Commit & PR** — Commit the implementation spec (plan, tasks, research, data-model, contracts, quickstart in this feature folder) and open a PR. **Merge the implementation spec to main.** No code implementation in this PR — only the design artifacts.
5. **Create PBIs** — From the tasks breakdown below, create PBIs (e.g. Foundation, US1, US2, US3, Polish) in your backlog (Jira, GitHub Issues, etc.).
6. **Implement** — Pick up PBIs and implement (code). Each PBI can be its own branch/PR off main.

The current branch holds the *spec*; main receives it first. Implementation (code) follows in separate work keyed to PBIs.

---

## Workflow & PBIs

**Not one branch.** The phases are not required to be completed in a single branch. Each **User Story (and Foundation) is an independent PBI** that any developer or agent can pick up.

| PBI | Scope | Branch / PR | Dependency |
|-----|--------|-------------|------------|
| **PBI: Foundation** | Phase 1 + Phase 2 (T001–T006) | One branch/PR | None. Merge first. |
| **PBI: US1** | Phase 3 (T007–T010) | Separate branch/PR | After Foundation merged (or branch off foundation). |
| **PBI: US2** | Phase 4 (T011–T014) | Separate branch/PR | After Foundation merged. Can be parallel to US1. |
| **PBI: US3** | Phase 5 (T015–T016) | Separate branch/PR | After Foundation merged. Can be parallel to US1/US2. |
| **PBI: Polish** | Phase 6 (T017–T020) | Separate branch/PR | After the US(s) you care about are merged. |

- **Foundation** must be merged (or in place) before US1, US2, or US3; those PBIs assume two views and two providers exist.
- **US1, US2, US3** are independent: different people/agents can own different stories on different branches.
- **Polish** (tests, quickstart) can be split or done once the relevant US work is merged.
- Typical flow: merge Foundation → pick up US1 (MVP) or US2 or US3 → merge → repeat; Polish when ready.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Extension: `src/` at repo root; tests: `test/suite/`

---

## Phase 1: Setup

**Purpose**: Baseline and branch readiness

- [ ] T001 Verify extension builds and existing tests run from repo root: `npm run compile && npm test`

---

## Phase 2: Foundational (Two Views and Providers)

**Purpose**: Add second view (Agents) and refactor so Workspaces view root = project list. Blocks all user story content work.

**Independent Test**: Open sidebar; see two views (Workspaces, Agents). Workspaces root = project list (no wrapper node). Agents view exists with Refresh only in toolbar.

- [x] T002 [P] Add second view entry in `package.json`: under `contributes.views.ace` add views with `id: "aceProjects"` (Workspaces) and `id: "aceAgents"` (Agents) per `specs/001-tree-view-refactor/contracts/view-contributions.md`
- [x] T003 [P] Create `src/providers/agentsTreeProvider.ts`: class `AgentsTreeProvider` implementing `TreeDataProvider`, `getChildren(undefined)` returns empty array or placeholder nodes; constructor accepts data source for agent roots (e.g. callback or shared state)
- [x] T004 Refactor `src/providers/projectTreeProvider.ts`: change `getChildren(undefined)` to return project list directly (remove `workspaces-pane` and `global-pane` root nodes); this provider serves only the Workspaces view
- [x] T005 In `src/extension.ts`: instantiate `AgentsTreeProvider`, register second tree with `vscode.window.createTreeView('aceAgents', { treeDataProvider: agentsTreeProvider })`, add to subscriptions
- [x] T006 Update `package.json` view/title menus: `ace.addProject` and `ace.refresh` when `view == aceExplorer`; add second `ace.refresh` when `view == aceAgents` so Refresh shows in both views (Add only in Workspaces)

**Checkpoint**: Two views visible; Workspaces root = project list; Agents view shows placeholder/empty; toolbar correct per view.

---

## Phase 3: User Story 1 — Workspace view content (Priority: P1) — MVP

**Goal**: Per-project Cursor shows only workspace commands/skills; Specs + ASDLC section (renamed from Agents); Speckit shows only constitution; empty state when no projects.

**Independent Test**: Add one project, expand it; Cursor has single Commands and Skills lists (no workspace/global split). Section labeled "Specs + ASDLC" contains AGENTS.md, VISION, specs, schemas. Speckit shows only constitution link. With zero projects, Workspaces view shows empty state with Add and Refresh.

- [x] T007 [US1] In `src/providers/projectTreeProvider.ts` under Cursor section: stop creating `commands-workspace`/`commands-global` and `skills-workspace`/`skills-global`; show single Commands node (children = project commands only) and single Skills node (children = project skills only) per `specs/tree-view/spec.md`
- [x] T008 [US1] In `src/providers/projectTreeProvider.ts`: rename project-level "Agents" section to "Specs + ASDLC" (label and any user-facing text); keep internal category as needed for routing
- [x] T009 [US1] In `src/providers/projectTreeProvider.ts` Speckit section: remove "Open .specify folder" tree item; show only constitution link when `asdlcArtifacts.speckit.constitutionPath` exists per `specs/001-tree-view-refactor/data-model.md` — **Resolved by dropping Speckit from tree; no Speckit section shown.**
- [x] T010 [US1] In `src/providers/projectTreeProvider.ts`: when there are no projects, Workspaces view root children = single "No projects" (or similar) placeholder with Add/Refresh still available (empty state)

**Checkpoint**: Workspace view matches spec: Cursor local-only, Specs + ASDLC label, Speckit constitution only, empty state.

---

## Phase 4: User Story 2 — Agents view content (Priority: P2)

**Goal**: Agents view root shows Cursor, Claude, Global nodes when those directories exist; under each, Commands and Skills; toolbar Refresh only; Refresh updates agent data.

**Independent Test**: With ~/.cursor or ~/.agents present, open Agents view; root shows corresponding nodes; expanding one shows Commands/Skills. Toolbar has no Add. Refresh reloads agent data.

- [x] T011 [US2] Add agent roots resolution in extension or shared module: resolve ~/.cursor, ~/.claude, ~/.agents via `os.homedir()` or `process.env.HOME`; check directory existence with `vscode.workspace.fs` (or allowlisted API); expose list of existing roots to AgentsTreeProvider per `specs/001-tree-view-refactor/research.md`
- [x] T012 [US2] In `src/providers/agentsTreeProvider.ts`: implement `getChildren(undefined)` to return one node per existing agent root (Cursor, Claude, Global) with correct labels; children of each root = Commands, Skills (same structure as in data-model)
- [x] T013 [US2] Extend scanning for agent roots: ensure ~/.claude/commands and ~/.claude/skills are scanned (extend `src/scanner/core/scanCommandsCore.ts` and `scanSkillsCore.ts` or adapter if needed); aggregate data by root and pass into AgentsTreeProvider per `specs/001-tree-view-refactor/research.md`
- [x] T014 [US2] In `src/extension.ts`: when Refresh is run from Agents view (or when agents view is focused), refresh only agent/global data and call `agentsTreeProvider.refresh()` so Agents view updates without rescanning workspace projects

**Checkpoint**: Agents view shows Cursor/Claude/Global when present; Commands/Skills under each; Refresh only in toolbar; data from scanners.

---

## Phase 5: User Story 3 — Toolbar and view-specific behavior (Priority: P3)

**Goal**: Add appears only in Workspaces view; Refresh works in both views and refreshes the correct data; view/item context menus (edit/remove project) only in Workspaces view.

**Independent Test**: In Workspaces view toolbar: Add and Refresh (for `aceProjects`). In Agents view toolbar: Refresh only. Edit/Remove project on project node only in Workspaces view.

- [x] T015 [US3] Verify and fix `package.json` menus: `view/title` has `ace.addProject` only when `view == aceProjects`; `ace.refresh` when `view == aceProjects` or `view == aceAgents`; `view/item/context` for `ace.editProject` and `ace.removeProject` only when `view == aceProjects && viewItem == activeProject` per `specs/001-tree-view-refactor/contracts/view-contributions.md`
- [x] T016 [US3] Ensure Refresh command in `src/extension.ts` (or command handler) refreshes workspace data when invoked from Workspaces view and agent data when invoked from Agents view (e.g. pass view id or call both providers’ refresh as needed)

**Checkpoint**: Toolbar and context menus match contract; Refresh behavior correct per view.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Tests and validation

- [ ] T017 [P] Update `test/suite/unit/projectTreeProvider.test.ts`: expect Workspaces view root children = project list (no workspaces-pane/global-pane); expect Cursor under project has single Commands and Skills; expect Specs + ASDLC and Speckit sections; remove expectations for workspace/global subsections under Cursor and for "Open .specify folder"
- [ ] T018 [P] Update `test/suite/ui/ruleLabels.test.ts` for new tree structure (Workspaces root = projects; Agents view if tests touch it)
- [ ] T019 [P] Update `test/suite/integration/realRulesIntegration.test.ts` for new structure and two views
- [ ] T020 Run validation from `specs/001-tree-view-refactor/quickstart.md`: build, run extension, verify both views and acceptance criteria; fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No dependencies — run first.
- **Phase 2**: Depends on Phase 1 — BLOCKS Phase 3–5.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2; can run after or in parallel with Phase 3 if different files.
- **Phase 5 (US3)**: Depends on Phase 2; small and can follow Phase 3/4.
- **Phase 6**: Depends on Phases 3–5 being done.

### User Story Dependencies

- **US1**: After Phase 2 — workspace view content only.
- **US2**: After Phase 2 — agents view content; may share scanner/extension changes with US1.
- **US3**: After Phase 2 — toolbar/menus; can be done with US1/US2.

### Parallel Opportunities

- T002 and T003 can run in parallel (package.json vs new file).
- T007–T010 (US1) are all in `projectTreeProvider.ts` — sequential.
- T017, T018, T019 (test updates) can run in parallel.

---

## Implementation Strategy

### PBIs, not one branch

- **Foundation (Phase 1 + 2)**: One PBI; merge first so other PBIs can branch from main.
- **US1, US2, US3**: Each is a PBI; any developer/agent can pick one up after Foundation is in.
- **Polish (Phase 6)**: PBI(s) for tests and quickstart; can follow the US work.

### MVP (minimal shippable slice)

1. **PBI: Foundation** (Phase 1 + 2) → two views, Workspaces root = project list.
2. **PBI: US1** (Phase 3) → Workspaces view content (Cursor local-only, Specs + ASDLC, Speckit, empty state). MVP = Foundation + US1.
3. **PBI: US2** → Agents view content (optional next).
4. **PBI: US3** → Toolbar/menu contract (optional next).
5. **PBI: Polish** → Tests and quickstart validation.

---

## Notes

- [P] = different files or independent changes.
- [USn] = task belongs to that user story for traceability.
- No new dependencies; viewer-only; use `vscode.workspace.fs` and allowlisted paths for agent roots.
- Living spec: `specs/tree-view/spec.md`; contract: `specs/001-tree-view-refactor/contracts/view-contributions.md`.

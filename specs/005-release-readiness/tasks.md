# Tasks: 1.0 Release Readiness

**Input**: Design documents from `/specs/005-release-readiness/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/contrib-commands.md](./contracts/contrib-commands.md), [quickstart.md](./quickstart.md)

**Tests**: Spec does not mandate TDD; integration tests **must** be updated when removing contributed commands (`ace.viewStateSection`).

**Organization**: Phases follow user stories P1 → P2 → P3 from [spec.md](./spec.md). Phase 3 (US1) includes baseline CI and packaging checks alongside changelog/README work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story label ([US1], [US2], [US3]) on story phases only

---

## Phase 3: User Story 1 — Install-ready release (Priority: P1) 🎯 MVP

**Purpose**: Baseline CI, confirm packaging allows root `CHANGELOG.md`, then add changelog + README + compatibility note.

**Goal**: Reviewers and first-time users find **changelog**, **license**, and an accurate **README** without spelunking.

**Independent Test**: Open repo root: `CHANGELOG.md`, `LICENSE`, `README.md` present; README describes Workspaces, Agents view, agent definitions, Specs, MCP at a high level (per [spec.md](./spec.md) US1).

- [ ] T001 [US1] Run `npm run lint` and `npm run ci:coverage` on branch `005-release-readiness` and confirm both pass (record result for PR)
- [ ] T002 [P] [US1] Confirm `.vscodeignore` keeps root `CHANGELOG.md` in the packaged artifact (verify `!CHANGELOG.md` rule) in `.vscodeignore`
- [ ] T003 [US1] Create root `CHANGELOG.md` using Keep a Changelog structure with a **`1.0.0`** section summarizing user-facing highlights (docs alignment, removal of unimplemented command, README updates) in `CHANGELOG.md`
- [ ] T004 [US1] Update **What You See** / quick start in `README.md` to include **Workspaces** (Cursor: Agents, Commands, Rules, Skills), **Specs** (flat `specs/*/spec.md`), **Agents** sidebar view (agent roots), **agent definitions** (`.cursor/agents/*.md`), and **MCP** tools consistent with `specs/mcp/spec.md` (`list_projects`, `list_rules`, `get_rule`, `list_commands`, `get_command`, `list_skills`, `get_skill`, `list_agents`, `get_agent`, `list_specs`, `get_spec`, `get_project`) in `README.md`
- [ ] T005 [US1] Add a short **Requirements** or **Compatibility** note in `README.md` stating the minimum VS Code / Cursor version matches `package.json` `engines.vscode` in `README.md`

**Checkpoint**: US1 satisfied — metadata and first-run story coherent.

---

## Phase 4: User Story 2 — No broken or misleading surface (Priority: P2)

**Goal**: No contributed commands or docs advertise **`ace.viewStateSection`** until it is implemented; no misleading TODO in file watcher utility.

**Independent Test**: `package.json` `contributes.commands` lists only commands registered in `src/`; `AGENTS.md` matches; integration tests do not require removed command; `fileWatcher.ts` has no false TODO.

**Implementation note**: Complete **T006–T010** before claiming “no phantom commands” in release notes if the changelog text references this cleanup.

- [ ] T006 [US2] Remove `ace.viewStateSection` entry from `contributes.commands` in `package.json`
- [ ] T007 [US2] Remove **View State Section** / `ace.viewStateSection` row from the command registry table in `AGENTS.md`
- [ ] T008 [P] [US2] Remove `ace.viewStateSection` from the required commands list in `test/suite/integration/extension.test.ts`
- [ ] T009 [P] [US2] Remove `ace.viewStateSection` from the required commands list in `test/suite/integration/extensionLifecycle.test.ts`
- [ ] T010 [US2] Remove or replace the misleading `// TODO: Implement file watching logic` comment in `src/utils/fileWatcher.ts` with an accurate description of behavior

**Checkpoint**: US2 satisfied — declared surface matches runtime.

---

## Phase 5: User Story 3 — Release gate & version (Priority: P3)

**Goal**: Repeatable go/no-go before tagging **1.0.0**, final CI green, and semver aligned when the team cuts the release.

**Independent Test**: All items in `specs/005-release-readiness/quickstart.md` can be completed on a clean machine within ~10 minutes; `package.json` `version` matches the intended marketplace release.

- [ ] T011 [US3] Execute every checklist item in `specs/005-release-readiness/quickstart.md` and document completion (PR description or `specs/005-release-readiness/quickstart.md` notes section)
- [ ] T012 [US3] Re-run `npm run lint` and `npm run ci:coverage` after all file changes; ensure green
- [ ] T013 [P] [US3] Update `version` in `package.json` to `1.0.0` when the team approves the release cut (same commit as changelog/README/command cleanup or immediately before tag)

**Checkpoint**: US3 satisfied — release gate evidence captured and version ready for tag.

---

## Dependencies & Execution Order

### Phase dependencies

| Phase | Depends on | Notes |
|-------|------------|--------|
| 3 US1 | — | Baseline + packaging + changelog + README |
| 4 US2 | Phase 3 recommended | README should not imply removed commands; changelog may reference US2—finalize **T003** after **T006–T010** or draft changelog then update—prefer **US2 before final changelog text** |
| 5 US3 | Phases 3–4 | Quickstart + final CI + version bump last |

**Recommended merge order for coherence**: **T006–T010 (US2) → T003–T005 (US1)** — then **T011–T013**. Alternatively run **T001–T002** first, then **T006–T010**, then finalize **T003–T005**, then **T011–T013**.

### User story dependencies

- **US1**: Tasks **T001–T005** include setup/packaging; **finalize CHANGELOG 1.0.0 section after US2** so notes match shipped command list.
- **US2**: Independent of US1 for code/manifest edits.
- **US3**: Depends on US1+US2 content being merged logically.

### Parallel opportunities

- **T002** can run in parallel with other US1 tasks once branch is checked out (independent file)
- **T008** and **T009** — different files, after **T006–T007**
- **T013** — can follow T012; optional parallel only if version bump is isolated from quickstart edits

---

## Parallel example: User Story 2

```bash
# After T006–T007:
# Launch together:
T008 test/suite/integration/extension.test.ts
T009 test/suite/integration/extensionLifecycle.test.ts
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Complete Phase 3 (US1) — **T001–T005** (baseline, packaging, changelog, README, compatibility)  
2. **STOP**: Validate US1 independently (reviewer can read docs + CI baseline)  
3. Continue to Phases 4–5 (US2, then US3) before tagging 1.0.0

### Full 1.0.0 cut

1. Phase 3 (US1): **T001–T005**  
2. Phase 4 (US2): **T006–T010** (prefer before final **T003** text)  
3. Phase 5 (US3): **T011–T013** (quickstart + final CI + `1.0.0` version)

---

## Task summary

| Metric | Value |
|--------|--------|
| **Total tasks** | 13 |
| **US1** | 5 (T001–T005) |
| **US2** | 5 (T006–T010) |
| **US3** | 3 (T011–T013) |
| **Parallel [P] tasks** | T002, T008, T009, T013 (with caveats) |

**Format validation**: All tasks use `- [ ] T### …` with explicit file paths in descriptions.

---

## Notes

- Do not reintroduce `ace.viewStateSection` without `registerCommand` and product intent.
- Same-commit rule: if behavior docs change, keep `README.md` / `CHANGELOG.md` aligned with `package.json` in the same release PR.

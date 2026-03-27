# Tasks: 1.0 Release Readiness

**Input**: Design documents from `/specs/005-release-readiness/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/contrib-commands.md](./contracts/contrib-commands.md), [quickstart.md](./quickstart.md)

**Tests**: Spec does not mandate TDD; integration tests **must** be updated when removing contributed commands (`ace.viewStateSection`).

**Organization**: Phases follow user stories P1 → P4 from [spec.md](./spec.md). Phase 1 (US1) includes baseline CI and packaging checks alongside changelog/README work. **Jira [FB-67](https://fancybread.atlassian.net/browse/FB-67)** (CD for publish; 1.0.0) is incorporated as **Phase 4 (US4)**—version bump and changelog remain in US1/US3; US4 covers workflow, validation, and publishing docs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story label ([US1], [US2], [US3], [US4]) on story phases only

---

## Phase 1: User Story 1 — Install-ready release (Priority: P1) 🎯 MVP

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

## Phase 2: User Story 2 — No broken or misleading surface (Priority: P2)

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

## Phase 3: User Story 3 — Release gate & version (Priority: P3)

**Goal**: Repeatable go/no-go before tagging **1.0.0**, final CI green, and semver aligned when the team cuts the release.

**Independent Test**: All items in `specs/005-release-readiness/quickstart.md` can be completed on a clean machine within ~10 minutes; `package.json` `version` matches the intended marketplace release.

- [ ] T011 [US3] Execute every checklist item in `specs/005-release-readiness/quickstart.md` and document completion (PR description or `specs/005-release-readiness/quickstart.md` notes section)
- [ ] T012 [US3] Re-run `npm run lint` and `npm run ci:coverage` after all file changes; ensure green
- [ ] T013 [P] [US3] Update `version` in `package.json` to `1.0.0` when the team approves the release cut (same commit as changelog/README/command cleanup or immediately before tag)

**Checkpoint**: US3 satisfied — release gate evidence captured and version ready for tag.

---

## Phase 4: User Story 4 — CD & Marketplace path (Priority: P4) · [FB-67](https://fancybread.atlassian.net/browse/FB-67)

**Purpose**: Enable or replace the disabled CD workflow, document `VSCE_PAT`, and validate `.vsix` packaging before relying on CI for publish.

**Goal**: Maintainers can follow repo docs to configure GitHub secrets and understand when CD runs; local `vsce package` produces an installable artifact.

**Independent Test**: `.github/workflows/cd.yml` is not a permanent no-op; README (or linked doc) describes PAT/secret setup; `npm run package` and `vsce package` succeed on a clean clone after `npm ci`.

- [ ] T014 [US4] Replace the disabled placeholder in `.github/workflows/cd.yml` with a real CD job: restore triggers appropriate for the team (e.g. `release: types: [published ]` and/or `push` to default branch), run install + `npm run package` / `vsce package` + publish using `VSCE_PAT` from GitHub Actions secrets in `.github/workflows/cd.yml`
- [ ] T015 [US4] Document **GitHub secret** `VSCE_PAT` (or the secret name the workflow uses), where to create the token, and that the first Marketplace publish may require publisher verification—add or extend a **Publishing / CD** subsection in `README.md` (or `specs/005-release-readiness/quickstart.md` section 7 if you prefer to keep README short; link from README)
- [ ] T016 [US4] **Pre-publish validation**: from a clean `npm ci`, run `npm run package` and `vsce package`; confirm the produced `.vsix` installs in VS Code/Cursor without manifest errors; note outcome in PR or quickstart notes
- [ ] T017 [P] [US4] Verify `package.json` **`icon`** path matches an existing file at repo root (e.g. `ace.png`); fix any drift so Marketplace packaging does not reference a missing asset in `package.json`
- [ ] T018 [P] [US4] Optional: add **`homepage`** and **`bugs`** URLs in `package.json` for Marketplace listing quality in `package.json`

**Checkpoint**: US4 satisfied — CD documented and validated; FB-67 scope (CD + packaging checks + optional metadata) addressed alongside US3 version `1.0.0`.

---

## Dependencies & Execution Order

### Phase dependencies

| Phase | Depends on | Notes |
|-------|------------|--------|
| 1 US1 | — | Baseline + packaging + changelog + README |
| 2 US2 | US1 recommended | README should not imply removed commands; changelog may reference US2—finalize **T003** after **T006–T010** or draft changelog then update—prefer **US2 before final changelog text** |
| 3 US3 | US1+US2 | Quickstart + final CI + version bump last |
| 4 US4 | US3 recommended | CD should run against **`1.0.0`** manifest and finalized changelog; run **T014–T018** after **T011–T013** unless CD workflow only packages without publish |

**Recommended merge order for coherence**: **T006–T010 (US2) → T003–T005 (US1)** — then **T011–T013** — then **T014–T018 (US4 / FB-67)**. Alternatively run **T001–T002** first, then **T006–T010**, then finalize **T003–T005**, then **T011–T013**, then **T014–T018**.

### User story dependencies

- **US1**: Tasks **T001–T005** include setup/packaging; **finalize CHANGELOG 1.0.0 section after US2** so notes match shipped command list.
- **US2**: Independent of US1 for code/manifest edits.
- **US3**: Depends on US1+US2 content being merged logically.
- **US4 (FB-67)**: Depends on US3 for coherent `1.0.0` tag/CD alignment; **T016** may be partially runnable earlier for debugging packaging.

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

1. Complete Phase 1 (US1) — **T001–T005** (baseline, packaging, changelog, README, compatibility)  
2. **STOP**: Validate US1 independently (reviewer can read docs + CI baseline)  
3. Continue to Phases 2–4 (US2, US3, optional US4 / FB-67) before tagging 1.0.0 and enabling CD

### Full 1.0.0 cut + CD (FB-67)

1. Phase 1 (US1): **T001–T005**  
2. Phase 2 (US2): **T006–T010** (prefer before final **T003** text)  
3. Phase 3 (US3): **T011–T013** (quickstart + final CI + `1.0.0` version)  
4. Phase 4 (US4): **T014–T018** (CD workflow, docs, vsix validation, icon check, optional homepage/bugs)

---

## Task summary

| Metric | Value |
|--------|--------|
| **Total tasks** | 18 |
| **US1** | 5 (T001–T005) |
| **US2** | 5 (T006–T010) |
| **US3** | 3 (T011–T013) |
| **US4** | 5 (T014–T018) · [FB-67](https://fancybread.atlassian.net/browse/FB-67) |
| **Parallel [P] tasks** | T002, T008, T009, T013, T017, T018 (with caveats) |

**Format validation**: All tasks use `- [ ] T### …` with explicit file paths in descriptions.

---

## Notes

- Do not reintroduce `ace.viewStateSection` without `registerCommand` and product intent.
- Same-commit rule: if behavior docs change, keep `README.md` / `CHANGELOG.md` aligned with `package.json` in the same release PR.
- **FB-67**: Link Epic **[FB-125](https://fancybread.atlassian.net/browse/FB-125)** to this work in Jira (“relates to” / child) if your board uses Epic membership; **FB-67** remains the canonical issue for CD; **FB-128** (US3) and **FB-126–127** stay the home for embedded checklist tasks T001–T013.

---

description: "Task list for CI quality gate (003-ci-quality-gate)"
---

# Tasks: CI quality gate (branch & function coverage)

**Input**: Design documents from `/Users/paul/projects/software/agent-context-explorer/specs/003-ci-quality-gate/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ci-quality-gate.md](./contracts/ci-quality-gate.md), [quickstart.md](./quickstart.md)

**Organization**: Tasks follow user stories US1–US3 from [spec.md](./spec.md). Test improvement work (US2/US3) is **implementation via unit tests** under `test/suite/unit/` until NYC **aggregate** `check-coverage` passes: **90%** lines, **80%** branches, **90%** functions (`per-file: false`; see `contracts/ci-quality-gate.md`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: Maps to User Story in spec (US1, US2, US3)

## Phase 1: Setup (shared)

**Purpose**: Document Node policy for contributors (optional but supports FR-003 / NFR-001).

- [x] T001 [P] Add `"node": ">=24"` to `engines` in `/Users/paul/projects/software/agent-context-explorer/package.json` (keep existing `vscode` engine)

---

## Phase 2: Foundational (blocking)

**Purpose**: Coverage policy values MUST be set before CI and local runs enforce the new bars.

**✅ Coverage gate green:** aggregate `test:coverage` meets **90 / 80 / 90** (lines / branches / functions).

- [x] T002 Set **aggregate** thresholds in `/Users/paul/projects/software/agent-context-explorer/.nycrc` per [contracts/ci-quality-gate.md](./contracts/ci-quality-gate.md): `lines` **90**, `branches` **80**, `functions` **90**, `per-file` **false**, `check-coverage` **true**, existing `include`/`exclude`

**Checkpoint**: `.nycrc` matches contract; `npm run test:coverage` exits **0**.

---

## Phase 3: User Story 1 — CI blocks regressions (Priority: P1) 🎯 MVP

**Goal**: Pull requests run **Node 24.x** and **`npm run test:coverage`** so NYC `check-coverage` failures fail the check.

**Independent test**: Open a PR with intentionally violated thresholds (or pre-T004 state); CI **test** job fails. After gates are green, PR passes.

- [x] T003 [US1] Update `/Users/paul/projects/software/agent-context-explorer/.github/workflows/ci.yml`: set `actions/setup-node` **node-version** to **24.x** in both `build` and `test` jobs (replace **22.x**); in `test` job, after `npm run compile`, run `npm run compile:test` then **`npm run test:coverage`** (replace or supplement `npm run test` per [research.md](./research.md) — keep `DISPLAY` env if still running electron harness in same job only if required; otherwise document split in commit message)

---

## Phase 4: User Story 2 — Branch coverage ≥ 80% (Priority: P2)

**Goal**: Aggregate **% Branch** ≥ **80**.

**Independent test**: `npm run test:coverage` exits **0** with `per-file: false` (All files row).

- [x] T004 [US2] Iteratively add or extend unit tests under `/Users/paul/projects/software/agent-context-explorer/test/suite/unit/` (and adjust stubs/mocks as needed) until `npm run test:coverage` exits **0** with respect to **aggregate branch** threshold (All files row)

---

## Phase 5: User Story 3 — Function coverage ≥ 90% (Priority: P3)

**Goal**: Aggregate **% Funcs** ≥ **90**.

**Independent test**: `npm run test:coverage` exits **0** (All files row).

- [x] T005 [US3] Continue test improvements under `/Users/paul/projects/software/agent-context-explorer/test/suite/unit/` until aggregate **function** coverage meets **90%**; confirm with one clean run and document any no-op if T004 already satisfied it

---

## Phase 6: Polish & cross-cutting

**Purpose**: NFR-001 (local parity), doc consistency, final verification.

- [x] T006 [P] Reconcile `/Users/paul/projects/software/agent-context-explorer/specs/003-ci-quality-gate/contracts/ci-quality-gate.md` and `/Users/paul/projects/software/agent-context-explorer/specs/003-ci-quality-gate/quickstart.md` with final `.nycrc` and `ci.yml` behavior
- [x] T007 [P] Add a short pointer to `/Users/paul/projects/software/agent-context-explorer/specs/003-ci-quality-gate/quickstart.md` from `/Users/paul/projects/software/agent-context-explorer/AGENTS.md` (Tech Stack or Quality section) **or** root `README.md` — pick one visible location for contributors
- [x] T008 Run `/Users/paul/projects/software/agent-context-explorer` locally: `npm run lint`, `npm run test:coverage` (exit 0); confirm CI workflow matches [plan.md](./plan.md)

---

## Dependencies & execution order

### Phase dependencies

| Phase | Depends on | Blocks |
|-------|--------------|--------|
| Setup (T001) | — | — |
| Foundational (T002) | — | Meaningful green `test:coverage` until US2/US3 |
| US1 (T003) | T002 recommended (CI should enforce same NYC as local) | — |
| US2 (T004) | T002 | US3 verification |
| US3 (T005) | T004 (typically same test pass fixes both) | Polish |
| Polish | T005 | Release |

### User story dependencies

- **US1**: Needs `.nycrc` thresholds (T002) to meaningfully fail coverage in CI.
- **US2 / US3**: Require T002; often completed in one iterative loop (T004 then T005 as confirm pass).

### Parallel opportunities

- **T001** can run in parallel with **T002** (different files).
- **T006** and **T007** can run in parallel after T005.

### Parallel example (US2)

```bash
# Different test files can be edited in parallel by different contributors:
# test/suite/unit/foo.test.ts
# test/suite/unit/bar.test.ts
# Coordinate on shared stubs in test/vscode-stub if needed.
```

---

## Implementation strategy

### MVP (US1 only — not shippable without US2/US3)

1. T002 + T003 → CI fails until coverage green (expected).
2. Complete T004 + T005 → `test:coverage` exits 0 locally and on PR.

### Incremental delivery

1. Foundational (T002) → policy locked.
2. US1 (T003) → CI enforces gate.
3. US2/US3 (T004–T005) → raise tests until green.
4. Polish (T006–T008).

---

## Notes

- **Integration tests**: Current `ci.yml` used `npm run test` (electron). [research.md](./research.md) recommends **`npm run test:coverage`** for the NYC gate. If both are required, add a second step or job; document in T003 commit.
- Do not lower `.nycrc` thresholds to “get green” without spec change (Same-Commit Rule).

---

## Extension Hooks

**Optional Hook**: jira  
Command: `/speckit.jira.specstoissues`  
Description: Automatically create Jira hierarchy after task generation  
Prompt: Create Jira issues from tasks?  
To execute: `/speckit.jira.specstoissues`

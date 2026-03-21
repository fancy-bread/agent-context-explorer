# Feature Specification: CI quality gate (branch & function coverage)

**Feature Branch**: `003-ci-quality-gate`  
**Created**: 2026-03-21  
**Status**: Draft  
**Input**: User description: "ci-quality-gate, implement code quality gate in ci workflow. update node version to 24.x, increase coverage for code branches to 80%, functions to 90%"

**Related context**: Builds on `specs/002-test-coverage` (per-file **line** coverage gate). This feature adds **branch** and **function** coverage thresholds in CI and repo config, and raises tests where needed to satisfy those bars. **Node.js 24.x** in CI is a **workflow configuration** requirement, not a standalone user story.

## Clarifications

### Session 2026-03-12

- Q: How should User Stories 2–3 relate to Node version and local parity? → A: **User Story 2** addresses **test improvements to meet the branch coverage threshold**; **User Story 3** addresses **test improvements to meet the function coverage threshold**. **Node version bump** is a simple **continuous integration workflow config** requirement (see FR-003), not a user story. **Local parity** (reproducing gate results locally) is an **NFR**, not a user story.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CI blocks regressions on coverage (Priority: P1)

As a maintainer, I want pull requests to fail automated checks when **branch** or **function** coverage drops below agreed minimums, so weak tests cannot merge unnoticed.

**Why this priority**: Directly protects product quality and matches the stated 80% / 90% targets.

**Independent Test**: Open a PR that deliberately lowers coverage below thresholds; the integration pipeline must report failure without manual review.

**Acceptance Scenarios**:

1. **Given** a branch with coverage below the **branch** threshold, **When** the integration pipeline runs, **Then** the run fails and the change cannot be merged until fixed or thresholds adjusted per policy.
2. **Given** a branch with coverage below the **function** threshold, **When** the integration pipeline runs, **Then** the run fails for the same reasons as above.

---

### User Story 2 - Tests meet branch coverage bar (Priority: P2)

As a maintainer, I want the test suite and instrumentation to bring **branch** coverage to at least **80%** per included source file (per project policy), so the new branch gate is satisfied by design rather than by disabling checks.

**Why this priority**: The gate from User Story 1 only adds value once the codebase and tests actually meet the bar.

**Independent Test**: Run coverage; every included file row shows **branch** coverage **≥ 80%** (or documented exclusions per policy).

**Acceptance Scenarios**:

1. **Given** instrumented sources under the coverage policy, **When** coverage is generated after test work for this feature, **Then** no included file falls below **80%** branches (subject to existing exclude rules).

---

### User Story 3 - Tests meet function coverage bar (Priority: P3)

As a maintainer, I want the test suite and instrumentation to bring **function** coverage to at least **90%** per included source file (per project policy), so the function gate is satisfied consistently with the branch and line gates.

**Why this priority**: Same as User Story 2, for the **function** dimension; may follow or overlap with User Story 2 in implementation order.

**Independent Test**: Run coverage; every included file row shows **function** coverage **≥ 90%** (or documented exclusions per policy).

**Acceptance Scenarios**:

1. **Given** instrumented sources under the coverage policy, **When** coverage is generated after test work for this feature, **Then** no included file falls below **90%** functions (subject to existing exclude rules).

---

### Edge Cases

- **Excludes**: Files or paths legitimately excluded from instrumentation (e.g. generated files) MUST remain excluded; gates apply only to included sources per project configuration.
- **Flaky CI**: Intermittent infrastructure failures SHOULD be distinguishable from coverage failures (clear logs / exit codes).
- **Baseline**: First run after raising thresholds may require a one-time test effort to meet new bars; document as a migration note if needed.
- **Order of work**: Branch vs function test gaps may be addressed in parallel or in either order; both User Stories 2 and 3 must be satisfied for the feature to be complete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The **continuous integration** workflow for this repository MUST run the unit test suite with coverage and enforce **NYC `check-coverage`** (or equivalent) such that **branch** coverage below **80%** (per included file, where per-file mode applies) causes a **non-zero** exit.
- **FR-002**: The same pipeline MUST enforce **function** coverage such that **function** coverage below **90%** (per included file, where per-file mode applies) causes a **non-zero** exit.
- **FR-003**: Integration jobs that execute Node-based tooling (tests, coverage, lint as applicable) MUST use **Node.js 24.x** as the runtime (exact patch may float within 24). *This is a workflow configuration requirement, not a standalone deliverable user story.*
- **FR-004**: Coverage configuration in the repo (e.g. `.nycrc`) MUST define **branch** and **function** thresholds consistent with FR-001 and FR-002 so that the same `check-coverage` rules apply wherever coverage is run in automation.
- **FR-005**: Existing **per-file line** coverage policy from `002-test-coverage` MUST remain satisfied unless explicitly superseded by a follow-up spec (default: **keep** line gate alongside branch/function gates).

### Non-Functional Requirements

- **NFR-001 (Local parity)**: Contributors SHOULD be able to run the **documented** local coverage command(s) and see **pass/fail** aligned with the **same** thresholds and include/exclude rules used in CI (same non-zero exit when policy is violated). *Fulfillment is via documentation and shared config, not a separate user story.*

### Assumptions

- **A-001**: “Per-file” behavior for branch and function thresholds matches the project’s existing NYC **per-file** setting for lines (consistent enforcement model).
- **A-002**: Node 24.x is acceptable for all current `engines` / toolchain constraints in this repo; if not, `engines` and docs are updated in the same delivery.
- **A-003**: This feature targets the **primary** CI workflow (e.g. GitHub Actions) already used for PR checks.

### Key Entities

- **Quality gate**: The combined set of automated checks (tests, coverage thresholds, lint if in scope) that must pass before merge.
- **Coverage policy**: Numeric thresholds for lines, branches, and functions applied to instrumented sources.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the default integration path for pull requests, **100%** of runs that violate **branch** or **function** coverage policy result in a **failed** check (no silent pass).
- **SC-002**: Measured **branch** coverage on successful runs is **≥ 80%** for each instrumented source file row in the coverage report (per-file policy, consistent with `002-test-coverage` for lines).
- **SC-003**: Measured **function** coverage on successful runs is **≥ 90%** for each instrumented source file row (same per-file policy).
- **SC-004**: Integration jobs that run Node report version **24.x** in logs or metadata for those jobs.

## Notes *(non-normative)*

- Implementation will touch `.github/workflows/ci.yml`, `.nycrc`, tests, and possibly `package.json` `engines` / docs—details belong in **plan** and **tasks**, not as substitutes for the requirements above.

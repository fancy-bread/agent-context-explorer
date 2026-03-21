# Research: Test Coverage (002-test-coverage)

**Date**: 2026-03-19  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Decision: Treat “coverage” as two related signals

**Decision**: Track and report two different signals:

- **Uncovered-by-tests** (coverage tool output): source lines/branches not executed by the unit test run.
- **Not-imported-by-tests** (structural audit): source modules never imported by any unit tests, and therefore often absent or near-0% in coverage reports.

**Rationale**: A file can be “included” in a coverage report only if it is loaded/executed. Structural audit is a practical backlog generator, while coverage execution is the quality signal for a given PBI’s scope.

**Alternatives considered**:
- Only NYC coverage: misses modules never loaded by unit tests; backlog is incomplete.
- Only structural audit: does not prove correctness; can be satisfied by trivial imports.

## Decision: PBI verification is scoped-by-file-list

**Decision**: Each coverage improvement PBI declares a small list of target source files, and the PR proves:

- tests added/exercising those files
- tests complete successfully without hanging
- coverage improves for those target files (qualitatively or by agreed threshold)

**Rationale**: This prevents “boil the ocean” changes and keeps review manageable.

## Decision: Aggregate line floor (P4) at 80%

**Decision**: After gap-fill stories, the repo adopts a **minimum 80%** **line** coverage target on NYC **All files** for instrumented `src/**/*.ts`, enforced via NYC **check-coverage** (`lines`: 80 in `.nycrc`).

**Rationale**: A single aggregate gate is easy to verify in CI and local runs; per-file non-zero rules (stories A–C) remain the backlog driver for thin files.

**Alternatives considered**:
- Higher threshold (e.g. 90%): may be unrealistic before refactors; can be revisited after sustained 80%.
- Per-directory thresholds only: more precise but heavier to maintain; optional follow-up.

## Decision: Avoid hanging test runs by design

**Decision**: When tests start servers/watchers/sockets, ensure they do not keep the Node event loop alive after tests complete.

**Rationale**: Hung test runs are a recurring productivity killer and undermine trust in the test suite.

**Common mitigations** (non-exhaustive):

- Prefer designs that expose a `dispose()` and always call it in `finally`.
- Where applicable, call `unref()` on servers/sockets created for tests so they do not pin the event loop.
- Keep unit tests focused on pure logic; reserve integration tests for VS Code host paths.


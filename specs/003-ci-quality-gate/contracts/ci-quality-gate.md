# Contract: CI quality gate (003-ci-quality-gate)

## Purpose

Define the **observable** behavior of the quality gate so implementers and CI can verify compliance without ambiguity.

## Commands

| Command | Exit 0 means | Exit non-zero means |
|---------|----------------|---------------------|
| `npm run test:coverage` | NYC reports all included files meet **lines**, **branches**, and **functions** thresholds under `check-coverage` | Any threshold violation, test failure, or NYC error |

## Thresholds (per-file)

When `per-file` is **true** in `.nycrc`, **every included file** must meet **lines**, **branches**, and **functions** minima.

### Target (feature complete — see `spec.md` SC-002 / SC-003)

| Metric | Target (%) |
|--------|------------|
| Lines | 80 |
| Branches | 80 |
| Functions | 90 |

### Enforced floor (ratchet)

Delivery is **phased**: CI must stay green while tests catch up. The repo may enforce **lower branch/function floors** first, then **raise `.nycrc` thresholds in the same commits** as test improvements (typically **User Story 2** for branches → target, **User Story 3** for functions → target).

| Metric | Floor in `.nycrc` (until raised) | Notes |
|--------|----------------------------------|--------|
| Lines | 80 | Unchanged from `002-test-coverage`. |
| Branches | 40 | Passable baseline; increase toward **80** with US2 work. |
| Functions | 50 | Passable baseline; increase toward **90** with US3 work. |

**Source of truth**: `.nycrc` in the repository root; **floor rows** MUST match the file until targets are reached. **Do not** lower floors in unrelated commits (see `quickstart.md`).

## Continuous integration

- Jobs that execute Node for build/test MUST use **Node.js 24.x** (patch flexible within major).
- Pull requests to `main` MUST run the coverage command (or an equivalent that invokes the same NYC `check-coverage` with the same config) and fail the check on non-zero exit.

## Non-goals

- This contract does **not** define GitHub branch protection rules (repository settings); it defines what the **workflow** must run and what **local** `test:coverage` must enforce via shared `.nycrc`.

# Contract: CI quality gate (003-ci-quality-gate)

## Purpose

Define the **observable** behavior of the quality gate so implementers and CI can verify compliance without ambiguity.

## Commands

| Command | Exit 0 means | Exit non-zero means |
|---------|----------------|---------------------|
| `npm run test:coverage` | NYC reports all included files meet **lines**, **branches**, and **functions** thresholds under `check-coverage` | Any threshold violation, test failure, or NYC error |

## Thresholds (per-file)

When `per-file` is **true** in `.nycrc`:

| Metric | Minimum (%) |
|--------|----------------|
| Lines | 80 |
| Branches | 80 |
| Functions | 90 |

**Source of truth**: `.nycrc` in the repository root; this table MUST stay in sync with the file.

## Continuous integration

- Jobs that execute Node for build/test MUST use **Node.js 24.x** (patch flexible within major).
- Pull requests to `main` MUST run the coverage command (or an equivalent that invokes the same NYC `check-coverage` with the same config) and fail the check on non-zero exit.

## Non-goals

- This contract does **not** define GitHub branch protection rules (repository settings); it defines what the **workflow** must run and what **local** `test:coverage` must enforce via shared `.nycrc`.

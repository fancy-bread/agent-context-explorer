# Contract: CI quality gate (003-ci-quality-gate)

## Purpose

Define the **observable** behavior of the quality gate so implementers and CI can verify compliance without ambiguity.

## Commands

| Command | Exit 0 means | Exit non-zero means |
|---------|----------------|---------------------|
| `npm run test:coverage` | NYC `check-coverage` passes: aggregate **All files** row meets **lines**, **branches**, and **functions** (with `per-file: false`), or each file meets them (with `per-file: true`) | Any threshold violation, test failure, or NYC error |

## Thresholds (aggregate vs per-file)

When `per-file` is **true** in `.nycrc`, **every included file** must meet **lines**, **branches**, and **functions** minima.

When `per-file` is **false** (current repo setting for US2), NYC `check-coverage` enforces **aggregate** totals across all included files: **All files** row in the text report must meet the **lines**, **branches**, and **functions** minima. Individual files may be below the bar if the overall project meets the threshold (useful while extension-host entrypoints remain branch-heavy).

### Target (feature complete — see `spec.md` SC-002 / SC-003)

| Metric | Target (%) |
|--------|------------|
| Lines | 90 |
| Branches | 80 |
| Functions | 90 |

### Enforced floor (aggregate, `per-file: false`)

NYC `check-coverage` applies to the **All files** row only. Thresholds in `.nycrc` are the source of truth:

| Metric | Floor in `.nycrc` | Notes |
|--------|-------------------|--------|
| Lines | 90 | Aggregate line coverage. |
| Branches | 80 | Aggregate branch coverage (US2). |
| Functions | 90 | Aggregate function coverage (US3 target met alongside lines). |

### Historical ratchet (reference)

Earlier phases used lower floors (e.g. branches **40** / functions **50**) with `per-file: true` until tests caught up; the repo now uses **aggregate** gates and **90/80/90** for lines/branches/functions.

**Source of truth**: `.nycrc` in the repository root; **floor rows** MUST match the file until targets are reached. **Do not** lower floors in unrelated commits (see `quickstart.md`).

## Continuous integration

- Jobs that execute Node for build/test MUST use **Node.js 24.x** (patch flexible within major).
- Pull requests to `main` MUST run the coverage command (or an equivalent that invokes the same NYC `check-coverage` with the same config) and fail the check on non-zero exit.

## Non-goals

- This contract does **not** define GitHub branch protection rules (repository settings); it defines what the **workflow** must run and what **local** `test:coverage` must enforce via shared `.nycrc`.

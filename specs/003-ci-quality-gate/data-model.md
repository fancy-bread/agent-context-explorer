# Data model: CI quality gate (003-ci-quality-gate)

This feature is **configuration- and policy-driven**; there is no new runtime database. Entities below describe **artifacts** and **policy**.

## CoveragePolicy (NYC / repository)

| Field | Type | Description |
|-------|------|-------------|
| `include` | glob list | Instrumented sources (e.g. `src/**/*.ts`) |
| `exclude` | glob list | Excluded from instrumentation |
| `per-file` | boolean | Enforce thresholds per file row |
| `lines` | number (%) | Minimum line coverage per file (from 002: **80**) |
| `branches` | number (%) | Minimum branch coverage per file (**80** target) |
| `functions` | number (%) | Minimum function coverage per file (**90** target) |
| `check-coverage` | boolean | Fail process when thresholds not met |

**Validation rules**:
- All three dimensions (lines, branches, functions) MUST pass `check-coverage` when `per-file` is true, for each non-excluded included file unless a documented exclusion policy exists (AC-D4 style from 002).

## ContinuousIntegrationConfig (GitHub Actions)

| Field | Type | Description |
|-------|------|-------------|
| `nodeVersion` | string | Major policy, e.g. `24.x` |
| `coverageCommand` | string | e.g. `npm run test:coverage` |
| `trigger` | enum | `pull_request` to `main`, `push` to `main` (existing) |

**Relationships**:
- **CoveragePolicy** is stored in **`.nycrc`** (JSON).
- **ContinuousIntegrationConfig** is stored in **`.github/workflows/ci.yml`** (YAML).

## State transitions

N/A (no workflow engine state machine beyond pass/fail of CI jobs).

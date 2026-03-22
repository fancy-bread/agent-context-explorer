# Data model: CI quality gate (003-ci-quality-gate)

This feature is **configuration- and policy-driven**; there is no new runtime database. Entities below describe **artifacts** and **policy**.

## CoveragePolicy (NYC / repository)

| Field | Type | Description |
|-------|------|-------------|
| `include` | glob list | Instrumented sources (e.g. `src/**/*.ts`) |
| `exclude` | glob list | Excluded from instrumentation |
| `per-file` | boolean | If **true**, enforce thresholds on **each** file row; if **false**, enforce on the **All files** aggregate row only |
| `lines` | number (%) | Minimum **line** coverage (**90** aggregate when `per-file` is false) |
| `branches` | number (%) | Minimum **branch** coverage (**80** aggregate) |
| `functions` | number (%) | Minimum **function** coverage (**90** aggregate) |
| `check-coverage` | boolean | Fail process when thresholds not met |

**Validation rules**:
- When `per-file` is **true**: lines, branches, and functions MUST pass `check-coverage` for each non-excluded included file (unless a documented exclusion policy exists).
- When `per-file` is **false** (current repo): the **All files** row MUST meet **lines**, **branches**, and **functions** minima defined in `.nycrc` (see `contracts/ci-quality-gate.md`).

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

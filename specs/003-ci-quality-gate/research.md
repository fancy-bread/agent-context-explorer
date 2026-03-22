# Research: CI quality gate (003-ci-quality-gate)

**Date**: 2026-03-12  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Decision: NYC `check-coverage` for lines, branches, and functions (aggregate)

**Decision** (as implemented): Set `.nycrc` to **`lines`: 90**, **`branches`: 80**, **`functions`: 90**, with **`per-file`: false**, so thresholds apply to the **All files** aggregate row.

**Rationale**: Per-file branch coverage on extension entrypoints (e.g. `extension.ts`) is expensive to lift to 80% without large refactors; aggregate enforcement still yields strong overall coverage (~95% lines, ~83% branches, ~93% functions at introduction) and matches the quality intent of the spec.

**Alternatives considered**:
- **Strict per-file** branch/function/line gates: higher assurance per file but failed cost/benefit for `extension.ts`-style modules; superseded by aggregate policy documented in `contracts/ci-quality-gate.md`.
- **Lower function threshold**: spec mandates 90%; rejected.

## Decision: Node 24.x via `actions/setup-node`

**Decision**: Use `actions/setup-node@v4` with `node-version: '24.x'` in all CI jobs that run Node (build + test).

**Rationale**: Matches FR-003; patch minors float within 24.x; aligns with spec SC-004.

**Alternatives considered**:
- **Pin exact patch** (e.g. 24.2.0): more reproducible but more churn; defer unless CI instability appears.

## Decision: CI runs `npm run test:coverage` for the NYC gate

**Decision**: The pull-request pipeline MUST execute **`npm run test:coverage`** (which runs `nyc` over `test:unit`) so `check-coverage` runs in CI the same way as locally. Keep or adjust **`npm run test`** (VS Code integration / electron harness) per existing policy: if it remains required for merge quality, run it in addition; if time budget is tight, document that the **coverage gate** is unit+Mocha+NYC and integration tests remain as a separate script (`test:ci`).

**Rationale**: FR-001/002 require NYC enforcement; `test:coverage` is the project’s defined entrypoint (`package.json`).

**Alternatives considered**:
- **Only `npm run test`**: does not invoke NYC on unit tests; does not satisfy spec.
- **Custom nyc CLI duplication**: redundant with `test:coverage`; rejected.

## Decision: `package.json` `engines.node`

**Decision**: Add **`"node": ">=24"`** (or `^24.0.0`) under `engines` to document runtime policy for contributors and tooling (optional but supports NFR-001 and FR-003).

**Rationale**: Aligns local `npm`/`node` expectations with CI; npm may warn on mismatch.

**Alternatives considered**:
- **Omit engines**: CI still enforces via setup-node; local drift more likely.

## Decision: Lint + coverage ordering in CI

**Decision**: Preserve **build** job (checkout → Node 24 → `npm ci` → lint → compile → verify). **Test** job depends on build; run **`npm run test:coverage`** after `compile` + `compile:test` (same as local preconditions for mocha). Optionally run **`npm run test`** after coverage or in parallel job if resources allow—**default for this plan**: **coverage gate is mandatory on PR**; retain integration test if current project treats it as required (current workflow runs `npm run test`).

**Rationale**: Spec emphasizes coverage thresholds; existing workflow already splits build/test.

**Implementation note**: Current `test` job runs `npm run test` only—**replace or append** `npm run test:coverage` so PRs cannot merge without passing NYC thresholds.

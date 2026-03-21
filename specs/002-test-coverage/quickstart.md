# Quickstart: Test Coverage (002-test-coverage)

How to verify a coverage-focused change in this repo.

## Run the fast unit suite

```bash
npm run lint
npm run test:unit
```

## Run unit coverage

```bash
npm run test:coverage
```

## What to look for

- Tests complete successfully (no hang).
- **Stories A–C**: The PBI’s declared target files are exercised by tests; NYC shows **non-zero** `% Lines` per target (unless an agreed type-only exclusion).
- **Story D (P4)**: NYC **All files** row **`% Lines` ≥ 80**; `npm run test:coverage` exits **0** only when NYC **check-coverage** passes (see `.nycrc`).

## P4 gate (reference)

- Threshold: **80%** **lines**, aggregate over instrumented `src/**/*.ts` per `.nycrc` `include` / `exclude`.
- *How* to raise coverage (agent loop, incremental PRs, refactors) is a team/process choice; the spec only defines the **minimum** and **enforcement**.


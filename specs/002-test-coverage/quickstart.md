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
- The PBI’s declared target files are exercised by tests.
- Coverage improves for the target files (or a clear rationale exists for exclusions).


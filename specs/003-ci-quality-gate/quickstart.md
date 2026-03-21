# Quickstart: CI quality gate (003-ci-quality-gate)

## Prerequisites

- **Node.js 24.x** (use `nvm`, `fnm`, or installer; match CI).
- Dependencies installed: `npm ci` or `npm install`.

## Run the same coverage gate as CI

```bash
npm run test:coverage
```

`test:coverage` does **not** run ESLint; full preflight matching `pretest` is:

```bash
npm run compile && npm run compile:test && npm run lint && npm run test:coverage
```

Or use the combined script if present:

```bash
npm run ci:coverage
```

(`ci:coverage` = lint + `test:coverage` per `package.json`.)

## Interpret failures

- **`ERROR: Coverage for ... does not meet threshold`**: Raise tests or adjust **documented** exclusions per project policy—not by lowering thresholds in a drive-by commit.

- **Node version**: If local Node is not 24.x, switch versions before debugging CI-only failures.

## Update checklist (for implementers)

- [ ] `.nycrc` has `branches` / `functions` targets and `per-file` true.
- [ ] `.github/workflows/ci.yml` uses Node 24.x and runs `npm run test:coverage` (or equivalent).
- [ ] `npm run test:coverage` exits 0 locally on `main`-equivalent code after test work.

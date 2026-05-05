---
name: vscode-mcp-extension-test
description: >-
  How to run and work with VS Code extension tests (Mocha, @vscode/test-electron). Use when running tests, checking coverage, adding tests, or debugging test failures. Covers unit vs integration, npm scripts, and test layout. Project test layout is defined in test/README.md.
---

# VS Code Extension Testing

Instruction-focused guidance for running and extending the extension test suite. **Source of truth for this project:** [test/README.md](../../test/README.md).

## When to Use

- User asks to run tests, run coverage, or verify tests pass
- Adding or changing tests; choosing unit vs integration
- Debugging test failures or understanding test layout

## Commands (run in project root)

| Intent | Command |
|--------|---------|
| Unit only (fast, no VS Code) | `npm run test:unit` |
| Full suite (VS Code env) | `npm test` |
| With coverage | `npm run test:coverage` |
| Compile tests only | `npm run compile:test` |
| Verbose runner | `node ./out/test/runTest.js --reporter spec` |
| Grep (e.g. "Extension") | `npm test -- --grep "Extension"` |

## Test layout

- **Unit** (`test/suite/unit/`): No VS Code; use `npm run test:unit`.
- **Integration / scanner / parser / commands / ui** (`test/suite/...`): Require VS Code; use `npm test`.

New tests: place in the right suite; name `*.test.ts`; mock VS Code APIs where needed. Prefer unit tests for pure logic.

## Verification

- After changes: run `npm test` (or `npm run test:unit` for unit-only) and confirm exit code 0.
- For coverage gates: run `npm run test:coverage` and check reported files/percentages.

## Reference

Full categories, fixtures, troubleshooting, and “Adding New Tests”: see [test/README.md](../../test/README.md).

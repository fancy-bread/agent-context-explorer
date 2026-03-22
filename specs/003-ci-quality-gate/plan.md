# Implementation Plan: CI quality gate (branch & function coverage)

**Branch**: `003-ci-quality-gate` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-ci-quality-gate/spec.md`

## Summary

Raise **NYC** enforcement on the **aggregate** `All files` row: **90% lines**, **80% branches**, **90% functions** (with **`per-file`: false**), run the same gate in **GitHub Actions** on pull requests, bump CI **Node.js** to **24.x**, and add or extend **unit tests** until `npm run test:coverage` exits 0. **Local parity** is satisfied by shared `.nycrc` and documented commands (`quickstart.md`).

**Technical approach** (see [research.md](./research.md)): update `.nycrc`; update `.github/workflows/ci.yml` (Node 24 + `npm run test:coverage`); iteratively improve `test/suite/unit/**` until `npm run test:coverage` exits 0; optionally set `package.json` `engines.node` to `>=24`.

## Technical Context

**Language/Version**: TypeScript (strict), Node.js **24.x** for CI and contributor tooling  
**Primary Dependencies**: npm, Mocha, NYC, ESLint, Vite (build), VS Code extension API  
**Storage**: N/A (config files only)  
**Testing**: Mocha unit tests (`npm run test:unit`), NYC coverage (`npm run test:coverage`); existing `npm run test` = VS Code extension integration harness  
**Target Platform**: Linux (GitHub Actions `ubuntu-latest`), developers on macOS/Linux/Windows with Node 24  
**Project Type**: VS Code extension + MCP server (bundled)  
**Performance Goals**: CI completes within typical PR budget; no new latency SLA  
**Constraints**: Per-file coverage gates may require substantial test additions; no weakening of `002` line gate without spec change  
**Scale/Scope**: All `src/**/*.ts` included by `.nycrc` (excluding existing patterns)

## Constitution Check

*GATE: Passed — no violations requiring Complexity Tracking.*

| Principle | Status |
|-----------|--------|
| Viewer-only / explicit artifacts | **Pass** — feature touches CI, tests, and config only; no change to ACE viewer mutation model. |
| Safety & boundaries | **Pass** — no new execution of user code; tests follow existing patterns. |
| Strict TypeScript & tests | **Pass** — extends test coverage and quality gates. |
| ASDLC alignment | **Pass** — spec, plan, research, contracts, quickstart under `specs/003-ci-quality-gate/`. |
| Simplicity | **Pass** — reuse NYC + existing scripts; avoid duplicate coverage tooling. |

## Project Structure

### Documentation (this feature)

```text
specs/003-ci-quality-gate/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ci-quality-gate.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Created by /speckit.tasks (not this command)
```

### Source Code (repository root)

```text
.github/workflows/ci.yml    # Node version + coverage step
.nycrc                      # branches, functions thresholds
package.json                # engines.node (optional), scripts unchanged unless needed
src/                        # Application code (coverage targets)
test/suite/unit/            # Unit tests to extend for branch/function gaps
```

**Structure Decision**: Single extension repo; changes are **config + tests + workflow** only—no new top-level packages.

## Complexity Tracking

*No constitution violations.*

---

## Phase 0: Research (complete)

Output: **research.md** — decisions on NYC per-file thresholds, Node 24 in Actions, `test:coverage` as CI gate, optional `engines`.

## Phase 1: Design & contracts (complete)

| Artifact | Path |
|----------|------|
| Data model | [data-model.md](./data-model.md) |
| Contract | [contracts/ci-quality-gate.md](./contracts/ci-quality-gate.md) |
| Contributor quickstart | [quickstart.md](./quickstart.md) |

## Phase 2: Implementation (for `/speckit.tasks`)

High-level steps (not executable tasks):

1. **Config**: Set `.nycrc` `lines`: 90, `branches`: 80, `functions`: 90, `per-file`: false.
2. **CI**: Set `node-version` to `24.x` in all relevant jobs; ensure PR pipeline runs `npm run test:coverage` (or `ci:coverage` if lint is deduplicated) and fails on non-zero.
3. **Tests**: Run `npm run test:coverage`, identify files below branch/function bars, add targeted unit tests (iterate until green).
4. **Docs**: `package.json` `engines` if desired; `quickstart.md` linked from README or AGENTS if project convention requires.
5. **Verify**: Local `npm run test:coverage` exit 0; CI green on PR.

**Agent context**: Run `.specify/scripts/bash/update-agent-context.sh cursor-agent` after plan artifacts exist (see script output).

---

## Suggested next command

`/speckit.tasks` — Generate `tasks.md` with dependency-ordered work items.

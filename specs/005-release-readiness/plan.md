# Implementation Plan: 1.0 Release Readiness

**Branch**: `005-release-readiness` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-release-readiness/spec.md`

## Summary

Ship **ACE 1.0.0** with release-quality documentation and a coherent **declared user surface**: add a root **`CHANGELOG.md`**, align **`README.md`** with Workspaces + Agents views, agent definitions, and MCP tools, **remove the unimplemented `ace.viewStateSection` command** from contributions and docs (or optionally implement—see [research.md](./research.md)), and remove misleading **TODO** text in `src/utils/fileWatcher.ts`. **CD / Marketplace**: enable `.github/workflows/cd.yml`, document `VSCE_PAT`, validate `.vsix`—see Jira **[FB-67](https://fancybread.atlassian.net/browse/FB-67)** and [spec.md](./spec.md) User Story 4. No new product features; tests updated where they assert contributed commands.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js ≥24 (tooling/CI per `package.json`)  
**Primary Dependencies**: VS Code Extension API (`vscode`), Vite (extension + MCP bundles), Mocha/NYC/ESLint  
**Storage**: N/A (docs + manifest + small source edits)  
**Testing**: Mocha unit/integration (`npm run test:unit`, `npm run test:ci`); ESLint (`npm run lint`)  
**Target Platform**: VS Code / Cursor extension host (see `engines.vscode` in `package.json`)  
**Project Type**: VS Code extension + bundled MCP stdio server  
**Performance Goals**: N/A for this doc-only/hygiene slice  
**Constraints**: `.vscodeignore` must continue to include packaged files (`CHANGELOG.md`, `LICENSE`, `README.md`); no new runtime dependencies  
**Scale/Scope**: Small footprint—~10 files touched (docs, manifest, tests, one utility comment)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|--------|
| Viewer-only, explicit artifacts | **Pass** | No mutation of user rules/specs/skills; docs + manifest alignment only |
| Safety / workspace boundaries | **Pass** | No new file I/O paths; optional README mentions only |
| Strict TS + tests | **Pass** | Update integration tests that reference removed command; run full suite |
| ASDLC alignment | **Pass** | This plan + spec under `specs/005-release-readiness/` |
| Simplicity / bundling | **Pass** | No bundler or activation changes |

**Post-design re-check**: Unchanged—contracts document contributed vs registered commands; removal of dead contribution reduces user confusion.

## Project Structure

### Documentation (this feature)

```text
specs/005-release-readiness/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 verification
├── contracts/           # Phase 1
│   └── contrib-commands.md
└── tasks.md             # Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
package.json                 # contributes.commands — remove dead command
README.md                    # What You See + MCP + prerequisites
CHANGELOG.md                 # NEW — root release notes
LICENSE                      # existing
AGENTS.md                    # command registry alignment
src/utils/fileWatcher.ts     # remove misleading TODO comment
src/extension.ts             # only if implementing viewState (not default — see research)
test/suite/integration/      # extension tests — drop viewStateSection from required list
```

**Structure Decision**: Single VS Code extension repo; changes are localized to manifest, docs, tests, and one utility file.

## Phase 0: Research

See [research.md](./research.md). Resolved: **remove** `ace.viewStateSection` (no user-facing behavior today), keep **Keep a Changelog**–style root `CHANGELOG.md`, README sections for **Agents** + **MCP** tool list.

## Phase 1: Design artifacts

- [data-model.md](./data-model.md) — release entities and invariants  
- [contracts/contrib-commands.md](./contracts/contrib-commands.md) — contributed commands must match registered commands  
- [quickstart.md](./quickstart.md) — maintainer verification before tagging 1.0.0  

## Complexity Tracking

No constitution violations requiring justification.

# Quickstart: Verify 1.0 Release Readiness

**Feature**: `005-release-readiness` | **Date**: 2026-03-26

Use this checklist **before** tagging `v1.0.0` or publishing a VSIX.

## 1. Repository metadata (30 seconds)

- [ ] `CHANGELOG.md` exists at repo root and includes a **`1.0.0`** section.
- [ ] `LICENSE` exists at repo root.
- [ ] `README.md` mentions Workspaces + Agents views, agent definitions, Specs, and MCP at a high level.

## 2. Manifest vs code (5 minutes)

- [ ] Open `package.json` → `contributes.commands` → every `ace.*` id has a matching `registerCommand` in `src/` (search for `'ace.`).
- [ ] Confirm **`ace.viewStateSection`** is **not** listed unless implemented end-to-end.

## 3. Documentation alignment (5 minutes)

- [ ] `AGENTS.md` command table matches `package.json` (no phantom commands).
- [ ] README “What You See” matches the tree: Cursor (Agents, Commands, Rules, Skills), Specs, Agents view.

## 4. Hygiene

- [ ] `src/utils/fileWatcher.ts` has **no** misleading “TODO: implement” for implemented behavior.

## 5. Automated gates

From repo root:

```bash
npm run lint
npm run ci:coverage
```

- [ ] Both pass locally (same as CI expectation).

## 6. Optional manual smoke (10 minutes)

- [ ] Open extension in VS Code/Cursor, run Command Palette (`Cmd/Ctrl+Shift+P`) → search `ACE` / `ace.` → only working commands appear.
- [ ] Expand Workspaces and Agents sidebars as described in README.

## Done

- [ ] Tag or publish only after all boxes above are checked.

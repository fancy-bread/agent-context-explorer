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

## 7. CD & Marketplace ([FB-67](https://fancybread.atlassian.net/browse/FB-67))

Complete after **section 1–6** and **`package.json` `version` is `1.0.0`** (release cut).

- [ ] `.github/workflows/cd.yml` is not permanently disabled: triggers and jobs match team policy; `VSCE_PAT` (or the secret name your workflow uses) is documented.
- [ ] `npm run package` and `vsce package` succeed after `npm ci`; the `.vsix` installs locally.
- [ ] `package.json` **`icon`** points at a file that exists in the packaged extension (e.g. `ace.png`).
- [ ] (Optional) `homepage` / `bugs` set on `package.json` for Marketplace.

**Note**: First production publish may still require publisher verification; the checklist covers **automation + validation + docs**.

## Done

- [ ] Tag or publish only after all boxes above are checked (include section 7 if you are enabling CD for this release).

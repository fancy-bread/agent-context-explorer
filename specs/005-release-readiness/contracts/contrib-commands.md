# Contract: Contributed vs registered commands

**Feature**: `005-release-readiness` | **Date**: 2026-03-26

## Purpose

Ensure every command listed under `contributes.commands` in `package.json` is **registered** at runtime (or explicitly removed from contributions). This contract supports **FR-003** in the feature spec.

## Source of truth

1. **`package.json`** → `contributes.commands[]` → `command` id  
2. **`src/extension.ts`** and **`src/commands/*.ts`** → `vscode.commands.registerCommand(...)`  
3. **`AGENTS.md`** → Command registry table (must match user-facing reality)

## Required commands (1.0.0 target)

After release readiness work, the following **must** be both contributed and registered:

| Command ID | Purpose |
|------------|---------|
| `ace.refresh` | Refresh tree data |
| `ace.addProject` | Add external project |
| `ace.removeProject` | Remove project from list |
| `ace.editProject` | Edit project metadata |
| `ace.listProjects` | List configured projects |

## Explicitly excluded

| Command ID | Disposition |
|------------|-------------|
| `ace.viewStateSection` | **Remove** from `package.json`, tests, and AGENTS.md until a real implementation exists |

## Regression guardrails

- Integration tests that call `vscode.commands.getCommands(true)` must not require removed command IDs.
- **Invariant**: No `ace.*` command appears in the palette that does not register a handler.

## Menus

No change to `contributes.menus` for this contract beyond consistency with the command list.

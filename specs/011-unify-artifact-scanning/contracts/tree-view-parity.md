# Contract: Workspaces Tree View — Data Source Change, No UI Change

## Purpose

The Workspaces tree view's per-project Cursor section and Claude Code section continue to render exactly as they do today (User Story 2, NFR-002), but are sourced from the same unified `scan*Core` functions the MCP tools now use, instead of two independent scan paths.

## Section Population — Unchanged Output, Changed Source

| Section | Today's source | New source |
|---------|----------------|------------|
| Cursor → Rules/Commands/Skills/Agents | `rulesScanner.ts` / `commandsScanner.ts` / `skillsScanner.ts` / `agentsScanner.ts`, each calling the `.cursor`-only `scan*Core` | Same scanner classes, calling the unified `scan*Core` and filtering results where `platform === 'cursor'` |
| Claude Code → Rules/Commands/Skills/Agents | `claudeCodeScanner.ts` calling `scanClaudeCodeCore()` | Same scanner classes as the Cursor row above, filtering where `platform === 'claude'` |

`claudeCodeScanner.ts` / `scanClaudeCodeCore()` remain responsible for CLAUDE.md detection and `claudeFolderExists`/`hasAnyArtifacts` (out of scope for this feature) but no longer own artifact scanning for rules/commands/skills/agents.

## Folder-Gated Display — Unchanged

A platform section is hidden when that platform contributes zero artifacts of every type for the project (existing behavior, driven by `hasAnyArtifacts`-style checks). This is unaffected: the unified scan returning `[]` for a platform behaves identically to the previous independent scan returning `[]`.

## Invariants

- For every existing tree view test fixture project, item names, order, and counts within each section are unchanged (SC-002).
- No new section, icon, or interaction is added to the tree view by this feature.
- File watcher patterns already covering `.claude/rules/**`, `.claude/commands/*.md`, `.claude/skills/**`, `.claude/agents/*.md`, and their `.cursor/` equivalents are unaffected — they watch the filesystem directly, not the scanner call graph.

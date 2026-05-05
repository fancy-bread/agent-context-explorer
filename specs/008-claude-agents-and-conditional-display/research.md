# Research: Claude Project Agents + Conditional Platform Display

**Feature**: 008-claude-agents-and-conditional-display
**Date**: 2026-05-04

---

## Finding 1: Agents view already correctly gates on folder existence

**Decision**: No changes to `resolveAgentRootsWithData()` or `AgentsTreeProvider`.

**Rationale**: `resolveAgentRootsWithData()` in `extension.ts:406-451` already calls `vscode.workspace.fs.stat()` on each candidate root and wraps in try/catch — missing directories are silently skipped and the root is not added to the array. The Agents view is correct as-is.

**Implication for Feature B**: Feature B scope is Workspaces tree only.

---

## Finding 2: `.claude/agents/` scan can reuse existing flat-scan pattern

**Decision**: Use `listFilesFlat` from `src/scanner/core/listFiles.ts` with `['.md']` extension filter, same as `scanClaudeCommands`.

**Rationale**: Agent definitions are flat `*.md` files in `agents/` — no recursion, no subdirectories, no frontmatter parsing beyond file identity. The `scanClaudeCommands` function already does this pattern verbatim for `.claude/commands/*.md`. Reuse is direct; no new utilities needed.

**Alternatives considered**: Using `listFilesRecursive` (used by `scanClaudeRules`) — rejected; agent defs are flat by convention per spec 008 A-001.

---

## Finding 3: `claudeFolderExists` belongs in core scanner output

**Decision**: Add `claudeFolderExists: boolean` to `CoreClaudeCodeArtifacts` and propagate through `ClaudeCodeArtifacts`.

**Rationale**: The scanner already has access to `projectRoot` and can stat `.claude/` in the same `Promise.all` as the other checks. Doing the stat in `extension.ts` would require an extra code path and a separate result field outside the scanner boundary. Keeping it in the scanner preserves the pattern that project data flows through scanners.

**How**: `statClaudeFolder(fs, projectRoot)` — returns `boolean` via `fs.stat('{root}/.claude')`, same approach as `statClaudeMd`.

---

## Finding 4: `cursorFolderExists` belongs in `extension.ts` project data map

**Decision**: Add `statFolderExists(root, '.cursor')` call in `refreshData()` parallel scan; store as `cursorFolderExists: boolean` in the project data map.

**Rationale**: There is no existing Cursor-specific scanner that naturally owns this check (the rules/commands/skills scanners don't expose "did the parent folder exist" — they just return empty arrays). The stat is one line; adding a full Cursor scanner wrapper for it would be over-engineering. `extension.ts` is the right integration point.

**Alternatives considered**: Inferring Cursor presence from `rules.length + commands.length + skills.length > 0` — rejected per spec FR-006; an empty `.cursor/` folder should still show the section.

---

## Finding 5: `hasAnyArtifacts` remains for MCP `get_project` aggregation

**Decision**: `hasAnyArtifacts` is NOT removed from `ClaudeCodeArtifacts`. `claudeFolderExists` is a separate field.

**Rationale**: `hasAnyArtifacts` is currently used as a quick signal in logging and could be used in MCP `get_project` snapshot. The tree display gate changes from `hasAnyArtifacts` → `claudeFolderExists` but `hasAnyArtifacts` stays for other consumers. Removing it would require auditing all callers and is out of scope.

---

## Finding 6: No Agents view watcher changes needed

**Decision**: No watcher changes for Feature A. The `claudeCodeScanner.watchAll()` method will include `.claude/agents/*.md` as part of T002 — this is sufficient for project-level watcher coverage.

**Rationale**: The Agents view already has global `~/.claude/agents/` watchers from spec 007. Project-level `.claude/agents/` is covered by extending `watchAll()` on the existing `ClaudeCodeScanner` instance, consistent with how spec 006 wired project-level Claude artifact watching.

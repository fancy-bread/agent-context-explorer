# Research: Claude Code Project-Level Artifact Support

**Feature**: 006-claude-code-project-support
**Date**: 2026-04-04

## Findings

### 1. Existing Claude Code Infrastructure

**Decision**: Significant global-level Claude Code infrastructure already exists; this feature adds project-level coverage.

**What already exists**:
- `extension.ts:resolveAgentRootsWithData()` already scans `~/.claude/commands/` and `~/.claude/skills/` as an "agent root" — surfaced in a separate "Agent Roots" tree section
- `mcp/server.ts` already scans `~/.claude` for commands, skills, agent definitions (MCP tools)
- `AgentDefinitionLocation` type already includes `'claude'`
- `scanCommandsCore` and `scanSkillsCore` comment-document `~/.claude` as valid agent roots

**What is missing**:
- Project-level `.claude/commands/` scanning (no equivalent to `.cursor/commands/`)
- `CLAUDE.md` at project root — no scanner or tree display
- A dedicated "Claude Code" section in the per-project tree (separate from the global "Agent Roots" view)
- File watchers for project-level `.claude/commands/` and `CLAUDE.md`
- Global `~/.claude/CLAUDE.md` presence check

**Rationale**: Building on existing infrastructure keeps scope minimal. New scanner mirrors `CommandsScanner`; no new parsing logic needed.

### 2. CLAUDE.md Scan Pattern

**Decision**: Scan project root only (`{projectRoot}/CLAUDE.md`); no metadata extraction.

**Rationale**: The spec explicitly excludes subdirectory CLAUDE.md files. The file is presence-only (no frontmatter or structured sections to parse). Simpler than AGENTS.md parsing.

**Alternative considered**: Recursive scan for all CLAUDE.md files — rejected because Claude Code itself only reads from specific locations, and the spec Out of Scope section explicitly excludes sub-root files.

### 3. Commands Scan Pattern

**Decision**: Flat scan of `{projectRoot}/.claude/commands/*.md`, excluding `README.md` — identical to existing `.cursor/commands/` pattern in `scanCommandsCore`.

**Rationale**: `scanCommandsCore` accepts any `projectRoot` and derives `{root}/.cursor/commands/`. A parallel `scanClaudeCommandsCore` (or a generalized refactor) can follow the exact same flat-scan pattern for `{root}/.claude/commands/`. No metadata parsing required — same as Cursor commands.

**Alternative considered**: Reusing `scanCommandsCore` with a configurable subdirectory — possible but adds complexity to existing tested code. Prefer a separate parallel function.

### 4. Tree Section Placement

**Decision**: Add a "Claude Code" group at the same level as the existing "Cursor" group within each project node in `ProjectTreeProvider`.

**Rationale**: Mirrors the Cursor section structure. The existing `category` type system supports adding a new `'claude-code'` category. Count badge and scope labeling patterns already exist and can be reused.

### 5. Global Artifact Reuse

**Decision**: Global `~/.claude/commands/` commands are already scanned in `resolveAgentRootsWithData()`. For the per-project Claude Code tree section, we reuse the existing `scanAgentCommandsCore(fs, homeDir + '/.claude')` call rather than duplicating it.

**Rationale**: Avoids double-scanning. The global data is already in memory; the tree section needs to filter/include it per project view.

**Note**: Global `~/.claude/CLAUDE.md` presence check is new — simple `stat()` call, no parsing.

### 6. File Watcher Additions

**Decision**: Add watchers for `{workspaceRoot}/.claude/commands/*.md` and `{workspaceRoot}/CLAUDE.md` in `setupFileWatcher()`, mirroring the existing Cursor commands watcher.

**Rationale**: All existing artifact types have file watchers. Parity requires adding these two patterns. Global `~/.claude/` watchers are not added in this feature (global agent root watchers are a separate concern handled outside project-level scope).

### 7. No Settings/Hooks Scanning

**Decision**: Out of scope per spec. `.claude/settings.json`, `.claude/settings.local.json`, and hooks are not surfaced.

**Rationale**: Adds complexity for limited viewer value. The spec explicitly excludes these.

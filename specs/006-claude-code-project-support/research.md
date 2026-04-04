# Research: Claude Code Project-Level Artifact Support

**Feature**: 006-claude-code-project-support
**Date**: 2026-04-04 (updated after clarification)

## Findings

### 1. Artifact Scope (updated)

**Decision**: Claude Code section includes Rules, Commands, Skills, and CLAUDE.md — fully mirroring the Cursor section's artifact types.

**Rationale**: User clarification confirmed the feature should mirror the Cursor view exactly. The same four artifact categories exist for Claude Code as for Cursor, sourced from `.claude/` instead of `.cursor/`.

### 2. Parser Reuse for Rules and Skills

**Decision**: Reuse `scanRulesCore` and `scanSkillsCore` with `.claude/` base paths. Same YAML frontmatter schemas apply.

**Rationale**: Confirmed in clarification (Option A). Cursor rules use `description`, `globs`, `alwaysApply` frontmatter; Claude Code rules follow the same format. Cursor skills use `SKILL.md` with `title`, `overview`, etc.; Claude Code skills do the same. Reusing the existing vscode-agnostic core functions avoids duplicating tested parsing logic.

**Alternatives considered**: Separate parsers — rejected because the schemas are identical and duplication increases maintenance surface.

### 3. Existing Claude Code Infrastructure

**Decision**: Build on existing partial infrastructure; fill gaps for project-level `.claude/` scanning.

**What already exists**:
- Global `~/.claude` is already recognized in `resolveAgentRootsWithData()` — scans commands and skills for the Agents view
- MCP server already scans `~/.claude` for commands, skills, agent definitions
- `AgentDefinitionLocation` type already includes `'claude'`
- `scanCommandsCore` and `scanSkillsCore` already note `~/.claude` as valid agent roots

**What is new (project-level)**:
- `.claude/rules/` — no project-level scanner exists; reuse `scanRulesCore(fs, projectRoot, userRoot)` with `.claude/rules/` path
- `.claude/commands/` — no project-level scanner exists; reuse `scanCommandsCore` pattern
- `.claude/skills/` — no project-level scanner exists; reuse `scanSkillsCore` pattern
- `CLAUDE.md` at project root — simple stat check, no parsing
- A unified `ClaudeCodeScanner` wrapping all four artifact types

### 4. Scan Patterns

**Decision**: Mirror exact Cursor scan patterns under `.claude/`:

| Artifact | Path | Pattern | Depth |
|----------|------|---------|-------|
| CLAUDE.md | `{root}/CLAUDE.md` | exact match | single file |
| Rules | `{root}/.claude/rules/` | `*.{mdc,md}` | recursive |
| Commands | `{root}/.claude/commands/` | `*.md` (excl. README.md) | flat |
| Skills | `{root}/.claude/skills/` | `*/SKILL.md` | one level |

### 5. Coexistence of Cursor and Claude Code Sections

**Decision**: Both sections render independently in the per-project tree; each is shown only when its artifacts are present.

**Rationale**: A project may use Cursor, Claude Code, or both. The show/hide behavior for each section is independent — no merged or priority-ordered view.

**Implementation note**: No new coordination logic needed; `ProjectTreeProvider` already handles multiple sections per project. The Claude Code section is simply added alongside the Cursor section using the same rendering pattern.

### 6. File Watcher Additions

**Decision**: Add four new project-level watchers mirroring the Cursor watcher set:
- `{workspaceRoot}/.claude/rules/**/*.{mdc,md}`
- `{workspaceRoot}/.claude/commands/*.md`
- `{workspaceRoot}/.claude/skills/*/SKILL.md`
- `{workspaceRoot}/CLAUDE.md`

All trigger `refreshData()` on create/change/delete.

### 7. No Settings/Hooks/Agents Scanning

**Decision**: Out of scope. `.claude/settings.json`, hooks, and `.claude/agents/` are excluded from the project-level Claude Code section. The Agents view already covers global agent definitions.

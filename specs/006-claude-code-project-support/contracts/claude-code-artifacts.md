# Contract: Claude Code Artifacts (tree)

**Feature**: [spec.md](../spec.md)
**Plan**: [plan.md](../plan.md)
**Date**: 2026-04-04 (updated after clarification)

## On-disk layout (normative for implementation)

| Context   | Path                              | File pattern                  | Scan depth           |
|-----------|-----------------------------------|-------------------------------|----------------------|
| Workspace | `<project>/CLAUDE.md`             | exact match                   | single file          |
| Workspace | `<project>/.claude/rules/`        | `*.{mdc,md}`                  | recursive            |
| Workspace | `<project>/.claude/commands/`     | `*.md` (excl. README.md)      | flat (non-recursive) |
| Workspace | `<project>/.claude/skills/`       | `*/SKILL.md`                  | one level            |

Missing files or directories → omitted from results (no error).

Global `~/.claude/` artifacts are surfaced in the existing **Agents view** and are out of scope for this feature.

## UI contract

### Tree structure

```
Workspaces
└── <project>
    ├── Cursor              ← existing section (unchanged)
    │   ├── Rules (N)
    │   ├── Commands (N)
    │   ├── Skills (N)
    │   └── Agents (N)
    └── Claude Code         ← new section (this feature)
        ├── CLAUDE.md
        ├── Rules (N)
        ├── Commands (N)
        └── Skills (N)
```

- **Both sections independent**: If a project has `.cursor/` artifacts, the Cursor section shows. If it has `.claude/` artifacts, the Claude Code section shows. Both show simultaneously when both exist.
- **"Claude Code" group**: hidden or empty state when no project-level Claude Code artifacts exist.
- **CLAUDE.md item**: label `CLAUDE.md`; no scope description (project-only).
- **Rules group**: label `Rules` + count; leaf label = filename; tooltip = `description` from frontmatter.
- **Commands group**: label `Commands` + count; leaf label = filename without `.md`.
- **Skills group**: label `Skills` + count; leaf label = `title` from frontmatter or directory name; tooltip = `overview`.
- **Activation**: clicking any item opens file URI in editor; ACE performs no mutation.

## Icons

| Item               | Codicon        |
|--------------------|----------------|
| Claude Code group  | `symbol-file`  |
| CLAUDE.md          | `file-text`    |
| Rules group        | `bookmark`     |
| Rule               | `bookmark`     |
| Commands group     | `terminal`     |
| Command            | `terminal`     |
| Skills group       | `play-circle`  |
| Skill              | `play-circle`  |

## File watching patterns

| Pattern | Trigger |
|---------|---------|
| `{workspaceRoot}/.claude/rules/**/*.{mdc,md}` | refreshData() |
| `{workspaceRoot}/.claude/commands/*.md`        | refreshData() |
| `{workspaceRoot}/.claude/skills/*/SKILL.md`   | refreshData() |
| `{workspaceRoot}/CLAUDE.md`                   | refreshData() |

## Out of scope (for this contract)

- Global `~/.claude/` artifacts (handled by the existing Agents view)
- MCP tool exposure of Claude Code artifacts (may be addressed in a follow-on spec)
- `.claude/settings.json` / `.claude/settings.local.json`
- Hooks or other non-file Claude Code config
- `.claude/agents/` (handled by Agents view)

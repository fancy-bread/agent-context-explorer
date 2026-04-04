# Contract: Claude Code Artifacts (tree)

**Feature**: [spec.md](../spec.md)
**Plan**: [plan.md](../plan.md)
**Date**: 2026-04-04

## On-disk layout (normative for implementation)

| Context   | Path                        | File pattern               | Scan depth |
|-----------|-----------------------------|----------------------------|------------|
| Workspace | `<project>/CLAUDE.md`       | exact match                | single file |
| Workspace | `<project>/.claude/commands/` | `*.md` (excl. README.md) | flat (non-recursive) |
| Global    | `~/.claude/CLAUDE.md`       | exact match                | single file |
| Global    | `~/.claude/commands/`       | `*.md` (excl. README.md)  | flat (non-recursive) |

Missing files or directories → omitted from results (no error).

## UI contract

### Tree structure

```
Workspaces
└── <project>
    ├── Cursor          ← existing section (unchanged)
    └── Claude Code     ← new section (this feature)
        ├── CLAUDE.md [workspace]
        ├── CLAUDE.md [global]
        └── Commands (N)
            ├── command-a      ← workspace
            ├── command-b      ← global
            └── ...
```

- **"Claude Code" group**: always shown when the project has any Claude Code artifacts; hidden or shows empty state otherwise.
- **CLAUDE.md items**: displayed with label `CLAUDE.md`; description = `"workspace"` or `"global"` to distinguish scope.
- **Commands group**: displayed with label `Commands` + item count; sibling label ordering follows existing Cursor convention (alphabetical by label).
- **Command leaf**: label = filename without `.md`; description = `"global"` for `~/.claude/commands/` items, empty for workspace items.
- **Activation**: clicking any item opens file URI in editor; ACE performs no mutation.

## Icons

| Item               | Codicon        |
|--------------------|----------------|
| Claude Code group  | `symbol-file`  |
| CLAUDE.md          | `file-text`    |
| Commands group     | `terminal`     |
| Command            | `terminal`     |

## Out of scope (for this contract)

- MCP tool exposure of Claude Code artifacts (may be addressed in a follow-on spec)
- `.claude/settings.json` / `.claude/settings.local.json`
- Hooks or other non-file Claude Code config

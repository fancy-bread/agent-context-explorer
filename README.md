# Agent Context Explorer (ACE)

**View project context for AI agents** — Cursor rules, commands, skills, and project specs in one tree. Browse across multiple workspaces. ACE is **viewer-only**: it scans and displays intentional artifacts without managing them.

## What You See

**Cursor** (IDE artifacts)
- **Rules** — `.cursor/rules/*.{mdc,md}`
- **Commands** — `.cursor/commands/*.md` (workspace) and `~/.cursor/commands/*.md` (global)
- **Skills** — `.cursor/skills/*/SKILL.md` (workspace) and `~/.cursor/skills/*/SKILL.md` (global)

**Specs** (per project)
- Flat list of feature specs — `specs/*/spec.md` (no separate Schemas node in the tree)

## Quick Start

1. Open the ACE icon in the sidebar (or Activity Bar).
2. Expand a project → Cursor or Specs.
3. Click any item to open it in your editor (read-only).

## Multi-Project

Use the `+` button to add external projects. Each project shows its own rules, commands, skills, and specs.

## MCP: AI Agent Access

ACE exposes an MCP server so AI agents can read project context on demand.

**In Cursor:** ACE registers automatically via the MCP Extension API — no setup needed.

**Standalone / fallback:** Add to `.cursor/mcp.json` or `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ace": {
      "command": "node",
      "args": ["<extension-dir>/out/mcp/server.js", "<workspace-root>"]
    }
  }
}
```

Replace `<extension-dir>` (e.g. `~/.cursor/extensions/fancy-bread.agent-context-explorer-x.y.z`) and `<workspace-root>`.

**Tools only** — Agents get context by calling tools only (no MCP resources). Tools: `list_projects`, `list_rules`, `get_rule`, `list_commands`, `get_command`, `list_skills`, `get_skill`, `list_agents`, `get_agent`, `list_specs`, `get_spec`, `get_project`.

## Troubleshooting

| Issue | Check |
|-------|-------|
| Rules missing | `.cursor/rules/` exists, files are `.mdc` or `.md` |
| Commands missing | `.cursor/commands/` (workspace) or `~/.cursor/commands/` (global) |
| Skills missing | `.cursor/skills/*/SKILL.md` (workspace) or `~/.cursor/skills/*/SKILL.md` (global) |
| Specs missing | `specs/` directory with feature folders under the project |
| Tree stale | Click refresh (↻) in the tree header |

## License

MIT — see [LICENSE](LICENSE).

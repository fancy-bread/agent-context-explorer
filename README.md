# Agent Context Explorer (ACE)

**View project context for AI agents** — Cursor rules, commands, skills, and project specs in one tree. Browse across multiple workspaces. ACE is **viewer-only**: it scans and displays intentional artifacts without managing them.

## What You See

**Workspaces view** (`aceProjects`)
- **Workspaces** node lists your current workspace and any added external projects.

**Agents view** (`aceAgents`)
- A view into **user-level AI agent configuration**: browses global agent definitions from `~/.agents/*` and any other configured agent roots. Lets you see the agents, commands, and skills available to your AI tools without leaving the IDE.

**Cursor** (IDE artifacts per workspace)
- **Rules** — `.cursor/rules/*.{mdc,md}`
- **Commands** — `.cursor/commands/*.md` (workspace) and `~/.cursor/commands/*.md` (global)
- **Skills** — `.cursor/skills/*/SKILL.md` (workspace) and `~/.cursor/skills/*/SKILL.md` (global)

**Specs** (per project)
- Flat list of feature specs — `specs/*/spec.md` (no separate Schemas node in the tree)

## Quick Start

1. Open the ACE icon in the sidebar (or Activity Bar).
2. Expand **Workspaces** to browse project-level Cursor + Specs artifacts.
3. Expand **Agents** to browse your global agent configuration (`~/.agents/*`) and in-IDE AI agent tools.
4. Click any item to open it in your editor (read-only).

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

## Requirements

- VS Code/Cursor compatible with extension engine requirement: `vscode` `^1.105.0` (see `package.json` `engines.vscode`).

## Troubleshooting

| Issue | Check |
|-------|-------|
| Rules missing | `.cursor/rules/` exists, files are `.mdc` or `.md` |
| Commands missing | `.cursor/commands/` (workspace) or `~/.cursor/commands/` (global) |
| Skills missing | `.cursor/skills/*/SKILL.md` (workspace) or `~/.cursor/skills/*/SKILL.md` (global) |
| Specs missing | `specs/` directory with feature folders under the project |
| Agents view empty | `~/.agents/` directory exists and contains agent definition files |
| Tree stale | Click refresh (↻) in the tree header |

## License

MIT — see [LICENSE](LICENSE).

# Agent Context Explorer (ACE)

Your AI agents are only as good as the context you give them — and that context can be scattered across several sources `.cursor/`, `.claude/`, `~/.agents/`, and a handful of config files you have to remember exist.

**ACE puts it all in one tree.** 
Rules, commands, skills, agent definitions, specs, and registered MCP servers — for every workspace and every agent platform — visible at a glance, always current. 

ACE is **viewer-only**: it scans and displays intentional artifacts without managing them.

## What You See

**Workspaces view** — project-level artifacts for every workspace and added project:

- **Cursor** — `.cursor/rules/*.{mdc,md}`, `.cursor/commands/*.md`, `.cursor/skills/*/SKILL.md`
- **Claude Code** — `CLAUDE.md`, `.claude/rules/*.{mdc,md}`, `.claude/commands/*.md`, `.claude/skills/*/SKILL.md`
- **Specs** — `specs/*/spec.md` feature specifications

Global commands and skills (`~/.cursor/commands/`, `~/.cursor/skills/`) are shown alongside workspace artifacts in the Cursor section.

**Agents view** — user-level agent configuration across all three global roots:

| Root | Watches |
|------|---------|
| `~/.cursor/` | commands, skills, agent definitions, registered MCP servers |
| `~/.claude/` | commands, skills, agent definitions, registered MCP servers |
| `~/.agents/` | commands, skills, agent definitions |

Each root expands into four sections — **Agents**, **Commands**, **MCP**, **Skills** — in alphabetical order. The **MCP** section lists every MCP server currently registered for that platform, read straight from `~/.claude.json` (Claude Code) or `~/.cursor/mcp.json` (Cursor), so you can see what's wired up without opening a config file. It's read-only and stays live: edit either file externally and the list updates within seconds.

The first time ACE detects Claude Code and finds itself unregistered, it offers a one-time prompt to add itself to `~/.claude.json` — accept it and ACE (and its context-query tools, see [MCP: AI Agent Access](#mcp-ai-agent-access) below) shows up in that same MCP section going forward.

The view auto-refreshes within seconds when files are added, changed, or removed from any watched path.

## Quick Start

1. Open the ACE icon in the Activity Bar.
2. Expand **Workspaces** to browse Cursor and Claude Code artifacts for your project.
3. Expand **Agents** to browse your global agent configuration across `~/.cursor/`, `~/.claude/`, and `~/.agents/`.
4. Click any item to open it read-only in your editor.

## Multi-Project

Use the `+` button to add external projects. Each project shows its own rules, commands, skills, and specs independently.

## MCP: AI Agent Access

ACE exposes an MCP server so AI agents can query project context on demand.

**In Cursor:** ACE registers automatically via the VS Code MCP Extension API — no setup needed.

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

Replace `<extension-dir>` (e.g. `~/.cursor/extensions/fancy-bread.agent-context-explorer-x.y.z`) and `<workspace-root>` with your actual paths.

**Available tools:** `list_projects`, `get_project`, `list_rules`, `get_rule`, `list_commands`, `get_command`, `list_skills`, `get_skill`, `list_agents`, `get_agent`, `list_specs`, `get_spec`

## Requirements

VS Code or Cursor `^1.105.0` (see `engines.vscode` in `package.json`).

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Cursor rules missing | `.cursor/rules/` exists and contains `.mdc` or `.md` files |
| Cursor commands/skills missing | `.cursor/commands/` or `.cursor/skills/*/SKILL.md` exists in the workspace or home directory |
| Claude Code artifacts missing | `CLAUDE.md` or `.claude/` directory exists in the project root |
| Specs missing | `specs/` exists with at least one subdirectory containing `spec.md` |
| Agents view empty | At least one of `~/.cursor/`, `~/.claude/`, or `~/.agents/` exists with artifact files |
| MCP section empty | `~/.claude.json` or `~/.cursor/mcp.json` exists and its `mcpServers` key is valid JSON |
| Tree not updating | Files should appear within ~3 seconds; click refresh (↻) if stale |

## License

MIT — see [LICENSE](LICENSE).

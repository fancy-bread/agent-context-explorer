# Agent Context Explorer (ACE)

**View project context for AI agents** — Cursor rules, commands, skills, and ASDLC artifacts in one tree. Browse across multiple workspaces. ACE is **viewer-only**: it scans and displays intentional artifacts without managing them.

## What You See

**Cursor** (IDE artifacts)
- **Rules** — `.cursor/rules/*.{mdc,md}`
- **Commands** — `.cursor/commands/*.md` (workspace) and `~/.cursor/commands/*.md` (global)
- **Skills** — `.cursor/skills/*/SKILL.md` (workspace) and `~/.cursor/skills/*/SKILL.md` (global)

**Agents** (ASDLC artifacts)
- **AGENTS.md** — Project identity and operational boundaries
- **Specs** — `specs/*/spec.md` (living specifications)
- **Schemas** — `schemas/*.json` (JSON schema definitions)

## Quick Start

1. Open the ACE icon in the sidebar (or Activity Bar).
2. Expand a project → Cursor or Agents.
3. Click any item to open it in your editor (read-only).

## Multi-Project

Use the `+` button to add external projects. Each project shows its own rules, commands, skills, and ASDLC artifacts.

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

Replace `<extension-dir>` (e.g. `~/.cursor/extensions/fancybread-com.agent-context-explorer-x.y.z`) and `<workspace-root>`.

**Tools:** `list_rules`, `get_rule`, `list_commands`, `get_command`, `list_skills`, `get_skill`, `get_asdlc_artifacts`, `list_specs`, `get_project_context`

**Resources:** `ace://rules`, `ace://commands`, `ace://skills`, `ace://agents-md`, `ace://specs`, `ace://schemas`

## Troubleshooting

| Issue | Check |
|-------|-------|
| Rules missing | `.cursor/rules/` exists, files are `.mdc` or `.md` |
| Commands missing | `.cursor/commands/` (workspace) or `~/.cursor/commands/` (global) |
| Skills missing | `.cursor/skills/*/SKILL.md` (workspace) or `~/.cursor/skills/*/SKILL.md` (global) |
| ASDLC artifacts missing | `AGENTS.md` at root, `specs/` or `schemas/` directories |
| Tree stale | Click refresh (↻) in the tree header |

## License

MIT — see [LICENSE](LICENSE).

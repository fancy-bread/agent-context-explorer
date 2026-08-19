# Quickstart: Verifying Unified Artifact Scanning

## Prerequisites

- A project with artifacts under `.claude/skills/` and, ideally, at least one other type (`.claude/rules/`, `.claude/commands/`, `.claude/agents/`) — e.g. Bureau, which has 15 `.claude/skills/*/SKILL.md` entries.
- ACE running against that project, either via the live extension (bridge mode) or the standalone MCP server (`ACE_PROJECT_PATHS`).

## MCP tool verification

1. Call `list_projects` — confirm the target project's `projectKey`.
2. Call `list_skills` with that `projectKey`. Before this feature: returns only global `.cursor` skills (or empty). After: returns the project's full `.claude/skills/` contents, each item tagged `"platform": "claude"`.
3. Repeat for `list_rules`, `list_commands`, `list_agents` against a project with the corresponding `.claude/<type>/` artifacts.
4. Call `get_skill` with the name of a skill that exists under `.claude/skills/` only — confirm it now resolves (previously "not found").
5. (If a same-named artifact exists under both `.cursor/` and `.claude/` in a test fixture) call the corresponding `get_*` tool and confirm it returns the `.cursor` (workspace-tier) result per the documented precedence.

## Tree view verification

1. Open the Workspaces tree for a project with both `.cursor/` and `.claude/` artifacts.
2. Compare the Cursor section and Claude Code section contents against a pre-change screenshot or listing — item names and counts must be identical (SC-002).
3. Open the Workspaces tree for a `.claude/`-only project (e.g. Bureau) — confirm the Cursor section is hidden (folder-gated) and the Claude Code section shows all artifacts.

## Automated verification

- Unit tests in `test/suite/unit/scan*Core.test.ts` cover the merged output and `platform` tagging for each artifact type, using fixtures with both `.cursor/<type>/` and `.claude/<type>/` present.
- Unit tests in `test/suite/unit/mcpServer*.test.ts` assert `list_*`/`get_*` tool output includes both platforms and the `platform` field.
- Existing tree view provider tests continue to pass unmodified in their content assertions (NFR-002).

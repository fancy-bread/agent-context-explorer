# Quickstart: Agent definitions (004-agents-view-scan)

## Try it in a workspace

1. Create a folder: **`.cursor/agents`** at the project root (next to `.cursor/rules`).
2. Add a Markdown file, e.g. **`.cursor/agents/my-agent.md`**.
3. Open **ACE → Workspaces** → expand **Current Workspace** (or your project) → **Cursor** → **Agents**.
4. Click the file — it should open in the editor.

## Try it in the Agents view

1. Under your user directory, ensure one of: **`~/.cursor/agents`**, **`~/.claude/agents`**, or **`~/.agents/agents`** (Global).
2. Add a `*.md` file there.
3. Open **ACE → Agents** → expand **Cursor** (or Claude / Global) → **Agents**.

## Refresh

Use the existing **Refresh** command for ACE if the tree does not update immediately (file watchers may also update after saves).

## MCP (when tools are enabled)

From a connected client, call **`list_agent_definitions`** then **`get_agent_definition`** with a `name` matching the display name (basename without `.md`). See [contracts/agent-definitions.md](./contracts/agent-definitions.md).

## Tests (contributors)

```bash
npm run compile:test
npm run test:unit
```

Add/extend unit tests under `test/suite/unit/` for `scanAgentDefinitionsCore` and any new MCP handlers.

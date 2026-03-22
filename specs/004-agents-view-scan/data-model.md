# Data model: Agent definitions (004-agents-view-scan)

## AgentDefinition

Represents one discoverable **agent definition file** on disk.

| Field | Type | Description |
|-------|------|-------------|
| `path` | string (absolute) | Filesystem path to the `.md` file |
| `fileName` | string | Basename including `.md` |
| `displayName` | string | Basename without extension (default label in tree) |
| `scope` | enum | `workspace` \| `agent-root` |
| `projectId` | string \| undefined | When `scope === 'workspace'`, ACE project id (e.g. `current-workspace` or managed project id) |
| `agentRootId` | string \| undefined | When `scope === 'agent-root'`, matches `AgentRootDefinition.id` (`cursor` \| `claude` \| `global`) |

**Validation rules**:

- `path` MUST resolve under the allowed base for its scope (workspace project root + `.cursor/agents`, or known agent root + `agents` as per [research.md](./research.md)).
- Only **`.md`** files directly in `agents/` (non-recursive) are included.

**Relationships**:

- **Workspace**: Many `AgentDefinition` rows per **ProjectDefinition** (typically zero or more).
- **Agents view**: Many `AgentDefinition` rows per **AgentRootDefinition** (embedded or parallel arrays).

## AgentRootDefinition (extended)

Existing type gains optional parallel data:

| Field | Change |
|-------|--------|
| `agentDefinitions` | `AgentDefinition[]` (or shared type with `scope: 'agent-root'` and `agentRootId` set) |

## Project-scoped data (extension internal)

The extension’s per-project map (today: rules, commands, skills, asdlc, …) gains:

| Field | Type |
|-------|------|
| `agentDefinitions` | `AgentDefinition[]` for workspace-scoped files only |

## MCP projection (if tools shipped)

Flattened MCP shapes (mirror rules/skills pattern):

| MCP type | Purpose |
|----------|---------|
| `AgentDefinitionInfo` | `{ name, path, projectKey? }` — `name` = displayName |
| `AgentDefinitionContent` | `AgentDefinitionInfo` + `{ content: string }` |

Errors: `{ isError: true, message: string }` consistent with existing MCP spec.

## State transitions

N/A — read-only scan on refresh / watcher event; no server-side state machine.

# Contract: Agent definitions (tree + MCP)

**Feature**: [spec.md](../spec.md)  
**Plan**: [plan.md](../plan.md)  
**Date**: 2026-03-12

## On-disk layout (normative for implementation)

| Context | Directory to scan | File pattern |
|---------|-------------------|--------------|
| Workspace | `<project>/.cursor/agents/` | `*.md` (files only; non-recursive) |
| Agent root Cursor | `~/.cursor/agents/` | `*.md` |
| Agent root Claude | `~/.claude/agents/` | `*.md` |
| Agent root Global | `~/.agents/agents/` | `*.md` |

Missing directories → empty list (no error).

## UI contract

- **Label** (folder node): **Agent definitions** (must not be confused with **Agents view** sidebar — see feature spec Terminology).
- **Leaf**: display name = basename without `.md`; **icon** = agent-style codicon (`hubot` per research).
- **Activation**: opens file URI in editor; no ACE-side mutation.

## MCP tools (planned delivery)

Aligned with FR-008 **option (1)** — implement in the same release as the tree:

| Tool | Input | Output |
|------|--------|--------|
| `list_agent_definitions` | `{ projectKey?: string }` | `AgentDefinitionInfo[]` or error object |
| `get_agent_definition` | `{ name: string, projectKey?: string }` | `AgentDefinitionContent` or error object |

**Semantics**:

- `projectKey` omitted: use current/default project for **workspace-scoped** definitions (same resolution as other tools).
- For **user-level** agent definitions exposed via MCP, the implementation MAY either (a) list only workspace-scoped definitions in v1, or (b) extend with `agentRootId` in a later revision — **default for this contract**: workspace-scoped definitions MUST match tree; agent-root definitions SHOULD be listable when `projectKey` resolves to a context that includes global scanning (follow existing `list_skills` multi-root behavior; planning task to align).

*Note*: If implementation discovers scope ambiguity, MCP spec MUST document actual behavior; minimal viable behavior is **workspace `.cursor/agents`** parity with P1 user story.

## MCP deferral (FR-008 option 2)

If tools slip schedule: update `specs/mcp/spec.md` with **explicit** “agent definitions not yet exposed via MCP” and point to this contract’s **On-disk layout** and **UI contract** sections.

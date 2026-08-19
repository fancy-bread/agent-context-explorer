# Contract: MCP `list_*` / `get_*` Tools — Cross-Platform Coverage

## Purpose

`list_rules`, `list_commands`, `list_skills`, `list_agents`, `get_rule`, `get_command`, `get_skill`, `get_agent`, and `get_project` return artifacts from both `.cursor/<type>/` and `.claude/<type>/` at the workspace level for a project, instead of `.cursor/<type>/` only.

## Applies to Both Live Implementations

This contract is implementation-agnostic — it covers the externally-observable tool behavior regardless of which of ACE's two MCP implementations serves the call: `src/mcp/server.ts` (standalone mode, no running extension) or `src/mcp/toolsImpl.ts`'s `McpTools` class (bridge mode, via a running extension's `extensionBackend.ts`). A caller cannot tell which implementation answered, and neither should differ in output shape or completeness (see research.md Decision 5).

## Tool Names, Input Schemas — Unchanged

No tool is renamed, added, or removed. Input schemas (`projectKeyShape`, `nameAndProjectKeyShape`) are unchanged — this is a completeness and metadata change to tool *output*, not the contract surface described by NFR-001.

## Output Changes

### `list_rules`, `list_commands`, `list_skills`, `list_agents`

Each item in the returned array gains a `platform: "cursor" | "claude"` field. Example (`list_skills`, abbreviated):

```json
[
  { "name": "review-code", "title": "review-code", "path": "/…/.cursor/skills/review-code/SKILL.md", "location": "global", "platform": "cursor" },
  { "name": "speckit-plan", "title": "speckit-plan", "path": "/…/.claude/skills/speckit-plan/SKILL.md", "location": "workspace", "platform": "claude" }
]
```

Completeness: for a project with artifacts under `.claude/<type>/` only, the array is no longer empty — it contains that project's full `.claude/<type>/` contents.

### `get_rule`, `get_command`, `get_skill`, `get_agent`

Return shape is unchanged (single item's content, or a "not found" error). Behavior change: the candidate pool now includes both platforms, so a name that previously resolved only against `.cursor/<type>/` may now also match a `.claude/<type>/` artifact of the same name. Resolution order on multiple matches: workspace before global, then cursor before claude (see data-model.md).

### `get_project`

The `rules`, `commands`, `skills`, `agentDefinitions` arrays in the snapshot reflect the same unified, cross-platform results as the corresponding `list_*` tools (FR-004).

## Tool Description Text (FR-009)

Descriptions containing "List all Cursor rules/commands/skills with metadata" are updated to remove the Cursor-only implication, e.g. `"List all rules with metadata"`. `list_agents`'s description (`"List agent definition files (.cursor/agents and user-level agent roots)"`) is updated to also mention `.claude/agents`.

## Error Contract — Unchanged

- Unknown `projectKey` → existing `{ isError: true, message: "Unknown projectKey: …" }` shape, unchanged.
- Missing/unreadable `.cursor/<type>/` or `.claude/<type>/` directory → that platform contributes no items to the merged result; no error surfaced (matches today's per-directory error handling, extended symmetrically to both platforms).

## Invariants

- A project with `.cursor/<type>/` artifacts only sees byte-identical `list_*`/`get_*` output to today, aside from the added `platform: "cursor"` field on each item.
- A project with `.claude/<type>/` artifacts only, which previously received `[]` from every `list_*` tool for that type, now receives its full artifact list.
- No global `~/.claude/<type>/` scanning is introduced (FR-007) — `location: "global"` continues to mean `~/.cursor/<type>/` only.

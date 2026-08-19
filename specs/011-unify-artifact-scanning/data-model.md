# Data Model: Unify Artifact Scanning Across MCP Tools and Tree View

## Core scanner types (`src/scanner/core/types.ts`)

All four types gain a `platform` field. `location` (where it already exists) is unchanged in meaning; `platform` is new and orthogonal to it.

### `CoreRule`

| Field | Type | Change |
|-------|------|--------|
| `path` | `string` | unchanged |
| `metadata` | `CoreRuleMetadata` | unchanged |
| `content` | `string` | unchanged |
| `fileName` | `string` | unchanged |
| `platform` | `'cursor' \| 'claude'` | **new** — source directory convention (`.cursor/rules/` vs `.claude/rules/`) |

No `location` field — rules remain workspace-only scanning (no global `~/.cursor/rules/` or `~/.claude/rules/` scan exists today or is added by this feature; see research.md Decision 2 / spec.md FR-007).

### `CoreCommand`

| Field | Type | Change |
|-------|------|--------|
| `path` | `string` | unchanged |
| `content` | `string` | unchanged |
| `fileName` | `string` | unchanged |
| `location` | `'workspace' \| 'global'` | unchanged — `global` continues to mean `~/.cursor/commands/` only (FR-007: no new `~/.claude/commands/` scan) |
| `platform` | `'cursor' \| 'claude'` | **new** |

### `CoreSkill`

| Field | Type | Change |
|-------|------|--------|
| `path` | `string` | unchanged |
| `content` | `string` | unchanged |
| `fileName` | `string` | unchanged |
| `location` | `'workspace' \| 'global'` | unchanged — `global` continues to mean `~/.cursor/skills/` only |
| `metadata` | `CoreSkillMetadata \| undefined` | unchanged |
| `platform` | `'cursor' \| 'claude'` | **new** |

### `CoreAgentDefinition`

| Field | Type | Change |
|-------|------|--------|
| `path` | `string` | unchanged |
| `content` | `string` | unchanged |
| `fileName` | `string` | unchanged |
| `displayName` | `string` | unchanged |
| `platform` | `'cursor' \| 'claude'` | **new** — note: agent definitions already have a separate `location`-like concept (`AgentDefinitionLocation`: `workspace \| cursor \| claude \| global`) handled one level up in `server.ts`'s `getTaggedCoreAgentDefinitions`; `platform` here specifically distinguishes `.cursor/agents/` vs `.claude/agents/` at the **workspace** tier, which `getTaggedCoreAgentDefinitions` currently collapses to a single `'workspace'` location regardless of which directory it came from. |

## MCP output types (`src/mcp/server.ts`)

`RuleInfo`, `CommandInfo`, `SkillInfo`, `AgentDefinitionInfo` each gain a `platform: 'cursor' | 'claude'` field, populated from the corresponding core type, mirroring how `location` is already surfaced today.

## Merge behavior (all four artifact types)

```
unifiedScan(projectRoot) =
    scanCursor(projectRoot).map(tag('cursor'))
  + scanClaude(projectRoot).map(tag('claude'))
```

- Order within the concatenated array: cursor-tagged results first, then claude-tagged results (matches FR-008 precedence for `get_*` — see below).
- Missing directory on either side → that side contributes `[]`, no error (existing behavior for each side individually is preserved).

## `get_*` lookup resolution (FR-008)

For a `get_rule` / `get_command` / `get_skill` / `get_agent` call with `name`:

1. Filter the unified scan result to items whose `fileName` (case-insensitive) matches `name`.
2. If zero matches → "not found" (unchanged from today).
3. If one match → return it (unchanged from today).
4. If multiple matches → sort by:
   1. `location` (where applicable): `workspace` before `global`
   2. `platform`: `cursor` before `claude`
   — and return the first result after sorting.

## State / lifecycle

No new persisted state. This is a pure read-path change: no new storage, no schema migration, no change to `~/.claude.json` / `~/.cursor/mcp.json` registration (out of scope per spec.md).

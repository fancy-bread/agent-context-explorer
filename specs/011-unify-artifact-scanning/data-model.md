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

## MCP output types — defined in two places, both updated identically

ACE has two live MCP tool implementations, each with its own copy of the output interfaces (see research.md Decision 5):

- `src/mcp/server.ts` (standalone mode): local `RuleInfo`/`CommandInfo`/`SkillInfo` interfaces (`AgentDefinitionInfo` imported from `./types`)
- `src/mcp/types.ts` (bridge mode, via `src/mcp/toolsImpl.ts`'s `McpTools`): `RuleInfo`/`CommandInfo`/`SkillInfo`/`AgentDefinitionInfo` interfaces + `toRuleInfo`/`toCommandInfo`/`toSkillInfo`/`toAgentDefinitionInfo` mapper functions

Both sets of interfaces gain a `platform: 'cursor' | 'claude'` field, populated from the corresponding core type, mirroring how `location` is already surfaced today. `server.ts`'s inline `core*ToInfo` mapping functions and `types.ts`'s `to*Info` functions both need the new field added to their return object.

## Scanner class methods — existing stay filtered, new method returns everything

`src/scanner/rulesScanner.ts`, `commandsScanner.ts`, `skillsScanner.ts`, `agentsScanner.ts` each keep their existing method(s) (`scanRules`, `scanWorkspaceSkills`/`scanGlobalSkills`, etc.) scoped to `platform === 'cursor'` only — their sole current caller (the tree view's Cursor section, plus today's bridge-mode `McpTools` calls which are being repointed) sees no change in shape. Each class gains one new method (e.g. `scanAllRules`, `scanAllWorkspaceSkills`) returning the full unified, platform-tagged result with no filtering — this is what both MCP implementations and `ClaudeCodeScanner` (filtering to `platform === 'claude'`) call instead.

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

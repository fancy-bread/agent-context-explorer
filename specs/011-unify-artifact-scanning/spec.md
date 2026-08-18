---
spec_version: "1.0.0"
revised_at: "2026-08-17"
---

# Feature Specification: Unify Artifact Scanning Across MCP Tools and Tree View

**Feature Branch**: `011-unify-artifact-scanning`
**Created**: 2026-08-17
**Status**: Draft
**Input**: User description: "Unify artifact scanning so both the MCP server tools and the VS Code tree view share a single scanning implementation per artifact type (rules, commands, skills, agent definitions), instead of two parallel scanners that have drifted. MCP tools (list_rules/list_commands/list_skills/list_agents) only scan `.cursor/<type>/`, missing `.claude/<type>/` artifacts entirely — confirmed via a live query returning 4 skills instead of 15 for a project whose skills live under `.claude/skills/`. The tree view already shows both platforms correctly via a separate, unconnected scanning path. Goal: one core scan per artifact type that both consumers share, tagging results by platform (cursor/claude) so the tree view can still partition into its existing two-section UI with no visible change."

---

## Clarifications

### Session 2026-08-17

- Q: Should this feature add new global `~/.claude/rules/`, `~/.claude/commands/`, `~/.claude/skills/` scanning, or stay scoped to the confirmed workspace-level gap? → A: Workspace-level only — no new global-Claude scanning for rules/commands/skills. The Agents view already covers global Claude commands/skills/agents separately and is unaffected by this spec.
- Q: When the same artifact name exists under more than one platform/location, how should `get_*` resolve it? → A: Deterministic precedence — a fixed, documented order (workspace before global, cursor before claude) always returns the same match, rather than erroring on ambiguity.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent gets complete results regardless of project's directory convention (Priority: P1)

An AI agent connected to ACE's MCP server calls `list_skills` (or `list_rules`/`list_commands`/`list_agents`) with a `projectKey` for a project whose artifacts live under `.claude/` instead of `.cursor/`. The agent receives the full, accurate list of that project's artifacts — not a subset silently limited to the Cursor directory convention.

**Why this priority**: This is the confirmed defect and the highest-impact one — MCP tools are ACE's automated integration surface. An agent that gets an incomplete or empty result has no way to know artifacts exist but were missed; it will reasonably conclude the project has no skills/rules/commands/agents of that type, which is actively misleading rather than merely incomplete.

**Independent Test**: For a project with artifacts only under `.claude/skills/` (e.g. Bureau's speckit skills), call `list_skills` with that project's `projectKey`. Verify the returned count and names match the actual contents of `.claude/skills/*/SKILL.md` on disk.

**Acceptance Scenarios**:

1. **Given** a project with artifacts only under `.claude/<type>/`, **When** an agent calls the corresponding `list_*` MCP tool with that project's `projectKey`, **Then** all of that project's artifacts of that type are returned.
2. **Given** a project with artifacts under both `.cursor/<type>/` and `.claude/<type>/`, **When** an agent calls the corresponding `list_*` MCP tool, **Then** artifacts from both platforms are returned in a single result.
3. **Given** a project with artifacts only under `.cursor/<type>/` (today's fully-supported case), **When** an agent calls the corresponding `list_*` MCP tool, **Then** behavior is unchanged from today.
4. **Given** a project with no artifacts of a given type under either platform, **When** an agent calls the corresponding `list_*` MCP tool, **Then** an empty result is returned without error (unchanged from today).

---

### User Story 2 - Tree view keeps its current display, sourced from one scan (Priority: P2)

A developer viewing the Workspaces tree in VS Code/Cursor sees the same Cursor section / Claude Code section split for each project as before the change — identical items, in the same sections, for every existing project.

**Why this priority**: The tree view's current display is already correct; it must not regress as a side effect of fixing the MCP gap. This story exists to guard the refactor, not to add new visible behavior.

**Independent Test**: For a project with artifacts under both `.cursor/` and `.claude/`, open the Workspaces tree before and after the change and verify the Cursor and Claude Code sections show identical contents.

**Acceptance Scenarios**:

1. **Given** a project with artifacts under both `.cursor/<type>/` and `.claude/<type>/`, **When** the Workspaces tree renders that project, **Then** the Cursor section shows only `.cursor/<type>/` artifacts and the Claude Code section shows only `.claude/<type>/` artifacts, matching current behavior.
2. **Given** a project with artifacts under only one platform, **When** the Workspaces tree renders that project, **Then** the section for the platform with no artifacts of that type is hidden, as it is today (folder-gated display).

---

### Edge Cases

- Same-named artifact exists under both `.cursor/<type>/` and `.claude/<type>/` for the same project: both remain distinct, platform-tagged results in `list_*` output — resolution for `get_*` name lookups is addressed under Clarifications below.
- Neither `.cursor/` nor `.claude/` is present for a project: unified scan returns an empty array for that type; no error.
- Only `.claude/<type>/` is present: previously returned empty from MCP tools; after this change, returns full contents (this is the fix).
- A future artifact result with a missing or unrecognized platform tag must not crash the tree view; it must not be silently included in either existing section.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For each artifact type (rules, commands, skills, agent definitions), the system MUST provide one core scan operation that returns workspace-level results from both `.cursor/<type>/` and `.claude/<type>/` for a given project.
- **FR-002**: Each artifact returned by the unified scan MUST be tagged with its source platform (`cursor` or `claude`) in addition to its existing location tag (`workspace` or `global`).
- **FR-003**: The MCP `list_rules`, `list_commands`, `list_skills`, and `list_agents` tools MUST return artifacts from both platforms for a project, using the unified scan.
- **FR-004**: The MCP `get_project` tool's snapshot MUST reflect the same unified, cross-platform results as the corresponding `list_*` tools.
- **FR-005**: The VS Code/Cursor Workspaces tree view MUST continue to display a Cursor section and a Claude Code section per project, each populated using the platform tag from the unified scan, with contents unchanged from current behavior.
- **FR-006**: When an artifact-type directory does not exist under a given platform for a project, the unified scan MUST omit that platform's contribution without error, and the tree view MUST continue to hide a section with no artifacts of that type (existing folder-gated display behavior).
- **FR-007**: Global-scope (`~/.cursor/`, `~/.claude/`) scanning for rules, commands, and skills MUST remain exactly as it is today (Cursor-only) — this feature does not add new `~/.claude/rules/`, `~/.claude/commands/`, or `~/.claude/skills/` scanning. Claude's global roots remain covered separately by the Agents view's own per-root scanner, which is out of scope here.
- **FR-008**: When the same artifact name exists under more than one platform or location for a project, `get_rule`/`get_command`/`get_skill`/`get_agent` MUST resolve to a single, deterministic result using a fixed precedence order: workspace before global, and within the same location tier, cursor before claude.
- **FR-009**: MCP tool descriptions that currently read "List all Cursor rules/commands/skills..." MUST be updated to accurately describe cross-platform coverage (no longer implying Cursor-only results).

### Non-Functional Requirements

- **NFR-001**: This change MUST NOT change MCP tool names or the shape of existing output fields — only result completeness and the addition of a `platform` tag change.
- **NFR-002**: Existing tree view unit tests asserting Cursor/Claude Code section contents MUST continue to pass without modification to their assertions (only the underlying data source may change).
- **NFR-003**: New unit tests MUST cover the unified core scan returning artifacts from both platforms, for at least one project fixture with both `.cursor/<type>/` and `.claude/<type>/` present, for every artifact type.

### Key Entities

- **Unified core scan**: One scan function per artifact type (`scanRulesCore`, `scanCommandsCore`, `scanSkillsCore`, `scanAgentDefinitionsCore`) — today `.cursor`-only; extended to also cover the `.claude/*` scanning already implemented in `scanClaudeCodeCore.ts`, with results tagged by platform.
- **Platform tag**: New `platform: 'cursor' | 'claude'` metadata field on scanned artifacts, alongside the existing `location: 'workspace' | 'global'` field.
- **MCP tool layer**: `list_rules`, `get_rule`, `list_commands`, `get_command`, `list_skills`, `get_skill`, `list_agents`, `get_agent`, `get_project` — consumers of the unified scan; currently call the `.cursor`-only core functions directly.
- **Tree view scanners**: The per-section scanner layers for the Workspaces tree — after unification, these become thin partitioners over the single merged scan rather than independent scans.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a project whose artifacts of a given type live only under `.claude/<type>/`, every relevant MCP `list_*` tool call for that project returns 100% of that project's artifacts of that type (previously 0%).
- **SC-002**: For every existing tree view test fixture project, Cursor and Claude Code section contents (item names, counts) are identical before and after the change.
- **SC-003**: For a project with artifacts under both `.cursor/<type>/` and `.claude/<type>/`, a single `list_*` call returns artifacts from both platforms, each identifiable by platform in the result.
- **SC-004**: Adding cross-platform coverage for a future fifth artifact type requires a change to exactly one core scan function, not two.

## Out of Scope

- Changes to the Agents view (global agent roots: Cursor/Claude/Global) — it already scans Claude's global commands, skills, and agent definitions symmetrically via its own per-root scanner and is unaffected by this spec.
- Adding artifact types beyond rules, commands, skills, and agent definitions.
- Deduplicating or merging identically-named cross-platform artifacts into a single combined entry — each remains a distinct, separately addressable, platform-tagged result.
- Renaming MCP tools or changing their overall input/output contract beyond FR-002 and FR-009.
- Any change to MCP server registration (`~/.claude.json`, `~/.cursor/mcp.json`) — covered by prior work.

## Assumptions

- The tree view's visible Cursor / Claude Code section split is a fixed UI decision; this change affects only the underlying data path, not the rendered structure (per FR-005, User Story 2).
- `scanClaudeCodeCore.ts` is the authoritative source of correct `.claude/*` workspace-scanning logic to merge into the unified core scans, since the tree view's Claude Code section already relies on it and is known to work correctly.

## Implementation Reference

### Files

| Component | Location | Change |
|-----------|----------|--------|
| Rules core scan | `src/scanner/core/scanRulesCore.ts` | Merge in `.claude/rules` workspace scan; add `platform` tag |
| Commands core scan | `src/scanner/core/scanCommandsCore.ts` | Merge in `.claude/commands` workspace scan; add `platform` tag |
| Skills core scan | `src/scanner/core/scanSkillsCore.ts` | Merge in `.claude/skills` workspace scan; add `platform` tag |
| Agent definitions core scan | `src/scanner/core/scanAgentDefinitionsCore.ts` | Merge in `.claude/agents` workspace scan; add `platform` tag |
| Claude Code per-project scan | `src/scanner/core/scanClaudeCodeCore.ts` | Source of the `.claude/*` scanning logic being merged in; candidate for retirement once merged |
| MCP tool layer | `src/mcp/server.ts` | Consume unified core scans; update tool descriptions (FR-009); resolve `get_*` collisions (FR-008) |
| Tree view scanners | `src/scanner/skillsScanner.ts`, `rulesScanner.ts`, `commandsScanner.ts`, `agentsScanner.ts`, `claudeCodeScanner.ts` | Partition unified scan results by platform tag instead of running independent scans |
| Tests | `test/suite/unit/*Core*.test.ts`, `*Scanner*.test.ts`, MCP server tests | Add cross-platform fixtures; assert tree view parity (SC-002) |

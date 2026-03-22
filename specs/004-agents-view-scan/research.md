# Research: Agent definitions (004-agents-view-scan)

**Date**: 2026-03-12  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Decision: On-disk layout — `<base>/agents/*.md` (non-recursive, Markdown only)

**Decision**: Treat **agent definition files** as **`*.md` files** directly under an **`agents`** directory at each relevant base:

| Scope | Base path | Agents directory |
|-------|-----------|------------------|
| Workspace project | `<projectRoot>/.cursor` | `<projectRoot>/.cursor/agents/*.md` |
| Agent root: Cursor | `~/.cursor` | `~/.cursor/agents/*.md` |
| Agent root: Claude | `~/.claude` | `~/.claude/agents/*.md` |
| Agent root: Global | `~/.agents` | `~/.agents/agents/*.md` |

**Rationale**: Matches Cursor’s conventional layout for reusable agent profiles; keeps parity with existing ACE patterns (`commands/`, `skills/` as direct children of `.cursor` or agent root). **Non-recursive** first keeps implementation and tests simple; nested folders can be a follow-up if real repos require it.

**Alternatives considered**:

- **Recursive glob** (`**/*.md`): broader coverage but higher cost and duplicate risk; defer until needed.
- **Single flat `~/.agents/*.md` without `agents/` subfolder** for Global: rejected — inconsistent with Cursor/Claude; `~/.agents/agents/` mirrors other roots that use a subfolder per artifact type (`skills/`).

## Decision: Display name and duplicate labels

**Decision**: **Display name** = file **basename** without `.md`. If two files collide (should not occur in non-recursive flat dir), **tooltip** MUST include full filesystem path (aligns with spec edge case).

**Rationale**: Same pattern as workspace commands; predictable ordering (alphabetical by basename).

**Alternatives considered**:

- **YAML frontmatter `name`**: nicer titles but requires parsing; optional enhancement later.

## Decision: Tree icon for agent definition leaves

**Decision**: Use VS Code **`ThemeIcon('hubot')`** for agent definition file leaves in both trees — distinct from **terminal** (commands), **play-circle** (skills), **book** (rules). *Note:* **AGENTS.md** under Specs + ASDLC also uses a robot-style affordance in the current UI; agent definitions live under **Cursor** / **Agent definitions**, not under Specs + ASDLC, so context differs.

**Rationale**: Spec FR-003 asks for an “agent” visual; `hubot` is the standard codicon affordance for agent-like entities in VS Code.

**Alternatives considered**:

- **`person` / `account`**: less clearly “agent” in dense trees.

## Decision: MCP — add tools in the same delivery

**Decision**: Implement **`list_agent_definitions`** and **`get_agent_definition`** MCP tools (names per [contracts/agent-definitions.md](./contracts/agent-definitions.md)) as thin wrappers over the same scanner types used by the tree, with **`projectKey?`** consistent with other tools.

**Rationale**: Satisfies FR-008 option (1); matches constitution “MCP thin adapters over scanners”; gives agents parity with humans without a second vertical slice. **FR-008** option (2) remains available if schedule forces deferral — document in MCP spec with pointer to on-disk paths.

**Alternatives considered**:

- **Defer MCP only**: valid per FR-008; rejected as default plan to avoid duplicate work and spec drift.

## Decision: File watchers

**Decision**: Register a workspace watcher for **`.cursor/agents/**/*.md`** (create/change/delete) alongside existing rules/commands/skills watchers, triggering the same refresh path as today.

**Rationale**: Matches user expectation (User Story 3); scope is limited to workspace `.cursor/agents` to avoid overly broad `**` watchers.

**Alternatives considered**:

- **Refresh-only** (no watcher): acceptable for MVP but weaker SC-003 UX; watcher preferred for active editing.

## Decision: No change to `AGENTS.md` or Specs + ASDLC

**Decision**: **`AGENTS.md`** stays under **Specs + ASDLC** only; agent definition files are **only** under **Agent definitions** subsections.

**Rationale**: Spec terminology and FR-001/002.

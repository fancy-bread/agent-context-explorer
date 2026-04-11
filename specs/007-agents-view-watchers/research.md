# Research: Agents View File Watchers

**Date**: 2026-04-11
**Feature**: 007-agents-view-watchers

## Summary

No NEEDS CLARIFICATION items. All decisions derived from codebase inspection.

---

## Decision 1: Watcher Pattern

**Decision**: Mirror the three existing `setupGlobal*Watcher()` functions in `src/extension.ts` exactly — one function per artifact type per root.

**Rationale**: The Cursor global watcher functions are already the established pattern in this codebase. They are simple, well-understood, and independently disposable. Using the same shape for Claude and Global roots means no new abstractions and minimal diff.

**Alternatives considered**:
- Parameterized helper `setupAgentRootWatchers(rootDir)` — would reduce repetition across the 6 new functions, but introduces a new abstraction for a one-time operation and deviates from the existing pattern. Deferred to a future refactor if all three roots (Cursor, Claude, Global) are consolidated.

---

## Decision 2: Artifact Types Per Root

**Decision**: Watch `commands/*.md`, `skills/*/SKILL.md`, and `agents/*.md` for both `~/.claude/` and `~/.agents/`.

**Rationale**: Confirmed by `resolveAgentRootsWithData()` in `extension.ts` — the Agents view scans commands, skills, and agent definitions for all three roots using identical scan functions (`scanAgentCommandsCore`, `scanAgentSkillsCore`, `scanAgentDefinitionsForAgentRoot`). Watcher paths must match scanner paths exactly.

**Alternatives considered**: None — paths are dictated by the scanner layer.

---

## Decision 3: Wiring Location

**Decision**: Wire new watchers inside the `if (!watchersInitialized)` block in `ensureDataLoaded()`, immediately after the existing three Cursor global watcher calls.

**Rationale**: All global watchers are lazy-initialized on first tree view access. Placing new watchers in the same block ensures consistent initialization timing and a single point of truth for all watcher setup.

**Alternatives considered**: Separate initialization function — unnecessary indirection for 6 calls.

---

## Decision 4: Function Naming

**Decision**:
- `setupGlobalClaudeCommandsWatcher`, `setupGlobalClaudeSkillsWatcher`, `setupGlobalClaudeAgentDefinitionsWatcher` for `~/.claude/`
- `setupGlobalDotAgentsCommandsWatcher`, `setupGlobalDotAgentsSkillsWatcher`, `setupGlobalDotAgentsAgentDefinitionsWatcher` for `~/.agents/`

**Rationale**: Mirrors existing naming convention (`setupGlobal` prefix, artifact type suffix). `DotAgents` prefix disambiguates from the existing `setupGlobalAgentsWatcher` (which watches `~/.cursor/agents/`).

**Alternatives considered**: `setupGlobalGlobalCommandsWatcher` — redundant; `setupAgentsRootCommandsWatcher` — breaks naming convention.

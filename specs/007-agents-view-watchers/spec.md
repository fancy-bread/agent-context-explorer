# Feature Specification: Agents View File Watchers

**Feature Branch**: `007-agents-view-watchers`
**Created**: 2026-04-11
**Status**: Draft
**Input**: User description: "standardize agents view file watchers across cursor, claude and global"

## Clarifications

### Session 2026-04-11

- Q: Should the `~/.agents/` (Global) root watch the same artifact types as Cursor and Claude? → A: Yes — commands (`commands/*.md`), skills (`skills/*/SKILL.md`), and agent definitions (`agents/*.md`) for all roots that have those directories.
- Q: Should missing directories be silently skipped or logged? → A: Same as existing pattern — catch errors gracefully and log; extension continues without that watcher.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agents View Refreshes on Claude Global Artifact Changes (Priority: P1)

A developer or AI agent modifies a file in `~/.claude/commands/`, `~/.claude/skills/`, or `~/.claude/agents/` while the extension is open. The Agents view updates automatically without a manual refresh, showing the current state of Claude global artifacts.

**Why this priority**: The Agents view already auto-refreshes for `~/.cursor/` changes; the Claude root is displayed alongside Cursor but has no watchers, creating an inconsistent experience. This is the direct gap identified when completing spec 006.

**Independent Test**: Add a new `.md` file to `~/.claude/commands/`. Verify the new command appears in the Agents view Claude root within 3 seconds without reloading the extension.

**Acceptance Scenarios**:

1. **Given** the Agents view is open with a Claude root, **When** a new file is added to `~/.claude/commands/`, **Then** it appears under the Claude root's Commands section without a manual refresh.
2. **Given** the Agents view is open, **When** a `SKILL.md` file is added to a new subdirectory of `~/.claude/skills/`, **Then** the new skill appears under the Claude root's Skills section.
3. **Given** the Agents view is open, **When** a file is deleted from `~/.claude/agents/`, **Then** it is removed from the Claude root's Agents section.
4. **Given** `~/.claude/` does not exist, **When** the extension activates, **Then** no watcher is created for Claude and the extension continues normally.

---

### User Story 2 - Agents View Refreshes on Global (`~/.agents/`) Artifact Changes (Priority: P2)

A developer adds or removes an agent definition or command in `~/.agents/` while the extension is open. The Agents view Global root updates automatically.

**Why this priority**: The Global root is already visible in the Agents view and participates in data resolution, but has no file watchers — same gap as Claude, lower priority because `~/.agents/` is less commonly used than `~/.claude/`.

**Independent Test**: Add a `.md` file to `~/.agents/commands/`. Verify it appears under the Global root within 3 seconds without reloading.

**Acceptance Scenarios**:

1. **Given** the Agents view is open with a Global root, **When** a file is added to `~/.agents/commands/`, **Then** it appears under the Global root's Commands section without a manual refresh.
2. **Given** the Agents view is open, **When** a `SKILL.md` is added under `~/.agents/skills/*/`, **Then** the new skill appears under the Global root.
3. **Given** `~/.agents/` does not exist, **When** the extension activates, **Then** no watcher is created for Global and the extension continues normally.

---

### User Story 3 - All Three Roots Follow a Consistent Watcher Pattern (Priority: P3)

Cursor, Claude, and Global roots each have watchers for all their artifact types (commands, skills, agent definitions), set up through a consistent, symmetric implementation pattern.

**Why this priority**: Ensures long-term maintainability. Adding a new root in the future should require no special-casing. Cursor already has watchers; this story formalises the pattern so it applies uniformly.

**Independent Test**: Verify that adding, modifying, or deleting a file in any watched path across all three roots triggers an Agents view refresh.

**Acceptance Scenarios**:

1. **Given** the Agents view is open, **When** any `.md` file changes in `~/.cursor/commands/`, `~/.cursor/skills/*/SKILL.md`, or `~/.cursor/agents/*.md`, **Then** the view refreshes (existing behaviour preserved).
2. **Given** the implementation, **When** reviewed, **Then** each root's watcher setup follows the same structure — no root requires special-cased logic.

---

### Edge Cases

- What happens when a watched directory is created after the extension activates? Watchers are set up at lazy-init time (first tree view access); if the directory didn't exist then, new files won't trigger a refresh until the extension is reloaded — acceptable limitation, consistent with existing behaviour.
- What happens when multiple rapid file changes occur? Existing `refreshData()` handles this; no debounce is required by this spec.
- What if a root directory exists but the artifact subdirectory (`commands/`, `skills/`, `agents/`) does not? Watcher creation should be attempted; the OS/VS Code watcher infrastructure handles non-existent paths gracefully by not firing events until the path exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Agents view MUST refresh automatically when files in `~/.claude/commands/*.md` are created, modified, or deleted.
- **FR-002**: The Agents view MUST refresh automatically when files matching `~/.claude/skills/*/SKILL.md` are created, modified, or deleted.
- **FR-003**: The Agents view MUST refresh automatically when files in `~/.claude/agents/*.md` are created, modified, or deleted.
- **FR-004**: The Agents view MUST refresh automatically when files in `~/.agents/commands/*.md` are created, modified, or deleted.
- **FR-005**: The Agents view MUST refresh automatically when files matching `~/.agents/skills/*/SKILL.md` are created, modified, or deleted.
- **FR-006**: The Agents view MUST refresh automatically when files in `~/.agents/agents/*.md` are created, modified, or deleted.
- **FR-007**: All new watchers MUST be registered in `context.subscriptions` to ensure automatic cleanup on extension deactivation.
- **FR-008**: Watcher creation MUST fail gracefully — if a directory does not exist or cannot be watched, the extension MUST continue without that watcher and log the failure.
- **FR-009**: The watcher setup for Claude and Global roots MUST follow the same pattern as the existing Cursor global watchers.
- **FR-010**: No duplicate watchers MUST be registered for any path — each artifact type per root is watched exactly once.

### Key Entities

- **Agent Root**: One of three global artifact directories — `~/.cursor` (Cursor), `~/.claude` (Claude), `~/.agents` (Global) — each displayed as a top-level node in the Agents view.
- **Global Command**: A `.md` file in `{agentRoot}/commands/`; flat structure, no recursion.
- **Global Skill**: A `SKILL.md` file in a direct subdirectory of `{agentRoot}/skills/`; one-level scan.
- **Agent Definition**: A `.md` file in `{agentRoot}/agents/`; flat structure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: File system changes to any Claude or Global agent artifact are reflected in the Agents view within 3 seconds of the change occurring.
- **SC-002**: The extension activates and functions normally when `~/.claude/` or `~/.agents/` do not exist — zero errors or warnings surfaced to the user.
- **SC-003**: All new watchers are disposed cleanly on extension deactivation — zero resource leaks.
- **SC-004**: No regression in existing Cursor global artifact watching behaviour after this feature is implemented.
- **SC-005**: Watcher setup for all three roots follows a consistent, symmetric pattern — verified by code review.

## Assumptions

- `~/.claude/` and `~/.agents/` use the same artifact directory structure and file patterns as `~/.cursor/` (`commands/*.md`, `skills/*/SKILL.md`, `agents/*.md`).
- The Agents view's data resolution already correctly populates all three roots when they exist; this spec adds only the reactive watcher layer.
- Watcher setup happens at lazy-init time (inside `ensureDataLoaded()`) consistent with the current extension pattern — not at activation time.
- The existing three `setupGlobal*Watcher()` functions for Cursor are the reference implementation.

## Out of Scope

- Watching project-level `.claude/` artifacts in the Agents view — covered by spec 006 (project tree).
- Watching `~/.cursor/rules/` in the Agents view — rules are a project-level concept.
- Debouncing or coalescing rapid file change events.
- Dynamic watcher creation when a root directory is created after extension activation.

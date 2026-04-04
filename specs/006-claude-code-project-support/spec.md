# Feature Specification: Claude Code Project-Level Artifact Support

**Feature Branch**: `006-claude-code-project-support`
**Created**: 2026-04-04
**Status**: Draft
**Input**: User description: "Project level support for claude-code artifacts. Mirrors the scanning and visualization for Cursor."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Claude Code Artifacts in Tree (Priority: P1)

An AI agent or developer opens the extension's tree view and sees a "Claude Code" section alongside the existing "Cursor" section. The Claude Code section lists all project-level and global Claude Code artifacts — CLAUDE.md files and commands — so the agent can quickly understand what context and commands are available.

**Why this priority**: Core deliverable — without this, no other story has a surface to build on. Establishes parity with the Cursor section.

**Independent Test**: Open a workspace with a CLAUDE.md and a `.claude/commands/` directory. Verify a "Claude Code" tree section appears with the correct items listed.

**Acceptance Scenarios**:

1. **Given** a workspace with a `CLAUDE.md` at the project root, **When** the tree view loads, **Then** the Claude Code section displays the CLAUDE.md file as an item.
2. **Given** a workspace with `.claude/commands/*.md` files, **When** the tree view loads, **Then** each command file appears as a child item under a "Commands" group in the Claude Code section.
3. **Given** a workspace with no Claude Code artifacts, **When** the tree view loads, **Then** the Claude Code section either is hidden or displays an empty state message.

---

### User Story 2 - View Global Claude Code Artifacts (Priority: P2)

A user sees global Claude Code artifacts (from `~/.claude/`) in the tree alongside project-level artifacts, clearly distinguished by scope — matching how Cursor shows global commands and skills.

**Why this priority**: Global artifacts (global commands, global CLAUDE.md) are a significant part of the Claude Code context that agents need visibility into.

**Independent Test**: With `~/.claude/commands/` containing at least one command, verify those commands appear in the tree under a "Commands" group with a visual indicator that they are global (not project-local).

**Acceptance Scenarios**:

1. **Given** `~/.claude/commands/` contains command files, **When** the tree view loads, **Then** global commands appear in the Commands group labeled or badged as "global".
2. **Given** `~/.claude/CLAUDE.md` exists, **When** the tree view loads, **Then** the global CLAUDE.md appears as an item, distinguishable from the project-level CLAUDE.md.
3. **Given** both project and global commands exist with the same filename, **When** the tree view loads, **Then** both are shown with their respective scope labels.

---

### User Story 3 - Open Artifact Files from Tree (Priority: P3)

A user clicks any Claude Code artifact in the tree view to open it in the editor — matching the existing behavior for Cursor artifacts.

**Why this priority**: Navigation to artifact content is essential for usefulness but depends on P1 being complete.

**Independent Test**: Click a CLAUDE.md or command item in the tree. Verify the file opens in the editor.

**Acceptance Scenarios**:

1. **Given** a CLAUDE.md item in the tree, **When** the user clicks it, **Then** the file opens in the editor.
2. **Given** a command item in the tree, **When** the user clicks it, **Then** the corresponding `.md` file opens in the editor.

---

### User Story 4 - Tree Refreshes on File Changes (Priority: P4)

When Claude Code artifact files are created, modified, or deleted, the tree view updates automatically — matching the live-refresh behavior for Cursor artifacts.

**Why this priority**: Reflects how the Cursor section already works; necessary for the experience to feel complete but not blocking initial delivery.

**Independent Test**: Add a new `.md` file to `.claude/commands/` without reloading the extension. Verify the new command appears in the tree within seconds.

**Acceptance Scenarios**:

1. **Given** the tree view is open, **When** a new file is added to `.claude/commands/`, **Then** it appears in the tree without a manual refresh.
2. **Given** a CLAUDE.md exists in the tree, **When** the file is deleted, **Then** it is removed from the tree without a manual refresh.

---

### Edge Cases

- What happens when `CLAUDE.md` exists at multiple levels (root and subdirectory)?
- How does the system handle a `.claude/commands/` directory that exists but is empty?
- What happens when `~/.claude/` does not exist on the user's machine?
- How are non-markdown files in `.claude/commands/` handled?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tree view MUST display a "Claude Code" section at the same level as the existing "Cursor" section for each project.
- **FR-002**: The Claude Code section MUST display the project-level `CLAUDE.md` file if it exists at the workspace root.
- **FR-003**: The Claude Code section MUST display a "Commands" group containing all `.md` files from `.claude/commands/` (excluding `README.md`), using a flat (non-recursive) scan.
- **FR-004**: The Claude Code section MUST display global commands from `~/.claude/commands/` in the Commands group, with each item visually distinguished as global scope.
- **FR-005**: The Claude Code section MUST display the global `~/.claude/CLAUDE.md` file if it exists, visually distinguished from the project-level CLAUDE.md.
- **FR-006**: Clicking any Claude Code artifact item in the tree MUST open that file in the editor.
- **FR-007**: The tree MUST refresh automatically when files in `.claude/commands/`, `CLAUDE.md`, or their global equivalents are created, modified, or deleted.
- **FR-008**: When no Claude Code artifacts exist in a workspace, the Claude Code section MUST either be hidden or display a clear empty state.
- **FR-009**: The Claude Code section MUST display a count of artifacts next to each group heading, consistent with how Cursor groups display counts.

### Key Entities

- **CLAUDE.md**: Project-level or global instruction file for Claude Code; single file per scope; no structured metadata extracted beyond presence.
- **Command**: A `.md` file in `.claude/commands/` (project) or `~/.claude/commands/` (global); identified by filename; flat structure, no recursion.
- **Scope**: Either `workspace` (project-local `.claude/`) or `global` (`~/.claude/`); determines display labeling and file path resolution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All Claude Code artifact types (CLAUDE.md, commands) visible in the tree view within 2 seconds of the extension activating for a workspace.
- **SC-002**: Tree view reflects file system changes (add/remove/modify) to Claude Code artifacts within 3 seconds of the change occurring.
- **SC-003**: 100% of artifact items in the tree are navigable — clicking opens the correct file in the editor with no errors.
- **SC-004**: The Claude Code section is visually and structurally consistent with the Cursor section — same grouping, count badges, and scope labeling patterns.
- **SC-005**: No regression in existing Cursor artifact scanning or visualization when the Claude Code section is added.

## Assumptions

- CLAUDE.md files are only scanned at the workspace root (not subdirectories), consistent with how Claude Code uses them.
- `.claude/settings.json` and `.claude/settings.local.json` are out of scope for this feature (no visualization needed).
- Skills installed via `npx skills -a claude-code` land in `~/.claude/commands/` and are treated as global commands — no special skill metadata parsing is required.
- Global artifact scanning uses the same home directory resolution already used by the Cursor global artifact scanners.
- The Claude Code section follows the same show/hide behavior as the Cursor section when no artifacts are present.

## Out of Scope

- Parsing or displaying metadata from CLAUDE.md content (beyond filename/path).
- `.claude/settings.json` visualization.
- Hooks defined in Claude Code settings.
- Per-project `.claude/` subdirectory CLAUDE.md files below workspace root.

# Feature Specification: Claude Code Project-Level Artifact Support

**Feature Branch**: `006-claude-code-project-support`
**Created**: 2026-04-04
**Status**: Draft
**Input**: User description: "Project level support for claude-code artifacts. Mirrors the scanning and visualization for Cursor."

## Clarifications

### Session 2026-04-04

- Q: What artifact types should the Claude Code section include? → A: Rules, Skills, Commands, and CLAUDE.md — fully mirroring the Cursor section's artifact types.
- Q: How should the extension handle projects that use Cursor, Claude Code, or both? → A: Show each agent's section independently based on what artifacts are present; users can have either or both agent views active in a project simultaneously.
- Q: Do `.claude/rules/` and `.claude/skills/` use the same YAML frontmatter schemas as their Cursor equivalents? → A: Yes — same schema; reuse `scanRulesCore` and `scanSkillsCore` with `.claude/` paths.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Claude Code Artifacts in Tree (Priority: P1)

An AI agent or developer opens the extension's tree view and sees a "Claude Code" section alongside (or instead of) the existing "Cursor" section, depending on which agent's artifacts are present. The Claude Code section lists all project-level Claude Code artifacts — CLAUDE.md, rules, commands, and skills — so the agent can quickly understand what context and instructions are available.

**Why this priority**: Core deliverable — without this, no other story has a surface to build on. Establishes full parity with the Cursor section across all artifact types.

**Independent Test**: Open a workspace with a CLAUDE.md, a `.claude/rules/` directory, a `.claude/commands/` directory, and a `.claude/skills/` directory. Verify a "Claude Code" tree section appears with all artifact groups listed correctly.

**Acceptance Scenarios**:

1. **Given** a workspace with a `CLAUDE.md` at the project root, **When** the tree view loads, **Then** the Claude Code section displays the CLAUDE.md file as an item.
2. **Given** a workspace with `.claude/rules/*.md` files, **When** the tree view loads, **Then** each rule file appears as a child item under a "Rules" group in the Claude Code section.
3. **Given** a workspace with `.claude/commands/*.md` files, **When** the tree view loads, **Then** each command file appears as a child item under a "Commands" group in the Claude Code section.
4. **Given** a workspace with `.claude/skills/*/SKILL.md` files, **When** the tree view loads, **Then** each skill appears as a child item under a "Skills" group in the Claude Code section.
5. **Given** a workspace with both `.cursor/` and `.claude/` artifacts, **When** the tree view loads, **Then** both a "Cursor" section and a "Claude Code" section appear independently.
6. **Given** a workspace with no Claude Code artifacts, **When** the tree view loads, **Then** the Claude Code section is hidden or shows an empty state.

---

### User Story 2 - Open Artifact Files from Tree (Priority: P2)

A user clicks any Claude Code artifact in the tree view to open it in the editor — matching the existing behavior for Cursor artifacts.

**Why this priority**: Navigation to artifact content is essential for usefulness but depends on P1 being complete.

**Independent Test**: Click a CLAUDE.md, a rule, a command, and a skill item in the tree. Verify each opens the correct file in the editor.

**Acceptance Scenarios**:

1. **Given** a CLAUDE.md item in the tree, **When** the user clicks it, **Then** the file opens in the editor.
2. **Given** a rule item in the tree, **When** the user clicks it, **Then** the corresponding `.md` or `.mdc` file opens in the editor.
3. **Given** a command item in the tree, **When** the user clicks it, **Then** the corresponding `.md` file opens in the editor.
4. **Given** a skill item in the tree, **When** the user clicks it, **Then** the corresponding `SKILL.md` file opens in the editor.

---

### User Story 3 - Tree Refreshes on File Changes (Priority: P3)

When Claude Code artifact files are created, modified, or deleted, the tree view updates automatically — matching the live-refresh behavior for Cursor artifacts.

**Why this priority**: Reflects how the Cursor section already works; necessary for the experience to feel complete but not blocking initial delivery.

**Independent Test**: Add a new `.md` file to `.claude/commands/` without reloading the extension. Verify the new command appears in the tree within seconds.

**Acceptance Scenarios**:

1. **Given** the tree view is open, **When** a new file is added to `.claude/commands/`, **Then** it appears in the tree without a manual refresh.
2. **Given** the tree view is open, **When** a new `.md` file is added to `.claude/rules/`, **Then** it appears in the tree without a manual refresh.
3. **Given** a CLAUDE.md exists in the tree, **When** the file is deleted, **Then** it is removed from the tree without a manual refresh.

---

### Edge Cases

- What happens when `CLAUDE.md` exists at multiple levels (root and subdirectory)? Scan root only; subdirectory files are ignored.
- How does the system handle a `.claude/commands/` directory that exists but is empty? Show the Commands group with a zero count or hide it.
- How are non-markdown files in `.claude/commands/` handled? Non-`.md` files are ignored.
- What happens when both `.cursor/` and `.claude/` artifact directories exist with no artifacts in one? The section for the empty agent is hidden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tree view MUST display a "Claude Code" section at the same level as the existing "Cursor" section for each project.
- **FR-002**: The Claude Code section MUST display the project-level `CLAUDE.md` file if it exists at the workspace root.
- **FR-003**: The Claude Code section MUST display a "Rules" group containing `.md` and `.mdc` files from `.claude/rules/` (recursive scan), using the same format and metadata parsing as Cursor rules.
- **FR-004**: The Claude Code section MUST display a "Commands" group containing all `.md` files from `.claude/commands/` (excluding `README.md`), using a flat (non-recursive) scan.
- **FR-005**: The Claude Code section MUST display a "Skills" group containing skills from `.claude/skills/*/SKILL.md` (one-level scan), using the same metadata parsing as Cursor skills.
- **FR-006**: The Cursor section and Claude Code section MUST be displayed independently; if a project has artifacts for both agents, both sections are shown simultaneously.
- **FR-007**: Clicking any Claude Code artifact item in the tree MUST open that file in the editor.
- **FR-008**: The tree MUST refresh automatically when files in `.claude/rules/`, `.claude/commands/`, `.claude/skills/`, or `CLAUDE.md` are created, modified, or deleted.
- **FR-009**: When no Claude Code artifacts exist in a workspace, the Claude Code section MUST either be hidden or display a clear empty state.
- **FR-010**: The Claude Code section MUST display a count of artifacts next to each group heading, consistent with how Cursor groups display counts.

### Key Entities

- **CLAUDE.md**: Project-level instruction file for Claude Code at the workspace root; no structured metadata extracted beyond presence.
- **Claude Rule**: A `.md` or `.mdc` file in `{project}/.claude/rules/`; uses the same YAML frontmatter schema as Cursor rules (`description`, `globs`, `alwaysApply`); recursive scan.
- **Claude Command**: A `.md` file in `{project}/.claude/commands/`; identified by filename; flat structure, no recursion.
- **Claude Skill**: A `SKILL.md` file in a direct subdirectory of `{project}/.claude/skills/`; uses the same YAML frontmatter schema as Cursor skills (`title`, `overview`, etc.); one-level scan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All Claude Code artifact types (CLAUDE.md, rules, commands, skills) visible in the tree view within 2 seconds of the extension activating for a workspace.
- **SC-002**: Tree view reflects file system changes (add/remove/modify) to Claude Code artifacts within 3 seconds of the change occurring.
- **SC-003**: 100% of artifact items in the tree are navigable — clicking opens the correct file in the editor with no errors.
- **SC-004**: The Claude Code section is visually and structurally consistent with the Cursor section — same grouping, count badge, and artifact display patterns.
- **SC-005**: No regression in existing Cursor artifact scanning or visualization when the Claude Code section is added.
- **SC-006**: Projects with both Cursor and Claude Code artifacts correctly display both sections with no cross-contamination of artifact data.

## Assumptions

- CLAUDE.md is scanned at the workspace root only (not subdirectories), consistent with how Claude Code uses it.
- `.claude/rules/`, `.claude/commands/`, and `.claude/skills/` use the same file formats and metadata schemas as their `.cursor/` equivalents, allowing reuse of existing parsers.
- `.claude/settings.json` and `.claude/settings.local.json` are out of scope for this feature.
- Global `~/.claude/` artifacts (commands, skills, etc.) are already surfaced in the existing Agents view and are not duplicated in the project-level Claude Code section.
- The Claude Code section follows the same show/hide behavior as the Cursor section when no artifacts are present.

## Out of Scope

- Parsing or displaying metadata from CLAUDE.md content (beyond filename/path).
- `.claude/settings.json` visualization.
- Hooks defined in Claude Code settings.
- Per-project `.claude/` subdirectory CLAUDE.md files below workspace root.
- Agents (`.claude/agents/`) — the existing Agents view already covers this globally.

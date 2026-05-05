---
spec_version: "1.0.0"
revised_at: "2026-05-04"
---

# Feature Specification: Claude Project Agents + Conditional Platform Display

**Feature Branch**: `008-claude-agents-and-conditional-display`
**Created**: 2026-05-04
**Status**: Draft
**Input**: User description: "project level Agents for Claude. Expose Claude or Cursor only if the .claude or .cursor folders exist at either the project root, or user root (Agents view)."

---

## Clarifications

### Session 2026-05-04

- Q: Should `.claude/agents/` at the project root use the same glob and display pattern as `.cursor/agents/`? → A: Yes — same flat `*.md` scan, same hubot icon, same alphabetical placement within the Claude Code section.
- Q: For conditional display, should a folder's existence be determined by the presence of the folder itself, or by the presence of artifacts inside it? → A: Folder existence. If `.cursor/` or `.claude/` exists at the project root, the section is shown (even if empty). If the folder does not exist, the section is hidden entirely.
- Q: In the Agents view, does this change affect Global (`~/.agents/`) in addition to Cursor and Claude? → A: Yes — all three roots follow the same rule: show only if the root directory exists.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Project-level Claude agent definitions in Workspaces view (Priority: P1)

A developer opens a project whose workspace contains `.claude/agents/*.md` files. They expect to see those agent definitions in the Claude Code section of the Workspaces tree, the same way `.cursor/agents/*.md` files appear under the Cursor section.

**Why this priority**: Completes Claude Code parity. Spec 006 deferred project-level Claude agents ("the existing Agents view already covers this globally") — but global `~/.claude/agents/` is a different concept from workspace-local `.claude/agents/`. The gap is visible to anyone who has both Cursor and Claude agent definitions in a project.

**Independent Test**: Create `.claude/agents/my-agent.md` at a project root. Expand the project's Claude Code section in the Workspaces tree. Verify `my-agent.md` appears under an "Agents" subsection with the hubot icon and opens the file on click.

**Acceptance Scenarios**:

1. **Given** a project with one or more `.md` files in `.claude/agents/`, **When** I expand the Claude Code section in Workspaces, **Then** I see an "Agents" subsection (alphabetical among Claude Code's Rules, Commands, Skills, Agents) listing each file with the hubot icon.
2. **Given** a listed Claude agent definition file, **When** I click it, **Then** the file opens in the editor; ACE does not modify the file.
3. **Given** a project with no `.claude/agents/` files (or directory absent), **When** I view the Claude Code section, **Then** the Agents subsection is absent or shows an explicit empty state — never misleading counts or errors.
4. **Given** a project with both `.cursor/agents/` and `.claude/agents/` files, **When** I expand Workspaces, **Then** both Cursor → Agents and Claude Code → Agents subsections are populated independently with no cross-contamination.

---

### User Story 2 — Cursor and Claude Code sections hidden when folder absent (Workspaces view) (Priority: P2)

A developer opens a project that uses only Claude Code (`.claude/` exists, `.cursor/` does not). They expect to see only a Claude Code section — not an empty Cursor section.

**Why this priority**: Reduces visual noise and false signal. Showing a Cursor section in a Claude-only project implies Cursor is configured there. Hiding absent platforms makes the tree an accurate reflection of the project's actual configuration.

**Independent Test**: Open a workspace with `.claude/` present and no `.cursor/` directory. Verify the Workspaces tree shows a Claude Code section and no Cursor section.

**Acceptance Scenarios**:

1. **Given** a project with `.cursor/` present and `.claude/` absent, **When** I expand that project, **Then** I see the Cursor section and no Claude Code section.
2. **Given** a project with `.claude/` present and `.cursor/` absent, **When** I expand that project, **Then** I see the Claude Code section and no Cursor section.
3. **Given** a project with both `.cursor/` and `.claude/` present, **When** I expand that project, **Then** I see both sections.
4. **Given** a project with neither `.cursor/` nor `.claude/` present, **When** I expand that project, **Then** neither platform section appears; the Specs node remains visible (it is not platform-gated).

---

### User Story 3 — Agents view roots hidden when home directory absent (Priority: P2)

A developer who has `~/.cursor/` but not `~/.claude/` or `~/.agents/` opens the Agents view. They expect to see only the Cursor root — not empty Claude and Global roots.

**Why this priority**: The tree-view spec already states roots show "only if they exist"; this story enforces that intent consistently for Claude and Global, which may not have been wired up under the conditional check.

**Independent Test**: Ensure `~/.claude/` does not exist. Open the Agents view. Verify the Claude root is absent. Then create `~/.claude/` and refresh. Verify the Claude root appears.

**Acceptance Scenarios**:

1. **Given** `~/.cursor/` exists and `~/.claude/` does not, **When** I open the Agents view, **Then** I see a Cursor root and no Claude root.
2. **Given** `~/.claude/` exists and `~/.cursor/` does not, **When** I open the Agents view, **Then** I see a Claude root and no Cursor root.
3. **Given** none of `~/.cursor/`, `~/.claude/`, `~/.agents/` exist, **When** I open the Agents view, **Then** the view shows an empty state with no roots.
4. **Given** the Agents view is open with Claude absent, **When** `~/.claude/` is created on disk and the user refreshes, **Then** the Claude root appears.

---

### Edge Cases

- **Folder exists but empty**: If `.cursor/` or `.claude/` exists but contains no artifacts, the section IS shown (folder presence is the gate, not artifact presence). Individual subsections (Rules, Commands, etc.) follow their own empty-state rules.
- **Folder created after activation**: New platform roots appear after a manual Refresh; dynamic watcher-based detection of new root folders is out of scope (consistent with spec 007 lazy-init behavior).
- **Specs node is not platform-gated**: The Specs node in the Workspaces tree is always shown if `specs/*/spec.md` files exist, regardless of `.cursor/` or `.claude/` presence.
- **Project has neither platform folder**: Only the Specs node (if populated) is shown under that project. No error.

---

## Requirements *(mandatory)*

### Functional Requirements

**Claude project agents (Feature A):**

- **FR-001**: The Workspaces tree MUST scan `.claude/agents/*.md` (flat, no recursion) at each project root and display the results in the Claude Code section under an "Agents" subsection, using the hubot icon for each leaf.
- **FR-002**: The "Agents" subsection MUST be ordered alphabetically alongside other Claude Code subsections (Commands, Rules, Skills) by label.
- **FR-003**: Activating a Claude agent definition leaf MUST open the file in the editor (viewer-only — no create, edit, or delete from the tree).
- **FR-004**: When `.claude/agents/` is absent or empty, the Agents subsection MUST either be hidden or display an explicit empty state consistent with the Cursor Agents empty-state copy.
- **FR-005**: The file watcher for the project-level Claude Code section MUST include `.claude/agents/*.md` so the tree refreshes automatically when agent files are added, modified, or deleted (consistent with spec 006 FR-008 and spec 007 watcher patterns).

**Conditional platform display (Feature B):**

- **FR-006**: In the Workspaces tree, the Cursor section for a project MUST be shown if and only if a `.cursor/` directory exists at that project's root. If `.cursor/` is absent, the Cursor section MUST NOT appear.
- **FR-007**: In the Workspaces tree, the Claude Code section for a project MUST be shown if and only if a `.claude/` directory exists at that project's root. If `.claude/` is absent, the Claude Code section MUST NOT appear.
- **FR-008**: The Specs node is NOT platform-gated and MUST appear independently of `.cursor/` or `.claude/` presence whenever `specs/*/spec.md` files exist.
- **FR-009**: In the Agents view, the Cursor root MUST be shown if and only if `~/.cursor/` exists.
- **FR-010**: In the Agents view, the Claude root MUST be shown if and only if `~/.claude/` exists.
- **FR-011**: In the Agents view, the Global root MUST be shown if and only if `~/.agents/` exists.
- **FR-012**: All existence checks MUST use `vscode.workspace.fs.stat()` (or equivalent async FS check), not synchronous `fs.existsSync()`.

**Living spec updates (Feature C):**

- **FR-013**: The `providers` living spec MUST be updated to:
  - Add `'claude-code'` as a platform category (sibling of `'cursor'`) with its own subsections including `'claude-agent-definitions'` and `'claude-agent-definition'`.
  - Update Regression Guardrail #5 to reflect that **platform sections** (Cursor, Claude Code) are hidden when their root folder is absent — only artifact-level nodes within a present platform use empty-state display.
- **FR-014**: The `tree-view` living spec MUST be updated to:
  - Add the Claude Code section to the Workspaces branch diagram and description, including Agents as a subsection.
  - Clarify that platform section visibility is gated on folder existence (not artifact presence).
- **FR-015**: The `scanners` living spec MUST be updated to reflect `.claude/agents/` as a scanned path.

### Non-Functional Requirements

- **NFR-001**: Folder existence checks MUST NOT introduce noticeable latency to tree load; stat calls SHOULD be parallelized per project.
- **NFR-002**: Empty states for Claude Code subsections MUST use language and icon consistent with their Cursor counterparts.

### Assumptions

- **A-001**: `.claude/agents/*.md` uses the same flat structure and display conventions as `.cursor/agents/*.md`. No deeper scan, no frontmatter extraction beyond what the agents scanner already does.
- **A-002**: Folder existence is checked at scan time (lazy init), not at activation. If `.cursor/` is created after first load, it will appear after the next Refresh.
- **A-003**: Global `~/.claude/agents/` and `~/.agents/agents/` are already scanned and displayed in the Agents view per spec 007. This spec does not change Agents view agent definitions — it adds project-level `.claude/agents/` to the Workspaces tree only.
- **A-004**: The conditional display for the Workspaces tree applies per-project. Different projects in a multi-project setup can each independently show Cursor, Claude Code, both, or neither.

### Key Entities

- **Claude project agent definition**: A `.md` file in `{project-root}/.claude/agents/`; flat scan; display name from filename; hubot icon.
- **Platform folder**: `.cursor/` or `.claude/` at a project root (Workspaces) or `~/.cursor/`, `~/.claude/`, `~/.agents/` (Agents view). The gate for showing that platform's section.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A project with `.claude/agents/*.md` shows those files in the Workspaces Claude Code → Agents subsection; clicking one opens the file.
- **SC-002**: A project with only `.claude/` present shows no Cursor section in the Workspaces tree.
- **SC-003**: A project with only `.cursor/` present shows no Claude Code section in the Workspaces tree.
- **SC-004**: The Agents view shows only roots whose home directories exist; absent roots produce no error or empty row.
- **SC-005**: Adding a `.md` file to `.claude/agents/` at a project root is reflected in the tree within one refresh cycle (file watcher fires without manual reload).
- **SC-006**: No regression in Cursor section display for projects that have `.cursor/` present.
- **SC-007**: The `providers` and `tree-view` living specs are updated in the same commit as the implementation (same-commit rule).

---

## Out of Scope

- Watching for creation of `.cursor/` or `.claude/` root folders themselves (dynamic platform section appearance without Refresh).
- Global `~/.claude/agents/` — already covered by spec 007; Agents view watcher already in place.
- Parsing frontmatter from `.claude/agents/*.md` beyond what the existing agents scanner extracts.
- CLAUDE.md at project root — already covered by spec 006; no change here.
- `.claude/settings.json` or hooks visibility.
